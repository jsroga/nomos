# Nomos — Architecture Diagrams: Current and Target

Current-state diagrams describe `refactor` @ `b409539` as verified. Target-state diagrams
describe the **middle** system in `target-architecture.md`: full
[novel-writing](https://github.com/wgwtest/novel-writing) catalog, five critic scopes, three
workflows, the George vibe split across drafting and a de-slop pass.

Legend: **red** = broken or unenforced · **amber** = present but incomplete · **green** =
correct, do not regress · **blue** = deterministic host code · **purple** = model call.

Ten diagrams: two of what exists, five of the system, three of how it gets measured.

---

## 1. Current — three chat entry points, three safety properties

```mermaid
flowchart TD
    U["Writer"]

    U --> R1["POST /api/assistant/:agentId"]
    U --> R2["POST /api/storyteller/chat/stream"]
    U --> R3["POST /api/storyteller/chat"]

    R1 --> A1["registered chatAdapterAgent<br/>12 tools, manage_beat_approval"]
    R2 --> A2["per-request StorytellerAgent<br/>ungated manage_beat"]
    R3 --> W["beat-draft workflow called directly<br/>chat agent bypassed"]

    A1 --> T["run_beat_draft_workflow"]
    A2 --> T
    T --> W

    W --> V{"editorial verdict"}
    V -->|"R1 and R2: suspend"| H["human approves, revises or kills"]
    R3 -.->|"autoApprove true, hard-coded"| SKIP["verdict skipped"]

    R1 -.->|"no withGatewayContext"| NM["spend invisible"]
    GRRM["grrm-author agent drafts every beat"] -.->|"no scorer distinguishes it"| DEAD["voice pack unmeasured"]

    classDef bad fill:#4a1520,stroke:#c0392b,color:#fff
    classDef warn fill:#4a3a15,stroke:#d68910,color:#fff
    classDef ok fill:#14401f,stroke:#27ae60,color:#fff
    class SKIP,NM,DEAD bad
    class A2,R3,GRRM warn
    class H,V ok
```

**Reading it.** The editorial gate is a property of the URL. The George agent *is* reached —
it drafts every beat through `beat-draft-default-deps` — but nothing measures whether its
skills help, so the vibe ships on faith. The dead thing is the `GrrmAuthorAgent` wrapper class
in the domain barrel, which is unused code rather than an unused capability.

---

## 2. Current — the beat pipeline that exists today

```mermaid
flowchart LR
    IN["brief"] --> PL["planner"]
    PL --> GATE{"concreteness"}
    GATE -->|"fail: retry once"| PL
    GATE -->|"pass"| AU["author draft"]

    AU --> C1["continuity critic"]
    AU --> C2["prose critic"]
    AU --> C3["stakes critic"]

    C1 --> SUS["suspend for verdict"]
    C2 --> SUS
    C3 --> SUS

    SUS --> REV["author revise"]
    REV --> PER["persistBeat"]
    PER -->|"soft failure"| SOFT["saved false<br/>run still succeeds"]
    PER -->|"ok"| OK["beat stored"]

    MUSE["Muse and Muse-ranker"] -.->|"wildcards missing<br/>from tool schema"| PL
    VOICE["psychology + anti-slop skills"] ==>|"always composed,<br/>never disclosed or checked"| AU

    classDef bad fill:#4a1520,stroke:#c0392b,color:#fff
    classDef ok fill:#14401f,stroke:#27ae60,color:#fff
    classDef dead fill:#2b2b2b,stroke:#777,color:#aaa
    classDef warn fill:#4a3a15,stroke:#d68910,color:#fff
    class SOFT bad
    class C1,C2,C3,GATE ok
    class MUSE dead
    class VOICE warn
```

**Reading it.** Three critics really do run in parallel; the verdict really does suspend.
Muse is one missing schema field in the *tool* — the workflow contract has it. The George
skills are not dead: `statelessGrrmAuthor` is the author for both `draft` and `revise`, so
psychology and anti-slop shape every beat already. Their defect is different and quieter — they
load unconditionally on every call, nothing checks that a rewrite preserved the facts, and no
scorer can tell a beat written with them from one written without.

---

## 3. Target — the whole middle system on one page

```mermaid
flowchart TD
    CO["Conductor · glm-5.2<br/>the only agent the writer talks to"]

    CO --> MODE{"mode"}
    MODE -->|"read"| RT["read_canon · read_manuscript<br/>search_manuscript · run_prose_check<br/>brainstorm"]
    MODE -->|"draft"| DT["write_draft"]
    MODE -->|"commit"| CT["commit_beat · promote_rule"]

    RT --> WF["three workflows"]
    WF --> BF["beat-forge · the compiler"]
    WF --> CS["continuity-sweep · episode scale"]
    WF --> AE["autonomous-episode · durable"]

    BF --> PLAN["Planner · glm-5.2"]
    BF --> AUTH["Author · kimi-k3 · the GRRM agent<br/>draft · revise · de-slop"]
    BF --> CRIT["Critic · glm-5.2<br/>one agent, 5 scopes, parallel"]

    classDef model fill:#3a1b52,stroke:#8e44ad,color:#fff
    classDef host fill:#12305e,stroke:#3d7ebf,color:#fff
    classDef gate fill:#14401f,stroke:#27ae60,color:#fff
    class CO,PLAN,AUTH,CRIT model
    class RT,DT,CT,WF,BF,CS,AE host
    class MODE gate
```

**Reading it.** Four named agents, eight tools, three modes, three workflows. The critic is
one agent run five times. The Author *is* the GRRM agent — that is already true on the
`refactor` branch — so the vibe needs no new personality: voice rides in its drafting prompt
and the de-slop pass is a second Author mode inside `beat-forge`.

---

## 4. Target — `beat-forge`, and where the two halves of the vibe sit

```mermaid
flowchart TD
    ST["brief"] --> PLAN["Planner<br/>POV, required info, forbidden mistakes<br/>Law of Motion fields"]
    PLAN --> CG{"concreteness + Law of Motion"}
    CG -->|"fail"| PLAN
    CG -->|"pass"| DRAFT["Author · draft<br/>voice pack: psychology + overlay"]

    DRAFT --> DET["run_prose_check<br/>deterministic · free"]
    DET -->|"errors"| DRAFT

    DET -->|"clean"| FAN["critic scopes · parallel · isolated"]
    FAN --> K1["continuity"]
    FAN --> K2["causality"]
    FAN --> K3["cognition"]
    FAN --> K4["dialogue"]
    FAN --> K5["style-fidelity · on the diff"]

    K1 --> SYN["synthesize"]
    K2 --> SYN
    K3 --> SYN
    K4 --> SYN
    K5 --> SYN

    SYN --> SUS["suspend · editorial verdict"]
    SUS --> VD{"verdict"}
    VD -->|"kill"| KILL["persist nothing"]
    VD -->|"revise"| LOOP["revise · re-check<br/>exits: clean, budget, no progress"]
    LOOP --> SYN
    VD -->|"approve"| GEO["de-slop pass<br/>Humanizer · masterPrompt as sample"]
    GEO --> CLAIM["claim check<br/>no fact added, dropped or altered"]
    CLAIM -->|"fact moved"| LOOP
    CLAIM -->|"clean"| COMMIT["commit_beat"]

    classDef model fill:#3a1b52,stroke:#8e44ad,color:#fff
    classDef host fill:#12305e,stroke:#3d7ebf,color:#fff
    classDef gate fill:#14401f,stroke:#27ae60,color:#fff
    classDef vibe fill:#5c3d0a,stroke:#d4a017,color:#fff
    class PLAN,K1,K2,K3,K4,K5,LOOP model
    class DET,SYN,COMMIT,KILL host
    class CG,SUS,VD,CLAIM gate
    class DRAFT,GEO vibe
```

**Reading it.** Cheap checks first. Five scopes, not three and not seven. The two gold boxes sit
at opposite ends on purpose: **tone goes in at drafting**, from the project's `masterPrompt`,
because a beat should be written in its register rather than translated into it; **de-slop comes
out at the end**, because you cannot remove machine tells from prose that does not exist yet.
Humanizer takes the master prompt as its writing sample, so the cleanup works toward the user's
declared voice instead of flattening it. The claim check is what makes the last box safe — it may
re-cadence, never re-fact. Martin is not in either box: he governs the plan (§9.1).

---

## 5. Target — why a critic is a subagent

```mermaid
flowchart LR
    subgraph P["Conductor context · protected"]
        PC["the conversation<br/>the plan<br/>the finished draft<br/>merged findings"]
    end

    subgraph S["Critic context · discarded on return"]
        SC["adjacent chapters<br/>canon slice<br/>the craft skill body<br/>dead ends"]
    end

    PC ==>|"task: check this beat"| SC
    SC ==>|"findings only · about 400 tokens"| PC

    NOTE["about 60k tokens read<br/>never enters the parent"]
    SC -.- NOTE

    classDef prot fill:#14401f,stroke:#27ae60,color:#fff
    classDef temp fill:#4a3a15,stroke:#d68910,color:#fff
    class PC prot
    class SC,NOTE temp
```

**Reading it.** The only justification for a subagent: it reads far more than it returns.

---

## 6. Target — four-layer canon, the structural half of the George vibe

```mermaid
flowchart TD
    subgraph CANON["Canon · from novel-writing catalog §4"]
        L1["Story facts"]
        L2["Character knowledge<br/>per character, per beat<br/>+ voice fingerprint"]
        L3["Author truth<br/>the hidden mechanism"]
        L4["Reveal boundary"]
    end

    RC["read_canon<br/>filters by requester and POV"]
    L1 --> RC
    L2 --> RC
    L3 --> RC
    L4 --> RC

    RC -->|"story facts plus this POV's knowledge<br/>fingerprints for this scene only<br/>author truth withheld"| AU["Author · drafting"]
    RC -->|"all four layers"| PLAN["Planner, continuity, cognition"]

    LEAK["leaking the twist is<br/>structurally unreachable"]
    AU -.- LEAK

    classDef secret fill:#4a1520,stroke:#c0392b,color:#fff
    classDef host fill:#12305e,stroke:#3d7ebf,color:#fff
    classDef ok fill:#14401f,stroke:#27ae60,color:#fff
    class L3,L4 secret
    class RC host
    class LEAK ok
```

**Reading it.** Dramatic irony is a retrieval permission. Martin-like withholding is
impossible to violate from the Author seat because the secret was never retrieved. The same
scoping does a second job: the character layer carries **how each person talks** as well as what
they know, and the Author is handed fingerprints only for characters in the scene. Twenty voices
in one prompt is how voices blur; four is how they stay separate.

---

## 7. Target — the novel-writing catalog with progressive disclosure

```mermaid
flowchart TD
    CAT["10 catalog skills + 2 GRRM skills<br/>L1 index always loaded · ~1.2k tokens"]

    CAT --> P["planning stage"]
    CAT --> D["drafting stage"]
    CAT --> R["reviewing stage"]
    CAT --> G["de-slop pass"]

    P --> P2["L2: planning<br/>story-outline-and-causal-summary<br/>+ psychology"]
    D --> D2["L2: cognition, dialogue,<br/>scene-causality as needed<br/>+ masterPrompt register"]
    R --> R2["L2: matching critic scope<br/>+ revision-checklist at synthesize"]
    G --> G2["L2: Humanizer + style-fidelity"]

    L3["L3: checker script runs<br/>body is never read into the window"]
    R2 --> L3

    classDef host fill:#12305e,stroke:#3d7ebf,color:#fff
    classDef vibe fill:#5c3d0a,stroke:#d4a017,color:#fff
    class CAT,P,R,P2,R2,L3 host
    class D,D2,G,G2 vibe
```

**Reading it.** Using the catalog is not expensive. Loading every body on every call is —
which is exactly what `compose-instructions.ts` does with the two GRRM skills today. The fix is
to make them ordinary L2 loads at the stage that actually needs each one: **psychology at
planning**, because it decides what characters want and what it costs them, and **Humanizer at
the de-slop pass**, because a defect filter needs prose to filter. Drafting keeps the craft floor
plus the project's declared register — nothing that encodes a fixed taste.

---

## 8. Target — four evaluation tiers

```mermaid
flowchart TD
    T0["Tier 0 · Deterministic<br/>schemas, POV-leak, Law of Motion,<br/>voice convergence<br/>no models · free · every commit"]
    T1["Tier 1 · Contract<br/>five scopes, de-slop before commit,<br/>memory bound and keyed<br/>stubbed models · free · every commit"]
    T2["Tier 2 · Calibration<br/>does the instrument work<br/>real models · cheap · nightly"]
    T3["Tier 3 · Live quality<br/>including the GRRM rubric<br/>real models · before shipping"]

    T0 --> T1 --> T2 --> T3

    ONLY["only Tier 3 may claim quality<br/>and only if Tier 2 passed"]
    T3 -.- ONLY

    TODAY["today: evals score a frozen string<br/>so no voice-pack change can move the number"]

    classDef free fill:#14401f,stroke:#27ae60,color:#fff
    classDef paid fill:#3a1b52,stroke:#8e44ad,color:#fff
    classDef bad fill:#4a1520,stroke:#c0392b,color:#fff
    class T0,T1 free
    class T2,T3 paid
    class TODAY bad
```

**Reading it.** The vibe has a rubric in Tier 3. Without it you are grading the answer key
and calling it Martin.

---

## 9. Target — ablation decides what grows past the floor

```mermaid
flowchart TD
    Q["should we add component C<br/>past the floor?"]
    Q --> ON["golden set · C enabled"]
    Q --> OFF["golden set · C disabled"]

    ON --> DIFF["difference in score"]
    OFF --> DIFF

    DIFF --> CMP{"bigger than the noise floor"}
    CMP -->|"yes"| KEEP["C earns its place"]
    CMP -->|"no"| DROP["C is decoration"]

    EX["candidates: anchoring scope · realism scope<br/>variant tournament · embedding search"]
    Q -.- EX

    FLOOR["the floor itself is not optional:<br/>five scopes, the catalog, the voice pack"]
    FLOOR -.-> Q

    classDef host fill:#12305e,stroke:#3d7ebf,color:#fff
    classDef gate fill:#14401f,stroke:#27ae60,color:#fff
    classDef vibe fill:#5c3d0a,stroke:#d4a017,color:#fff
    class ON,OFF,DIFF host
    class CMP,KEEP,DROP gate
    class FLOOR vibe
```

**Reading it.** Ablation decides *additions*. It does not get to delete the product. If the
voice pack loses an ablation, you fix the pack — you do not drop the requirement. The overdue
run is the voice pack itself: it has shipped in every draft without ever being measured.

---

## 10. Target — making a judge trustworthy, including the GRRM rubric

```mermaid
flowchart TD
    CAND["two candidate drafts"] --> ORD["run both orders: A-B and B-A"]
    ORD --> FLIP{"same winner both ways"}
    FLIP -->|"no"| TIE["record a tie · position bias"]
    FLIP -->|"yes"| FAM{"judge family same as author"}

    FAM -->|"yes"| SWAP["swap judge or 3-family panel"]
    FAM -->|"no"| LEN{"is the winner just longer"}
    SWAP --> LEN

    LEN -->|"yes"| NORM["control for length"]
    LEN -->|"no"| RUBRIC{"GRRM rubric:<br/>consequence, embodiment,<br/>withheld truth, sensory density,<br/>Law of Motion"}
    NORM --> RUBRIC

    RUBRIC --> CAL{"judge agrees with human labels"}
    CAL -->|"below threshold"| REJECT["do not gate on it"]
    CAL -->|"above"| NOISE{"delta bigger than 2 SD"}

    NOISE -->|"no"| NOTHING["noise"]
    NOISE -->|"yes"| REAL["a real improvement"]

    classDef bad fill:#4a1520,stroke:#c0392b,color:#fff
    classDef ok fill:#14401f,stroke:#27ae60,color:#fff
    classDef host fill:#12305e,stroke:#3d7ebf,color:#fff
    classDef vibe fill:#5c3d0a,stroke:#d4a017,color:#fff
    class TIE,REJECT,NOTHING bad
    class REAL ok
    class ORD,SWAP,NORM host
    class RUBRIC vibe
```

**Reading it.** Four known biases, then a rubric that names the vibe in checkable pieces.
"It feels like Martin" is not a scorer.
