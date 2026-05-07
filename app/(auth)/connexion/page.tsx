'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_link: 'Le lien de confirmation est invalide ou a expiré. Réinscrivez-vous.',
  missing_code: 'Lien de confirmation invalide.',
  access_denied: 'Accès refusé. Le lien a peut-être expiré.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setError(AUTH_ERROR_MESSAGES[err] || 'Une erreur est survenue. Réessayez.')
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.')
      setLoading(false)
      return
    }

    router.push('/affaires')
    router.refresh()
  }

  return (
    <div className="card-noir rounded-sm p-8">
      <div className="divider-noir mb-6" />

      {error && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 rounded text-red-300 text-sm font-typewriter">
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-noir-silver text-sm font-typewriter tracking-wider mb-1.5">
            Adresse électronique
          </label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-noir-mist" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-noir w-full pl-9 pr-4 py-3 rounded-sm text-sm"
              placeholder="votre@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-noir-silver text-sm font-typewriter tracking-wider mb-1.5">
            Mot de passe
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-noir-mist" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-noir w-full pl-9 pr-10 py-3 rounded-sm text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-noir-mist hover:text-noir-silver transition-colors"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-noir w-full py-3 rounded-sm text-sm mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="flex gap-1">
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-noir-black inline-block" />
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-noir-black inline-block" />
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-noir-black inline-block" />
              </span>
              Vérification...
            </span>
          ) : (
            'Entrer dans le Bureau'
          )}
        </button>
      </form>

      <div className="divider-noir mt-6" />

      <p className="text-center text-noir-mist text-sm font-typewriter">
        Nouveau sur le service ?{' '}
        <Link href="/inscription" className="text-noir-gold hover:text-noir-amber transition-colors">
          Créer un badge
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <span className="font-noir text-noir-gold text-2xl font-bold tracking-widest animate-flicker">
              B.A.N.R.
            </span>
          </Link>
          <h1 className="font-noir text-3xl font-bold text-noir-cream mb-2">
            Vérification d&apos;Identité
          </h1>
          <p className="text-noir-mist font-typewriter text-sm italic">
            Accès réservé aux inspecteurs accrédités
          </p>
        </div>

        <Suspense fallback={<div className="card-noir rounded-sm p-8 animate-pulse h-64" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
