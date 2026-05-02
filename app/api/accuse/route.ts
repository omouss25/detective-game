import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { CaseSolution, Suspect } from '@/lib/supabase/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { sessionId, caseId, accusedSuspectId, reasoning } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { data: case_ } = await supabase
    .from('cases')
    .select('solution, suspects, system_prompt, title')
    .eq('id', caseId)
    .single()

  if (!case_) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const solution = case_.solution as unknown as CaseSolution
  const suspects = case_.suspects as unknown as Suspect[]

  const isCorrect = accusedSuspectId === solution.culprit_name ||
    suspects.find(s => s.name === accusedSuspectId)?.id === solution.culprit_id

  // Build narrative resolution prompt
  const resolutionPrompt = isCorrect
    ? `L'inspecteur vient d'accuser correctement ${accusedSuspectId} avec ce raisonnement : "${reasoning}"

Voici la résolution narrative officielle : ${solution.narrative_resolution}

La vérité complète du meurtre : ${solution.motive}

En te basant sur ces éléments, écris une résolution narrative dramatique et immersive (3-4 paragraphes). L'accusé avoue ou est confronté. L'affaire est résolue. Style film noir, années 40-50. Commence par la scène de l'arrestation.`
    : `L'inspecteur a accusé à tort ${accusedSuspectId}. Le vrai coupable est ${solution.culprit_name}.

Raisonnement de l'inspecteur : "${reasoning}"

Écris une scène narrative (2-3 paragraphes) où l'accusé prouve son innocence et le vrai coupable s'échappe ou reste libre. Le narrateur conclut sur l'échec de l'enquête avec une touche amère. Style film noir. L'inspecteur réalise son erreur.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: case_.system_prompt,
    messages: [{ role: 'user', content: resolutionPrompt }],
  })

  const narrative = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({
    correct: isCorrect,
    culprit: solution.culprit_name,
    motive: solution.motive,
    narrative,
  })
}
