import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { GameSession } from '@/lib/supabase/types'

const statusLabel = {
  solved:    { label: 'Résolue',    class: 'text-green-400', icon: CheckCircle },
  failed:    { label: 'Échouée',    class: 'text-red-400',   icon: XCircle },
  active:    { label: 'En cours',   class: 'text-noir-gold', icon: Clock },
  abandoned: { label: 'Abandonnée', class: 'text-noir-smoke', icon: XCircle },
}

const difficultyLabel: Record<string, string> = {
  facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile',
}

export default async function AffairesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: sessionsRaw }, { data: profile }] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('*, cases(id, title, slug, difficulty, location, year, victim)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('username, cases_solved, cases_attempted')
      .eq('id', user!.id)
      .single(),
  ])

  const sessions = (sessionsRaw || []) as unknown as (GameSession & {
    cases: { id: string; title: string; slug: string; difficulty: string; location: string | null; year: number | null; victim: string | null } | null
  })[]

  const solvedCount = sessions.filter(s => s.status === 'solved').length
  const activeSession = sessions.find(s => s.status === 'active')

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-noir-mist font-typewriter text-xs tracking-widest uppercase mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-noir-gold animate-flicker inline-block" />
          Dossiers
        </div>
        <h1 className="font-noir text-4xl font-black text-noir-cream mb-2">
          Bureau des Enquêtes
        </h1>
        <p className="text-noir-mist italic text-sm">
          Inspecteur <span className="text-noir-gold">{profile?.username || 'Inconnu'}</span> —{' '}
          {solvedCount} affaire{solvedCount > 1 ? 's' : ''} résolue{solvedCount > 1 ? 's' : ''} sur {sessions.length} tentée{sessions.length > 1 ? 's' : ''}.
        </p>
      </div>

      {/* Active session banner */}
      {activeSession?.cases && (
        <Link
          href={`/affaires/${activeSession.cases.slug}/enquete?session=${activeSession.id}`}
          className="block card-noir border-noir-gold/40 rounded-sm p-4 mb-8 hover:border-noir-gold transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-noir-gold text-xs font-typewriter mb-1">● Enquête en cours</div>
              <div className="font-noir text-noir-cream font-bold group-hover:text-noir-gold transition-colors">
                {activeSession.cases.title}
              </div>
              <div className="text-noir-smoke text-xs font-typewriter mt-0.5">
                {activeSession.cases.location} · {activeSession.cases.year}
              </div>
            </div>
            <ChevronRight size={16} className="text-noir-gold group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* New case CTA */}
      <Link
        href="/affaires/nouvelle"
        className="btn-noir w-full py-5 rounded-sm text-base flex items-center justify-center gap-3 mb-10"
      >
        <Plus size={18} />
        Nouvelle Affaire Générée par l'IA
      </Link>

      <div className="divider-noir mb-8" />

      {/* History */}
      <h2 className="font-noir text-xl text-noir-gold mb-5">Historique</h2>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-noir-mist font-typewriter text-sm italic">
          Aucune affaire dans votre dossier. Lancez votre première enquête.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const case_ = session.cases
            if (!case_) return null
            const st = statusLabel[session.status as keyof typeof statusLabel] || statusLabel.abandoned
            const StatusIcon = st.icon
            const href = session.status === 'active'
              ? `/affaires/${case_.slug}/enquete?session=${session.id}`
              : `/affaires/${case_.slug}/resolution?session=${session.id}`

            return (
              <Link
                key={session.id}
                href={href}
                className="flex items-center justify-between p-4 rounded border border-noir-smoke/50 hover:border-noir-gold/50 transition-all group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <StatusIcon size={15} className={`flex-shrink-0 ${st.class}`} />
                  <div className="min-w-0">
                    <div className="font-noir text-noir-cream text-sm font-bold truncate group-hover:text-noir-gold transition-colors">
                      {case_.title}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-typewriter text-noir-smoke mt-0.5">
                      <span className={`badge-${case_.difficulty} px-1.5 py-0.5 rounded`}>
                        {difficultyLabel[case_.difficulty] || case_.difficulty}
                      </span>
                      {case_.location && <span>{case_.location}</span>}
                      <span>{new Date(session.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-xs font-typewriter hidden sm:inline ${st.class}`}>{st.label}</span>
                  <ChevronRight size={14} className="text-noir-smoke group-hover:text-noir-gold transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
