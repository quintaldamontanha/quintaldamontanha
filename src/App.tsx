import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

const ADMIN_EMAIL='quintaldamontanha@gmail.com'
const money=(v:any)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const today=()=>new Date().toISOString().slice(0,10)

type Row=Record<string,any>

function Home(){return <main className="hero"><div className="overlay"><p className="eyebrow">QUINTA DA MONTANHA</p><h1>Gastronomia, natureza e bons momentos em um só lugar.</h1><p>Uma experiência acolhedora entre montanhas, sabores e encontros especiais.</p><div className="actions"><a href="/admin">Área administrativa</a></div></div></main>}

function Login(){
 const nav=useNavigate(); const [email,setEmail]=useState(ADMIN_EMAIL); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');
   let result=await supabase.auth.signInWithPassword({email,password})
   if(result.error && email.toLowerCase()===ADMIN_EMAIL){
     const sign=await supabase.auth.signUp({email,password,options:{data:{full_name:'Administrador'}}})
     if(sign.error && !sign.error.message.toLowerCase().includes('already')){setError(sign.error.message);setBusy(false);return}
     if(sign.data.session){nav('/admin');setBusy(false);return}
     result=await supabase.auth.signInWithPassword({email,password})
     if(result.error){setError('Conta criada. Se o Supabase solicitar confirmação, confirme o e-mail e entre novamente.');setBusy(false);return}
   }
   if(result.error)setError('E-mail ou senha inválidos.'); else nav('/admin'); setBusy(false)
 }
 return <main className="login"><form onSubmit={submit}><p className="eyebrow dark">QUINTA DA MONTANHA</p><h1>Área administrativa</h1><p>Gestão integrada de salão, caixa, vendas, estoque e eventos.</p><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<button disabled={busy}>{busy?'Entrando...':'Entrar'}</button></form></main>
}

function Dashboard(){
 const [m,setM]=useState<any>({sales:0,total:0,commands:0,reservations:0,low:0})
 useEffect(()=>{(async()=>{
   const start=today()+'T00:00:00'; const [s,c,r,p]=await Promise.all([
    supabase.from('sales').select('total').gte('created_at',start).eq('status','completed'),
    supabase.from('commands').select('id',{count:'exact',head:true}).in('status',['open','payment']),
    supabase.from('reservations').select('id',{count:'exact',head:true}).eq('reservation_date',today()),
    supabase.from('products').select('id,minimum_stock,stock(quantity)').eq('active',true)
   ]); const rows=s.data||[]; const total=rows.reduce((a:any,x:any)=>a+Number(x.total||0),0); const low=(p.data||[]).filter((x:any)=>Number(x.stock?.[0]?.quantity||0)<=Number(x.minimum_stock||0)).length
   setM({sales:rows.length,total,commands:c.count||0,reservations:r.count||0,low})
 })()},[])
 const avg=m.sales?m.total/m.sales:0
 return <><div className="metrics"><article><span>Faturamento hoje</span><strong>{money(m.total)}</strong><small>{m.sales} venda(s)</small></article><article><span>Ticket médio</span><strong>{money(avg)}</strong><small>Somente vendas concluídas</small></article><article><span>Comandas abertas</span><strong>{m.commands}</strong><small>Em atendimento/pagamento</small></article><article><span>Reservas hoje</span><strong>{m.reservations}</strong><small>Agenda do dia</small></article><article><span>Estoque baixo</span><strong>{m.low}</strong><small>Itens no mínimo ou abaixo</small></article></div><div className="panel"><h2>Operação integrada</h2><p>Os indicadores acima são calculados diretamente no Supabase. Vendas finalizadas alimentam caixa, histórico de venda, pagamentos e baixa de estoque na mesma transação.</p></div></>
}

