import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { sessionId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ suggestions: defaultSuggestions() }) }

  const { sessionId } = body
  if (typeof sessionId !== 'string') return NextResponse.json({ suggestions: defaultSuggestions() })

  // Verify session belongs to this user
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
    .limit(6)

  if (!history || history.length === 0) {
    return NextResponse.json({ suggestions: defaultSuggestions() })
  }

  const conversationSummary = [...history].reverse()
    .map(m => `${m.role === 'user' ? 'Inspecteur' : 'Narrateur'}: ${m.content.slice(0, 200)}`)
    .join('\n')

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Tu es l'assistant d'un jeu d'enquête policière style roman noir années 40-50 en français.

Voici la fin de la conversation entre l'inspecteur et le narrateur :
${conversationSummary}

Génère exactement 4 actions d'enquête que l'inspecteur pourrait faire maintenant.
Règles strictes :
- Actions neutres et naturelles, ne révèle aucun indice clé
- Variété : mélange interrogatoires, examens, demandes d'infos
- Court : 5-8 mots max par action, commence par un verbe
- Français, style policier années 40
- Réponds UNIQUEMENT avec un JSON : {"suggestions": ["action1", "action2", "action3", "action4"]}`,
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
    'Interroger les suspects présents',
    'Demander les résultats de l\'autopsie',
    'Fouiller les effets de la victime',
  ]
}
