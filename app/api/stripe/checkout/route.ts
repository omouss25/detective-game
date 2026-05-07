import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANS, type PlanId } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { plan?: unknown }
  try { body = await req.json() } catch { body = {} }

  const { plan } = body
  if (typeof plan !== 'string' || !(plan in PLANS) || plan === 'free') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planConfig = PLANS[plan as PlanId]
  if (!('priceId' in planConfig)) {
    return NextResponse.json({ error: 'Plan has no price' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Get or create Stripe customer, and block if already on this plan
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('stripe_customer_id, plan, status')
    .eq('user_id', user.id)
    .single()

  if (sub?.plan === plan && sub?.status === 'active') {
    return NextResponse.json({ error: 'Already subscribed to this plan' }, { status: 400 })
  }

  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await adminClient
      .from('subscriptions')
      .upsert({ user_id: user.id, stripe_customer_id: customerId, plan: 'free', status: 'active' })
  }

  // Validate origin against allowed hosts only
  const rawOrigin = req.headers.get('origin') || ''
  const allowedOrigins = (process.env.NEXT_PUBLIC_APP_URL || '').split(',').map(s => s.trim()).filter(Boolean)
  const origin = allowedOrigins.includes(rawOrigin)
    ? rawOrigin
    : (process.env.NEXT_PUBLIC_APP_URL?.split(',')[0]?.trim() || 'https://localhost:3000')

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: (planConfig as { priceId: string }).priceId, quantity: 1 }],
    success_url: `${origin}/tarifs?success=1&plan=${plan}`,
    cancel_url: `${origin}/tarifs?canceled=1`,
    metadata: { supabase_user_id: user.id, plan },
    subscription_data: { metadata: { supabase_user_id: user.id, plan } },
  })

  return NextResponse.json({ url: session.url })
}
