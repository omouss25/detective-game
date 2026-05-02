import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-noir-black">
      <Navbar user={user} />
      <div className="pt-0">
        {children}
      </div>
    </div>
  )
}
