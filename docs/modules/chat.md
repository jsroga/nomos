# Chat Module Documentation

## Overview

The Chat module provides the primary interaction interface between the user and the agentic system. It is designed to handle streaming responses, agent mentions, complex action/question tokens, and real-time activity logging.

## Core Components

### `ChatInterface`

The top-level container that orchestrates the chat experience.

- **Message Flow**: Manages the rendering of the `AgentLog`.
- **Input Management**: Integrates the `ChatInput` with multi-provider mention support.
- **Activity Toggle**: Allows users to switch between a focused "results-only" view and a detailed "technical activity" view (showing agent thoughts and logic steps).

### `AgentLog`

Responsible for the visual representation of the conversation history. It handles:

- **Streaming Tokens**: Real-time rendering of agent responses.
- **Agent Avatars**: Dynamic styling based on the active agent (Supervisor, Planner, etc.).
- **Interactive Tokens**: Rendering `AgentAction` (for approval) and `AgentQuestion` (for user input) inline within the chat flow.

### `ChatInput`

A rich text input area that supports:

- **Mentions System**: Uses a plugin-based system to allow users to @mention agents, characters, factions, or world rules.
- **Auto-Suggestions**: Context-aware suggestions based on the active project.

## Mentions System

The module uses a specialized mention system (`mentions/`) that allows for domain-aware cross-referencing:

- **`MentionProvider`**: An interface for retrieving entities that can be mentioned.
- **`ProjectContext`**: Ensures that mentions are filtered by the current project's scope.

## Streaming Architecture (`useChatStream.ts`)

The chat system is built on a robust React hook (`useChatStream`) that handles:

1.  **Token Streaming**: Reads `TextDecoder` chunks from the `POST` response, supporting Server-Sent Events (SSE) pattern.
2.  **Section Progress**: Visualizes the agent's thought process into distinct sections (`thinking`, `action`, `done`) using the `ProgressSection` component.
3.  **Resiliency**: Auto-restores streaming state from `sessionStorage` if the page is refreshed mid-generation. It also intercepts `beforeunload` to warn users if an agent is active.
4.  **Citations**: Parses `citation` and `grounding` events from the stream to display RAG sources with confidence scores.

## State & Message System

- **Message Types**: `human` | `ai` | `system` | `consistency_check`.
- **Action Handling**: `AgentAction` objects (e.g., `ADD_MECHANIC`) are embedded in messages. They include a `status` field (`pending` -> `executing` -> `committed`) tracked by `updateActionStatus` to manage the UI approval flow.

## Thinking System (`types.ts`)

To keep users engaged during long-running tasks (e.g., "generating 50 character backstories"), the module uses a configured "Thinking Message" system:

- **Thresholds**: Messages change based on elapsed time (e.g., 0s: "Analyzing...", 15s: "This is complex...", 60s: "Deep work in progress...").
- **Agent Awareness**: Different message sets are used if a specific `thinkingAgent` (e.g., "Plot Architect") is identified versus a generic fallback.

## Integration

The Chat module is designed to be embedded within other domains (Storyteller, Loop Creator) while remaining agnostic of the specific agent logic, communicating primarily through standard message and event schemas.
