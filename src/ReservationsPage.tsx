import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './reservations.css'

type Row = Record<string, any>

type ReservationForm = {
  customer_name: string
  phone: string
  reservation_date: string
  reservation_time: string
  party_size: string
  event_id: string
  notes: string
  status: string
}

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY_FORM: ReservationForm = {
  customer_name: '',
  phone: '',
  reservation_date: today(),
  reservation_time: '19:00',
  party_size: '2',
  event_id: '',
  notes: '',
  status: 'pending',
}

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
  no_show: 'Não compareceu',
}

const dateBR = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—'

export default function ReservationsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [events, setEvents] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ReservationForm>(EMPTY_FORM)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  async function load() {
    setLoading(true)
    const [reservationsRes, eventsRes] = await Promise.all([
      supabase
        .from('reservations')
        .select('*,events(id,name,event_date,start_time)')
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true }),
      supabase
        .from('events')
        .select('id,name,event_date,start_time,status')
        .gte('event_date', today())
        .order('event_date', { ascending: true }),
    ])
    if (reservationsRes.error) setMessage(reservationsRes.error.message)
    setRows(reservationsRes.data || [])
    setEvents(eventsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [query, statusFilter, eventFilter, pageSize])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return rows.filter((row) => {
      const searchable = [row.reservation_code, row.customer_name, row.phone, row.events?.name]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      return (!term || searchable.includes(term))
        && (!statusFilter || row.status === statusFilter)
        && (!eventFilter || row.event_id === eventFilter)
    })
  }, [rows, query, statusFilter, eventFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = filtered.length ? (currentPage - 1) * pageSize : 0
  const end = Math.min(start + pageSize, filtered.length)
  const paged = filtered.slice(start, end)

  function openNew() {
    setMessage('')
    setForm({ ...EMPTY_FORM, reservation_date: today() })
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setMessage('')
  }

  function selectEvent(eventId: string) {
    const selected = events.find((item) => item.id === eventId)
    setForm((old) => ({
      ...old,
      event_id: eventId,
      reservation_date: selected?.event_date || old.reservation_date,
      reservation_time: selected?.start_time?.slice(0, 5) || old.reservation_time,
    }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setMessage('')
    if (!form.customer_name.trim()) return setMessage('Informe o nome do cliente.')
    if (Number(form.party_size) < 1) return setMessage('Informe ao menos 1 pessoa.')

    setSaving(true)
    const payload = {
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim() || null,
      reservation_date: form.reservation_date,
      reservation_time: form.reservation_time || null,
      party_size: Number(form.party_size),
      event_id: form.event_id || null,
      notes: form.notes.trim() || null,
      status: form.status,
    }
    const { error } = await supabase.from('reservations').insert(payload)
    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }
    await load()
    setSaving(false)
    setModalOpen(false)
  }

  async function changeStatus(id: string, nextStatus: string) {
    const { error } = await supabase.from('reservations').update({ status: nextStatus }).eq('id', id)
    if (error) setMessage(error.message)
    else load()
  }

  return (
    <div className="reservations-page">
      <div className="reservations-toolbar">
        <button className="primary-action" onClick={openNew}><Plus size={17} /> Nova reserva</button>
        <div className="reservation-filters">
          <label className="search-field" aria-label="Pesquisar reservas">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar cliente, telefone, código ou evento..." />
          </label>
          <label className="compact-filter"><span>Evento</span><select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}><option value="">Todos</option>{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="compact-filter"><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Todos</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
      </div>

      {message && !modalOpen && <div className="reservations-alert" role="alert">{message}</div>}

      <section className="reservations-card">
        <div className="reservations-card-head"><div><h2>Reservas</h2><p>Controle de reservas do restaurante e dos eventos.</p></div><span className="record-count">{filtered.length} reserva(s)</span></div>
        <div className="reservations-table-scroll">
          <table className="reservations-table">
            <thead><tr><th>Código</th><th>Cliente</th><th>Evento</th><th>Data</th><th>Hora</th><th className="numeric">Pessoas</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="reservation-empty">Carregando reservas...</td></tr> : paged.length === 0 ? <tr><td colSpan={7} className="reservation-empty"><CalendarDays size={28} /><strong>Nenhuma reserva encontrada</strong><span>Cadastre uma nova reserva ou ajuste os filtros.</span></td></tr> : paged.map((row) => (
                <tr key={row.id}>
                  <td><span className="reservation-code">{row.reservation_code || '—'}</span></td>
                  <td><strong>{row.customer_name}</strong><small>{row.phone || 'Sem telefone'}</small></td>
                  <td>{row.events?.name ? <span className="event-pill">{row.events.name}</span> : <span className="muted">Sem evento</span>}</td>
                  <td>{dateBR(row.reservation_date)}</td>
                  <td>{row.reservation_time?.slice(0, 5) || '—'}</td>
                  <td className="numeric">{row.party_size}</td>
                  <td><select className={`reservation-status status-${row.status}`} value={row.status} onChange={(e) => changeStatus(row.id, e.target.value)}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="reservations-pagination">
          <div className="page-summary"><span>{filtered.length ? `Mostrando ${start + 1}-${end} de ${filtered.length} reservas` : 'Nenhuma reserva'}</span><label><span>Por página</span><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label></div>
          <div className="page-controls"><button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /> Anterior</button><span className="page-indicator">{currentPage} / {totalPages}</span><button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima <ChevronRight size={16} /></button></div>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="reservation-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title">
          <div className="modal-header"><div><span>Novo cadastro</span><h2 id="reservation-modal-title">Nova reserva</h2></div><button className="icon-button" onClick={closeModal} aria-label="Fechar"><X size={20} /></button></div>
          <form onSubmit={save}>
            <div className="reservation-modal-body">
              {message && <div className="reservations-alert" role="alert">{message}</div>}
              <fieldset><legend>Dados da reserva</legend><div className="reservation-form-grid three-columns">
                <label className="span-two"><span>Cliente *</span><input required autoFocus value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Nome do cliente" /></label>
                <label><span>Telefone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(48) 99999-9999" /></label>
                <label className="span-two"><span>Evento</span><select value={form.event_id} onChange={(e) => selectEvent(e.target.value)}><option value="">Reserva comum / sem evento</option>{events.map((item) => <option key={item.id} value={item.id}>{item.name} — {dateBR(item.event_date)} {item.start_time?.slice(0, 5) || ''}</option>)}</select><small>Ao selecionar um evento, data e horário são preenchidos automaticamente e podem ser ajustados.</small></label>
                <label><span>Pessoas *</span><input type="number" min="1" required value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} /></label>
                <label><span>Data *</span><input type="date" required value={form.reservation_date} onChange={(e) => setForm({ ...form, reservation_date: e.target.value })} /></label>
                <label><span>Hora</span><input type="time" value={form.reservation_time} onChange={(e) => setForm({ ...form, reservation_time: e.target.value })} /></label>
                <label><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="span-three"><span>Observações</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Preferência de mesa, aniversário, acessibilidade, observações do atendimento..." /></label>
              </div></fieldset>
            </div>
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button><button className="primary-action" disabled={saving}>{saving ? 'Salvando...' : 'Salvar reserva'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  )
}
