import {
  StorytellerBibleQuery,
  StorytellerQueryParam,
} from '@/domains/storyteller/core/storyteller-page-wire'

export { StorytellerBibleQuery, StorytellerQueryParam }

export enum StorytellerBibleDomEvent {
  Opened = 'bible-opened',
  Toggle = 'toggle-world-bible',
}
