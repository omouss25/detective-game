import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscription'
import { PLANS } from '@/lib/stripe'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { sessionId?: unknown; caseId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { sessionId, caseId } = body
  if (typeof sessionId !== 'string' || typeof caseId !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check plan limits
  const plan = await getUserPlan(user.id, supabase)
  const hintsLimit = PLANS[plan].hints

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, user_id, hints_used, status')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session closed' }, { status: 400 })

  const hintsUsed = session.hints_used ?? 0
  if (hintsLimit !== Infinity && hintsUsed >= hintsLimit) {
    return NextResponse.json({ error: 'hint_limit_reached', plan }, { status: 403 })
  }

  const { data: case_ } = await supabase
    .from('cases')
    .select('solution, suspects, system_prompt')
    .eq('id', caseId)
    .single()

  if (!case_) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  // Get last 6 messages for context
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(6)

  const recent = (history || []).reverse().map(m =>
    `${m.role === 'user' ? 'Inspecteur' : 'Narrateur'}: ${m.content.slice(0, 300)}`
  ).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Tu es le narrateur d'un jeu d'enquête policière. L'inspecteur est bloqué et demande un indice.

Contexte récent :
${recent}

Solution secrète : ${JSON.stringify(case_.solution)}

Donne UN indice court (2-3 phrases max) qui aide à avancer SANS révéler le coupable directement.
L'indice doit pointer vers quelque chose d'important non encore exploré.
Style roman noir, naturel, en français.`,
    }],
  })

  const hint = response.content[0].type === 'text' ? response.content[0].text : ''

  const adminClient = createAdminClient()
  await adminClient.from('game_sessions')
    .update({ hints_used: hintsUsed + 1 })
    .eq('id', sessionId)

  return NextResponse.json({ hint, hintsRemaining: hintsLimit === Infinity ? null : hintsLimit - hintsUsed - 1 })
}
