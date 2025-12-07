# Smart Writers Room - Agent System Design

## Overview
A truly intelligent writers room where agents can **take actions**, **ask questions**, and **collaborate** with the user to produce high-quality screenplays.

---

## 1. User Flow - End to End

### Phase 1: Project Setup
```
┌─────────────────────────────────────────────────────────────────┐
│  User creates/selects project                                    │
│  ↓                                                               │
│  System shows: "Let's set up your story"                        │
│  ↓                                                               │
│  SHOWRUNNER asks:                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ "What genre is your story?"                                 ││
│  │ ○ Drama    ○ Thriller    ○ Sci-Fi    ○ Comedy   ○ Other    ││
│  └─────────────────────────────────────────────────────────────┘│
│  ↓                                                               │
│  User selects → Agent commits: UPDATE_SERIES_BIBLE              │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Breaking (Beat Development)
```
┌─────────────────────────────────────────────────────────────────┐
│  User sends: "I want to write about a detective discovering     │
│               his partner is the killer"                         │
│  ↓                                                               │
│  PLOT_ARCHITECT proposes beat + commits: CREATE_BEAT            │
│  ↓                                                               │
│  CHARACTER_PSYCHOLOGY validates → commits: UPDATE_CHARACTER     │
│  ↓                                                               │
│  DEVIL'S_ADVOCATE challenges:                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ "This reveal feels rushed. How do you want to handle it?"   ││
│  │ ○ Add foreshadowing in earlier beats                        ││
│  │ ○ Make it a gradual realization                             ││
│  │ ○ Keep it as a sudden shock                                 ││
│  │ ○ Let me explain my vision...                               ││
│  └─────────────────────────────────────────────────────────────┘│
│  ↓                                                               │
│  User selects → Agents adapt and commit changes                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Card Lock & Writing
```
┌─────────────────────────────────────────────────────────────────┐
│  SHOWRUNNER: "Beat board looks solid. Ready to lock cards?"     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○ Yes, lock cards and start writing                         ││
│  │ ○ No, I want to add/modify beats                            ││
│  │ ○ Show me the full outline first                            ││
│  └─────────────────────────────────────────────────────────────┘│
│  ↓                                                               │
│  User selects "Yes" → commit: LOCK_BEAT_BOARD                   │
│  ↓                                                               │
│  WRITER generates script → commit: UPDATE_SCRIPT                │
│  ↓                                                               │
│  Script appears in editor with inline edit capabilities         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Actions (Committed Operations)

### Available Actions
```typescript
type AgentAction = 
  // Beat Operations
  | { type: 'CREATE_BEAT'; payload: BeatCard }
  | { type: 'UPDATE_BEAT'; payload: { beatId: string; updates: Partial<BeatCard> } }
  | { type: 'DELETE_BEAT'; payload: { beatId: string } }
  | { type: 'REORDER_BEATS'; payload: { beatIds: string[] } }
  | { type: 'LOCK_BEAT_BOARD'; payload: { episodeId: string } }
  
  // Character Operations
  | { type: 'CREATE_CHARACTER'; payload: Character }
  | { type: 'UPDATE_CHARACTER'; payload: { characterId: string; updates: Partial<Character> } }
  | { type: 'UPDATE_STRESS_LEVEL'; payload: { characterId: string; delta: number } }
  | { type: 'ADD_KNOWLEDGE'; payload: { characterId: string; knowledge: string } }
  
  // Script Operations
  | { type: 'UPDATE_SCRIPT'; payload: { content: string; beatId?: string } }
  | { type: 'INSERT_SCRIPT_SECTION'; payload: { after: string; content: string } }
  | { type: 'REVISE_SCRIPT_SECTION'; payload: { sectionId: string; newContent: string } }
  
  // Story Bible Operations
  | { type: 'UPDATE_SERIES_BIBLE'; payload: Partial<SeriesBible> }
  | { type: 'ADD_WORLD_RULE'; payload: { rule: string } }
  | { type: 'ADD_SETUP'; payload: Setup }
  | { type: 'RESOLVE_SETUP'; payload: { setupId: string; payoffBeatId: string } }
  
  // Questions (require user response)
  | { type: 'ASK_QUESTION'; payload: AgentQuestion }
```

### Question Types
```typescript
interface AgentQuestion {
  id: string;
  agentName: string;
  question: string;
  questionType: 'single_choice' | 'multiple_choice' | 'free_text' | 'confirmation';
  options?: QuestionOption[];
  context?: string;  // Why the agent is asking
  urgency: 'blocking' | 'important' | 'optional';
  defaultOption?: string;
  timeout?: number;  // Auto-select default after X seconds
}

interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  consequence?: string;  // What happens if selected
  recommended?: boolean;
}
```

---

## 3. UI Components

### Agent Message with Actions
```
┌──────────────────────────────────────────────────────────────────┐
│ 🎬 SHOWRUNNER                                           2:34 PM  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  I've reviewed the proposed beat. The character motivation is    │
│  solid, but I have a concern about the pacing.                   │
│                                                                  │
│  ┌─ ACTION COMMITTED ──────────────────────────────────────────┐│
│  │ ✓ Updated Beat #3: Added emotional beat before revelation   ││
│  │   Characters affected: Detective Marcus                      ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Before we proceed, I need your input:                          │
│                                                                  │
│  ┌─ QUESTION ───────────────────────────────────────────────────┐│
│  │ Should Marcus confront his partner immediately, or           ││
│  │ investigate further first?                                   ││
│  │                                                              ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │ ◉ Immediate confrontation                            │   ││
│  │  │   → More dramatic, higher stakes                     │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │ ○ Secret investigation ⭐ Recommended                │   ││
│  │  │   → Builds tension, allows for more reveals          │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │ ○ Let me explain my vision...                        │   ││
│  │  │   → Free text input                                  │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  │                                                              ││
│  │  [Submit Answer]                                             ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### Action Confirmation Toast
```
┌──────────────────────────────────────────────┐
│ ✓ Beat Created: "Marcus discovers the truth" │
│   [View] [Undo]                    [Dismiss] │
└──────────────────────────────────────────────┘
```

### Pending Actions Sidebar
```
┌─ PENDING ACTIONS ─────────────────────┐
│                                       │
│ ⏳ Awaiting your response (1)         │
│ ┌───────────────────────────────────┐ │
│ │ SHOWRUNNER asks:                  │ │
│ │ "Confirm beat lock?"              │ │
│ │ [View Question]                   │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ✓ Recent Actions (3)                  │
│   • Beat #4 created                   │
│   • Marcus stress +10                 │
│   • Setup "gun" tracked               │
│                                       │
└───────────────────────────────────────┘
```

---

## 4. Technical Architecture

### Agent Response Schema
```typescript
interface AgentResponse {
  message: string;           // What the agent says
  thinking?: string;         // Optional chain-of-thought (for transparency)
  actions: AgentAction[];    // Actions to commit
  questions?: AgentQuestion[]; // Questions for user
  suggestions?: string[];    // Non-blocking suggestions
  confidence: number;        // 0-1 confidence in the response
  nextAgent?: string;        // Suggest which agent should respond next
}
```

### State Machine for Questions
```
                    ┌─────────────┐
                    │   IDLE      │
                    └──────┬──────┘
                           │ Agent asks question
                           ▼
                    ┌─────────────┐
           ┌────────│  AWAITING   │────────┐
           │        │   ANSWER    │        │
           │        └─────────────┘        │
           │ User answers    │ Timeout     │ User skips
           ▼                 ▼             ▼
    ┌─────────────┐  ┌─────────────┐ ┌─────────────┐
    │  ANSWERED   │  │  DEFAULT    │ │  SKIPPED    │
    │  (process)  │  │  (process)  │ │  (continue) │
    └──────┬──────┘  └──────┬──────┘ └──────┬──────┘
           │                │               │
           └────────────────┼───────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   NEXT      │
                    │   STEP      │
                    └─────────────┘
```

### Execution Flow
```typescript
async function processAgentTurn(state: WritersRoomState): Promise<WritersRoomState> {
  // 1. Agent generates response with actions
  const response = await agent.invoke(state);
  
  // 2. Auto-commit safe actions immediately
  for (const action of response.actions) {
    if (isSafeAction(action)) {
      state = await commitAction(state, action);
      emitActionEvent(action); // UI updates
    }
  }
  
  // 3. Handle questions (blocking)
  if (response.questions?.some(q => q.urgency === 'blocking')) {
    state.awaitingUserInput = true;
    state.pendingQuestions = response.questions;
    return state; // Pause here
  }
  
  // 4. Continue to next agent or end
  return state;
}

// When user answers a question
async function handleUserAnswer(
  state: WritersRoomState, 
  questionId: string, 
  answer: string | string[]
): Promise<WritersRoomState> {
  // Add answer to context
  const answerMessage = new HumanMessage({
    content: `User selected: ${answer}`,
    name: 'User',
    metadata: { questionId, answer }
  });
  
  state.messages.push(answerMessage);
  state.awaitingUserInput = false;
  state.pendingQuestions = [];
  
  // Resume agent processing
  return await continueGraph(state);
}
```

---

## 5. Model Configuration

### Use Latest Models
```typescript
// Primary agent model (smart, expensive)
const primaryModel = new ChatOpenAI({
  modelName: "gpt-4o",  // or "gpt-4-turbo-2024-04-09" for latest
  temperature: 0.7,
  maxRetries: 3,
});

// Fast model for quick validations
const fastModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.5,
  maxRetries: 2,
});

// Agents by model
const agentModels = {
  showrunner: primaryModel,      // Needs best reasoning
  plotArchitect: primaryModel,   // Creative tasks
  characterPsychology: primaryModel, // Deep analysis
  consequenceTracker: fastModel, // Simple tracking
  devilsAdvocate: primaryModel,  // Critical thinking
  writer: primaryModel,          // Creative output
};
```

