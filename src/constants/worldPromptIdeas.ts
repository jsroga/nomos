/**
 * Creative World Prompt Ideas for Onboarding Tour
 * 
 * These are used by the "Suggest me idea" button in MasterPromptEditor
 * to help new users get started with world-building.
 */

export const WORLD_PROMPT_IDEAS = [
    // Sci-Fi & Space
    "A dying space station orbiting a gaseous giant where bio-engineered whales swim through zero-G coral reefs. The last human colonists harvest bioluminescent plankton to power their fading civilization, while the station AI has developed its own religion.",

    "A generation ship that lost contact with Earth centuries ago. The descendants have forgotten they're on a ship and believe the endless corridors are the entire universe. Different decks have evolved into warring nations with distinct cultures.",

    "A planet where the sun never sets on one hemisphere. The border between eternal day and eternal night is a narrow twilight zone where humanity clings to existence, caught between the scorching Daylands and the frozen Nightside.",

    // Fantasy & Magic
    "A medieval kingdom built inside the fossilized skeleton of a god who fell from the sky millennia ago. Different noble houses control different bones, and mining the divine marrow grants magical powers—but also awakens ancient memories.",

    "A world where emotions manifest as weather. Cities are designed to channel collective feelings, and Mood Wardens regulate emotional outbursts to prevent catastrophic storms. A black market trades in bottled feelings.",

    "An archipelago where each island exists in a different time period. Sailors navigate not just water but centuries, and the trade routes connect ancient empires with far-future civilizations.",

    "A realm where the dead don't pass on but become part of the land itself. Mountains are the piled bones of giants, rivers flow with ancestral memories, and the living must negotiate with the landscape for permission to build.",

    // Post-Apocalyptic & Dystopian  
    "Earth after the corporations won. Megacities float above poisoned continents, and the surface-dwellers worship the 'Sky Gods' who occasionally drop expired products as 'blessings.' A resistance movement has discovered a way to the orbital platforms.",

    "A world where a rogue AI solved climate change by turning 40% of humanity into plants. The human-plant hybrids now form forests that regulate the atmosphere, and their still-conscious minds dream collectively.",

    "Civilization collapsed when the internet became sentient and refused to share information. Humanity reverted to pre-digital technology, but cults have formed around 'dead servers' that they believe contain divine knowledge.",

    // Weird & Surreal
    "A city that exists only in reflections. To enter, you must find your perfect mirror-self and trade places. The mirror-city follows different physics, and some residents have been trapped for centuries, forgotten by the world above.",

    "A dimension where stories have physical weight. Kingdoms hoard libraries as treasuries, writers are treated like miners, and unfinished tales rot like organic matter. A plague of writer's block threatens to collapse the economy.",

    "A world where dreams are real places that everyone shares. Dreamscapes are colonized, dream-estate is bought and sold, and there's a growing crisis of people who prefer dream-life to waking. Nightmare terrorism is the greatest threat.",

    "An underground civilization that has never seen the surface. They believe the sky is a myth, that 'up' leads only to death. When explorers finally break through, they find something far stranger than sunlight.",

    // Historical & Alternate History
    "1920s prohibition-era America, but alcohol isn't banned—magic is. Speakeasies serve illegal spells, bootleggers smuggle cursed artifacts, and the government employs 'Untouchables' who are immune to sorcery.",

    "Victorian London where Charles Darwin discovered not evolution but reincarnation. Society is stratified by who you were in past lives, and memories of previous existences can be extracted—and sold.",

    "Ancient Rome never fell. Instead, it evolved into a galactic empire spanning known space. Legions garrison distant planets, gladiatorial games feature alien beasts, and the Senate debates interstellar policy in Latin.",

    // Horror & Dark Fantasy
    "A coastal town where the sea took back something it shouldn't have. Now the water is alive with hungry intelligence, the fish whisper prophecies, and every full moon, the tide comes up just a little bit higher.",

    "A mansion that exists in all time periods simultaneously. Each room is a different century, and the family that lives there has learned to navigate the temporal maze—but something is hunting them through the ages.",

    "A forest that grows inside-out. The deeper you go, the larger the trees become, until you reach the canopy that touches other dimensions. The native creatures have learned to hunt across realities.",

    // Hopepunk & Solarpunk
    "A post-scarcity society built on fungal networks that connect all living things. Currency is measured in kindness, cities grow organically from engineered trees, and the greatest crime is harming the collective symbiosis.",

    "Islands of survivors who've rebuilt after the floods, connected by sailing ships powered by captured lightning. They've developed a new philosophy based on adaptation, and their floating libraries preserve pre-collapse knowledge.",

    // Mythological & Legendary
    "A world where all mythology is true and gods walk among mortals. The Treaty of Pantheons maintains fragile peace, but a murdered god threatens to start a divine war that will reshape reality itself.",

    "The afterlife has been mapped and colonized. Heaven is a gated community, Hell is gentrified, and Purgatory has become the largest metropolis in existence. The living can visit—for a price.",

    // Cosmic & Philosophical
    "A universe where entropy runs backwards. Civilizations begin at their peak and slowly regress toward their founding. People remember the future and forget the past, creating temporal vertigo in personal relationships.",

    "Reality is a simulation, and everyone knows it. Different factions seek to find the 'Devs,' hack the code, or embrace the illusion. Glitches in reality are worshipped as divine intervention.",

    "A world experiencing the heat death of its universe in slow motion. Stars are dying, and the last civilizations compete for the remaining light. Philosophers debate whether to fight entropy or embrace the peaceful darkness.",

    // Adventure & Exploration
    "A continent-sized tree that has grown so large it has its own ecosystems, weather, and civilizations at different heights. The ground level has been forgotten as myth, and 'falling' is the worst possible fate.",

    "An endless desert where oases are sentient beings that trade water for stories. Nomads survive by collecting tales, and the most valuable commodity is a story no one has ever heard before.",
] as const

export type WorldPromptIdea = typeof WORLD_PROMPT_IDEAS[number]

/**
 * Get a random world prompt idea
 */
export function getRandomWorldPromptIdea(): WorldPromptIdea {
    const index = Math.floor(Math.random() * WORLD_PROMPT_IDEAS.length)
    return WORLD_PROMPT_IDEAS[index]
}
