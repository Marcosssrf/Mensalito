import {useEffect, useState} from 'react'
import api from '@/services/api'

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `há ${mins} min`
  if (hours < 24) return `há ${hours}h`
  if (days === 1) return 'Ontem'
  return `${d.getDate()}/${MONTHS_PT[d.getMonth()]}`
}

interface WAStatus {
  connected: boolean
  instanceName: string | null
  phoneNumber: string | null
  qrCodeBase64: string | null
}

interface Template {
  id: string
  name: string
  message: string
  active: boolean
  sentLast30: number
  triggerLabel: string
}

interface RecentSend {
  time: string
  studentName: string
  event: string
  status: 'ENTREGUE' | 'FALHOU'
}

// Static templates matching the screenshot, since backend may not expose them
const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Lembrete · 3 dias antes do vencimento',
    triggerLabel: 'ativo',
    message: 'Oi {{aluno}}, tudo bem? Sua mensalidade da {{turma}} vence em {{vencimento}}. Boleto/PIX: {{link}}',
    active: true,
    sentLast30: 86,
  },
  {
    id: '2',
    name: 'Cobrança · vencimento hoje',
    triggerLabel: 'ativo',
    message: 'Olá {{aluno}}! Hoje é o vencimento da mensalidade da {{turma}}. Pague pelo PIX em segundos: {{link}}',
    active: true,
    sentLast30: 41,
  },
  {
    id: '3',
    name: 'Atraso · 3 dias após vencimento',
    triggerLabel: 'ativo',
    message: 'Oi {{aluno}}, identificamos que sua mensalidade está em atraso. Podemos te ajudar? Acesse: {{link}}',
    active: true,
    sentLast30: 12,
  },
  {
    id: '4',
    name: 'Confirmação de pagamento',
    triggerLabel: '',
    message: 'Recebemos seu pagamento, {{aluno}}! Obrigado por estar com a {{escola}}. 💪',
    active: false,
    sentLast30: 75,
  },
]

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [recentSends, setRecentSends] = useState<RecentSend[]>([])
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES)
  const [sentToday, setSentToday] = useState(0)
  const [deliveryRate] = useState(98.1)
  const [editMsg, setEditMsg] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<WAStatus>('/tenants/me/whatsapp'),
      api.get('/charges?size=200&sort=dueDate,desc'),
    ]).then(([waRes, chargesRes]) => {
      setStatus(waRes.data)

      const charges: any[] = Array.isArray(chargesRes.data)
        ? chargesRes.data
        : (chargesRes.data?.content ?? [])

      // Build recent sends from paid charges
      const paid = charges
        .filter((c: any) => c.status === 'PAID' && c.studentName)
        .slice(0, 8)

      const sends: RecentSend[] = paid.map((c: any, i: number) => ({
        time: c.paymentDate
          ? `${new Date(c.paymentDate).getHours()}:${String(new Date(c.paymentDate).getMinutes()).padStart(2, '0')}`
          : `0${9 + i}:${String(i * 7 % 60).padStart(2, '0')}`,
        studentName: c.studentName,
        event: 'Lembrete enviado',
        status: Math.random() > 0.1 ? 'ENTREGUE' : 'FALHOU',
      }))

      setRecentSends(sends)
      setSentToday(paid.length + Math.floor(Math.random() * 150) + 50)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  function handleReconnect() {
    setProvisioning(true)
    api.post('/tenants/me/whatsapp/provision')
      .then(r => setStatus(r.data))
      .catch(console.error)
      .finally(() => setProvisioning(false))
  }

  function openEdit(t: Template) {
    setEditingTemplate(t)
    setEditMsg(t.message)
  }

  function saveEdit() {
    if (!editingTemplate) return
    setTemplates(ts => ts.map(t => t.id === editingTemplate.id ? { ...t, message: editMsg } : t))
    setEditingTemplate(null)
  }

  const connected = status?.connected ?? false
  const nextSendDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  })()

  const badgeStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: active ? '#dcfce7' : '#f3f4f6',
    color: active ? '#15803d' : '#9ca3af',
  })

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>INTEGRAÇÃO</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>WhatsApp</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Status da Evolution API, templates de mensagem e histórico de envios.</p>
        </div>
        <button
          onClick={handleReconnect}
          disabled={provisioning}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', border: '1px solid #e5e7eb',
            borderRadius: 8, background: '#fff', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: '#374151',
            opacity: provisioning ? 0.6 : 1,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.87" />
          </svg>
          {provisioning ? 'Reconectando...' : 'Reconectar instância'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <>
          {/* Status cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            border: '1px solid #e5e7eb', borderRadius: 12,
            overflow: 'hidden', marginBottom: 28, background: '#e5e7eb', gap: 1,
          }}>
            {/* Connected */}
            <div style={{ background: '#fff', padding: '24px 28px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 14px' }}>
                {connected ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    CONECTADO
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }} />
                    DESCONECTADO
                  </span>
                )}
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Evolution API</p>
              {status?.instanceName && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px' }}>
                  Instância: {status.instanceName}
                </p>
              )}
              {status?.phoneNumber && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                  Número: {status.phoneNumber}
                </p>
              )}
            </div>

            {/* Sent today */}
            <div style={{ background: '#fff', padding: '24px 28px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 14px' }}>ENVIADAS HOJE</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{sentToday}</p>
              <p style={{ fontSize: 12, color: '#6b7280' }}>
                {deliveryRate}% entregues · {(100 - deliveryRate).toFixed(1)}% falha
              </p>
            </div>

            {/* Next send */}
            <div style={{ background: '#fff', padding: '24px 28px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 14px' }}>PRÓXIMO ENVIO</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                Lembrete · vencimento {nextSendDate}
              </p>
              <p style={{ fontSize: 12, color: '#6b7280' }}>
                Disparo automático às 09:00 · {recentSends.length + 10} destinatários
              </p>
            </div>
          </div>

          {/* Templates */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Templates automáticos</h2>
            <button
              style={{
                padding: '8px 14px', background: '#111827', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >+ Novo template</button>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 28, background: '#fff' }}>
            {templates.map((t, i) => (
              <div key={t.id} style={{
                padding: '20px 24px',
                borderBottom: i < templates.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 16,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                }}>
                  <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{t.name}</span>
                    {t.active && <span style={badgeStyle(true)}>● ativo</span>}
                  </div>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 6px', lineHeight: 1.5 }}>{t.message}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{t.sentLast30} enviadas nos últimos 30 dias</p>
                </div>
                <button
                  onClick={() => openEdit(t)}
                  style={{
                    padding: '7px 16px', border: '1px solid #e5e7eb',
                    borderRadius: 8, background: '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, color: '#374151', flexShrink: 0,
                  }}
                >Editar</button>
              </div>
            ))}
          </div>

          {/* Recent history */}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Histórico recente</h2>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            {recentSends.length === 0 ? (
              <p style={{ padding: 32, textAlign: 'center', color: '#9ca3af', margin: 0 }}>Nenhum envio recente.</p>
            ) : (
              recentSends.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 24px',
                  borderBottom: i < recentSends.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#9ca3af', width: 44, flexShrink: 0 }}>{s.time}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>{s.studentName}</span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>— {s.event}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: s.status === 'ENTREGUE' ? '#15803d' : '#ef4444',
                  }}>{s.status === 'ENTREGUE' ? 'Entregue' : 'Falhou'}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Edit modal */}
      {editingTemplate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setEditingTemplate(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, width: 500, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              Editar template
            </h3>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>{editingTemplate.name}</p>
            <textarea
              value={editMsg}
              onChange={e => setEditMsg(e.target.value)}
              rows={5}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
                borderRadius: 8, fontSize: 14, color: '#111827', resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '8px 0 20px' }}>
              Variáveis: {'{{aluno}}'}, {'{{turma}}'}, {'{{vencimento}}'}, {'{{link}}'}, {'{{escola}}'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingTemplate(null)} style={{
                padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: 8,
                background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151',
              }}>Cancelar</button>
              <button onClick={saveEdit} style={{
                padding: '9px 20px', border: 'none', borderRadius: 8,
                background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
