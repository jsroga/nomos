# Storyteller Agent Architecture (v2)

The "Storyteller" is not a single AI, but a sophisticated multi-agent system orchestrated by the main **Storyteller Agent**. This architecture mimics a professional writers' room, with specialized agents acting as "The Council" to handle specific aspects of narrative creation.

## The Council Model

At the center is the **Storyteller Agent**, acting as the Showrunner. It receives user intent and delegates tasks to specialized agents when deep expertise is required.

```mermaid
graph TD
    User([User]) <--> Storyteller[Storyteller Agent<br/>(The Showrunner)]
    
    subgraph "The Council (Specialists)"
        Storyteller <--> Architect[Premise Architect<br/>(The Visionary)]
        Storyteller <--> Psychologist[Psychologist<br/>(Character Depth)]
        Storyteller <--> Director[Creative Director<br/>(Visuals & Tone)]
        Storyteller <--> Gardener[Gardener<br/>(Plot Weaving)]
    end
    
    subgraph "Review & Integrity"
        Storyteller <--> Consistency[Consistency Agent<br/>(The Historian)]
        Storyteller <--> Consequence[Consequence Agent<br/>(Logic Tracker)]
        Storyteller <--> Devil[Devil's Advocate<br/>(The Contrarian)]
        Storyteller <--> Critique[Self-Critique<br/>(The Editor)]
    end

    subgraph "Data Layer"
        Storyteller --> WorldBible[(World Bible)]
        Consistency --> WorldBible
    end

    %% Styles
    style Storyteller fill:#f9f,stroke:#333,stroke-width:4px
    style User fill:#fff,stroke:#333
    style WorldBible fill:#eee,stroke:#333,stroke-dasharray: 5 5
```

## Agent Roles

### 1. Orchestration
*   **Storyteller Agent (`storyteller-agent.ts`):** The primary interface. It holds the context window, manages memory, and decides which tools or sub-agents to call. It is responsible for the final synthesis of all inputs.

### 2. Narrative Design
*   **Premise Architect (`premise-architect-agent.ts`):** Specializes in high-level structural design. It crafts loglines, hooks, and episode roadmaps. It thinks in acts and sequences rather than prose.
*   **Gardener Agent (`gardener-agent.ts`):** "Gardens" the story by tracking disparate plot threads and ensuring they weave together organically. It prevents dropped plotlines.
*   **Creative Director (`creative-director-agent.ts`):** Focuses on the sensory experience atimate, tone, and visual language. It generates art direction prompts and ensures "cinematic" quality.

### 3. Character & Logic
*   **Psychologist Agent (`psychologist-agent.ts`):** Deep dives into character psyches. It ensures characters act according to their internal logic, fears, and desires, preventing "characters acting as plot devices."
*   **Consistency Agent (`consistency-agent.ts`):** The canon keeper. It checks new content against established facts in the World Bible to prevent retcons or contradictions.
*   **Consequence Agent (`consequence-agent.ts`):** Simulates the ripple effects of major actions. If a character destroys a city, this agent calculates the political, economic, and social fallout.

### 4. Review & Refinement
*   **Devil's Advocate (`devils-advocate-agent.ts`):** actively tries to break the story. It hunts for plot holes, clichés, and lazy writing.
*   **Self-Critique Agent (`self-critique-agent.ts`):** A fast-pass editor that checks for prose quality, pacing, and repetition before the user sees the output.
*   **Script Review Agent (`script-review-agent.ts`):** Specialized for screenplay format validation.

## Workflow Example: "Create a New Episode"

1.  **User** asks to create an episode about a specific event.
2.  **Storyteller** calls **Premise Architect** to draft the structure (Hook, Inciting Incident, Climax).
3.  **Storyteller** reviews the premise.
4.  **Storyteller** might consult **Consistency Agent** to ensure the villain is actually alive.
5.  **Storyteller** generates the beat sheet and saves it to the **World Bible**.
