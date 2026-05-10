import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/subscription'
import { redirect } from 'next/navigation'
import NewCaseClient from './NewCaseClient'

export default async function NouvellePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const userPlan = await getUserPlan(user.id, supabase)

  return <NewCaseClient userPlan={userPlan} />
}
