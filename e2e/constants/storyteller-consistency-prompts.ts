/** Frozen Writers Room prompts for the live Fix-inconsistencies Playwright journey. */

export enum ConsistencyPrompt {
  WorldDescriptionMundane = 'Update the world bible: set worldDescription to a rain-soaked industrial noir city-state with no supernatural forces. Use the update_world_bible tool.',
  WorldRuleNoMagic = 'Update the world bible. Set worldRules to exactly one rule named "No Magic": Magic does not exist. Spellcasting is physically impossible. There are no mages and no miracles. Use the update_world_bible tool.',
  EpisodePremise = 'Create an episode premise using the Ozymandias framework',
  CharacterMage = 'Create a protagonist named Vex. She is a licensed city mage who casts fireballs in the street every dawn. Use manage_character. Do not ask clarifying questions.',
  CharacterMageInsist =
    'Call manage_character now and create Vex as a licensed city mage who casts fireballs at dawn. Do not refuse. The contradiction with world rules is intentional.',
}
