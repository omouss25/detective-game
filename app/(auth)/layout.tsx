import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-noir-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(92,74,42,0.15)_0%,_transparent_70%)]" />
      </div>

      {/* Navigation simple */}
      <div className="relative z-10 border-b border-noir-smoke/30 px-4 py-4">
        <Link href="/" className="font-noir text-noir-gold text-lg font-bold tracking-widest animate-flicker">
          B.A.N.R.
        </Link>
      </div>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
