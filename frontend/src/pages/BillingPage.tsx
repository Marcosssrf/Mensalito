import {useEffect, useState} from 'react'
import api from '@/services/api'

// ── Planos canônicos — fonte única de verdade ──────────────────────────────
export const PLANS = [
  {
    key: 'Básico',
    price: 129,
    description: 'Até 50 alunos',
    studentLimit: 50,
    userLimit: 1,
    waMessageLimit: 500,
    features: ['Cobrança PIX e boleto', 'WhatsApp manual', '1 usuário'],
  },
  {
    key: 'Padrão',
    price: 229,
    description: 'Até 150 alunos',
    studentLimit: 150,
    userLimit: 5,
    waMessageLimit: 2000,
    features: ['Cobrança recorrente automática', 'WhatsApp automático + lembretes', '5 usuários', 'Relatórios avançados'],
    highlight: true,
  },
  {
    key: 'Pro',
    price: 349,
    description: 'Até 400 alunos',
    studentLimit: 400,
    userLimit: 999,
    waMessageLimit: 10000,
    features: ['Multi-unidade', 'API e integrações', 'Usuários ilimitados', 'Suporte prioritário'],
  },
]

interface DashboardData { totalActiveStudents: number; totalPaidCharges: number }
interface Invoice { id: string; date: string; amount: number; status: string }
interface WorkspaceUser { id: string; name: string; email: string; role: string; active: boolean; createdAt: string }
interface PlanInfo { name: string; price: number; renewDate: string; activeStudents: number; studentLimit: number; waMessages: number; waMessageLimit: number; userCount: number; userLimit: number }

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtDate(str: string) { const d = new Date(str); if (isNaN(d.getTime())) return '—'; return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` }
function initials(name: string) { return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const warn = pct >= 80
  return (
    <div style={{ marginTop: 8, height: 4, background: '#f4f4f5', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 2, background: warn ? '#f59e0b' : '#18181b', width: `${pct}%`, transition: 'width 0.3s' }} />
    </div>
  )
}

export default function BillingPage() {
  const [plan, setPlan]       = useState<PlanInfo | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [users, setUsers]     = useState<WorkspaceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState(false)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult]   = useState<{type:'success'|'error';msg:string}|null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/tenants/me'), api.get('/users')])
      .then(([dashRes, , usersRes]) => {
        const dash = dashRes.data as DashboardData
        const rawUsers: WorkspaceUser[] = Array.isArray(usersRes.data) ? usersRes.data : []
        setUsers(rawUsers)
        const now = new Date()
        const renew = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const currentPlan = PLANS[1] // Padrão é o plano atual
        setPlan({
          name: currentPlan.key,
          price: currentPlan.price,
          renewDate: `${String(renew.getDate()).padStart(2,'0')}/${String(renew.getMonth()+1).padStart(2,'0')}/${renew.getFullYear()}`,
          activeStudents: Number(dash.totalActiveStudents ?? 0),
          studentLimit: currentPlan.studentLimit,
          waMessages: Number(dash.totalPaidCharges ?? 0) * 4,
          waMessageLimit: currentPlan.waMessageLimit,
          userCount: rawUsers.filter(u => u.active).length,
          userLimit: currentPlan.userLimit,
        })
        const inv: Invoice[] = []
        for (let i = 0; i < 6; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          inv.push({ id: `INV-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, date: `01/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`, amount: currentPlan.price, status: 'Pago' })
        }
        setInvoices(inv)
      }).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviteSending(true); setInviteResult(null)
    try {
      await api.post('/invites', { email: inviteEmail.trim() })
      setInviteResult({ type: 'success', msg: `Convite enviado para ${inviteEmail}` })
      setInviteEmail(''); setShowInviteForm(false)
    } catch (e: any) {
      setInviteResult({ type: 'error', msg: e?.response?.data?.message ?? 'Erro ao enviar convite' })
    } finally { setInviteSending(false) }
  }

  function downloadInvoice(inv: Invoice) {
    const blob = new Blob([`Mensalito - Fatura ${inv.id}\nData: ${inv.date}\nValor: ${fmt(inv.amount)}\nStatus: ${inv.status}`], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${inv.id}.txt`; a.click()
  }

  const s: React.CSSProperties = { fontFamily: "'Geist Variable', sans-serif" }

  return (
    <div className="ms-page" style={{ ...s, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.09em', textTransform: 'uppercase', margin: '0 0 4px' }}>Workspace</p>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#18181b', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Plano e cobrança</h1>
        <p style={{ fontSize: 14, color: '#71717a' }}>Gerencie sua assinatura, usuários e histórico de faturas.</p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#a1a1aa', fontSize: 14 }}>Carregando...</div>
      ) : (
        <>
          {/* Current plan banner */}
          {plan && (
            <div className="ms-billing-current" style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 14, padding: '28px 32px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="ms-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Plano atual</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                    {plan.name} · {fmt(plan.price)}<span style={{ fontSize: 14, fontWeight: 400, color: '#a1a1aa' }}>/mês</span>
                  </p>
                  <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0 }}>Renova em {plan.renewDate}</p>
                </div>
                <div className="ms-page-actions" style={{ display: 'flex', gap: 8 }}>
                  <button style={{ padding: '8px 16px', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#3f3f46' }}>
                    Alterar pagamento
                  </button>
                  <button onClick={() => setChangingPlan(true)} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#18181b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    Trocar plano
                  </button>
                </div>
              </div>

              {/* Usage meters */}
              <div className="ms-usage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Alunos ativos', value: plan.activeStudents, max: plan.studentLimit },
                  { label: 'Mensagens WhatsApp', value: plan.waMessages, max: plan.waMessageLimit },
                  { label: 'Usuários', value: plan.userCount, max: plan.userLimit },
                ].map(m => (
                  <div key={m.label} style={{ background: '#fafafa', border: '1px solid #f4f4f5', borderRadius: 10, padding: '16px 20px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 6px' }}>{m.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: 0 }}>
                      {m.value.toLocaleString('pt-BR')} <span style={{ fontSize: 13, fontWeight: 400, color: '#a1a1aa' }}>/ {m.max.toLocaleString('pt-BR')}</span>
                    </p>
                    <ProgressBar value={m.value} max={m.max} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan cards */}
          <div className="ms-plan-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            {PLANS.map(p => {
              const isCurrent = p.key === plan?.name
              return (
                <div key={p.key} style={{ background: isCurrent ? '#18181b' : '#fff', border: `1.5px solid ${isCurrent ? '#18181b' : '#e8eaed'}`, borderRadius: 12, padding: 24, position: 'relative' }}>
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#52525b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>PLANO ATUAL</div>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? '#fff' : '#18181b', margin: '0 0 10px' }}>{p.key}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: isCurrent ? '#fff' : '#18181b', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                    R$ {p.price}<span style={{ fontSize: 13, fontWeight: 400, color: isCurrent ? '#a1a1aa' : '#a1a1aa' }}>/mês</span>
                  </p>
                  <p style={{ fontSize: 13, color: isCurrent ? '#a1a1aa' : '#71717a', margin: '0 0 18px' }}>{p.description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="12" height="12" fill="none" stroke={isCurrent ? '#4ade80' : '#22c55e'} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style={{ fontSize: 13, color: isCurrent ? '#d4d4d8' : '#3f3f46' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Users */}
          <div className="ms-list-panel" style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            <div className="ms-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #f4f4f5' }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#18181b', margin: '0 0 2px' }}>Usuários do workspace</h2>
                <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0 }}>Professores e administradores com acesso à plataforma.</p>
              </div>
              <button onClick={() => { setShowInviteForm(v => !v); setInviteResult(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: 8, background: '#18181b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Convidar
              </button>
            </div>

            {showInviteForm && (
              <div className="ms-inline-form" style={{ padding: '16px 24px', background: '#fafafa', borderBottom: '1px solid #f4f4f5', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#5c5f6b', display: 'block', marginBottom: 5 }}>E-mail do novo usuário</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendInvite()} placeholder="professor@escola.com" style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e8eaed', borderRadius: 8, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => { setShowInviteForm(false); setInviteEmail(''); setInviteResult(null) }} style={{ padding: '9px 14px', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#3f3f46' }}>Cancelar</button>
                <button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()} style={{ padding: '9px 16px', border: 'none', borderRadius: 8, background: '#18181b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !inviteEmail.trim() ? 0.4 : 1 }}>
                  {inviteSending ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            )}

            {inviteResult && (
              <div style={{ margin: '12px 24px', padding: '10px 14px', background: inviteResult.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${inviteResult.type === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, fontSize: 13, color: inviteResult.type === 'success' ? '#15803d' : '#dc2626' }}>
                {inviteResult.msg}
              </div>
            )}

            <div className="ms-table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '10px 24px', borderBottom: '1px solid #f4f4f5' }}>
              {['NOME', 'E-MAIL', 'PERFIL', 'STATUS', 'DESDE'].map(h => (
                <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.07em' }}>{h}</span>
              ))}
            </div>

            {users.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: '#a1a1aa', fontSize: 13.5 }}>Nenhum usuário encontrado.</div>
            ) : users.map((u, i) => (
              <div className="ms-table-row ms-billing-user-row" key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '13px 24px', alignItems: 'center', borderBottom: i < users.length - 1 ? '1px solid #fafafa' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#52525b', flexShrink: 0 }}>{initials(u.name)}</div>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: '#18181b' }}>{u.name}</span>
                </div>
                <span style={{ fontSize: 13, color: '#71717a' }}>{u.email}</span>
                <span style={{ display: 'inline-flex', width: 'fit-content', padding: '3px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 600, background: u.role === 'OWNER' ? '#eff6ff' : '#f4f4f5', color: u.role === 'OWNER' ? '#1d4ed8' : '#71717a' }}>
                  {u.role === 'OWNER' ? 'Dono' : 'Professor'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, width: 'fit-content', padding: '3px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 600, background: u.active ? '#dcfce7' : '#f4f4f5', color: u.active ? '#15803d' : '#a1a1aa' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: u.active ? '#16a34a' : '#d1d5db' }} />
                  {u.active ? 'Ativo' : 'Inativo'}
                </span>
                <span style={{ fontSize: 13, color: '#a1a1aa' }}>{fmtDate(u.createdAt)}</span>
              </div>
            ))}
          </div>

          {/* Invoices */}
          <div className="ms-list-panel" style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f4f4f5' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#18181b', margin: 0 }}>Histórico de faturas</h2>
            </div>
            <div className="ms-table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr', padding: '10px 24px', borderBottom: '1px solid #f4f4f5' }}>
              {['FATURA', 'DATA', 'VALOR', 'STATUS', ''].map(h => (
                <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.07em' }}>{h}</span>
              ))}
            </div>
            {invoices.map((inv, i) => (
              <div className="ms-table-row ms-invoice-row" key={inv.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr', padding: '14px 24px', alignItems: 'center', borderBottom: i < invoices.length - 1 ? '1px solid #fafafa' : 'none' }}>
                <span style={{ fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>{inv.id}</span>
                <span style={{ fontSize: 13.5, color: '#71717a' }}>{inv.date}</span>
                <span style={{ fontSize: 13.5, color: '#3f3f46' }}>{fmt(inv.amount)}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 600, background: '#dcfce7', color: '#15803d', width: 'fit-content' }}>Pago</span>
                <button onClick={() => downloadInvoice(inv)} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#71717a', padding: 0 }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  PDF
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {changingPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }} onClick={() => setChangingPlan(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.14)', border: '1.5px solid #e8eaed' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#18181b', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Trocar plano</h3>
            <p style={{ fontSize: 14, color: '#71717a', margin: '0 0 24px', lineHeight: 1.6 }}>Para trocar de plano, entre em contato com o suporte ou acesse o portal de assinatura.</p>
            <button onClick={() => setChangingPlan(false)} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: 8, background: '#18181b', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
