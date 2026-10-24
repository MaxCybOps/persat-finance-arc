import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { REGISTRY_ADDRESS, ESCROW_VAULT_ADDRESS } from '../contracts/addresses'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="bg-background font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col justify-between">
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.5)]"><div className="h-20 max-w-[1280px] mx-auto px-gutter flex items-center justify-between gap-space-md"><div className="flex items-center gap-space-md"><a className="flex items-center gap-space-xs group" onClick={() => navigate("/marketplace")} style={{ cursor: "pointer" }}><span className="material-symbols-outlined text-primary-container group-hover:scale-110 transition-transform">local_fire_department</span><span className="font-headline-md text-headline-md tracking-wider font-bold text-on-surface">PERSAT</span></a><div className="hidden sm:flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container border border-outline-variant/40"><span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">ARC TESTNET LIVE</span></div></div><nav className="hidden xl:flex items-center gap-space-lg" data-active-classes="text-primary font-semibold"><a className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-on-surface transition-colors" href="#how-it-works">How It Works</a><a className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => navigate("/deal/new")} style={{ cursor: "pointer" }}>Direct Deals</a><a aria-current="page" className="uppercase transition-colors text-primary font-semibold" onClick={() => navigate("/marketplace")} style={{ cursor: "pointer" }}>Marketplace</a><a className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-on-surface transition-colors" href="#security">Security &amp; Escrow</a><a className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-on-surface transition-colors" href="https://github.com/MaxCybOps/persat-finance-arc#readme" target="_blank" rel="noopener noreferrer">Docs</a></nav><div className="flex items-center gap-space-md"><a className="relative group inline-flex items-center pl-space-md pr-space-xs py-space-xs rounded-full bg-gradient-to-b from-[#ffaa45] to-primary-container text-on-primary-container font-headline-md text-[13px] font-bold shadow-[0px_4px_24px_rgba(255,138,0,0.35)] hover:shadow-[0px_6px_32px_rgba(255,138,0,0.55)] transition-all" onClick={() => navigate("/marketplace")} style={{ cursor: "pointer" }}><span className="font-label-caps text-label-caps uppercase mr-space-sm text-on-primary-container font-bold tracking-wide">Launch App</span><span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-primary-container shadow-sm group-hover:translate-x-0.5 transition-transform"><span className="material-symbols-outlined text-[16px]">arrow_forward</span></span></a><div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><span className="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div></div></header><main className="w-full pt-20 bg-background flex-1 flex flex-col"><div className="flex flex-col w-full relative overflow-hidden text-on-surface">

<div className="pointer-events-none absolute inset-0 -top-24 flex items-center justify-center overflow-hidden z-0">
<div className="relative w-[1300px] h-[1300px] flex items-center justify-center opacity-75">

<div className="absolute w-[680px] h-[680px] rounded-full bg-primary-container/20 blur-[130px]"></div>
<div className="absolute w-[360px] h-[360px] rounded-full bg-secondary-container/25 blur-[90px]"></div>

<div className="absolute w-[320px] h-[320px] rounded-full border border-primary/20 shadow-[0_0_40px_rgba(255,138,0,0.22)] animate-pulse" style={{ animationDuration: "6s" }}></div>
<div className="absolute w-[490px] h-[490px] rounded-full border border-primary/15 shadow-[0_0_60px_rgba(255,184,107,0.12)]"></div>
<div className="absolute w-[680px] h-[680px] rounded-full border border-primary/10"></div>
<div className="absolute w-[900px] h-[900px] rounded-full border border-primary/5"></div>
<div className="absolute w-[1140px] h-[1140px] rounded-full border border-outline-variant/30"></div>
</div>
</div>

<section className="relative z-10 w-full max-w-[1280px] mx-auto px-gutter pt-8 pb-16 flex flex-col items-center text-center">

<div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high/70 backdrop-blur-md border border-primary-container/30 shadow-[0_0_20px_rgba(255,138,0,0.15)] mb-space-lg">
<span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
<span className="font-label-caps text-label-caps tracking-widest text-primary uppercase">PEER-TO-PEER BITCOIN LENDING • NON-CUSTODIAL ESCROW</span>
</div>

