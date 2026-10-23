/**
 * Persat Finance — Landing Page
 * High-converting gateway portal. Black/obsidian background, solar ember accents.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Shield, Zap, Lock, ArrowRight, ExternalLink,
  ChevronRight, Menu, X, Globe, Bitcoin,
} from 'lucide-react'
import { useReadContract } from 'wagmi'
import { REGISTRY_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../contracts/addresses'

// ── design tokens ────────────────────────────────────────────────────────────
const C = {
  black:   '#000000',
  obsidian:'#080503',
  ember:   '#ff8a00',
  tangerine:'#ffaa45',
  horizon: '#ffba69',
  surface: 'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.08)',
  ink:     '#f5f0eb',
  subtle:  'rgba(255,255,255,0.45)',
  muted:   'rgba(255,255,255,0.25)',
}

const BTN_PRIMARY: React.CSSProperties = {
  background: 'linear-gradient(180deg,#ffad4d 0%,#ff8a00 55%,#f08c15 100%)',
  boxShadow: '0 10px 26px -8px rgba(255,138,0,0.75)',
  border: 'none',
  color: '#fff',
  borderRadius: 9999,
  fontFamily: "'Space Grotesk',sans-serif",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '-0.01em',
  padding: '14px 28px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  transition: 'opacity 0.15s',
}

const BTN_GHOST: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: C.ink,
  borderRadius: 9999,
  fontFamily: "'DM Sans',sans-serif",
  fontWeight: 600,
  fontSize: 15,
  padding: '13px 26px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  backdropFilter: 'blur(12px)',
  transition: 'border-color 0.15s, background 0.15s',
}

const GLASS: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  backdropFilter: 'blur(24px)',
  borderRadius: 20,
}

// ── helpers ──────────────────────────────────────────────────────────────────
function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  }
}

// ── 3-D orbital canvas ───────────────────────────────────────────────────────
function OrbitalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: 0, y: 0 })
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0, H = 0
    function resize() {
      if (!canvas) return
      W = canvas.width  = canvas.offsetWidth  * devicePixelRatio
      H = canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx!.scale(devicePixelRatio, devicePixelRatio)
      W /= devicePixelRatio
      H /= devicePixelRatio
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.current = {
        x: (e.clientX - r.left - W / 2) / W,
        y: (e.clientY - r.top  - H / 2) / H,
      }
    }
    window.addEventListener('mousemove', onMove)

    let t = 0
    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      t += 0.004

      const cx = W / 2 + mouse.current.x * 18
      const cy = H / 2 + mouse.current.y * 18

      // ambient haze
      const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.55)
      haze.addColorStop(0,   'rgba(255,138,0,0.18)')
      haze.addColorStop(0.5, 'rgba(255,138,0,0.06)')
      haze.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = haze
      ctx.fillRect(0, 0, W, H)

      // solar ripple rings
      for (let i = 1; i <= 4; i++) {
        const r = (Math.min(W, H) * 0.18 * i) + Math.sin(t + i) * 6
        ctx.beginPath()
        ctx.ellipse(cx, cy, r, r * 0.38, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,186,105,${0.14 - i * 0.025})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // rotating conic filament (CSS conic not available in canvas — use arc sweep)
      const filamentAngle = t * (Math.PI * 2 / 90)
      const grad = ctx.createConicalGradientFallback
        ? undefined
        : null
      void grad
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(filamentAngle)
      const sweep = ctx.createLinearGradient(-W * 0.4, 0, W * 0.4, 0)
      sweep.addColorStop(0, 'rgba(255,138,0,0)')
      sweep.addColorStop(0.5, 'rgba(255,170,69,0.12)')
      sweep.addColorStop(1, 'rgba(255,138,0,0)')
      ctx.fillStyle = sweep
      ctx.fillRect(-W * 0.4, -2, W * 0.8, 4)
      ctx.restore()

      // orbital ring
      const orbitRx = Math.min(W, H) * 0.3
      const orbitRy = orbitRx * 0.35
      ctx.beginPath()
      ctx.ellipse(cx, cy, orbitRx, orbitRy, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,170,69,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // floating tokens
      const tokens = [
        { angle: t,            label: 'BTC',  color: '#f7931a', r: 28 },
        { angle: t + Math.PI,  label: 'USDC', color: '#2775ca', r: 24 },
      ]
      for (const tk of tokens) {
        const tx = cx + Math.cos(tk.angle) * orbitRx + mouse.current.x * 10
        const ty = cy + Math.sin(tk.angle) * orbitRy + mouse.current.y * 8

        // glow
        const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, tk.r * 2.5)
        glow.addColorStop(0, tk.color + '55')
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(tx, ty, tk.r * 2.5, 0, Math.PI * 2)
        ctx.fill()

        // glass disc
        ctx.beginPath()
        ctx.arc(tx, ty, tk.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${tk.color === '#f7931a' ? '247,147,26' : '39,117,202'},0.15)`
        ctx.fill()
        ctx.strokeStyle = tk.color + 'aa'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // label
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${tk.r * 0.55}px "Space Grotesk",sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(tk.label, tx, ty)
      }

      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('mousemove', onMove)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

// ── nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const links = [
    { label: 'How It Works', href: '#how' },
    { label: 'Borrow',       href: '#borrow' },
    { label: 'Lend',         href: '#lend' },
    { label: 'Security',     href: '#security' },
  ]
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '0 24px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* logo */}
      <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,138,0,0.15)',
          border: '1px solid rgba(255,138,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Bitcoin size={16} color={C.ember} />
        </div>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:17, color:C.ink, letterSpacing:'-0.02em' }}>
          PERSAT
        </span>
        <span style={{
          background:'rgba(0,200,80,0.12)', border:'1px solid rgba(0,200,80,0.3)',
          borderRadius:99, padding:'2px 8px', fontSize:10, fontWeight:700,
          color:'#4ade80', letterSpacing:'0.08em',
          display:'flex', alignItems:'center', gap:5,
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', animation:'pulse 2s infinite', display:'inline-block' }} />
          BUILT ON ARC L1
        </span>
      </Link>

      {/* desktop links */}
      <div style={{ display:'flex', gap:4 }} className="hidden md:flex">
        {links.map(l => (
          <a key={l.href} href={l.href} style={{
            color: C.subtle, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500,
            textDecoration:'none', padding:'6px 14px', borderRadius:8,
            transition:'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = C.ink)}
          onMouseLeave={e => (e.currentTarget.style.color = C.subtle)}
          >{l.label}</a>
        ))}
      </div>

      {/* right actions */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button
          onClick={() => navigate('/marketplace')}
          style={{ ...BTN_GHOST, padding:'8px 18px', fontSize:13 }}
          className="hidden md:flex"
        >
          Launch App <ChevronRight size={14} />
        </button>
        <button onClick={() => setOpen(!open)} className="md:hidden" style={{ background:'none', border:'none', color:C.ink, cursor:'pointer' }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div style={{
          position:'absolute', top:60, left:0, right:0,
          background:'rgba(8,5,3,0.97)', backdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          padding:'16px 24px 24px',
          display:'flex', flexDirection:'column', gap:4,
        }}>
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
              color:C.subtle, fontFamily:"'DM Sans',sans-serif", fontSize:16,
              textDecoration:'none', padding:'12px 0',
              borderBottom:'1px solid rgba(255,255,255,0.05)',
            }}>{l.label}</a>
          ))}
          <button onClick={() => { setOpen(false); navigate('/marketplace') }}
            style={{ ...BTN_PRIMARY, marginTop:16, justifyContent:'center' }}>
            Launch App
          </button>
        </div>
      )}
    </nav>
  )
}

