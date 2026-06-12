import {useEffect, useState} from 'react'
import api from '@/services/api'

interface WAStatus {
  connected: boolean
  instanceName: string | null
  phoneNumber: string | null
  qrCodeBase64: string | null
}

interface Charge {
  id: string
  studentName: string
  dueDate: string
  paymentDate: string | null
  status: string
  whatsappSentAt: string | null
}

// Templates reais conforme WhatsAppMessageBuilder no backend
const REAL_TEMPLATES = [
  {
    id: '1',
    name: 'Cobrança — vencimento próximo (PIX)',
    trigger: 'Gerado ao criar cobrança · preferência PIX',
    message:
        'Olá, {aluno}! 👋\n\nSeu PIX de *R$ {valor}* vence {label_data}, *{data}*.\n\n👇 Te mando o código copia e cola na próxima mensagem.\n\nQualquer dúvida é só chamar aqui. 😊',
  },
  {
    id: '2',
    name: 'Cobrança — vencimento próximo (Boleto)',
    trigger: 'Gerado ao criar cobrança · preferência Boleto',
    message:
        'Olá, {aluno}! 👋\n\nSeu boleto de *R$ {valor}* vence {label_data}, *{data}*.\n\n👇 Te mando a linha digitável na próxima mensagem.\n\nQualquer dúvida é só chamar aqui. 😊',
  },
  {
    id: '3',
    name: 'Lembrete de atraso (PIX)',
    trigger: 'Scheduler automático · dias em atraso',
    message:
        'Olá, {aluno}! ⚠️\n\nSeu PIX de *R$ {valor}* está em atraso há *{dias}*.\n\nPor favor, regularize o quanto antes para evitar suspensão. 🙏\n\n👇 Te mando o código copia e cola na próxima mensagem.\n\nQualquer dúvida é só chamar aqui. 😊',
  },
  {
    id: '4',
    name: 'Lembrete de atraso (Boleto)',
    trigger: 'Scheduler automático · dias em atraso',
    message:
        'Olá, {aluno}! ⚠️\n\nSeu boleto de *R$ {valor}* está em atraso há *{dias}*.\n\nPor favor, regularize o quanto antes para evitar suspensão. 🙏\n\n👇 Te mando a linha digitável na próxima mensagem.\n\nQualquer dúvida é só chamar aqui. 😊',
  },
]

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [recentSends, setRecentSends] = useState<Charge[]>([])
  const [sentToday, setSentToday] = useState(0)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<WAStatus>('/tenants/me/whatsapp'),
      api.get('/charges?size=500&sort=whatsappSentAt,desc'),
    ])
        .then(([waRes, chargesRes]) => {
          setStatus(waRes.data)

          const charges: Charge[] = Array.isArray(chargesRes.data)
              ? chargesRes.data
              : (chargesRes.data?.content ?? [])

          // Apenas cobranças que realmente tiveram WhatsApp enviado
          const sent = charges.filter((c) => c.whatsappSentAt != null)

          // Histórico recente: últimas 10 enviadas
          setRecentSends(sent.slice(0, 10))

          // Enviadas hoje (comparando só a data, sem hora)
          const today = new Date().toISOString().slice(0, 10)
          setSentToday(
              sent.filter((c) => c.whatsappSentAt!.slice(0, 10) === today).length
          )
        })
        .catch(console.error)
        .finally(() => setLoading(false))
  }, [])

  function handleReconnect() {
    setProvisioning(true)
    setProvisionError(null)
    api
        .post<WAStatus>('/tenants/me/whatsapp/provision')
        .then((r) => setStatus(r.data))
        .catch((e) => {
          const msg = e.response?.data?.message ?? e.message ?? 'Erro desconhecido'
          setProvisionError(msg)
        })
        .finally(() => setProvisioning(false))
  }

  const connected = status?.connected ?? false

  function formatSentAt(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
    if (isToday) {
      return `hoje ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 28,
            }}
        >
          <div>
            <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9ca3af',
                  letterSpacing: '0.08em',
                  marginBottom: 4,
                }}
            >
              INTEGRAÇÃO
            </p>
            <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#111827',
                  margin: '0 0 6px',
                }}
            >
              WhatsApp
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Status da Evolution API, templates de mensagem e histórico de
              envios.
            </p>
          </div>
          <button
              onClick={handleReconnect}
              disabled={provisioning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#fff',
                cursor: provisioning ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
                opacity: provisioning ? 0.6 : 1,
              }}
          >
            <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.87" />
            </svg>
            {provisioning ? 'Reconectando...' : 'Reconectar instância'}
          </button>
        </div>

        {provisionError && (
            <div
                style={{
                  marginBottom: 20,
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#dc2626',
                }}
            >
              Falha ao reconectar: {provisionError}
            </div>
        )}

        {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
              Carregando...
            </div>
        ) : (
            <>
              {/* Status cards */}
              <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 28,
                    background: '#e5e7eb',
                    gap: 1,
                  }}
              >
                {/* Conexão */}
                <div style={{ background: '#fff', padding: '24px 28px' }}>
                  <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#9ca3af',
                        letterSpacing: '0.06em',
                        margin: '0 0 14px',
                      }}
                  >
                    {connected ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'inline-block',
                        }}
                    />
                    CONECTADO
                  </span>
                    ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#d1d5db',
                          display: 'inline-block',
                        }}
                    />
                    DESCONECTADO
                  </span>
                    )}
                  </p>
                  <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#111827',
                        margin: '0 0 4px',
                      }}
                  >
                    Evolution API
                  </p>
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

                {/* Enviadas hoje */}
                <div style={{ background: '#fff', padding: '24px 28px' }}>
                  <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#9ca3af',
                        letterSpacing: '0.06em',
                        margin: '0 0 14px',
                      }}
                  >
                    ENVIADAS HOJE
                  </p>
                  <p
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: '#111827',
                        margin: '0 0 4px',
                      }}
                  >
                    {sentToday}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>
                    mensagens disparadas via scheduler
                  </p>
                </div>

                {/* Total rastreado */}
                <div style={{ background: '#fff', padding: '24px 28px' }}>
                  <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#9ca3af',
                        letterSpacing: '0.06em',
                        margin: '0 0 14px',
                      }}
                  >
                    HISTÓRICO RASTREADO
                  </p>
                  <p
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: '#111827',
                        margin: '0 0 4px',
                      }}
                  >
                    {recentSends.length > 0
                        ? `${recentSends.length}+`
                        : '0'}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>
                    cobranças com WhatsApp enviado
                  </p>
                </div>
              </div>

              {/* QR Code quando desconectado */}
              {!connected && status?.qrCodeBase64 && (
                  <div
                      style={{
                        marginBottom: 28,
                        padding: 24,
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 24,
                      }}
                  >
                    <img
                        src={`data:image/png;base64,${status.qrCodeBase64}`}
                        alt="QR Code WhatsApp"
                        style={{ width: 160, height: 160, borderRadius: 8 }}
                    />
                    <div>
                      <p
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#111827',
                            margin: '0 0 6px',
                          }}
                      >
                        Escaneie para conectar
                      </p>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                        Abra o WhatsApp no celular → Dispositivos conectados → Conectar
                        dispositivo
                      </p>
                    </div>
                  </div>
              )}

              {/* Templates */}
              <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
              >
                <div>
                  <h2
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#111827',
                        margin: '0 0 2px',
                      }}
                  >
                    Templates automáticos
                  </h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                    Definidos no backend · edite em{' '}
                    <code style={{ fontSize: 11 }}>WhatsAppMessageBuilder.java</code>
                  </p>
                </div>
              </div>

              <div
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 28,
                    background: '#fff',
                  }}
              >
                {REAL_TEMPLATES.map((t, i) => (
                    <div
                        key={t.id}
                        style={{
                          borderBottom:
                              i < REAL_TEMPLATES.length - 1
                                  ? '1px solid #f3f4f6'
                                  : 'none',
                        }}
                    >
                      <div
                          style={{
                            padding: '18px 24px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 16,
                          }}
                      >
                        <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                        >
                          <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="#6b7280"
                              strokeWidth="1.8"
                              viewBox="0 0 24 24"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 4,
                              }}
                          >
                      <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#111827',
                          }}
                      >
                        {t.name}
                      </span>
                          </div>
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 6px' }}>
                            {t.trigger}
                          </p>
                        </div>
                        <button
                            onClick={() =>
                                setExpandedTemplate(
                                    expandedTemplate === t.id ? null : t.id
                                )
                            }
                            style={{
                              padding: '7px 16px',
                              border: '1px solid #e5e7eb',
                              borderRadius: 8,
                              background: '#fff',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 500,
                              color: '#374151',
                              flexShrink: 0,
                            }}
                        >
                          {expandedTemplate === t.id ? 'Fechar' : 'Ver mensagem'}
                        </button>
                      </div>
                      {expandedTemplate === t.id && (
                          <div
                              style={{
                                margin: '0 24px 18px 74px',
                                padding: '12px 16px',
                                background: '#f9fafb',
                                borderRadius: 8,
                                fontSize: 13,
                                color: '#374151',
                                lineHeight: 1.7,
                                whiteSpace: 'pre-line',
                                fontFamily: 'inherit',
                              }}
                          >
                            {t.message}
                          </div>
                      )}
                    </div>
                ))}
              </div>

              {/* Histórico real */}
              <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#111827',
                    margin: '0 0 16px',
                  }}
              >
                Histórico recente
              </h2>
              <div
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#fff',
                  }}
              >
                {recentSends.length === 0 ? (
                    <p
                        style={{
                          padding: 32,
                          textAlign: 'center',
                          color: '#9ca3af',
                          margin: 0,
                        }}
                    >
                      Nenhuma mensagem enviada ainda.
                    </p>
                ) : (
                    recentSends.map((c, i) => (
                        <div
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              padding: '14px 24px',
                              borderBottom:
                                  i < recentSends.length - 1
                                      ? '1px solid #f3f4f6'
                                      : 'none',
                            }}
                        >
                          <svg
                              width="14"
                              height="14"
                              fill="none"
                              stroke="#6b7280"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              style={{ flexShrink: 0 }}
                          >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                          <span
                              style={{
                                fontSize: 13,
                                color: '#9ca3af',
                                width: 90,
                                flexShrink: 0,
                              }}
                          >
                    {formatSentAt(c.whatsappSentAt!)}
                  </span>
                          <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#111827',
                                flex: 1,
                              }}
                          >
                    {c.studentName}
                  </span>
                          <span style={{ fontSize: 13, color: '#6b7280' }}>
                    vencimento{' '}
                            {new Date(c.dueDate + 'T12:00:00').toLocaleDateString(
                                'pt-BR',
                                { day: '2-digit', month: '2-digit' }
                            )}
                  </span>
                          <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 20,
                                background:
                                    c.status === 'PAID' ? '#dcfce7' : '#f3f4f6',
                                color: c.status === 'PAID' ? '#15803d' : '#6b7280',
                              }}
                          >
                    {c.status === 'PAID'
                        ? 'Pago'
                        : c.status === 'OVERDUE'
                            ? 'Em atraso'
                            : 'Pendente'}
                  </span>
                        </div>
                    ))
                )}
              </div>
            </>
        )}
      </div>
  )
}