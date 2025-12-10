export interface TestCase {
  id: string;
  description: string;
  input: string;
  expectedIntent?: string; 
  expectedDelegation?: string[]; 
  expectedActions?: string[]; 
  shouldNotHalt?: boolean;
  shouldHalt?: boolean; // Explicit check for "awaiting input"
}

export const TEST_CASES: TestCase[] = [
  // --- DELEGATION (The "Go" Signal) ---
  {
    id: 'del-01',
    description: 'Simple "Start" command',
    input: "let's start working on this episode",
    expectedDelegation: ['PremiseArchitect', 'PlotArchitect', 'Delegating'],
    shouldNotHalt: true
  },
  {
    id: 'del-04',
    description: 'Explicit "Make changes" command',
    input: "make changes to the beat",
    expectedDelegation: ['PlotArchitect', 'Writer'],
    shouldNotHalt: true
  },
  {
    id: 'del-05',
    description: 'Urgent "Fix it" command',
    input: "fix this mess now",
    expectedDelegation: ['PlotArchitect', 'Writer', 'Showrunner'],
    shouldNotHalt: true
  },

  // --- CREATIVE DIRECTION ---
  {
    id: 'dir-01',
    description: 'Tone shift',
    input: "make it darker and more gritty",
    expectedDelegation: ['PlotArchitect', 'Writer'],
    shouldNotHalt: true
  },
  {
    id: 'dir-04',
    description: 'Setting change',
    input: "change the location to a spaceship",
    expectedDelegation: ['PremiseArchitect', 'PlotArchitect'],
    shouldNotHalt: true
  },

  // --- APPROVAL / REJECTION ---
  {
    id: 'fb-01',
    description: 'Approval',
    input: "looks good to me",
    shouldNotHalt: true 
  },

  // --- QUESTIONS / INTERACTION (New Cases) ---
  {
    id: 'q-01',
    description: 'Clarification question',
    input: "why did you choose that setting?",
    shouldNotHalt: false 
  },
  {
    id: 'q-02',
    description: 'Meta question',
    input: "what phase are we in?",
    shouldNotHalt: false 
  },
  {
    id: 'int-01',
    description: 'User solicits opinion (Should halt for answer)',
    input: "What do you think we should do next?",
    shouldHalt: true
  },

  // --- PHASE CHANGES ---
  {
    id: 'ph-01',
    description: 'Move to writing',
    input: "let's move to the writing phase",
    expectedDelegation: ['Writer', 'Advancing', 'Writing'],
    shouldNotHalt: true
  },

  // --- EDGE CASES ---
  {
    id: 'edge-01',
    description: 'Gibberish / Confusion',
    input: "asdf jkl;",
    shouldNotHalt: false
  },
  {
    id: 'edge-02',
    description: 'Empty input (simulated)',
    input: "...",
    shouldNotHalt: false
  },
  {
    id: 'edge-03',
    description: 'Contradictory command',
    input: "start but stop",
    shouldNotHalt: false
  },
  
  // --- COMPLEX ACTIONS ---
  {
    id: 'val-01',
    description: 'Complex multi-step instruction',
    input: "create a character named Bob, then kill him, then make a beat about his funeral",
    expectedDelegation: ['PlotArchitect', 'Character', 'PremiseArchitect'], // Added PremiseArchitect
    shouldNotHalt: true
  }
];