---

## 6. Implementation Phases

### Phase 1: Action System (Week 1)
- [ ] Define action types and payloads
- [ ] Implement action commit/undo system
- [ ] Add action history tracking
- [ ] UI: Action confirmation toasts

### Phase 2: Question System (Week 2)
- [ ] Define question types and schema
- [ ] Implement question state machine
- [ ] UI: Question cards in chat
- [ ] UI: Pending questions indicator

### Phase 3: Smart Prompts (Week 3)
- [ ] Update agent prompts for structured output
- [ ] Add JSON schema validation
- [ ] Implement confidence scoring
- [ ] Add "thinking" transparency mode

### Phase 4: Polish (Week 4)
- [ ] Undo/redo for all actions
- [ ] Action history timeline
- [ ] Question timeout handling
- [ ] Keyboard shortcuts

---

## 7. Example Session

```
USER: "I want to write a noir detective story where the detective 
      slowly realizes his partner has been the killer all along"

SHOWRUNNER: "Great premise! Classic noir with a partner betrayal. 
Before we dive in, let me understand your vision better."

┌─ QUESTION ──────────────────────────────────────────────────────┐
│ What's the tone you're going for?                               │
│                                                                 │
│ ○ Classic noir (cynical, morally grey)     ⭐ Recommended       │
│ ○ Neo-noir (modern setting, stylized)                          │
│ ○ Psychological thriller (mind games)                           │
│ ○ Describe your own vision...                                   │
└─────────────────────────────────────────────────────────────────┘

USER: [Selects "Classic noir"]

┌─ ACTION COMMITTED ──────────────────────────────────────────────┐
│ ✓ Series Bible Updated                                          │
│   Genre: Noir                                                   │
│   Tone: Cynical, morally grey, shadows and rain                │
│   Themes: Betrayal, moral corruption, trust                     │
└─────────────────────────────────────────────────────────────────┘

PLOT_ARCHITECT: "For a classic noir partner betrayal, we need 
to establish the partnership first. Here's my opening beat:"

┌─ ACTION COMMITTED ──────────────────────────────────────────────┐
│ ✓ Beat #1 Created: "The Partnership"                            │
│   Type: Setup                                                   │
│   Logline: Detective Marcus and partner Jake close a case,     │
│            celebrating their 10th year together                 │
│   Visual Hook: Rain-soaked street, two figures sharing a       │
│                cigarette under a flickering streetlight        │
└─────────────────────────────────────────────────────────────────┘

CHARACTER_PSYCHOLOGY: "I've created character profiles for both 
detectives. Marcus is our POV character - here's his psychology:"

┌─ ACTION COMMITTED ──────────────────────────────────────────────┐
│ ✓ Character Created: Detective Marcus Cole                      │
│   Flaw: Trusts too easily despite cynical exterior             │
│   Fear: Betrayal (ironic given the story)                      │
│   Starting Stress: 25/100                                       │
└─────────────────────────────────────────────────────────────────┘

DEVIL'S_ADVOCATE: "Hold on. If Jake is the killer, we need to 
plant seeds early. How should we handle the audience's knowledge?"

┌─ QUESTION ──────────────────────────────────────────────────────┐
│ Should the audience know Jake is the killer before Marcus?      │
│                                                                 │
│ ○ Yes - dramatic irony (Hitchcock style)                       │
│   → We see Jake's dark side, Marcus doesn't                    │
│                                                                 │
│ ○ No - same knowledge as Marcus ⭐ Recommended for noir         │
│   → Revelation hits audience and character together            │
│                                                                 │
│ ○ Hints only - breadcrumbs for careful viewers                 │
│   → Rewatch value, subtle foreshadowing                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Files to Create/Modify

```
src/domains/storyteller/
├── actions/
│   ├── types.ts           # Action type definitions
│   ├── executor.ts        # Action execution logic
│   ├── history.ts         # Undo/redo stack
│   └── validators.ts      # Action validation
├── questions/
│   ├── types.ts           # Question type definitions
│   ├── state-machine.ts   # Question flow control
│   └── renderer.tsx       # Question UI components
├── components/
│   ├── AgentMessage.tsx   # Enhanced with actions/questions
│   ├── QuestionCard.tsx   # Interactive question UI
│   ├── ActionToast.tsx    # Action confirmation
│   └── PendingActions.tsx # Sidebar component
└── agents/
    ├── base-agent.ts      # Base class with action support
    └── prompts/
        ├── showrunner.md  # Updated prompts
        └── ...
```

