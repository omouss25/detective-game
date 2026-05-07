'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Send, FileText, Users, Search, Gavel, ArrowLeft, StickyNote, PenLine
} from 'lucide-react'
import type { Case, GameSession, Message, Suspect } from '@/lib/supabase/types'

interface Props {
  case_: Case
  session: GameSession
  initialMessages: Message[]
}

const QUICK_ACTIONS = [
  { label: 'Examiner la scène', prompt: 'Examinez la scène de crime en détail. Décrivez ce que vous voyez.' },
  { label: 'Demander l\'autopsie', prompt: 'Quels sont les résultats de l\'autopsie de la victime ?' },
  { label: 'Liste des indices', prompt: 'Faites le récapitulatif de tous les indices disponibles sur cette affaire.' },
]

export default function InvestigationClient({ case_, session, initialMessages }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(session.notes || '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showSuspects, setShowSuspects] = useState(false)
  const [showAccuse, setShowAccuse] = useState(false)
  const [accusedSuspect, setAccusedSuspect] = useState('')
  const [accusationText, setAccusationText] = useState('')
  const [accusationLoading, setAccusationLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const notesTimer = useRef<NodeJS.Timeout>()

  const suspects = (case_.suspects as unknown as Suspect[]) || []

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  // Auto-send intro message if no messages yet, otherwise load suggestions
  useEffect(() => {
    if (initialMessages.length === 0) {
      sendMessage('Présentez-moi cette affaire. Je viens d\'arriver sur les lieux.', true).then(() => {
        fetchSuggestions()
      })
    } else {
      fetchSuggestions()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    setSuggestions([])
    try {
      const res = await fetch('/api/suggest-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
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
    await supabase
      .from('game_sessions')
      .update({ notes: value })
      .eq('id', session.id)
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
    setShowCustomInput(false)
    if (!isIntro) setInput('')

    const userMsg: Omit<Message, 'id' | 'created_at'> = {
      session_id: session.id,
      role: 'user',
      content: text,
      message_type: 'narration',
      metadata: {},
    }

    if (!isIntro) {
      const { data: savedMsg } = await supabase
        .from('messages')
        .insert(userMsg)
        .select()
        .single()
      if (savedMsg) setMessages(prev => [...prev, savedMsg as Message])
    }

    try {
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          caseId: case_.id,
          message: text,
          isIntro,
        }),
      })

      if (!response.ok) throw new Error('API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      // Add placeholder assistant message
      const tempId = 'streaming-' + Date.now()
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
          const lines = chunk.split('\n')
          for (const line of lines) {
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

      // Save the complete assistant message
      const { data: savedAssistant } = await supabase
        .from('messages')
        .insert({
          session_id: session.id,
          role: 'assistant',
          content: fullText,
          message_type: 'narration',
          metadata: {},
        })
        .select()
        .single()

      if (savedAssistant) {
        setMessages(prev =>
          prev.map(m => m.id === tempId ? savedAssistant as Message : m)
        )
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => prev.filter(m => m.id !== ('streaming-' + Date.now())))
    } finally {
      setLoading(false)
      if (!isIntro) fetchSuggestions()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSuspectQuestion = (suspect: Suspect) => {
    const prompt = `Interrogatoire de ${suspect.name} — Je veux vous parler directement, ${suspect.name}. Où étiez-vous au moment du crime ?`
    setInput(prompt)
    inputRef.current?.focus()
    setShowSuspects(false)
  }

  const handleAccusation = async () => {
    if (!accusedSuspect || !accusationText.trim()) return
    setAccusationLoading(true)


    const { data: savedMsg } = await supabase
      .from('messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: `J'accuse ${accusedSuspect}. ${accusationText}`,
        message_type: 'accusation',
        metadata: { accused: accusedSuspect },
      })
      .select()
      .single()

    if (savedMsg) setMessages(prev => [...prev, savedMsg as Message])

    try {
      const response = await fetch('/api/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          caseId: case_.id,
          accusedSuspectId: accusedSuspect,
          reasoning: accusationText,
        }),
      })

      const result = await response.json()

      // Save resolution message
      await supabase.from('messages').insert({
        session_id: session.id,
        role: 'assistant',
        content: result.narrative,
        message_type: 'resolution',
        metadata: { correct: result.correct, culprit: result.culprit },
      })

      // Update session
      await supabase.from('game_sessions').update({
        status: result.correct ? 'solved' : 'failed',
        final_accusation: accusedSuspect,
        resolved_at: new Date().toISOString(),
      }).eq('id', session.id)

      // Update profile stats
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
          <button
            onClick={() => router.push('/affaires')}
            className="text-noir-mist hover:text-noir-silver transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="font-noir text-sm text-noir-gold font-bold truncate">{case_.title}</h1>
            <p className="text-noir-smoke text-xs font-typewriter hidden sm:block">
              {case_.location} · {case_.year}
            </p>
          </div>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setShowSuspects(!showSuspects); setShowNotes(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-typewriter transition-colors ${
              showSuspects ? 'bg-noir-sepia/50 text-noir-gold' : 'btn-ghost'
            }`}
          >
            <Users size={12} />
            <span className="hidden sm:inline">Suspects</span>
          </button>
          <button
            onClick={() => { setShowNotes(!showNotes); setShowSuspects(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-typewriter transition-colors ${
              showNotes ? 'bg-noir-sepia/50 text-noir-gold' : 'btn-ghost'
            }`}
          >
            <StickyNote size={12} />
            <span className="hidden sm:inline">Notes</span>
          </button>
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
        <div className="border-b border-noir-smoke/50 bg-noir-charcoal/95 px-4 py-4 flex-shrink-0 animate-slide-in">
          <h3 className="font-noir text-noir-gold text-sm mb-3">Suspects — Cliquez pour interroger</h3>
          <div className="flex flex-wrap gap-2">
            {suspects.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSuspectQuestion(s)}
                className="flex items-center gap-2 btn-ghost px-3 py-2 rounded text-xs"
              >
                <span>👤</span>
                <div className="text-left">
                  <div className="text-noir-cream font-bold">{s.name}</div>
                  <div className="text-noir-smoke">{s.role}</div>
                </div>
              </button>
            ))}
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => { setInput(a.prompt); setShowSuspects(false); inputRef.current?.focus() }}
                className="flex items-center gap-2 px-3 py-2 rounded text-xs border border-noir-sepia/50 text-noir-gold hover:bg-noir-sepia/20 transition-colors font-typewriter"
              >
                <Search size={10} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes panel */}
      {showNotes && (
        <div className="border-b border-noir-smoke/50 bg-noir-charcoal/95 px-4 py-4 flex-shrink-0 animate-slide-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-noir text-noir-gold text-sm">Carnet d&apos;Enquête</h3>
            <span className="text-noir-smoke text-xs font-typewriter">
              {notesSaving ? 'Sauvegarde...' : 'Sauvegarde auto'}
            </span>
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
          <MessageBubble key={msg.id} message={msg} />
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

      {/* Actions */}
      <div className="border-t border-noir-smoke/50 bg-noir-dark/95 backdrop-blur-sm px-4 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Suggestions */}
          {!showCustomInput && (
            <div className="mb-3">
              {suggestionsLoading ? (
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
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                      className="px-3 py-2.5 rounded border border-noir-smoke/50 hover:border-noir-gold/60 hover:bg-noir-sepia/20 text-noir-silver hover:text-noir-cream text-xs font-typewriter text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Custom input */}
          {showCustomInput && (
            <form onSubmit={handleSubmit} className="flex gap-2 items-end mb-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre question..."
                rows={2}
                className="input-noir flex-1 p-3 rounded-sm text-sm resize-none font-typewriter"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-noir p-3 rounded-sm flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          )}

          {/* Toggle custom input */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              disabled={loading}
              className="flex items-center gap-1.5 text-noir-smoke hover:text-noir-mist text-xs font-typewriter transition-colors"
            >
              <PenLine size={11} />
              {showCustomInput ? 'Retour aux suggestions' : 'Écrire ma propre question'}
            </button>
          </div>
        </div>
      </div>

      {/* Accusation modal */}
      {showAccuse && (
        <AccusationModal
          suspects={suspects}
          accusedSuspect={accusedSuspect}
          setAccusedSuspect={setAccusedSuspect}
          accusationText={accusationText}
          setAccusationText={setAccusationText}
          onConfirm={handleAccusation}
          onCancel={() => setShowAccuse(false)}
          loading={accusationLoading}
        />
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isResolution = message.message_type === 'resolution'

  return (
    <div className={`animate-fade-in-up ${isUser ? 'flex justify-end' : ''}`}>
      <div className={`rounded p-4 ${
        isUser ? 'message-user max-w-2xl' :
        isResolution ? 'border border-noir-gold/30 bg-noir-charcoal/80 max-w-3xl' :
        'message-assistant max-w-3xl'
      }`}>
        {!isUser && (
          <div className="flex items-center gap-2 text-xs font-typewriter mb-2">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${
              isResolution ? 'bg-noir-gold animate-flicker' : 'bg-noir-smoke'
            }`} />
            <span className={isResolution ? 'text-noir-gold' : 'text-noir-mist'}>
              {isResolution ? '⚖ Résolution' : 'Narrateur'}
            </span>
          </div>
        )}
        {isUser && (
          <div className="text-xs font-typewriter text-noir-gold mb-1">Inspecteur</div>
        )}
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'text-noir-cream' : 'text-noir-silver'
        }`}>
          {message.content}
        </div>
      </div>
    </div>
  )
}

function AccusationModal({
  suspects,
  accusedSuspect,
  setAccusedSuspect,
  accusationText,
  setAccusationText,
  onConfirm,
  onCancel,
  loading,
}: {
  suspects: Suspect[]
  accusedSuspect: string
  setAccusedSuspect: (v: string) => void
  accusationText: string
  setAccusationText: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="card-noir rounded-sm max-w-lg w-full p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <Gavel size={20} className="text-red-400" />
          <h2 className="font-noir text-xl text-noir-cream">Accusation Finale</h2>
        </div>

        <div className="bg-red-950/30 border border-red-900/50 rounded p-3 mb-5 text-red-300 text-xs font-typewriter">
          ⚠ Cette action est irréversible. Réfléchissez bien avant d&apos;accuser.
        </div>

        <div className="divider-noir mb-5" />

        <div className="mb-4">
          <label className="block text-noir-silver text-sm font-typewriter mb-2">
            Qui accusez-vous ?
          </label>
          <div className="grid gap-2">
            {suspects.map((s) => (
              <button
                key={s.id}
                onClick={() => setAccusedSuspect(s.name)}
                className={`flex items-center gap-3 p-3 rounded border text-left transition-all ${
                  accusedSuspect === s.name
                    ? 'border-red-700 bg-red-950/40 text-red-300'
                    : 'border-noir-smoke hover:border-noir-gold text-noir-silver'
                }`}
              >
                <span>👤</span>
                <div>
                  <div className="font-bold text-sm">{s.name}</div>
                  <div className="text-xs opacity-70">{s.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-noir-silver text-sm font-typewriter mb-2">
            Votre raisonnement
          </label>
          <textarea
            value={accusationText}
            onChange={(e) => setAccusationText(e.target.value)}
            placeholder="Expliquez pourquoi vous accusez cette personne..."
            rows={4}
            className="input-noir w-full p-3 rounded text-sm font-typewriter resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 py-3 rounded-sm text-sm">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={!accusedSuspect || !accusationText.trim() || loading}
            className="flex-1 py-3 rounded-sm text-sm font-typewriter font-bold uppercase tracking-wider bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="flex gap-1">
                  <span className="loading-dot w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
                  <span className="loading-dot w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
                  <span className="loading-dot w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
                </span>
              </span>
            ) : (
              'J\'accuse'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
