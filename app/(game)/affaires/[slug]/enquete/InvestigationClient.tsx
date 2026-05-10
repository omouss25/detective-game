'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, Users, Gavel, ArrowLeft, StickyNote, Lightbulb,
  Volume2, VolumeX, Music
} from 'lucide-react'
import type { Case, GameSession, Message, Suspect } from '@/lib/supabase/types'

interface Props {
  case_: Case
  session: GameSession
  initialMessages: Message[]
  hintsLimit: number
  userPlan: string
  messagesLimit: number | null
}

// ── Ambient sound ──────────────────────────────────────────────────────────
type Mood = 'calm' | 'interrogation' | 'tension'

function buildAmbience(ctx: AudioContext, mood: Mood): () => void {
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3)
  master.connect(ctx.destination)

  const freqSets: Record<Mood, number[]> = {
    calm:          [40, 60, 80],
    interrogation: [44, 66, 99],
    tension:       [36, 54, 81],
  }
  const gainSets: Record<Mood, number[]> = {
    calm:          [1, 0.25, 0.1],
    interrogation: [1, 0.35, 0.15],
    tension:       [1, 0.4, 0.2],
  }

  const freqs = freqSets[mood]
  const gains = gainSets[mood]
  const lfoRates = [0.04, 0.06, 0.09]

  const oscs = freqs.map((f, i) => {
    const osc = ctx.createOscillator()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = f

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = lfoRates[i]
    const lfoG = ctx.createGain()
    lfoG.gain.value = f * 0.015
    lfo.connect(lfoG)
    lfoG.connect(osc.frequency)
    lfo.start()

    const g = ctx.createGain()
    g.gain.value = gains[i]
    osc.connect(g)
    g.connect(master)
    osc.start()
    return { osc, lfo }
  })

  return () => {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)
    setTimeout(() => {
      oscs.forEach(({ osc, lfo }) => {
        try { osc.stop() } catch {}
        try { lfo.stop() } catch {}
      })
      try { ctx.close() } catch {}
    }, 1600)
  }
}

function useAmbientSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [mood, setMoodState] = useState<Mood>('calm')
  const moodRef = useRef<Mood>('calm')

  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    ctxRef.current = null
    setEnabled(false)
  }, [])

  const start = useCallback((m: Mood = moodRef.current) => {
    if (typeof window === 'undefined') return
    const ctx = new AudioContext()
    ctxRef.current = ctx
    cleanupRef.current = buildAmbience(ctx, m)
    setEnabled(true)
  }, [])

  const toggle = useCallback(() => {
    if (enabled) stop()
    else start()
  }, [enabled, stop, start])

  const setMood = useCallback((m: Mood) => {
    if (m === moodRef.current) return
    moodRef.current = m
    setMoodState(m)
    if (enabled) {
      cleanupRef.current?.()
      const ctx = new AudioContext()
      ctxRef.current = ctx
      cleanupRef.current = buildAmbience(ctx, m)
    }
  }, [enabled])

  useEffect(() => () => { cleanupRef.current?.() }, [])

  return { enabled, mood, setMood, toggle }
}

// ── TTS ────────────────────────────────────────────────────────────────────
function useTTS() {
  const [enabled, setEnabled] = useState(false)

  const speak = useCallback((text: string) => {
    if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'fr-FR'
    u.rate = 0.88
    u.pitch = 0.85
    const voices = window.speechSynthesis.getVoices()
    const fr = voices.find(v => v.lang.startsWith('fr')) ?? voices[0]
    if (fr) u.voice = fr
    window.speechSynthesis.speak(u)
  }, [enabled])

  const toggle = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setEnabled(e => !e)
  }, [])

  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  return { enabled, speak, toggle }
}

