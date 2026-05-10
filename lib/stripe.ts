import Stripe from 'stripe'

export const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export const LENGTH_MODES = {
  rapide:  { label: 'Rapide',  messages: 10, icon: '⚡', desc: '~10 min · 10 échanges', minPlan: 'free' },
  moyenne: { label: 'Moyenne', messages: 20, icon: '🔍', desc: '~20 min · 20 échanges', minPlan: 'free' },
  longue:  { label: 'Longue',  messages: 35, icon: '📖', desc: '~40 min · 35 échanges', minPlan: 'inspecteur' },
  epique:  { label: 'Épique',  messages: 60, icon: '🏆', desc: '~1h · 60 échanges', minPlan: 'commissaire' },
} as const

export type LengthMode = keyof typeof LENGTH_MODES

const PLAN_ORDER = { free: 0, inspecteur: 1, commissaire: 2 } as const

export function isLengthAvailable(mode: LengthMode, userPlan: string): boolean {
  const minPlan = LENGTH_MODES[mode].minPlan
  return (PLAN_ORDER[userPlan as keyof typeof PLAN_ORDER] ?? 0) >= (PLAN_ORDER[minPlan as keyof typeof PLAN_ORDER] ?? 0)
}

export const PLANS = {
  free: {
    id: 'free',
    name: 'Stagiaire',
    price: 0,
    casesPerDay: Infinity, // temp: unlimited for testing
    hints: 0,
    messagesPerSession: 20,
    features: ['1 enquête par jour', 'Toutes difficultés', 'Historique complet'],
  },
  inspecteur: {
    id: 'inspecteur',
    name: 'Inspecteur',
    price: 399,
    priceId: process.env.STRIPE_PRICE_INSPECTEUR!,
    casesPerDay: 5,
    hints: 3,
    messagesPerSession: 35,
    features: ['5 enquêtes par jour', '3 indices par enquête', 'Toutes difficultés', 'Score et classement'],
  },
  commissaire: {
    id: 'commissaire',
    name: 'Commissaire',
    price: 799,
    priceId: process.env.STRIPE_PRICE_COMMISSAIRE!,
    casesPerDay: Infinity,
    hints: Infinity,
    messagesPerSession: 60,
    features: ['Enquêtes illimitées', 'Indices illimités', 'Achievements exclusifs', 'Stats avancées', 'Priorité serveur'],
  },
} as const

export type PlanId = keyof typeof PLANS

