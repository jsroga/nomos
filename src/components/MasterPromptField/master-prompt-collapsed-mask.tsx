import { MasterPromptFieldClass } from './constants/master-prompt-field'

export function MasterPromptCollapsedFade({ value }: { value: string }) {
  return (
    <>
      <div className={MasterPromptFieldClass.Preview} aria-hidden="true">
        {value}
      </div>
      <span className={MasterPromptFieldClass.Fade} />
    </>
  )
}