// ── stats bar ────────────────────────────────────────────────────────────────
const REGISTRY_DEAL_COUNT_ABI = [
  { name:'dealCount', type:'function', stateMutability:'view', inputs:[], outputs:[{ name:'', type:'uint256' }] },
] as const

function StatsBar() {
  const { data: dealCount } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_DEAL_COUNT_ABI,
    functionName: 'dealCount',
    chainId: ARC_TESTNET_CHAIN_ID,
  })
  const stats = [
    { label: 'TVL',                  value: '$1,420,000+', sub:'USDC locked' },
    { label: 'Active Escrow Loans',  value: dealCount !== undefined ? String(dealCount) : '—', sub:'on-chain deals' },
    { label: 'Max LTV',              value: '80%',         sub:'liquidation threshold' },
    { label: 'Settlement Finality',  value: 'Sub-Second',  sub:'Circle Arc Testnet' },
  ]
  return (
    <div style={{
      ...GLASS, padding:'18px 32px',
      display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0,
    }} className="grid-cols-2 md:grid-cols-4">
      {stats.map((s, i) => (
        <div key={s.label} style={{
          textAlign:'center', padding:'12px 16px',
          borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:22, color:C.ember, letterSpacing:'-0.03em' }}>{s.value}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:3, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── section wrapper ───────────────────────────────────────────────────────────
function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ padding:'96px 24px', maxWidth:1100, margin:'0 auto', ...style }}>
      {children}
    </section>
  )
}

