import { FormEvent, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

function Home() {
  return <main className="hero"><div className="overlay"><p className="eyebrow">QUINTA DA MONTANHA</p><h1>Gastronomia, natureza e bons momentos em um só lugar.</h1><p>Uma experiência acolhedora entre montanhas, sabores e encontros especiais.</p><div className="actions"><a href="#cardapio">Ver cardápio</a><a href="#reservas" className="secondary">Fazer reserva</a><a href="#eventos" className="secondary">Próximos eventos</a></div></div></main>
}

function Login() {
  const nav = useNavigate(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault();setError('');const {error}=await supabase.auth.signInWithPassword({email,password}); if(error) setError(error.message); else nav('/admin')}
  return <main className="login"><form onSubmit={submit}><h1>Área administrativa</h1><p>Entre com seu acesso autorizado.</p><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<button>Entrar</button></form></main>
}

function Admin(){ const [profile,setProfile]=useState<{full_name:string|null;role?:{label?:string}}|null>(null); useEffect(()=>{supabase.from('profiles').select('full_name,roles(label)').single().then(({data})=>setProfile(data as any))},[]); return <div className="admin"><aside><strong>Quinta da Montanha</strong><nav>{['Dashboard','Comandas','Mesas','Caixa','Vendas','Reservas','Eventos','Estoque','Produtos','Fornecedores','Financeiro','Projeções','Relatórios','Configurações'].map(x=><a key={x} href="#">{x}</a>)}</nav><button onClick={()=>supabase.auth.signOut()}>Sair</button></aside><section><header><div><span>Administração</span><h1>Dashboard</h1></div><div>{profile?.full_name ?? 'Usuário'}<small>{(profile as any)?.roles?.label ?? ''}</small></div></header><div className="metrics">{['Faturamento hoje','Vendas hoje','Ticket médio','Comandas abertas','Reservas','Clientes atendidos'].map(x=><article key={x}><span>{x}</span><strong>R$ 0,00</strong><small>Nenhum dado disponível</small></article>)}</div><div className="panel"><h2>Operação integrada</h2><p>Os indicadores serão alimentados exclusivamente pelos dados reais do Supabase. Nenhum valor de negócio será fixo ou mockado em produção.</p></div></section></div>}

function Protected({session}:{session:Session|null}){return session?<Admin/>:<Navigate to="/admin/login" replace/>}

export default function App(){ const [session,setSession]=useState<Session|null>(null); const [ready,setReady]=useState(false); useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[]); if(!ready)return null; return <Routes><Route path="/" element={<Home/>}/><Route path="/admin/login" element={session?<Navigate to="/admin" replace/>:<Login/>}/><Route path="/admin/*" element={<Protected session={session}/>}/></Routes> }
