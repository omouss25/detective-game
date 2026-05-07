import { PLANS, type PlanId } from './stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getUserPlan(userId: string, supabase: SupabaseClient): Promise<PlanId> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .single()

  if (!data) return 'free'
  if (data.status !== 'active' && data.status !== 'trialing') return 'free'
  if (data.current_period_end && new Date(data.current_period_end) < new Date()) return 'free'
  return (data.plan as PlanId) || 'free'
}

export async function checkCaseLimit(userId: string, supabase: SupabaseClient) {
  const plan = await getUserPlan(userId, supabase)
  const limit = PLANS[plan].casesPerDay

  if (limit === Infinity) return { allowed: true, remaining: Infinity, plan, used: 0 }

  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_usage')
    .select('cases_generated')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const used = data?.cases_generated ?? 0
  const remaining = Math.max(0, limit - used)

  return { allowed: remaining > 0, remaining, plan, used }
}

export async function incrementDailyUsage(userId: string, adminClient: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0]
  await adminClient.from('daily_usage').upsert(
    { user_id: userId, date: today, cases_generated: 1 },
    { onConflict: 'user_id,date', ignoreDuplicates: false }
  )
  // Increment if already exists
  await adminClient.rpc('increment_daily_usage', { p_user_id: userId, p_date: today })
    .maybeSingle()
}

export function calculateScore({
  solved,
  messageCount,
  hintsUsed,
  durationSeconds,
}: {
  solved: boolean
  messageCount: number
  hintsUsed: number
  durationSeconds: number
}): number {
  if (!solved) return 0

  let score = 1000
  score -= Math.min(messageCount * 15, 500)  // -15 par message, max -500
  score -= hintsUsed * 150                    // -150 par indice
  if (durationSeconds < 300) score += 150     // bonus < 5 min
  else if (durationSeconds < 600) score += 75 // bonus < 10 min

  return Math.max(50, score)
}

export const ACHIEVEMENTS = [
  { id: 'first_blood',   label: 'Première Affaire',    desc: 'Résoudre votre première enquête',         icon: '🔍' },
  { id: 'sharp_mind',    label: 'Esprit Vif',          desc: 'Résoudre en moins de 6 messages',         icon: '⚡' },
  { id: 'no_hints',      label: 'Sans Filet',          desc: 'Résoudre sans utiliser d\'indice',        icon: '🎯' },
  { id: 'hard_case',     label: 'Cas Difficile',       desc: 'Résoudre une affaire en mode difficile',  icon: '💀' },
  { id: 'veteran',       label: 'Inspecteur Vétéran',  desc: '5 affaires résolues',                     icon: '🏅' },
  { id: 'chief',         label: 'Commissaire',         desc: '10 affaires résolues',                    icon: '⭐' },
  { id: 'high_score',    label: 'Score Parfait',       desc: 'Obtenir plus de 850 points',              icon: '🏆' },
  { id: 'streak_3',      label: 'Série de 3',          desc: '3 jours consécutifs à enquêter',          icon: '🔥' },
] as const

export type AchievementId = typeof ACHIEVEMENTS[number]['id']

export function checkNewAchievements({
  solved,
  messageCount,
  hintsUsed,
  score,
  totalSolved,
  difficulty,
  streak,
}: {
  solved: boolean
  messageCount: number
  hintsUsed: number
  score: number
  totalSolved: number
  difficulty: string
  streak: number
}): AchievementId[] {
  if (!solved) return []

  const unlocked: AchievementId[] = []

  if (totalSolved === 1) unlocked.push('first_blood')
  if (messageCount <= 6) unlocked.push('sharp_mind')
  if (hintsUsed === 0) unlocked.push('no_hints')
  if (difficulty === 'difficile') unlocked.push('hard_case')
  if (totalSolved >= 5) unlocked.push('veteran')
  if (totalSolved >= 10) unlocked.push('chief')
  if (score >= 850) unlocked.push('high_score')
  if (streak >= 3) unlocked.push('streak_3')

  return unlocked
}
