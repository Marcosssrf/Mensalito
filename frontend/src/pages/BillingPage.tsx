import {useEffect, useState} from 'react'
import api from '@/services/api'

interface DashboardData {
  receivedRevenue: number
  totalActiveStudents: number
  totalPaidCharges: number
  totalPendingCharges: number
  totalOverdueCharges: number
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'Pago' | 'Pendente'
}

interface PlanInfo {
  name: string
  price: number
  renewDate: string
  cardLast4: string
  activeStudents: number
  studentLimit: number
  waMessages: number
  waMessageLimit: number
  userCount: number
  userLimit: number
}

interface WorkspaceUser {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

const PLANS = [
  {
    key: 'Starter',
    price: 49,
    tag: '',
    description: 'Até 30 alunos',
    features: ['Cobrança PIX e boleto', 'WhatsApp manual', '1 usuário'],
  },
  {
    key: 'Pro',
    price: 119,
    tag: 'ATUAL',
    description: 'Até 150 alunos',
    features: ['Cobrança recorrente automática', 'WhatsApp automático + lembretes', '5 usuários', 'Relatórios avançados'],
  },
  {
    key: 'Escola',
    price: 249,
    tag: '',
    description: 'Alunos ilimitados',
    features: ['Multi-unidade', 'API e integrações', 'Usuários ilimitados', 'Suporte prioritário'],
  },
]

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const warn = pct >= 80
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: warn ? '#f59e0b' : '#111827',
          width: `${pct}%`, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function fmtDate(str: string) {
  const d = new Date(str)
  if (isNaN(d.getTime())) return '—'
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
}

export default function BillingPage() {
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/tenants/me'),
      api.get('/users'),
    ]).then(([dashRes, tenantRes, usersRes]) => {
      const dash = dashRes.data as DashboardData

      const now = new Date()
      const renew = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const renewStr = `${renew.getDate().toString().padStart(2,'0')}/${(renew.getMonth()+1).toString().padStart(2,'0')}/${renew.getFullYear()}`

      const rawUsers: WorkspaceUser[] = Array.isArray(usersRes.data) ? usersRes.data : []
      setUsers(rawUsers)

      setPlan({
        name: 'Pro',
        price: 119,
        renewDate: renewStr,
        cardLast4: '4242',
        activeStudents: Number(dash.totalActiveStudents ?? 0),
        studentLimit: 150,
        waMessages: Number(dash.totalPaidCharges ?? 0) * 4,
        waMessageLimit: 2000,
        userCount: rawUsers.filter(u => u.active).length,
        userLimit: 5,
      })

      const inv: Invoice[] = []
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        inv.push({
          id: `INV-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
          date: `01/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`,
          amount: 119,
          status: 'Pago',
        })
      }
      setInvoices(inv)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteResult(null)
    try {
      await api.post('/invites', { email: inviteEmail.trim() })
      setInviteResult({ type: 'success', msg: `Convite enviado para ${inviteEmail}` })
      setInviteEmail('')
      setShowInviteForm(false)
    } catch (e: any) {
      setInviteResult({
        type: 'error',
        msg: e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao enviar convite',
      })
    } finally { setInviteSending(false) }
  }

  function downloadInvoice(inv: Invoice) {
    const content = `Mensalito - Fatura ${inv.id}\nData: ${inv.date}\nValor: ${fmt(inv.amount)}\nStatus: ${inv.status}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${inv.id}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>WORKSPACE</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Plano e cobrança</h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>Gerencie sua assinatura, usuários e veja o histórico de faturas.</p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <>
          {/* Current plan banner */}
          {plan && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '28px 32px', background: '#fff', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 8px' }}>PLANO ATUAL</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
                    {plan.name} · {fmt(plan.price)}/mês
                  </p>
                  <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                    Renova em {plan.renewDate} · cartão final {plan.cardLast4}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{
                    padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: 8,
                    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151',
                  }}>Alterar pagamento</button>
                  <button
                    onClick={() => setChangingPlan(true)}
                    style={{
                      padding: '9px 18px', border: 'none', borderRadius: 8,
                      background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >Trocar plano</button>
                </div>
              </div>

              {/* Usage meters */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1, background: '#e5e7eb', border: '1px solid #e5e7eb',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <div style={{ background: '#fff', padding: '20px 24px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 8px' }}>ALUNOS ATIVOS</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {plan.activeStudents} / {plan.studentLimit}
                  </p>
                  <ProgressBar value={plan.activeStudents} max={plan.studentLimit} />
                </div>
                <div style={{ background: '#fff', padding: '20px 24px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 8px' }}>MENSAGENS WHATSAPP</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {plan.waMessages.toLocaleString('pt-BR')} / {plan.waMessageLimit.toLocaleString('pt-BR')}
                  </p>
                  <ProgressBar value={plan.waMessages} max={plan.waMessageLimit} />
                </div>
                <div style={{ background: '#fff', padding: '20px 24px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 8px' }}>USUÁRIOS</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {plan.userCount} / {plan.userLimit}
                  </p>
                  <ProgressBar value={plan.userCount} max={plan.userLimit} />
                </div>
              </div>
            </div>
          )}

          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {PLANS.map((p) => {
              const isCurrent = p.tag === 'ATUAL'
              return (
                <div key={p.key} style={{
                  border: isCurrent ? '2px solid #111827' : '1px solid #e5e7eb',
                  borderRadius: 12, padding: '24px', background: '#fff', position: 'relative',
                }}>
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                      background: '#111827', color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '3px 12px', borderRadius: 20, letterSpacing: '0.06em',
                    }}>ATUAL</div>
                  )}
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{p.key}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>
                    R$ {p.price}
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>/mês</span>
                  </p>
                  <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>{p.description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="13" height="13" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ===== USERS SECTION ===== */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', overflow: 'hidden', marginBottom: 28 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
            }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>Usuários do workspace</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                  Professores e administradores com acesso à plataforma.
                </p>
              </div>
              <button
                onClick={() => { setShowInviteForm(v => !v); setInviteResult(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 16px', border: 'none', borderRadius: 8,
                  background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Convidar usuário
              </button>
            </div>

            {/* Invite form */}
            {showInviteForm && (
              <div style={{
                padding: '16px 24px', background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                    E-mail do novo usuário
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendInvite()}
                    placeholder="professor@escola.com"
                    style={{
                      width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
                      borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
                    O usuário receberá um link para definir a senha e acessar o workspace.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, paddingTop: 24 }}>
                  <button
                    onClick={() => { setShowInviteForm(false); setInviteEmail(''); setInviteResult(null) }}
                    style={{
                      padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8,
                      background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151',
                    }}
                  >Cancelar</button>
                  <button
                    onClick={sendInvite}
                    disabled={inviteSending || !inviteEmail.trim()}
                    style={{
                      padding: '9px 18px', border: 'none', borderRadius: 8,
                      background: inviteSending || !inviteEmail.trim() ? '#9ca3af' : '#111827',
                      color: '#fff', cursor: inviteSending || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {inviteSending ? 'Enviando...' : 'Enviar convite'}
                  </button>
                </div>
              </div>
            )}

            {/* Invite feedback */}
            {inviteResult && (
              <div style={{
                margin: '0 24px 0', padding: '12px 16px',
                background: inviteResult.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${inviteResult.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 8, fontSize: 13,
                color: inviteResult.type === 'success' ? '#15803d' : '#dc2626',
                marginTop: 16, marginBottom: 0,
              }}>
                {inviteResult.type === 'success' ? '✓ ' : '✕ '}{inviteResult.msg}
              </div>
            )}

            {/* Users table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
              padding: '12px 24px', borderBottom: '1px solid #f3f4f6',
              marginTop: inviteResult ? 12 : 0,
            }}>
              {['NOME', 'E-MAIL', 'PERFIL', 'STATUS', 'DESDE'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
              ))}
            </div>

            {users.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                Nenhum usuário encontrado.
              </div>
            ) : (
              users.map((u, i) => (
                <div key={u.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: i < users.length - 1 ? '1px solid #f9fafb' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#374151', flexShrink: 0,
                    }}>
                      {initials(u.name)}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{u.name}</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{u.email}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', width: 'fit-content',
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: u.role === 'OWNER' ? '#eff6ff' : '#f9fafb',
                    color: u.role === 'OWNER' ? '#1d4ed8' : '#6b7280',
                  }}>
                    {u.role === 'OWNER' ? 'Dono' : 'Professor'}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, width: 'fit-content',
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: u.active ? '#dcfce7' : '#f3f4f6',
                    color: u.active ? '#15803d' : '#9ca3af',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.active ? '#16a34a' : '#d1d5db' }} />
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{fmtDate(u.createdAt)}</span>
                </div>
              ))
            )}
          </div>

          {/* Invoice history */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Histórico de faturas</h2>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 8,
                background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280',
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Detalhes do método
              </button>
            </div>

            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr',
                padding: '10px 24px', borderBottom: '1px solid #f3f4f6',
              }}>
                {['FATURA', 'DATA', 'VALOR', 'STATUS', 'AÇÕES'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>

              {invoices.map((inv, i) => (
                <div key={inv.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr',
                  padding: '16px 24px', alignItems: 'center',
                  borderBottom: i < invoices.length - 1 ? '1px solid #f9fafb' : 'none',
                }}>
                  <span style={{ fontSize: 14, color: '#374151' }}>{inv.id}</span>
                  <span style={{ fontSize: 14, color: '#374151' }}>{inv.date}</span>
                  <span style={{ fontSize: 14, color: '#374151' }}>{fmt(inv.amount)}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: '#dcfce7', color: '#15803d', width: 'fit-content',
                  }}>Pago</span>
                  <button
                    onClick={() => downloadInvoice(inv)}
                    title="Baixar fatura"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#6b7280', padding: 0,
                    }}
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Change plan modal */}
      {changingPlan && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setChangingPlan(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, width: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Trocar plano</h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
              Para trocar de plano, entre em contato com o suporte ou acesse o portal de assinatura.
            </p>
            <button onClick={() => setChangingPlan(false)} style={{
              width: '100%', padding: '10px', border: 'none', borderRadius: 8,
              background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
