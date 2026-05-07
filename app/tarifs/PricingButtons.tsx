'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  plan: string
  isCurrent: boolean
  isPopular: boolean
  isFree: boolean
  isLoggedIn: boolean
}

export default function PricingButtons({ plan, isCurrent, isPopular, isFree, isLoggedIn }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!isLoggedIn) { router.push('/inscription'); return }
    if (isFree || isCurrent) { router.push('/affaires'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  if (isCurrent && isFree) {
    return (
      <button
        onClick={() => router.push('/affaires')}
        className="w-full py-3 rounded-sm text-sm font-typewriter border border-noir-smoke text-noir-mist hover:text-noir-silver hover:border-noir-mist transition-colors"
      >
        Continuer à enquêter
      </button>
    )
  }

  if (isCurrent) {
    return (
      <button
        onClick={async () => {
          setLoading(true)
          try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' })
            const data = await res.json()
            if (data.url) window.location.href = data.url
            else setLoading(false)
          } catch {
            setLoading(false)
          }
        }}
        disabled={loading}
        className="w-full py-3 rounded-sm text-sm font-typewriter border border-noir-smoke text-noir-mist hover:text-noir-silver transition-colors disabled:opacity-50"
      >
        {loading ? 'Chargement...' : 'Gérer l\'abonnement'}
      </button>
    )
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className={`w-full py-3 rounded-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
        isPopular
          ? 'btn-noir'
          : 'btn-ghost'
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-1">
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
          <span className="loading-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
        </span>
      ) : isFree ? (
        'Commencer gratuitement'
      ) : (
        `Passer à ${plan === 'inspecteur' ? 'Inspecteur' : 'Commissaire'}`
      )}
    </button>
  )
}
