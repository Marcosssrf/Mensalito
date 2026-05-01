import {useEffect, useState} from 'react'
import {AlertCircle, CheckCircle, Clock, DollarSign, TrendingUp, Users} from 'lucide-react'
import api from '@/services/api'
import type {Dashboard} from '@/types'

function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const mockDashboard: Dashboard = {
    expectedRevenue: 18500,
    receivedRevenue: 12800,
    overdueRevenue: 3200,
    totalActiveStudents: 87,
    totalPendingCharges: 14,
    totalPaidCharges: 62,
    totalOverdueCharges: 9,
}

export default function DashboardPage() {
    const [data, setData] = useState<Dashboard | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get<Dashboard>('/dashboard')
            .then(r => setData(r.data))
            .catch(() => setData(mockDashboard))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-7 w-32 bg-zinc-100 rounded animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    const d = data!
    const paidPct = d.expectedRevenue > 0
        ? Math.round((d.receivedRevenue / d.expectedRevenue) * 100)
        : 0

    const stats = [
        {
            label: 'Previsto no mês',
            value: formatCurrency(d.expectedRevenue),
            icon: TrendingUp,
            sub: `${paidPct}% recebido`,
        },
        {
            label: 'Recebido',
            value: formatCurrency(d.receivedRevenue),
            icon: DollarSign,
            sub: `${d.totalPaidCharges} cobranças pagas`,
            highlight: true,
        },
        {
            label: 'Em atraso',
            value: formatCurrency(d.overdueRevenue),
            icon: AlertCircle,
            sub: `${d.totalOverdueCharges} cobranças vencidas`,
            danger: true,
        },
        {
            label: 'Alunos ativos',
            value: String(d.totalActiveStudents),
            icon: Users,
            sub: 'matrículas ativas',
        },
        {
            label: 'Pendentes',
            value: String(d.totalPendingCharges),
            icon: Clock,
            sub: 'aguardando pagamento',
        },
        {
            label: 'Pagas',
            value: String(d.totalPaidCharges),
            icon: CheckCircle,
            sub: 'este mês',
        },
    ]

    return (
        <div className="space-y-6" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <div>
                <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Visão geral do mês atual</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {stats.map((s, i) => {
                    const Icon = s.icon
                    return (
                        <div
                            key={i}
                            className={`rounded-lg border p-4 flex flex-col gap-2 ${
                                s.highlight ? 'bg-zinc-900 text-white border-zinc-900' :
                                s.danger ? 'border-red-100 bg-red-50' :
                                'bg-white border-zinc-100'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-xs ${s.highlight ? 'text-zinc-400' : s.danger ? 'text-red-400' : 'text-zinc-400'}`}>
                                    {s.label}
                                </span>
                                <Icon size={14} className={s.highlight ? 'text-zinc-400' : s.danger ? 'text-red-400' : 'text-zinc-300'} />
                            </div>
                            <p className={`text-xl font-semibold tracking-tight ${s.highlight ? 'text-white' : s.danger ? 'text-red-600' : 'text-zinc-900'}`}>
                                {s.value}
                            </p>
                            <p className={`text-xs ${s.highlight ? 'text-zinc-500' : s.danger ? 'text-red-400' : 'text-zinc-400'}`}>
                                {s.sub}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Progress bar */}
            <div className="bg-white border border-zinc-100 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-zinc-600">Progresso de recebimento</span>
                    <span className="text-sm font-semibold text-zinc-900">{paidPct}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-zinc-900 rounded-full transition-all duration-700"
                        style={{ width: `${paidPct}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <span className="text-xs text-zinc-400">{formatCurrency(d.receivedRevenue)} recebido</span>
                    <span className="text-xs text-zinc-400">{formatCurrency(d.expectedRevenue)} previsto</span>
                </div>
            </div>
        </div>
    )
}