// ── Main component ─────────────────────────────────────────────────────────
export default function InvestigationClient({ case_, session, initialMessages, hintsLimit, userPlan, messagesLimit }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(session.notes || '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showSuspects, setShowSuspects] = useState(false)
  const [showAccuse, setShowAccuse] = useState(false)
  const [accusedSuspect, setAccusedSuspect] = useState('')
  const [accusationLoading, setAccusationLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintMessage, setHintMessage] = useState<string | null>(null)
  const [hintsRemaining, setHintsRemaining] = useState<number | null>(
    hintsLimit === Infinity ? null : hintsLimit - (session.hints_used ?? 0)
  )
  // Track actions already taken so suggestions don't repeat
  const [usedActions, setUsedActions] = useState<string[]>([])
  // Track interrogated suspects
  const [interrogatedSuspects, setInterrogatedSuspects] = useState<Set<string>>(new Set())
  // Message count tracking
  const [messageCount, setMessageCount] = useState<number>((session.message_count as number | null) ?? 0)
  const [limitReached, setLimitReached] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const notesTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastAssistantText = useRef('')

  const sound = useAmbientSound()
  const tts = useTTS()

  const suspects = (case_.suspects as unknown as Suspect[]) || []

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    return () => { if (notesTimer.current) clearTimeout(notesTimer.current) }
  }, [])

  // Detect mood from conversation context
  const detectMood = useCallback((msgList: Message[]) => {
    const count = msgList.length
    if (count > 14) { sound.setMood('tension'); return }
    const last = msgList.filter(m => m.role === 'user').at(-1)?.content ?? ''
    if (last.toLowerCase().includes('interrogatoire') || last.toLowerCase().includes('accuse')) {
      sound.setMood('interrogation')
    } else if (count > 7) {
      sound.setMood('tension')
    } else {
      sound.setMood('calm')
    }
  }, [sound])

  // Auto-send intro message or load suggestions
  useEffect(() => {
    if (initialMessages.length === 0) {
      sendMessage('Présentez-moi cette affaire. Je viens d\'arriver sur les lieux.', true).then(() => {
        fetchSuggestions([])
      })
    } else {
      fetchSuggestions([])
      detectMood(initialMessages)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSuggestions = useCallback(async (used: string[]) => {
    setSuggestionsLoading(true)
    setSuggestions([])
    try {
      const res = await fetch('/api/suggest-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, usedActions: used }),
      })
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }, [session.id])

  const saveNotes = useCallback(async (value: string) => {
    setNotesSaving(true)
    await supabase.from('game_sessions').update({ notes: value }).eq('id', session.id)
    setNotesSaving(false)
  }, [session.id, supabase])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => saveNotes(value), 1000)
  }

  const sendMessage = async (text: string, isIntro = false) => {
    if (!text.trim() || loading) return
    setLoading(true)
    setSuggestions([])

    const userMsg: Omit<Message, 'id' | 'created_at'> = {
      session_id: session.id,
      role: 'user',
      content: text,
      message_type: 'narration',
      metadata: {},
    }

    if (!isIntro) {
      const { data: savedMsg } = await supabase
        .from('messages').insert(userMsg).select().single()
      if (savedMsg) setMessages(prev => [...prev, savedMsg as Message])
    }

    const tempId = 'streaming-' + Date.now()

    try {
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, caseId: case_.id, message: text, isIntro }),
      })

      if (!response.ok) {
        if (response.status === 401) { window.location.href = '/connexion'; return }
        if (response.status === 429) {
          setLimitReached(true)
          setShowAccuse(true)
          return
        }
        throw new Error('API error')
      }

      // Update remaining count from header
      const remaining = response.headers.get('X-Messages-Remaining')
      if (remaining !== null) {
        const newCount = messagesLimit !== null ? messagesLimit - parseInt(remaining) : 0
        setMessageCount(newCount)
        if (parseInt(remaining) <= 0) setLimitReached(true)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      const tempMsg: Message = {
        id: tempId,
        session_id: session.id,
        role: 'assistant',
        content: '',
        message_type: 'narration',
        metadata: {},
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, tempMsg])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  fullText += parsed.text
                  setMessages(prev =>
                    prev.map(m => m.id === tempId ? { ...m, content: fullText } : m)
                  )
                }
              } catch {}
            }
          }
        }
      }

      const { data: savedAssistant } = await supabase
        .from('messages')
        .insert({ session_id: session.id, role: 'assistant', content: fullText, message_type: 'narration', metadata: {} })
        .select().single()

      if (savedAssistant) {
        setMessages(prev => prev.map(m => m.id === tempId ? savedAssistant as Message : m))
      }

      lastAssistantText.current = fullText
      tts.speak(fullText)

      // Update mood based on new message list
      setMessages(prev => { detectMood(prev); return prev })
    } catch (err) {
      console.error(err)
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setLoading(false)
      if (!isIntro) {
        const next = [...usedActions, text]
        setUsedActions(next)
        fetchSuggestions(next)
      }
    }
  }

  const handleSuggestionClick = (s: string) => {
    sendMessage(s)
  }

  const handleHint = async () => {
    if (hintLoading) return
    if (hintsLimit === 0) {
      setHintMessage('⚠ Les indices sont disponibles dès le grade Inspecteur (3 indices par enquête).')
      return
    }
    if (hintsRemaining !== null && hintsRemaining <= 0) {
      setHintMessage('⚠ ' + (userPlan === 'inspecteur'
        ? 'Limite d\'indices atteinte. Passez au grade Commissaire pour des indices illimités.'
        : 'Limite d\'indices atteinte. Passez à Inspecteur pour plus d\'indices.'))
      return
    }
    setHintLoading(true)
    setHintMessage(null)
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, caseId: case_.id }),
      })
      const data = await res.json()
      if (res.status === 403) {
        const plan: string = data.plan || userPlan
        setHintMessage('⚠ ' + (plan === 'inspecteur'
          ? 'Limite d\'indices atteinte. Passez au grade Commissaire pour des indices illimités.'
          : 'Les indices sont disponibles dès le grade Inspecteur.'))
      } else if (data.hint) {
        setHintMessage(data.hint)
        if (data.hintsRemaining !== undefined) setHintsRemaining(data.hintsRemaining)
      }
    } catch {
      setHintMessage('Impossible de récupérer un indice.')
    } finally {
      setHintLoading(false)
    }
  }

  const handleSuspectQuestion = (suspect: Suspect) => {
    const action = `Interrogatoire de ${suspect.name} — Où étiez-vous au moment du crime ?`
    setInterrogatedSuspects(prev => new Set([...prev, suspect.id]))
    sendMessage(action)
    setShowSuspects(false)
  }

  const handleAccusation = async () => {
    if (!accusedSuspect || accusationLoading) return
    setAccusationLoading(true)

    const { data: savedMsg } = await supabase
      .from('messages')
      .insert({ session_id: session.id, role: 'user', content: `J'accuse ${accusedSuspect}.`, message_type: 'accusation', metadata: { accused: accusedSuspect } })
      .select().single()

    if (savedMsg) setMessages(prev => [...prev, savedMsg as Message])

    try {
      const response = await fetch('/api/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, caseId: case_.id, accusedSuspectId: accusedSuspect }),
      })

      if (!response.ok) {
        if (response.status === 401) { window.location.href = '/connexion'; return }
        throw new Error('Erreur lors de l\'accusation')
      }

      const result = await response.json()

      await supabase.from('messages').insert({
        session_id: session.id,
        role: 'assistant',
        content: result.narrative,
        message_type: 'resolution',
        metadata: { correct: result.correct, culprit: result.culprit },
      })

      await supabase.from('game_sessions').update({
        status: result.correct ? 'solved' : 'failed',
        final_accusation: accusedSuspect,
        resolved_at: new Date().toISOString(),
      }).eq('id', session.id)

      if (result.correct) {
        await supabase.rpc('increment_cases_solved', { user_id: session.user_id }).maybeSingle()
      }

      router.push(`/affaires/${case_.slug}/resolution?session=${session.id}`)
    } catch (err) {
      console.error(err)
      setAccusationLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="border-b border-noir-smoke/50 bg-noir-dark/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/affaires')} className="text-noir-mist hover:text-noir-silver transition-colors flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="font-noir text-sm text-noir-gold font-bold truncate">{case_.title}</h1>
            <p className="text-noir-smoke text-xs font-typewriter hidden sm:block">{case_.location} · {case_.year}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Ambient music */}
          <button
            onClick={sound.toggle}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-typewriter transition-colors ${
              sound.enabled ? 'text-noir-gold bg-noir-sepia/20 border border-noir-sepia/40' : 'btn-ghost'
            }`}
            title={sound.enabled ? 'Couper la musique' : 'Musique d\'ambiance'}
          >
            <Music size={12} className={sound.enabled ? '' : 'opacity-40'} />
          </button>

          {/* TTS narration */}
          <button
            onClick={tts.toggle}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-typewriter transition-colors ${
              tts.enabled ? 'text-noir-gold bg-noir-sepia/20 border border-noir-sepia/40' : 'btn-ghost'
            }`}
            title={tts.enabled ? 'Désactiver la narration audio' : 'Activer la narration audio'}
          >
            {tts.enabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>

          <button
            onClick={() => { setShowSuspects(!showSuspects); setShowNotes(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-typewriter transition-colors ${showSuspects ? 'bg-noir-sepia/50 text-noir-gold' : 'btn-ghost'}`}
          >
            <Users size={12} />
            <span className="hidden sm:inline">Suspects</span>
          </button>
          <button
            onClick={() => { setShowNotes(!showNotes); setShowSuspects(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-typewriter transition-colors ${showNotes ? 'bg-noir-sepia/50 text-noir-gold' : 'btn-ghost'}`}
          >
            <StickyNote size={12} />
            <span className="hidden sm:inline">Notes</span>
          </button>
          <button
            onClick={handleHint}
            disabled={hintLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-typewriter border transition-colors disabled:opacity-50 ${
              hintsLimit === 0
                ? 'bg-noir-dark/50 text-noir-text/40 border-noir-sepia/20 cursor-not-allowed'
                : 'bg-noir-sepia/20 text-noir-gold border-noir-sepia/40 hover:bg-noir-sepia/40'
            }`}
            title={hintsLimit === 0 ? 'Disponible dès le grade Inspecteur' : hintsRemaining !== null ? `${hintsRemaining} indice(s) restant(s)` : 'Obtenir un indice'}
          >
            <Lightbulb size={12} />
            <span className="hidden sm:inline">
              {hintLoading ? '...' : hintsLimit === 0 ? 'Indice 🔒' : hintsRemaining !== null ? `Indice (${hintsRemaining})` : 'Indice'}
            </span>
          </button>
          {/* Message counter */}
          {messagesLimit !== null && (
            <span className={`text-xs font-typewriter px-2 py-1 rounded border ${
              limitReached
                ? 'text-red-400 border-red-900/50 bg-red-950/30'
                : messagesLimit - messageCount <= Math.ceil(messagesLimit * 0.3)
                ? 'text-amber-400 border-amber-900/40 bg-amber-950/20'
                : 'text-noir-smoke border-noir-smoke/30'
            }`} title="Messages restants dans cette enquête">
              {limitReached ? '⏱ Clos' : `${messagesLimit - messageCount}/${messagesLimit}`}
            </span>
          )}

          <button
            onClick={() => setShowAccuse(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-typewriter bg-red-950/50 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors"
          >
            <Gavel size={12} />
            <span className="hidden sm:inline">Accuser</span>
          </button>
        </div>
      </div>

      {/* Suspects panel */}
      {showSuspects && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setShowSuspects(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-noir-charcoal border-l border-noir-smoke/50 overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-noir-charcoal border-b border-noir-smoke/50 px-5 py-4 flex items-center justify-between">
              <h2 className="font-noir text-noir-gold text-lg">Dossier des Suspects</h2>
              <button onClick={() => setShowSuspects(false)} className="text-noir-smoke hover:text-noir-silver transition-colors text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {suspects.map((s, i) => {
                const alreadyInterrogated = interrogatedSuspects.has(s.id)
                return (
                  <div key={s.id} className="animate-fade-in-up border border-noir-smoke/40 rounded bg-noir-dark/50 p-4 hover:border-noir-smoke transition-colors" style={{ animationDelay: `${i * 60 + 100}ms`, opacity: 0 }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-noir text-noir-cream font-bold">{s.name}</div>
                        <div className="text-noir-gold text-xs font-typewriter mt-0.5">{s.role}</div>
                      </div>
                      <button
                        onClick={() => handleSuspectQuestion(s)}
                        disabled={alreadyInterrogated}
                        className={`flex-shrink-0 px-3 py-1.5 rounded border text-xs font-typewriter transition-colors ${
                          alreadyInterrogated
                            ? 'border-noir-smoke/30 text-noir-smoke/50 cursor-not-allowed'
                            : 'border-noir-sepia/60 text-noir-gold hover:bg-noir-sepia/20'
                        }`}
                        title={alreadyInterrogated ? 'Déjà interrogé' : 'Interroger'}
                      >
                        {alreadyInterrogated ? '✓ Interrogé' : 'Interroger'}
                      </button>
                    </div>
                    <p className="text-noir-silver text-sm leading-relaxed">{s.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Notes panel */}
      {showNotes && (
        <div className="border-b border-noir-smoke/50 bg-noir-charcoal/95 px-4 py-4 flex-shrink-0 animate-slide-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-noir text-noir-gold text-sm">Carnet d&apos;Enquête</h3>
            <span className="text-noir-smoke text-xs font-typewriter">{notesSaving ? 'Sauvegarde...' : 'Sauvegarde auto'}</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Notez vos déductions, les contradictions relevées, les alibis suspects..."
            className="input-noir w-full h-32 p-3 rounded text-sm font-typewriter resize-none"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center py-12 text-noir-mist">
            <FileText size={32} className="mx-auto mb-3 opacity-50" />
            <p className="font-typewriter text-sm italic">Ouverture du dossier...</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSpeak={tts.speak} ttsEnabled={tts.enabled} />
        ))}

        {loading && (
          <div className="message-assistant rounded p-4 max-w-3xl">
            <div className="flex items-center gap-2 text-noir-mist text-xs font-typewriter mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-noir-gold animate-flicker inline-block" />
              Narrateur
            </div>
            <div className="flex gap-1 items-center h-5">
              <span className="loading-dot w-2 h-2 rounded-full bg-noir-mist" />
              <span className="loading-dot w-2 h-2 rounded-full bg-noir-mist" />
              <span className="loading-dot w-2 h-2 rounded-full bg-noir-mist" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hint panel */}
      {hintMessage && (
        <div className={`border-t px-4 py-3 flex-shrink-0 animate-fade-in-up ${hintMessage.startsWith('⚠') ? 'border-amber-900/50 bg-amber-950/20' : 'border-noir-sepia/40 bg-noir-sepia/10'}`}>
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <Lightbulb size={14} className={`flex-shrink-0 mt-0.5 ${hintMessage.startsWith('⚠') ? 'text-amber-400' : 'text-noir-gold'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-typewriter leading-relaxed ${hintMessage.startsWith('⚠') ? 'text-amber-300' : 'text-noir-gold'}`}>{hintMessage}</p>
              {hintMessage.startsWith('⚠') && (
                <a href="/tarifs" className="inline-block mt-1.5 text-xs font-typewriter text-noir-gold underline hover:text-noir-cream transition-colors">Voir les grades →</a>
              )}
            </div>
            <button onClick={() => setHintMessage(null)} className="flex-shrink-0 text-noir-smoke hover:text-noir-mist transition-colors text-base leading-none">✕</button>
          </div>
        </div>
      )}

      {/* Action suggestions */}
      <div className="border-t border-noir-smoke/50 bg-noir-dark/95 backdrop-blur-sm px-4 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {limitReached ? (
            <div className="border border-red-900/50 bg-red-950/20 rounded p-3 text-center">
              <p className="text-red-300 text-xs font-typewriter mb-2">
                ⏱ Dossier clos — il est temps de trancher.
              </p>
              <button
                onClick={() => setShowAccuse(true)}
                className="px-4 py-2 rounded text-xs font-typewriter font-bold uppercase tracking-wider bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 transition-colors"
              >
                Faire mon accusation
              </button>
            </div>
          ) : suggestionsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 rounded border border-noir-smoke/30 bg-noir-charcoal/30 animate-pulse" />
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  disabled={loading}
                  className="animate-fade-in-up px-3 py-2.5 rounded border border-noir-smoke/50 hover:border-noir-gold/60 hover:bg-noir-sepia/20 text-noir-silver hover:text-noir-cream text-xs font-typewriter text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
                  style={{ animationDelay: `${i * 70}ms`, opacity: 0 }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Accusation modal */}
      {showAccuse && (
        <AccusationModal
          suspects={suspects}
          accusedSuspect={accusedSuspect}
          setAccusedSuspect={setAccusedSuspect}
          onConfirm={handleAccusation}
          onCancel={() => setShowAccuse(false)}
          loading={accusationLoading}
        />
      )}
    </div>
  )
}

function MessageBubble({ message, onSpeak, ttsEnabled }: { message: Message; onSpeak: (t: string) => void; ttsEnabled: boolean }) {
  const isUser = message.role === 'user'
  const isResolution = message.message_type === 'resolution'

  return (
    <div className={`animate-fade-in-up ${isUser ? 'flex justify-end' : ''}`}>
      <div className={`rounded p-4 ${isUser ? 'message-user max-w-2xl' : isResolution ? 'border border-noir-gold/30 bg-noir-charcoal/80 max-w-3xl' : 'message-assistant max-w-3xl'}`}>
        {!isUser && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-typewriter">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isResolution ? 'bg-noir-gold animate-flicker' : 'bg-noir-smoke'}`} />
              <span className={isResolution ? 'text-noir-gold' : 'text-noir-mist'}>{isResolution ? '⚖ Résolution' : 'Narrateur'}</span>
            </div>
            {ttsEnabled && (
              <button
                onClick={() => onSpeak(message.content)}
                className="text-noir-smoke hover:text-noir-gold transition-colors opacity-60 hover:opacity-100"
                title="Lire ce message"
              >
                <Volume2 size={11} />
              </button>
            )}
          </div>
        )}
        {isUser && <div className="text-xs font-typewriter text-noir-gold mb-1">Inspecteur</div>}
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-noir-cream' : 'text-noir-silver'}`}>
          {message.content}
        </div>
      </div>
    </div>
  )
}

