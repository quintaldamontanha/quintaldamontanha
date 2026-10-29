import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import ProductsPage from './ProductsPage'
import ReservationsPage from './ReservationsPage'
import logoBranco from './assets/logo-branco.png'
import { Plus, Search, Mail } from 'lucide-react'

const ADMIN_EMAIL = 'quintaldamontanha@gmail.com'
const money = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const today = () => new Date().toISOString().slice(0, 10)
type Row = Record<string, any>

function QuintalVegetation() {
  const trees = Array.from({ length: 33 }, (_, i) => ({
    x: i * 53 - 48, y: 580 + Math.sin(i * 2.7) * 48,
    size: .8 + (Math.sin(i * 5.1) + 1) * .35,
  }))
  return (
    <div className="quintal-forest" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="forest-sky" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#10160f" /><stop offset=".5" stopColor="#38442e" /><stop offset="1" stopColor="#738057" />
          </linearGradient>
          <radialGradient id="forest-light"><stop stopColor="#d8d2a2" stopOpacity=".18" /><stop offset="1" stopColor="#c5c59a" stopOpacity="0" /></radialGradient>
          <g id="quintal-tree">
            <path d="M0 65 Q-5-40 3-188M1-78L-37-126M2-111L40-166" fill="none" stroke="currentColor" strokeWidth="8" />
            <ellipse cx="1" cy="-184" rx="45" ry="64" fill="currentColor" />
            <ellipse cx="-33" cy="-139" rx="43" ry="50" fill="currentColor" />
            <ellipse cx="34" cy="-145" rx="43" ry="56" fill="currentColor" />
          </g>
          <g id="quintal-fern" fill="currentColor">
            <path d="M0 0Q-18-92-74-164Q-28-129 0-16Q28-129 74-164Q18-92 0 0" />
            {Array.from({ length: 7 }, (_, i) => {
              const y = -22 - i * 17, x = 3 + i * 6
              return <g key={i}><path d={`M${-x} ${y} Q${-x-72+i*5} ${y-44} ${-x-45} ${y+1} Q${-x-18} ${y+11} ${-x} ${y}`} /><path d={`M${x} ${y} Q${x+72-i*5} ${y-44} ${x+45} ${y+1} Q${x+18} ${y+11} ${x} ${y}`} /></g>
            })}
          </g>
        </defs>
        <path fill="url(#forest-sky)" d="M0 0h1600v900H0z" />
        <ellipse cx="800" cy="425" rx="680" ry="480" fill="url(#forest-light)" />
        <g color="#44563b" opacity=".85">{trees.map((tree, i) => <use key={i} href="#quintal-tree" transform={`translate(${tree.x} ${tree.y}) scale(${tree.size})`} />)}</g>
        <path d="M0 646Q300 583 572 627T1094 629T1600 611V900H0Z" fill="#6d7750" />
        <path d="M0 735Q366 654 800 703T1600 689V900H0Z" fill="#72764c" />
        <g color="#283d2b">{[-80, 30, 150, 1460, 1580, 1670].map((x, i) => <g key={x} transform={`translate(${x} 690) scale(2.4)`}><g className="forest-tree-sway" style={{ animationDelay: `${-i * 1.8}s` }}><use href="#quintal-tree" /></g></g>)}</g>
      </svg>
    </div>
  )
}

