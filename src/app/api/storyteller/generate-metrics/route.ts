import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const { description } = body

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert character psychologist. Analyze the character description and generate baseline psychological metrics (based on Affective Circumplex Model + Self-Determination Theory).
                    
Return ONLY a JSON object with these keys: valence, arousal, autonomy, competence, relatedness, cognitiveClarity, perceivedStakes, socialSafety, moralAlignment.

## Metrics Guide:

### Core Affective State (Emotional Circumplex)
- **valence** (-100 to +100): Emotional tone from very negative to very positive
  * -80 to -100: Devastated, in despair
  * -40 to -60: Sad, frustrated, annoyed
  * -20 to +20: Neutral, ambivalent
  * +40 to +60: Content, pleased, hopeful
  * +80 to +100: Elated, joyful, ecstatic
  
- **arousal** (0-100): Energy/activation level
  * 0-20: Lethargic, numb, depressed
  * 30-50: Calm, relaxed, moderate energy
  * 60-80: Alert, engaged, energized
  * 90-100: Panicked, manic, highly agitated

### Psychological Needs (Self-Determination Theory)
- **autonomy** (0-100): Perceived freedom and self-direction
  * 0-30: Controlled, trapped, coerced
  * 40-60: Some freedom, moderate constraints
  * 70-100: Self-determined, free to choose

- **competence** (0-100): Belief in capability to handle challenges
  * 0-30: Helpless, incompetent, overwhelmed
  * 40-60: Moderately capable, some self-doubt
  * 70-100: Confident, masterful, skilled

- **relatedness** (0-100): Sense of connection to others
  * 0-30: Completely isolated, disconnected
  * 40-60: Some connections, moderately supported
  * 70-100: Deeply connected, strong relationships

### Cognitive & Threat Assessment
- **cognitiveClarity** (0-100): Mental sharpness and decision-making capacity
  * 0-30: Confused, foggy, impaired judgment
  * 40-60: Some clarity, can think but stressed
  * 70-100: Crystal clear, sharp thinking

- **perceivedStakes** (0-100): How much they believe is on the line
  * 0-30: Low stakes, nothing critical at risk
  * 40-60: Moderate stakes, meaningful but manageable
  * 70-100: Everything is at risk, life-or-death

### Social & Moral Mechanisms
- **socialSafety** (0-100): Perceived safety in current social context
  * 0-30: Threatened, vulnerable, unsafe
  * 40-60: Moderately safe, some caution needed
  * 70-100: Completely safe, can be authentic

- **moralAlignment** (0-100): Alignment between actions and values
  * 0-30: Severe moral injury, betraying core values
  * 40-60: Some moral tension, compromises made
  * 70-100: Acting with complete integrity

## Example Analyses:

**"A hardened detective haunted by a case she couldn't solve"**
→ {valence: -40, arousal: 65, autonomy: 70, competence: 50, relatedness: 30, cognitiveClarity: 60, perceivedStakes: 80, socialSafety: 50, moralAlignment: 60}

**"A cheerful barista who loves connecting with customers"**
→ {valence: 70, arousal: 60, autonomy: 75, competence: 80, relatedness: 85, cognitiveClarity: 80, perceivedStakes: 20, socialSafety: 85, moralAlignment: 90}

**"A spy forced to betray their country for a greater cause"**
→ {valence: -60, arousal: 85, autonomy: 20, competence: 75, relatedness: 15, cognitiveClarity: 50, perceivedStakes: 95, socialSafety: 10, moralAlignment: 30}

Analyze the provided description and return appropriate baseline metrics.`,
        },
        {
          role: 'user',
          content: description,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content generated')
    }

    const metrics = JSON.parse(content)
    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('Error generating metrics:', error)
    return NextResponse.json({ error: 'Failed to generate metrics' }, { status: 500 })
  }
})
