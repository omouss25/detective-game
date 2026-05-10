import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscription'
import { PLANS } from '@/lib/stripe'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  let body: { sessionId?: unknown; caseId?: unknown; message?: unknown; isIntro?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { sessionId, caseId, message, isIntro } = body

  if (typeof sessionId !== 'string' || typeof caseId !== 'string') {
    return NextResponse.json({ error: 'Missing sessionId or caseId' }, { status: 400 })
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, user_id, message_count')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const plan = await getUserPlan(user.id, supabase)
  const limit = PLANS[plan].messagesPerSession
  const count = (session.message_count as number | null) ?? 0

  // Block if limit reached (intro message is free)
  if (!isIntro && limit !== Infinity && count >= limit) {
    return NextResponse.json({ error: 'message_limit_reached', plan, limit }, { status: 429 })
  }

  const { data: case_ } = await supabase
    .from('cases')
    .select('system_prompt, title')
    .eq('id', caseId)
    .single()

  if (!case_) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  if (history) {
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
  }
  messages.push({ role: 'user', content: message as string })

  // Build system prompt
  const remaining = limit === Infinity ? null : limit - count
  const approachingLimit = remaining !== null && remaining <= Math.ceil((limit as number) * 0.3)

  let systemPrompt = case_.system_prompt +
    '\n\nRÈGLES ABSOLUES DE NARRATION :' +
    '\n- Ne répète JAMAIS la description physique, la position, la tenue ou l\'état émotionnel d\'un personnage déjà présenté dans cette conversation.' +
    '\n- Ne mentionne un personnage que s\'il est DIRECTEMENT impliqué dans la question posée.' +
    '\n- Chaque réponse doit faire AVANCER l\'histoire. Ne reviens jamais sur ce qui a déjà été dit.' +
    '\n- 2-3 paragraphes courts maximum, 80-100 mots. Sois percutant, atmosphérique.' +
    '\n- Ne termine JAMAIS par une question, une liste de choix ou une suggestion d\'action.'

  if (approachingLimit && remaining !== null) {
    systemPrompt +=
      `\n\n[SITUATION CRITIQUE] Il ne reste que ${remaining} échange(s) avant la fermeture forcée du dossier. ` +
      `Sans révéler le coupable, oriente subtilement la narration vers les indices décisifs déjà semés. ` +
      `Renforce l'atmosphère de conclusion imminente. L'inspecteur doit sentir qu'il est temps de trancher.`
  }

  const encoder = new TextEncoder()
  const adminClient = createAdminClient()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await getAnthropic().messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: systemPrompt,
          messages,
        })

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        // Increment message_count (not for intro message)
        if (!isIntro) {
          await adminClient
            .from('game_sessions')
            .update({ message_count: count + 1 })
            .eq('id', sessionId)
        }
      } catch (err) {
        console.error('Stream error:', err)
      } finally {
        controller.close()
      }
    },
  })

  // Pass remaining count in header so client can update without extra fetch
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
  if (remaining !== null) {
    headers['X-Messages-Remaining'] = String(Math.max(0, remaining - 1))
  }

  return new Response(readable, { headers })
}
