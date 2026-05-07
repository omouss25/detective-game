import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/stripe'
import { getUserPlan } from '@/lib/subscription'
import { Check, Zap, Crown, Shield } from 'lucide-react'
import Link from 'next/link'
import PricingButtons from './PricingButtons'

export default async function TarifsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; plan?: string; canceled?: string }>
}) {
  const { success, plan: successPlan, canceled } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentPlan = user ? await getUserPlan(user.id, supabase) : 'free'

  const planIcons = { free: Shield, inspecteur: Zap, commissaire: Crown }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 border border-noir-sepia/50 bg-noir-charcoal/50 rounded px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-noir-gold animate-flicker" />
          <span className="font-typewriter text-noir-mist text-xs tracking-widest uppercase">
            Accès aux dossiers classifiés
          </span>
        </div>
        <h1 className="font-noir text-4xl sm:text-5xl font-black text-noir-cream mb-4">
          Choisissez votre <span className="gold-text italic">Grade</span>
        </h1>
        <p className="text-noir-silver text-lg max-w-xl mx-auto">
          Du stagiaire au commissaire — chaque grade ouvre de nouveaux dossiers.
        </p>
      </div>

      {/* Banners */}
      {success && (
        <div className="mb-8 p-4 rounded border border-green-800/50 bg-green-950/30 text-green-300 text-sm font-typewriter text-center animate-scale-in">
          ✓ Abonnement {successPlan} activé — Bienvenue dans le grade supérieur, Inspecteur.
        </div>
      )}
      {canceled && (
        <div className="mb-8 p-4 rounded border border-noir-smoke/50 bg-noir-charcoal/30 text-noir-mist text-sm font-typewriter text-center">
          Paiement annulé. Votre grade actuel reste inchangé.
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {Object.values(PLANS).map((plan, i) => {
          const Icon = planIcons[plan.id as keyof typeof planIcons]
          const isCurrent = currentPlan === plan.id
          const isPopular = plan.id === 'inspecteur'

          return (
            <div
              key={plan.id}
              className={`animate-fade-in-up relative rounded-sm p-6 border transition-all ${
                isPopular
                  ? 'border-noir-gold/60 bg-gradient-to-b from-noir-sepia/20 to-noir-charcoal shadow-lg shadow-noir-gold/10'
                  : 'border-noir-smoke/50 bg-noir-charcoal/50'
              }`}
              style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 bg-noir-gold text-noir-black text-xs font-noir font-bold rounded-full uppercase tracking-wider">
                  Populaire
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 right-4 px-3 py-0.5 bg-noir-charcoal border border-noir-smoke text-noir-mist text-xs font-typewriter rounded-full">
                  Grade actuel
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className={`p-2 rounded ${isPopular ? 'bg-noir-gold/20' : 'bg-noir-smoke/30'}`}>
                  <Icon size={18} className={isPopular ? 'text-noir-gold' : 'text-noir-silver'} />
                </div>
                <div>
                  <div className="font-noir text-lg text-noir-cream font-bold">{plan.name}</div>
                  <div className="text-noir-smoke text-xs font-typewriter">
                    {plan.id === 'free' ? 'Gratuit' : `${(plan.price / 100).toFixed(2).replace('.', ',')} €/mois`}
                  </div>
                </div>
              </div>

              <div className="divider-noir mb-5" style={{ margin: '0 0 1.25rem' }} />

              <ul className="space-y-2.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={14} className={`flex-shrink-0 mt-0.5 ${isPopular ? 'text-noir-gold' : 'text-noir-silver'}`} />
                    <span className="text-noir-silver">{f}</span>
                  </li>
                ))}
              </ul>

              <PricingButtons
                plan={plan.id}
                isCurrent={isCurrent}
                isPopular={isPopular}
                isFree={plan.id === 'free'}
                isLoggedIn={!!user}
              />
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="card-noir rounded-sm p-8">
        <h2 className="font-noir text-xl text-noir-gold mb-6">Questions fréquentes</h2>
        <div className="divider-noir mb-6" />
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { q: 'Puis-je annuler à tout moment ?', a: 'Oui, sans engagement. Votre grade reste actif jusqu\'à la fin de la période payée.' },
            { q: 'Les enquêtes se renouvellent-elles ?', a: 'Chaque enquête est unique, générée par l\'IA. Vous ne jouez jamais deux fois la même.' },
            { q: 'Qu\'est-ce qu\'un indice ?', a: 'Un coup de pouce narratif quand vous êtes bloqué, sans révéler le coupable.' },
            { q: 'Les quotas se réinitialisent quand ?', a: 'Chaque jour à minuit. Le compteur repart à zéro automatiquement.' },
          ].map(({ q, a }) => (
            <div key={q}>
              <div className="font-noir text-noir-cream text-sm font-bold mb-1">{q}</div>
              <div className="text-noir-smoke text-sm leading-relaxed">{a}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-8">
        <Link href="/affaires" className="text-noir-mist hover:text-noir-silver text-sm font-typewriter transition-colors">
          ← Retour aux affaires
        </Link>
      </div>
    </div>
  )
}
