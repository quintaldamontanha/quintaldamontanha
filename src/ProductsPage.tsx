import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Barcode, ChevronLeft, ChevronRight, ImagePlus, MoreHorizontal, PackagePlus, Pencil, Plus, Power, Search, Trash2, UploadCloud, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './products.css'

type Row = Record<string, any>
type ProductForm = {
  code:string; barcode:string; name:string; category_id:string; unit:string
  cost_price:string; sale_price:string; current_stock:string; minimum_stock:string
  show_on_menu:boolean; active:boolean; image_url:string
}

const EMPTY:ProductForm={code:'',barcode:'',name:'',category_id:'',unit:'UN',cost_price:'0,00',sale_price:'0,00',current_stock:'0',minimum_stock:'0',show_on_menu:false,active:true,image_url:''}
const money=(v:unknown)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const numberBR=(v:string|number|null|undefined)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=String(v??'').trim().replace(/\s/g,'');if(!s)return 0;return Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s)||0}
const fieldMoney=(v:unknown)=>Number(v||0).toFixed(2).replace('.',',')
const fieldQty=(v:unknown)=>String(Number(v||0)).replace('.',',')
const pct=(v:number)=>`${v.toFixed(2).replace('.',',')}%`
const errorText=(m:string)=>{const s=m.toLowerCase();if(s.includes('products_code_key')||(s.includes('duplicate')&&s.includes('code')))return'Já existe um produto com este código interno.';if(s.includes('products_barcode_key')||(s.includes('duplicate')&&s.includes('barcode')))return'Já existe um produto com este código de barras.';if(s.includes('row-level security')||s.includes('permission'))return'Seu usuário não possui permissão para executar esta operação.';return m}

