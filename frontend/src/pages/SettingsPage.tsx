import {useEffect, useRef, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import api from '@/services/api'

function maskDocument(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
function validateCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0
  if (r !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0
  return r === parseInt(digits[10])
}
function validateCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false
  const calc = (d: string, n: number) => {
    let s = 0, p = n
    for (let i = 0; i < d.length; i++) { s += parseInt(d[i]) * p--; if (p < 2) p = 9 }
    const r = s % 11; return r < 2 ? 0 : 11 - r
  }
  return calc(digits.slice(0, 12), 5) === parseInt(digits[12]) &&
      calc(digits.slice(0, 13), 6) === parseInt(digits[13])
}
function validateDocument(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) return validateCpf(digits)
  if (digits.length === 14) return validateCnpj(digits)
  return false
}
function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

type Tab = 'Escola' | 'Conta' | 'Integrações' | 'Convites'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface TenantData { id: string; name: string; email: string | null; phone: string | null; document: string | null; active: boolean; createdAt: string; hasMercadoPagoApi?: boolean }
interface InviteResponse { id: string; email: string; role: string; inviteUrl: string; expiresAt: string }

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e8eaed', borderRadius: 8, fontSize: 13.5, color: '#18181b', outline: 'none', boxSizing: 'border-box', background: '#fff', transition: 'border-color 0.15s', fontFamily: 'inherit' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#5c5f6b', display: 'block', marginBottom: 5, letterSpacing: '0.01em' }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'start', gap: 20, paddingBottom: 18, borderBottom: '1px solid #f4f4f5', marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: '#3f3f46', margin: 0 }}>{label}</p>
          {hint && <p style={{ fontSize: 12, color: '#a1a1aa', margin: '3px 0 0' }}>{hint}</p>}
        </div>
        <div>{children}</div>
      </div>
  )
}

function IntegrationCard({ acronym, name, description, connected, connectedLabel, onManage }: { acronym: string; name: string; description: string; connected: boolean; connectedLabel?: string; onManage: () => void }) {
  return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid #f4f4f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#52525b', flexShrink: 0 }}>{acronym}</div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#18181b', margin: 0 }}>{name}</p>
            <p style={{ fontSize: 12.5, color: '#71717a', margin: '2px 0 0' }}>{description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: connected ? '#f0fdf4' : '#f4f4f5', border: `1px solid ${connected ? '#bbf7d0' : '#e8eaed'}` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#22c55e' : '#d1d5db' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: connected ? '#15803d' : '#71717a' }}>{connected ? (connectedLabel ?? 'Conectado') : 'Não conectado'}</span>
          </div>
          <button onClick={onManage} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#3f3f46' }}>
            Gerenciar
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>
      </div>
  )
}

function MercadoPagoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    if (!key.trim()) { setError('Insira a chave de API'); return }
    setLoading(true)
    try { await api.put('/tenants/me/api-key', { mercadoPagoApi: key }); onSaved(); onClose() }
    catch (e: any) { setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erro ao salvar chave') }
    finally { setLoading(false) }
  }
  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.14)', border: '1.5px solid #e8eaed' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Mercado Pago · Chave de API</h2>
          <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 24px' }}>Sua chave é armazenada de forma criptografada e nunca exibida novamente.</p>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}
          <label style={lbl}>Chave de API (Access Token)</label>
          <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="APP_USR-..." autoComplete="off" style={{ ...inp, marginBottom: 24 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, color: '#3f3f46' }}>Cancelar</button>
            <button onClick={save} disabled={loading} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#18181b', cursor: 'pointer', fontSize: 13.5, color: '#fff', fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Salvando...' : 'Salvar chave'}
            </button>
          </div>
        </div>
      </div>
  )
}

function WhatsAppModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [status, setStatus] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading')
  const [qr, setQr] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { loadStatus(); return () => { if (pollRef.current) clearInterval(pollRef.current) } }, [])

  async function loadStatus() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setStatus('loading'); setErrorMsg('')
    try {
      const res = await api.get<{ connected: boolean; instanceName: string | null; qrCodeBase64: string | null }>('/tenants/me/whatsapp')
      const data = res.data
      setInstanceName(data.instanceName)
      if (data.connected) { setStatus('connected'); onConnected(); return }
      if (data.qrCodeBase64) {
        setQr(data.qrCodeBase64); setStatus('qr')
        pollRef.current = setInterval(async () => {
          try {
            const poll = await api.get<{ connected: boolean; qrCodeBase64: string | null }>('/tenants/me/whatsapp')
            if (poll.data.connected) { clearInterval(pollRef.current!); setStatus('connected'); onConnected() }
            else if (poll.data.qrCodeBase64 && poll.data.qrCodeBase64 !== qr) setQr(poll.data.qrCodeBase64)
          } catch {}
        }, 4000)
      } else { setErrorMsg('Não foi possível gerar o QR Code.'); setStatus('error') }
    } catch (e: any) { setErrorMsg(e?.response?.data?.message ?? 'Erro ao conectar com o servidor.'); setStatus('error') }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.14)', border: '1.5px solid #e8eaed' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>WhatsApp · Conectar</h2>
          <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 24px' }}>Escaneie o QR Code com o WhatsApp para ativar o envio de mensagens automáticas.</p>
          {status === 'loading' && <div style={{ textAlign: 'center', padding: '32px 0', color: '#a1a1aa', fontSize: 14 }}><div style={{ width: 32, height: 32, border: '2.5px solid #e8eaed', borderTopColor: '#18181b', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.7s linear infinite' }} />Carregando QR Code...</div>}
          {status === 'error' && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{errorMsg}</div>}
          {status === 'connected' && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 }}><span style={{ fontSize: 28 }}>✅</span><span style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>WhatsApp conectado!</span>{instanceName && <span style={{ fontSize: 12, color: '#71717a' }}>Instância: {instanceName}</span>}</div>}
          {status === 'qr' && qr && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR Code" style={{ width: 220, height: 220, border: '1px solid #e8eaed', borderRadius: 10, margin: '0 auto' }} />
                <p style={{ fontSize: 13, color: '#71717a', marginTop: 10 }}>Abra o WhatsApp → <strong>Dispositivos conectados</strong> → Escanear QR Code</p>
                {instanceName && <p style={{ fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>Instância: <code style={{ background: '#f4f4f5', padding: '2px 6px', borderRadius: 4 }}>{instanceName}</code></p>}
              </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, color: '#3f3f46' }}>Fechar</button>
            {status !== 'connected' && <button onClick={loadStatus} disabled={status === 'loading'} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#18181b', cursor: 'pointer', fontSize: 13.5, color: '#fff', fontWeight: 600, opacity: status === 'loading' ? 0.5 : 1 }}>{status === 'loading' ? 'Carregando...' : 'Atualizar QR'}</button>}
          </div>
        </div>
      </div>
  )
}

function InvitesTab() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'TEACHER' | 'OWNER'>('TEACHER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState<InviteResponse | null>(null)
  const [copied, setCopied] = useState(false)

  async function createInvite() {
    setLoading(true); setError(''); setInvite(null)
    try {
      const res = await api.post<InviteResponse>('/invites', { role, email: email.trim() || null })
      setInvite(res.data); setEmail('')
    } catch (e: any) { setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao criar convite') }
    finally { setLoading(false) }
  }

  function copyLink() {
    if (!invite?.inviteUrl) return
    navigator.clipboard.writeText(invite.inviteUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
      <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Convites</h2>
        <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 24px' }}>Convide professores para acessar o sistema. O link expira em 7 dias.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 440 }}>
          <div>
            <label style={lbl}>E-mail do convidado <span style={{ color: '#d4d4d8', fontWeight: 400 }}>(opcional)</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="professor@escola.com" style={inp} />
          </div>
          <div>
            <label style={lbl}>Função</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['TEACHER', 'OWNER'] as const).map(r => (
                  <button key={r} onClick={() => setRole(r)} style={{ padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${role === r ? '#18181b' : '#e8eaed'}`, background: role === r ? '#18181b' : '#fff', color: role === r ? '#fff' : '#3f3f46', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s' }}>
                    {r === 'TEACHER' ? 'Professor' : 'Dono'}
                  </button>
              ))}
            </div>
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626' }}>{error}</div>}
          {invite && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', margin: '0 0 6px' }}>✓ {invite.email ? `Convite criado para ${invite.email}` : 'Convite genérico criado'}</p>
                <p style={{ fontSize: 12, color: '#71717a', margin: '0 0 10px' }}>Expira em: {new Date(invite.expiresAt).toLocaleString('pt-BR')}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, color: '#3f3f46', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invite.inviteUrl}</span>
                  <button onClick={copyLink} style={{ flexShrink: 0, fontSize: 12, padding: '4px 12px', border: '1.5px solid #e8eaed', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#3f3f46', fontWeight: 500 }}>
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
          )}
          <button onClick={createInvite} disabled={loading} style={{ padding: '10px 0', border: 'none', borderRadius: 8, background: '#18181b', cursor: 'pointer', fontSize: 13.5, color: '#fff', fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Criando...' : 'Criar convite'}
          </button>
        </div>
      </div>
  )
}

function AccountTab() {
  const { user } = useAuth()
  const [nameForm, setNameForm] = useState({ name: '', email: '' })
  const [pwForm, setPwForm]     = useState({ password: '', confirm: '' })
  const [nameSave, setNameSave] = useState<SaveState>('idle')
  const [pwSave, setPwSave]     = useState<SaveState>('idle')
  const [pwError, setPwError]   = useState('')
  const [userId, setUserId]     = useState<string | null>(null)

  useEffect(() => {
    api.get<{ id: string; name: string; email: string }>('/users/me')
        .then(r => { setUserId(r.data.id); setNameForm({ name: r.data.name ?? '', email: '' }) })
        .catch(() => {
          const stored = localStorage.getItem('user')
          if (stored) { const u = JSON.parse(stored); setUserId(u.userId ?? u.id ?? null); setNameForm({ name: u.name ?? '', email: '' }) }
        })
  }, [user])

  async function saveProfile() {
    if (!userId) return
    setNameSave('saving')
    try {
      await api.patch(`/users/${userId}`, { name: nameForm.name, email: nameForm.email || undefined })
      const stored = localStorage.getItem('user')
      if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), name: nameForm.name }))
      localStorage.setItem('userName', nameForm.name)
      setNameSave('saved'); setTimeout(() => setNameSave('idle'), 2500)
    } catch { setNameSave('error'); setTimeout(() => setNameSave('idle'), 2500) }
  }

  async function changePassword() {
    setPwError('')
    if (!pwForm.password || pwForm.password.length < 6) { setPwError('Senha deve ter no mínimo 6 caracteres'); return }
    if (pwForm.password !== pwForm.confirm) { setPwError('As senhas não coincidem'); return }
    if (!userId) return
    setPwSave('saving')
    try {
      await api.patch(`/users/${userId}/password`, { password: pwForm.password })
      setPwForm({ password: '', confirm: '' }); setPwSave('saved'); setTimeout(() => setPwSave('idle'), 2500)
    } catch (e: any) { setPwError(e?.response?.data?.message ?? 'Erro ao alterar senha'); setPwSave('error'); setTimeout(() => setPwSave('idle'), 2500) }
  }

  const saveBtnStyle = (state: SaveState): React.CSSProperties => ({
    padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff',
    background: state === 'saved' ? '#22c55e' : state === 'error' ? '#ef4444' : '#18181b',
  })

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Meu perfil</h2>
              <p style={{ fontSize: 13, color: '#71717a' }}>Nome e e-mail da sua conta.</p>
            </div>
            <button onClick={saveProfile} style={saveBtnStyle(nameSave)}>{nameSave === 'saving' ? 'Salvando...' : nameSave === 'saved' ? '✓ Salvo' : nameSave === 'error' ? 'Erro' : 'Salvar'}</button>
          </div>
          <Field label="Nome"><input value={nameForm.name} onChange={e => setNameForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome" style={inp} /></Field>
          <Field label="Novo e-mail" hint="Opcional — deixe em branco para não alterar"><input type="email" value={nameForm.email} onChange={e => setNameForm(f => ({ ...f, email: e.target.value }))} placeholder="novo@email.com" style={inp} /></Field>
        </div>

        <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Alterar senha</h2>
              <p style={{ fontSize: 13, color: '#71717a' }}>Mínimo 6 caracteres.</p>
            </div>
            <button onClick={changePassword} style={saveBtnStyle(pwSave)}>{pwSave === 'saving' ? 'Salvando...' : pwSave === 'saved' ? '✓ Alterada' : pwSave === 'error' ? 'Erro' : 'Alterar'}</button>
          </div>
          {pwError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{pwError}</div>}
          <Field label="Nova senha"><input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" style={inp} /></Field>
          <Field label="Confirmar senha"><input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" style={inp} /></Field>
        </div>
      </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Escola')
  const [tenant, setTenant]       = useState<TenantData | null>(null)
  const [form, setForm]           = useState({ name: '', email: '', phone: '', document: '' })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')

  const [mercadoPagoConnected, setMercadoPagoConnected]       = useState(() => localStorage.getItem('mercadopago_configured') === '1')
  const [showMercadoPagoModal, setShowMercadoPagoModal]       = useState(false)
  const [showMercadoPagoConfirm, setShowMercadoPagoConfirm]   = useState(false)
  const [waConnected, setWaConnected]   = useState(false)
  const [showWaModal, setShowWaModal]   = useState(false)

  useEffect(() => {
    if (!user) return
    api.get<TenantData>('/tenants/me').then(r => {
      setTenant(r.data)
      setForm({ name: r.data.name ?? '', email: r.data.email ?? '', phone: r.data.phone ?? '', document: r.data.document ?? '' })
      localStorage.setItem('tenantName', r.data.name ?? '')
      if (r.data.hasMercadoPagoApi !== undefined) {
        setMercadoPagoConnected(r.data.hasMercadoPagoApi)
        localStorage.setItem('mercadopago_configured', r.data.hasMercadoPagoApi ? '1' : '0')
      }
    }).catch(console.error)
  }, [user])

  useEffect(() => {
    if (!user) return
    api.get<{ connected: boolean }>('/tenants/me/whatsapp').then(r => setWaConnected(r.data.connected)).catch(() => setWaConnected(false))
  }, [showWaModal, user])

  async function saveSchool() {
    if (!form.name.trim()) return
    setSaveError('')
    const docDigits = (form.document ?? '').replace(/\D/g, '')
    if (docDigits.length > 0 && !validateDocument(form.document ?? '')) {
      setSaveError('CPF ou CNPJ inválido. Verifique os dígitos informados.')
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
      return
    }
    setSaveState('saving')
    try { await api.patch('/tenants/me', form); localStorage.setItem('tenantName', form.name); setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2500) }
    catch { setSaveState('error'); setTimeout(() => setSaveState('idle'), 2500) }
  }

  const isOwner = user?.role === 'OWNER'
  const tabs: Tab[] = isOwner ? ['Escola', 'Conta', 'Integrações', 'Convites'] : ['Escola', 'Conta']

  const saveBtnBg = saveState === 'saved' ? '#22c55e' : saveState === 'error' ? '#ef4444' : '#18181b'

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto', fontFamily: "'Geist Variable', sans-serif" }}>
        {/* Modals */}
        {showMercadoPagoConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.14)', border: '1.5px solid #e8eaed' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#18181b', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Trocar chave do Mercado Pago?</h2>
                <p style={{ fontSize: 14, color: '#71717a', margin: '0 0 6px', lineHeight: 1.6 }}>Você já possui uma chave configurada. Ao substituir, a chave anterior será permanentemente removida.</p>
                <p style={{ fontSize: 13, color: '#a1a1aa', margin: '0 0 28px', lineHeight: 1.6 }}>Cobranças em andamento podem ser afetadas caso a nova chave seja de uma conta diferente.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowMercadoPagoConfirm(false)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#18181b', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff' }}>Cancelar</button>
                  <button onClick={() => { setShowMercadoPagoConfirm(false); setShowMercadoPagoModal(true) }} style={{ flex: 1, padding: '10px 0', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, color: '#71717a' }}>Sim, trocar</button>
                </div>
              </div>
            </div>
        )}
        {showMercadoPagoModal && <MercadoPagoModal onClose={() => setShowMercadoPagoModal(false)} onSaved={() => { localStorage.setItem('mercadopago_configured', '1'); setMercadoPagoConnected(true) }} />}
        {showWaModal && <WhatsAppModal onClose={() => setShowWaModal(false)} onConnected={() => setWaConnected(true)} />}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.09em', textTransform: 'uppercase', margin: '0 0 4px' }}>Conta</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#18181b', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Configurações</h1>
            <p style={{ fontSize: 14, color: '#71717a' }}>Dados da escola, integrações e preferências.</p>
          </div>
          {activeTab === 'Escola' && (
              <button onClick={saveSchool} style={{ padding: '9px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff', background: saveBtnBg, transition: 'background 0.15s' }}>
                {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? '✓ Salvo' : saveState === 'error' ? 'Erro' : 'Salvar alterações'}
              </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 28 }}>
          {/* Sidebar nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {tabs.map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13.5, fontWeight: activeTab === t ? 600 : 400, color: activeTab === t ? '#18181b' : '#71717a', background: activeTab === t ? '#f4f4f5' : 'transparent', transition: 'background 0.12s, color 0.12s' }}>
                  {t}
                </button>
            ))}
          </div>

          {/* Content */}
          <div>
            {activeTab === 'Escola' && (
                <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: 28 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Dados da escola</h2>
                  <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 24px' }}>Informações que aparecem nos boletos e mensagens enviadas.</p>
                  {tenant === null ? <p style={{ color: '#a1a1aa', fontSize: 14 }}>Carregando...</p> : (
                      <>
                        <Field label="Nome da escola"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Academia Gracie" style={inp} /></Field>
                        <Field label="CNPJ / CPF"><input value={form.document ?? ''} onChange={e => { setForm(f => ({ ...f, document: maskDocument(e.target.value) })); setSaveError('') }} placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18} style={inp} /></Field>
                        {saveError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', marginTop: -4 }}>{saveError}</div>}
                        <Field label="E-mail de contato"><input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@escola.com.br" style={inp} /></Field>
                        <Field label="Telefone"><input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))} placeholder="(21) 99888-1010" maxLength={15} style={inp} /></Field>
                      </>
                  )}
                </div>
            )}

            {activeTab === 'Conta' && <AccountTab />}

            {activeTab === 'Integrações' && (
                <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 12, padding: 28 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Integrações</h2>
                  <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 8px' }}>Conexões com serviços externos.</p>
                  <IntegrationCard acronym="MP" name="Mercado Pago" description="Boletos, PIX e pagamentos automáticos" connected={mercadoPagoConnected} connectedLabel="Configurado" onManage={() => mercadoPagoConnected ? setShowMercadoPagoConfirm(true) : setShowMercadoPagoModal(true)} />
                  <IntegrationCard acronym="EV" name="Evolution API" description="Disparo de mensagens via WhatsApp" connected={waConnected} connectedLabel="Conectado" onManage={() => setShowWaModal(true)} />
                </div>
            )}

            {activeTab === 'Convites' && <InvitesTab />}
          </div>
        </div>
      </div>
  )
}