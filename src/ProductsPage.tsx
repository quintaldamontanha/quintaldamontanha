import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Barcode,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './products.css'

type Row = Record<string, any>

type ProductForm = {
  code: string
  barcode: string
  name: string
  category_id: string
  unit: string
  cost_price: string
  sale_price: string
  current_stock: string
  minimum_stock: string
  show_on_menu: boolean
  active: boolean
  image_url: string
}

const EMPTY_FORM: ProductForm = {
  code: '',
  barcode: '',
  name: '',
  category_id: '',
  unit: 'UN',
  cost_price: '0,00',
  sale_price: '0,00',
  current_stock: '0',
  minimum_stock: '0',
  show_on_menu: false,
  active: true,
  image_url: '',
}

const money = (value: unknown) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const numberBR = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const clean = String(value ?? '').trim().replace(/\s/g, '')
  if (!clean) return 0
  if (clean.includes(',')) return Number(clean.replace(/\./g, '').replace(',', '.')) || 0
  return Number(clean) || 0
}

const currencyField = (value: unknown) => Number(value || 0).toFixed(2).replace('.', ',')
const quantityField = (value: unknown) => String(Number(value || 0)).replace('.', ',')
const pct = (value: number) => `${value.toFixed(2).replace('.', ',')}%`

function dbMessage(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('products_code_key') || lower.includes('duplicate') && lower.includes('code')) {
    return 'Já existe um produto com este código interno.'
  }
  if (lower.includes('products_barcode_key') || lower.includes('duplicate') && lower.includes('barcode')) {
    return 'Já existe um produto com este código de barras.'
  }
  if (lower.includes('row-level security') || lower.includes('permission')) {
    return 'Seu usuário não possui permissão para executar esta operação.'
  }
  return message
}

