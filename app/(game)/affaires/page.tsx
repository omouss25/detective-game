import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin, Calendar, AlertTriangle, ChevronRight, Lock } from 'lucide-react'
import type { Case, GameSession } from '@/lib/supabase/types'

const difficultyLabel = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
}

export default async function CasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: cases }, { data: sessions }] = await Promise.all([
    supabase.from('cases').select('*').eq('is_active', true).order('created_at'),
    supabase.from('game_sessions').select('*').eq('user_id', user!.id),
  ])

  const sessionsByCase = ((sessions || []) as unknown as GameSession[]).reduce<Record<string, GameSession>>((acc, s) => {
    if (!acc[s.case_id] || s.created_at > acc[s.case_id].created_at) {
      acc[s.case_id] = s
    }
    return acc
  }, {})

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, cases_solved, cases_attempted')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-noir-mist font-typewriter text-xs tracking-widest uppercase mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-noir-gold animate-flicker inline-block" />
          Dossiers en Cours
        </div>
        <h1 className="font-noir text-4xl sm:text-5xl font-black text-noir-cream mb-3">
          Archives du Bureau
        </h1>
        <p className="text-noir-mist italic max-w-xl">
          Trois affaires non résolues attendent votre expertise, Inspecteur{' '}
          <span className="text-noir-gold">{profile?.username || 'Inconnu'}</span>.
          Choisissez votre prochaine enquête.
        </p>

        {/* Stats */}
        <div className="flex gap-6 mt-6">
          <div className="text-center">
            <div className="font-noir text-2xl text-noir-gold">{profile?.cases_solved || 0}</div>
            <div className="text-noir-smoke text-xs font-typewriter">Résolues</div>
          </div>
          <div className="w-px bg-noir-smoke" />
          <div className="text-center">
            <div className="font-noir text-2xl text-noir-silver">{profile?.cases_attempted || 0}</div>
            <div className="text-noir-smoke text-xs font-typewriter">Tentées</div>
          </div>
          <div className="w-px bg-noir-smoke" />
          <div className="text-center">
            <div className="font-noir text-2xl text-noir-silver">{(cases || []).length}</div>
            <div className="text-noir-smoke text-xs font-typewriter">Disponibles</div>
          </div>
        </div>
      </div>

      <div className="divider-noir mb-10" />

      {/* Cases grid */}
      {!cases || cases.length === 0 ? (
        <div className="text-center py-20">
          <Lock size={40} className="text-noir-smoke mx-auto mb-4" />
          <p className="text-noir-mist font-typewriter">
            Aucune affaire disponible pour le moment.
          </p>
          <p className="text-noir-smoke text-sm mt-2">
            Les dossiers sont en cours de classification...
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {((cases as unknown as Case[]) || []).map((c, index) => {
            const session = sessionsByCase[c.id]
            const status = session?.status
            return (
              <CaseCard
                key={c.id}
                case_={c}
                sessionStatus={status}
                sessionId={session?.id}
                index={index}
              />
            )
          })}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-16 card-noir rounded-sm p-6">
        <h3 className="font-noir text-lg text-noir-gold mb-3">Comment enquêter</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-noir-mist font-typewriter">
          <div className="flex gap-3">
            <span className="text-noir-gold font-bold">01.</span>
            <span>Interrogez les suspects — l'IA joue chaque personnage avec ses mensonges et ses secrets</span>
          </div>
          <div className="flex gap-3">
            <span className="text-noir-gold font-bold">02.</span>
            <span>Examinez les indices sur la scène de crime et recoupez les témoignages</span>
          </div>
          <div className="flex gap-3">
            <span className="text-noir-gold font-bold">03.</span>
            <span>Accusez le coupable quand vous êtes certain — une seule chance de résoudre l'affaire</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CaseCard({
  case_,
  sessionStatus,
  sessionId,
  index,
}: {
  case_: Case
  sessionStatus?: string
  sessionId?: string
  index: number
}) {
  const href = sessionId && sessionStatus === 'active'
    ? `/affaires/${case_.slug}/enquete?session=${sessionId}`
    : `/affaires/${case_.slug}`

  const isSolved = sessionStatus === 'solved'
  const isFailed = sessionStatus === 'failed'
  const isActive = sessionStatus === 'active'

  return (
    <Link
      href={href}
      className="card-noir rounded-sm overflow-hidden group hover:border-noir-gold/50 transition-all duration-300 block"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Cover image placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-noir-charcoal to-noir-black overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <span className="text-8xl select-none">
            {index === 0 ? '🏛️' : index === 1 ? '🎹' : '🕰️'}
          </span>
        </div>
        {/* Atmospheric overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-noir-dark via-transparent to-transparent" />

        {/* Status badge */}
        {(isSolved || isFailed || isActive) && (
          <div className={`absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-typewriter ${
            isSolved ? 'bg-green-950 text-green-400 border border-green-800' :
            isFailed ? 'bg-red-950 text-red-400 border border-red-900' :
            'bg-noir-sepia/50 text-noir-gold border border-noir-sepia'
          }`}>
            {isSolved ? '✓ Résolue' : isFailed ? '✗ Échouée' : '● En cours'}
          </div>
        )}

        {/* Difficulty */}
        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-typewriter badge-${case_.difficulty}`}>
          {difficultyLabel[case_.difficulty]}
        </div>
      </div>

      <div className="p-5">
        {/* Year + location */}
        <div className="flex items-center gap-3 text-noir-smoke text-xs font-typewriter mb-3">
          {case_.year && (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {case_.year}
            </span>
          )}
          {case_.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {case_.location}
            </span>
          )}
        </div>

        <h2 className="font-noir text-lg font-bold text-noir-cream leading-snug mb-2 group-hover:text-noir-gold transition-colors">
          {case_.title}
        </h2>

        {case_.victim && (
          <p className="text-xs text-noir-mist font-typewriter mb-3 flex items-center gap-1">
            <AlertTriangle size={10} className="text-red-500" />
            Victime : {case_.victim}
          </p>
        )}

        <p className="text-noir-mist text-sm leading-relaxed line-clamp-3 mb-4">
          {case_.description}
        </p>

        {/* Suspects count */}
        {Array.isArray(case_.suspects) && (
          <div className="text-xs text-noir-smoke font-typewriter">
            {case_.suspects.length} suspects identifiés
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-noir-smoke/30">
          <span className="text-noir-gold text-xs font-typewriter">
            {isActive ? 'Continuer l\'enquête' : isSolved ? 'Voir la résolution' : 'Ouvrir le dossier'}
          </span>
          <ChevronRight size={14} className="text-noir-gold group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