<h1 className="font-display-hero text-display-hero md:text-[68px] md:leading-[1.1] max-w-4xl tracking-tight text-on-surface uppercase font-bold drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
      WHAT IF YOU COULD <br className="hidden sm:inline"/>
<span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-primary-fixed to-primary">LEND AND BORROW</span> <br className="hidden sm:inline"/>
      FROM ANYONE?
    </h1>

<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-space-md mb-space-xl">
      Infrastructure for a world where anyone can lend to anyone, secured by digital assets and enforced by smart contracts—starting with Bitcoin.
    </p>

<div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-space-md mb-space-xl text-left">

<div className="relative group p-space-lg rounded-lg bg-surface-container-low/85 backdrop-blur-xl border border-outline-variant/40 hover:border-primary-container/60 transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between">
<div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-primary-container/80 to-transparent"></div>
<div>
<div className="flex items-center justify-between mb-space-sm">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary-container text-[20px]">link</span>
<span className="font-label-caps text-label-caps uppercase text-primary tracking-wider">Direct Path</span>
</div>
<span className="font-label-data-mono text-label-data-mono text-outline">P2P Link</span>
</div>
<h3 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Create a Direct Deal</h3>
<p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
            I already have a counterparty. Generate an encrypted, single-use private deal link with atomic settlement.
          </p>
</div>
<a className="group/btn relative inline-flex items-center justify-between w-full px-space-md py-space-sm rounded-full bg-gradient-to-b from-[#ffaa45] to-primary-container text-on-primary-container font-headline-md text-[13px] font-bold shadow-[0_4px_24px_rgba(255,138,0,0.35)] hover:shadow-[0_6px_32px_rgba(255,138,0,0.55)] transition-all" onClick={() => navigate("/deal/new")} style={{ cursor: "pointer" }}>
<span className="font-label-caps text-label-caps uppercase tracking-wide">Create Direct Deal</span>
<span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-primary-container shadow-sm group-hover/btn:translate-x-1 transition-transform">
<span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</span>
</a>
</div>

<div className="relative group p-space-lg rounded-lg bg-surface-container-low/85 backdrop-blur-xl border border-outline-variant/40 hover:border-secondary/60 transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between">
<div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-secondary/70 to-transparent"></div>
<div>
<div className="flex items-center justify-between mb-space-sm">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-secondary text-[20px]">hub</span>
<span className="font-label-caps text-label-caps uppercase text-secondary tracking-wider">Public Pool</span>
</div>
<span className="font-label-data-mono text-label-data-mono text-outline">Open Books</span>
</div>
<h3 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Open Marketplace</h3>
<p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
            Browse verified community requests or post structured, non-negotiable lending terms to match peer liquidity.
          </p>
</div>
<a className="group/btn inline-flex items-center justify-between w-full px-space-md py-space-sm rounded-full bg-surface-container-highest/90 hover:bg-surface-bright text-on-surface font-headline-md text-[13px] font-semibold border border-outline-variant/40 transition-all" onClick={() => navigate("/marketplace")} style={{ cursor: "pointer" }}>
<span className="font-label-caps text-label-caps uppercase tracking-wide">Explore Marketplace</span>
<span className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-primary shadow-sm group-hover/btn:translate-x-1 transition-transform">
<span className="material-symbols-outlined text-[14px]">arrow_forward</span>
</span>
</a>
</div>
</div>

<div className="w-full grid grid-cols-1 md:grid-cols-12 gap-space-md items-center">

<div className="md:col-span-4 rounded-lg bg-surface-container-low/90 backdrop-blur-2xl border border-outline-variant/30 p-space-md shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-left relative overflow-hidden">
<div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20 mb-space-sm">
<span className="font-label-caps text-label-caps uppercase text-on-surface tracking-widest font-bold">MARKETS</span>
<a className="font-label-caps text-label-caps text-primary uppercase text-[10px] hover:underline" onClick={() => navigate("/marketplace")} style={{ cursor: "pointer" }}>SEE ALL</a>
</div>
<div className="flex flex-col gap-space-sm">

