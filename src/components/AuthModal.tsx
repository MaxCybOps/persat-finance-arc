// oxlint-disable
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useDisconnect } from 'wagmi'
import { useModal } from 'connectkit'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Wallet,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Flame,
  Lock,
} from 'lucide-react'
import { useArcNetwork } from '../hooks/useArcNetwork'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  destination?: string
}

export default function AuthModal({ isOpen, onClose, destination = '/dashboard' }: AuthModalProps) {
  const { address, isConnected, isMainnet, chainId } = useArcNetwork()
  const { setOpen: openConnectKit } = useModal()
  const { disconnect } = useDisconnect()
  const navigate = useNavigate()

  const handleEnterDashboard = () => {
    onClose()
    navigate(destination)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-3xl bg-[#17120f] border border-[#ff8a00]/30 shadow-[0_24px_64px_rgba(255,138,0,0.25)] p-6 sm:p-8 text-[#ebe0d9] overflow-hidden"
          >
            {/* Ambient solar flare */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#ff8a00]/15 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#564334]/30 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#ff8a00]/15 border border-[#ff8a00]/40 flex items-center justify-center text-[#ff8a00]">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#ebe0d9]">
                    {isConnected ? 'Wallet Connected' : 'Connect to Persat'}
                  </h3>
                  <p className="text-xs text-[#a58c7b]">
                    Circle's Arc L1 (Chain ID: {chainId})
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#241f1a] border border-[#564334]/40 flex items-center justify-center text-[#a58c7b] hover:text-[#ebe0d9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            {isConnected ? (
              <div className="space-y-5">
                {/* Connected Account Card */}
                <div className="p-4 rounded-2xl bg-[#201b17] border border-[#ff8a00]/30 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-wider text-[#a58c7b]">
                      Connected Account
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] font-['Space_Grotesk'] text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      {isMainnet ? 'Arc Mainnet' : 'Arc Testnet'}
                    </span>
                  </div>
                  <div className="font-['Space_Grotesk'] text-base font-bold text-[#ebe0d9] break-all">
                    {address}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-[#a58c7b]">
                    <ShieldCheck className="w-4 h-4 text-[#ff8a00]" />
                    <span>Non-custodial session active</span>
                  </div>
                </div>

                {/* Primary: Enter Dashboard */}
                <button
                  onClick={() => {
                    onClose()
                    navigate('/dashboard')
                  }}
                  className="w-full py-3.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-sm font-bold shadow-[0_6px_24px_rgba(255,138,0,0.4)] hover:shadow-[0_8px_32px_rgba(255,138,0,0.6)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Secondary Actions Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onClose()
                      navigate('/deal/new')
                    }}
                    className="py-2.5 rounded-xl bg-[#241f1a] hover:bg-[#2f2924] text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-semibold border border-[#564334]/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Create a Deal</span>
                  </button>
                  <button
                    onClick={() => {
                      onClose()
                      navigate('/marketplace')
                    }}
                    className="py-2.5 rounded-xl bg-[#241f1a] hover:bg-[#2f2924] text-[#ebe0d9] font-['Space_Grotesk'] text-xs font-semibold border border-[#564334]/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Marketplace</span>
                  </button>
                </div>

                {/* Tertiary: Disconnect */}
                <button
                  onClick={() => disconnect()}
                  className="w-full py-2 rounded-full text-[#a58c7b] hover:text-[#ebe0d9] font-['Space_Grotesk'] text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect Wallet</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Explanation */}
                <div className="p-4 rounded-2xl bg-[#201b17] border border-[#564334]/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ff8a00]/15 flex items-center justify-center text-[#ff8a00] shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9] mb-1">
                        No Username or Password Needed
                      </h4>
                      <p className="text-xs text-[#ddc1ae] leading-relaxed">
                        Persat Finance is entirely non-custodial. Your keys remain yours. Connecting your Web3 wallet verifies your identity via cryptographic signature.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connect Wallet Button */}
                <button
                  onClick={() => {
                    onClose()
                    openConnectKit(true)
                  }}
                  className="group w-full py-3.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-sm font-bold shadow-[0_6px_24px_rgba(255,138,0,0.4)] hover:shadow-[0_8px_32px_rgba(255,138,0,0.6)] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-[#17120f]" />
                  <span>Connect Web3 Wallet</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Supported Wallets List */}
                <div className="flex items-center justify-center gap-4 text-xs text-[#a58c7b] pt-1">
                  <span>MetaMask</span>
                  <span>•</span>
                  <span>Coinbase</span>
                  <span>•</span>
                  <span>WalletConnect</span>
                  <span>•</span>
                  <span>Rainbow</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