export default function ProductsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [categories, setCategories] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [stockTarget, setStockTarget] = useState<Row | null>(null)
  const [stockValue, setStockValue] = useState('0')
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [stockSaving, setStockSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from('products')
        .select('*,categories(id,name),stock(quantity)')
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      supabase.from('categories').select('id,name,active').eq('active', true).order('name'),
    ])
    if (productsRes.error) setMessage(dbMessage(productsRes.error.message))
    setRows(productsRes.data || [])
    setCategories(categoriesRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query, category, status, pageSize])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return rows.filter((row) => {
      const categoryName = row.categories?.name || ''
      const searchable = [row.code, row.barcode, row.name, categoryName]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      const matchesText = !term || searchable.includes(term)
      const matchesCategory = !category || row.category_id === category
      const matchesStatus = !status || (status === 'active' ? row.active : !row.active)
      return matchesText && matchesCategory && matchesStatus
    })
  }, [rows, query, category, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = filtered.length ? (currentPage - 1) * pageSize : 0
  const end = Math.min(start + pageSize, filtered.length)
  const paged = filtered.slice(start, end)

  const margin = useMemo(() => {
    const cost = numberBR(form.cost_price)
    const sale = numberBR(form.sale_price)
    return sale > 0 ? ((sale - cost) / sale) * 100 : 0
  }, [form.cost_price, form.sale_price])

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview('')
    setMessage('')
  }

  async function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview('')
    setMessage('')
    setModalOpen(true)
    await generateCode()
  }

  function openEdit(row: Row) {
    setEditing(row)
    setForm({
      code: row.code || '',
      barcode: row.barcode || '',
      name: row.name || '',
      category_id: row.category_id || '',
      unit: String(row.unit || 'UN').toUpperCase(),
      cost_price: currencyField(row.cost_price),
      sale_price: currencyField(row.sale_price),
      current_stock: quantityField(row.stock?.[0]?.quantity || 0),
      minimum_stock: quantityField(row.minimum_stock || 0),
      show_on_menu: Boolean(row.show_on_menu),
      active: Boolean(row.active),
      image_url: row.image_url || '',
    })
    setImagePreview(row.image_url || '')
    setImageFile(null)
    setMessage('')
    setMenuId(null)
    setModalOpen(true)
  }

  async function generateCode() {
    const { data, error } = await supabase.rpc('generate_product_code')
    if (error) {
      setMessage(dbMessage(error.message))
      return
    }
    setForm((old) => ({ ...old, code: String(data || '') }))
  }

  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Use uma imagem JPG, PNG ou WEBP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('A imagem deve ter no máximo 5 MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(productId: string) {
    if (!imageFile) return form.image_url || null
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${productId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, imageFile, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function codeExists(code: string, id?: string) {
    let check = supabase.from('products').select('id').eq('code', code).limit(1)
    if (id) check = check.neq('id', id)
    const { data, error } = await check
    if (error) throw error
    return Boolean(data?.length)
  }

  async function barcodeExists(barcode: string, id?: string) {
    if (!barcode) return false
    let check = supabase.from('products').select('id').eq('barcode', barcode).limit(1)
    if (id) check = check.neq('id', id)
    const { data, error } = await check
    if (error) throw error
    return Boolean(data?.length)
  }

  async function applyStock(productId: string, current: number, desired: number, reason: string) {
    const delta = desired - current
    if (Math.abs(delta) < 0.000001) return
    const movement = delta > 0
      ? { product_id: productId, quantity: delta, type: 'entry', reason }
      : { product_id: productId, quantity: Math.abs(delta), type: 'adjustment', reason }
    const { error } = await supabase.from('stock_movements').insert(movement)
    if (error) throw error
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setMessage('')

    const code = form.code.trim()
    const barcode = form.barcode.trim()
    const name = form.name.trim()
    const cost = numberBR(form.cost_price)
    const sale = numberBR(form.sale_price)
    const desiredStock = numberBR(form.current_stock)
    const minimumStock = numberBR(form.minimum_stock)

    if (!code) return setMessage('Informe o código interno.')
    if (!name) return setMessage('Informe a descrição do produto.')
    if (cost < 0 || sale < 0 || desiredStock < 0 || minimumStock < 0) {
      return setMessage('Custo, preço e estoques não podem ser negativos.')
    }

    setSaving(true)
    try {
      if (await codeExists(code, editing?.id)) throw new Error('Já existe um produto com este código interno.')
      if (await barcodeExists(barcode, editing?.id)) throw new Error('Já existe um produto com este código de barras.')

      const payload = {
        code,
        barcode: barcode || null,
        name,
        category_id: form.category_id || null,
        unit: form.unit.trim().toUpperCase() || 'UN',
        cost_price: cost,
        sale_price: sale,
        minimum_stock: minimumStock,
        show_on_menu: form.show_on_menu,
        active: form.active,
        updated_at: new Date().toISOString(),
      }

      let productId = editing?.id as string | undefined
      const previousStock = Number(editing?.stock?.[0]?.quantity || 0)

      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        productId = data.id
      }

      if (!productId) throw new Error('Não foi possível identificar o produto salvo.')

      const imageUrl = await uploadImage(productId)
      if (imageUrl && imageUrl !== form.image_url) {
        const { error } = await supabase.from('products').update({ image_url: imageUrl }).eq('id', productId)
        if (error) throw error
      }

      await applyStock(
        productId,
        editing ? previousStock : 0,
        desiredStock,
        editing ? 'Ajuste realizado no cadastro do produto' : 'Estoque inicial do produto',
      )

      await load()
      closeModal()
    } catch (error: any) {
      setMessage(dbMessage(error?.message || 'Não foi possível salvar o produto.'))
    } finally {
      setSaving(false)
    }
  }

  function openStock(row: Row) {
    setStockTarget(row)
    setStockValue(quantityField(row.stock?.[0]?.quantity || 0))
    setMenuId(null)
    setMessage('')
  }

  async function saveStock(event: FormEvent) {
    event.preventDefault()
    if (!stockTarget || stockSaving) return
    const desired = numberBR(stockValue)
    if (desired < 0) return setMessage('O estoque não pode ser negativo.')
    setStockSaving(true)
    try {
      await applyStock(
        stockTarget.id,
        Number(stockTarget.stock?.[0]?.quantity || 0),
        desired,
        'Ajuste manual na tela de produtos',
      )
      setStockTarget(null)
      await load()
    } catch (error: any) {
      setMessage(dbMessage(error?.message || 'Não foi possível ajustar o estoque.'))
    } finally {
      setStockSaving(false)
    }
  }

  async function toggleActive(row: Row) {
    setMenuId(null)
    const { error } = await supabase
      .from('products')
      .update({ active: !row.active, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) setMessage(dbMessage(error.message))
    else load()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('products')
      .update({
        deleted_at: new Date().toISOString(),
        active: false,
        show_on_menu: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deleteTarget.id)
    if (error) setMessage(dbMessage(error.message))
    else await load()
    setDeleteTarget(null)
    setMenuId(null)
  }

  return (
    <div className="products-page">
      <div className="products-toolbar">
        <button className="primary-action" onClick={openNew}>
          <Plus size={17} /> Novo produto
        </button>

        <div className="product-filters">
          <label className="search-field" aria-label="Pesquisar produtos">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por código, código de barras, descrição..."
            />
          </label>
          <label className="compact-filter">
            <span>Categoria</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Todas</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="compact-filter">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </label>
        </div>
      </div>

      {message && !modalOpen && !stockTarget && (
        <div className="products-alert" role="alert">{message}</div>
      )}

      <section className="products-card">
        <div className="products-card-head">
          <div>
            <h2>Produtos</h2>
            <p>Cadastro, preços, estoque e disponibilidade.</p>
          </div>
          <span className="record-count">{filtered.length} produto(s)</span>
        </div>

        <div className="products-table-scroll">
          <table className="products-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th className="numeric">Custo</th>
                <th className="numeric">Preço de venda</th>
                <th className="numeric">Margem</th>
                <th className="numeric">Estoque</th>
                <th>Status</th>
                <th className="actions-column">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="empty-state">Carregando produtos...</td></tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-state">
                    <PackagePlus size={28} />
                    <strong>Nenhum produto encontrado</strong>
                    <span>Cadastre um novo produto ou ajuste os filtros.</span>
                  </td>
                </tr>
              ) : paged.map((row) => {
                const currentStock = Number(row.stock?.[0]?.quantity || 0)
                const minimum = Number(row.minimum_stock || 0)
                const rowMargin = Number(row.sale_price) > 0
                  ? ((Number(row.sale_price) - Number(row.cost_price)) / Number(row.sale_price)) * 100
                  : 0
                const lowStock = currentStock <= minimum
                return (
                  <tr key={row.id}>
                    <td><span className="code-cell">{row.code}</span></td>
                    <td>
                      <div className="product-name-cell">
                        {row.image_url ? <img src={row.image_url} alt="" /> : <span className="product-thumb-placeholder" />}
                        <div><strong>{row.name}</strong><small>{String(row.unit || 'UN').toUpperCase()}</small></div>
                      </div>
                    </td>
                    <td>{row.categories?.name || <span className="muted">Sem categoria</span>}</td>
                    <td className="numeric">{money(row.cost_price)}</td>
                    <td className="numeric"><strong>{money(row.sale_price)}</strong></td>
                    <td className="numeric">{pct(rowMargin)}</td>
                    <td className="numeric">
                      <div className="stock-cell">
                        <strong>{currentStock.toLocaleString('pt-BR')}</strong>
                        {lowStock && <small className="low-stock">Estoque baixo</small>}
                      </div>
                    </td>
                    <td><span className={`product-status ${row.active ? 'active' : 'inactive'}`}>{row.active ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="actions-column">
                      <div className="row-actions">
                        <button className="icon-button" aria-label="Ações do produto" onClick={() => setMenuId(menuId === row.id ? null : row.id)}>
                          <MoreHorizontal size={19} />
                        </button>
                        {menuId === row.id && (
                          <div className="actions-menu">
                            <button onClick={() => openEdit(row)}><Pencil size={15} /> Editar</button>
                            <button onClick={() => openStock(row)}><PackagePlus size={15} /> Ajustar estoque</button>
                            <button onClick={() => toggleActive(row)}><Power size={15} /> {row.active ? 'Desativar' : 'Ativar'}</button>
                            <button className="danger-action" onClick={() => { setDeleteTarget(row); setMenuId(null) }}><Trash2 size={15} /> Excluir</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="products-pagination">
          <div className="page-summary">
            <span>{filtered.length ? `Mostrando ${start + 1}-${end} de ${filtered.length} produtos` : 'Nenhum produto'}</span>
            <label>
              <span>Por página</span>
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div className="page-controls">
            <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /> Anterior</button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima <ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
            <div className="modal-header">
              <div><span>{editing ? 'Editar cadastro' : 'Novo cadastro'}</span><h2 id="product-modal-title">{editing ? editing.name : 'Novo produto'}</h2></div>
              <button className="icon-button" onClick={closeModal} aria-label="Fechar"><X size={20} /></button>
            </div>

            <form onSubmit={save}>
              <div className="modal-body">
                {message && <div className="products-alert modal-alert" role="alert">{message}</div>}

                <fieldset>
                  <legend>Dados principais</legend>
                  <div className="form-layout three-columns">
                    <label>
                      <span>Código interno *</span>
                      <div className="code-input-row">
                        <input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} autoComplete="off" />
                        <button type="button" className="secondary-button compact" onClick={generateCode}>Gerar</button>
                      </div>
                    </label>
                    <label>
                      <span>Código de barras</span>
                      <div className="field-with-icon">
                        <Barcode size={17} />
                        <input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} inputMode="numeric" autoComplete="off" />
                      </div>
                    </label>
                    <label>
                      <span>Categoria</span>
                      <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
                        <option value="">Sem categoria</option>
                        {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <label className="span-two">
                      <span>Descrição do produto *</span>
                      <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: COCA-COLA LATA 350ML" />
                    </label>
                    <label>
                      <span>Unidade de medida</span>
                      <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
                        {['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT'].map((unit) => <option key={unit}>{unit}</option>)}
                      </select>
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Valores</legend>
                  <div className="form-layout three-columns">
                    <label>
                      <span>Custo *</span>
                      <div className="money-field"><span>R$</span><input required inputMode="decimal" value={form.cost_price} onChange={(event) => setForm({ ...form, cost_price: event.target.value })} /></div>
                    </label>
                    <label>
                      <span>Preço de venda *</span>
                      <div className="money-field"><span>R$</span><input required inputMode="decimal" value={form.sale_price} onChange={(event) => setForm({ ...form, sale_price: event.target.value })} /></div>
                    </label>
                    <label>
                      <span>Margem</span>
                      <div className="readonly-field">{pct(margin)}</div>
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Estoque</legend>
                  <div className="form-layout three-columns">
                    <label>
                      <span>Estoque atual</span>
                      <input inputMode="decimal" value={form.current_stock} onChange={(event) => setForm({ ...form, current_stock: event.target.value })} />
                    </label>
                    <label>
                      <span>Estoque mínimo</span>
                      <input inputMode="decimal" value={form.minimum_stock} onChange={(event) => setForm({ ...form, minimum_stock: event.target.value })} />
                    </label>
                    <div className="stock-note">Valores iguais a 0 são permitidos.</div>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Outras informações</legend>
                  <div className="product-extra-grid">
                    <div className="image-uploader">
                      <button type="button" className="image-drop" onClick={() => fileRef.current?.click()}>
                        {imagePreview ? <img src={imagePreview} alt="Prévia do produto" /> : <><UploadCloud size={24} /><strong>Imagem do produto</strong><span>JPG, PNG ou WEBP · até 5 MB</span></>}
                      </button>
                      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickImage} />
                      <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><ImagePlus size={15} /> Escolher imagem</button>
                    </div>
                    <div className="checkbox-group">
                      <label className="switch-row"><input type="checkbox" checked={form.show_on_menu} onChange={(event) => setForm({ ...form, show_on_menu: event.target.checked })} /><span><strong>Exibir no cardápio</strong><small>Disponibiliza o produto no cardápio público.</small></span></label>
                      <label className="switch-row"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span><strong>Produto ativo</strong><small>Permite usar o produto na operação do sistema.</small></span></label>
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button>
                <button className="primary-action" disabled={saving}>{saving ? 'Salvando...' : 'Salvar produto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setStockTarget(null)}>
          <div className="small-modal" role="dialog" aria-modal="true">
            <div className="modal-header"><div><span>Ajuste de estoque</span><h2>{stockTarget.name}</h2></div><button className="icon-button" onClick={() => setStockTarget(null)}><X size={20} /></button></div>
            <form onSubmit={saveStock}>
              <div className="small-modal-body">
                {message && <div className="products-alert">{message}</div>}
                <label className="standalone-label"><span>Novo estoque</span><input autoFocus inputMode="decimal" value={stockValue} onChange={(event) => setStockValue(event.target.value)} /></label>
                <p>Saldo atual: <strong>{Number(stockTarget.stock?.[0]?.quantity || 0).toLocaleString('pt-BR')}</strong></p>
              </div>
              <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setStockTarget(null)}>Cancelar</button><button className="primary-action" disabled={stockSaving}>{stockSaving ? 'Salvando...' : 'Confirmar ajuste'}</button></div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteTarget(null)}>
          <div className="confirm-modal" role="alertdialog" aria-modal="true">
            <div className="confirm-icon"><Trash2 size={22} /></div>
            <h2>Excluir produto?</h2>
            <p>Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>? O produto deixará de aparecer no sistema, mas o histórico operacional será preservado.</p>
            <div className="confirm-actions"><button className="secondary-button" onClick={() => setDeleteTarget(null)}>Cancelar</button><button className="danger-button" onClick={confirmDelete}>Excluir produto</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
