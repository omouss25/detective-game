import Stripe from 'stripe'

export const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export const PLANS = {
  free: {
    id: 'free',
    name: 'Stagiaire',
    price: 0,
    casesPerDay: Infinity,
    hints: 0,
    features: ['1 enquête par jour', 'Toutes difficultés', 'Historique complet'],
  },
  inspecteur: {
    id: 'inspecteur',
    name: 'Inspecteur',
    price: 399,
    priceId: process.env.STRIPE_PRICE_INSPECTEUR!,
    casesPerDay: 5,
    hints: 3,
    features: ['5 enquêtes par jour', '3 indices par enquête', 'Toutes difficultés', 'Score et classement'],
  },
  commissaire: {
    id: 'commissaire',
    name: 'Commissaire',
    price: 799,
    priceId: process.env.STRIPE_PRICE_COMMISSAIRE!,
    casesPerDay: Infinity,
    hints: Infinity,
    features: ['Enquêtes illimitées', 'Indices illimités', 'Achievements exclusifs', 'Stats avancées', 'Priorité serveur'],
  },
} as const

export type PlanId = keyof typeof PLANS
