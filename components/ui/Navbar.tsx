'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { User, LogOut, BookOpen, Menu, X } from 'lucide-react'

interface NavbarProps {
  user?: { email?: string } | null
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-noir-smoke/50 backdrop-blur-sm"
      style={{ background: 'rgba(10,10,10,0.95)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🕵️</span>
          <div>
            <span className="font-noir text-noir-gold text-sm font-bold tracking-widest uppercase animate-flicker">
              B.A.N.R.
            </span>
            <p className="text-noir-mist text-xs font-typewriter tracking-wider hidden sm:block">
              Bureau des Affaires Non Résolues
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              <NavLink href="/affaires" active={isActive('/affaires')}>
                <BookOpen size={14} />
                Affaires
              </NavLink>
              <NavLink href="/profil" active={isActive('/profil')}>
                <User size={14} />
                Profil
              </NavLink>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 btn-ghost px-4 py-2 rounded text-sm"
              >
                <LogOut size={14} />
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink href="/connexion" active={isActive('/connexion')}>
                Connexion
              </NavLink>
              <Link href="/inscription" className="btn-noir px-5 py-2 rounded text-sm">
                Commencer l&apos;enquête
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-noir-silver p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-noir-smoke/50 bg-noir-dark px-4 py-4 flex flex-col gap-3">
          {user ? (
            <>
              <MobileNavLink href="/affaires" onClick={() => setMenuOpen(false)}>
                <BookOpen size={14} /> Affaires
              </MobileNavLink>
              <MobileNavLink href="/profil" onClick={() => setMenuOpen(false)}>
                <User size={14} /> Profil
              </MobileNavLink>
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false) }}
                className="flex items-center gap-2 text-noir-mist text-sm py-2"
              >
                <LogOut size={14} /> Déconnexion
              </button>
            </>
          ) : (
            <>
              <MobileNavLink href="/connexion" onClick={() => setMenuOpen(false)}>
                Connexion
              </MobileNavLink>
              <MobileNavLink href="/inscription" onClick={() => setMenuOpen(false)}>
                Commencer l&apos;enquête
              </MobileNavLink>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 text-sm font-typewriter tracking-wide transition-colors ${
        active ? 'text-noir-gold' : 'text-noir-silver hover:text-noir-cream'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 text-noir-silver text-sm py-2 border-b border-noir-smoke/30"
    >
      {children}
    </Link>
  )
}
