import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calculateScore } from '@/lib/subscription'
import type { CaseSolution, Suspect } from '@/lib/supabase/types'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  let body: { sessionId?: unknown; caseId?: unknown; accusedSuspectId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { sessionId, caseId, accusedSuspectId } = body

  if (typeof sessionId !== 'string' || typeof caseId !== 'string' || typeof accusedSuspectId !== 'string') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, user_id, hints_used, started_at, status')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session already resolved' }, { status: 400 })

  // Count messages
  const { count: messageCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('session_id', sessionId)
    .eq('role', 'user')

  const { data: case_ } = await supabase
    .from('cases')
    .select('solution, suspects, system_prompt, title, difficulty')
    .eq('id', caseId)
    .single()

  if (!case_) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const solution = case_.solution as unknown as CaseSolution
  const suspects = case_.suspects as unknown as Suspect[]

  const validSuspect = suspects.find(s => s.name === accusedSuspectId)
  if (!validSuspect) return NextResponse.json({ error: 'Invalid suspect' }, { status: 400 })

  const isCorrect = accusedSuspectId === solution.culprit_name || accusedSuspectId === solution.culprit_id

  const hintsUsed = session.hints_used ?? 0
  const durationSeconds = session.started_at
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : 600

  const score = calculateScore({
    solved: isCorrect,
    messageCount: messageCount ?? 0,
    hintsUsed,
    durationSeconds,
  })

  const resolutionPrompt = isCorrect
    ? `L'inspecteur vient d'accuser correctement ${accusedSuspectId}.

Voici la résolution narrative officielle : ${solution.narrative_resolution}
La vérité complète du meurtre : ${solution.motive}

Écris une résolution narrative dramatique et immersive (3-4 paragraphes). L'accusé avoue ou est confronté. L'affaire est résolue. Style film noir, années 40-50. Commence par la scène de l'arrestation.`
    : `L'inspecteur a accusé à tort ${accusedSuspectId}. Le vrai coupable est ${solution.culprit_name}.

Écris une scène narrative (2-3 paragraphes) où l'accusé prouve son innocence et le vrai coupable s'échappe ou reste libre. Le narrateur conclut sur l'échec de l'enquête avec une touche amère. Style film noir. L'inspecteur réalise son erreur.`

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: case_.system_prompt,
    messages: [{ role: 'user', content: resolutionPrompt }],
  })

  const narrative = response.content[0].type === 'text' ? response.content[0].text : ''

  // Update session with score + message_count
  const adminClient = createAdminClient()
  await adminClient.from('game_sessions').update({
    score,
    message_count: messageCount ?? 0,
  }).eq('id', sessionId)

  // Update streak if solved
  if (isCorrect) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_played_date, streak_current, streak_best, total_score')
      .eq('id', user.id)
      .single()

    if (profile) {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const lastPlayed = profile.last_played_date

      const newStreak = lastPlayed === yesterday
        ? (profile.streak_current ?? 0) + 1
        : lastPlayed === today
          ? profile.streak_current ?? 1
          : 1

      const newBest = Math.max(profile.streak_best ?? 0, newStreak)
      const newTotal = (profile.total_score ?? 0) + score

      await adminClient.from('profiles').update({
        last_played_date: today,
        streak_current: newStreak,
        streak_best: newBest,
        total_score: newTotal,
      }).eq('id', user.id)
    }
  }

  return NextResponse.json({
    correct: isCorrect,
    culprit: solution.culprit_name,
    motive: solution.motive,
    narrative,
    score,
    difficulty: case_.difficulty,
  })
}
