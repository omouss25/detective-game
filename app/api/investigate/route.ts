import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  let body: { sessionId?: unknown; caseId?: unknown; message?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { sessionId, caseId, message } = body

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

  // Verify session ownership
  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Get case for system prompt
  const { data: case_ } = await supabase
    .from('cases')
    .select('system_prompt, title')
    .eq('id', caseId)
    .single()

  if (!case_) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  // Get conversation history (last 20 messages for context)
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

  // Add current message
  messages.push({ role: 'user', content: message as string })

  const systemPrompt = case_.system_prompt +
    '\n\nRÈGLE ABSOLUE : Ne termine JAMAIS une réponse par des suggestions d\'actions, une liste de choix, ou une question du type "Que souhaitez-vous faire ?", "Que décidez-vous ?", "Quelle est votre prochaine action ?". Termine toujours sur la narration ou le dialogue, point final.'

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({ text: event.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('Stream error:', err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
