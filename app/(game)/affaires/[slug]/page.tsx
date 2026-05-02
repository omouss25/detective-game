import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, Users, ArrowLeft, Play } from 'lucide-react'
import StartCaseButton from './StartCaseButton'
import type { Suspect } from '@/lib/supabase/types'

const difficultyLabel = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' }
const difficultyDesc = {
  facile: 'Idéal pour commencer. Indices clairs, suspects coopératifs.',
  moyen: 'Quelques fausses pistes. Requiert de l\'observation.',
  difficile: 'Suspects menteurs, indices trompeurs. Pour enquêteurs chevronnés.',
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: case_ } = await supabase
    .from('cases')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!case_) notFound()

  // Check existing active session
  const { data: existingSession } = await supabase
    .from('game_sessions')
    .select('id, status')
    .eq('user_id', user!.id)
    .eq('case_id', case_.id)
    .eq('status', 'active')
    .single()

  const suspects = (case_.suspects as unknown as Suspect[]) || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link
        href="/affaires"
        className="flex items-center gap-2 text-noir-mist hover:text-noir-silver transition-colors text-sm font-typewriter mb-8"
      >
        <ArrowLeft size={14} />
        Retour aux archives
      </Link>

      {/* Header */}
      <div className="card-noir rounded-sm overflow-hidden mb-8">
        {/* Cover */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-noir-charcoal to-noir-black flex items-center justify-center overflow-hidden">
          <div className="text-9xl opacity-15 select-none">
            {slug.includes('palais') ? '🏛️' : slug.includes('hotel') ? '🎹' : '🕰️'}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-noir-charcoal via-transparent to-transparent" />
          <div className={`absolute top-4 left-4 px-3 py-1 rounded text-xs font-typewriter badge-${case_.difficulty}`}>
            {difficultyLabel[case_.difficulty as keyof typeof difficultyLabel]}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-noir-mist text-xs font-typewriter mb-4">
            {case_.year && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {case_.year}
              </span>
            )}
            {case_.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {case_.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {suspects.length} suspects
            </span>
          </div>

          <h1 className="font-noir text-3xl sm:text-4xl font-black text-noir-cream mb-4">
            {case_.title}
          </h1>

          {case_.victim && (
            <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 rounded p-3 mb-4">
              <span className="text-red-400 text-lg mt-0.5">⚠</span>
              <div>
                <span className="text-red-300 text-xs font-typewriter block mb-0.5">VICTIME</span>
                <span className="text-noir-cream text-sm">{case_.victim}</span>
              </div>
            </div>
          )}

          <p className="text-noir-silver text-base leading-relaxed mb-6">
            {case_.description}
          </p>

          {/* Difficulty info */}
          <div className={`p-3 rounded border text-sm font-typewriter badge-${case_.difficulty}`}>
            <strong>Niveau {difficultyLabel[case_.difficulty as keyof typeof difficultyLabel]} : </strong>
            {difficultyDesc[case_.difficulty as keyof typeof difficultyDesc]}
          </div>
        </div>
      </div>

      {/* Suspects */}
      {suspects.length > 0 && (
        <div className="card-noir rounded-sm p-6 mb-8">
          <h2 className="font-noir text-xl text-noir-gold mb-5">Suspects Identifiés</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {suspects.map((suspect) => (
              <div key={suspect.id} className="border border-noir-smoke/50 rounded p-4 bg-noir-black/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-noir-charcoal flex items-center justify-center flex-shrink-0 text-lg">
                    👤
                  </div>
                  <div>
                    <div className="font-noir text-noir-cream font-bold text-sm">{suspect.name}</div>
                    <div className="text-noir-gold text-xs font-typewriter mb-1">{suspect.role}</div>
                    <div className="text-noir-mist text-xs leading-relaxed">{suspect.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card-noir rounded-sm p-6 mb-8">
        <h2 className="font-noir text-xl text-noir-gold mb-4">Avant de commencer</h2>
        <ul className="space-y-3 text-noir-mist text-sm font-typewriter">
          <li className="flex gap-3">
            <span className="text-noir-gold">▸</span>
            Vous pouvez interroger chaque suspect autant de fois que nécessaire
          </li>
          <li className="flex gap-3">
            <span className="text-noir-gold">▸</span>
            Examinez la scène de crime et demandez l'autopsie si nécessaire
          </li>
          <li className="flex gap-3">
            <span className="text-noir-gold">▸</span>
            Prenez des notes — votre mémoire sera mise à l'épreuve
          </li>
          <li className="flex gap-3">
            <span className="text-noir-gold">▸</span>
            L'accusation finale est définitive : réfléchissez avant d'agir
          </li>
        </ul>
      </div>

      {/* CTA */}
      <div className="text-center">
        {existingSession ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/affaires/${slug}/enquete?session=${existingSession.id}`}
              className="btn-noir px-8 py-4 rounded-sm text-base flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Reprendre l'Enquête
            </Link>
            <StartCaseButton caseId={case_.id} caseSlug={slug} replace />
          </div>
        ) : (
          <StartCaseButton caseId={case_.id} caseSlug={slug} />
        )}
      </div>
    </div>
  )
}