function AccusationModal({ suspects, accusedSuspect, setAccusedSuspect, onConfirm, onCancel, loading }: {
  suspects: Suspect[]
  accusedSuspect: string
  setAccusedSuspect: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="card-noir rounded-sm max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <Gavel size={20} className="text-red-400" />
          <h2 className="font-noir text-xl text-noir-cream">Accusation Finale</h2>
        </div>
        <div className="bg-red-950/30 border border-red-900/50 rounded p-3 mb-5 text-red-300 text-xs font-typewriter">
          ⚠ Cette action est irréversible. Choisissez votre suspect avec soin.
        </div>
        <div className="divider-noir mb-5" />
        <div className="mb-6">
          <label className="block text-noir-smoke text-xs font-typewriter tracking-widest uppercase mb-3">Qui accusez-vous du meurtre ?</label>
          <div className="grid gap-2">
            {suspects.map((s) => (
              <button key={s.id} onClick={() => setAccusedSuspect(s.name)}
                className={`flex items-center gap-3 p-3 rounded border text-left transition-all ${accusedSuspect === s.name ? 'border-red-700 bg-red-950/40' : 'border-noir-smoke/50 hover:border-noir-smoke'}`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${accusedSuspect === s.name ? 'border-red-500 bg-red-700' : 'border-noir-smoke'}`} />
                <div>
                  <div className={`font-noir text-sm font-bold ${accusedSuspect === s.name ? 'text-red-300' : 'text-noir-silver'}`}>{s.name}</div>
                  <div className="text-noir-smoke text-xs font-typewriter">{s.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 py-3 rounded-sm text-sm" disabled={loading}>Annuler</button>
          <button onClick={onConfirm} disabled={!accusedSuspect || loading}
            className="flex-1 py-3 rounded-sm text-sm font-typewriter font-bold uppercase tracking-wider bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1">
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
                <span className="loading-dot w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
              </span>
            ) : "J'accuse"}
          </button>
        </div>
      </div>
    </div>
  )
}