<div className="flex items-center justify-between p-space-xs rounded bg-surface-container/60 hover:bg-surface-container transition-colors">
<div className="flex items-center gap-space-xs">
<div className="w-8 h-8 rounded-full bg-[#f7931a]/15 text-[#f7931a] flex items-center justify-center font-bold text-xs">₿</div>
<div>
<div className="font-headline-md text-[13px] text-on-surface leading-none">BTC</div>
<div className="font-label-data-mono text-[10px] text-[#10b981]">+1.6%</div>
</div>
</div>

<svg className="w-16 h-5 stroke-[#10b981]" fill="none" viewBox="0 0 60 20">
<path d="M1 15 L12 12 L22 17 L34 8 L46 11 L58 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
<div className="text-right">
<div className="font-label-data-mono text-[12px] text-on-surface font-semibold">$117,290.50</div>
<div className="font-body-sm text-[10px] text-outline">$1.29T Cap</div>
</div>
</div>

<div className="flex items-center justify-between p-space-xs rounded bg-surface-container/60 hover:bg-surface-container transition-colors">
<div className="flex items-center gap-space-xs">
<div className="w-8 h-8 rounded-full bg-[#2775ca]/15 text-[#2775ca] flex items-center justify-center font-bold text-xs">$</div>
<div>
<div className="font-headline-md text-[13px] text-on-surface leading-none">USDC</div>
<div className="font-label-data-mono text-[10px] text-[#10b981]">+0.01%</div>
</div>
</div>

<svg className="w-16 h-5 stroke-outline" fill="none" viewBox="0 0 60 20">
<path d="M1 10 L15 10 L25 9.5 L38 10.5 L50 10 L58 10" strokeLinecap="round" strokeWidth="1.5"></path>
</svg>
<div className="text-right">
<div className="font-label-data-mono text-[12px] text-on-surface font-semibold">$1.00</div>
<div className="font-body-sm text-[10px] text-outline">$315B Supply</div>
</div>
</div>

<div className="flex items-center justify-between p-space-xs rounded bg-surface-container/60 hover:bg-surface-container transition-colors">
<div className="flex items-center gap-space-xs">
<div className="w-8 h-8 rounded-full bg-[#14f195]/15 text-[#14f195] flex items-center justify-center font-bold text-xs">◎</div>
<div>
<div className="font-headline-md text-[13px] text-on-surface leading-none">ARC</div>
<div className="font-label-data-mono text-[10px] text-[#10b981]">+2.4%</div>
</div>
</div>

<svg className="w-16 h-5 stroke-[#10b981]" fill="none" viewBox="0 0 60 20">
<path d="M1 18 L14 15 L26 12 L36 14 L48 5 L58 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
<div className="text-right">
<div className="font-label-data-mono text-[12px] text-on-surface font-semibold">$214.86</div>
<div className="font-body-sm text-[10px] text-outline">Arc Gas Token</div>
</div>
</div>
</div>
</div>

<div className="md:col-span-4 rounded-xl bg-surface-container-lowest/95 backdrop-blur-2xl border border-primary/25 p-space-md shadow-[0_20px_50px_rgba(255,138,0,0.18)] text-left relative">
<div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20 mb-space-md">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-outline text-[18px]">menu</span>
<span className="font-label-caps text-label-caps text-on-surface font-bold">PORTFOLIO</span>
</div>
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary-container text-[18px]">card_giftcard</span>
<span className="material-symbols-outlined text-outline text-[18px]">notifications</span>
</div>
</div>

<div className="flex items-center justify-between p-1 rounded-full bg-surface-container mb-space-md border border-outline-variant/30">
<button className="px-space-sm py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-caps text-label-caps font-bold">Home</button>
<button className="px-space-sm py-0.5 rounded-full text-on-surface-variant font-label-caps text-label-caps">Borrow</button>
<button className="px-space-sm py-0.5 rounded-full text-on-surface-variant font-label-caps text-label-caps">Lend</button>
<button className="px-space-sm py-0.5 rounded-full text-on-surface-variant font-label-caps text-label-caps">Vote</button>
</div>

<div className="mb-space-md">
<div className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">Net Escrow Value</div>
<div className="flex items-baseline gap-space-xs">
<span className="font-headline-lg text-headline-lg font-bold text-on-surface">$84,320.55</span>
<span className="font-label-data-mono text-label-data-mono text-outline">USD</span>
</div>
</div>

