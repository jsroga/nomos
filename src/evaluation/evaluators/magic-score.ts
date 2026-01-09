/**
 * Magic Score Evaluator - Anti-AI-Slop Detection
 * 
 * Sophisticated detection of generic, predictable AI outputs.
 * Combines statistical analysis, structural patterns, and semantic evaluation.
 */

import { ChatOpenAI } from '@langchain/openai'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// ============================================
// TYPES
// ============================================

export interface MagicScoreResult {
  overallMagic: number           // 0-100
  dimensions: {
    lexicalDiversity: number     // Vocabulary richness
    structuralUnpredictability: number  // Non-formulaic structure
    semanticOriginality: number  // Fresh ideas vs clichés
    dialogueAuthenticity: number // Real speech patterns
    emotionalSpecificity: number // Specific vs generic emotions
  }
  slopIndicators: SlopIndicator[]
  creativeSparks: string[]
  confidence: number
}

interface SlopIndicator {
  type: 'lexical' | 'structural' | 'semantic' | 'dialogue' | 'emotional'
  severity: 'critical' | 'warning' | 'minor'
  evidence: string
  suggestion: string
}

// ============================================
// STATISTICAL ANALYSIS
// ============================================

/**
 * Type-Token Ratio (TTR) - Vocabulary richness
 * AI slop tends to repeat the same words/phrases
 */
function calculateLexicalDiversity(text: string): {
  ttr: number
  hapaxRatio: number  // Words appearing only once
  avgWordLength: number
  sentenceLengthVariance: number
} {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  if (words.length === 0) return { ttr: 0, hapaxRatio: 0, avgWordLength: 0, sentenceLengthVariance: 0 }
  
  // Type-Token Ratio
  const uniqueWords = new Set(words)
  const ttr = uniqueWords.size / words.length
  
  // Hapax legomena ratio (words appearing only once)
  const wordCounts = new Map<string, number>()
  words.forEach(w => wordCounts.set(w, (wordCounts.get(w) || 0) + 1))
  const hapaxCount = Array.from(wordCounts.values()).filter(c => c === 1).length
  const hapaxRatio = hapaxCount / uniqueWords.size
  
  // Average word length (AI tends toward medium-length "safe" words)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length
  
  // Sentence length variance (AI tends toward uniform sentence length)
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length)
  const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
  const sentenceLengthVariance = sentenceLengths.reduce((sum, len) => 
    sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length
  
  return { ttr, hapaxRatio, avgWordLength, sentenceLengthVariance }
}

/**
 * N-gram predictability - How "expected" is the next word?
 * Uses common AI phrase patterns
 */
