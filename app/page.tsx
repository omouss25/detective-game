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

      {/* Animated rain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="rain-drop absolute top-0 w-px bg-gradient-to-b from-transparent via-noir-silver to-transparent"
            style={{
              left: `${(i * 3.7 + 1.1) % 100}%`,
              height: `${60 + (i * 11) % 80}px`,
              animationDuration: `${1.4 + (i * 0.17) % 1.4}s`,
              animationDelay: `${(i * 0.23) % 2.4}s`,
              opacity: 0.06 + (i % 6) * 0.025,
            }}
          />
        ))}
      </div>

      {/* Scanline subtle effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.015]">
        <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-noir-cream to-transparent"
          style={{ animation: 'scanline 8s linear infinite' }} />
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Badge */}
        <div className="animate-fade-in-up animate-stagger-1 inline-flex items-center gap-2 border border-noir-sepia/50 bg-noir-charcoal/50 rounded px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-noir-gold animate-flicker" />
          <span className="font-typewriter text-noir-mist text-xs tracking-widest uppercase">
            Dossiers Confidentiels — Accès Restreint
          </span>
        </div>

        {/* Title */}
        <h1 className="animate-fade-in-up animate-stagger-2 font-noir text-4xl sm:text-6xl md:text-7xl font-black text-noir-cream leading-tight mb-2">
          Bureau des
          <br />
          <span className="gold-text italic">Affaires</span>
          <br />
          Non Résolues
        </h1>

        <div className="animate-fade-in-up animate-stagger-3 divider-noir my-6" />

        {/* Tagline */}
        <p className="animate-fade-in-up animate-stagger-3 font-serif-italic text-noir-mist text-lg sm:text-xl italic mb-2">
          &ldquo;Dans l&apos;obscurité de la nuit, la vérité se cache toujours.&rdquo;
        </p>
        <p className="animate-fade-in-up animate-stagger-4 text-noir-smoke text-sm font-typewriter tracking-widest mb-10">
          — Service des Enquêtes Criminelles, 1947 —
        </p>

        {/* Description */}
        <p className="animate-fade-in-up animate-stagger-4 text-noir-silver text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Prenez le rôle d&apos;un inspecteur de la vieille école. Interrogez des suspects,
          examinez des indices, débusquez le mensonge. L&apos;IA joue tous les rôles.
          Votre instinct fait le reste.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up animate-stagger-5 flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <Link href="/affaires" className="btn-noir animate-glow-pulse px-8 py-4 rounded-sm text-base">
              Consulter les Dossiers
            </Link>
          ) : (
            <>
              <Link href="/inscription" className="btn-noir animate-glow-pulse px-8 py-4 rounded-sm text-base">
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
            { icon: '🔍', label: 'Enquêtez', desc: 'Examinez les scènes de crime et les indices', delay: '0.5s' },
            { icon: '💬', label: 'Interrogez', desc: "L'IA joue chaque suspect avec ses secrets", delay: '0.65s' },
            { icon: '⚖️', label: 'Accusez', desc: 'Désignez le coupable et défendez votre théorie', delay: '0.8s' },
          ].map((f) => (
            <div
              key={f.label}
              className="animate-fade-in-up flex flex-col items-center gap-2"
              style={{ animationDelay: f.delay, opacity: 0 }}
            >
              <span className="text-3xl animate-float" style={{ animationDelay: f.delay }}>{f.icon}</span>
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