<div className="relative w-full h-24 mb-space-sm">
<svg className="w-full h-full overflow-visible" fill="none" viewBox="0 0 280 80">
<defs>
<lineargradient id="curveGradient" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stopColor="#ff8a00" stopOpacity="0.35"></stop>
<stop offset="100%" stopColor="#ff8a00" stopOpacity="0.0"></stop>
</lineargradient>
</defs>
<path d="M0 60 Q 30 10, 70 45 T 140 30 T 210 65 T 280 15 L 280 80 L 0 80 Z" fill="url(#curveGradient)"></path>
<path d="M0 60 Q 30 10, 70 45 T 140 30 T 210 65 T 280 15" fill="none" stroke="#ffb77f" strokeWidth="2.5"></path>

<circle className="filter drop-shadow-[0_0_8px_#ff8a00]" cx="210" cy="65" fill="#ffffff" r="4.5"></circle>
</svg>
</div>
<div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/20 font-body-sm text-body-sm">
<span className="text-on-surface-variant">Collateral Yield</span>
<span className="font-label-data-mono text-[#10b981] font-semibold">+$1,240.49 (+4.2%)</span>
</div>
</div>

<div className="md:col-span-4 rounded-lg bg-surface-container-low/90 backdrop-blur-2xl border border-outline-variant/30 p-space-md shadow-[0_16px_40px_rgba(0,0,0,0.7)] text-left relative">
<div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20 mb-space-sm">
<span className="font-label-caps text-label-caps uppercase text-on-surface tracking-widest font-bold">LOAN AGREEMENT</span>
<span className="material-symbols-outlined text-outline text-[16px]">fullscreen</span>
</div>
<div className="flex items-center justify-between mb-space-md">
<span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-data-mono text-[11px] font-semibold border border-outline-variant/30">BTC : USDC</span>
<div className="font-label-data-mono text-[11px] text-on-surface-variant">
            Fixed Rate: <span className="text-primary font-bold">8.20% APR</span>
</div>
</div>

