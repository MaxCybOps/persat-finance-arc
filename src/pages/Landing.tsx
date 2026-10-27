// oxlint-disable
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  Link as LinkIcon,
  Layers,
  CheckCircle,
  Copy,
  Check,
  Shield,
  Lock,
  Zap,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  ArrowDownUp,
  Coins,
  Menu,
  X,
  ChevronDown,
  Sliders,
  DollarSign,
  Clock,
  Sparkles,
  BarChart3,
  HelpCircle,
  Scale,
} from 'lucide-react'
import AuthModal from '../components/AuthModal'
import SplashScreen from '../components/SplashScreen'
import { REGISTRY_ADDRESS, ESCROW_VAULT_ADDRESS } from '../contracts/addresses'

// 3D Orbital Solar Canvas
function OrbitalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0, H = 0
    function resize() {
      if (!canvas) return
      W = canvas.width = canvas.offsetWidth * window.devicePixelRatio
      H = canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
      W /= window.devicePixelRatio
      H /= window.devicePixelRatio
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.current = {
        x: (e.clientX - r.left - W / 2) / W,
        y: (e.clientY - r.top - H / 2) / H,
      }
    }
    window.addEventListener('mousemove', onMove)

    // Star dust particles
    const stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      r: Math.random() * 1.6 + 0.5,
      alpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.002 + 0.001,
    }))

    let t = 0
    let animId = 0
    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      t += 0.004

      const cx = W / 2 + mouse.current.x * 28
      const cy = H / 2 + mouse.current.y * 28

      // 1. Ambient solar haze
      const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.65)
      haze.addColorStop(0, 'rgba(255,138,0,0.20)')
      haze.addColorStop(0.4, 'rgba(204,127,26,0.08)')
      haze.addColorStop(1, 'rgba(23,18,15,0)')
      ctx.fillStyle = haze
      ctx.fillRect(0, 0, W, H)

      // 2. Concentric solar ripple rings
      for (let i = 1; i <= 5; i++) {
        const r = Math.min(W, H) * 0.16 * i + Math.sin(t + i) * 6
        ctx.beginPath()
        ctx.ellipse(cx, cy, r, r * 0.42, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,186,105,${0.16 - i * 0.024})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // 3. Rotating solar filament
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.25)
      const filament = ctx.createLinearGradient(-W * 0.4, 0, W * 0.4, 0)
      filament.addColorStop(0, 'rgba(255,138,0,0)')
      filament.addColorStop(0.5, 'rgba(255,170,69,0.18)')
      filament.addColorStop(1, 'rgba(255,138,0,0)')
      ctx.fillStyle = filament
      ctx.fillRect(-W * 0.4, -2, W * 0.8, 4)
      ctx.restore()

      // 4. Drifting particle star dust
      for (const s of stars) {
        const px = cx + s.x + Math.sin(t * 2 + s.x) * 14
        const py = cy + s.y + Math.cos(t * 2 + s.y) * 14
        ctx.beginPath()
        ctx.arc(px, py, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,184,107,${s.alpha * (0.6 + 0.4 * Math.sin(t * 3 + s.r))})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMove)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [showSplash, setShowSplash] = useState(true)
  const [copied, setCopied] = useState(false)
  const [portfolioTab, setPortfolioTab] = useState<'Home' | 'Borrow' | 'Lend' | 'Vote'>('Home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authDestination, setAuthDestination] = useState('/dashboard')

  // Interactive Loan Agreement State
  const [btcAmount, setBtcAmount] = useState<string>('1.25')
  const [usdcAmount, setUsdcAmount] = useState<string>('24375.10')
  const btcPrice = 117290.5

  const parsedBtc = parseFloat(btcAmount) || 0
  const parsedUsdc = parseFloat(usdcAmount) || 0
  const collateralUsdValue = parsedBtc * btcPrice
  const ltv = collateralUsdValue > 0 ? ((parsedUsdc / collateralUsdValue) * 100).toFixed(1) : '0.0'
  const isSafe = parseFloat(ltv) <= 80

  // Interactive Loan Calculator State
  const [calcBtc, setCalcBtc] = useState<number>(1.0)
  const [calcDuration, setCalcDuration] = useState<number>(30)
  const calcMaxBorrow = (calcBtc * btcPrice * 0.7).toFixed(0)
  const calcInterest = ((parseFloat(calcMaxBorrow) * 0.082 * calcDuration) / 365).toFixed(0)
  const calcLiquidationPrice = (parseFloat(calcMaxBorrow) / (calcBtc * 0.8)).toFixed(0)

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://persat.finance'
    navigator.clipboard.writeText(`${origin}/deal/claim/8f9024a-arc-testnet`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openAuth = (dest = '/dashboard') => {
    setAuthDestination(dest)
    setIsAuthOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#17120f] text-[#ebe0d9] font-['Geist',sans-serif] selection:bg-[#ff8a00] selection:text-[#17120f] relative overflow-hidden flex flex-col justify-between">
      {/* ── INTRO SPLASH SCREEN ── */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* 3D Interactive Solar Background */}
      <OrbitalCanvas />

      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#120d0a]/90 backdrop-blur-xl border-b border-[#564334]/30 shadow-[0_1px_12px_rgba(0,0,0,0.6)]">
        <div className="h-20 max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Logo & Network Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="flex items-center gap-2.5 group no-underline">
              <div className="w-9 h-9 rounded-xl bg-[#ff8a00]/15 flex items-center justify-center border border-[#ff8a00]/40 group-hover:scale-105 transition-transform shadow-[0_0_16px_rgba(255,138,0,0.25)]">
                <Flame className="w-5 h-5 text-[#ff8a00]" />
              </div>
              <span className="font-['Space_Grotesk'] text-xl font-bold tracking-wider text-[#ebe0d9]">
                PERSAT
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#241f1a] border border-[#564334]/40">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-['Space_Grotesk'] text-[11px] font-bold tracking-widest text-[#ddc1ae] uppercase">
                ARC TESTNET LIVE
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-7">
            <a href="#how-it-works" className="font-['Space_Grotesk'] text-[11px] font-bold tracking-wider uppercase text-[#ddc1ae] hover:text-[#ebe0d9] transition-colors no-underline">
              How It Works
            </a>
            <Link to="/deal/new" className="font-['Space_Grotesk'] text-[11px] font-bold tracking-wider uppercase text-[#ddc1ae] hover:text-[#ebe0d9] transition-colors no-underline">
              Direct Deals
            </Link>
            <Link to="/marketplace" className="font-['Space_Grotesk'] text-[11px] font-bold tracking-wider uppercase text-[#ddc1ae] hover:text-[#ebe0d9] transition-colors no-underline">
              Marketplace
            </Link>
            <a href="#calculator" className="font-['Space_Grotesk'] text-[11px] font-bold tracking-wider uppercase text-[#ddc1ae] hover:text-[#ebe0d9] transition-colors no-underline">
              Calculator
            </a>
            <a href="#security" className="font-['Space_Grotesk'] text-[11px] font-bold tracking-wider uppercase text-[#ddc1ae] hover:text-[#ebe0d9] transition-colors no-underline">
              Security
            </a>
            <a href="#faq" className="font-['Space_Grotesk'] text-[11px] font-bold tracking-wider uppercase text-[#ddc1ae] hover:text-[#ebe0d9] transition-colors no-underline">
              FAQ
            </a>
            <button
              onClick={() => openAuth('/dashboard')}
              className="font-['Space_Grotesk'] text-[11px] font-bold tracking-wider uppercase text-[#ffb77f] hover:text-[#ff8a00] transition-colors no-underline cursor-pointer"
            >
              Dashboard
            </button>
          </nav>

          {/* Desktop Right CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => openAuth('/dashboard')}
              className="px-4 py-2 rounded-full bg-[#241f1a] hover:bg-[#2f2924] text-[#ddc1ae] font-['Space_Grotesk'] text-xs font-bold border border-[#564334]/40 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('/dashboard')}
              className="group relative inline-flex items-center pl-4 pr-1.5 py-1.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-[13px] font-bold shadow-[0px_4px_24px_rgba(255,138,0,0.35)] hover:shadow-[0px_6px_32px_rgba(255,138,0,0.55)] transition-all cursor-pointer"
            >
              <span className="uppercase mr-2 tracking-wide font-bold">Launch App</span>
              <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#ff8a00] shadow-sm group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex xl:hidden items-center gap-2">
            <button
              onClick={() => openAuth('/dashboard')}
              className="sm:hidden px-3 py-1.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-xs font-bold"
            >
              Launch App
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 rounded-xl bg-[#241f1a] border border-[#564334]/40 flex items-center justify-center text-[#ebe0d9] hover:text-[#ff8a00] transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden bg-[#120d0a]/95 border-b border-[#564334]/30 px-6 py-6 overflow-hidden"
            >
              <div className="flex flex-col gap-4">
                <a
                  href="#how-it-works"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-['Space_Grotesk'] text-sm font-semibold uppercase text-[#ddc1ae] hover:text-[#ebe0d9]"
                >
                  How It Works
                </a>
                <Link
                  to="/deal/new"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-['Space_Grotesk'] text-sm font-semibold uppercase text-[#ddc1ae] hover:text-[#ebe0d9]"
                >
                  Create Direct Deal
                </Link>
                <Link
                  to="/marketplace"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-['Space_Grotesk'] text-sm font-semibold uppercase text-[#ddc1ae] hover:text-[#ebe0d9]"
                >
                  Open Marketplace
                </Link>
                <a
                  href="#calculator"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-['Space_Grotesk'] text-sm font-semibold uppercase text-[#ddc1ae] hover:text-[#ebe0d9]"
                >
                  Loan Calculator
                </a>
                <a
                  href="#security"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-['Space_Grotesk'] text-sm font-semibold uppercase text-[#ddc1ae] hover:text-[#ebe0d9]"
                >
                  Security & Escrow
                </a>
                <a
                  href="#faq"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-['Space_Grotesk'] text-sm font-semibold uppercase text-[#ddc1ae] hover:text-[#ebe0d9]"
                >
                  FAQ
                </a>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    openAuth('/dashboard')
                  }}
                  className="w-full py-3 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-sm font-bold shadow-lg"
                >
                  Enter Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN BODY */}
      <main className="w-full pt-20 flex-1 flex flex-col relative z-10">
        {/* ── SECTION 1: HERO & SIGNATURE CTA (3D Perspective) ── */}
        <section className="relative w-full max-w-[1280px] mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-20 md:pb-28 flex flex-col items-center text-center" style={{ perspective: 1200 }}>
          {/* Micro Badge Pill */}
          <motion.div
            initial={{ opacity: 0, y: 16, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2f2924]/80 backdrop-blur-md border border-[#ff8a00]/30 shadow-[0_0_20px_rgba(255,138,0,0.15)] mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-[#ff8a00] animate-ping" />
            <span className="font-['Space_Grotesk'] text-[10px] sm:text-[11px] font-bold tracking-widest text-[#ffb77f] uppercase">
              PEER-TO-PEER BITCOIN LENDING • NON-CUSTODIAL ESCROW ON ARC
            </span>
          </motion.div>

          {/* Headline with 3D scale entrance */}
          <motion.h1
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-['Space_Grotesk'] text-3xl sm:text-5xl md:text-6xl lg:text-[68px] lg:leading-[1.1] max-w-4xl tracking-tight text-[#ebe0d9] uppercase font-bold drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
          >
            WHAT IF YOU COULD <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-[#ffdcc4] to-[#ffb77f]">
              LEND AND BORROW
            </span>{' '}
            <br className="hidden sm:inline" />
            FROM ANYONE?
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-[#ddc1ae] max-w-2xl mt-5 mb-8 leading-relaxed font-normal"
          >
            Infrastructure for a world where anyone can lend to anyone, secured by digital assets and enforced by smart contracts, starting with Bitcoin on Circle's Arc L1.
          </motion.p>

          {/* Lend with Confidence Signature CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-14 sm:mb-16"
          >
            <button
              onClick={() => openAuth('/dashboard')}
              className="group relative inline-flex items-center pl-6 sm:pl-8 pr-2.5 py-3 sm:py-3.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-sm sm:text-base font-bold shadow-[0px_8px_32px_rgba(255,138,0,0.45)] hover:shadow-[0px_10px_40px_rgba(255,138,0,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="uppercase mr-3 sm:mr-4 font-bold tracking-wide">
                Lend with Confidence
              </span>
              <span className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-white flex items-center justify-center text-[#ff8a00] shadow-md group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
              </span>
            </button>
          </motion.div>

          {/* Dual Persona Entry Cards */}
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-5 mb-16 text-left" style={{ perspective: 1000 }}>
            {/* Pathway 1: Direct Deal */}
            <motion.div
              whileHover={{ y: -4, rotateY: 3, transition: { duration: 0.2 } }}
              className="relative group p-6 sm:p-7 rounded-2xl bg-[#201b17]/90 backdrop-blur-xl border border-[#564334]/40 hover:border-[#ff8a00]/60 transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between"
            >
              <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a00]/80 to-transparent" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-[#ff8a00]" />
                    <span className="font-['Space_Grotesk'] text-[11px] font-bold uppercase text-[#ffb77f] tracking-wider">
                      Direct Path
                    </span>
                  </div>
                  <span className="font-['Space_Grotesk'] text-xs font-semibold text-[#a58c7b]">P2P Link</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#ebe0d9] font-bold mb-2">Create a Direct Deal</h3>
                <p className="text-sm text-[#ddc1ae] mb-6 leading-relaxed">
                  I already have a counterparty. Generate an encrypted, single-use private deal link with atomic settlement on Arc.
                </p>
              </div>
              <button
                onClick={() => navigate('/deal/new')}
                className="group/btn relative inline-flex items-center justify-between w-full px-4 py-3 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-[13px] font-bold shadow-[0_4px_24px_rgba(255,138,0,0.35)] hover:shadow-[0_6px_32px_rgba(255,138,0,0.55)] transition-all cursor-pointer"
              >
                <span className="uppercase tracking-wide font-bold">Create Direct Deal</span>
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#ff8a00] shadow-sm group-hover/btn:translate-x-1 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </motion.div>

            {/* Pathway 2: Marketplace */}
            <motion.div
              whileHover={{ y: -4, rotateY: -3, transition: { duration: 0.2 } }}
              className="relative group p-6 sm:p-7 rounded-2xl bg-[#201b17]/90 backdrop-blur-xl border border-[#564334]/40 hover:border-[#ffb86b]/60 transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between"
            >
              <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#ffb86b]/70 to-transparent" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#ffb86b]" />
                    <span className="font-['Space_Grotesk'] text-[11px] font-bold uppercase text-[#ffb86b] tracking-wider">
                      Public Pool
                    </span>
                  </div>
                  <span className="font-['Space_Grotesk'] text-xs font-semibold text-[#a58c7b]">Open Books</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#ebe0d9] font-bold mb-2">Open Marketplace</h3>
                <p className="text-sm text-[#ddc1ae] mb-6 leading-relaxed">
                  Browse verified community loan requests or post structured, non-negotiable lending terms to match peer liquidity in USDC.
                </p>
              </div>
              <button
                onClick={() => navigate('/marketplace')}
                className="group/btn inline-flex items-center justify-between w-full px-4 py-3 rounded-full bg-[#3a342f]/90 hover:bg-[#3e3833] text-[#ebe0d9] font-['Space_Grotesk'] text-[13px] font-semibold border border-[#564334]/50 transition-all cursor-pointer"
              >
                <span className="uppercase tracking-wide font-bold">Explore Marketplace</span>
                <span className="w-6 h-6 rounded-full bg-[#241f1a] flex items-center justify-center text-[#ffb77f] shadow-sm group-hover/btn:translate-x-1 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </motion.div>
          </div>

          {/* ── 3D LEVITATING HUD CONSOLES (Floating Zero-Gravity Motion) ── */}
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch" style={{ perspective: 1200 }}>
            {/* Widget 1: MARKETS Widget */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ y: -12, scale: 1.01, transition: { duration: 0.2 } }}
              className="md:col-span-4 rounded-2xl bg-[#201b17]/95 backdrop-blur-2xl border border-[#564334]/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-left relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#564334]/25 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="font-['Space_Grotesk'] text-[11px] uppercase text-[#ebe0d9] tracking-widest font-bold">
                      LIVE MARKETS
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="font-['Space_Grotesk'] text-[10px] uppercase text-[#ff8a00] hover:underline font-bold cursor-pointer"
                  >
                    SEE ALL →
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* BTC */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#241f1a]/70 hover:bg-[#241f1a] transition-colors border border-[#564334]/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#f7931a]/15 text-[#f7931a] flex items-center justify-center font-bold text-xs">
                        ₿
                      </div>
                      <div>
                        <div className="font-['Space_Grotesk'] text-[13px] text-[#ebe0d9] font-bold leading-none">BTC</div>
                        <div className="font-['Space_Grotesk'] text-[10px] text-[#10b981] font-semibold">+1.6%</div>
                      </div>
                    </div>
                    {/* Animated Sparkline */}
                    <svg className="w-16 h-5 stroke-[#10b981]" fill="none" viewBox="0 0 60 20">
                      <path d="M1 15 L12 12 L22 17 L34 8 L46 11 L58 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </svg>
                    <div className="text-right">
                      <div className="font-['Space_Grotesk'] text-[12px] text-[#ebe0d9] font-semibold">$117,290.50</div>
                      <div className="text-[10px] text-[#a58c7b]">$1.29T Cap</div>
                    </div>
                  </div>

                  {/* USDC */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#241f1a]/70 hover:bg-[#241f1a] transition-colors border border-[#564334]/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#2775ca]/15 text-[#2775ca] flex items-center justify-center font-bold text-xs">
                        $
                      </div>
                      <div>
                        <div className="font-['Space_Grotesk'] text-[13px] text-[#ebe0d9] font-bold leading-none">USDC</div>
                        <div className="font-['Space_Grotesk'] text-[10px] text-[#10b981] font-semibold">+0.01%</div>
                      </div>
                    </div>
                    <svg className="w-16 h-5 stroke-[#a58c7b]" fill="none" viewBox="0 0 60 20">
                      <path d="M1 10 L15 10 L25 9.5 L38 10.5 L50 10 L58 10" strokeLinecap="round" strokeWidth="1.5" />
                    </svg>
                    <div className="text-right">
                      <div className="font-['Space_Grotesk'] text-[12px] text-[#ebe0d9] font-semibold">$1.00</div>
                      <div className="text-[10px] text-[#a58c7b]">$31.5B Supply</div>
                    </div>
                  </div>

                  {/* cirBTC / ARC */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#241f1a]/70 hover:bg-[#241f1a] transition-colors border border-[#564334]/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#ff8a00]/15 text-[#ff8a00] flex items-center justify-center font-bold text-xs">
                        ⚡
                      </div>
                      <div>
                        <div className="font-['Space_Grotesk'] text-[13px] text-[#ebe0d9] font-bold leading-none">cirBTC</div>
                        <div className="font-['Space_Grotesk'] text-[10px] text-[#10b981] font-semibold">+2.4%</div>
                      </div>
                    </div>
                    <svg className="w-16 h-5 stroke-[#10b981]" fill="none" viewBox="0 0 60 20">
                      <path d="M1 18 L14 15 L26 12 L36 14 L48 5 L58 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </svg>
                    <div className="text-right">
                      <div className="font-['Space_Grotesk'] text-[12px] text-[#ebe0d9] font-semibold">1.00 BTC</div>
                      <div className="text-[10px] text-[#a58c7b]">Arc Collateral</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#564334]/20 mt-3 text-[11px] text-[#a58c7b] flex items-center justify-between">
                <span>Oracle Provider: Pyth Network</span>
                <span className="text-[#10b981]">Heartbeat: 400ms</span>
              </div>
            </motion.div>

            {/* Widget 2: Center Viewport (PORTFOLIO HUD) */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ y: -14, scale: 1.02, transition: { duration: 0.2 } }}
              className="md:col-span-4 rounded-2xl bg-[#201b17]/95 backdrop-blur-2xl border border-[#ff8a00]/50 p-5 shadow-[0_20px_50px_rgba(255,138,0,0.25)] text-left relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#564334]/25 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-['Space_Grotesk'] text-[11px] text-[#ebe0d9] font-bold tracking-wider uppercase">
                      PORTFOLIO OVERVIEW
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    <span className="text-[11px] text-[#a58c7b] font-['Space_Grotesk']">Arc L1</span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between p-1 rounded-full bg-[#241f1a] mb-4 border border-[#564334]/30">
                  {(['Home', 'Borrow', 'Lend', 'Vote'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPortfolioTab(tab)}
                      className={`px-3 py-1 rounded-full font-['Space_Grotesk'] text-[11px] font-bold transition-all cursor-pointer ${
                        portfolioTab === tab
                          ? 'bg-[#ff8a00] text-[#17120f] shadow-sm'
                          : 'text-[#ddc1ae] hover:text-[#ebe0d9]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Balance Metric */}
                <div className="mb-3">
                  <div className="text-[11px] text-[#a58c7b] uppercase tracking-wider font-['Space_Grotesk']">
                    Net Escrow Value
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#ebe0d9]">
                      $84,320.55
                    </span>
                    <span className="font-['Space_Grotesk'] text-xs text-[#a58c7b]">USD</span>
                  </div>
                </div>

                {/* Animated Wave Curve Chart with Node Dot */}
                <div className="relative w-full h-20 mb-2">
                  <svg className="w-full h-full overflow-visible" fill="none" viewBox="0 0 280 80">
                    <defs>
                      <linearGradient id="curveGradientLanding" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ff8a00" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#ff8a00" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 60 Q 30 10, 70 45 T 140 30 T 210 65 T 280 15 L 280 80 L 0 80 Z" fill="url(#curveGradientLanding)" />
                    <path d="M0 60 Q 30 10, 70 45 T 140 30 T 210 65 T 280 15" fill="none" stroke="#ffb77f" strokeWidth="2.5" />
                    <circle className="filter drop-shadow-[0_0_8px_#ff8a00] animate-pulse" cx="210" cy="65" fill="#ffffff" r="4.5" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#564334]/25 text-xs">
                <span className="text-[#ddc1ae]">Collateral Yield</span>
                <span className="font-['Space_Grotesk'] text-[#10b981] font-semibold">
                  +$1,240.49 (+4.2%)
                </span>
              </div>
            </motion.div>

            {/* Widget 3: LOAN AGREEMENT Widget */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ y: -12, scale: 1.01, transition: { duration: 0.2 } }}
              className="md:col-span-4 rounded-2xl bg-[#201b17]/95 backdrop-blur-2xl border border-[#564334]/50 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-left relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#564334]/25 mb-3">
                  <span className="font-['Space_Grotesk'] text-[11px] uppercase text-[#ebe0d9] tracking-widest font-bold">
                    LOAN AGREEMENT
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] text-[10px] font-['Space_Grotesk'] font-bold uppercase">
                    Interactive
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-[#241f1a] text-[#ff8a00] font-['Space_Grotesk'] text-[11px] font-semibold border border-[#564334]/30">
                    BTC : USDC
                  </span>
                  <div className="font-['Space_Grotesk'] text-[11px] text-[#ddc1ae]">
                    Fixed Rate: <span className="text-[#ff8a00] font-bold">8.20% APR</span>
                  </div>
                </div>

                {/* Collateral Deposit */}
                <div className="p-3 rounded-xl bg-[#120d0a] border border-[#564334]/40 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#f7931a] text-black font-bold flex items-center justify-center text-[10px]">
                      ₿
                    </span>
                    <span className="font-['Space_Grotesk'] text-[13px] text-[#ebe0d9] font-bold">cirBTC</span>
                  </div>
                  <div className="text-right">
                    <input
                      type="number"
                      value={btcAmount}
                      onChange={(e) => setBtcAmount(e.target.value)}
                      className="w-24 text-right bg-transparent text-[#ebe0d9] font-['Space_Grotesk'] text-[14px] font-bold outline-none focus:text-[#ff8a00]"
                      step="0.05"
                    />
                    <div className="text-[10px] text-[#a58c7b]">
                      ≈ ${collateralUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {/* Switch Divider */}
                <div className="flex justify-center -my-2 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-[#2f2924] border border-[#564334]/50 flex items-center justify-center text-[#ff8a00] shadow-sm">
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </div>

                {/* Borrow Principal */}
                <div className="p-3 rounded-xl bg-[#120d0a] border border-[#564334]/40 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#2775ca] text-white font-bold flex items-center justify-center text-[10px]">
                      $
                    </span>
                    <span className="font-['Space_Grotesk'] text-[13px] text-[#ebe0d9] font-bold">USDC</span>
                  </div>
                  <div className="text-right">
                    <input
                      type="number"
                      value={usdcAmount}
                      onChange={(e) => setUsdcAmount(e.target.value)}
                      className="w-28 text-right bg-transparent text-[#ff8a00] font-['Space_Grotesk'] text-[14px] font-bold outline-none focus:underline"
                      step="500"
                    />
                    <div className={`text-[10px] font-['Space_Grotesk'] font-semibold ${isSafe ? 'text-[#10b981]' : 'text-red-400'}`}>
                      LTV: {ltv}% {isSafe ? '(Safe)' : '(High Risk)'}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/deal/new')}
                className="w-full py-2.5 rounded-full bg-[#2f2924] hover:bg-[#ff8a00] hover:text-[#17120f] text-[#ebe0d9] font-['Space_Grotesk'] text-[11px] uppercase font-bold border border-[#564334]/40 transition-colors cursor-pointer mt-2"
              >
                Lock & Issue Escrow
              </button>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 2: LIVE ON-CHAIN STATS TICKER (Scroll Fade In) ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="w-full bg-[#120d0a]/80 border-y border-[#564334]/30 py-8 relative z-10 backdrop-blur-xl"
        >
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ff8a00]/15 flex items-center justify-center text-[#ff8a00]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-[11px] text-[#ddc1ae] uppercase tracking-wider">
                  Total Escrow Value
                </div>
                <div className="font-['Space_Grotesk'] text-xl sm:text-2xl text-[#ebe0d9] font-bold">
                  $1,420,000+ <span className="text-xs text-[#ff8a00]">USDC</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#cc7f1a]/15 flex items-center justify-center text-[#ffb86b]">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-[11px] text-[#ddc1ae] uppercase tracking-wider">
                  Active Escrow Deals
                </div>
                <div className="font-['Space_Grotesk'] text-xl sm:text-2xl text-[#ebe0d9] font-bold">
                  54 <span className="text-xs text-[#a58c7b]">Contracts</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#10b981]/15 flex items-center justify-center text-[#10b981]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-[11px] text-[#ddc1ae] uppercase tracking-wider">
                  Collateral Health
                </div>
                <div className="font-['Space_Grotesk'] text-xl sm:text-2xl text-[#10b981] font-bold">
                  135% <span className="text-xs text-[#a58c7b]">Pyth BTC</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ffb77f]/15 flex items-center justify-center text-[#ffb77f]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-['Space_Grotesk'] text-[11px] text-[#ddc1ae] uppercase tracking-wider">
                  Settlement Engine
                </div>
                <div className="font-['Space_Grotesk'] text-xl sm:text-2xl text-[#ebe0d9] font-bold">
                  &lt; 1s <span className="text-xs text-[#a58c7b]">Arc L1 Finality</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── SECTION 3: INTERACTIVE LOAN CALCULATOR (3D Tilt Rise) ── */}
        <section id="calculator" className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-24 md:py-32 relative z-10" style={{ perspective: 1200 }}>
          <motion.div
            initial={{ opacity: 0, y: 50, rotateX: 12 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="font-['Space_Grotesk'] text-[11px] text-[#ff8a00] uppercase tracking-widest font-bold mb-2">
                Instant Simulation
              </div>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl text-[#ebe0d9] font-bold">
                Bitcoin Loan & Yield Calculator
              </h2>
              <p className="text-sm sm:text-base text-[#ddc1ae] mt-3">
                Model your borrowing capacity or calculate lender returns with guaranteed non-custodial math.
              </p>
            </div>

            <div className="max-w-4xl mx-auto rounded-3xl bg-[#201b17]/90 backdrop-blur-2xl border border-[#564334]/40 p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Controls */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9]">
                        Bitcoin Collateral (cirBTC)
                      </label>
                      <span className="font-['Space_Grotesk'] text-base font-bold text-[#ff8a00]">
                        {calcBtc.toFixed(2)} BTC
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.05"
                      value={calcBtc}
                      onChange={(e) => setCalcBtc(parseFloat(e.target.value))}
                      className="w-full accent-[#ff8a00] cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-[#a58c7b] mt-1 font-['Space_Grotesk']">
                      <span>0.1 BTC</span>
                      <span>2.5 BTC</span>
                      <span>5.0 BTC</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-['Space_Grotesk'] text-sm font-bold text-[#ebe0d9] mb-2">
                      Loan Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[7, 14, 30, 90].map((d) => (
                        <button
                          key={d}
                          onClick={() => setCalcDuration(d)}
                          className={`py-2 rounded-xl font-['Space_Grotesk'] text-xs font-bold transition-all cursor-pointer ${
                            calcDuration === d
                              ? 'bg-[#ff8a00] text-[#17120f] shadow-md'
                              : 'bg-[#241f1a] text-[#ddc1ae] hover:bg-[#2f2924] border border-[#564334]/30'
                          }`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#120d0a] border border-[#564334]/30 text-xs text-[#a58c7b] space-y-1">
                    <div className="flex justify-between">
                      <span>Collateral Value:</span>
                      <span className="text-[#ebe0d9] font-bold">
                        ${(calcBtc * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fixed Protocol APR:</span>
                      <span className="text-[#10b981] font-bold">8.20% Fixed</span>
                    </div>
                  </div>
                </div>

                {/* Output Card */}
                <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#2f2924]/80 to-[#120d0a] border border-[#ff8a00]/30 shadow-inner flex flex-col justify-between">
                  <div>
                    <span className="font-['Space_Grotesk'] text-[11px] uppercase tracking-wider text-[#a58c7b] font-bold">
                      Max Safe Borrowing Capacity (70% LTV)
                    </span>
                    <div className="font-['Space_Grotesk'] text-3xl sm:text-4xl text-[#ebe0d9] font-bold mt-1 mb-4">
                      ${parseInt(calcMaxBorrow).toLocaleString()} <span className="text-base text-[#ff8a00]">USDC</span>
                    </div>

                    <div className="space-y-3 py-3 border-y border-[#564334]/30 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#a58c7b]">Estimated Total Repayment:</span>
                        <span className="font-['Space_Grotesk'] font-bold text-[#ebe0d9]">
                          ${(parseInt(calcMaxBorrow) + parseInt(calcInterest)).toLocaleString()} USDC
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#a58c7b]">Fixed Borrow Cost:</span>
                        <span className="font-['Space_Grotesk'] font-bold text-[#ff8a00]">
                          +${parseInt(calcInterest).toLocaleString()} USDC
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#a58c7b]">Liquidation Price Trigger:</span>
                        <span className="font-['Space_Grotesk'] font-bold text-[#10b981]">
                          ${parseInt(calcLiquidationPrice).toLocaleString()} / BTC
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/deal/new')}
                    className="w-full mt-6 py-3.5 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-sm font-bold shadow-[0_6px_24px_rgba(255,138,0,0.35)] hover:shadow-[0_8px_32px_rgba(255,138,0,0.55)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Start This Loan on Arc</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── SECTION 4: DUAL DISCOVERY ARCHITECTURE (3D Angle Entrance) ── */}
        <section className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-20 md:py-28 relative z-10" style={{ perspective: 1200 }}>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="font-['Space_Grotesk'] text-[11px] text-[#ff8a00] uppercase tracking-widest font-bold mb-2">
              Flexible Counterparty Discovery
            </div>
            <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl text-[#ebe0d9] font-bold">
              Two Distinct Ways to Lend & Borrow
            </h2>
            <p className="text-sm sm:text-base text-[#ddc1ae] mt-3">
              Whether you have a predetermined partner or want to leverage market-clearing liquidity, Persat automates escrow without intermediaries.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Path One: Private Deal-Link */}
            <motion.div
              initial={{ opacity: 0, x: -60, rotateY: 14 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-[#201b17]/90 backdrop-blur-xl border border-[#564334]/30 p-6 sm:p-8 relative overflow-hidden group hover:border-[#ff8a00]/40 transition-all shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-full bg-[#ff8a00]/15 flex items-center justify-center text-[#ff8a00] mb-4">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] uppercase text-[#ff8a00] tracking-wider font-semibold">
                  Path One
                </span>
                <h3 className="font-['Space_Grotesk'] text-2xl text-[#ebe0d9] font-bold mt-1 mb-3">
                  Private Deal-Link
                </h3>
                <p className="text-sm text-[#ddc1ae] mb-6 leading-relaxed">
                  For when you already know your borrower or lender (a friend, business partner, or DAO colleague). Agree on custom terms in private, generate a single-use claim link, and let our verified smart contracts execute atomic escrow.
                </p>

                <ul className="flex flex-col gap-3 text-sm text-[#ebe0d9] mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#ff8a00] shrink-0" />
                    <span>Zero orderbook footprint, private encrypted URL exchange</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#ff8a00] shrink-0" />
                    <span>Encrypted counterparty authorization check on connection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#ff8a00] shrink-0" />
                    <span>Tamper-proof on-chain collateral lock-up on Arc L1</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-[#241f1a] border border-[#564334]/30 flex items-center justify-between font-['Space_Grotesk'] text-xs text-[#a58c7b]">
                <span className="truncate mr-2">{typeof window !== 'undefined' ? window.location.host : 'persat.finance'}/deal/claim/8f9024a...</span>
                <button
                  onClick={handleCopyLink}
                  className="text-[#ff8a00] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </motion.div>

            {/* Path Two: Open Marketplace */}
            <motion.div
              initial={{ opacity: 0, x: 60, rotateY: -14 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-[#201b17]/90 backdrop-blur-xl border border-[#564334]/30 p-6 sm:p-8 relative overflow-hidden group hover:border-[#ffb86b]/40 transition-all shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-full bg-[#cc7f1a]/15 flex items-center justify-center text-[#ffb86b] mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] uppercase text-[#ffb86b] tracking-wider font-semibold">
                  Path Two
                </span>
                <h3 className="font-['Space_Grotesk'] text-2xl text-[#ebe0d9] font-bold mt-1 mb-3">
                  Open Marketplace
                </h3>
                <p className="text-sm text-[#ddc1ae] mb-6 leading-relaxed">
                  For when you need instant liquidity matching. Post your exact collateral-to-borrow parameters or fulfill vetted listings. Lenders can propose alternative terms — principal, rate, duration — and you choose the best offer.
                </p>

                <ul className="flex flex-col gap-3 text-sm text-[#ebe0d9] mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#ffb86b] shrink-0" />
                    <span>Deterministic terms matching without spam chat vectors</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#ffb86b] shrink-0" />
                    <span>Multi-oracle safety valves with automated margin calls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#ffb86b] shrink-0" />
                    <span>Transparent pool depth with verifiable on-chain track records</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-[#241f1a] border border-[#564334]/30 flex items-center justify-between font-['Space_Grotesk'] text-xs text-[#a58c7b]">
                <span>Active Listings Available</span>
                <Link to="/marketplace" className="text-[#ffb86b] hover:underline font-bold">
                  View Orderbook →
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 5: 3-STEP ATOMIC PIPELINE (Staggered 3D Rise) ── */}
        <section id="how-it-works" className="w-full bg-[#120d0a]/60 border-t border-[#564334]/30 py-24 md:py-32 relative z-10" style={{ perspective: 1200 }}>
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="font-['Space_Grotesk'] text-[11px] text-[#ff8a00] uppercase tracking-widest font-bold mb-2">
                Zero-Custody Process
              </div>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl text-[#ebe0d9] font-bold">
                The Atomic Escrow Mechanism
              </h2>
              <p className="text-sm sm:text-base text-[#ddc1ae] mt-3">
                How smart contracts replace centralized custodians and credit bureaus with deterministic mathematical guarantees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  title: 'Pledge Bitcoin Collateral',
                  desc: 'Deposit native Bitcoin through verified wrapper primitives (cirBTC or WBTC) into an isolated on-chain escrow program on Arc. Persat never has administrative access to your keys.',
                  footerLabel: 'Protocol Collateral',
                  footerVal: 'cirBTC Vault',
                  valColor: 'text-[#ebe0d9]',
                },
                {
                  step: '02',
                  title: 'Receive Instant Stablecoins',
                  desc: 'Once verified on Arc via Pyth BTC/USD oracles, USDC stablecoins are dispatched immediately from the peer lender to your destination wallet in one atomic transaction.',
                  footerLabel: 'Execution Speed',
                  footerVal: '< 1s Finality',
                  valColor: 'text-[#ff8a00]',
                },
                {
                  step: '03',
                  title: 'Repay & Auto-Unlock',
                  desc: 'Return the borrowed USDC plus agreed-upon fixed interest prior to expiration. The smart contract automatically unlocks and returns 100% of your collateral.',
                  footerLabel: 'Settlement Output',
                  footerVal: 'Immediate Release',
                  valColor: 'text-[#10b981]',
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40, rotateX: 15 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="p-6 sm:p-7 rounded-2xl bg-[#201b17] border border-[#564334]/30 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="font-['Space_Grotesk'] text-3xl text-[#ff8a00]/40 font-bold mb-3">{item.step}</div>
                    <h4 className="font-['Space_Grotesk'] text-lg text-[#ebe0d9] font-bold mb-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-[#ddc1ae] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-[#564334]/20 flex items-center justify-between font-['Space_Grotesk'] text-[11px] text-[#a58c7b]">
                    <span>{item.footerLabel}</span>
                    <span className={`font-semibold ${item.valColor}`}>{item.footerVal}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 6: PROTOCOL COMPARISON MATRIX ── */}
        <motion.section
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-24 md:py-32 relative z-10"
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="font-['Space_Grotesk'] text-[11px] text-[#ff8a00] uppercase tracking-widest font-bold mb-2">
              Competitive Advantage
            </div>
            <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl text-[#ebe0d9] font-bold">
              Why Persat on Arc Leads Web3 Lending
            </h2>
            <p className="text-sm sm:text-base text-[#ddc1ae] mt-3">
              How Persat's atomic peer-to-peer escrow outperforms both centralized lenders and pool lending protocols.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-[#564334]/40 bg-[#201b17]/90 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#564334]/30 bg-[#241f1a]/80">
                  <th className="p-4 sm:p-5 font-['Space_Grotesk'] text-[#a58c7b] uppercase text-xs">Feature</th>
                  <th className="p-4 sm:p-5 font-['Space_Grotesk'] text-[#ff8a00] font-bold uppercase text-xs sm:text-sm bg-[#ff8a00]/10">
                    Persat on Arc
                  </th>
                  <th className="p-4 sm:p-5 font-['Space_Grotesk'] text-[#a58c7b] uppercase text-xs">
                    Centralized (BlockFi/CeFi)
                  </th>
                  <th className="p-4 sm:p-5 font-['Space_Grotesk'] text-[#a58c7b] uppercase text-xs">
                    Pool Lending (Aave/Compound)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#564334]/20 text-[#ddc1ae]">
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-[#ebe0d9]">Custody Risk</td>
                  <td className="p-4 sm:p-5 text-[#10b981] font-bold bg-[#ff8a00]/5">
                    Zero Custody (Smart Contract)
                  </td>
                  <td className="p-4 sm:p-5 text-red-400">High (Company holds keys)</td>
                  <td className="p-4 sm:p-5">Medium (Shared pool risk)</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-[#ebe0d9]">Interest Rate Stability</td>
                  <td className="p-4 sm:p-5 text-[#10b981] font-bold bg-[#ff8a00]/5">
                    Fixed & Guaranteed
                  </td>
                  <td className="p-4 sm:p-5">Arbitrary Discretionary</td>
                  <td className="p-4 sm:p-5 text-amber-300">Volatile Floating Spikes</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-[#ebe0d9]">KYC / Identity Friction</td>
                  <td className="p-4 sm:p-5 text-[#10b981] font-bold bg-[#ff8a00]/5">
                    Zero KYC (Web3 Wallet Only)
                  </td>
                  <td className="p-4 sm:p-5 text-red-400">Mandatory Passport/ID</td>
                  <td className="p-4 sm:p-5">Zero KYC</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-[#ebe0d9]">Settlement Speed</td>
                  <td className="p-4 sm:p-5 text-[#10b981] font-bold bg-[#ff8a00]/5">
                    &lt; 1s Finality (Arc L1)
                  </td>
                  <td className="p-4 sm:p-5 text-red-400">24-48h Manual Review</td>
                  <td className="p-4 sm:p-5">12s - 15m (Gas volatile)</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-[#ebe0d9]">Counterparty Options</td>
                  <td className="p-4 sm:p-5 text-[#10b981] font-bold bg-[#ff8a00]/5">
                    Private Deal Link OR Open Book
                  </td>
                  <td className="p-4 sm:p-5">Company Only</td>
                  <td className="p-4 sm:p-5">Shared Pool Only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* ── SECTION 7: REPUTATION & AUDIT (3D Flip Entrance) ── */}
        <section id="security" className="w-full bg-[#120d0a]/80 border-t border-[#564334]/30 py-24 md:py-32 relative z-10" style={{ perspective: 1200 }}>
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-5"
              >
                <span className="font-['Space_Grotesk'] text-[11px] uppercase text-[#ff8a00] tracking-widest font-bold">
                  Reputation Passport
                </span>
                <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl text-[#ebe0d9] font-bold mt-2 mb-4 leading-tight">
                  Trust Formed by Math, <br />Not Testimonials.
                </h2>
                <p className="text-base text-[#ddc1ae] mb-6 leading-relaxed">
                  Real on-chain repayment history tied directly to cryptographic public keys, zero fake user reviews, zero curated ratings, zero manipulated profiles.
                </p>
                <div className="space-y-3 text-sm text-[#ddc1ae]">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                    <span>All historical escrows verified directly against Arc block explorers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                    <span>Borrowers build deterministic interest discounts with 100% on-time record</span>
                  </div>
                </div>
              </motion.div>

              {/* High-Fidelity Borrower Credential Badge Card (3D Flip In) */}
              <motion.div
                initial={{ opacity: 0, rotateY: -15, scale: 0.94 }}
                whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 rounded-2xl bg-[#201b17]/90 backdrop-blur-2xl border border-[#564334]/40 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#564334]/25 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffb77f] to-[#ff8a00] p-0.5">
                      <div className="w-full h-full rounded-full bg-[#120d0a] flex items-center justify-center font-['Space_Grotesk'] text-[#ff8a00] font-bold">
                        8xK
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-['Space_Grotesk'] text-sm text-[#ebe0d9] font-bold">8xK4...9qL2</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] font-['Space_Grotesk'] text-[10px] font-bold">
                          PROVEN LENDER
                        </span>
                      </div>
                      <div className="text-xs text-[#a58c7b]">First Active: Block #249,112,040</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#241f1a] border border-[#564334]/40">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    <span className="font-['Space_Grotesk'] text-xs text-[#ebe0d9] uppercase font-bold">Score: 99.4 Tier-1</span>
                  </div>
                </div>

                {/* Proof Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 py-6">
                  <div>
                    <div className="font-['Space_Grotesk'] text-[11px] text-[#a58c7b] uppercase">Deals Completed</div>
                    <div className="font-['Space_Grotesk'] text-2xl text-[#ebe0d9] font-bold">4 Loans</div>
                    <div className="text-[11px] text-[#10b981]">0 Defaults</div>
                  </div>
                  <div>
                    <div className="font-['Space_Grotesk'] text-[11px] text-[#a58c7b] uppercase">Repay Rate</div>
                    <div className="font-['Space_Grotesk'] text-2xl text-[#ff8a00] font-bold">100.0%</div>
                    <div className="text-[11px] text-[#ddc1ae]">On-Time Execution</div>
                  </div>
                  <div>
                    <div className="font-['Space_Grotesk'] text-[11px] text-[#a58c7b] uppercase">Settled Volume</div>
                    <div className="font-['Space_Grotesk'] text-2xl text-[#ebe0d9] font-bold">12.4 BTC</div>
                    <div className="text-[11px] text-[#a58c7b]">≈ $1.45M USD</div>
                  </div>
                </div>

                {/* Micro Proof Line Item */}
                <div className="p-3 rounded-xl bg-[#241f1a]/60 border border-[#564334]/30 flex items-center justify-between font-['Space_Grotesk'] text-xs">
                  <span className="text-[#a58c7b]">Last Transaction: 3.1 BTC Collateral Release</span>
                  <a
                    href={`https://explorer.testnet.arc.io/address/${REGISTRY_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff8a00] hover:underline flex items-center gap-1"
                  >
                    <span>Tx: #92b9f...d4</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: FAQ ACCORDION ── */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-24 md:py-32 relative z-10"
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="font-['Space_Grotesk'] text-[11px] text-[#ff8a00] uppercase tracking-widest font-bold mb-2">
              Common Inquiries
            </div>
            <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl text-[#ebe0d9] font-bold">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-[#ddc1ae] mt-3">
              Everything you need to know about collateral safety, liquidation thresholds, and Arc L1 escrow.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'How is my Bitcoin collateral kept safe during the loan?',
                a: 'Collateral is locked into immutable smart contract escrow on Circle\'s Arc L1. Persat never has administrative access, custody keys, or backdoors. Your collateral is solely unlocked by automated smart contract logic upon loan repayment.',
              },
              {
                q: 'What happens if Bitcoin\'s price drops significantly?',
                a: 'Loans maintain an 80% maximum Loan-to-Value (LTV) liquidation threshold. If the market value drops and approaches the threshold, automated margin notifications trigger. If 80% is breached, the escrow smart contract liquidates only enough collateral to protect the lender.',
              },
              {
                q: 'Can Persat Labs freeze or seize my funds?',
                a: 'No. The contracts operate strictly on verified bytecode without emergency freeze abilities, validator god-mode, or unilateral withdrawal privileges.',
              },
              {
                q: 'How do private deal links work for known counterparties?',
                a: 'When you create a Direct Deal, an encrypted single-use link is generated. Only the designated counterparty\'s connected wallet can accept the terms. No details are leaked to the public marketplace orderbook.',
              },
              {
                q: 'What tokens are supported on Arc Testnet?',
                a: 'The protocol natively supports cirBTC (Circle wrapped Bitcoin primitives) as collateral and native Circle USDC for borrowing and interest settlements.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#201b17] border border-[#564334]/30 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-['Space_Grotesk'] text-sm sm:text-base font-bold text-[#ebe0d9] hover:text-[#ff8a00] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#ff8a00] transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-5 text-xs sm:text-sm text-[#ddc1ae] leading-relaxed border-t border-[#564334]/20 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── SECTION 9: FINAL CALL TO ACTION ── */}
        <section className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-24 text-center relative z-10" style={{ perspective: 1200 }}>
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-[#2f2924]/60 to-[#120d0a] border border-[#564334]/40 shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ff8a00]/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <span className="font-['Space_Grotesk'] text-[11px] text-[#ff8a00] uppercase tracking-widest font-bold mb-2">
                Ready to Experience True Disintermediation?
              </span>
              <h2 className="font-['Space_Grotesk'] text-3xl sm:text-5xl text-[#ebe0d9] font-bold mb-4">
                Start Lending on Your Own Terms.
              </h2>
              <p className="text-base text-[#ddc1ae] mb-8 leading-relaxed">
                Connect your Web3 wallet to issue a direct private loan link or match with peer lenders across the globe with zero custody on Circle's Arc L1.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => openAuth('/dashboard')}
                  className="group relative inline-flex items-center pl-6 pr-2 py-2 rounded-full bg-gradient-to-b from-[#ffaa45] to-[#ff8a00] text-[#17120f] font-['Space_Grotesk'] text-[14px] font-bold shadow-[0px_4px_28px_rgba(255,138,0,0.45)] hover:shadow-[0px_6px_36px_rgba(255,138,0,0.65)] transition-all cursor-pointer"
                >
                  <span className="uppercase mr-3 font-bold tracking-wide">Launch App Now</span>
                  <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#ff8a00] shadow-sm group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
                <Link
                  to="/deal/new"
                  className="inline-flex items-center px-6 py-3 rounded-full bg-[#241f1a] border border-[#564334]/40 text-[#ebe0d9] font-['Space_Grotesk'] text-xs uppercase tracking-wider hover:bg-[#3e3833] transition-colors no-underline font-semibold"
                >
                  Create Direct Deal
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#120d0a] border-t border-[#564334]/30 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#564334]/20 pb-6">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#201b17] border border-[#564334]/40">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]" />
              </span>
              <span className="font-['Space_Grotesk'] text-xs text-[#ebe0d9] font-semibold">
                Connected to Arc Testnet (Chain ID: 5042002)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <a
                href={`https://explorer.testnet.arc.io/address/${REGISTRY_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-['Space_Grotesk'] text-xs text-[#ddc1ae] hover:text-[#ff8a00] transition-colors no-underline flex items-center gap-1"
              >
                Deal Registry <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://explorer.testnet.arc.io/address/${ESCROW_VAULT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-['Space_Grotesk'] text-xs text-[#ddc1ae] hover:text-[#ff8a00] transition-colors no-underline flex items-center gap-1"
              >
                Escrow Vault <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/MaxCybOps/persat-finance-arc"
                target="_blank"
                rel="noopener noreferrer"
                className="font-['Space_Grotesk'] text-xs text-[#ddc1ae] hover:text-[#ff8a00] transition-colors no-underline flex items-center gap-1"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
              <Link to="/marketplace" className="font-['Space_Grotesk'] text-xs text-[#ddc1ae] hover:text-[#ff8a00] transition-colors no-underline">
                Marketplace
              </Link>
              <button
                onClick={() => openAuth('/dashboard')}
                className="font-['Space_Grotesk'] text-xs text-[#ddc1ae] hover:text-[#ff8a00] transition-colors no-underline cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#ddc1ae]">
            <p>© 2026 Persat Finance. Built on Circle's Arc L1.</p>
            <p className="font-['Space_Grotesk'] text-[#a58c7b]">
              Zero-Latency Institutional Escrow Protocol
            </p>
          </div>
        </div>
      </footer>

      {/* Web3 Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        destination={authDestination}
      />
    </div>
  )
}
