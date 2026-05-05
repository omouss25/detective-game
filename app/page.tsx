import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <Navbar user={user} />
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background atmospheric elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-noir-black via-noir-dark to-noir-black" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-noir-sepia/30 to-transparent" />

      {/* Rain effect SVG */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 w-px bg-gradient-to-b from-transparent via-noir-silver to-transparent"
            style={{
              left: `${(i * 5.2 + 1.3) % 100}%`,
              height: `${40 + (i * 7) % 40}%`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.3 + (i % 5) * 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto animate-fade-in-up">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-noir-sepia/50 bg-noir-charcoal/50 rounded px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-noir-gold animate-flicker" />
          <span className="font-typewriter text-noir-mist text-xs tracking-widest uppercase">
            Dossiers Confidentiels — Accès Restreint
          </span>
        </div>

        {/* Title */}
        <h1 className="font-noir text-4xl sm:text-6xl md:text-7xl font-black text-noir-cream leading-tight mb-2">
          Bureau des
          <br />
          <span className="gold-text italic">Affaires</span>
          <br />
          Non Résolues
        </h1>

        <div className="divider-noir my-6" />

        {/* Tagline */}
        <p className="font-serif-italic text-noir-mist text-lg sm:text-xl italic mb-2">
          &ldquo;Dans l&apos;obscurité de la nuit, la vérité se cache toujours.&rdquo;
        </p>
        <p className="text-noir-smoke text-sm font-typewriter tracking-widest mb-10">
          — Service des Enquêtes Criminelles, 1947 —
        </p>

        {/* Description */}
        <p className="text-noir-silver text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Prenez le rôle d&apos;un inspecteur de la vieille école. Interrogez des suspects,
          examinez des indices, débusquez le mensonge. L&apos;IA joue tous les rôles.
          Votre instinct fait le reste.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <Link href="/affaires" className="btn-noir px-8 py-4 rounded-sm text-base">
              Consulter les Dossiers
            </Link>
          ) : (
            <>
              <Link href="/inscription" className="btn-noir px-8 py-4 rounded-sm text-base">
                Ouvrir un Dossier
              </Link>
              <Link href="/connexion" className="btn-ghost px-8 py-4 rounded-sm text-base">
                J&apos;ai déjà un badge
              </Link>
            </>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 mt-16 text-center">
          {[
            { icon: '🔍', label: 'Enquêtez', desc: 'Examinez les scènes de crime et les indices' },
            { icon: '💬', label: 'Interrogez', desc: "L'IA joue chaque suspect avec ses secrets" },
            { icon: '⚖️', label: 'Accusez', desc: 'Désignez le coupable et défendez votre théorie' },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{f.icon}</span>
              <span className="font-noir text-noir-gold text-sm font-bold">{f.label}</span>
              <span className="text-noir-smoke text-xs leading-snug hidden sm:block">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-noir-sepia to-transparent" />
      <p className="absolute bottom-4 text-noir-smoke text-xs font-typewriter">
        3 affaires disponibles · Nouvelles affaires chaque mois
      </p>
    </main>
    </>
  )
}