<div className="p-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/40 mb-space-xs flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="w-6 h-6 rounded-full bg-[#f7931a] text-black font-bold flex items-center justify-center text-[10px]">₿</span>
<span className="font-headline-md text-[13px] text-on-surface">BTC</span>
<span className="material-symbols-outlined text-outline text-[16px]">expand_more</span>
</div>
<div className="text-right">
<div className="font-label-data-mono text-[14px] text-on-surface font-bold">1.250</div>
<div className="font-body-sm text-[10px] text-outline">≈ $146,613.12</div>
</div>
</div>

<div className="flex justify-center -my-2 relative z-10">
<div className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-primary shadow-sm">
<span className="material-symbols-outlined text-[13px]">swap_vert</span>
</div>
</div>

<div className="p-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/40 mb-space-md flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="w-6 h-6 rounded-full bg-[#2775ca] text-white font-bold flex items-center justify-center text-[10px]">$</span>
<span className="font-headline-md text-[13px] text-on-surface">USDC</span>
</div>
<div className="text-right">
<div className="font-label-data-mono text-[14px] text-primary font-bold">24,375.10</div>
<div className="font-body-sm text-[10px] text-outline">LTV: 16.6% (Safe)</div>
</div>
</div>
<button className="w-full py-2 rounded-full bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-on-surface font-label-caps text-label-caps uppercase font-bold border border-outline-variant/40 transition-colors">
          Lock &amp; Issue Escrow
        </button>
</div>
</div>
</section>

<section className="w-full bg-surface-container-lowest/80 border-y border-outline-variant/30 py-space-md relative z-10 backdrop-blur-xl">
<div className="max-w-[1280px] mx-auto px-gutter grid grid-cols-2 lg:grid-cols-4 gap-space-md">

<div className="flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container">
<span className="material-symbols-outlined text-[20px]">verified_user</span>
</div>
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Escrow Value</div>
<div className="font-headline-md text-headline-md text-on-surface font-bold">$1,420,000+ <span className="font-label-data-mono text-body-sm text-primary">USDC</span></div>
</div>
</div>

<div className="flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-secondary-container/15 flex items-center justify-center text-secondary">
<span className="material-symbols-outlined text-[20px]">handshake</span>
</div>
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Escrow Deals</div>
<div className="font-headline-md text-headline-md text-on-surface font-bold">54 <span className="font-label-data-mono text-body-sm text-outline">Contracts</span></div>
</div>
</div>

<div className="flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-[#10b981]/15 flex items-center justify-center text-[#10b981]">
<span className="material-symbols-outlined text-[20px]">candlestick_chart</span>
</div>
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant uppercase">Collateral Health</div>
<div className="font-headline-md text-headline-md text-[#10b981] font-bold">135% <span className="font-label-data-mono text-body-sm text-outline">Pyth BTC</span></div>
</div>
</div>

<div className="flex items-center gap-space-sm">
<div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[20px]">bolt</span>
</div>
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant uppercase">Settlement Engine</div>
<div className="font-headline-md text-headline-md text-on-surface font-bold">&lt; 400ms <span className="font-label-data-mono text-body-sm text-outline">Arc L1 Finality</span></div>
</div>
</div>
</div>
</section>

<section className="w-full max-w-[1280px] mx-auto px-gutter py-space-xl relative z-10">
<div className="text-center max-w-2xl mx-auto mb-space-xl">
<div className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-space-xs">Flexible Counterparty Discovery</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Two Distinct Ways to Lend &amp; Borrow</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
        Whether you have a predetermined partner or want to leverage market-clearing liquidity, Persat automates escrow without intermediaries.
      </p>
</div>
<div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">

<div className="rounded-lg bg-surface-container-low/90 backdrop-blur-xl border border-outline-variant/30 p-space-xl relative overflow-hidden group hover:border-primary-container/40 transition-all">
<div className="w-12 h-12 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container mb-space-md">
<span className="material-symbols-outlined text-[24px]">key</span>
</div>
<span className="font-label-caps text-label-caps uppercase text-primary tracking-wider font-semibold">Path One</span>
<h3 className="font-headline-md text-headline-md text-on-surface font-bold mt-1 mb-space-sm">Private Deal-Link</h3>
<p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
          For when you already know your borrower or lender (a friend, business partner, or DAO colleague). Agree on custom terms in private, generate a single-use claim link, and let our verified smart contracts execute atomic escrow.
        </p>
<ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface mb-space-lg">
<li className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
<span>Zero orderbook footprint — private URL exchange</span>
</li>
<li className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
<span>Encrypted counterparty authorization check on connection</span>
</li>
<li className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
<span>Tamper-proof on-chain collateral lock-up</span>
</li>
</ul>
<div className="p-space-sm rounded bg-surface-container border border-outline-variant/30 flex items-center justify-between font-label-data-mono text-label-data-mono text-outline">
<span>persat.finance/deal#8f9024a...</span>
<span className="text-primary cursor-pointer hover:underline">Copy Link</span>
</div>
</div>

<div className="rounded-lg bg-surface-container-low/90 backdrop-blur-xl border border-outline-variant/30 p-space-xl relative overflow-hidden group hover:border-secondary/40 transition-all">
<div className="w-12 h-12 rounded-full bg-secondary-container/15 flex items-center justify-center text-secondary mb-space-md">
<span className="material-symbols-outlined text-[24px]">storefront</span>
</div>
<span className="font-label-caps text-label-caps uppercase text-secondary tracking-wider font-semibold">Path Two</span>
<h3 className="font-headline-md text-headline-md text-on-surface font-bold mt-1 mb-space-sm">Open Marketplace</h3>
<p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
          For when you need instant liquidity matching. Post your exact collateral-to-borrow parameters or fulfill vetted listings. To eradicate phishing and manipulation, counter-offers are strictly structured parameter updates.
        </p>
<ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface mb-space-lg">
<li className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
<span>Deterministic terms matching without spam chat vectors</span>
</li>
<li className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
<span>Multi-oracle safety valves with automated margin calls</span>
</li>
<li className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
<span>Transparent pool depth with transparent on-chain track records</span>
</li>
</ul>
<div className="p-space-sm rounded bg-surface-container border border-outline-variant/30 flex items-center justify-between font-label-data-mono text-label-data-mono text-outline">
<span>Active Bids Available: 18 Listings</span>
<a className="text-secondary hover:underline" onClick={() => navigate("/marketplace")} style={{ cursor: "pointer" }}>View Book</a>
</div>
</div>
</div>
</section>

<section className="w-full bg-surface-container-lowest/60 border-t border-outline-variant/30 py-space-xl relative z-10">
<div className="max-w-[1280px] mx-auto px-gutter">
<div className="text-center max-w-2xl mx-auto mb-space-xl">
<div className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-space-xs">Zero-Custody Process</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">The Atomic Escrow Mechanism</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
          How smart contracts replace centralized custodians and credit bureaus with deterministic mathematical guarantees.
        </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">

<div className="p-space-lg rounded-lg bg-surface-container-low border border-outline-variant/30 relative flex flex-col justify-between">
<div>
<div className="font-display-hero text-headline-lg text-primary/40 font-bold mb-space-sm">01</div>
<h4 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Pledge Bitcoin Collateral</h4>
<p className="font-body-md text-body-md text-on-surface-variant">
              Deposit native Bitcoin through trust-minimized wrapper primitives (cirBTC or WBTC) into an isolated on-chain escrow program. Persat never has administrative access to your keys.
            </p>
</div>
<div className="mt-space-md pt-space-sm border-t border-outline-variant/20 flex items-center justify-between font-label-data-mono text-[11px] text-outline">
<span>Protocol Bridge</span>
<span className="text-on-surface">cirBTC / WBTC Vault</span>
</div>
</div>

<div className="p-space-lg rounded-lg bg-surface-container-low border border-outline-variant/30 relative flex flex-col justify-between">
<div>
<div className="font-display-hero text-headline-lg text-primary/40 font-bold mb-space-sm">02</div>
<h4 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Receive Instant Stablecoins</h4>
<p className="font-body-md text-body-md text-on-surface-variant">
              Once verified on Arc via Pyth BTC/USD oracles, stablecoins (USDC or USDT) are dispatched immediately from the peer lender to your destination wallet in one atomic block.
            </p>
</div>
<div className="mt-space-md pt-space-sm border-t border-outline-variant/20 flex items-center justify-between font-label-data-mono text-[11px] text-outline">
<span>Execution Speed</span>
<span className="text-primary font-semibold">&lt; 1 Block Finality</span>
</div>
</div>

<div className="p-space-lg rounded-lg bg-surface-container-low border border-outline-variant/30 relative flex flex-col justify-between">
<div>
<div className="font-display-hero text-headline-lg text-primary/40 font-bold mb-space-sm">03</div>
<h4 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Repay &amp; Auto-Unlock</h4>
<p className="font-body-md text-body-md text-on-surface-variant">
              Return the borrowed USDC plus agreed-upon fixed interest prior to expiration. The smart contract automatically unlocks and returns 100% of your collateral.
            </p>
</div>
<div className="mt-space-md pt-space-sm border-t border-outline-variant/20 flex items-center justify-between font-label-data-mono text-[11px] text-outline">
<span>Settlement Output</span>
<span className="text-[#10b981] font-semibold">Immediate Release</span>
</div>
</div>
</div>
</div>
</section>

<section className="w-full max-w-[1280px] mx-auto px-gutter py-space-xl relative z-10">
<div className="text-center max-w-2xl mx-auto mb-space-xl">
<div className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-space-xs">Cryptographic Assurances</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Engineered for Sovereign Safety</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
        Multi-tier architecture built to withstand extreme volatility, bridge stalls, and oracle de-pegging.
      </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">

<div className="p-space-lg rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container transition-colors">
<div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container mb-space-md">
<span className="material-symbols-outlined">alt_route</span>
</div>
<h3 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Multi-Bridge Redundancy</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          Collateral routing is decoupled across both Circle cirBTC and canonical wrapped Bitcoin primitives. If an individual bridge experiences latency or halts, loans continue unaffected on the parallel highway.
        </p>
</div>

<div className="p-space-lg rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container transition-colors">
<div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-space-md">
<span className="material-symbols-outlined">lock_open</span>
</div>
<h3 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Zero Admin Backdoors</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          Contracts operate on strictly immutable bytecode. Neither Persat Labs nor any validator retains god-mode withdrawal keys, emergency freeze abilities, or unilateral liquidation overrides.
        </p>
</div>

<div className="p-space-lg rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container transition-colors">
<div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-[#10b981] mb-space-md">
<span className="material-symbols-outlined">query_stats</span>
</div>
<h3 className="font-title-sm text-title-sm text-on-surface font-semibold mb-space-xs">Pyth High-Freq Oracle</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          Price validation updates sub-second using Pyth Network's institutional confidence feeds with embedded volatility buffer zones, eliminating flash-crash false liquidations.
        </p>
</div>
</div>
</section>

<section className="w-full bg-surface-container-lowest/80 border-t border-outline-variant/30 py-space-xl relative z-10">
<div className="max-w-[1280px] mx-auto px-gutter">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
<div className="lg:col-span-5">
<span className="font-label-caps text-label-caps uppercase text-primary tracking-widest font-semibold">Reputation Passport</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-space-xs mb-space-md">
            Trust Formed by Math, <br/>Not Testimonials.
          </h2>
<p className="font-body-lg text-body-lg text-on-surface-variant mb-space-md">
            Real on-chain repayment history tied directly to cryptographic public keys—no fake user reviews, no curated ratings, no manipulated profiles.
          </p>
<div className="space-y-space-sm font-body-md text-body-md text-on-surface-variant">
<div className="flex items-start gap-space-xs">
<span className="material-symbols-outlined text-[#10b981] text-[20px] mt-0.5">verified</span>
<span>All historical escrows verified against Arc block explorers</span>
</div>
<div className="flex items-start gap-space-xs">
<span className="material-symbols-outlined text-[#10b981] text-[20px] mt-0.5">verified</span>
<span>Borrowers build deterministic interest discounts with 100% on-time record</span>
</div>
</div>
</div>

<div className="lg:col-span-7 rounded-xl bg-surface-container-low/90 backdrop-blur-2xl border border-outline-variant/40 p-space-lg shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
<div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md border-b border-outline-variant/20 gap-space-sm">
<div className="flex items-center gap-space-sm">
<div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-container p-0.5">
<div className="w-full h-full rounded-full bg-surface-container-lowest flex items-center justify-center font-label-data-mono text-primary font-bold">
                  8xK
                </div>
</div>
<div>
<div className="flex items-center gap-space-xs">
<span className="font-label-data-mono text-label-data-mono text-on-surface font-bold">8xK4...9qL2</span>
<span className="px-1.5 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] font-label-caps text-[10px] font-bold">PROVEN LENDER</span>
</div>
<div className="font-body-sm text-body-sm text-outline">First Active: Block #249,112,040</div>
</div>
</div>
<div className="flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container border border-outline-variant/40">
<span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
<span className="font-label-caps text-label-caps text-on-surface uppercase">Score: 99.4 Tier-1</span>
</div>
</div>

<div className="grid grid-cols-3 gap-space-md py-space-md">
<div>
<div className="font-label-caps text-label-caps text-outline uppercase">Deals Completed</div>
<div className="font-headline-md text-headline-md text-on-surface font-bold">4 Loans</div>
<div className="font-body-sm text-[11px] text-[#10b981]">0 Defaults</div>
</div>
<div>
<div className="font-label-caps text-label-caps text-outline uppercase">Repay Rate</div>
<div className="font-headline-md text-headline-md text-primary font-bold">100.0%</div>
<div className="font-body-sm text-[11px] text-on-surface-variant">On-Time Execution</div>
</div>
<div>
<div className="font-label-caps text-label-caps text-outline uppercase">Settled Volume</div>
<div className="font-headline-md text-headline-md text-on-surface font-bold">12.4 BTC</div>
<div className="font-body-sm text-[11px] text-outline">≈ $1.45M USD</div>
</div>
</div>

<div className="p-space-xs rounded bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between font-label-data-mono text-[11px]">
<span className="text-outline">Last Transaction: 3.1 BTC Collateral Release</span>
<span className="text-primary hover:underline cursor-pointer">Tx: #92b9f...d4</span>
</div>
</div>
</div>
</div>
</section>

<section className="w-full max-w-[1280px] mx-auto px-gutter py-24 text-center relative z-10">
<div className="relative p-space-xl rounded-xl bg-gradient-to-b from-surface-container-high/60 to-surface-container-lowest border border-outline-variant/40 shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden">

<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-container/15 rounded-full blur-[100px] pointer-events-none"></div>
<div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
<span className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-space-xs">Ready to Experience True Disintermediation?</span>
<h2 className="font-display-hero text-headline-lg md:text-display-hero text-on-surface font-bold mb-space-md">
          Start Lending on Your Own Terms.
        </h2>
<p className="font-body-lg text-body-lg text-on-surface-variant mb-space-xl">
          Connect your Web3 wallet to issue a direct private loan link or match with peer lenders across the globe with zero custody.
        </p>
<div className="flex flex-col sm:flex-row items-center gap-space-md">
<a className="group relative inline-flex items-center pl-space-lg pr-space-xs py-space-xs rounded-full bg-gradient-to-b from-[#ffaa45] to-primary-container text-on-primary-container font-headline-md text-[14px] font-bold shadow-[0px_4px_28px_rgba(255,138,0,0.45)] hover:shadow-[0px_6px_36px_rgba(255,138,0,0.65)] transition-all" onClick={() => navigate("/marketplace")} style={{ cursor: "pointer" }}>
<span className="font-label-caps text-label-caps uppercase mr-space-md text-on-primary-container font-bold tracking-wide">Launch App Now</span>
<span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-container shadow-sm group-hover:translate-x-1 transition-transform">
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</span>
</a>
<a className="inline-flex items-center px-space-lg py-3 rounded-full bg-surface-container border border-outline-variant/40 text-on-surface font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-bright transition-colors" href="https://github.com/MaxCybOps/persat-finance-arc#readme" target="_blank" rel="noopener noreferrer">
            Read Whitepaper &amp; Docs
          </a>
</div>
</div>
</div>
</section>
</div></main><footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30"><div className="max-w-[1280px] mx-auto px-gutter py-space-xl flex flex-col gap-space-lg"><div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border-b border-outline-variant/20 pb-space-lg"><div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-low border border-outline-variant/40"><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span></span><span className="font-label-data-mono text-label-data-mono text-on-surface">Connected to Arc Testnet (Chain ID: 5042002)</span></div><div className="flex flex-wrap items-center gap-x-space-lg gap-y-space-xs"><a className="font-label-data-mono text-label-data-mono text-on-surface-variant hover:text-primary transition-colors" href={`https://explorer.testnet.arc.io/address/${REGISTRY_ADDRESS}`} target="_blank" rel="noopener noreferrer">Deal Registry</a><a className="font-label-data-mono text-label-data-mono text-on-surface-variant hover:text-primary transition-colors" href={`https://explorer.testnet.arc.io/address/${REGISTRY_ADDRESS}`} target="_blank" rel="noopener noreferrer">Whitelist Contract</a><a className="font-label-data-mono text-label-data-mono text-on-surface-variant hover:text-primary transition-colors" href={`https://explorer.testnet.arc.io/address/${ESCROW_VAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer">Escrow Vault</a><a className="font-label-data-mono text-label-data-mono text-on-surface-variant hover:text-primary transition-colors" href="https://github.com/MaxCybOps/persat-finance-arc" target="_blank" rel="noopener noreferrer">GitHub</a><a className="font-label-data-mono text-label-data-mono text-on-surface-variant hover:text-primary transition-colors" href="https://github.com/MaxCybOps/persat-finance-arc#readme" target="_blank" rel="noopener noreferrer">Docs</a><a className="font-label-data-mono text-label-data-mono text-on-surface-variant hover:text-primary transition-colors" href="https://t.me" target="_blank" rel="noopener noreferrer">Telegram</a><a className="font-label-data-mono text-label-data-mono text-on-surface-variant hover:text-primary transition-colors" href="https://x.com" target="_blank" rel="noopener noreferrer">X (Twitter)</a></div></div><div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm font-body-sm text-body-sm text-on-surface-variant"><p>© 2026 Persat Finance. Built by Persat Labs Limited.</p><p className="font-label-data-mono text-label-data-mono text-outline">Zero-Latency Institutional Escrow Protocol</p></div></div></footer>
    </div>
  )
}