export default function ProductsPage(){
  const [rows,setRows]=useState<Row[]>([]),[cats,setCats]=useState<Row[]>([]),[loading,setLoading]=useState(true)
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[status,setStatus]=useState('')
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(20)
  const [modal,setModal]=useState(false),[editing,setEditing]=useState<Row|null>(null),[form,setForm]=useState<ProductForm>(EMPTY)
  const [imageFile,setImageFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('')
  const [menuId,setMenuId]=useState<string|null>(null),[stockTarget,setStockTarget]=useState<Row|null>(null),[stockValue,setStockValue]=useState('0'),[stockSaving,setStockSaving]=useState(false),[deleteTarget,setDeleteTarget]=useState<Row|null>(null)
  const fileRef=useRef<HTMLInputElement>(null)

  async function load(){
    setLoading(true)
    const [p,c]=await Promise.all([
      supabase.from('products').select('*,categories(id,name),stock(quantity)').is('deleted_at',null).order('name'),
      supabase.from('categories').select('id,name,active').eq('active',true).order('name')
    ])
    if(p.error)setMsg(errorText(p.error.message));setRows(p.data||[]);setCats(c.data||[]);setLoading(false)
  }
  useEffect(()=>{load()},[])
  useEffect(()=>{setPage(1)},[query,category,status,pageSize])

  const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('pt-BR');return rows.filter(r=>{const text=[r.code,r.barcode,r.name,r.categories?.name].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');return(!q||text.includes(q))&&(!category||r.category_id===category)&&(!status||(status==='active'?r.active:!r.active))})},[rows,query,category,status])
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize)),currentPage=Math.min(page,totalPages),start=filtered.length?(currentPage-1)*pageSize:0,end=Math.min(start+pageSize,filtered.length),paged=filtered.slice(start,end)
  const visiblePages=useMemo(()=>{const count=Math.min(5,totalPages);let first=Math.max(1,currentPage-2);first=Math.min(first,Math.max(1,totalPages-count+1));return Array.from({length:count},(_,i)=>first+i)},[currentPage,totalPages])
  const margin=useMemo(()=>{const c=numberBR(form.cost_price),s=numberBR(form.sale_price);return s>0?((s-c)/s)*100:0},[form.cost_price,form.sale_price])

  function closeModal(force=false){if(saving&&!force)return;setModal(false);setEditing(null);setForm(EMPTY);setImageFile(null);setPreview('');setMsg('')}
  async function generateCode(){const{data,error}=await supabase.rpc('generate_product_code');if(error)setMsg(errorText(error.message));else setForm(f=>({...f,code:String(data||'')}))}
  async function openNew(){setEditing(null);setForm(EMPTY);setImageFile(null);setPreview('');setMsg('');setModal(true);await generateCode()}
  function openEdit(r:Row){setEditing(r);setForm({code:r.code||'',barcode:r.barcode||'',name:r.name||'',category_id:r.category_id||'',unit:String(r.unit||'UN').toUpperCase(),cost_price:fieldMoney(r.cost_price),sale_price:fieldMoney(r.sale_price),current_stock:fieldQty(r.stock?.[0]?.quantity||0),minimum_stock:fieldQty(r.minimum_stock||0),show_on_menu:Boolean(r.show_on_menu),active:Boolean(r.active),image_url:r.image_url||''});setPreview(r.image_url||'');setImageFile(null);setMsg('');setMenuId(null);setModal(true)}
  function pickImage(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type))return setMsg('Use uma imagem JPG, PNG ou WEBP.');if(f.size>5*1024*1024)return setMsg('A imagem deve ter no máximo 5 MB.');setImageFile(f);setPreview(URL.createObjectURL(f))}
  async function uploadImage(id:string){if(!imageFile)return form.image_url||null;const ext=imageFile.name.split('.').pop()?.toLowerCase()||'jpg',path=`${id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;const{error}=await supabase.storage.from('product-images').upload(path,imageFile,{cacheControl:'3600',upsert:false});if(error)throw error;return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl}
  async function exists(column:'code'|'barcode',value:string,id?:string){if(!value)return false;let q=supabase.from('products').select('id').eq(column,value).limit(1);if(id)q=q.neq('id',id);const{data,error}=await q;if(error)throw error;return Boolean(data?.length)}
  async function applyStock(id:string,current:number,desired:number,reason:string){const delta=desired-current;if(Math.abs(delta)<.000001)return;const{error}=await supabase.from('stock_movements').insert({product_id:id,quantity:Math.abs(delta),type:delta>0?'entry':'adjustment',reason});if(error)throw error}

  async function save(e:FormEvent){
    e.preventDefault();if(saving)return;setMsg('')
    const code=form.code.trim(),barcode=form.barcode.trim(),name=form.name.trim(),cost=numberBR(form.cost_price),sale=numberBR(form.sale_price),desired=numberBR(form.current_stock),minimum=numberBR(form.minimum_stock)
    if(!code)return setMsg('Informe o código interno.');if(!name)return setMsg('Informe a descrição do produto.');if([cost,sale,desired,minimum].some(v=>v<0))return setMsg('Custo, preço e estoques não podem ser negativos.')
    setSaving(true)
    try{
      if(await exists('code',code,editing?.id))throw new Error('Já existe um produto com este código interno.')
      if(await exists('barcode',barcode,editing?.id))throw new Error('Já existe um produto com este código de barras.')
      const payload={code,barcode:barcode||null,name,category_id:form.category_id||null,unit:form.unit.trim().toUpperCase()||'UN',cost_price:cost,sale_price:sale,minimum_stock:minimum,show_on_menu:form.show_on_menu,active:form.active,updated_at:new Date().toISOString()}
      let id=editing?.id as string|undefined;const previous=Number(editing?.stock?.[0]?.quantity||0)
      if(editing){const{error}=await supabase.from('products').update(payload).eq('id',editing.id);if(error)throw error}else{const{data,error}=await supabase.from('products').insert(payload).select('id').single();if(error)throw error;id=data.id}
      if(!id)throw new Error('Não foi possível identificar o produto salvo.')
      const image=await uploadImage(id);if(image&&image!==form.image_url){const{error}=await supabase.from('products').update({image_url:image}).eq('id',id);if(error)throw error}
      await applyStock(id,editing?previous:0,desired,editing?'Ajuste realizado no cadastro do produto':'Estoque inicial do produto')
      await load();closeModal(true)
    }catch(error:any){setMsg(errorText(error?.message||'Não foi possível salvar o produto.'))}finally{setSaving(false)}
  }

  function openStock(r:Row){setStockTarget(r);setStockValue(fieldQty(r.stock?.[0]?.quantity||0));setMenuId(null);setMsg('')}
  async function saveStock(e:FormEvent){e.preventDefault();if(!stockTarget||stockSaving)return;const desired=numberBR(stockValue);if(desired<0)return setMsg('O estoque não pode ser negativo.');setStockSaving(true);try{await applyStock(stockTarget.id,Number(stockTarget.stock?.[0]?.quantity||0),desired,'Ajuste manual na tela de produtos');setStockTarget(null);await load()}catch(error:any){setMsg(errorText(error?.message||'Não foi possível ajustar o estoque.'))}finally{setStockSaving(false)}}
  async function toggleActive(r:Row){setMenuId(null);const{error}=await supabase.from('products').update({active:!r.active,updated_at:new Date().toISOString()}).eq('id',r.id);if(error)setMsg(errorText(error.message));else load()}
  async function confirmDelete(){if(!deleteTarget)return;const{error}=await supabase.from('products').update({deleted_at:new Date().toISOString(),active:false,show_on_menu:false,updated_at:new Date().toISOString()}).eq('id',deleteTarget.id);if(error)setMsg(errorText(error.message));else await load();setDeleteTarget(null);setMenuId(null)}

  return <div className="products-page">
    <div className="products-toolbar">
      <button className="primary-action" onClick={openNew}><Plus size={17}/> Novo produto</button>
      <div className="product-filters">
        <label className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar por código, código de barras, descrição..."/></label>
        <label className="compact-filter"><span>Categoria</span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="compact-filter"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
      </div>
    </div>
    {msg&&!modal&&!stockTarget&&<div className="products-alert">{msg}</div>}

    <section className="products-card">
      <div className="products-card-head"><div><h2>Produtos</h2><p>Cadastro, preços, estoque e disponibilidade.</p></div><span className="record-count">{filtered.length} produto(s)</span></div>
      <div className="products-table-scroll"><table className="products-table"><thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th className="numeric">Custo</th><th className="numeric">Preço de venda</th><th className="numeric">Margem</th><th className="numeric">Estoque</th><th>Status</th><th className="actions-column">Ações</th></tr></thead><tbody>
        {loading?<tr><td colSpan={9} className="empty-state">Carregando produtos...</td></tr>:paged.length===0?<tr><td colSpan={9} className="empty-state"><PackagePlus size={28}/><strong>Nenhum produto encontrado</strong><span>Cadastre um novo produto ou ajuste os filtros.</span></td></tr>:paged.map(r=>{const stock=Number(r.stock?.[0]?.quantity||0),minimum=Number(r.minimum_stock||0),m=Number(r.sale_price)>0?((Number(r.sale_price)-Number(r.cost_price))/Number(r.sale_price))*100:0,low=stock<=minimum;return <tr key={r.id}>
          <td><span className="code-cell">{r.code}</span></td><td><div className="product-name-cell">{r.image_url?<img src={r.image_url} alt=""/>:<span className="product-thumb-placeholder"/>}<div><strong>{r.name}</strong><small>{String(r.unit||'UN').toUpperCase()}</small></div></div></td><td>{r.categories?.name||<span className="muted">Sem categoria</span>}</td><td className="numeric">{money(r.cost_price)}</td><td className="numeric"><strong>{money(r.sale_price)}</strong></td><td className="numeric">{pct(m)}</td><td className="numeric"><div className="stock-cell"><strong>{stock.toLocaleString('pt-BR')}</strong>{low&&<small className="low-stock">Estoque baixo</small>}</div></td><td><span className={`product-status ${r.active?'active':'inactive'}`}>{r.active?'Ativo':'Inativo'}</span></td><td className="actions-column"><div className="row-actions"><button className="icon-button" aria-label="Ações" onClick={()=>setMenuId(menuId===r.id?null:r.id)}><MoreHorizontal size={19}/></button>{menuId===r.id&&<div className="actions-menu"><button onClick={()=>openEdit(r)}><Pencil size={15}/> Editar</button><button onClick={()=>openStock(r)}><PackagePlus size={15}/> Ajustar estoque</button><button onClick={()=>toggleActive(r)}><Power size={15}/> {r.active?'Desativar':'Ativar'}</button><button className="danger-action" onClick={()=>{setDeleteTarget(r);setMenuId(null)}}><Trash2 size={15}/> Excluir</button></div>}</div></td>
        </tr>})}
      </tbody></table></div>
      <div className="products-pagination"><div className="page-summary"><span>{filtered.length?`Mostrando ${start+1}-${end} de ${filtered.length} produtos`:'Nenhum produto'}</span><label><span>Por página</span><select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label></div><div className="page-controls"><button disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft size={16}/> Anterior</button>{visiblePages.map(n=><button key={n} aria-current={n===currentPage?'page':undefined} style={n===currentPage?{background:'#183025',color:'#fff',borderColor:'#183025',minWidth:32,padding:'0 8px'}:{minWidth:32,padding:'0 8px'}} onClick={()=>setPage(n)}>{n}</button>)}<button disabled={currentPage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Próxima <ChevronRight size={16}/></button></div></div>
    </section>

    {modal&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&closeModal()}><div className="product-modal" role="dialog" aria-modal="true"><div className="modal-header"><div><span>{editing?'Editar cadastro':'Novo cadastro'}</span><h2>{editing?editing.name:'Novo produto'}</h2></div><button className="icon-button" type="button" onClick={()=>closeModal()}><X size={20}/></button></div><form onSubmit={save}><div className="modal-body">
      {msg&&<div className="products-alert modal-alert">{msg}</div>}
      <fieldset><legend>Dados principais</legend><div className="form-layout three-columns">
        <label><span>Código interno *</span><div className="code-input-row"><input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/><button type="button" className="secondary-button compact" onClick={generateCode}>Gerar</button></div></label>
        <label><span>Código de barras</span><div className="field-with-icon"><Barcode size={17}/><input value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} inputMode="numeric" autoComplete="off"/></div></label>
        <label><span>Categoria</span><select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Sem categoria</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="span-two"><span>Descrição do produto *</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: COCA-COLA LATA 350ML"/></label>
        <label><span>Unidade de medida</span><select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{['UN','KG','G','L','ML','CX','PCT'].map(u=><option key={u}>{u}</option>)}</select></label>
      </div></fieldset>
      <fieldset><legend>Valores</legend><div className="form-layout three-columns"><label><span>Custo *</span><div className="money-field"><span>R$</span><input required inputMode="decimal" value={form.cost_price} onChange={e=>setForm({...form,cost_price:e.target.value})}/></div></label><label><span>Preço de venda *</span><div className="money-field"><span>R$</span><input required inputMode="decimal" value={form.sale_price} onChange={e=>setForm({...form,sale_price:e.target.value})}/></div></label><label><span>Margem</span><div className="readonly-field">{pct(margin)}</div></label></div></fieldset>
      <fieldset><legend>Estoque</legend><div className="form-layout three-columns"><label><span>Estoque atual</span><input inputMode="decimal" value={form.current_stock} onChange={e=>setForm({...form,current_stock:e.target.value})}/></label><label><span>Estoque mínimo</span><input inputMode="decimal" value={form.minimum_stock} onChange={e=>setForm({...form,minimum_stock:e.target.value})}/></label><div className="stock-note">Valores iguais a 0 são permitidos.</div></div></fieldset>
      <fieldset><legend>Outras informações</legend><div className="product-extra-grid"><div className="image-uploader"><button type="button" className="image-drop" onClick={()=>fileRef.current?.click()}>{preview?<img src={preview} alt="Prévia do produto"/>:<><UploadCloud size={24}/><strong>Imagem do produto</strong><span>JPG, PNG ou WEBP · até 5 MB</span></>}</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickImage}/><button type="button" className="secondary-button" onClick={()=>fileRef.current?.click()}><ImagePlus size={15}/> Escolher imagem</button></div><div className="checkbox-group"><label className="switch-row"><input type="checkbox" checked={form.show_on_menu} onChange={e=>setForm({...form,show_on_menu:e.target.checked})}/><span><strong>Exibir no cardápio</strong><small>Disponibiliza o produto no cardápio público.</small></span></label><label className="switch-row"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><span><strong>Produto ativo</strong><small>Permite usar o produto na operação do sistema.</small></span></label></div></div></fieldset>
    </div><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>closeModal()}>Cancelar</button><button className="primary-action" disabled={saving}>{saving?'Salvando...':'Salvar produto'}</button></div></form></div></div>}

    {stockTarget&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setStockTarget(null)}><div className="small-modal"><div className="modal-header"><div><span>Ajuste de estoque</span><h2>{stockTarget.name}</h2></div><button className="icon-button" onClick={()=>setStockTarget(null)}><X size={20}/></button></div><form onSubmit={saveStock}><div className="small-modal-body">{msg&&<div className="products-alert">{msg}</div>}<label className="standalone-label"><span>Novo estoque</span><input autoFocus inputMode="decimal" value={stockValue} onChange={e=>setStockValue(e.target.value)}/></label><p>Saldo atual: <strong>{Number(stockTarget.stock?.[0]?.quantity||0).toLocaleString('pt-BR')}</strong></p></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>setStockTarget(null)}>Cancelar</button><button className="primary-action" disabled={stockSaving}>{stockSaving?'Salvando...':'Confirmar ajuste'}</button></div></form></div></div>}

    {deleteTarget&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setDeleteTarget(null)}><div className="confirm-modal" role="alertdialog"><div className="confirm-icon"><Trash2 size={22}/></div><h2>Excluir produto?</h2><p>Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>? O produto deixará de aparecer no sistema, mas o histórico operacional será preservado.</p><div className="confirm-actions"><button className="secondary-button" onClick={()=>setDeleteTarget(null)}>Cancelar</button><button className="danger-button" onClick={confirmDelete}>Excluir produto</button></div></div></div>}
  </div>
}