function Products(){
 const [rows,setRows]=useState<Row[]>([]),[cats,setCats]=useState<Row[]>([]); const [form,setForm]=useState<any>({name:'',sale_price:'',cost_price:'',minimum_stock:'0',category_id:'',show_on_menu:false}); const [msg,setMsg]=useState('')
 const load=async()=>{const [p,c]=await Promise.all([supabase.from('products').select('*,categories(name),stock(quantity)').order('name'),supabase.from('categories').select('*').order('name')]);setRows(p.data||[]);setCats(c.data||[])}
 useEffect(()=>{load()},[])
 async function save(e:FormEvent){e.preventDefault();setMsg('');const {error}=await supabase.from('products').insert({name:form.name,sale_price:Number(form.sale_price||0),cost_price:Number(form.cost_price||0),minimum_stock:Number(form.minimum_stock||0),category_id:form.category_id||null,show_on_menu:form.show_on_menu});if(error)setMsg(error.message);else{setForm({name:'',sale_price:'',cost_price:'',minimum_stock:'0',category_id:'',show_on_menu:false});setMsg('Produto cadastrado.');load()}}
 async function toggle(r:Row){await supabase.from('products').update({active:!r.active}).eq('id',r.id);load()}
 return <div className="grid-two"><div className="panel"><h2>Novo produto</h2><form className="form-grid" onSubmit={save}><label>Nome<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Categoria<select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Sem categoria</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Preço venda<input type="number" step="0.01" required value={form.sale_price} onChange={e=>setForm({...form,sale_price:e.target.value})}/></label><label>Custo<input type="number" step="0.01" value={form.cost_price} onChange={e=>setForm({...form,cost_price:e.target.value})}/></label><label>Estoque mínimo<input type="number" step="0.01" value={form.minimum_stock} onChange={e=>setForm({...form,minimum_stock:e.target.value})}/></label><label className="check"><input type="checkbox" checked={form.show_on_menu} onChange={e=>setForm({...form,show_on_menu:e.target.checked})}/> Exibir no cardápio</label><button>Salvar produto</button>{msg&&<small>{msg}</small>}</form></div><div className="panel"><h2>Produtos</h2><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.name}<small>{r.categories?.name||''}</small></td><td>{money(r.sale_price)}</td><td>{r.stock?.[0]?.quantity??0}</td><td><button className="link" onClick={()=>toggle(r)}>{r.active?'Ativo':'Inativo'}</button></td></tr>)}</tbody></table></div></div></div>
}

