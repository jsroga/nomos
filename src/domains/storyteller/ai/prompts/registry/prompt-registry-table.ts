import { StorytellerPromptRegistryId } from './prompt-registry-ids'

const CORK_BOARD_BEAT_CRAFT =
  'Keep every beat SHORT: logline max 20 words; visualHook, actionTaken, consequence, and storyStateChange each one short sentence. No paragraphs. storyStateChange describes solely a change in the world and must be quotable by a subsequent beat. Each successive revelation beat must introduce a new unknown rather than confirming the previous one.'

/** Prompt bodies keyed by registry id. Client-safe (no node:crypto). */
export const PROMPT_BODIES: Record<string, string> = {
  [StorytellerPromptRegistryId.CorkBoardGenerateBeats]:
    `Generate the full beat board (text only) for this episode from the accepted episode premise and its 10-point plan. Cover the 10-point plan as the detailed breakdown of ROADMAP SLOT (see system context). If that block is absent, use the premise only. Create 30 beats with manage_beat create. Each beat needs logline, beatType, visualHook, charactersInvolved, actionTaken, consequence, and storyStateChange. ${CORK_BOARD_BEAT_CRAFT} Cover the full arc. Do not draft scripts. Do not generate images. Do not call run_beat_draft_workflow.`,
  [StorytellerPromptRegistryId.CorkBoardGenerateNextBeat]:
    `Generate the next story beat only (text card) for this episode. Create exactly one beat with manage_beat create. Sequence {sequence}. Continue from the existing beats: {existing}. Use the episode premise, 10-point plan, and ROADMAP SLOT when that system-context block is present. The beat needs logline, beatType, visualHook, charactersInvolved, actionTaken, consequence, and storyStateChange. ${CORK_BOARD_BEAT_CRAFT} Do not replace or delete existing beats. Do not draft a script. Do not generate images. Do not call run_beat_draft_workflow.`,
  [StorytellerPromptRegistryId.WorldDescriptionRegen]:
    'Generate a completely BRAND NEW, rich world description including setting, atmosphere, and key details. IMPORTANT: Take a completely new creative direction and do NOT repeat previous content.',
  [StorytellerPromptRegistryId.BibleInspirationGenerate]:
    'Generate BRAND NEW diverse inspirations for this world - include relevant books, movies, and games. For each, provide the exact title and 1-2 sentences describing what it is and why it\'s thematically relevant. IMPORTANT: Take a completely new creative direction and do NOT repeat previous suggestions.',
  [StorytellerPromptRegistryId.BibleRoadmapGenerate]:
    'Break the season into a high-level roadmap of 8-12 episodes (title, logline, inciting incident, midpoint, finale). This is the season spine — not a 10-point plan and not beat cards. If === EPISODE INDEX === lists existing episodes, slot N must restate episode N at that altitude (title/logline/turn) without copying 10-points. Unused slots may be new.',
  [StorytellerPromptRegistryId.BibleFactionsGenerate]:
    'Generate completely BRAND NEW major factions, power structures, and political forces in this world. Each faction needs a short titled name (2–6 words, same length as a world-rule or event name) and the full summary in the description field. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated factions.',
  [StorytellerPromptRegistryId.BibleWorldRulesGenerate]:
    'Generate BRAND NEW fundamental laws and rules that govern this world - magic systems, physics, social contracts, etc. Each rule needs a short titled name (2–6 words, same length as a faction or event name) and the full law in the rule field. Mention examples of excellent world rules like in Death Note, Case of Golden Idol (game), Game of Thrones, Pluribus. IMPORTANT: Take a completely new creative direction and do NOT repeat previous rules.',
  [StorytellerPromptRegistryId.BiblePlotTwistsGenerate]:
    'Generate 3 completely BRAND NEW major plot twists for this story. IMPORTANT: Take a completely new creative direction and do NOT repeat previous twists.',
  [StorytellerPromptRegistryId.BibleSoundtracksGenerate]:
    'Suggest 3-5 BRAND NEW real YouTube soundtrack recommendations for this world. For each track, provide the song title, artist name, and actual YouTube URL. Choose music that reinforces the tone and atmosphere. IMPORTANT: Take a completely new, unexpected creative direction and do NOT repeat previous suggestions.',
  [StorytellerPromptRegistryId.BibleItemsGenerate]:
    'Generate completely BRAND NEW, significant items, artifacts, weapons, or objects of power in this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated items.',
  [StorytellerPromptRegistryId.BibleEventsGenerate]:
    'Generate the most important BRAND NEW historical events, tragedies, wars, and discoveries that shaped this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated events.',
  [StorytellerPromptRegistryId.ScriptEditorExpand]:
    'Expand this section with more detail and sensory description',
  [StorytellerPromptRegistryId.ScriptEditorCondense]:
    'Condense this to be more concise while keeping the essence',
  [StorytellerPromptRegistryId.ScriptEditorRewrite]:
    'Rewrite this in a different way, maintaining the same meaning',
  [StorytellerPromptRegistryId.ScriptEditorSystem]: `You are a screenplay editor. Your task is to edit the selected text according to the user's instruction.

RULES:
1. Maintain proper screenplay format (INT./EXT. scene headings, CHARACTER NAMES in caps, etc.)
2. Preserve the voice and tone of the existing script
3. Keep character names consistent
4. Only edit what's necessary - don't rewrite beyond the scope of the instruction
5. Return ONLY the edited text, no explanations or commentary

SCREENPLAY FORMAT REFERENCE:
- Scene headings: INT. LOCATION - DAY/NIGHT or EXT. LOCATION - DAY/NIGHT
- Action lines: Present tense, visual descriptions
- Character names: ALL CAPS before dialogue
- Dialogue: Regular case, centered conceptually
- Parentheticals: (in parentheses), for delivery notes only`,
  [StorytellerPromptRegistryId.GenerateEpisodeDescriptionUser]:
    'Generate only the episode description (the logline). Do not write the rest of the Ozymandias premise.',
  [StorytellerPromptRegistryId.GenerateEpisodePremiseAgent]:
    'Please generate an episode premise using the Ozymandias framework. Expand ROADMAP SLOT into episode detail. Do not rewrite the season spine.',
  [StorytellerPromptRegistryId.GenerateRoadmapUser]:
    'Please generate a high-level episode roadmap for the season (8-12 slots: title, logline, inciting/midpoint/finale). This is the season spine — not a 10-point plan. If existing episodes are listed, slot N restates episode N at that altitude.',
  [StorytellerPromptRegistryId.GenerateRoadmapAgent]:
    'Generate a high-level episode roadmap for the season. Create distinct slots with titles, loglines, and turning points. Do not copy episode 10-point plans into the roadmap.',
  [StorytellerPromptRegistryId.RegeneratePremiseSectionUserPrefix]: 'Please regenerate only the ',
  [StorytellerPromptRegistryId.RegeneratePremiseSectionUserSuffix]: ' of the episode premise.',
  [StorytellerPromptRegistryId.RegeneratePremiseSectionAgentPrefix]: 'Please regenerate ONLY the ',
  [StorytellerPromptRegistryId.RegeneratePremiseSectionAgentMid]: ' (',
  [StorytellerPromptRegistryId.RegeneratePremiseSectionAgentSuffix]:
    ') for the episode premise. Return a JSON object containing ONLY this field. Do not include unchanged fields. Take a completely new, bold, and distinct creative direction. Do not just rephrase the previous version - give me a brand new idea. Delegate to the Episode Premise Architect.',
  [StorytellerPromptRegistryId.CharacterGenerateMissing]:
    'Fill missing character fields. Return JSON with name, role, description, gender, mbti, and psychology (actualMotivation, fatalFlaw, secrets). Do not call tools. Do not persist.',
}

export function lookupPromptBody(id: string): string {
  const body = PROMPT_BODIES[id]
  if (body === undefined) return ''
  return body
}
