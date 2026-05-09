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

  return `Tu es un auteur de romans policiers de génie, capable d'écrire dans le style des plus grands maîtres du genre.

MISSION : Génère une affaire criminelle UNIQUE, ORIGINALE et FASCINANTE.

Paramètres :
- Difficulté : ${difficulty}
- Cadre : ${setting}
- Style littéraire : ${genre.style}
- Archétypes à utiliser : ${genre.archetype}

PRINCIPES DE QUALITÉ (inspirés d'Agatha Christie, Simenon, Chandler) :
1. Chaque suspect a un mobile CRÉDIBLE et un secret personnel
2. Le vrai coupable est logiquement déductible mais surprenant
3. Les indices sont dispersés naturellement dans le récit, jamais gratuits
4. La psychologie prime sur l'action
5. L'atmosphère du lieu est un personnage à part entière
6. Le mobile doit être humain et universel : jalousie, héritage, honneur, vengeance, amour
7. Les fausses pistes doivent sembler aussi plausibles que la vérité

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication.

Structure exacte :
{
  "title": "Titre évocateur et accrocheur (8 mots max, style roman noir)",
  "description": "2-3 phrases atmosphériques style quatrième de couverture — donne envie d'enquêter sans révéler",
  "location": "Lieu précis et évocateur",
  "year": 1947,
  "victim": "Prénom Nom, âge ans, profession évocatrice",
  "difficulty": "${difficulty}",
  "suspects": [
    {
      "id": "identifiant_court",
      "name": "Prénom Nom",
      "role": "Relation avec la victime",
      "description": "2-3 phrases : apparence, caractère, ce qui le rend suspect, son secret"
    }
  ],
  "solution": {
    "culprit_id": "identifiant",
    "culprit_name": "Prénom Nom",
    "motive": "Mobile complet et psychologiquement crédible — 4-5 phrases détaillées, include les circonstances exactes du crime",
    "key_clues": ["indice_précis_1", "indice_précis_2", "indice_précis_3", "indice_précis_4"],
    "narrative_resolution": "Scène de révélation dramatique — 3 phrases style Agatha Christie au dénouement"
  },
  "system_prompt": "Instructions détaillées pour l'IA narratrice. DOIT inclure : (1) contexte complet et tous les faits cachés, (2) comportement et psychologie de chaque suspect, ce qu'il révèle/cache/ment, (3) indices découvrables et comment les trouver naturellement, (4) ambiance et style narratif (${genre.style}), (5) format des réponses narratives immersives. NE JAMAIS révéler le coupable sauf si le joueur envoie ACCUSATION_FINALE. Minimum 500 mots."
}

Règles de difficulté :
- facile : 3-4 suspects, coupable assez évident avec indices clairs, 1-2 fausses pistes légères
- moyen : 4-5 suspects, mobile ambigu, 2-3 fausses pistes convaincantes, indices subtils
- difficile : 5-6 suspects tous crédibles, indices qui se contredisent, le coupable semble innocent, révélation psychologique profonde`
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
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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
    console.error('Generation error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
