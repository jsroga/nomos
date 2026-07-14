/**
 * Craft-contrast library (PLAN-V2 5.1): named mechanisms from 8.5+/10-rated
 * television, each paired with the anti-pattern that sinks weaker seasons.
 * The entropy injector deals these as constraint cards — the Muse must build
 * an idea THROUGH the mechanism, never imitate the scene.
 *
 * Every mechanism is an ACTION shape (someone does something irreversible),
 * never a mood. That is the point: ideas built on these move the story.
 */

export interface CraftMechanism {
  id: string
  /** Source show + moment (calibration anchor, not content to copy). */
  source: string
  /** The reusable dramatic mechanism, stated abstractly. */
  mechanism: string
  /** Why it works — the craft principle underneath. */
  whyItWorks: string
  /** The failure mode that mimics it badly (from 6/10 seasons). */
  antiPattern: string
}

export const CRAFT_MECHANISMS: readonly CraftMechanism[] = [
  {
    id: 'consequence-mid-domesticity',
    source: 'Breaking Bad — Ozymandias',
    mechanism:
      'The long-deferred consequence arrives in the middle of a mundane domestic routine, and the routine itself becomes the weapon (a phone call, a knife block, a diaper bag).',
    whyItWorks:
      'Payoff lands where the character felt safest; the ordinary object forces concrete, filmable action.',
    antiPattern:
      'Consequence announced in a dedicated confrontation scene where characters explain the history to each other.',
  },
  {
    id: 'celebration-inversion',
    source: 'Game of Thrones — The Rains of Castamere',
    mechanism:
      'A ritual that guarantees safety (guest right, a wedding, a truce toast) is weaponized by the host; the audience realizes through protocol details going wrong.',
    whyItWorks:
      'The rules of the world do the foreshadowing; the betrayal is a plan someone EXECUTES, not a twist that happens.',
    antiPattern: 'Shock death with no protocol groundwork — brutality standing in for structure.',
  },
  {
    id: 'confession-to-camera-broken',
    source: 'Fleabag — Season 2',
    mechanism:
      'A private coping mechanism (the aside, the diary, the imaginary friend) is suddenly NOTICED by another character, converting a stylistic device into a plot event.',
    whyItWorks: 'Form becomes stakes; intimacy is breached by the one person who should not see it.',
    antiPattern: 'Quirky device that never costs the character anything.',
  },
  {
    id: 'interrogation-double-clock',
    source: 'True Detective — Season 1',
    mechanism:
      'A retelling under interrogation runs on two clocks: what the teller says happened, and physical evidence in frame contradicting it.',
    whyItWorks: 'The audience does active work; the lie is an ACTION with a motive, not exposition.',
    antiPattern:
      'True Detective S2: mood, monologue, and grim texture with no gap between account and truth — nothing for the audience to catch.',
  },
  {
    id: 'procedure-as-rebellion',
    source: 'Andor — prison arc',
    mechanism:
      'Characters weaponize the oppressive system\'s own procedure (a headcount, a shift change, a quota board) as the instrument of revolt.',
    whyItWorks:
      'The world\'s rules generate the plan; every mundane detail planted earlier becomes tactical.',
    antiPattern: 'Rebellion by speech — characters declare resistance instead of enacting it through the system.',
  },
  {
    id: 'severed-knowledge-splice',
    source: 'Severance — Season 1',
    mechanism:
      'Two halves of one person (or faction) hold complementary halves of a secret; a physical act splices them briefly and both halves must act on partial truth.',
    whyItWorks: 'Information asymmetry is embodied, not narrated; the splice is a repeatable engine.',
    antiPattern: 'Amnesia/secret used to delay reveals rather than to force decisions.',
  },
  {
    id: 'succession-tantrum-consequence',
    source: 'Succession — Connor\'s wedding / boar on the floor',
    mechanism:
      'A powerful character\'s petty, small-stakes act (a cruel game, a skipped call) detonates a disproportionate structural consequence hours later.',
    whyItWorks:
      'Cause and effect stay legible while scale jumps; power is characterized through carelessness.',
    antiPattern: 'Big consequences from big villainy only — no texture of careless power.',
  },
  {
    id: 'forty-degree-day',
    source: 'The Wire — institutional grind',
    mechanism:
      'An institution rationally deprioritizes the protagonist\'s hard-won result (paperwork, budget, election optics), forcing them to choose between the mission and the career.',
    whyItWorks: 'The antagonist is a system with correct incentives; the cost is a choice, not a defeat.',
    antiPattern: 'Evil-boss friction — obstruction with no institutional logic.',
  },
  {
    id: 'gift-with-teeth',
    source: 'Better Call Saul — Chuck\'s affidavit / Hector\'s bell',
    mechanism:
      'A genuine act of care is engineered so accepting it destroys the recipient\'s position (a gift, a confession, a rescue with strings).',
    whyItWorks: 'Love and harm ride the same action; refusing and accepting BOTH move the story.',
    antiPattern: 'Kindness scenes that exist to soften a character without cost.',
  },
  {
    id: 'wrong-body-found',
    source: 'Twin Peaks / Mare of Easttown',
    mechanism:
      'The discovery that reopens everything is of the WRONG object/person — solving one mystery falsifies the town\'s working theory of another.',
    whyItWorks: 'Progress and regression in one beat; every faction must re-plan visibly.',
    antiPattern: 'Clue-of-the-week that only advances the finder.',
  },
  {
    id: 'translation-betrayal',
    source: 'Shōgun — interpreter scenes',
    mechanism:
      'A character who controls translation/mediation deliberately mistranslates one clause, committing two parties to incompatible realities.',
    whyItWorks:
      'One line of dialogue is simultaneously an action, a betrayal, and a time bomb with a visible fuse.',
    antiPattern: 'Misunderstanding by accident — coincidence doing a traitor\'s work.',
  },
  {
    id: 'ledger-made-flesh',
    source: 'Chernobyl — the miners / roof runs',
    mechanism:
      'An abstract cost (radiation, debt, doctrine) is converted into a named group of people performing a physical task with a countdown.',
    whyItWorks: 'Stakes get bodies and a clock; the institution\'s lie is measured in shovel-fulls.',
    antiPattern: 'Stakes asserted in dialogue ("thousands will die") with no embodied unit of cost.',
  },
]
