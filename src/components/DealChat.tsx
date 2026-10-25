import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, User, ShieldCheck, Sparkles } from 'lucide-react'
import { shortAddr } from '../lib/utils'

export interface ChatMessage {
  id: string
  dealId: string
  sender: string
  role: 'borrower' | 'lender' | 'observer'
  text: string
  timestamp: number
}

interface DealChatProps {
  dealId: `0x${string}`
  borrower: string
  lender?: string
  currentAddress?: string
  dealStateLabel: string
}

const STORAGE_PREFIX = 'persat_deal_chat_'

export function DealChat({
  dealId,
  borrower,
  lender,
  currentAddress,
  dealStateLabel,
}: DealChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const storageKey = `${STORAGE_PREFIX}${dealId.toLowerCase()}`

  // Load existing messages
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setMessages(JSON.parse(saved))
      } else {
        // Initial welcome message from the protocol
        const initial: ChatMessage[] = [
          {
            id: 'init-1',
            dealId,
            sender: '0x0000000000000000000000000000000000000000',
            role: 'observer',
            text: `Deal negotiation channel initialized for Deal #${dealId.slice(0, 10)}. Discuss terms, confirm rates, and coordinate loan sealing here.`,
            timestamp: Date.now(),
          },
        ]
        setMessages(initial)
        localStorage.setItem(storageKey, JSON.stringify(initial))
      }
    } catch (e) {
      console.warn('Could not load chat messages:', e)
    }

    // Set up BroadcastChannel for real-time cross-tab / cross-window sync
    try {
      const channel = new BroadcastChannel(`deal_chat_${dealId.toLowerCase()}`)
      channelRef.current = channel
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_MESSAGE' && event.data?.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.data.message.id)) return prev
            const updated = [...prev, event.data.message]
            localStorage.setItem(storageKey, JSON.stringify(updated))
            return updated
          })
        }
      }
    } catch {
      // BroadcastChannel not available in all environments
    }

    return () => {
      channelRef.current?.close()
    }
  }, [dealId, storageKey])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Determine user role
  const isBorrower = currentAddress && borrower && currentAddress.toLowerCase() === borrower.toLowerCase()
  const isLender = currentAddress && lender && currentAddress.toLowerCase() === lender.toLowerCase()
  const userRole: 'borrower' | 'lender' | 'observer' = isBorrower
    ? 'borrower'
    : isLender
    ? 'lender'
    : 'observer'

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || !currentAddress) return

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dealId,
      sender: currentAddress,
      role: userRole,
      text,
      timestamp: Date.now(),
    }

    const updated = [...messages, newMessage]
    setMessages(updated)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
      channelRef.current?.postMessage({ type: 'NEW_MESSAGE', message: newMessage })
    } catch (e) {
      console.warn('Failed to save message:', e)
    }

    setInputText('')
  }

  const quickReplies = [
    'Agreed on terms! Ready to seal.',
    'Can we adjust the annual APR slightly?',
    'Collateral is deposited. Please confirm.',
    'USDC funds are ready in my wallet.',
  ]

  return (
    <div className="rounded-2xl bg-[#201b17] border border-[#564334]/40 overflow-hidden shadow-lg mt-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#1a1512] border-b border-[#564334]/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#ff8a00]/15 text-[#ff8a00] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9]">
              Counterparty Negotiation & Chat
            </h4>
            <p className="text-[11px] text-[#a58c7b]">
              Deal #{dealId.slice(0, 10)} · State: <span className="text-[#ff8a00] font-semibold">{dealStateLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[#ddc1ae] font-['Space_Grotesk'] text-[11px]">
            {userRole === 'borrower' ? 'You are Borrower' : userRole === 'lender' ? 'You are Lender' : 'Viewing Chat'}
          </span>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto bg-[#17120f]/60 font-['Geist',sans-serif]">
        {messages.map((m) => {
          const isMe = currentAddress && m.sender.toLowerCase() === currentAddress.toLowerCase()
          const isSystem = m.sender === '0x0000000000000000000000000000000000000000'

          if (isSystem) {
            return (
              <div key={m.id} className="text-center my-2">
                <span className="inline-block px-3 py-1 rounded-full bg-[#241f1a] text-[#a58c7b] text-[11px] border border-[#564334]/30">
                  {m.text}
                </span>
              </div>
            )
          }

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                <span className={`font-bold font-['Space_Grotesk'] ${
                  m.role === 'borrower' ? 'text-[#f7931a]' : 'text-[#2775ca]'
                }`}>
                  {m.role === 'borrower' ? 'Borrower' : m.role === 'lender' ? 'Lender' : 'User'}
                </span>
                <span className="text-[#a58c7b] mono">({shortAddr(m.sender)})</span>
                <span className="text-[#715c4d]">• {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed ${
                  isMe
                    ? 'bg-gradient-to-r from-[#ff8a00] to-[#ffaa45] text-[#17120f] font-semibold rounded-br-sm'
                    : 'bg-[#241f1a] text-[#ebe0d9] border border-[#564334]/40 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Negotiation Replies */}
      <div className="px-4 py-2 bg-[#1a1512] border-t border-[#564334]/20 flex flex-wrap gap-1.5">
        <span className="text-[10px] text-[#a58c7b] flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-[#ff8a00]" /> Quick replies:
        </span>
        {quickReplies.map((qr) => (
          <button
            key={qr}
            onClick={() => handleSendMessage(qr)}
            disabled={!currentAddress}
            className="text-[10px] px-2.5 py-1 rounded-full bg-[#241f1a] hover:bg-[#2f2924] text-[#ddc1ae] hover:text-[#ebe0d9] border border-[#564334]/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            {qr}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="p-3 bg-[#201b17] border-t border-[#564334]/30 flex items-center gap-2">
        <input
          type="text"
          placeholder={currentAddress ? "Discuss terms with counterparty..." : "Connect wallet to send messages..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={!currentAddress}
          className="flex-1 bg-[#120d0a] border border-[#564334]/40 rounded-xl px-3.5 py-2 text-xs text-[#ebe0d9] placeholder-[#a58c7b] outline-none focus:border-[#ff8a00] transition-colors disabled:opacity-50 font-['Geist',sans-serif]"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || !currentAddress}
          className="px-4 py-2 rounded-xl bg-[#ff8a00] hover:bg-[#ffaa45] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
