import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

// This page is only reached for old/direct links to a case slug.
// We redirect to the active session or back to the cases list.
export default async function CaseRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: case_ } = await supabase
    .from('cases')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!case_) notFound()

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, status')
    .eq('user_id', user!.id)
    .eq('case_id', case_.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (session) {
    if (session.status === 'active') {
      redirect(`/affaires/${slug}/enquete?session=${session.id}`)
    } else {
      redirect(`/affaires/${slug}/resolution?session=${session.id}`)
    }
  }

  redirect('/affaires')
}