// ── landing page ─────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const heroRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  void scrolled // used for potential nav shrink

  return (
    <div style={{ background: C.black, color: C.ink, minHeight:'100dvh', overflowX:'hidden' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .hover-lift { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 0 24px rgba(255,138,0,0.2); }
      `}</style>

      <Nav />

      {/* ── HERO ── */}
      <div ref={heroRef} style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', justifyContent:'center', position:'relative', paddingTop:60 }}>
        {/* background obsidian depth */}
        <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,138,0,0.08) 0%, transparent 70%), ${C.obsidian}` }} />

        <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto', padding:'0 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }} className="flex-col md:grid-cols-2">

          {/* left copy */}
          <div>
            <motion.div {...fadeUp(0)}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'rgba(255,138,0,0.1)', border:'1px solid rgba(255,138,0,0.25)',
                borderRadius:99, padding:'6px 14px', marginBottom:28,
              }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:C.ember, animation:'pulse 2s infinite', display:'inline-block' }} />
                <span style={{ fontSize:11, fontWeight:700, color:C.tangerine, letterSpacing:'0.08em' }}>
                  PEER-TO-PEER BITCOIN LENDING • POWERED BY CIRCLE'S ARC L1
                </span>
              </div>
            </motion.div>

            <motion.h1 {...fadeUp(0.08)} style={{
              fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(36px,5vw,64px)',
              fontWeight:800, letterSpacing:'-0.04em', lineHeight:1.05,
              color:C.ink, margin:'0 0 16px',
            }}>
              Borrow USDC<br />Against Bitcoin.
            </motion.h1>

            <motion.p {...fadeUp(0.14)} style={{
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:700,
              fontSize:'clamp(16px,2vw,22px)', color:C.tangerine, marginBottom:16,
              letterSpacing:'-0.01em',
            }}>
              No KYC. Instant Escrow. 100% Non-Custodial.
            </motion.p>

            <motion.p {...fadeUp(0.18)} style={{
              fontSize:16, lineHeight:1.7, color: C.subtle, maxWidth:'52ch', marginBottom:40,
            }}>
              Lock your Bitcoin (cirBTC) into immutable Arc smart contracts to unlock instant USDC liquidity.
              Set your own custom terms, connect peer-to-peer, and repay anytime to reclaim your collateral with zero intermediaries.
            </motion.p>

            <motion.div {...fadeUp(0.22)} style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <button onClick={() => navigate('/deal/new')} style={BTN_PRIMARY}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <span style={{
                  background:'#fff', borderRadius:'50%', width:26, height:26,
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <ArrowRight size={13} color={C.ember} />
                </span>
                Borrow USDC
              </button>
              <button onClick={() => navigate('/marketplace')} style={BTN_GHOST}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.ember; e.currentTarget.style.background = 'rgba(255,138,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              >
                Lend &amp; Earn <ChevronRight size={16} color={C.tangerine} />
              </button>
            </motion.div>
          </div>

          {/* right 3-D canvas */}
          <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }} transition={{ duration:1, ease:[0.22,1,0.36,1] }}
            style={{ width:'100%', aspectRatio:'1/1', borderRadius:32, overflow:'hidden', position:'relative' }}>
            <OrbitalCanvas />
          </motion.div>
        </div>

        {/* stats bar */}
        <motion.div {...fadeUp(0.3)} style={{ maxWidth:1000, margin:'48px auto 0', padding:'0 24px', width:'100%' }}>
          <StatsBar />
        </motion.div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <Section id="how">
        <motion.div {...fadeUp()} style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.ember, letterSpacing:'0.1em', marginBottom:12 }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(28px,4vw,44px)', fontWeight:800, letterSpacing:'-0.03em', margin:0 }}>
            Three steps to USDC liquidity.
          </h2>
        </motion.div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }} className="grid-cols-1 md:grid-cols-3">
          {[
            { n:'01', title:'Pledge Bitcoin Collateral', body:'Deposit cirBTC into an isolated, non-custodial smart contract escrow vault on Arc. You retain ownership rights while collateral stays mathematically locked.', icon:Lock },
            { n:'02', title:'Receive Instant USDC', body:'Borrow capital funded directly by peer lenders. Principal transfers to your wallet in a single atomic transaction.', icon:Zap },
            { n:'03', title:'Repay & Unlock', body:'Repay principal plus fixed interest anytime before maturity. The contract releases your Bitcoin collateral back to your wallet instantly.', icon:ArrowRight },
          ].map((s, i) => (
            <motion.div key={s.n} {...fadeUp(i * 0.1)} className="hover-lift"
              style={{ ...GLASS, padding:32, position:'relative', overflow:'hidden' }}>
              {/* specular sheen */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)' }} />
              <div style={{ fontSize:48, fontWeight:800, color:'rgba(255,138,0,0.12)', fontFamily:"'Space Grotesk',sans-serif", lineHeight:1, marginBottom:20 }}>{s.n}</div>
              <s.icon size={22} color={C.ember} style={{ marginBottom:14 }} />
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18, marginBottom:12, color:C.ink }}>{s.title}</div>
              <div style={{ fontSize:14, lineHeight:1.7, color:C.subtle }}>{s.body}</div>
              {/* amber edge glow on hover handled by hover-lift class */}
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── DUAL DISCOVERY ── */}
      <Section id="borrow" style={{ paddingTop:0 }}>
        <motion.div {...fadeUp()} style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.ember, letterSpacing:'0.1em', marginBottom:12 }}>DEAL DISCOVERY</div>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(26px,3.5vw,40px)', fontWeight:800, letterSpacing:'-0.03em', margin:0 }}>
            Two ways to connect.
          </h2>
        </motion.div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }} className="grid-cols-1 md:grid-cols-2">
          {[
            {
              tag:'PRIVATE',
              title:'Private Deal Link',
              body:'Create a tailored peer-to-peer loan and generate an encrypted, single-use claim link to share privately with your chosen counterparty.',
              cta:'Create Private Deal',
              to:'/deal/new',
              highlight: C.ember,
            },
            {
              tag:'PUBLIC',
              title:'Open Marketplace',
              body:'Publish your loan request to the public orderbook on Arc. Review and accept structured counter-offers from institutional and retail lenders.',
              cta:'Browse Marketplace',
              to:'/marketplace',
              highlight: '#60a5fa',
            },
          ].map((c, i) => (
            <motion.div key={c.tag} {...fadeUp(i * 0.12)} className="hover-lift"
              style={{ ...GLASS, padding:36, position:'relative', overflow:'hidden' }}
              id={i === 1 ? 'lend' : undefined}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${c.highlight}44,transparent)` }} />
              <div style={{ display:'inline-block', fontSize:10, fontWeight:700, color:c.highlight, letterSpacing:'0.1em', background:`${c.highlight}18`, border:`1px solid ${c.highlight}44`, borderRadius:99, padding:'3px 10px', marginBottom:20 }}>{c.tag}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:24, marginBottom:14, color:C.ink }}>{c.title}</div>
              <div style={{ fontSize:15, lineHeight:1.7, color:C.subtle, marginBottom:28 }}>{c.body}</div>
              <button onClick={() => navigate(c.to)} style={{ ...BTN_PRIMARY, fontSize:14, padding:'11px 22px' }}>
                {c.cta} <ArrowRight size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── SECURITY ── */}
      <Section id="security">
        <motion.div {...fadeUp()} style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.ember, letterSpacing:'0.1em', marginBottom:12 }}>SECURITY</div>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(26px,3.5vw,40px)', fontWeight:800, letterSpacing:'-0.03em', margin:0 }}>
            Built to be trustless.
          </h2>
        </motion.div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }} className="grid-cols-1 md:grid-cols-3">
          {[
            { icon:Shield, title:'Non-Custodial Smart Contracts', body:'Zero admin backdoors, zero god-mode operator keys. All state changes governed by math and on-chain events.' },
            { icon:Globe,  title:'Real-Time Oracle Protection', body:'Manipulation-resistant collateral valuation. Liquidation threshold enforced at 80% LTV at all times.' },
            { icon:Zap,    title:'Native Arc Settlement', body:'High throughput and sub-cent gas fees paid in native USDC. Atomic settlement finality on every transaction.' },
          ].map((s, i) => (
            <motion.div key={s.title} {...fadeUp(i * 0.1)} style={{ ...GLASS, padding:28, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }} />
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,138,0,0.12)', border:'1px solid rgba(255,138,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                <s.icon size={20} color={C.ember} />
              </div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:17, marginBottom:10, color:C.ink }}>{s.title}</div>
              <div style={{ fontSize:14, lineHeight:1.7, color:C.subtle }}>{s.body}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'40px 24px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:24 }}>
          {/* network status */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', animation:'pulse 2s infinite', display:'inline-block' }} />
            <span style={{ fontSize:13, color:C.muted }}>Connected to Arc Testnet (Chain ID: 5042002)</span>
          </div>

          {/* links */}
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[
              { label:'Registry',  href:`https://explorer.testnet.arc.io/address/${REGISTRY_ADDRESS}` },
              { label:'GitHub',    href:'https://github.com/MaxCybOps/persat-finance-arc' },
              { label:'Launch App',href:'/marketplace' },
            ].map(l => (
              l.href.startsWith('http')
                ? <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:C.muted, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.tangerine)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                    {l.label} <ExternalLink size={11} />
                  </a>
                : <Link key={l.label} to={l.href} style={{ fontSize:13, color:C.muted, textDecoration:'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.tangerine)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                    {l.label}
                  </Link>
            ))}
          </div>
        </div>
        <div style={{ marginTop:24, fontSize:12, color:'rgba(255,255,255,0.18)', textAlign:'center' }}>
          © 2026 Persat Finance. All smart contracts verified on Arc L1.
        </div>
      </footer>
    </div>
  )
}
