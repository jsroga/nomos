/**
 * Entropy card decks (PLAN-V2 5.1 / D4): the randomness the Muse cannot fake.
 * Code-side dice pick cards; the model must build an idea that SATISFIES its
 * cards. Every deck entry is phrased as a hard constraint on ACTION — a thing
 * that must happen on screen — never a mood to evoke.
 */

/** Concrete objects that must be instrumental (not decorative) in the idea. */
export const PROP_CARDS: readonly string[] = [
  'a document signed by the wrong person',
  'a key that no longer fits anything',
  'an animal that belongs to the victim',
  'a meal that must be finished before anyone can leave',
  'a piece of clothing worn by two different characters in one day',
  'a debt token (coin, marker, ledger line) changing hands in public',
  'a broken timekeeping device that is still trusted',
  'a container everyone believes is empty',
  'a map with one deliberate error',
  'a gift that cannot be refused without insult',
]

/** Clocks — the idea must contain this pressure, visibly counting down. */
export const URGENCY_CARDS: readonly string[] = [
  'before the bells stop ringing',
  'before the tide turns',
  'before a named witness sobers up',
  'before the ink dries and the seal sets',
  'during a single change of the guard',
  'before the food goes cold',
  'while a ceremony is still legally in progress',
  'before the messenger arrives with the true version',
]

/** Venues — the action must exploit a property OF this place. */
export const VENUE_CARDS: readonly string[] = [
  'a place where speaking is forbidden',
  'a place with exactly one exit, currently watched',
  'a place where both factions must pretend to be friendly',
  'a place that legally belongs to neither party',
  'a place being dismantled around the characters',
  'a place where everyone is armed but using a weapon means ruin',
]

/** Reversal constraints — a required irreversible turn shape. */
export const REVERSAL_CARDS: readonly string[] = [
  'the character achieving their goal must be the one who destroys its value',
  'the rescuer must need rescuing by the person they came for',
  'the secret must be revealed by someone trying to protect it',
  'the weakest person present must end the scene holding the leverage',
  'the plan must succeed AND make things worse',
  'someone must pay a real price for being right',
]
