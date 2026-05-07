import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkNewAchievements, type AchievementId } from '@/lib/subscription'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { sessionId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ unlocked: [] }) }

  const { sessionId } = body
  if (typeof sessionId !== 'string') return NextResponse.json({ unlocked: [] })

  const { data: session } = await supabase
    .from('game_sessions')
    .select('status, hints_used, message_count, score, case_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ unlocked: [] })

  const { data: case_ } = await supabase
    .from('cases')
    .select('difficulty')
    .eq('id', session.case_id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('cases_solved, streak_current')
    .eq('id', user.id)
    .single()

  // Get already unlocked achievements
  const { data: existing } = await supabase
    .from('achievements')
    .select('achievement_id')
    .eq('user_id', user.id)

  const existingIds = new Set((existing || []).map(a => a.achievement_id))

  const candidates = checkNewAchievements({
    solved: session.status === 'solved',
    messageCount: session.message_count ?? 0,
    hintsUsed: session.hints_used ?? 0,
    score: session.score ?? 0,
    totalSolved: profile?.cases_solved ?? 0,
    difficulty: case_?.difficulty ?? 'moyen',
    streak: profile?.streak_current ?? 0,
  })

  const newOnes = candidates.filter(id => !existingIds.has(id))
  if (newOnes.length === 0) return NextResponse.json({ unlocked: [] })

  const adminClient = createAdminClient()
  await adminClient.from('achievements').insert(
    newOnes.map((achievement_id: AchievementId) => ({ user_id: user.id, achievement_id }))
  )

  return NextResponse.json({ unlocked: newOnes })
}
