'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export default function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {}
      return
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="btn-ghost px-8 py-3 rounded-sm text-sm flex items-center justify-center gap-2 transition-all"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
      {copied ? 'Copié !' : 'Partager'}
    </button>
  )
}
