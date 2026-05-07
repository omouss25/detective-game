'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle, MapPin } from 'lucide-react'

const DIFFICULTIES = [
  {
    id: 'facile',
    label: 'Facile',
    desc: 'Indices clairs, 3-4 suspects. Idéal pour commencer.',
    badge: 'badge-facile',
  },
  {
    id: 'moyen',
    label: 'Moyen',
    desc: 'Fausses pistes, mobile ambigu. Il faut recouper.',
    badge: 'badge-moyen',
  },
  {
    id: 'difficile',
    label: 'Difficile',
    desc: 'Suspects convaincants, indices subtils. Pour fins limiers.',
    badge: 'badge-difficile',
  },
]

const SETTINGS = [
  { id: 'Paris, France', label: 'Paris', icon: '🏛️' },
  { id: 'Marseille, port', label: 'Marseille', icon: '⚓' },
  { id: 'Nice, Côte d\'Azur', label: 'Nice', icon: '🌊' },
  { id: 'Lyon, Presqu\'île', label: 'Lyon', icon: '🕰️' },
  { id: 'Bordeaux', label: 'Bordeaux', icon: '🍷' },
  { id: 'Alger, colonie française', label: 'Alger', icon: '🏜️' },
  { id: 'Casino de Monte-Carlo', label: 'Monte-Carlo', icon: '🎰' },
  { id: 'Campagne normande', label: 'Normandie', icon: '🌾' },
]

const LOADING_STEPS = [
  'Consultation des archives criminelles...',
  'Invention des suspects...',
  'Dissimulation des indices...',
  'Fabrication du mobile...',
  'Ouverture du dossier...',
]

export default function NewCaseClient() {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState('moyen')
  const [setting, setSetting] = useState('Paris, France')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setLoadingStep(0)

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length)
    }, 1800)

    try {
      const res = await fetch('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty, setting }),
      })

      clearInterval(stepInterval)

      if (!res.ok) {
        let data: { error?: string; plan?: string } = {}
        try { data = await res.json() } catch {}
        if (res.status === 429 && data.error === 'daily_limit_reached') {
          setError('daily_limit_reached')
        } else {
          throw new Error(data.error || 'Erreur de génération')
        }
        setLoadingStep(0)
        setLoading(false)
        return
      }

      const { caseSlug, sessionId } = await res.json()
      router.push(`/affaires/${caseSlug}/enquete?session=${sessionId}`)
    } catch (err) {
      clearInterval(stepInterval)
      const msg = err instanceof Error ? err.message : 'Impossible de générer l\'affaire.'
      setError(msg)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 px-4">
        <div className="text-6xl animate-pulse">🔍</div>
        <div className="text-center">
          <h2 className="font-noir text-2xl text-noir-gold mb-3">Création de l&apos;affaire</h2>
          <p className="text-noir-mist font-typewriter text-sm italic min-h-[1.5em] transition-all">
            {LOADING_STEPS[loadingStep]}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="loading-dot w-2 h-2 rounded-full bg-noir-gold" />
          <span className="loading-dot w-2 h-2 rounded-full bg-noir-gold" />
          <span className="loading-dot w-2 h-2 rounded-full bg-noir-gold" />
        </div>
        <p className="text-noir-smoke text-xs font-typewriter">
          L&apos;IA génère une affaire unique rien que pour vous...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 border border-noir-sepia/50 bg-noir-charcoal/50 rounded px-4 py-1.5 mb-5">
          <Shuffle size={12} className="text-noir-gold" />
          <span className="font-typewriter text-noir-mist text-xs tracking-widest uppercase">
            Affaire générée par l&apos;IA — Jamais la même
          </span>
        </div>
        <h1 className="font-noir text-4xl font-black text-noir-cream mb-3">
          Nouvelle Enquête
        </h1>
        <p className="text-noir-mist italic text-sm">
          Choisissez votre difficulté et le cadre de l&apos;affaire.<br />
          L&apos;IA invente le reste — suspects, indices, coupable.
        </p>
      </div>

      {/* Difficulty */}
      <div className="mb-8">
        <label className="block text-noir-silver text-sm font-typewriter tracking-wider mb-3">
          Niveau de difficulté
        </label>
        <div className="grid gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`flex items-center gap-4 p-4 rounded border text-left transition-all ${
                difficulty === d.id
                  ? 'border-noir-gold bg-noir-sepia/20'
                  : 'border-noir-smoke hover:border-noir-mist bg-noir-charcoal/30'
              }`}
            >
              <span className={`px-2 py-0.5 rounded text-xs font-typewriter flex-shrink-0 ${d.badge}`}>
                {d.label}
              </span>
              <span className="text-noir-mist text-sm">{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Setting */}
      <div className="mb-10">
        <label className="block text-noir-silver text-sm font-typewriter tracking-wider mb-3">
          <MapPin size={12} className="inline mr-1" />
          Cadre de l&apos;affaire
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SETTINGS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSetting(s.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded border text-center transition-all ${
                setting === s.id
                  ? 'border-noir-gold bg-noir-sepia/20'
                  : 'border-noir-smoke hover:border-noir-mist bg-noir-charcoal/30'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-noir-silver text-xs font-typewriter">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error === 'daily_limit_reached' ? (
        <div className="mb-4 p-4 bg-amber-950/30 border border-amber-900/50 rounded">
          <p className="text-amber-300 text-sm font-typewriter mb-2">
            ⚠ Limite quotidienne atteinte — Quota d&apos;enquêtes du jour épuisé.
          </p>
          <p className="text-amber-400/70 text-xs font-typewriter mb-3">
            Revenez demain à minuit, ou passez à un grade supérieur pour plus d&apos;enquêtes.
          </p>
          <a
            href="/tarifs"
            className="inline-block px-4 py-2 rounded border border-noir-gold/60 text-noir-gold text-xs font-typewriter hover:bg-noir-sepia/20 transition-colors"
          >
            Voir les grades →
          </a>
        </div>
      ) : error ? (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 rounded text-red-300 text-sm font-typewriter">
          ⚠ {error}
        </div>
      ) : null}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn-noir w-full py-4 rounded-sm text-base flex items-center justify-center gap-3"
      >
        <Shuffle size={18} />
        Générer l&apos;Affaire
      </button>

      <p className="text-center text-noir-smoke text-xs font-typewriter mt-4">
        ~15 secondes · Chaque affaire est unique et ne sera jamais répétée
      </p>
    </div>
  )
}