function calculatePhraseOriginality(text: string): {
  clicheScore: number  // 0 = no clichés, 1 = all clichés
  uniqueBigrams: number
  repetitivePatterns: string[]
} {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || []
  
  // Common AI bigrams that indicate slop (weighted by severity)
  const SLOP_BIGRAMS_CRITICAL = new Set([
    'in a', 'a world', 'little did', 'unbeknownst to', 
    'heart pounding', 'heart pounded', 'heart raced', 'heart racing',
    'eyes widening', 'eyes widened', 'breath catching', 'breath caught',
    'tears streaming', 'tears streamed', 'time stood', 'time seemed',
    'suddenly realized', 'finally understood', 'never thought',
    'journey of', 'power of', 'found herself', 'found himself',
    'wave of', 'surge of', 'rush of',
  ])
  
  const SLOP_BIGRAMS = new Set([
    ...SLOP_BIGRAMS_CRITICAL,
    'it was', 'there was', 'he was', 'she was',
    'could not', 'did not', 'would not', 'i am', 'you are',
    'the fact', 'in order', 'as well', 'such as', 'due to',
    'in terms', 'at the', 'on the', 'to the', 'of the',
    'needless to', 'couldn\'t help',
    'seemed to', 'appeared to', 'began to', 'started to',
  ])
  
  // Build bigrams
  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`)
  }
  
  // Count slop bigrams (critical ones count double)
  let slopCount = 0
  for (const b of bigrams) {
    if (SLOP_BIGRAMS_CRITICAL.has(b)) {
      slopCount += 2
    } else if (SLOP_BIGRAMS.has(b)) {
      slopCount += 1
    }
  }
  // Normalize but amplify the signal
  const clicheScore = bigrams.length > 0 ? Math.min(1, (slopCount / bigrams.length) * 3) : 0
  
  // Unique bigrams ratio
  const uniqueBigrams = new Set(bigrams).size / Math.max(bigrams.length, 1)
  
  // Find repetitive patterns (same phrase 3+ times)
  const phraseCounts = new Map<string, number>()
  bigrams.forEach(b => phraseCounts.set(b, (phraseCounts.get(b) || 0) + 1))
  const repetitivePatterns = Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([phrase]) => phrase)
  
  return { clicheScore, uniqueBigrams, repetitivePatterns }
}

// ============================================
// STRUCTURAL ANALYSIS
// ============================================

/**
 * Detect formulaic story structure
 */
function analyzeStructure(text: string): {
  formulaicScore: number
  structureIndicators: string[]
} {
  const indicators: string[] = []
  let formulaicScore = 0
  
  // Check for formulaic openings
  const FORMULAIC_OPENINGS = [
    /^(in a world|once upon|it was a|there once|long ago)/i,
    /^(the (morning|day|night) (began|started|dawned))/i,
    /^([A-Z][a-z]+ (was|had been) a (young|brave|ordinary))/i,
    /^([A-Z][a-z]+ walked into)/i,  // Generic entrance
    /^([A-Z][a-z]+ sat (down|at|in))/i,  // Generic positioning
  ]
  
  for (const pattern of FORMULAIC_OPENINGS) {
    if (pattern.test(text.slice(0, 200))) {
      indicators.push('Formulaic opening detected')
      formulaicScore += 0.15
    }
  }
  
  // Check for predictable three-act markers
  const THREE_ACT_MARKERS = [
    /but (then|suddenly|unexpectedly)/gi,
    /little did (he|she|they) know/gi,
    /everything (changed|was about to change)/gi,
    /and (so|thus|therefore)/gi,
    /in the end/gi,
    /finally,? (he|she|they) (realized|understood|learned)/gi,
  ]
  
  let markerCount = 0
  for (const pattern of THREE_ACT_MARKERS) {
    const matches = text.match(pattern)
    if (matches) markerCount += matches.length
  }
  
  if (markerCount > 3) {
    indicators.push(`Heavy use of transition clichés (${markerCount} found)`)
    formulaicScore += Math.min(markerCount * 0.05, 0.25)
  }
  
  // Check for "neat resolution" patterns
  const NEAT_RESOLUTION = [
    /and (they|he|she) lived/i,
    /learned (a valuable|an important) lesson/i,
    /everything (worked out|turned out|fell into place)/i,
    /found (peace|happiness|closure)/i,
    /the power of (love|friendship|hope)/i,
  ]
  
  for (const pattern of NEAT_RESOLUTION) {
    if (pattern.test(text.slice(-500))) {
      indicators.push('Neat resolution cliché')
      formulaicScore += 0.1
    }
  }
  
  // Check for balanced paragraph structure (AI loves uniformity)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  if (paragraphs.length > 3) {
    const lengths = paragraphs.map(p => p.length)
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length
    const cv = Math.sqrt(variance) / avg  // Coefficient of variation
    
    if (cv < 0.3) {  // Very uniform paragraph lengths
      indicators.push('Suspiciously uniform paragraph structure')
      formulaicScore += 0.1
    }
  }
  
  // Check for generic/bland scene-setting
  const BLAND_SCENE_SETTING = [
    /the (smell|scent) of (coffee|food|flowers) filled/i,
    /the (sound|noise) of .+ filled/i,
    /sunlight (streamed|filtered|poured) (through|in)/i,
    /(sat|stood) (there|quietly|silently)/i,
    /\b(usual|regular|typical) (spot|place|seat|order)\b/i,
    /\b(quiet|silent|empty|busy|crowded) (room|shop|cafe|restaurant|street)\b/i,
  ]
  
  let blandCount = 0
  for (const pattern of BLAND_SCENE_SETTING) {
    if (pattern.test(text)) blandCount++
  }
  
  if (blandCount >= 2) {
    indicators.push(`Generic scene-setting (${blandCount} bland descriptors)`)
    formulaicScore += blandCount * 0.08
  }
  
  // Check for predictable action sequences
  const PREDICTABLE_ACTIONS = [
    /phone (buzzed|rang|vibrated)/i,
    /\b(sighed|shrugged|nodded|smiled)\b/gi,  // Overused beats
    /rubbing (his|her|their) (temples|eyes|neck)/i,
    /took a (deep|long) breath/i,
  ]
  
  let predictableCount = 0
  for (const pattern of PREDICTABLE_ACTIONS) {
    const matches = text.match(pattern)
    if (matches) predictableCount += matches.length
  }
  
  if (predictableCount > 3) {
    indicators.push(`Overused action beats (${predictableCount} found)`)
    formulaicScore += Math.min(predictableCount * 0.03, 0.15)
  }
  
  return { formulaicScore: Math.min(formulaicScore, 1), structureIndicators: indicators }
}

// ============================================
// DIALOGUE ANALYSIS
// ============================================

/**
 * Analyze dialogue for authenticity
 */
function analyzeDialogue(text: string): {
  authenticityScore: number  // Higher = more authentic
  issues: string[]
} {
  const issues: string[] = []
  let deductions = 0
  
  // Extract dialogue
  const dialogueMatches = text.match(/"[^"]+"/g) || []
  if (dialogueMatches.length === 0) {
    return { authenticityScore: 0.5, issues: ['No dialogue found'] }
  }
  
  const dialogues = dialogueMatches.map(d => d.slice(1, -1))
  
  // Check for "As you know, Bob" exposition
  const EXPOSITION_PATTERNS = [
    /as you (know|remember|recall)/i,
    /let me (explain|tell you)/i,
    /you see,/i,
    /the thing is,/i,
    /what you (need to|must|should) (know|understand)/i,
  ]
  
  for (const dialogue of dialogues) {
    for (const pattern of EXPOSITION_PATTERNS) {
      if (pattern.test(dialogue)) {
        issues.push(`Exposition dump: "${dialogue.slice(0, 50)}..."`)
        deductions += 0.1
      }
    }
  }
  
  // Check for overly articulate speech (people don't talk in complete sentences)
  const avgDialogueLength = dialogues.reduce((sum, d) => sum + d.split(/\s+/).length, 0) / dialogues.length
  if (avgDialogueLength > 25) {
    issues.push('Dialogue too long and articulate - people speak in fragments')
    deductions += 0.15
  }
  
  // Check for lack of contractions (AI often avoids them)
  const totalWords = dialogues.join(' ').split(/\s+/).length
  const contractions = dialogues.join(' ').match(/\b(I'm|you're|he's|she's|it's|we're|they're|don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|haven't|hasn't|hadn't|I've|you've|we've|they've|I'll|you'll|he'll|she'll|we'll|they'll|that's|there's|here's|what's|who's|how's|let's|ain't)\b/gi) || []
  
  const contractionRate = contractions.length / totalWords
  if (contractionRate < 0.02 && totalWords > 50) {
    issues.push('Lack of contractions - dialogue sounds formal/robotic')
    deductions += 0.1
  }
  
  // Check for emotional telling vs showing
  const TELLING_EMOTIONS = [
    /I (feel|felt|am feeling) (sad|happy|angry|scared|excited)/i,
    /(he|she) (was|felt) (sad|happy|angry|scared|excited)/i,
    /with (anger|sadness|happiness|fear|excitement) in (his|her|their) voice/i,
  ]
  
  for (const dialogue of dialogues) {
    for (const pattern of TELLING_EMOTIONS) {
      if (pattern.test(dialogue)) {
        issues.push('Telling emotions instead of showing')
        deductions += 0.05
      }
    }
  }
  
  // Check for interruptions, trailing off, and natural speech patterns (good signs)
  let bonuses = 0
  const interruptionCount = (text.match(/—"/g) || []).length  // Em-dash interruption
  const trailingOff = (text.match(/\.\.\./g) || []).length
  const fragments = dialogues.filter(d => d.split(/\s+/).length < 5).length
  
  if (interruptionCount > 0) bonuses += 0.1
  if (trailingOff > 0) bonuses += 0.05
  if (fragments > dialogues.length * 0.2) bonuses += 0.1  // At least 20% short fragments
  
  const authenticityScore = Math.max(0, Math.min(1, 1 - deductions + bonuses))
  
  return { authenticityScore, issues }
}

// ============================================
// EMOTIONAL SPECIFICITY
// ============================================

/**
 * Check if emotions are specific or generic
 */
function analyzeEmotionalSpecificity(text: string): {
  specificityScore: number
  genericEmotions: string[]
} {
  const genericEmotions: string[] = []
  
  // Generic emotional descriptors (bad)
  const GENERIC_EMOTIONS = [
    { pattern: /heart (pounded|raced|beat faster)/gi, label: 'heart pounding cliché' },
    { pattern: /eyes (widened|narrowed|filled with tears)/gi, label: 'eyes descriptor cliché' },
    { pattern: /breath (caught|hitched|quickened)/gi, label: 'breath cliché' },
    { pattern: /felt a (wave|surge|rush) of/gi, label: 'wave of emotion cliché' },
    { pattern: /stomach (dropped|churned|knotted)/gi, label: 'stomach cliché' },
    { pattern: /blood (ran cold|boiled|froze)/gi, label: 'blood cliché' },
    { pattern: /a (chill|shiver) (ran|went) down/gi, label: 'chill down spine cliché' },
    { pattern: /tears (streamed|rolled|fell)/gi, label: 'tears cliché' },
    { pattern: /couldn't (believe|help|stop)/gi, label: 'couldn\'t believe cliché' },
    { pattern: /time (stood still|seemed to stop|slowed)/gi, label: 'time stopped cliché' },
  ]
  
  let clicheCount = 0
  for (const { pattern, label } of GENERIC_EMOTIONS) {
    const matches = text.match(pattern)
    if (matches) {
      clicheCount += matches.length
      genericEmotions.push(`${label} (${matches.length}x)`)
    }
  }
  
  // Count total emotional moments (rough heuristic)
  const emotionalMoments = (text.match(/\b(felt|feeling|emotion|heart|tears|cry|laugh|smile|frown|anger|fear|joy|sad|happy|love|hate|hope|despair)\b/gi) || []).length
  
  const clicheRatio = emotionalMoments > 0 ? clicheCount / emotionalMoments : 0
  const specificityScore = Math.max(0, 1 - clicheRatio * 2)  // Penalize heavily
  
  return { specificityScore, genericEmotions }
}

// ============================================
// SEMANTIC ORIGINALITY (LLM-as-Judge)
// ============================================

const MAGIC_JUDGE_PROMPT = `You are a ruthless creative writing critic who DESPISES generic AI-generated content.

Your job is to identify what makes writing feel ALIVE versus DEAD/FORMULAIC.

## Evaluate This Content:

{content}

## Score These Dimensions (0-100, be HARSH):

### 1. CONCEPTUAL ORIGINALITY
- 0-20: Derivative, seen-it-before ideas
- 30-50: Some fresh elements, mostly conventional
- 60-80: Genuinely interesting concepts, unexpected combinations
- 90-100: Truly original, makes you think "I've never seen this before"

### 2. CHARACTER SPECIFICITY
- 0-20: Could be any character from any story
- 30-50: Some distinctive traits, mostly archetypal
- 60-80: Memorable, specific details that matter
- 90-100: Unforgettable, contradictory, deeply human

### 3. PROSE VOICE
- 0-20: Generic "AI voice" - safe, balanced, predictable
- 30-50: Some personality, but could be anyone
- 60-80: Distinctive style, author would be recognizable
- 90-100: Voice so strong it could only be this writer

### 4. RISK-TAKING
- 0-20: Plays it safe at every turn
- 30-50: Occasional bold choices buried in safety
- 60-80: Commits to interesting choices, accepts consequences
- 90-100: Fearless, makes choices that could fail but land

### 5. MEMORABILITY
- 0-20: Forgettable, would not remember next week
- 30-50: Some moments stick, overall hazy
- 60-80: Several memorable images/moments
- 90-100: Haunting, will think about this for days

## Also List:
- **CREATIVE SPARKS**: Specific moments that surprised you or felt genuinely creative
- **SLOP ALERTS**: Specific phrases/moments that scream "AI generated this"
- **WHAT WOULD MAKE IT BETTER**: One specific suggestion to increase originality

Respond with JSON only:
{
  "conceptualOriginality": 45,
  "characterSpecificity": 30,
  "proseVoice": 25,
  "riskTaking": 20,
  "memorability": 35,
  "creativeSparks": ["list of specific moments"],
  "slopAlerts": ["list of generic/AI moments"],
  "improvementSuggestion": "specific suggestion"
}`

async function runSemanticAnalysis(content: string): Promise<{
  scores: {
    conceptualOriginality: number
    characterSpecificity: number
    proseVoice: number
    riskTaking: number
    memorability: number
  }
  creativeSparks: string[]
  slopAlerts: string[]
  suggestion: string
} | null> {
  try {
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,  // Slightly creative for better critique
    })
    
    const prompt = MAGIC_JUDGE_PROMPT.replace('{content}', content.slice(0, 6000))
    const response = await model.invoke(prompt)
    const responseText = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content)
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    
    const parsed = JSON.parse(jsonMatch[0])
    
    return {
      scores: {
        conceptualOriginality: parsed.conceptualOriginality || 50,
        characterSpecificity: parsed.characterSpecificity || 50,
        proseVoice: parsed.proseVoice || 50,
        riskTaking: parsed.riskTaking || 50,
        memorability: parsed.memorability || 50,
      },
      creativeSparks: parsed.creativeSparks || [],
      slopAlerts: parsed.slopAlerts || [],
      suggestion: parsed.improvementSuggestion || '',
    }
  } catch (error) {
    console.error('Semantic analysis failed:', error)
    return null
  }
}

// ============================================
// MAIN EVALUATOR
// ============================================

export const magicScoreEvaluator: CustomEvaluator = {
  name: 'magic-score',
  
  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const content = typeof output === 'string' 
      ? output 
      : (output as any).response || JSON.stringify(output)
    
    if (content.length < 100) {
      return {
        score: 0.5,
        reasoning: 'Content too short for magic score evaluation',
        metadata: { skipped: true },
      }
    }
    
    // Run all analyses in parallel
    const [lexical, phrases, structure, dialogue, emotions, semantic] = await Promise.all([
      Promise.resolve(calculateLexicalDiversity(content)),
      Promise.resolve(calculatePhraseOriginality(content)),
      Promise.resolve(analyzeStructure(content)),
      Promise.resolve(analyzeDialogue(content)),
      Promise.resolve(analyzeEmotionalSpecificity(content)),
      runSemanticAnalysis(content),
    ])
    
    // Collect all slop indicators
    const slopIndicators: SlopIndicator[] = []
    
    // Lexical issues
    if (lexical.ttr < 0.4) {
      slopIndicators.push({
        type: 'lexical',
        severity: 'warning',
        evidence: `Low vocabulary diversity (TTR: ${lexical.ttr.toFixed(2)})`,
        suggestion: 'Use more varied vocabulary, avoid repetition',
      })
    }
    
    if (lexical.sentenceLengthVariance < 50) {
      slopIndicators.push({
        type: 'structural',
        severity: 'minor',
        evidence: 'Uniform sentence lengths',
        suggestion: 'Vary sentence rhythm - mix short punchy with longer flowing',
      })
    }
    
    // Phrase issues
    if (phrases.clicheScore > 0.05) {
      slopIndicators.push({
        type: 'lexical',
        severity: phrases.clicheScore > 0.1 ? 'critical' : 'warning',
        evidence: `High cliché density (${(phrases.clicheScore * 100).toFixed(1)}%)`,
        suggestion: 'Replace common phrases with specific, fresh alternatives',
      })
    }
    
    phrases.repetitivePatterns.forEach(pattern => {
      slopIndicators.push({
        type: 'lexical',
        severity: 'warning',
        evidence: `Repetitive phrase: "${pattern}"`,
        suggestion: 'Find different ways to express this',
      })
    })
    
    // Structure issues
    structure.structureIndicators.forEach(indicator => {
      slopIndicators.push({
        type: 'structural',
        severity: 'warning',
        evidence: indicator,
        suggestion: 'Subvert expectations, avoid predictable story beats',
      })
    })
    
    // Dialogue issues
    dialogue.issues.forEach(issue => {
      slopIndicators.push({
        type: 'dialogue',
        severity: 'warning',
        evidence: issue,
        suggestion: 'Make dialogue sound like real speech - fragments, interruptions, subtext',
      })
    })
    
    // Emotional issues
    emotions.genericEmotions.forEach(emotion => {
      slopIndicators.push({
        type: 'emotional',
        severity: 'minor',
        evidence: emotion,
        suggestion: 'Show specific physical/behavioral responses, not generic descriptions',
      })
    })
    
    // Calculate dimension scores
    const dimensions = {
      lexicalDiversity: Math.min(1, lexical.ttr / 0.6) * 100,  // Target TTR of 0.6
      structuralUnpredictability: (1 - structure.formulaicScore) * 100,
      semanticOriginality: semantic?.scores.conceptualOriginality || 50,
      dialogueAuthenticity: dialogue.authenticityScore * 100,
      emotionalSpecificity: emotions.specificityScore * 100,
    }
    
    // Calculate overall magic score
    // Weight semantic analysis higher if available
    let overallMagic: number
    
    if (semantic) {
      // With LLM analysis (more accurate)
      const semanticAvg = (
        semantic.scores.conceptualOriginality +
        semantic.scores.characterSpecificity +
        semantic.scores.proseVoice +
        semantic.scores.riskTaking +
        semantic.scores.memorability
      ) / 5
      
      const heuristicAvg = (
        dimensions.lexicalDiversity +
        dimensions.structuralUnpredictability +
        dimensions.dialogueAuthenticity +
        dimensions.emotionalSpecificity
      ) / 4
      
      // 60% semantic, 40% heuristic
      overallMagic = semanticAvg * 0.6 + heuristicAvg * 0.4
    } else {
      // Heuristic only
      overallMagic = (
        dimensions.lexicalDiversity +
        dimensions.structuralUnpredictability +
        dimensions.dialogueAuthenticity +
        dimensions.emotionalSpecificity
      ) / 4
    }
    
    // Penalty for critical slop indicators
    const criticalCount = slopIndicators.filter(s => s.severity === 'critical').length
    overallMagic = Math.max(0, overallMagic - criticalCount * 10)
    
    // Collect creative sparks
    const creativeSparks = semantic?.creativeSparks || []
    
    // Generate reasoning
    const reasoning = overallMagic >= 70
      ? `Strong creative work. Magic: ${overallMagic.toFixed(0)}. Sparks: ${creativeSparks.slice(0, 2).join(', ') || 'N/A'}`
      : overallMagic >= 50
      ? `Average creativity. Magic: ${overallMagic.toFixed(0)}. Issues: ${slopIndicators.slice(0, 2).map(s => s.evidence).join('; ')}`
      : `AI slop detected. Magic: ${overallMagic.toFixed(0)}. Critical issues: ${slopIndicators.filter(s => s.severity === 'critical').map(s => s.evidence).join('; ')}`
    
    return {
      score: overallMagic / 100,
      reasoning,
      metadata: {
        overallMagic,
        dimensions,
        slopIndicators,
        creativeSparks,
        semanticAnalysis: semantic ? {
          ...semantic.scores,
          suggestion: semantic.suggestion,
        } : null,
        lexicalStats: lexical,
        phraseStats: phrases,
      },
    }
  },
}

/**
 * Fast heuristic-only version (no LLM call)
 */
export const magicScoreHeuristic: CustomEvaluator = {
  name: 'magic-score-fast',
  
  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const content = typeof output === 'string' 
      ? output 
      : (output as any).response || JSON.stringify(output)
    
    if (content.length < 100) {
      return { score: 0.5, reasoning: 'Content too short', metadata: { skipped: true } }
    }
    
    const lexical = calculateLexicalDiversity(content)
    const phrases = calculatePhraseOriginality(content)
    const structure = analyzeStructure(content)
    const dialogue = analyzeDialogue(content)
    const emotions = analyzeEmotionalSpecificity(content)
    
    const dimensions = {
      lexicalDiversity: Math.min(1, lexical.ttr / 0.6) * 100,
      structuralUnpredictability: (1 - structure.formulaicScore) * 100,
      dialogueAuthenticity: dialogue.authenticityScore * 100,
      emotionalSpecificity: emotions.specificityScore * 100,
      phraseOriginality: (1 - phrases.clicheScore) * 100,
    }
    
    // Weighted average - structure and phrases matter most for slop detection
    const weights = {
      lexicalDiversity: 0.1,
      structuralUnpredictability: 0.25,
      dialogueAuthenticity: 0.2,
      emotionalSpecificity: 0.2,
      phraseOriginality: 0.25,
    }
    
    let overallMagic = 0
    for (const [key, weight] of Object.entries(weights)) {
      overallMagic += dimensions[key as keyof typeof dimensions] * weight
    }
    
    // Additional penalty for multiple issues
    const issueCount = structure.structureIndicators.length + dialogue.issues.length + emotions.genericEmotions.length
    if (issueCount > 3) {
      overallMagic *= 0.8  // 20% penalty for lots of issues
    }
    if (issueCount > 6) {
      overallMagic *= 0.8  // Another 20% penalty
    }
    
    const criticalIssues = [
      ...structure.structureIndicators,
      ...dialogue.issues,
      ...emotions.genericEmotions,
    ].slice(0, 3)
    
    return {
      score: overallMagic / 100,
      reasoning: `Magic: ${overallMagic.toFixed(0)}. ${criticalIssues.length > 0 ? `Issues: ${criticalIssues.join('; ')}` : 'No critical slop detected'}`,
      metadata: { overallMagic, dimensions },
    }
  },
}

// ============================================
// GUARDRAIL VALIDATOR
// ============================================

import { ValidationResult, Validator } from '@/domains/storyteller/guardrails/runnable-guard'
import { WritersRoomState } from '@/domains/storyteller/graph/state'

/**
 * Anti-Slop Validator for use in RunnableGuard
 * Warns (doesn't block) when AI slop is detected
 */
export class AntiSlopValidator implements Validator<Partial<WritersRoomState>> {
  name = 'AntiSlop'
  threshold: number
  
  constructor(threshold = 40) {  // Below 40 = too sloppy
    this.threshold = threshold
  }
  
  async validate(output: Partial<WritersRoomState>): Promise<ValidationResult> {
    // Extract content to check
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage 
      ? (typeof lastMessage.content === 'string' ? lastMessage.content : '')
      : ''
    
    if (content.length < 100) {
      return { isValid: true, issues: [] }
    }
    
    // Run fast heuristic check
    const result = await magicScoreHeuristic.evaluate({
      input: {},
      output: { response: content },
    })
    
    const magicScore = (result.metadata as any)?.overallMagic || 50
    
    if (magicScore < this.threshold) {
      return {
        isValid: true,  // Don't block, just warn
        issues: [{
          code: 'AI_SLOP_DETECTED',
          message: `Low creativity score (${magicScore.toFixed(0)}/100). Consider making output more specific and original.`,
          severity: 'warning',
          context: result.metadata,
        }],
      }
    }
    
    return { isValid: true, issues: [] }
  }
}

