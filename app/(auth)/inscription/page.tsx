'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user && username) {
      await supabase
        .from('profiles')
        .update({ username })
        .eq('id', data.user.id)
    }

    if (data.session) {
      router.push('/affaires')
      router.refresh()
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-noir rounded-sm p-8 max-w-md w-full text-center">
          <span className="text-4xl mb-4 block">📬</span>
          <h2 className="font-noir text-2xl text-noir-gold mb-3">Vérifiez votre courrier</h2>
          <p className="text-noir-silver font-typewriter text-sm leading-relaxed">
            Un message de confirmation a été envoyé à <strong className="text-noir-cream">{email}</strong>.
            Cliquez sur le lien pour activer votre badge.
          </p>
          <div className="divider-noir mt-6" />
          <Link href="/connexion" className="text-noir-gold hover:text-noir-amber text-sm font-typewriter transition-colors">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

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
            Enrôlement des Inspecteurs
          </h1>
          <p className="text-noir-mist font-typewriter text-sm italic">
            Rejoignez le Bureau des Affaires Non Résolues
          </p>
        </div>

        <div className="card-noir rounded-sm p-8">
          <div className="divider-noir mb-6" />

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 rounded text-red-300 text-sm font-typewriter">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-noir-silver text-sm font-typewriter tracking-wider mb-1.5">
                Nom d&apos;inspecteur
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-noir-mist" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="input-noir w-full pl-9 pr-4 py-3 rounded-sm text-sm"
                  placeholder="Inspecteur Maigret"
                />
              </div>
            </div>

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
                  minLength={6}
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
              <p className="text-noir-smoke text-xs font-typewriter mt-1">Minimum 6 caractères</p>
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
                  Traitement en cours...
                </span>
              ) : (
                'Obtenir mon Badge'
              )}
            </button>
          </form>

          <div className="divider-noir mt-6" />

          <p className="text-center text-noir-mist text-sm font-typewriter">
            Déjà inscrit ?{' '}
            <Link href="/connexion" className="text-noir-gold hover:text-noir-amber transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