function QuintalSwing({ label }: { label: string }) {
  const seatRef = useRef<SVGGElement>(null)
  const leftRef = useRef<SVGPathElement>(null)
  const rightRef = useRef<SVGPathElement>(null)
  const pushRef = useRef<() => void>(() => {})

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let previous = 0
    let position = 0
    let velocity = 0
    let breeze = 0
    const paint = () => {
      const x = Math.sin(position + breeze) * 110
      const y = (1 - Math.cos(position + breeze)) * -150
      seatRef.current?.setAttribute('transform', `translate(${x} ${y})`)
      leftRef.current?.setAttribute('d', `M268 110 L${268 + x} ${453 + y}`)
      rightRef.current?.setAttribute('d', `M632 110 L${632 + x} ${445 + y}`)
    }
    const tick = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 16.667, 2) : 1
      previous = time
      velocity += (-position * .009 - velocity * .025) * dt
      position += velocity * dt
      breeze = Math.sin(time * .0011) * .045
      paint()
      frame = requestAnimationFrame(tick)
    }
    pushRef.current = () => {
      if (preference.matches) return
      velocity = Math.max(-.035, Math.min(.035, velocity + (position > 0 ? -.022 : .022)))
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const syncMotion = () => {
      cancelAnimationFrame(frame)
      frame = 0; previous = 0; position = 0; velocity = 0; breeze = 0; paint()
      if (!preference.matches) frame = requestAnimationFrame(tick)
    }
    syncMotion()
    preference.addEventListener('change', syncMotion)
    return () => {
      cancelAnimationFrame(frame)
      preference.removeEventListener('change', syncMotion)
      pushRef.current = () => {}
    }
  }, [])

  return (
    <button className="quintal-swing" type="button" aria-label={label}
      onPointerEnter={event => { if (event.pointerType === 'mouse') pushRef.current() }}
      onClick={() => pushRef.current()}>
      <svg viewBox="0 0 900 550" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="quintal-wood" x1="0" x2="1">
            <stop stopColor="#352619" /><stop offset=".25" stopColor="#9b8058" />
            <stop offset=".5" stopColor="#6d5437" /><stop offset=".78" stopColor="#a88d62" /><stop offset="1" stopColor="#392b1c" />
          </linearGradient>
          <linearGradient id="quintal-seat" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#c0a77c" /><stop offset="1" stopColor="#80613e" />
          </linearGradient>

        </defs>
        <ellipse cx="450" cy="511" rx="231" ry="15" fill="#000" opacity=".23" />
        <g fill="url(#quintal-wood)" stroke="#463421" strokeWidth="2">
          <path d="M201 96 Q214 89 233 94 L224 507 Q213 518 192 508Z" />
          <path d="M664 92 Q684 87 697 97 L706 505 Q686 515 675 507Z" />
          <path d="M171 76 Q442 63 728 77 L732 112 Q456 103 173 113Z" />
        </g>
        <g stroke="#302f29" strokeWidth="9" fill="none">
          <path d="M212 76 L212 111" /><path d="M687 76 L687 112" />
          <path d="M268 85 L268 111" /><path d="M632 85 L632 111" />
        </g>
        <g stroke="#8d8b7c" strokeWidth="4" fill="none">
          <path d="M425 110V142M477 110V142M427 236V258M475 236V258" />
        </g>
        <path d="M450 131 L494 153 L509 196 L484 237 L450 251 L411 232 L394 192 L410 151Z" fill="#a39270" stroke="#544635" strokeWidth="5" />
        <path d="M450 142 L486 161 L496 194 L477 227 L450 238 L420 223 L407 192 L421 160Z" fill="#343c2e" />
        <g fill="none" stroke="#e9dfc5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="450" cy="172" r="11" />
          <path d="M450 151v-5M433 155l-4-4M467 155l4-4M427 172h-5M473 172h5M419 210l23-25 27 31M452 199l18-18 20 24M438 206v18h17v-18Z" />
        </g>
        <path d="M384 258 L516 255 L519 300 L383 304Z" fill="#3c3022" stroke="#b49b70" strokeWidth="2" />
        <g fill="#e9dfc5" textAnchor="middle" fontFamily="Georgia,serif" fontSize="16">
          <text x="451" y="276">QUINTAL DA</text><text x="451" y="295">MONTANHA</text>
        </g>
        <g fill="none" stroke="#d0c9af" strokeWidth="5" strokeLinecap="round">
          <path ref={leftRef} d="M268 110 L268 453" />
          <path ref={rightRef} d="M632 110 L632 445" />
        </g>
        <g ref={seatRef}>
          <path d="M249 446 Q432 450 646 435 L659 458 Q443 474 247 471Z" fill="url(#quintal-seat)" stroke="#59452e" strokeWidth="2" />
          <path d="M247 471 Q452 475 659 458 L657 472 Q442 490 248 483Z" fill="#62482e" />
          <g stroke="#6a5133" strokeWidth="1.4" opacity=".8"><path d="M273 454Q450 462 630 445M272 461Q443 469 638 452M323 448l7 23M550 444l-3 23" /></g>
        </g>
      </svg>
    </button>
  )
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [info, setInfo] = useState('')
  const welcomeRef = useRef<HTMLDialogElement>(null)
  const infoRef = useRef<HTMLDialogElement>(null)
  useEffect(() => { welcomeRef.current?.showModal() }, [])
  const reserveRef = useRef<HTMLDialogElement>(null)
  const [guestName, setGuestName] = useState('')
  const [guestContact, setGuestContact] = useState('')
  const [reserveBusy, setReserveBusy] = useState(false)
  const [reserveError, setReserveError] = useState('')
  const [reserveSent, setReserveSent] = useState(false)
  const reserveLock = useRef(false)
  const requestId = useRef<string | null>(null)
  const openReserve = () => { setMenuOpen(false); setReserveError(''); reserveRef.current?.showModal() }
  const submitReserve = async (event: FormEvent) => {
    event.preventDefault()
    if (reserveLock.current || reserveSent) return
    const name = guestName.trim(), phone = guestContact.replace(/\D/g, '')
    if (name.length < 2 || phone.length < 10 || phone.length > 13) { setReserveError('Informe seu nome e um telefone com DDD válido.'); return }
    reserveLock.current = true; setReserveBusy(true); setReserveError('')
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {
      const { error } = await supabase.from('reservations').insert({ id: requestId.current, customer_name: name, phone, event_id: '14431ae0-9398-47de-93e8-a49b43e2203d', reservation_date: '2026-10-31', reservation_time: '19:30', party_size: 1, status: 'pending', notes: 'Solicitação pelo site: Jantar Dançante - R$ 90,00 por pessoa.' })
      if (error && error.code !== '23505') throw error
      setReserveSent(true)
    } catch { setReserveError('Não foi possível enviar sua solicitação. Tente novamente. Seus dados continuam preenchidos.') }
    finally { setReserveBusy(false); reserveLock.current = false }
  }
  const openInfo = (name: string) => { setMenuOpen(false); if (name === 'Reservas') { openReserve(); return }; if (name === 'Eventos') { document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' }); return }; setInfo(name); infoRef.current?.showModal() }
  return (
    <main className="construction">
      <style>{`
.construction{padding-top:120px!important;position:relative;isolation:isolate;min-height:100svh;overflow:hidden;background:#263323;color:#f4ead5;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 18px 40px;text-align:center}
.construction .quintal-forest{position:absolute;inset:0;z-index:-2;pointer-events:none}
.construction .quintal-forest>svg{width:100%;height:100%;position:absolute;inset:0}
.construction::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(#10160f44,transparent 65%,#10160f55)}
.construction-logo{display:block;width:clamp(145px,20vw,210px);height:auto;margin:0 auto 12px}
.construction .quintal-swing{display:block;width:min(760px,100%);padding:0;margin:0;border:0;background:transparent;cursor:pointer;filter:drop-shadow(0 16px 16px #0004);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.construction .quintal-swing svg{display:block;width:100%;height:auto;overflow:visible}
.construction .quintal-swing:focus-visible{outline:2px solid #fff;outline-offset:5px;border-radius:10px}
.construction h1{font:400 clamp(30px,4.5vw,54px)/1.2 Georgia,serif;letter-spacing:-.02em;margin:8px 0 14px;text-shadow:0 2px 16px #102015}
.construction-hint{margin:0;color:#f0e8d1;font:12px/1.6 system-ui,sans-serif;letter-spacing:.08em}
.forest-tree-sway{transform-origin:0 60px;animation:construction-breeze 8s ease-in-out infinite alternate}
@keyframes construction-breeze{from{transform:rotate(-1deg)}to{transform:rotate(1deg)}}
@media(max-width:600px){.construction{padding:36px 12px;justify-content:center}.construction .quintal-swing{width:145%;max-width:620px;flex-shrink:0;margin:20px -22.5%}.construction-logo{width:170px}.construction h1{margin-top:24px}}
@media(prefers-reduced-motion:reduce){.construction .forest-tree-sway{animation:none}}

.home-header{position:fixed;top:0;left:0;right:0;z-index:30;height:90px;background:#4b2c20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 24px;box-shadow:0 2px 15px #0002}.home-brand img{width:135px;height:80px;object-fit:contain}.home-menu-toggle{justify-self:start;background:none;border:0;color:#f4ead5;font-size:25px;padding:12px;cursor:pointer}.home-menu-link{justify-self:end;color:#f4ead5;border:1px solid #d7b56d60;border-radius:24px;padding:10px 15px;font:12px Arial,sans-serif}.home-menu{position:absolute;top:100%;left:0;right:0;background:#4b2c20;padding:10px 24px 20px;display:grid}.home-menu button{padding:16px 10px;text-align:left;background:none;color:#f4ead5;border:0;border-bottom:1px solid #ffffff20;font:15px Arial,sans-serif;cursor:pointer}.home-dialog{position:fixed;padding:0;border:1px solid #d7b56d70;border-radius:20px;width:min(440px,calc(100% - 32px));max-height:90dvh;overflow:auto;background:#f6f2e9;color:#4b2c20;text-align:center;box-shadow:0 25px 90px #0005}.home-dialog::backdrop{background:#10160fa6;backdrop-filter:blur(5px)}.home-close{position:absolute;right:14px;top:14px;width:34px;height:34px;border-radius:50%;border:1px solid #ffffff60;background:#ffffff20;color:#fff;font-size:25px;cursor:pointer}.home-welcome-logo{background:#4b2c20;padding:20px}.home-welcome-logo img{width:210px;height:145px;object-fit:contain}.home-dialog-copy{padding:35px 26px 28px}.home-dialog-copy small{font:9px Arial,sans-serif;letter-spacing:2px;color:#997345}.home-dialog-copy h2{font:30px/1.2 Georgia,serif;margin:20px 0}.home-dialog-copy h2 em{color:#aa742f}.home-dialog-copy p{font:13px/1.7 Arial,sans-serif;color:#8b796e}.home-dialog-copy>button{background:#4b2c20;color:#fff4df;border:0;border-radius:10px;padding:15px;width:100%;margin-top:15px;font:13px Arial,sans-serif;cursor:pointer}.info-close{color:#4b2c20;border-color:#d7c6b4}.construction>.construction-logo{display:none}@media(max-width:600px){.home-header{height:80px;padding:0 12px}.home-brand img{width:125px;height:70px}.home-menu-link{font-size:10px;padding:9px 12px}.home-dialog-copy h2{font-size:27px}}

.home-events{width:min(880px,100%);margin:40px auto 10px;scroll-margin-top:110px}.event-eyebrow{font:10px Arial,sans-serif;letter-spacing:2px;color:#d7b56d}.construction .home-events h1{font-size:32px;margin:12px 0 24px}.dinner-card{display:grid;grid-template-columns:190px 1fr;border:1px solid #d7b56d70;border-radius:20px;background:#f6f2e9;color:#4b2c20;overflow:hidden;text-align:left;box-shadow:0 20px 45px #0003}.event-date{display:flex;flex-direction:column;justify-content:center;align-items:center;background:#4b2c20;color:#e9ce99;padding:30px}.event-date strong{font:76px Georgia,serif}.event-date span{font:10px Arial,sans-serif;letter-spacing:2px;margin-top:10px}.event-details{padding:30px}.event-details .event-eyebrow{color:#a57637}.event-details h2{font:32px Georgia,serif;margin:12px 0}.event-details p{font:14px/1.6 Arial,sans-serif;color:#8b796e}.event-price{font:28px Georgia,serif;margin:20px 0}.event-price small{font:12px Arial,sans-serif;color:#8b796e}.event-reserve,.reserve-dialog form>button{width:100%;border:0;background:#4b2c20;color:#fff4df;padding:15px;border-radius:10px;font:14px Arial,sans-serif;cursor:pointer}.reserve-dialog label{display:grid;text-align:left;gap:7px;margin:15px 0;font:13px Arial,sans-serif}.reserve-dialog input{width:100%;padding:13px;border:1px solid #d9cbbb;border-radius:9px;background:white;color:#4b2c20;font:16px Arial,sans-serif}.reserve-dialog .reserve-note{font-size:11px;text-align:left}.reserve-dialog .reserve-error{color:#9e3024;background:#f9e4db;padding:10px;border-radius:8px}.reserve-dialog button:disabled{opacity:.6;cursor:wait}.reserve-dialog .home-dialog-copy{padding-top:42px}@media(max-width:600px){.dinner-card{grid-template-columns:1fr}.event-date{padding:18px;flex-direction:row;gap:18px}.event-date strong{font-size:48px}.event-date span{margin:0}.event-details{padding:25px}.event-details h2{font-size:30px}.home-events{margin-top:30px}}
.home-contact-links{display:grid;gap:12px;margin:24px 0;text-align:left}.home-contact-links a{display:flex;align-items:center;gap:12px;border:1px solid #decdb8;padding:15px 12px;border-radius:12px;color:#4b2c20;font:13px Arial,sans-serif}.home-contact-links a:first-child{background:#e5f1e6;border-color:#c8ddcc;color:#21683a}.home-contact-links strong,.home-contact-links small{display:block;letter-spacing:0}.home-contact-links small{font:11px Arial,sans-serif;margin-top:5px;color:inherit;overflow-wrap:anywhere}.home-contact-links svg{flex-shrink:0}
`}</style>
      <header className="home-header">
        <button className="home-menu-toggle" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <a href="/" className="home-brand"><img src={logoBranco} alt="Quintal da Montanha" /></a>
        <a href="/cardapio" className="home-menu-link">Cardápio</a>
        {menuOpen && <nav className="home-menu">{['Eventos', 'Reservas', 'Contato'].map(name => <button key={name} onClick={() => openInfo(name)}>{name}</button>)}</nav>}
      </header>
      <dialog ref={welcomeRef} className="home-dialog" onCancel={() => welcomeRef.current?.close()}>
        <button className="home-close" aria-label="Fechar boas-vindas" onClick={() => welcomeRef.current?.close()}>×</button>
        <div className="home-welcome-logo"><img src={logoBranco} alt="Quintal da Montanha" /></div>
        <div className="home-dialog-copy"><small>CHEGUE MAIS, A CASA É SUA</small><h2>Seja bem-vindo ao<br /><em>Quintal da Montanha!</em></h2><p>Seu lugar para brindar, compartilhar e colecionar bons momentos.</p><button onClick={() => welcomeRef.current?.close()}>Conhecer o Quintal</button></div>
      </dialog>
      <dialog ref={infoRef} className="home-dialog"><button className="home-close info-close" aria-label="Fechar informações" onClick={() => infoRef.current?.close()}>×</button><div className="home-dialog-copy"><small>QUINTAL DA MONTANHA</small><h2>{info}</h2><p>Fale com o Quintal da Montanha.</p><div className="home-contact-links"><a href="https://wa.me/5548996349230" target="_blank" rel="noopener noreferrer" aria-label="Conversar com o Quintal pelo WhatsApp"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7a8.5 8.5 0 1 1 16.3-3.8Z"/><path d="M8.1 7.1c-.5 0-1.1.9-.9 1.8.7 3.3 3.2 5.8 6.4 6.4.9.2 1.8-.5 1.8-1l-2-1.4-.9.9a7 7 0 0 1-3.2-3.2l.9-.9-1.3-2.6Z"/></svg><span><strong>WhatsApp</strong><small>(48) 99634-9230</small></span></a><a href="mailto:quintaldamontanha@gmail.com"><Mail size={24} aria-hidden="true" /><span><strong>E-mail</strong><small>quintaldamontanha@gmail.com</small></span></a></div><button onClick={() => infoRef.current?.close()}>Voltar ao Quintal</button></div></dialog>
      <QuintalVegetation />
      <img className="construction-logo" src={logoBranco} alt="Quintal da Montanha" />
      <QuintalSwing label="Movimentar o balanço do Quintal da Montanha" />
      <p className="construction-hint">Toque no balanço e aproveite a brisa.</p>
      <section className="home-events" id="eventos" aria-labelledby="events-title">
        <p className="event-eyebrow">BONS ENCONTROS NO QUINTAL</p><h1 id="events-title">Próximos eventos</h1>
        <article className="dinner-card"><div className="event-date"><strong>31</strong><span>OUTUBRO · 2026</span></div><div className="event-details"><span className="event-eyebrow">GASTRONOMIA E MÚSICA</span><h2>Jantar Dançante</h2><p>31 de outubro · A partir das 19h30</p><div className="event-price">R$ 90,00 <small>por pessoa</small></div><button className="event-reserve" onClick={openReserve}>Reservar</button></div></article>
      </section>
      <dialog ref={reserveRef} className="home-dialog reserve-dialog" aria-labelledby="reserve-title" onCancel={event => { if (reserveBusy) event.preventDefault() }}>
        <button className="home-close info-close" aria-label="Fechar reserva" disabled={reserveBusy} onClick={() => reserveRef.current?.close()}>×</button>
        <div className="home-dialog-copy"><small>QUINTAL DA MONTANHA</small><h2 id="reserve-title">{reserveSent ? 'Solicitação recebida!' : 'Reserve seu lugar'}</h2>
        {reserveSent ? <><p>Recebemos sua solicitação para o Jantar Dançante. Nossa equipe entrará em contato para confirmar a disponibilidade.</p><button onClick={() => reserveRef.current?.close()}>Fechar</button></> : <><p>Jantar Dançante<br />31/10/2026, a partir das 19h30<br /><strong>R$ 90,00 por pessoa</strong></p><form onSubmit={submitReserve}><label htmlFor="guest-name">Nome<input id="guest-name" autoComplete="name" required minLength={2} maxLength={120} value={guestName} onChange={event => setGuestName(event.target.value)} disabled={reserveBusy} /></label><label htmlFor="guest-contact">Contato (WhatsApp com DDD)<input id="guest-contact" type="tel" autoComplete="tel" inputMode="tel" placeholder="(48) 99999-9999" required maxLength={22} value={guestContact} onChange={event => setGuestContact(event.target.value)} disabled={reserveBusy} /></label><p className="reserve-note">Solicitação para 1 pessoa, sujeita à confirmação da equipe. Usaremos seu contato para tratar desta reserva.</p>{reserveError && <p className="reserve-error" role="alert">{reserveError}</p>}<button type="submit" disabled={reserveBusy}>{reserveBusy ? 'Enviando...' : 'Solicitar reserva'}</button></form></>}
        </div>
      </dialog>
    </main>
  )
}

function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const result = await supabase.auth.signInWithPassword({ email, password })

    if (result.error) setError('E-mail ou senha inválidos.')
    else nav('/admin')

    setBusy(false)
  }

  return (
    <main className="login">
      <form onSubmit={submit}>
        <img
          src="/logo-login.png"
          alt="Quintal da Montanha"
          className="login-logo"
        />

        <label>
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

function Dashboard() {
  const [m, setM] = useState<any>({
    sales: 0,
    total: 0,
    commands: 0,
    reservations: 0,
    low: 0,
  })

  useEffect(() => {
    ;(async () => {
      const start = today() + 'T00:00:00'

      const [s, c, r, p] = await Promise.all([
        supabase
          .from('sales')
          .select('total')
          .gte('created_at', start)
          .eq('status', 'completed'),
        supabase
          .from('commands')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'payment']),
        supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('reservation_date', today()),
        supabase
          .from('products')
          .select('id,minimum_stock,stock(quantity)')
          .eq('active', true)
          .is('deleted_at', null),
      ])

      const rows = s.data || []
      const total = rows.reduce((a: any, x: any) => a + Number(x.total || 0), 0)
      const low = (p.data || []).filter(
        (x: any) =>
          Number(x.stock?.[0]?.quantity || 0) <= Number(x.minimum_stock || 0),
      ).length

      setM({
        sales: rows.length,
        total,
        commands: c.count || 0,
        reservations: r.count || 0,
        low,
      })
    })()
  }, [])

  const avg = m.sales ? m.total / m.sales : 0

  return (
    <>
      <div className="metrics">
        <article>
          <span>Faturamento hoje</span>
          <strong>{money(m.total)}</strong>
          <small>{m.sales} venda(s)</small>
        </article>

        <article>
          <span>Ticket médio</span>
          <strong>{money(avg)}</strong>
          <small>Somente vendas concluídas</small>
        </article>

        <article>
          <span>Comandas abertas</span>
          <strong>{m.commands}</strong>
          <small>Em atendimento/pagamento</small>
        </article>

        <article>
          <span>Reservas hoje</span>
          <strong>{m.reservations}</strong>
          <small>Agenda do dia</small>
        </article>

        <article>
          <span>Estoque baixo</span>
          <strong>{m.low}</strong>
          <small>Itens no mínimo ou abaixo</small>
        </article>
      </div>

    </>
  )
}

