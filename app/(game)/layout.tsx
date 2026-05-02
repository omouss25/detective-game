import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import { redirect } from 'next/navigation'

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion')
  }

  return (
    <div className="min-h-screen bg-noir-black">
      <Navbar user={user} />
      <div className="pt-16">
        {children}
      </div>
    </div>
  )
}
