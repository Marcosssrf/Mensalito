import React, {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import api from '@/services/api'

interface Address { zipCode: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string }
interface Student { id: string; name: string; email: string | null; phone: string | null; document: string | null; active: boolean; createdAt: string; address: Address | null; paymentPreference: 'PIX' | 'BOLETO' | null; trialEndsAt: string | null; inTrial: boolean }
interface Charge { id: string; studentName: string; amount: number; dueDate: string; status: string; paymentDate: string | null; pixCode: string | null; boletoUrl: string | null; checkoutUrl: string | null; createdAt: string }
interface Enrollment { id: string; studentName: string; className: string; planName: string; amount: number; startDate: string; endDate: string | null; active: boolean; createdAt: string }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtDate(s: string | null) { if (!s) return '—'; const [date] = s.split('T'); const [y, m, d] = date.split('-'); return `${d}/${m}/${y}` }
function fmtMonth(dueDate: string) { const [y, m] = dueDate.split('-'); const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']; return `${months[parseInt(m) - 1]}/${y}` }
function initials(name: string) { return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() }
function maskPhone(value: string) { const d = value.replace(/\D/g, '').slice(0, 11); if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2'); return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2') }
function maskDocument(value: string) { const d = value.replace(/\D/g, '').slice(0, 14); if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2') }
function maskZip(v: string) { const d = v.replace(/\D/g, '').slice(0, 8); return d.replace(/(\d{5})(\d{1,3})$/, '$1-$2') }
function paymentMethodLabel(c: Charge) { if (c.pixCode) return 'PIX'; if (c.boletoUrl) return 'Boleto'; if (c.checkoutUrl) return 'Checkout'; return 'Manual' }

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendente',    color: '#b45309', bg: '#fef9c3' },
  PAID:      { label: 'Pago',        color: '#15803d', bg: '#dcfce7' },
  OVERDUE:   { label: 'Atrasado',    color: '#dc2626', bg: '#fee2e2' },
  CANCELLED: { label: 'Cancelado',   color: '#71717a', bg: '#f4f4f5' },
  REFUNDED:  { label: 'Reembolsado', color: '#2563eb', bg: '#dbeafe' },
  LOST:      { label: 'Perdido',     color: '#71717a', bg: '#f4f4f5' },
  DISPUTED:  { label: 'Disputado',   color: '#c2410c', bg: '#ffedd5' },
}

const emptyAddress: Address = { zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' }

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8eaed', borderRadius: 8, fontSize: 13.5, color: '#18181b', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#5c5f6b', display: 'block', marginBottom: 5, letterSpacing: '0.01em' }

function StudentEditModal({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: student.name, email: student.email ?? '', phone: student.phone ?? '', document: student.document ?? '', address: student.address ?? {...emptyAddress}, paymentPreference: student.paymentPreference ?? '' as 'PIX' | 'BOLETO' | '' })
  const [trialOpen, _setTrialOpen] = useState<boolean>(!!(student.trialEndsAt))
  const [trialDate, _setTrialDate] = useState<string>(student.trialEndsAt ?? '')
  const [savingTrial, setSavingTrial] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const [cepError, setCepError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setAddr(field: keyof Address, value: string) { setForm(f => ({ ...f, address: { ...f.address, [field]: value } })) }

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) { setCepError(''); return }
    setLoadingCep(true); setCepError('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) { setCepError('CEP não encontrado') }
      else { setForm(f => ({ ...f, address: { ...f.address, zipCode: `${digits.slice(0,5)}-${digits.slice(5)}`, street: data.logradouro ?? f.address.street, neighborhood: data.bairro ?? f.address.neighborhood, city: data.localidade ?? f.address.city, state: data.uf ?? f.address.state } })) }
    } catch { setCepError('Erro ao buscar CEP') } finally { setLoadingCep(false) }
  }

  async function submit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const hasAddress = Object.values(form.address).some(v => v.trim() !== '')
      await api.patch(`/students/${student.id}`, { ...form, address: hasAddress ? form.address : null, paymentPreference: form.paymentPreference || null })
      // Salva trial separadamente se alterado
      const originalTrial = student.trialEndsAt ?? ''
      const newTrial = trialOpen ? trialDate : ''
      if (newTrial !== originalTrial) {
        setSavingTrial(true)
        await api.patch(`/students/${student.id}/trial`, {
          trialEndsAt: trialOpen && trialDate ? trialDate : null,
        })
      }
      onSaved(); onClose()
    } catch (e: any) { setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erro ao salvar aluno') }
    finally { setLoading(false); setSavingTrial(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 560, maxWidth: '94vw', boxShadow: '0 24px 64px rgba(0,0,0,0.14)', maxHeight: '90vh', overflowY: 'auto', border: '1.5px solid #e8eaed' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#18181b', margin: 0, letterSpacing: '-0.02em' }}>Editar aluno</h2>
              <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Atualize os dados cadastrais.</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#a1a1aa' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', marginBottom: 18 }}>{error}</div>}

          <p style={lbl as any} className="ms-section-label">DADOS PESSOAIS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div><label style={lbl}>Nome completo *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: João da Silva" style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>E-mail</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@email.com" style={inp} /></div>
              <div><label style={lbl}>Telefone</label><input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))} placeholder="(21) 99999-9999" maxLength={15} style={inp} /></div>
            </div>
            <div><label style={lbl}>CPF / Documento</label><input type="text" value={form.document} onChange={e => setForm(f => ({ ...f, document: maskDocument(e.target.value) }))} placeholder="000.000.000-00" maxLength={18} style={inp} /></div>
          </div>

          <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 20, marginBottom: 20 }}>
            <p style={lbl as any} className="ms-section-label">ENDEREÇO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>CEP</label>
                  <input type="text" value={form.address.zipCode} onChange={e => { const v = maskZip(e.target.value); setAddr('zipCode', v); lookupCep(v) }} placeholder="00000-000" maxLength={9} style={{ ...inp, borderColor: cepError && !loadingCep ? '#fca5a5' : '#e8eaed' }} />
                  {loadingCep && <span style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4, display: 'block' }}>Buscando...</span>}
                  {cepError && !loadingCep && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>{cepError}</span>}
                </div>
                <div><label style={lbl}>Bairro</label><input type="text" value={form.address.neighborhood} onChange={e => setAddr('neighborhood', e.target.value)} placeholder="Bairro" style={inp} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
                <div><label style={lbl}>Rua / Logradouro</label><input type="text" value={form.address.street} onChange={e => setAddr('street', e.target.value)} placeholder="Rua das Flores" style={inp} /></div>
                <div><label style={lbl}>Número</label><input type="text" value={form.address.number} onChange={e => setAddr('number', e.target.value)} placeholder="123" style={inp} /></div>
              </div>
              <div><label style={lbl}>Complemento</label><input type="text" value={form.address.complement} onChange={e => setAddr('complement', e.target.value)} placeholder="Apto 42, Bloco B..." style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                <div><label style={lbl}>Cidade</label><input type="text" value={form.address.city} onChange={e => setAddr('city', e.target.value)} placeholder="São Paulo" style={inp} /></div>
                <div><label style={lbl}>UF</label><input type="text" value={form.address.state} onChange={e => setAddr('state', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} style={inp} /></div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 20, marginBottom: 24 }}>
            <p style={lbl as any} className="ms-section-label">PREFERÊNCIA DE PAGAMENTO</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {([['', 'Sem preferência'], ['PIX', 'PIX'], ['BOLETO', 'Boleto']] as const).map(([val, label]) => {
                const selected = form.paymentPreference === val
                return (
                    <button key={val} type="button" onClick={() => setForm(f => ({ ...f, paymentPreference: val }))} style={{ padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: selected ? '2px solid #18181b' : '1.5px solid #e8eaed', background: selected ? '#18181b' : '#fff', color: selected ? '#fff' : '#71717a', transition: 'all 0.13s' }}>
                      {label}
                    </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>Cancelar</button>
            <button onClick={submit} disabled={loading} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#18181b', cursor: 'pointer', fontSize: 13.5, color: '#fff', fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
              {savingTrial ? 'Salvando trial...' : loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
  )
}

function NewChargeModal({ studentId: _studentId, onClose, onCreated }: { studentId: string; onClose: () => void; onCreated: () => void }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ enrollmentId: '', dueDate: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<any>('/enrollments').then(r => {
      const data: Enrollment[] = Array.isArray(r.data) ? r.data : (r.data?.content ?? [])
      setEnrollments(data.filter(e => e.active))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function submit() {
    if (!form.enrollmentId) { setError('Selecione uma matrícula'); return }
    setSaving(true); setError('')
    try { await api.post('/charges', form); onCreated(); onClose() }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Erro ao criar cobrança') }
    finally { setSaving(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.14)', border: '1.5px solid #e8eaed' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Nova cobrança</h2>
          <p style={{ fontSize: 13, color: '#a1a1aa', margin: '0 0 22px' }}>Crie uma cobrança avulsa para este aluno.</p>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}
          {loading ? <p style={{ color: '#a1a1aa', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Carregando...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={lbl}>Matrícula *</label>
                  <select value={form.enrollmentId} onChange={e => setForm(f => ({ ...f, enrollmentId: e.target.value }))} style={{ ...inp, background: '#fff', color: '#18181b' }}>
                    <option value="">Selecione uma matrícula...</option>
                    {enrollments.map(e => <option key={e.id} value={e.id}>{e.className} — {e.planName} ({fmt(e.amount)})</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Data de vencimento *</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={inp} />
                </div>
              </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>Cancelar</button>
            <button onClick={submit} disabled={saving || loading} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#18181b', cursor: 'pointer', fontSize: 13.5, color: '#fff', fontWeight: 600, opacity: (saving || loading) ? 0.5 : 1 }}>
              {saving ? 'Criando...' : 'Criar cobrança'}
            </button>
          </div>
        </div>
      </div>
  )
}

function WhatsAppMessageModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; text: string } | null>(null)
  const maxLen = 4096

  const hasPhone = !!(student.phone && student.phone.trim())

  async function send() {
    if (!message.trim() || sending) return
    setSending(true)
    setResult(null)
    try {
      await api.post(`/students/${student.id}/whatsapp/message`, { message: message.trim() })
      setResult({ success: true, text: 'Mensagem enviada com sucesso!' })
      setMessage('')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao enviar mensagem.'
      setResult({ success: false, text: msg })
    } finally {
      setSending(false)
    }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 480, maxWidth: '94vw', boxShadow: '0 24px 64px rgba(0,0,0,0.16)', border: '1.5px solid #e8eaed' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#16a34a">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M13 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.854L.057 23.428a.5.5 0 0 0 .625.601l5.822-1.526A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S19.627 0 13 0zm0 22c-1.9 0-3.67-.522-5.188-1.429l-.37-.217-3.828 1.003 1.022-3.722-.237-.385A9.96 9.96 0 0 1 3 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#18181b', margin: 0, letterSpacing: '-0.02em' }}>Enviar mensagem</h2>
                <p style={{ fontSize: 12.5, color: '#a1a1aa', margin: '2px 0 0' }}>
                  {hasPhone ? `WhatsApp · ${maskPhone(student.phone!)}` : 'Sem telefone cadastrado'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#a1a1aa' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Aluno */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: '#f9fafb', borderRadius: 9, border: '1px solid #f0f0f0', marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials(student.name)}
            </div>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: '#18181b', margin: 0 }}>{student.name}</p>
              {hasPhone && <p style={{ fontSize: 12, color: '#71717a', margin: 0 }}>{maskPhone(student.phone!)}</p>}
            </div>
          </div>

          {!hasPhone && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 9, padding: '11px 14px', marginBottom: 18, fontSize: 13, color: '#92400e' }}>
                ⚠️ Este aluno não tem telefone cadastrado. Adicione um número na edição do aluno para enviar mensagens.
              </div>
          )}

          {/* Textarea */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#5c5f6b', display: 'block', marginBottom: 6, letterSpacing: '0.01em' }}>
              MENSAGEM
            </label>
            <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, maxLen))}
                disabled={!hasPhone || sending}
                placeholder="Digite a mensagem que será enviada via WhatsApp..."
                rows={5}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8eaed', borderRadius: 9, fontSize: 13.5, color: '#18181b', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55, boxSizing: 'border-box', background: hasPhone ? '#fff' : '#f9fafb', opacity: !hasPhone ? 0.7 : 1 }}
            />
            <p style={{ fontSize: 11.5, color: message.length > maxLen * 0.9 ? '#f59e0b' : '#a1a1aa', margin: '4px 0 0', textAlign: 'right' }}>
              {message.length}/{maxLen}
            </p>
          </div>

          {/* Feedback */}
          {result && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500, background: result.success ? '#dcfce7' : '#fef2f2', border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`, color: result.success ? '#15803d' : '#dc2626' }}>
                {result.text}
              </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>
              {result?.success ? 'Fechar' : 'Cancelar'}
            </button>
            <button
                onClick={send}
                disabled={!hasPhone || !message.trim() || sending}
                style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: (!hasPhone || !message.trim() || sending) ? '#e8eaed' : '#16a34a', cursor: (!hasPhone || !message.trim() || sending) ? 'not-allowed' : 'pointer', fontSize: 13.5, color: (!hasPhone || !message.trim() || sending) ? '#a1a1aa' : '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background 0.15s' }}
            >
              {sending ? (
                  <>
                    <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Enviando...
                  </>
              ) : (
                  <>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Enviar mensagem
                  </>
              )}
            </button>
          </div>
        </div>
      </div>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [student, setStudent]       = useState<Student | null>(null)
  const [charges, setCharges]       = useState<Charge[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading]       = useState(true)
  const [showNewCharge, setShowNewCharge] = useState(false)
  const [showEdit, setShowEdit]     = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  function loadData() {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get(`/students/${id}`),
      api.get(`/enrollments/student/${id}`),
    ]).then(async ([sRes, eRes]) => {
      const s: Student = sRes.data
      setStudent(s)
      const studentEnrollments: Enrollment[] = Array.isArray(eRes.data) ? eRes.data : (eRes.data?.content ?? [])
      setEnrollments(studentEnrollments)

      // Busca cobranças por cada matrícula do aluno
      const chargePromises = studentEnrollments.map((e: Enrollment) =>
        api.get(`/charges?enrollmentId=${e.id}&size=50&sort=dueDate,desc`)
          .then(r => Array.isArray(r.data) ? r.data : (r.data?.content ?? []))
          .catch(() => [] as Charge[])
      )
      const chargeArrays = await Promise.all(chargePromises)
      const allCharges: Charge[] = chargeArrays.flat()
      // Ordena por dueDate desc
      allCharges.sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      setCharges(allCharges)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [id])

  if (loading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, border: '2.5px solid #e8eaed', borderTopColor: '#18181b', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>Carregando...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
  )
  if (!student) return <div style={{ padding: 60, textAlign: 'center', color: '#dc2626', fontSize: 14 }}>Aluno não encontrado.</div>

  const totalPaid    = charges.filter(c => c.status === 'PAID').reduce((s, c) => s + Number(c.amount), 0)
  const paidOnTime   = charges.filter(c => c.status === 'PAID').length
  const totalCharges = charges.length
  const activeEnrollment = enrollments.find(e => e.active)
  const nextDue = activeEnrollment ? (() => {
    const today = new Date()
    const dueDay = charges[0]?.dueDate?.split('-')[2] ?? '05'
    const next = new Date(today.getFullYear(), today.getMonth() + 1, parseInt(dueDay))
    return `${String(next.getDate()).padStart(2,'0')}/${String(next.getMonth()+1).padStart(2,'0')}/${next.getFullYear()}`
  })() : '—'

  const statCards = [
    { label: 'Mensalidade atual', value: activeEnrollment ? fmt(activeEnrollment.amount) : '—', color: '#18181b' },
    { label: 'Total pago', value: fmt(totalPaid), sub: `${totalCharges} cobranças`, color: '#15803d' },
    { label: 'Próximo vencimento', value: nextDue, color: '#18181b' },
    { label: 'Pontualidade', value: totalCharges > 0 ? `${Math.round((paidOnTime/totalCharges)*100)}%` : '—', sub: `${paidOnTime}/${totalCharges} no prazo`, color: '#2563eb' },
  ]

  return (
      <div className="ms-page ms-student-detail-page" style={{ maxWidth: 1240, fontFamily: "'Geist Variable', sans-serif" }}>
        {showNewCharge && <NewChargeModal studentId={student.id} onClose={() => setShowNewCharge(false)} onCreated={loadData} />}
        {showEdit && <StudentEditModal student={student} onClose={() => setShowEdit(false)} onSaved={loadData} />}
        {showWhatsApp && <WhatsAppMessageModal student={student} onClose={() => setShowWhatsApp(false)} />}

        {/* Breadcrumb */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate('/app/students')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa', fontSize: 13, padding: 0, marginBottom: 16, fontFamily: 'inherit' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar para alunos
          </button>

          <div className="ms-page-header ms-student-detail-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div className="ms-student-identity" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials(student.name)}
              </div>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.03em' }}>{student.name}</h1>
                <div className="ms-student-badges" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 100, background: student.active ? '#dcfce7' : '#f4f4f5', color: student.active ? '#15803d' : '#71717a' }}>
                  {student.active ? 'Ativo' : 'Inativo'}
                </span>
                  {student.inTrial && (
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 100, background: '#fef9c3', color: '#a16207' }}>
                    Trial até {fmtDate(student.trialEndsAt)}
                  </span>
                  )}
                  <span style={{ fontSize: 13, color: '#a1a1aa' }}>Aluno desde {fmtDate(student.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="ms-page-actions ms-student-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setShowWhatsApp(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#3f3f46' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Mensagem
              </button>
              <button onClick={() => setShowEdit(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#3f3f46' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Editar
              </button>
              <button onClick={() => setShowNewCharge(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 8, background: '#18181b', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova cobrança
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="ms-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {statCards.map((c, i) => (
              <div key={i} style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: '18px 20px' }}>
                <p style={{ fontSize: 12, color: '#a1a1aa', margin: '0 0 8px', fontWeight: 500 }}>{c.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: c.color, margin: 0, letterSpacing: '-0.02em' }}>{c.value}</p>
                {c.sub && <p style={{ fontSize: 11.5, color: '#a1a1aa', margin: '4px 0 0' }}>{c.sub}</p>}
              </div>
          ))}
        </div>

        {/* Grid */}
        <div className="ms-student-detail-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Contact card */}
            <div className="ms-detail-card" style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: 22 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>Contato</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {student.email && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, background: '#f4f4f5', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </div>
                      <span style={{ fontSize: 13, color: '#3f3f46' }}>{student.email}</span>
                    </div>
                )}
                {student.phone && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, background: '#f4f4f5', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </div>
                      <span style={{ fontSize: 13, color: '#3f3f46' }}>{maskPhone(student.phone)}</span>
                    </div>
                )}
                {student.document && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, background: '#f4f4f5', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
                      </div>
                      <span style={{ fontSize: 13, color: '#3f3f46' }}>{student.document}</span>
                    </div>
                )}
                {student.paymentPreference && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, background: '#f4f4f5', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 100, background: student.paymentPreference === 'PIX' ? '#ede9fe' : '#dbeafe', color: student.paymentPreference === 'PIX' ? '#7c3aed' : '#2563eb' }}>
                    {student.paymentPreference === 'PIX' ? 'PIX' : 'Boleto'}
                  </span>
                    </div>
                )}
              </div>

              {student.trialEndsAt && (
                  <div style={{ borderTop: '1px solid #f4f4f5', marginTop: 16, paddingTop: 16 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Trial</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, background: student.inTrial ? '#fef9c3' : '#f4f4f5', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: student.inTrial ? '#a16207' : '#71717a' }}>TR</div>
                      <div>
                        <p style={{ fontSize: 13, color: '#3f3f46', margin: 0, fontWeight: 500 }}>Até {fmtDate(student.trialEndsAt)}</p>
                        <p style={{ fontSize: 11.5, color: student.inTrial ? '#a16207' : '#a1a1aa', margin: '2px 0 0' }}>
                          {student.inTrial ? 'Em trial — cobranças bloqueadas' : 'Trial encerrado'}
                        </p>
                      </div>
                    </div>
                  </div>
              )}

              {student.address && (student.address.street || student.address.city) && (
                  <div style={{ borderTop: '1px solid #f4f4f5', marginTop: 16, paddingTop: 16 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Endereço</p>
                    <div style={{ fontSize: 13, color: '#3f3f46', lineHeight: 1.6 }}>
                      {student.address.street && <p style={{ margin: '0 0 2px' }}>{student.address.street}{student.address.number ? `, ${student.address.number}` : ''}{student.address.complement ? ` — ${student.address.complement}` : ''}</p>}
                      {student.address.neighborhood && <p style={{ margin: '0 0 2px', color: '#71717a' }}>{student.address.neighborhood}</p>}
                      {(student.address.city || student.address.state) && <p style={{ margin: 0, color: '#71717a' }}>{[student.address.city, student.address.state].filter(Boolean).join(' — ')}{student.address.zipCode ? ` · ${student.address.zipCode}` : ''}</p>}
                    </div>
                  </div>
              )}
            </div>

            {/* Enrollments card */}
            {enrollments.length > 0 && (
                <div className="ms-detail-card" style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: 22 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>Matrículas</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {enrollments.map(e => (
                        <div key={e.id} style={{ padding: '12px 14px', background: '#fafafa', borderRadius: 9, border: '1px solid #f4f4f5' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#18181b', margin: '0 0 2px' }}>{e.className}</p>
                              <p style={{ fontSize: 12, color: '#a1a1aa', margin: 0 }}>{e.planName}</p>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>{fmt(e.amount)}</span>
                          </div>
                          <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 100, background: e.active ? '#dcfce7' : '#f4f4f5', color: e.active ? '#15803d' : '#71717a' }}>
                        {e.active ? 'Ativa' : 'Encerrada'}
                      </span>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
            )}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Payment history */}
            <div className="ms-list-panel" style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, overflow: 'hidden' }}>
              <div className="ms-panel-header" style={{ padding: '18px 22px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#18181b', margin: 0 }}>Histórico de pagamentos</h3>
                <span style={{ fontSize: 12, color: '#a1a1aa' }}>{charges.length} cobranças</span>
              </div>
              <div style={{ padding: '0 22px' }}>
                <div className="ms-table-head" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 0.9fr', padding: '11px 0', borderBottom: '1px solid #f4f4f5' }}>
                  {['MÊS', 'VALOR', 'PAGO EM', 'MÉTODO', 'STATUS'].map(h => (
                      <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>
                {charges.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center' }}>
                      <p style={{ color: '#a1a1aa', fontSize: 13.5 }}>Nenhuma cobrança encontrada.</p>
                    </div>
                ) : charges.slice(0, 12).map((c, i) => {
                  const st = STATUS_META[c.status] ?? { label: c.status, color: '#71717a', bg: '#f4f4f5' }
                  return (
                      <div className="ms-table-row ms-student-charge-row" key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 0.9fr', padding: '13px 0', alignItems: 'center', borderBottom: i < Math.min(charges.length, 12) - 1 ? '1px solid #fafafa' : 'none' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500, color: '#18181b' }}>{fmtMonth(c.dueDate)}</span>
                        <span style={{ fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>{fmt(Number(c.amount))}</span>
                        <span style={{ fontSize: 13, color: '#71717a' }}>{c.paymentDate ? fmtDate(c.paymentDate) : '—'}</span>
                        <span style={{ fontSize: 13, color: '#71717a' }}>{paymentMethodLabel(c)}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: st.bg, color: st.color, display: 'inline-block', width: 'fit-content' }}>{st.label}</span>
                      </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}
