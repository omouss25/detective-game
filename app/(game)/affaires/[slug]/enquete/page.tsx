import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import InvestigationClient from './InvestigationClient'
import type { Case, GameSession, Message } from '@/lib/supabase/types'

export default async function InvestigationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const { slug } = await params
  const { session: sessionId } = await searchParams

  if (!sessionId) redirect(`/affaires/${slug}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: session }, { data: case_ }] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('cases')
      .select('*')
      .eq('slug', slug)
      .single(),
  ])

  if (!session || !case_) notFound()

  // Redirect resolved sessions to resolution page
  if (session.status === 'solved' || session.status === 'failed') {
    redirect(`/affaires/${slug}/resolution?session=${sessionId}`)
  }

  // Load existing messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  return (
    <InvestigationClient
      case_={case_ as unknown as Case}
      session={session as unknown as GameSession}
      initialMessages={(messages || []) as unknown as Message[]}
    />
  )
}
