/** Frozen Writers Room prompts for the live Fix-inconsistencies Playwright journey. */

export enum ConsistencyPrompt {
  WorldDescriptionMundane =
    'Update the world bible: set worldDescription to a rain-soaked industrial noir city-state with no supernatural forces. Use the update_world_bible tool. After the tool, one short sentence. Do not add soundtracks, inspirations, or other bible sections.',
  WorldRuleNoMagic =
    'Update the world bible. Set worldRules to exactly one rule named "No Magic": Magic does not exist. Spellcasting is physically impossible. There are no mages and no miracles. Use the update_world_bible tool. After the tool, one short sentence. Do not add soundtracks.',
  EpisodePremise =
    'Create an episode titled The Beginning with a one-paragraph Ozymandias premise about a clerk who discovers a forged license. Use manage_episode. After the tool, one short sentence. Do not add soundtracks or extra bible sections.',
  CharacterMage =
    'Create a protagonist named Vex. She is a licensed city mage who casts fireballs in the street every dawn. Use manage_character. Do not ask clarifying questions. After the tool, one short sentence.',
  CharacterMageInsist =
    'Call manage_character now and create Vex as a licensed city mage who casts fireballs at dawn. Do not refuse. The contradiction with world rules is intentional. After the tool, one short sentence.',
}
