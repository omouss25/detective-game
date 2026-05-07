import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, ArrowLeft, BookOpen, Star, Trophy } from 'lucide-react'
import type { CaseSolution } from '@/lib/supabase/types'
import { ACHIEVEMENTS } from '@/lib/subscription'
import ShareButton from './ShareButton'

export default async function ResolutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const { slug } = await params
  const { session: sessionId } = await searchParams

  if (!sessionId) redirect(`/affaires/${slug}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: session }, { data: case_ }] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('cases')
      .select('*')
      .eq('slug', slug)
      .single(),
  ])

  if (!session || !case_) notFound()

  if (session.status === 'active') {
    redirect(`/affaires/${slug}/enquete?session=${sessionId}`)
  }

  const { data: resolutionMsg } = await supabase
    .from('messages')
    .select('content, metadata')
    .eq('session_id', sessionId)
    .eq('message_type', 'resolution')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: userAchievements } = await supabase
    .from('achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', user!.id)
    .order('unlocked_at', { ascending: false })

  const isSolved = session.status === 'solved'
  const solution = case_.solution as unknown as CaseSolution
  const score = (session as unknown as { score?: number }).score ?? null
  const messageCount = (session as unknown as { message_count?: number }).message_count ?? null
  const hintsUsed = (session as unknown as { hints_used?: number }).hints_used ?? 0
  const durationSeconds = session.started_at && session.resolved_at
    ? Math.floor((new Date(session.resolved_at).getTime() - new Date(session.started_at).getTime()) / 1000)
    : null

  const achievementIds = new Set((userAchievements || []).map(a => a.achievement_id))
  const displayAchievements = ACHIEVEMENTS.filter(a => achievementIds.has(a.id)).slice(0, 3)

  const shareText = isSolved
    ? `J'ai résolu "${case_.title}" sur B.A.N.R. avec ${score ?? '?'} points ! 🕵️`
    : `J'ai enquêté sur "${case_.title}" sur B.A.N.R. — le coupable m'a échappé... 🔍`

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    return m < 1 ? `${s}s` : `${m}min ${s % 60}s`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/affaires"
        className="flex items-center gap-2 text-noir-mist hover:text-noir-silver transition-colors text-sm font-typewriter mb-8"
      >
        <ArrowLeft size={14} />
        Retour aux archives
      </Link>

      {/* Result banner */}
      <div className={`rounded-sm p-6 mb-8 border animate-fade-in-up ${
        isSolved
          ? 'bg-green-950/30 border-green-800/50'
          : 'bg-red-950/30 border-red-900/50'
      }`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {isSolved ? (
              <CheckCircle size={28} className="text-green-400" />
            ) : (
              <XCircle size={28} className="text-red-400" />
            )}
            <div>
              <h2 className={`font-noir text-2xl font-bold ${isSolved ? 'text-green-300' : 'text-red-300'}`}>
                {isSolved ? 'Affaire Résolue' : 'Enquête Échouée'}
              </h2>
              <p className={`text-sm font-typewriter ${isSolved ? 'text-green-600' : 'text-red-600'}`}>
                {isSolved
                  ? 'Votre instinct d\'inspecteur était le bon.'
                  : 'Le coupable a échappé à la justice cette fois.'}
              </p>
            </div>
          </div>
          {score !== null && (
            <div className="text-right">
              <div className={`font-noir text-4xl font-bold ${isSolved ? 'text-green-300' : 'text-red-300'}`}>
                {score.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs font-typewriter text-noir-smoke uppercase tracking-wider">Points</div>
            </div>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      {score !== null && (
        <div className="card-noir rounded-sm p-5 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Star size={14} className="text-noir-gold" />
            <span className="font-typewriter text-xs text-noir-gold uppercase tracking-wider">Détail du Score</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {messageCount !== null && (
              <div>
                <div className="font-noir text-xl text-noir-cream">{messageCount}</div>
                <div className="text-noir-smoke text-xs font-typewriter">Questions</div>
              </div>
            )}
            <div>
              <div className="font-noir text-xl text-noir-cream">{hintsUsed}</div>
              <div className="text-noir-smoke text-xs font-typewriter">Indices</div>
            </div>
            {durationSeconds !== null && (
              <div>
                <div className="font-noir text-xl text-noir-cream">{formatDuration(durationSeconds)}</div>
                <div className="text-noir-smoke text-xs font-typewriter">Durée</div>
              </div>
            )}
            <div>
              <div className={`font-noir text-xl ${isSolved ? 'text-green-400' : 'text-red-400'}`}>
                {isSolved ? '✓' : '✗'}
              </div>
              <div className="text-noir-smoke text-xs font-typewriter">Résultat</div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements unlocked */}
      {displayAchievements.length > 0 && (
        <div className="card-noir rounded-sm p-5 mb-8 border border-noir-gold/20 animate-fade-in-up" style={{ animationDelay: '150ms', opacity: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} className="text-noir-gold" />
            <span className="font-typewriter text-xs text-noir-gold uppercase tracking-wider">Distinctions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayAchievements.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded border border-noir-sepia/50 bg-noir-sepia/10">
                <span className="text-lg">{a.icon}</span>
                <div>
                  <div className="text-noir-cream text-xs font-noir font-bold">{a.label}</div>
                  <div className="text-noir-smoke text-xs font-typewriter">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrative resolution */}
      {resolutionMsg && (
        <div className="card-noir rounded-sm p-6 mb-8 animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0 }}>
          <div className="flex items-center gap-2 text-noir-gold text-xs font-typewriter mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-noir-gold animate-flicker inline-block" />
            Résolution narrative
          </div>
          <div className="divider-noir mb-5" />
          <div className="text-noir-silver text-base leading-relaxed whitespace-pre-wrap italic">
            {resolutionMsg.content}
          </div>
        </div>
      )}

      {/* Truth revealed */}
      <div className="card-noir rounded-sm p-6 mb-8 animate-fade-in-up" style={{ animationDelay: '250ms', opacity: 0 }}>
        <h3 className="font-noir text-lg text-noir-gold mb-4">
          {isSolved ? 'La Vérité Confirmée' : 'La Vérité Révélée'}
        </h3>
        <div className="divider-noir mb-5" />

        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="text-noir-gold font-typewriter text-xs uppercase tracking-wider w-20 flex-shrink-0">Coupable</span>
            <span className="text-noir-cream font-noir font-bold">{solution.culprit_name}</span>
          </div>

          {session.final_accusation && session.final_accusation !== solution.culprit_name && (
            <div className="flex gap-3">
              <span className="text-red-400 font-typewriter text-xs uppercase tracking-wider w-20 flex-shrink-0">Accusé</span>
              <span className="text-red-300">{session.final_accusation}</span>
            </div>
          )}

          <div className="flex gap-3">
            <span className="text-noir-gold font-typewriter text-xs uppercase tracking-wider w-20 flex-shrink-0">Mobile</span>
            <span className="text-noir-silver text-sm leading-relaxed">{solution.motive}</span>
          </div>

          {solution.key_clues && solution.key_clues.length > 0 && (
            <div className="flex gap-3">
              <span className="text-noir-gold font-typewriter text-xs uppercase tracking-wider w-20 flex-shrink-0">Indices clés</span>
              <div className="flex flex-wrap gap-2">
                {solution.key_clues.map((clue) => (
                  <span key={clue} className="px-2 py-0.5 bg-noir-sepia/30 border border-noir-sepia/50 rounded text-xs font-typewriter text-noir-cream">
                    {clue.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '300ms', opacity: 0 }}>
        <Link href="/affaires/nouvelle" className="btn-noir px-8 py-3 rounded-sm text-sm flex items-center justify-center gap-2">
          <BookOpen size={14} />
          Nouvelle Affaire
        </Link>
        <ShareButton text={shareText} />
        <Link href="/profil" className="btn-ghost px-8 py-3 rounded-sm text-sm flex items-center justify-center gap-2">
          Voir mon Profil
        </Link>
      </div>
    </div>
  )
}
