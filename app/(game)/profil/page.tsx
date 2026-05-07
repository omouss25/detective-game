import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { User, CheckCircle, XCircle, Clock, ChevronRight, Flame, Trophy, Star } from 'lucide-react'
import type { GameSession } from '@/lib/supabase/types'
import { ACHIEVEMENTS } from '@/lib/subscription'

const difficultyLabel = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' }
const statusLabel = {
  solved: { label: 'Résolue', class: 'text-green-400', icon: CheckCircle },
  failed: { label: 'Échouée', class: 'text-red-400', icon: XCircle },
  active: { label: 'En cours', class: 'text-noir-gold', icon: Clock },
  abandoned: { label: 'Abandonnée', class: 'text-noir-smoke', icon: XCircle },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  if (!profile) notFound()

  const [{ data: sessions }, { data: userAchievements }] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user!.id),
  ])

  const allSessions = ((sessions || []) as unknown as GameSession[])
  const caseIds = Array.from(new Set(allSessions.map(s => s.case_id)))
  const { data: casesRaw } = caseIds.length > 0
    ? await supabase.from('cases').select('id, title, slug, difficulty').in('id', caseIds)
    : { data: [] as { id: string; title: string; slug: string; difficulty: string }[] }

  type CaseSummary = { id: string; title: string; slug: string; difficulty: string }
  const casesMap = ((casesRaw || []) as unknown as CaseSummary[])
    .reduce<Record<string, CaseSummary>>((acc, c) => { acc[c.id] = c; return acc }, {})

  const solvedCount = allSessions.filter(s => s.status === 'solved').length
  const failedCount = allSessions.filter(s => s.status === 'failed').length
  const activeCount = allSessions.filter(s => s.status === 'active').length
  const successRate = (solvedCount + failedCount) > 0
    ? Math.round((solvedCount / (solvedCount + failedCount)) * 100)
    : null

  const unlockedIds = new Set((userAchievements || []).map(a => a.achievement_id))
  const totalScore = (profile as unknown as { total_score?: number }).total_score ?? 0
  const streakCurrent = (profile as unknown as { streak_current?: number }).streak_current ?? 0
  const streakBest = (profile as unknown as { streak_best?: number }).streak_best ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start gap-6 mb-8 animate-fade-in-up">
        <div className="w-16 h-16 rounded bg-noir-charcoal border border-noir-smoke flex items-center justify-center flex-shrink-0">
          <User size={28} className="text-noir-gold" />
        </div>
        <div>
          <div className="text-noir-mist text-xs font-typewriter tracking-widest uppercase mb-1">
            Inspecteur — Badge #{user!.id.slice(0, 8).toUpperCase()}
          </div>
          <h1 className="font-noir text-3xl font-bold text-noir-cream mb-1">
            {profile.username || 'Inspecteur Inconnu'}
          </h1>
          <p className="text-noir-mist text-sm font-typewriter">
            Membre depuis le {new Date(profile.created_at).toLocaleDateString('fr-FR', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div className="divider-noir mb-8" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '80ms', opacity: 0 }}>
        {[
          { label: 'Résolues', value: solvedCount, color: 'text-green-400' },
          { label: 'Échouées', value: failedCount, color: 'text-red-400' },
          { label: 'En cours', value: activeCount, color: 'text-noir-gold' },
          { label: 'Taux de succès', value: successRate !== null ? `${successRate}%` : '—', color: 'text-noir-silver' },
        ].map((stat) => (
          <div key={stat.label} className="card-noir rounded-sm p-4 text-center">
            <div className={`font-noir text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-noir-smoke text-xs font-typewriter">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Score & Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '160ms', opacity: 0 }}>
        <div className="card-noir rounded-sm p-5 flex items-center gap-4 sm:col-span-1">
          <Star size={24} className="text-noir-gold flex-shrink-0" />
          <div>
            <div className="font-noir text-2xl font-bold text-noir-gold">{totalScore.toLocaleString('fr-FR')}</div>
            <div className="text-noir-smoke text-xs font-typewriter">Score total</div>
          </div>
        </div>
        <div className="card-noir rounded-sm p-5 flex items-center gap-4">
          <Flame size={24} className="text-orange-400 flex-shrink-0" />
          <div>
            <div className="font-noir text-2xl font-bold text-orange-400">{streakCurrent}</div>
            <div className="text-noir-smoke text-xs font-typewriter">Série actuelle</div>
          </div>
        </div>
        <div className="card-noir rounded-sm p-5 flex items-center gap-4">
          <Trophy size={24} className="text-noir-gold flex-shrink-0" />
          <div>
            <div className="font-noir text-2xl font-bold text-noir-cream">{streakBest}</div>
            <div className="text-noir-smoke text-xs font-typewriter">Meilleure série</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card-noir rounded-sm p-6 mb-8 animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0 }}>
        <h2 className="font-noir text-xl text-noir-gold mb-5">Distinctions</h2>
        <div className="divider-noir mb-5" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.has(a.id)
            return (
              <div
                key={a.id}
                className={`rounded border p-3 text-center transition-all ${
                  unlocked
                    ? 'border-noir-sepia/50 bg-noir-sepia/10'
                    : 'border-noir-smoke/30 bg-noir-dark/30 opacity-40 grayscale'
                }`}
                title={a.desc}
              >
                <div className="text-2xl mb-1">{a.icon}</div>
                <div className={`font-noir text-xs font-bold ${unlocked ? 'text-noir-cream' : 'text-noir-smoke'}`}>
                  {a.label}
                </div>
                <div className="text-noir-smoke text-xs font-typewriter leading-tight mt-0.5 hidden sm:block">
                  {a.desc}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Case history */}
      <div className="card-noir rounded-sm p-6 animate-fade-in-up" style={{ animationDelay: '250ms', opacity: 0 }}>
        <h2 className="font-noir text-xl text-noir-gold mb-5">Historique des Affaires</h2>
        <div className="divider-noir mb-5" />

        {allSessions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-noir-mist font-typewriter text-sm italic">
              Aucune affaire dans votre dossier. Commencez votre première enquête.
            </p>
            <Link href="/affaires" className="btn-noir inline-flex items-center gap-2 px-6 py-3 rounded-sm text-sm mt-4">
              Voir les Affaires
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {allSessions.map((session, i) => {
              const case_ = casesMap[session.case_id]
              if (!case_) return null
              const st = statusLabel[session.status as keyof typeof statusLabel] || statusLabel.abandoned
              const StatusIcon = st.icon
              const href = session.status === 'active'
                ? `/affaires/${case_.slug}/enquete?session=${session.id}`
                : session.status === 'solved' || session.status === 'failed'
                  ? `/affaires/${case_.slug}/resolution?session=${session.id}`
                  : `/affaires/${case_.slug}`
              const sessionScore = (session as unknown as { score?: number }).score

              return (
                <Link
                  key={session.id}
                  href={href}
                  className="animate-fade-in-up flex items-center justify-between p-4 rounded border border-noir-smoke/50 hover:border-noir-gold/50 hover:bg-noir-charcoal/30 transition-all group"
                  style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <StatusIcon size={16} className={`flex-shrink-0 ${st.class}`} />
                    <div className="min-w-0">
                      <div className="font-noir text-noir-cream text-sm font-bold truncate group-hover:text-noir-gold transition-colors">
                        {case_.title}
                      </div>
                      <div className="flex gap-3 text-xs font-typewriter text-noir-smoke mt-0.5">
                        <span className={`badge-${case_.difficulty} px-1.5 py-0.5 rounded`}>
                          {difficultyLabel[case_.difficulty as keyof typeof difficultyLabel]}
                        </span>
                        <span>{new Date(session.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {sessionScore != null && (
                      <span className="text-xs font-typewriter text-noir-gold font-bold">
                        {sessionScore.toLocaleString('fr-FR')} pts
                      </span>
                    )}
                    <span className={`text-xs font-typewriter ${st.class}`}>{st.label}</span>
                    <ChevronRight size={14} className="text-noir-smoke group-hover:text-noir-gold transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
