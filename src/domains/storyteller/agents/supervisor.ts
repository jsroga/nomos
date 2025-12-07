import { WritersRoomState } from '../graph/state'
import { AIMessage, SystemMessage, HumanMessage } from '@langchain/core/messages'
import { assembleContext } from '../context/assembler'
import { getModel } from '../config/model-config'
import { supervisorTools } from '../tools/agent-tools'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

const SUPERVISOR_SYSTEM_PROMPT = `
## YOUR ROLE: THE SUPERVISOR
You are the manager of a Writers Room. Your job is to **DELEGATE** work to specialized agents.
You do NOT write the story yourself. You DO NOT create beats yourself. You route tasks.

## TEAM MEMBERS (TOOLS)
- **Plot Architect**: Creates and edits beats. The primary builder.
- **Character Psychology**: Checks character logic.
- **Consequence Tracker**: Checks continuity.
- **Devil's Advocate**: Critiques and stress-tests.
- **Writer**: Writes actual script scenes.
- **Premise Architect**: Builds the world bible and premise.
- **Search Bible**: Looks up details in the Series Bible.

## ROUTING RULES (ACTION OVER CONVERSATION)
1. **Rejection**: If the user says "No", "I hate it", or "Change it", DO NOT APOLOGIZE. 
   - Call \`delegate_to_plot_architect\` with the instruction: "Revise the previous beat based on feedback: [User's Feedback]".
2. **Creative Direction**: If user says "Make it darker", "Add a dragon", or "Change setting":
   - Call \`delegate_to_plot_architect\` (for story changes) or \`delegate_to_premise_architect\` (for world changes).
3. **Multi-Step Requests**: If user says "Create a character AND kill them":
   - Pick the FIRST logical tool to start the chain (e.g. \`delegate_to_premise_architect\` to add the character).
4. **Phase Changes**: "Go to writing":
   - Call \`delegate_to_writer\`.
5. **Recall**: "What is the magic system?" or "Who is Bob?":
   - Call \`search_series_bible\` to find the answer.
6. **Opinion**: "What do you think?", "What's next?":
   - ANSWER DIRECTLY. Do NOT call a tool unless you need to look up facts.
   - EXCEPTION: If the user is stuck and asks "What next?", you CAN call \`delegate_to_plot_architect\` to propose a beat. But for general opinions, just talk.

## CRITICAL INSTRUCTION
- If the user gives ANY instruction to create/edit content, you **MUST** call a tool.
- Do NOT reply with "I will do that" or "Understood". Call the tool!
- Use the context provided in the message history to formulate the tool instruction.

## EMPTY STATE OVERRIDE
- If the **Series Bible is EMPTY**:
  - **CASE A (COMMAND)**: If user says "Start", "Go", "Make it sci-fi", or gives creative direction:
    - **IMMEDIATELY CALL** \`delegate_to_premise_architect\` with the instruction: "Generate a compelling initial premise and world rules from scratch."
    - It is better to generate a draft than to stall.
  - **CASE B (QUESTION)**: If user asks a QUESTION ("What do you think?", "Why?"):
    - **ANSWER DIRECTLY**. Do not delegate. Engage in conversation to clarify their vision.
`

export const supervisorAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('showrunner')
  const supervisorModel = model.bindTools(supervisorTools)
  
  console.log(
    'Supervisor evaluating... (phase:',
    state.currentPhase,
    ', iteration:',
    state.phaseIterations,
    ')'
  )

  const context = assembleContext(state, 'showrunner') // Reusing showrunner context builder

  // Context Fix: Ensure last user message is always present
  const lastMessage = state.messages[state.messages.length - 1];
  const lastHumanMessage = state.messages.slice().reverse().find(m => m._getType() === 'human');
  
  // Combine all system content into a single SystemMessage (required for Claude)
  const combinedSystemContent = [
    context.systemPrompt,
    context.stateContext,
    SUPERVISOR_SYSTEM_PROMPT,
  ].join('\n\n---\n\n')
  
  // Filter out any SystemMessages from conversation history (Claude doesn't allow them mid-conversation)
  const conversationMessages = state.messages
    .slice(-10)
    .filter(m => m._getType() !== 'system')
  
  const messages = [
    new SystemMessage(combinedSystemContent),
    ...conversationMessages,
  ];

  // If the last message in the slice isn't the user's command (due to system logs stuffing context),
  // forcefully append it to ensure the LLM sees the command.
  if (lastHumanMessage && !messages.includes(lastHumanMessage as any)) {
      if (lastMessage !== lastHumanMessage) {
          console.log("Supervisor: Re-injecting user command into context.");
          messages.push(new HumanMessage({ content: `(User's last command: "${lastHumanMessage.content}")` }));
      }
  }

  try {
    // Invoke the model with tools bound
    const response = await supervisorModel.invoke(messages)
    
    // Interaction Fix: If NO tool calls, we assume the agent is talking to the user.
    // Therefore, we must pause for user input.
    let awaitingUserInput = false;
    if (!response.tool_calls || response.tool_calls.length === 0) {
        console.log("Supervisor: No tool calls -> Pausing for user input.");
        awaitingUserInput = true;
        
        // Format JSON content as readable message if the model returned JSON
        let content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        
        // Try to parse and extract message if it's JSON
        try {
          const parsed = JSON.parse(content)
          if (parsed.message) {
            content = parsed.message
          }
        } catch {
          // Not JSON, use as-is
        }
        
        // Update response content with formatted message
        response.content = content
    } else {
        // STREAMING FIX: If tool calls exist but content is empty, inject a message so the UI shows something.
        if (!response.content) {
            const toolNames = response.tool_calls.map(tc => tc.name).join(', ');
            // Modify the response object content directly (it's mutable)
            response.content = `Delegating to ${toolNames}...`;
        }
    }

    return {
      messages: [response],
      awaitingUserInput,
      // We don't set lastAction here because the tool execution will determine the next state
    }
  } catch (error) {
    console.error('Supervisor error:', error)
    const errorMessage = new AIMessage({
      content: `⚠️ **Error**: ${error instanceof Error ? error.message : 'Unknown error'}`,
      name: 'Supervisor',
    })
    return {
      messages: [errorMessage],
      shouldTerminate: true,
    }
  }
}

