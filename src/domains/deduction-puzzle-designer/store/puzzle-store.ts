import { create } from 'zustand';
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

interface PuzzleState {
    nodes: Node[];
    edges: Edge[];
    narrative: string;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    setNarrative: (text: string) => void;
    // Add more state actions as needed
}

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
    nodes: [],
    edges: [],
    narrative: '',
    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    setNarrative: (text) => set({ narrative: text }),
}));