function Stock(){
 const [rows,setRows]=useState<Row[]>([]); const [product,setProduct]=useState(''); const [qty,setQty]=useState(''); const [type,setType]=useState('entry'); const [reason,setReason]=useState('')
 const load=async()=>{const {data}=await supabase.from('products').select('id,name,minimum_stock,stock(quantity)').eq('active',true).order('name');setRows(data||[])};useEffect(()=>{load()},[])
 async function move(e:FormEvent){e.preventDefault();let q=Number(qty);if(['sale','loss','internal_consumption'].includes(type))q=-Math.abs(q);const {error}=await supabase.from('stock_movements').insert({product_id:product,quantity:q,type,reason});if(!error){setQty('');setReason('');load()}else alert(error.message)}
 return <div className="grid-two"><div className="panel"><h2>Movimentar estoque</h2><form className="form-grid" onSubmit={move}><label>Produto<select required value={product} onChange={e=>setProduct(e.target.value)}><option value="">Selecione</option>{rows.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Tipo<select value={type} onChange={e=>setType(e.target.value)}><option value="entry">Entrada</option><option value="loss">Perda</option><option value="internal_consumption">Consumo interno</option><option value="adjustment">Ajuste</option><option value="return">Devolução</option></select></label><label>Quantidade<input type="number" step="0.01" required value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Motivo<input value={reason} onChange={e=>setReason(e.target.value)}/></label><button>Registrar movimento</button></form></div><div className="panel"><h2>Saldo atual</h2>{rows.map(r=><div className="stock-row" key={r.id}><span>{r.name}</span><strong className={Number(r.stock?.[0]?.quantity||0)<=Number(r.minimum_stock||0)?'danger':''}>{r.stock?.[0]?.quantity??0}</strong></div>)}</div></div>
}

function Tables(){
 const [rows,setRows]=useState<Row[]>([]),[number,setNumber]=useState(''),[seats,setSeats]=useState('4');const load=async()=>{const {data}=await supabase.from('tables').select('*').eq('active',true).order('number');setRows(data||[])};useEffect(()=>{load()},[])
 async function add(e:FormEvent){e.preventDefault();const {error}=await supabase.from('tables').insert({number,seats:Number(seats)});if(!error){setNumber('');load()}else alert(error.message)}
 async function open(r:Row){const {data,error}=await supabase.from('commands').insert({table_id:r.id,status:'open'}).select().single();if(error)return alert(error.message);await supabase.from('tables').update({status:'occupied'}).eq('id',r.id);alert('Comanda '+data.number+' aberta.');load()}
 return <div className="grid-two"><div className="panel"><h2>Nova mesa</h2><form className="inline-form" onSubmit={add}><input placeholder="Número" required value={number} onChange={e=>setNumber(e.target.value)}/><input type="number" min="1" value={seats} onChange={e=>setSeats(e.target.value)}/><button>Adicionar</button></form></div><div className="panel"><h2>Salão</h2><div className="cards">{rows.map(r=><article className="mini-card" key={r.id}><strong>Mesa {r.number}</strong><small>{r.seats} lugares · {r.status}</small>{r.status==='free'&&<button onClick={()=>open(r)}>Abrir comanda</button>}</article>)}</div></div></div>
}

function Commands(){
 const [rows,setRows]=useState<Row[]>([]),[products,setProducts]=useState<Row[]>([]),[selected,setSelected]=useState<Row|null>(null),[items,setItems]=useState<Row[]>([]),[product,setProduct]=useState(''),[qty,setQty]=useState('1'),[method,setMethod]=useState('pix'),[cash,setCash]=useState<Row|null>(null)
 const load=async()=>{const [c,p,cr]=await Promise.all([supabase.from('commands').select('*,tables(number)').in('status',['open','payment']).order('opened_at',{ascending:false}),supabase.from('products').select('id,name,sale_price').eq('active',true).order('name'),supabase.from('cash_registers').select('*').eq('status','open').maybeSingle()]);setRows(c.data||[]);setProducts(p.data||[]);setCash(cr.data||null)};useEffect(()=>{load()},[])
 async function pick(c:Row){setSelected(c);const {data}=await supabase.from('command_items').select('*,products(name)').eq('command_id',c.id).is('cancelled_at',null);setItems(data||[])}
 async function add(){if(!selected||!product)return;const p=products.find(x=>x.id===product)!;const {error}=await supabase.from('command_items').insert({command_id:selected.id,product_id:product,quantity:Number(qty),unit_price:Number(p.sale_price)});if(error)alert(error.message);else pick(selected)}
 const total=useMemo(()=>items.reduce((a,x)=>a+Number(x.quantity)*Number(x.unit_price),0)+Number(selected?.service_fee||0)-Number(selected?.discount||0),[items,selected])
 async function finish(){if(!selected)return;const {error}=await supabase.rpc('finalize_command_sale',{p_command_id:selected.id,p_payment_method:method,p_amount:total,p_cash_register_id:cash?.id||null});if(error)alert(error.message);else{setSelected(null);setItems([]);load()}}
 return <div className="grid-two"><div className="panel"><h2>Comandas abertas</h2>{rows.length===0?<p>Nenhuma comanda aberta.</p>:rows.map(r=><button className={'command-row '+(selected?.id===r.id?'active':'')} key={r.id} onClick={()=>pick(r)}><strong>#{r.number}</strong><span>{r.tables?.number?'Mesa '+r.tables.number:'Balcão'}</span></button>)}</div><div className="panel"><h2>{selected?'Comanda #'+selected.number:'Selecione uma comanda'}</h2>{selected&&<><div className="inline-form"><select value={product} onChange={e=>setProduct(e.target.value)}><option value="">Produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.sale_price)}</option>)}</select><input type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(e.target.value)}/><button onClick={add}>Adicionar</button></div><div className="order-items">{items.map(i=><div key={i.id}><span>{i.quantity}× {i.products?.name}</span><strong>{money(Number(i.quantity)*Number(i.unit_price))}</strong></div>)}</div><div className="total"><span>Total</span><strong>{money(total)}</strong></div><div className="inline-form"><select value={method} onChange={e=>setMethod(e.target.value)}><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="credit_card">Cartão crédito</option><option value="debit_card">Cartão débito</option></select><button onClick={finish}>Finalizar venda</button></div>{!cash&&<small className="warning">Nenhum caixa aberto. A venda pode ser finalizada, mas não entra em uma sessão de caixa.</small>}</>}</div></div>
}

function Cash(){
 const [open,setOpen]=useState<Row|null>(null),[opening,setOpening]=useState('0'),[informed,setInformed]=useState('0');const load=async()=>{const {data}=await supabase.from('cash_registers').select('*').eq('status','open').maybeSingle();setOpen(data||null)};useEffect(()=>{load()},[])
 async function start(){const {error}=await supabase.rpc('open_cash_register',{p_opening_amount:Number(opening||0)});if(error)alert(error.message);else load()}
 async function close(){if(!open)return;const {error}=await supabase.rpc('close_cash_register',{p_cash_register_id:open.id,p_informed_cash:Number(informed||0)});if(error)alert(error.message);else load()}
 return <div className="panel"><h2>Caixa</h2>{open?<div className="cash-status"><span className="status ok">Caixa aberto</span><p>Aberto em {new Date(open.opened_at).toLocaleString('pt-BR')} · Fundo inicial {money(open.opening_amount)}</p><div className="inline-form"><input type="number" step="0.01" placeholder="Dinheiro contado" value={informed} onChange={e=>setInformed(e.target.value)}/><button onClick={close}>Fechar caixa</button></div></div>:<div><span className="status">Caixa fechado</span><div className="inline-form"><input type="number" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)} placeholder="Fundo inicial"/><button onClick={start}>Abrir caixa</button></div></div>}</div>
}

function Reservations(){
 const [rows,setRows]=useState<Row[]>([]),[form,setForm]=useState<any>({customer_name:'',phone:'',reservation_date:today(),reservation_time:'19:00',party_size:2});const load=async()=>{const {data}=await supabase.from('reservations').select('*').order('reservation_date',{ascending:true}).order('reservation_time');setRows(data||[])};useEffect(()=>{load()},[])
 async function save(e:FormEvent){e.preventDefault();const {error}=await supabase.from('reservations').insert({...form,party_size:Number(form.party_size),status:'pending'});if(error)alert(error.message);else{setForm({...form,customer_name:'',phone:''});load()}}
 async function status(id:string,status:string){await supabase.from('reservations').update({status}).eq('id',id);load()}
 return <div className="grid-two"><div className="panel"><h2>Nova reserva</h2><form className="form-grid" onSubmit={save}><label>Cliente<input required value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/></label><label>Telefone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Data<input type="date" required value={form.reservation_date} onChange={e=>setForm({...form,reservation_date:e.target.value})}/></label><label>Hora<input type="time" value={form.reservation_time} onChange={e=>setForm({...form,reservation_time:e.target.value})}/></label><label>Pessoas<input type="number" min="1" required value={form.party_size} onChange={e=>setForm({...form,party_size:e.target.value})}/></label><button>Salvar reserva</button></form></div><div className="panel"><h2>Reservas</h2>{rows.map(r=><div className="list-row" key={r.id}><div><strong>{r.customer_name}</strong><small>{r.reservation_code} · {r.reservation_date} {r.reservation_time?.slice(0,5)} · {r.party_size} pessoas</small></div><select value={r.status} onChange={e=>status(r.id,e.target.value)}><option value="pending">Pendente</option><option value="confirmed">Confirmada</option><option value="cancelled">Cancelada</option><option value="completed">Concluída</option><option value="no_show">Não compareceu</option></select></div>)}</div></div>
}

function Events(){
 const [rows,setRows]=useState<Row[]>([]),[form,setForm]=useState<any>({name:'',event_date:today(),start_time:'19:00',price:'0',capacity:'0',status:'published'});const load=async()=>{const {data}=await supabase.from('events').select('*').order('event_date',{ascending:true});setRows(data||[])};useEffect(()=>{load()},[])
 async function save(e:FormEvent){e.preventDefault();const {error}=await supabase.from('events').insert({...form,price:Number(form.price),capacity:Number(form.capacity)});if(error)alert(error.message);else{setForm({...form,name:''});load()}}
 return <div className="grid-two"><div className="panel"><h2>Novo evento</h2><form className="form-grid" onSubmit={save}><label>Nome<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Data<input type="date" required value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/></label><label>Horário<input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/></label><label>Preço<input type="number" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Capacidade<input type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label><button>Publicar evento</button></form></div><div className="panel"><h2>Eventos</h2>{rows.map(r=><div className="list-row" key={r.id}><div><strong>{r.name}</strong><small>{r.event_date} · {r.start_time?.slice(0,5)} · {money(r.price)} · {r.capacity} lugares</small></div><span className="status ok">{r.status}</span></div>)}</div></div>
}

const modules:any={Dashboard:Dashboard,Produtos:Products,Estoque:Stock,Mesas:Tables,Comandas:Commands,Caixa:Cash,Reservas:Reservations,Eventos:Events}

function Admin(){
 const [page,setPage]=useState('Dashboard'),[profile,setProfile]=useState<any>(null);const Page=modules[page]||Dashboard
 useEffect(()=>{supabase.from('profiles').select('full_name,roles(label,name)').single().then(({data})=>setProfile(data))},[])
 return <div className="admin"><aside><div><p className="eyebrow">QUINTA</p><strong>da Montanha</strong></div><nav>{Object.keys(modules).map(x=><button key={x} className={page===x?'active':''} onClick={()=>setPage(x)}>{x}</button>)}</nav><button className="logout" onClick={()=>supabase.auth.signOut()}>Sair</button></aside><section><header><div><span>Administração</span><h1>{page}</h1></div><div className="user-chip">{profile?.full_name||'Administrador'}<small>{profile?.roles?.label||''}</small></div></header><Page/></section></div>
}

function Protected({session}:{session:Session|null}){return session?<Admin/>:<Navigate to="/admin/login" replace/>}
export default function App(){const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false);useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[]);if(!ready)return null;return <Routes><Route path="/" element={<Home/>}/><Route path="/admin/login" element={session?<Navigate to="/admin" replace/>:<Login/>}/><Route path="/admin/*" element={<Protected session={session}/>}/></Routes>}
