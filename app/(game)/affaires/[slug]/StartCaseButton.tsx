'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Play } from 'lucide-react'

interface Props {
  caseId: string
  caseSlug: string
  replace?: boolean
}

export default function StartCaseButton({ caseId, caseSlug, replace = false }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleStart = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/connexion'); return }

    if (replace) {
      // Abandon existing active sessions for this case
      await supabase
        .from('game_sessions')
        .update({ status: 'abandoned' })
        .eq('user_id', user.id)
        .eq('case_id', caseId)
        .eq('status', 'active')
    }

    // Increment attempted count
    await supabase.rpc('increment_cases_attempted', { user_id: user.id }).maybeSingle()

    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({ user_id: user.id, case_id: caseId })
      .select()
      .single()

    if (error || !session) {
      console.error(error)
      setLoading(false)
      return
    }

    router.push(`/affaires/${caseSlug}/enquete?session=${session.id}`)
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="btn-noir px-8 py-4 rounded-sm text-base flex items-center gap-2 justify-center"
    >
      {loading ? (
        <>
          <span className="flex gap-1">
            <span className="loading-dot w-1.5 h-1.5 rounded-full bg-noir-black inline-block" />
            <span className="loading-dot w-1.5 h-1.5 rounded-full bg-noir-black inline-block" />
            <span className="loading-dot w-1.5 h-1.5 rounded-full bg-noir-black inline-block" />
          </span>
          Ouverture du dossier...
        </>
      ) : (
        <>
          <Play size={16} />
          {replace ? 'Recommencer l\'Enquête' : 'Ouvrir l\'Enquête'}
        </>
      )}
    </button>
  )
}