function Stock() {
  const [rows, setRows] = useState<Row[]>([])
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState('')
  const [type, setType] = useState('entry')
  const [reason, setReason] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('id,name,minimum_stock,stock(quantity)')
      .eq('active', true)
      .is('deleted_at', null)
      .order('name')

    setRows(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function move(e: FormEvent) {
    e.preventDefault()
    const q = Math.abs(Number(qty))

    const { error } = await supabase.from('stock_movements').insert({
      product_id: product,
      quantity: q,
      type,
      reason,
    })

    if (!error) {
      setQty('')
      setReason('')
      load()
    } else {
      alert(error.message)
    }
  }

  return (
    <div className="grid-two">
      <div className="panel">
        <h2>Movimentar estoque</h2>

        <form className="form-grid" onSubmit={move}>
          <label>
            Produto
            <select
              required
              value={product}
              onChange={e => setProduct(e.target.value)}
            >
              <option value="">Selecione</option>
              {rows.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="entry">Entrada</option>
              <option value="loss">Perda</option>
              <option value="internal_consumption">Consumo interno</option>
              <option value="adjustment">Ajuste</option>
              <option value="return">Devolução</option>
            </select>
          </label>

          <label>
            Quantidade
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </label>

          <label>
            Motivo
            <input value={reason} onChange={e => setReason(e.target.value)} />
          </label>

          <button>Registrar movimento</button>
        </form>
      </div>

      <div className="panel">
        <h2>Saldo atual</h2>

        {rows.map(r => (
          <div className="stock-row" key={r.id}>
            <span>{r.name}</span>
            <strong
              className={
                Number(r.stock?.[0]?.quantity || 0) <= Number(r.minimum_stock || 0)
                  ? 'danger'
                  : ''
              }
            >
              {r.stock?.[0]?.quantity ?? 0}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function Tables() {
  const [rows, setRows] = useState<Row[]>([])
  const [number, setNumber] = useState('')
  const [seats, setSeats] = useState('4')

  const load = async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('active', true)
      .order('number')

    setRows(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()

    const { error } = await supabase
      .from('tables')
      .insert({ number, seats: Number(seats) })

    if (!error) {
      setNumber('')
      load()
    } else {
      alert(error.message)
    }
  }

  async function open(r: Row) {
    const { data, error } = await supabase
      .from('commands')
      .insert({ table_id: r.id, status: 'open' })
      .select()
      .single()

    if (error) return alert(error.message)

    await supabase.from('tables').update({ status: 'occupied' }).eq('id', r.id)

    alert('Comanda ' + data.number + ' aberta.')
    load()
  }

  return (
    <div className="grid-two">
      <div className="panel">
        <h2>Nova mesa</h2>

        <form className="inline-form" onSubmit={add}>
          <input
            placeholder="Número"
            required
            value={number}
            onChange={e => setNumber(e.target.value)}
          />

          <input
            type="number"
            min="1"
            value={seats}
            onChange={e => setSeats(e.target.value)}
          />

          <button>Adicionar</button>
        </form>
      </div>

      <div className="panel">
        <h2>Salão</h2>

        <div className="cards">
          {rows.map(r => (
            <article className="mini-card" key={r.id}>
              <strong>Mesa {r.number}</strong>
              <small>
                {r.seats} lugares · {r.status}
              </small>

              {r.status === 'free' && (
                <button onClick={() => open(r)}>Abrir comanda</button>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

const COMMAND_SLOT_DEFAULT = 30
const COMMAND_SLOT_MAX = 999
const COMMAND_SLOT_STORAGE_KEY = 'quinta-command-slots'
const COMMAND_SLOT_COUNT_STORAGE_KEY = 'quinta-command-slot-count'

const formatCommandCode = (value: number | string) => String(value).padStart(3, '0')

function CommandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 28, height: 28 }}
      aria-hidden="true"
    >
      <path
        d="M7 3.5h10a2 2 0 0 1 2 2V20l-2.25-1.25L14.5 20l-2.25-1.25L10 20l-2.25-1.25L5 20V5.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="9" cy="16" r="1" fill="currentColor" />
      <circle cx="15" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

function readCommandSlots() {
  if (typeof window === 'undefined') return {} as Record<string, string>

  try {
    return JSON.parse(localStorage.getItem(COMMAND_SLOT_STORAGE_KEY) || '{}')
  } catch {
    return {} as Record<string, string>
  }
}

function saveCommandSlots(map: Record<string, string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMMAND_SLOT_STORAGE_KEY, JSON.stringify(map))
}

function readCommandSlotCount() {
  if (typeof window === 'undefined') return COMMAND_SLOT_DEFAULT

  const saved = Number(localStorage.getItem(COMMAND_SLOT_COUNT_STORAGE_KEY) || 0)
  if (!Number.isFinite(saved)) return COMMAND_SLOT_DEFAULT

  return Math.min(COMMAND_SLOT_MAX, Math.max(COMMAND_SLOT_DEFAULT, Math.floor(saved)))
}

function saveCommandSlotCount(value: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMMAND_SLOT_COUNT_STORAGE_KEY, String(value))
}

function normalizeCommandSlots(
  map: Record<string, string>,
  commands: Row[],
  slotTotal: number,
) {
  const activeById = new Map(commands.map(command => [String(command.id), command]))
  const normalized: Record<string, string> = {}
  const usedIds = new Set<string>()

  Object.entries(map || {}).forEach(([slot, commandId]) => {
    const slotNumber = Number(slot)
    const normalizedSlot = formatCommandCode(slotNumber)
    const normalizedId = String(commandId)

    if (
      slotNumber >= 1 &&
      slotNumber <= slotTotal &&
      activeById.has(normalizedId) &&
      !usedIds.has(normalizedId)
    ) {
      normalized[normalizedSlot] = normalizedId
      usedIds.add(normalizedId)
    }
  })

  commands.forEach(command => {
    const commandId = String(command.id)
    if (usedIds.has(commandId)) return

    const preferredNumber = Number(command.number)
    const preferredSlot =
      preferredNumber >= 1 && preferredNumber <= slotTotal
        ? formatCommandCode(preferredNumber)
        : ''

    let targetSlot = preferredSlot && !normalized[preferredSlot] ? preferredSlot : ''

    if (!targetSlot) {
      for (let index = 1; index <= slotTotal; index += 1) {
        const fallbackSlot = formatCommandCode(index)
        if (!normalized[fallbackSlot]) {
          targetSlot = fallbackSlot
          break
        }
      }
    }

    if (targetSlot) {
      normalized[targetSlot] = commandId
      usedIds.add(commandId)
    }
  })

  return normalized
}

function Commands() {
  const nav = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [products, setProducts] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [items, setItems] = useState<Row[]>([])
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState('1')
  const [slotMap, setSlotMap] = useState<Record<string, string>>({})
  const [slotTotal, setSlotTotal] = useState(readCommandSlotCount)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openingSlot, setOpeningSlot] = useState('')
  const [closing, setClosing] = useState(false)

  const syncSlots = (
    commands: Row[],
    total = slotTotal,
    baseMap?: Record<string, string>,
  ) => {
    const nextMap = normalizeCommandSlots(baseMap || readCommandSlots(), commands, total)
    saveCommandSlots(nextMap)
    setSlotMap(nextMap)
    return nextMap
  }

  const load = async () => {
    const [c, p] = await Promise.all([
      supabase
        .from('commands')
        .select('*,tables(number)')
        .in('status', ['open', 'payment'])
        .order('opened_at', { ascending: false }),
      supabase
        .from('products')
        .select('id,name,sale_price')
        .eq('active', true)
        .is('deleted_at', null)
        .order('name'),
    ])

    const nextRows = c.data || []
    const effectiveTotal = Math.min(
      COMMAND_SLOT_MAX,
      Math.max(COMMAND_SLOT_DEFAULT, slotTotal, nextRows.length),
    )

    if (effectiveTotal !== slotTotal) {
      setSlotTotal(effectiveTotal)
      saveCommandSlotCount(effectiveTotal)
    }

    setRows(nextRows)
    setProducts(p.data || [])
    syncSlots(nextRows, effectiveTotal)

    if (selected) {
      const freshSelection = nextRows.find(command => command.id === selected.id) || null

      if (freshSelection) {
        setSelected(freshSelection)
      } else {
        setSelected(null)
        setSelectedSlot('')
        setItems([])
      }
    }
  }

  useEffect(() => {
    load()
  }, [])

  const commandById = useMemo(
    () => Object.fromEntries(rows.map(command => [String(command.id), command])),
    [rows],
  )

  const visibleSlots = useMemo(() => {
    const query = search.trim()

    return Array.from({ length: slotTotal }, (_, index) => {
      const code = formatCommandCode(index + 1)
      const commandId = slotMap[code]
      const command = commandId ? commandById[commandId] : null
      const status = command?.status === 'payment' ? 'payment' : command ? 'open' : 'free'

      return { code, commandId, command, status }
    }).filter(slot => {
      const matchesSearch = !query || slot.code.includes(query)
      const matchesStatus = !statusFilter || slot.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [commandById, search, slotMap, slotTotal, statusFilter])

  function addCommandSlot() {
    if (slotTotal >= COMMAND_SLOT_MAX) {
      alert('O limite é de 999 comandas.')
      return
    }

    const nextTotal = slotTotal + 1
    setSlotTotal(nextTotal)
    saveCommandSlotCount(nextTotal)
    syncSlots(rows, nextTotal)
  }

  async function pick(command: Row, slotCode?: string) {
    setSelected(command)

    if (slotCode) {
      setSelectedSlot(slotCode)
    } else {
      const foundSlot =
        Object.entries(slotMap).find(([, id]) => id === String(command.id))?.[0] || ''
      setSelectedSlot(foundSlot)
    }

    const { data, error } = await supabase
      .from('command_items')
      .select('*,products(name)')
      .eq('command_id', command.id)
      .is('cancelled_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      alert(error.message)
      return
    }

    setItems(data || [])
  }

  async function openOrSelectSlot(slotCode: string) {
    const existingId = slotMap[slotCode]

    if (existingId) {
      const existingCommand = commandById[existingId]

      if (existingCommand) {
        pick(existingCommand, slotCode)
        return
      }
    }

    setOpeningSlot(slotCode)

    const { data, error } = await supabase
      .from('commands')
      .insert({ status: 'open' })
      .select('*,tables(number)')
      .single()

    setOpeningSlot('')

    if (error) {
      alert(error.message)
      return
    }

    const nextRows = [data, ...rows]
    setRows(nextRows)

    const nextMap = syncSlots(nextRows, slotTotal, {
      ...slotMap,
      [slotCode]: String(data.id),
    })

    setSelectedSlot(slotCode)
    setSelected(data)
    setItems([])
    setProduct('')
    setQty('1')

    await pick(
      data,
      Object.keys(nextMap).find(key => nextMap[key] === String(data.id)) || slotCode,
    )
  }

  async function add() {
    if (!selected || !product || selected.status !== 'open') return

    const currentProduct = products.find(x => x.id === product)
    if (!currentProduct) return

    const { error } = await supabase.from('command_items').insert({
      command_id: selected.id,
      product_id: product,
      quantity: Number(qty),
      unit_price: Number(currentProduct.sale_price),
    })

    if (error) {
      alert(error.message)
    } else {
      setProduct('')
      setQty('1')
      pick(selected, selectedSlot)
    }
  }

  const itemUnits = useMemo(
    () => items.reduce((amount, item) => amount + Number(item.quantity || 0), 0),
    [items],
  )

  const total = useMemo(
    () =>
      items.reduce(
        (amount, item) => amount + Number(item.quantity) * Number(item.unit_price),
        0,
      ) +
      Number(selected?.service_fee || 0) -
      Number(selected?.discount || 0),
    [items, selected],
  )

  async function closeCommand() {
    if (!selected || selected.status !== 'open' || closing) return

    if (items.length === 0) {
      alert('Adicione pelo menos um produto antes de fechar a comanda.')
      return
    }

    const confirmed = window.confirm(
      `Fechar a comanda ${selectedSlot} e enviar para o Frente de Caixa?`,
    )

    if (!confirmed) return

    setClosing(true)

    const { error } = await supabase
      .from('commands')
      .update({ status: 'payment' })
      .eq('id', selected.id)

    setClosing(false)

    if (error) {
      alert(error.message)
      return
    }

    alert(`Comanda ${selectedSlot} enviada para o Caixa.`)
    setSelected(null)
    setSelectedSlot('')
    setItems([])
    setProduct('')
    setQty('1')
    await load()
  }

  const usedCount = Object.values(slotMap).filter(id => commandById[id]).length
  const freeCount = Math.max(0, slotTotal - usedCount)

  return (
    <>
      <div className="products-toolbar">
        <button
          className="primary-action"
          type="button"
          onClick={addCommandSlot}
          style={{
            height: 38,
            minHeight: 38,
            padding: '0 14px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={17} /> Nova comanda
        </button>

        <div className="product-filters">
          <label className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={event =>
                setSearch(event.target.value.replace(/\D/g, '').slice(0, 3))
              }
              placeholder="Pesquisar por número da comanda..."
            />
          </label>

          <label className="compact-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="free">Livres</option>
              <option value="open">Abertas</option>
              <option value="payment">Pagamento</option>
            </select>
          </label>
        </div>
      </div>

      <section className="products-card">
        <div className="products-card-head">
          <div>
            <h2>Comandas</h2>
            <p>
              {slotTotal === COMMAND_SLOT_DEFAULT
                ? '30 comandas disponíveis para atendimento.'
                : `Comandas disponíveis de 001 até ${formatCommandCode(slotTotal)}.`}
            </p>
          </div>

          <span className="record-count">
            {slotTotal} comanda{slotTotal === 1 ? '' : 's'} · {freeCount} livre
            {freeCount === 1 ? '' : 's'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
            gap: 12,
            padding: '0 16px 20px',
          }}
        >
          {visibleSlots.map(slot => {
            const isActive = selectedSlot === slot.code
            const isBusy = openingSlot === slot.code
            const statusLabel =
              slot.status === 'payment'
                ? 'Aguardando caixa'
                : slot.status === 'open'
                  ? 'Em atendimento'
                  : isBusy
                    ? 'Criando...'
                    : 'Livre'

            const background =
              slot.status === 'payment'
                ? '#f7f2ff'
                : slot.status === 'open'
                  ? '#fffaf0'
                  : '#ffffff'

            const borderColor = isActive
              ? '#c89245'
              : slot.status === 'payment'
                ? '#ddd6fe'
                : slot.status === 'open'
                  ? '#ead9b2'
                  : '#e5dece'

            const textColor =
              slot.status === 'payment'
                ? '#5b46b3'
                : slot.status === 'open'
                  ? '#8e5a16'
                  : '#6b685f'

            return (
              <button
                key={slot.code}
                type="button"
                onClick={() => openOrSelectSlot(slot.code)}
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 14,
                  background,
                  padding: '15px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 0 0 2px rgba(200,146,69,.12)' : 'none',
                  transition: 'all .15s ease',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background:
                      slot.status === 'payment'
                        ? '#ede9fe'
                        : slot.status === 'open'
                          ? '#fbefcf'
                          : '#f5f1e7',
                    color:
                      slot.status === 'payment'
                        ? '#5b46b3'
                        : slot.status === 'open'
                          ? '#8e5a16'
                          : '#6d665d',
                  }}
                >
                  <CommandIcon />
                </div>

                <strong style={{ fontSize: 12, color: '#8b867d', fontWeight: 500 }}>
                  Comanda
                </strong>

                <span
                  style={{
                    fontSize: 24,
                    lineHeight: 1,
                    fontWeight: 600,
                    color: '#1f3129',
                  }}
                >
                  {slot.code}
                </span>

                <small
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: 500,
                    color: textColor,
                    textAlign: 'center',
                  }}
                >
                  {statusLabel}
                </small>
              </button>
            )
          })}
        </div>

        {visibleSlots.length === 0 && (
          <div className="empty-state" style={{ paddingBottom: 28 }}>
            <strong>Nenhuma comanda encontrada</strong>
            <span>Ajuste a pesquisa ou o filtro de status.</span>
          </div>
        )}
      </section>

      {selected && (
        <section className="products-card" style={{ marginTop: 18 }}>
          <div className="products-card-head">
            <div>
              <h2>{`Comanda ${selectedSlot}`}</h2>
              <p>
                {selected.status === 'payment'
                  ? 'Comanda fechada e aguardando recebimento no Caixa.'
                  : 'Confira os produtos da comanda antes de enviar para o Caixa.'}
              </p>
            </div>

            <span
              className="record-count"
              style={
                selected.status === 'payment'
                  ? { background: '#f3f1ff', color: '#5841b2', borderColor: '#ddd6fe' }
                  : undefined
              }
            >
              {selected.status === 'payment' ? 'Aguardando caixa' : 'Em atendimento'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.7fr) minmax(260px, .8fr)',
              gap: 18,
              padding: '0 16px 20px',
              alignItems: 'start',
            }}
          >
            <div>
              {selected.status === 'open' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 1fr) 100px 150px',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <select value={product} onChange={event => setProduct(event.target.value)}>
                    <option value="">Selecione um produto</option>
                    {products.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {money(option.sale_price)}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={qty}
                    onChange={event => setQty(event.target.value)}
                  />

                  <button type="button" onClick={add}>
                    Adicionar item
                  </button>
                </div>
              )}

              <div
                style={{
                  border: '1px solid #ece4d4',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 100px 130px',
                    gap: 12,
                    padding: '13px 16px',
                    borderBottom: '1px solid #f0eadf',
                    color: '#7e7a71',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '.03em',
                  }}
                >
                  <span>Produto</span>
                  <span style={{ textAlign: 'right' }}>Qtd.</span>
                  <span style={{ textAlign: 'right' }}>Subtotal</span>
                </div>

                {items.length === 0 ? (
                  <div style={{ padding: 20, color: '#7e7a71' }}>
                    Nenhum produto adicionado nesta comanda.
                  </div>
                ) : (
                  items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 100px 130px',
                        gap: 12,
                        padding: '14px 16px',
                        borderTop: '1px solid #f6f1e6',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', marginBottom: 3, fontWeight: 600 }}>
                          {item.products?.name}
                        </strong>
                        <small style={{ color: '#7e7a71' }}>
                          {money(item.unit_price)} cada
                        </small>
                      </div>

                      <span style={{ textAlign: 'right' }}>
                        {Number(item.quantity).toLocaleString('pt-BR')}
                      </span>

                      <strong style={{ textAlign: 'right', fontWeight: 600 }}>
                        {money(Number(item.quantity) * Number(item.unit_price))}
                      </strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              style={{
                border: '1px solid #ece4d4',
                borderRadius: 12,
                background: '#fcfaf4',
                padding: 18,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>
                Resumo da comanda
              </h3>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 10,
                  color: '#6f6a61',
                }}
              >
                <span>Produtos</span>
                <strong>{items.length}</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 18,
                  color: '#6f6a61',
                }}
              >
                <span>Quantidade total</span>
                <strong>{itemUnits.toLocaleString('pt-BR')}</strong>
              </div>

              <div
                style={{
                  borderTop: '1px solid #e4dccd',
                  paddingTop: 15,
                  marginBottom: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span>Total</span>
                <strong style={{ fontSize: 23, fontWeight: 600 }}>{money(total)}</strong>
              </div>

              {selected.status === 'open' ? (
                <button
                  className="primary-action"
                  type="button"
                  onClick={closeCommand}
                  disabled={closing || items.length === 0}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {closing ? 'Fechando...' : 'Fechar comanda e enviar ao Caixa'}
                </button>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: 12,
                      padding: '11px 12px',
                      borderRadius: 10,
                      background: '#f3f1ff',
                      border: '1px solid #ddd6fe',
                      color: '#5841b2',
                      fontSize: 13,
                    }}
                  >
                    Esta comanda já foi enviada para o Frente de Caixa.
                  </div>

                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => nav('/admin/caixa')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Ir para o Caixa
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  )
}


function Cash() {
  const [open, setOpen] = useState<Row | null>(null)
  const [opening, setOpening] = useState('0')
  const [informed, setInformed] = useState('0')
  const [pending, setPending] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [items, setItems] = useState<Row[]>([])
  const [method, setMethod] = useState('pix')
  const [paying, setPaying] = useState(false)

  const load = async () => {
    const [register, commands] = await Promise.all([
      supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .maybeSingle(),
      supabase
        .from('commands')
        .select('*,tables(number)')
        .eq('status', 'payment')
        .order('opened_at', { ascending: true }),
    ])

    setOpen(register.data || null)
    setPending(commands.data || [])

    if (selected) {
      const fresh = (commands.data || []).find(command => command.id === selected.id) || null

      if (fresh) setSelected(fresh)
      else {
        setSelected(null)
        setItems([])
      }
    }
  }

  useEffect(() => {
    load()
  }, [])

  function commandDisplayNumber(command: Row) {
    const map = readCommandSlots()
    const slot = Object.entries(map).find(([, commandId]) => commandId === String(command.id))?.[0]

    if (slot) return slot
    if (command.number != null) return formatCommandCode(command.number)

    return '---'
  }

  async function pickPayment(command: Row) {
    setSelected(command)

    const { data, error } = await supabase
      .from('command_items')
      .select('*,products(name)')
      .eq('command_id', command.id)
      .is('cancelled_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      alert(error.message)
      return
    }

    setItems(data || [])
  }

  const total = useMemo(
    () =>
      items.reduce(
        (amount, item) => amount + Number(item.quantity) * Number(item.unit_price),
        0,
      ) +
      Number(selected?.service_fee || 0) -
      Number(selected?.discount || 0),
    [items, selected],
  )

  async function start() {
    const { error } = await supabase.rpc('open_cash_register', {
      p_opening_amount: Number(opening || 0),
    })

    if (error) alert(error.message)
    else load()
  }

  async function close() {
    if (!open) return

    const { error } = await supabase.rpc('close_cash_register', {
      p_cash_register_id: open.id,
      p_informed_cash: Number(informed || 0),
    })

    if (error) alert(error.message)
    else load()
  }

  async function finalizePayment() {
    if (!selected || !open || paying) return

    if (items.length === 0) {
      alert('Esta comanda não possui produtos para receber.')
      return
    }

    const confirmed = window.confirm(
      `Finalizar o pagamento da comanda ${commandDisplayNumber(selected)} no valor de ${money(total)}?`,
    )

    if (!confirmed) return

    setPaying(true)

    const { error } = await supabase.rpc('finalize_command_sale', {
      p_command_id: selected.id,
      p_payment_method: method,
      p_amount: total,
      p_cash_register_id: open.id,
    })

    setPaying(false)

    if (error) {
      alert(error.message)
      return
    }

    const map = readCommandSlots()
    const slotEntry = Object.entries(map).find(([, commandId]) => commandId === String(selected.id))

    if (slotEntry) {
      delete map[slotEntry[0]]
      saveCommandSlots(map)
    }

    alert(`Pagamento da comanda ${commandDisplayNumber(selected)} finalizado com sucesso.`)
    setSelected(null)
    setItems([])
    setMethod('pix')
    await load()
  }

  return (
    <>
      <section className="products-card">
        <div className="products-card-head">
          <div>
            <h2>Frente de Caixa</h2>
            <p>Abertura, recebimentos das comandas e fechamento do caixa.</p>
          </div>

          <span className={`status ${open ? 'ok' : ''}`}>
            {open ? 'Caixa aberto' : 'Caixa fechado'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: open ? 'minmax(0, 1fr) minmax(260px, .65fr)' : '1fr',
            gap: 18,
            padding: '0 16px 20px',
          }}
        >
          <div>
            {open ? (
              <>
                <div
                  style={{
                    marginBottom: 14,
                    padding: '12px 14px',
                    border: '1px solid #ece4d4',
                    borderRadius: 10,
                    background: '#fcfaf4',
                    color: '#625f58',
                    fontSize: 13,
                  }}
                >
                  Aberto em {new Date(open.opened_at).toLocaleString('pt-BR')} · Fundo inicial{' '}
                  <strong>{money(open.opening_amount)}</strong>
                </div>

                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>
                  Comandas aguardando pagamento
                </h3>

                {pending.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed #d8cfbf',
                      borderRadius: 12,
                      padding: 22,
                      textAlign: 'center',
                      color: '#7e7a71',
                    }}
                  >
                    Nenhuma comanda aguardando pagamento.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {pending.map(command => {
                      const active = selected?.id === command.id

                      return (
                        <button
                          key={command.id}
                          type="button"
                          onClick={() => pickPayment(command)}
                          style={{
                            border: active ? '1px solid #c89245' : '1px solid #e5dece',
                            borderRadius: 12,
                            background: active ? '#fffaf0' : '#fff',
                            padding: '14px 12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            boxShadow: active ? '0 0 0 2px rgba(200,146,69,.12)' : 'none',
                          }}
                        >
                          <small style={{ display: 'block', color: '#7e7a71', marginBottom: 5 }}>
                            Comanda
                          </small>
                          <strong style={{ display: 'block', fontSize: 21, fontWeight: 600 }}>
                            {commandDisplayNumber(command)}
                          </strong>
                          <small style={{ color: '#8e5a16' }}>Aguardando pagamento</small>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
                  Abrir caixa
                </h3>

                <div className="inline-form" style={{ maxWidth: 520 }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={opening}
                    onChange={e => setOpening(e.target.value)}
                    placeholder="Fundo inicial"
                  />

                  <button onClick={start}>Abrir caixa</button>
                </div>

                {pending.length > 0 && (
                  <small className="warning" style={{ display: 'block', marginTop: 14 }}>
                    Existem {pending.length} comanda(s) aguardando pagamento. Abra o caixa para receber.
                  </small>
                )}
              </>
            )}
          </div>

          {open && (
            <div
              style={{
                border: '1px solid #ece4d4',
                borderRadius: 12,
                background: '#fcfaf4',
                padding: 16,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>
                Fechamento do caixa
              </h3>

              <label style={{ display: 'block', marginBottom: 7 }}>
                Dinheiro contado
              </label>

              <input
                type="number"
                step="0.01"
                min="0"
                value={informed}
                onChange={e => setInformed(e.target.value)}
                style={{ width: '100%', marginBottom: 10 }}
              />

              <button type="button" onClick={close} style={{ width: '100%' }}>
                Fechar caixa
              </button>
            </div>
          )}
        </div>
      </section>

      {open && selected && (
        <section className="products-card" style={{ marginTop: 18 }}>
          <div className="products-card-head">
            <div>
              <h2>Receber comanda {commandDisplayNumber(selected)}</h2>
              <p>Confira os itens e finalize o pagamento.</p>
            </div>

            <span className="record-count">Aguardando pagamento</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(260px, .75fr)',
              gap: 18,
              padding: '0 16px 20px',
              alignItems: 'start',
            }}
          >
            <div
              style={{
                border: '1px solid #ece4d4',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 90px 130px',
                  gap: 12,
                  padding: '13px 16px',
                  borderBottom: '1px solid #f0eadf',
                  color: '#7e7a71',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.03em',
                }}
              >
                <span>Produto</span>
                <span style={{ textAlign: 'right' }}>Qtd.</span>
                <span style={{ textAlign: 'right' }}>Subtotal</span>
              </div>

              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 90px 130px',
                    gap: 12,
                    padding: '14px 16px',
                    borderTop: '1px solid #f6f1e6',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontWeight: 600 }}>
                      {item.products?.name}
                    </strong>
                    <small style={{ color: '#7e7a71' }}>{money(item.unit_price)} cada</small>
                  </div>

                  <span style={{ textAlign: 'right' }}>
                    {Number(item.quantity).toLocaleString('pt-BR')}
                  </span>

                  <strong style={{ textAlign: 'right', fontWeight: 600 }}>
                    {money(Number(item.quantity) * Number(item.unit_price))}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                border: '1px solid #ece4d4',
                borderRadius: 12,
                background: '#fcfaf4',
                padding: 18,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 18,
                  paddingBottom: 14,
                  borderBottom: '1px solid #e4dccd',
                }}
              >
                <span>Total a receber</span>
                <strong style={{ fontSize: 24, fontWeight: 600 }}>{money(total)}</strong>
              </div>

              <label style={{ display: 'block', marginBottom: 7 }}>
                Forma de pagamento
              </label>

              <select
                value={method}
                onChange={event => setMethod(event.target.value)}
                style={{ width: '100%', marginBottom: 12 }}
              >
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="debit_card">Cartão de débito</option>
              </select>

              <button
                className="primary-action"
                type="button"
                onClick={finalizePayment}
                disabled={paying || items.length === 0}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {paying ? 'Finalizando...' : `Finalizar pagamento · ${money(total)}`}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}


function Events() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<any>({
    name: '',
    event_date: today(),
    start_time: '19:00',
    price: '0',
    capacity: '0',
    status: 'published',
  })

  const load = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    setRows(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()

    const { error } = await supabase.from('events').insert({
      ...form,
      price: Number(form.price),
      capacity: Number(form.capacity),
    })

    if (error) {
      alert(error.message)
    } else {
      setForm({ ...form, name: '' })
      load()
    }
  }

  return (
    <div className="grid-two">
      <div className="panel">
        <h2>Novo evento</h2>

        <form className="form-grid" onSubmit={save}>
          <label>
            Nome
            <input
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label>
            Data
            <input
              type="date"
              required
              value={form.event_date}
              onChange={e =>
                setForm({ ...form, event_date: e.target.value })
              }
            />
          </label>

          <label>
            Horário
            <input
              type="time"
              value={form.start_time}
              onChange={e =>
                setForm({ ...form, start_time: e.target.value })
              }
            />
          </label>

          <label>
            Preço
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
            />
          </label>

          <label>
            Capacidade
            <input
              type="number"
              value={form.capacity}
              onChange={e =>
                setForm({ ...form, capacity: e.target.value })
              }
            />
          </label>

          <button>Publicar evento</button>
        </form>
      </div>

      <div className="panel">
        <h2>Eventos</h2>

        {rows.map(r => (
          <div className="list-row" key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <small>
                {r.event_date} · {r.start_time?.slice(0, 5)} · {money(r.price)} ·{' '}
                {r.capacity} lugares
              </small>
            </div>

            <span className="status ok">{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const modules: any = {
  Dashboard,
  Produtos: ProductsPage,
  Estoque: Stock,
  Mesas: Tables,
  Comandas: Commands,
  Caixa: Cash,
  Reservas: ReservationsPage,
  Eventos: Events,
}

const slugs: any = {
  Dashboard: '',
  Produtos: 'produtos',
  Estoque: 'estoque',
  Mesas: 'mesas',
  Comandas: 'comandas',
  Caixa: 'caixa',
  Reservas: 'reservas',
  Eventos: 'eventos',
}

const slugPages: any = Object.fromEntries(
  Object.entries(slugs).map(([key, value]) => [value, key]),
)

function Admin() {
  const location = useLocation()
  const nav = useNavigate()
  const slug = location.pathname.replace(/^\/admin\/?/, '').split('/')[0]
  const page = slugPages[slug] || 'Dashboard'
  const Page = modules[page] || Dashboard

  function go(name: string) {
    nav('/admin' + (slugs[name] ? '/' + slugs[name] : ''))
  }

  return (
    <div className="admin">
      <aside>
        <div className="admin-brand">
          <img
            src={logoBranco}
            alt="Quintal da Montanha"
            className="admin-logo"
          />
        </div>

        <nav>
          {Object.keys(modules).map(x => (
            <button
              key={x}
              className={page === x ? 'active' : ''}
              onClick={() => go(x)}
            >
              {x}
            </button>
          ))}
        </nav>

        <button
          className="logout"
          onClick={() => supabase.auth.signOut()}
        >
          Sair
        </button>
      </aside>

      <section>
        <header>
          <div>
            <span>Administração</span>
            <h1>{page}</h1>
          </div>

        </header>

        <Page />
      </section>
    </div>
  )
}

function Protected({ session }: { session: Session | null }) {
  return session ? <Admin /> : <Navigate to="/admin/login" replace />
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))

    return () => data.subscription.unsubscribe()
  }, [])

  if (!ready) return null

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/admin/login"
        element={session ? <Navigate to="/admin" replace /> : <Login />}
      />
      <Route
        path="/admin/*"
        element={<Protected session={session} />}
      />
    </Routes>
  )
}
