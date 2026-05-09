import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkCaseLimit, incrementDailyUsage } from '@/lib/subscription'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Genres inspirés des grands maîtres du roman policier
const GENRES = [
  { style: 'whodunit classique à la Agatha Christie', archetype: 'huis clos, cercle fermé de suspects, red herrings soignés, révélation finale inattendue' },
  { style: 'roman noir hard-boiled à la Raymond Chandler', archetype: 'atmosphère sombre et désabusée, corruption, milieu criminel organisé, dialogue cinglant' },
  { style: 'roman policier français à la Georges Simenon', archetype: 'psychologie profonde des personnages, province française, mobile passionnel ou familial, ambiance mélancolique' },
  { style: 'thriller méditerranéen', archetype: 'jalousie, passion, secrets de famille, décor ensoleillé contrastant avec le crime' },
  { style: 'enquête en milieu fermé à la John Dickson Carr', archetype: 'chambre close, alibi impossible, procédé ingénieux, logique implacable' },
  { style: 'policier colonial à la Pierre Loti', archetype: 'tensions coloniales, secrets culturels, double vie, contexte exotique et oppressant' },
]

const GENERATION_PROMPT = (difficulty: string, setting: string) => {
  const genre = GENRES[Math.floor(Math.random() * GENRES.length)]

  return `Tu es un auteur de romans policiers. Génère une affaire criminelle originale en JSON.

Style : ${genre.style} — ${genre.archetype}
Difficulté : ${difficulty} | Cadre : ${setting}

Réponds UNIQUEMENT avec un JSON valide, sans markdown.

{
  "title": "Titre court (5 mots max)",
  "description": "1-2 phrases, ambiance mystérieuse",
  "location": "Lieu précis",
  "year": 1947,
  "victim": "Prénom Nom, âge ans, profession",
  "difficulty": "${difficulty}",
  "suspects": [
    {
      "id": "identifiant_court",
      "name": "Prénom Nom",
      "role": "Relation avec la victime",
      "description": "1-2 phrases : apparence et ce qui le rend suspect"
    }
  ],
  "solution": {
    "culprit_id": "identifiant",
    "culprit_name": "Prénom Nom",
    "motive": "Mobile en 2-3 phrases. Circonstances exactes du crime.",
    "key_clues": ["indice_1", "indice_2", "indice_3"],
    "narrative_resolution": "Révélation finale en 2 phrases."
  },
  "system_prompt": "Tu es le narrateur de cette enquête policière. Contexte : [décris le crime, la victime, le lieu en 2-3 phrases]. Suspects et secrets : [pour chaque suspect : nom, ce qu'il cache, comment il réagit aux questions]. Solution secrète : [coupable + mobile complet — ne JAMAIS révéler sauf si le message contient ACCUSATION_FINALE]. Indices à distiller naturellement : [liste les 3 indices clés et comment les faire découvrir]. Style : ${genre.style}. Tes réponses : 2-3 paragraphes courts, atmosphère soignée, dialogues percutants. Ne jamais suggérer d'actions au joueur."
}

Difficulté :
- facile : 3-4 suspects, indices clairs
- moyen : 4-5 suspects, 2-3 fausses pistes
- difficile : 5-6 suspects, indices contradictoires`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check daily usage limit
  const { allowed, remaining, plan } = await checkCaseLimit(user.id, supabase)
  if (!allowed) {
    return NextResponse.json({
      error: 'daily_limit_reached',
      plan,
      message: plan === 'free'
        ? 'Limite quotidienne atteinte. Passez à Inspecteur pour 5 affaires/jour.'
        : 'Limite quotidienne atteinte.',
    }, { status: 429 })
  }

  let body: { difficulty?: unknown; setting?: unknown }
  try { body = await req.json() } catch { body = {} }

  const { difficulty = 'moyen', setting = 'Paris, France' } = body

  const validDifficulties = ['facile', 'moyen', 'difficile']
  if (typeof difficulty !== 'string' || !validDifficulties.includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
  }
  if (typeof setting !== 'string' || setting.trim().length === 0 || setting.length > 200) {
    return NextResponse.json({ error: 'Invalid setting' }, { status: 400 })
  }
  const safeSetting = setting.trim()

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[generate-case] ANTHROPIC_API_KEY not set')
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      messages: [{ role: 'user', content: GENERATION_PROMPT(difficulty, safeSetting) }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    let caseData
    try {
      caseData = JSON.parse(cleaned)
    } catch {
      console.error('JSON parse error in case generation')
      return NextResponse.json({ error: 'Case generation failed' }, { status: 500 })
    }

    const slug = `case-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

    const adminClient = createAdminClient()
    const { data: savedCase, error: caseError } = await adminClient
      .from('cases')
      .insert({
        title: caseData.title,
        slug,
        description: caseData.description,
        difficulty: caseData.difficulty || difficulty,
        location: caseData.location,
        year: caseData.year,
        victim: caseData.victim,
        suspects: caseData.suspects,
        solution: caseData.solution,
        system_prompt: caseData.system_prompt,
        is_active: true,
      })
      .select()
      .single()

    if (caseError || !savedCase) {
      console.error('Case save error:', JSON.stringify(caseError))
      return NextResponse.json({ error: 'Failed to save case', details: caseError?.message }, { status: 500 })
    }

    // Try inserting with started_at (requires migration_v2), fall back without
    let session: { id: string } | null = null
    const insertWithDate = await adminClient
      .from('game_sessions')
      .insert({ user_id: user.id, case_id: savedCase.id, started_at: new Date().toISOString() })
      .select('id')
      .single()

    if (insertWithDate.error) {
      // Fallback: insert without new columns (pre-migration)
      const insertBasic = await adminClient
        .from('game_sessions')
        .insert({ user_id: user.id, case_id: savedCase.id })
        .select('id')
        .single()
      if (insertBasic.error || !insertBasic.data) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
      }
      session = insertBasic.data
    } else {
      session = insertWithDate.data
    }

    if (!session) return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })

    // Increment daily usage + cases_attempted
    await Promise.all([
      incrementDailyUsage(user.id, adminClient),
      supabase.rpc('increment_cases_attempted', { user_id: user.id }).maybeSingle(),
    ])

    return NextResponse.json({
      caseSlug: slug,
      sessionId: session.id,
      caseTitle: caseData.title,
      remaining: remaining - 1,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate-case] Error:', msg)
    return NextResponse.json({ error: 'Generation failed', detail: msg }, { status: 500 })
  }
}
