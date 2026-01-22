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

## State & Flow

- **`Message` Type**: Supports rich data including `thinking` (agent thoughts), `actions` (proposed state changes), and `questions` (blocking queries).
- **Thinking Messages**: A threshold-based system (`ThinkingMessagesConfig`) that displays varied messages based on how long an agent has been processing, keeping the user engaged during deep-work cycles.

## Integration

The Chat module is designed to be embedded within other domains (Storyteller, Loop Creator) while remaining agnostic of the specific agent logic, communicating primarily through standard message and event schemas.
