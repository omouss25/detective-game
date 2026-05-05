import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GENERATION_PROMPT = (difficulty: string, setting: string) => `Tu es un auteur de romans policiers noir style années 1940-1955, spécialisé dans le roman noir français.

Génère une affaire criminelle UNIQUE et ORIGINALE avec ces paramètres :
- Difficulté : ${difficulty}
- Ambiance / lieu : ${setting}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication, juste le JSON brut.

Structure exacte attendue :
{
  "title": "Titre accrocheur de l'affaire (8 mots max)",
  "description": "Description courte et atmosphérique pour la carte d'affaire (2-3 phrases, style roman noir, donne envie d'enquêter)",
  "location": "Ville, quartier précis",
  "year": 1945,
  "victim": "Prénom Nom, âge ans, profession",
  "difficulty": "${difficulty}",
  "suspects": [
    {
      "id": "identifiant_court",
      "name": "Prénom Nom",
      "role": "Rôle par rapport à la victime",
      "description": "Description en 1-2 phrases : caractère, ce qui le rend suspect ou particulier"
    }
  ],
  "solution": {
    "culprit_id": "identifiant_du_coupable",
    "culprit_name": "Prénom Nom du coupable",
    "motive": "Explication complète du mobile et du déroulement exact du crime (3-5 phrases détaillées)",
    "key_clues": ["indice_1", "indice_2", "indice_3", "indice_4"],
    "narrative_resolution": "Scène narrative courte (2-3 phrases) pour quand le joueur accuse correctement le coupable"
  },
  "system_prompt": "Instructions complètes pour l'IA qui va jouer le rôle du narrateur et des suspects. Inclure : contexte complet du crime (tous les détails cachés), liste des indices disponibles et comment les découvrir, comment chaque suspect se comporte et ce qu'il révèle ou cache, style narratif attendu (roman noir, immersif, en français), format des réponses ([Interrogatoire - Nom], [Indice découvert], [Narration]). NE PAS révéler le coupable directement sauf instruction ACCUSATION_FINALE. Minimum 400 mots."
}

Règles importantes :
- ${difficulty === 'facile' ? '3-4 suspects, indices clairs, 1-2 fausses pistes' : difficulty === 'moyen' ? '4-5 suspects, quelques fausses pistes, mobile ambigu' : '5 suspects, nombreuses fausses pistes, indices subtils qui se recoupent, le coupable est convaincant'}
- Le coupable doit avoir un mobile solide et crédible
- Les autres suspects doivent avoir des raisons d'être suspects (mais sont innocents)
- L'affaire doit être UNIQUE — invente des noms, lieux, situations originaux
- Ambiance années 40-50, France ou colonie française
- Le system_prompt doit être suffisamment détaillé pour que l'IA joue tous les rôles de façon cohérente`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { difficulty = 'moyen', setting = 'Paris, France' } = await req.json()

  const validDifficulties = ['facile', 'moyen', 'difficile']
  if (!validDifficulties.includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: GENERATION_PROMPT(difficulty, setting),
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Strip markdown code blocks if present
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    let caseData
    try {
      caseData = JSON.parse(cleaned)
    } catch {
      console.error('JSON parse error:', cleaned.slice(0, 200))
      return NextResponse.json({ error: 'Case generation failed — invalid JSON' }, { status: 500 })
    }

    // Generate unique slug
    const slug = `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const { data: savedCase, error: caseError } = await supabase
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
      console.error('Case save error:', caseError)
      return NextResponse.json({ error: 'Failed to save case' }, { status: 500 })
    }

    // Create game session immediately
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({ user_id: user.id, case_id: savedCase.id })
      .select()
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Increment attempted count
    await supabase.rpc('increment_cases_attempted', { user_id: user.id }).maybeSingle()

    return NextResponse.json({
      caseSlug: slug,
      sessionId: session.id,
      caseTitle: caseData.title,
    })
  } catch (err) {
    console.error('Generation error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
