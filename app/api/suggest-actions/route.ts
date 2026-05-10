import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ suggestions: defaultSuggestions() })

  let body: { sessionId?: unknown; usedActions?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ suggestions: defaultSuggestions() }) }

  const { sessionId, usedActions } = body
  if (typeof sessionId !== 'string') return NextResponse.json({ suggestions: defaultSuggestions() })

  const used: string[] = Array.isArray(usedActions)
    ? (usedActions as unknown[]).filter((a): a is string => typeof a === 'string').slice(-20)
    : []

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ suggestions: defaultSuggestions() })

  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!history || history.length === 0) {
    return NextResponse.json({ suggestions: defaultSuggestions() })
  }

  const conversationSummary = [...history].reverse()
    .map(m => `${m.role === 'user' ? 'Inspecteur' : 'Narrateur'}: ${m.content.slice(0, 180)}`)
    .join('\n')

  const usedBlock = used.length > 0
    ? `\nActions DÉJÀ effectuées — NE PAS répéter ni suggérer de nouveau :\n${used.map(a => `- ${a}`).join('\n')}\n`
    : ''

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Tu es l'assistant d'un jeu d'enquête policière noir des années 40 en français.

Fin de la conversation :
${conversationSummary}
${usedBlock}
Génère exactement 4 actions NOUVELLES et LOGIQUES pour faire progresser l'enquête.
Règles :
- Jamais les mêmes que les actions déjà effectuées
- Cohérentes avec l'état ACTUEL de l'enquête (pas ce qui a déjà été exploré)
- Court : 5-7 mots, commence par un verbe à l'infinitif
- Style policier années 40, français
- JSON uniquement : {"suggestions": ["action1", "action2", "action3", "action4"]}`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    try {
      const parsed = JSON.parse(cleaned)
      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : defaultSuggestions()
      return NextResponse.json({ suggestions })
    } catch {
      return NextResponse.json({ suggestions: defaultSuggestions() })
    }
  } catch {
    return NextResponse.json({ suggestions: defaultSuggestions() })
  }
}

function defaultSuggestions(): string[] {
  return [
    'Examiner la scène de crime',
    'Consulter le rapport d\'autopsie',
    'Fouiller les effets personnels',
    'Interroger un témoin',
  ]
}
