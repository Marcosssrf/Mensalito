import {useEffect, useState} from 'react'
import {AlertCircle, CheckCircle, Clock, Copy, ExternalLink, Search, XCircle} from 'lucide-react'
import api from '@/services/api'
import type {Charge} from '@/types'

const mockCharges: Charge[] = [
    { id: '1', studentName: 'Ana Clara Souza', amount: 29900, dueDate: '2024-05-05', status: 'PAID', paymentDate: '2024-05-03', pixCode: null, boletoUrl: null, checkoutUrl: 'https://pay.example.com/1', createdAt: '2024-04-30' },
    { id: '2', studentName: 'Bruno Mendes', amount: 49900, dueDate: '2024-05-10', status: 'PENDING', paymentDate: null, pixCode: '00020126580014BR.GOV.BCB.PIX...', boletoUrl: null, checkoutUrl: 'https://pay.example.com/2', createdAt: '2024-05-01' },
    { id: '3', studentName: 'Carla Fernandes', amount: 79900, dueDate: '2024-04-10', status: 'OVERDUE', paymentDate: null, pixCode: '00020126580014BR.GOV.BCB.PIX...', boletoUrl: null, checkoutUrl: 'https://pay.example.com/3', createdAt: '2024-04-01' },
    { id: '4', studentName: 'Diego Santos', amount: 29900, dueDate: '2024-05-05', status: 'PENDING', paymentDate: null, pixCode: '00020126580014BR.GOV.BCB.PIX...', boletoUrl: null, checkoutUrl: 'https://pay.example.com/4', createdAt: '2024-04-30' },
    { id: '5', studentName: 'Elena Costa', amount: 49900, dueDate: '2024-05-10', status: 'PAID', paymentDate: '2024-05-08', pixCode: null, boletoUrl: null, checkoutUrl: 'https://pay.example.com/5', createdAt: '2024-05-01' },
    { id: '6', studentName: 'Felipe Rocha', amount: 79900, dueDate: '2024-05-01', status: 'OVERDUE', paymentDate: null, pixCode: null, boletoUrl: 'https://boleto.example.com/6', checkoutUrl: null, createdAt: '2024-04-01' },
]

function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
    if (!d) return '–'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

const statusConfig = {
    PENDING:   { label: 'Pendente',   icon: Clock,          cls: 'text-amber-600 bg-amber-50' },
    PAID:      { label: 'Pago',       icon: CheckCircle,    cls: 'text-emerald-600 bg-emerald-50' },
    OVERDUE:   { label: 'Vencido',    icon: AlertCircle,    cls: 'text-red-600 bg-red-50' },
    CANCELLED: { label: 'Cancelado',  icon: XCircle,        cls: 'text-zinc-400 bg-zinc-100' },
    REFUNDED:  { label: 'Reembolso',  icon: XCircle,        cls: 'text-zinc-400 bg-zinc-100' },
    LOST:      { label: 'Perdido',    icon: XCircle,        cls: 'text-zinc-400 bg-zinc-100' },
    DISPUTED:  { label: 'Disputado',  icon: AlertCircle,    cls: 'text-orange-600 bg-orange-50' },
}

type FilterStatus = 'ALL' | Charge['status']

export default function ChargesPage() {
    const [charges, setCharges] = useState<Charge[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<FilterStatus>('ALL')
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        api.get<Charge[]>('/charges')
            .then(r => setCharges(r.data))
            .catch(() => setCharges(mockCharges))
            .finally(() => setLoading(false))
    }, [])

    function copyPix(code: string, id: string) {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(id)
            setTimeout(() => setCopied(null), 2000)
        })
    }

    const filtered = charges.filter(c => {
        const matchSearch = c.studentName.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'ALL' || c.status === filter
        return matchSearch && matchFilter
    })

    const filters: { key: FilterStatus; label: string }[] = [
        { key: 'ALL', label: 'Todas' },
        { key: 'PENDING', label: 'Pendentes' },
        { key: 'OVERDUE', label: 'Vencidas' },
        { key: 'PAID', label: 'Pagas' },
    ]

    return (
        <div className="space-y-5" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <div>
                <h1 className="text-lg font-semibold text-zinc-900">Cobranças</h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                    {charges.filter(c => c.status === 'PENDING').length} pendentes ·{' '}
                    {charges.filter(c => c.status === 'OVERDUE').length} vencidas
                </p>
            </div>

            {/* Search + filter */}
            <div className="space-y-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por aluno..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-md outline-none focus:border-zinc-400 transition-colors"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                filter === f.key
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block border border-zinc-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Aluno</th>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Valor</th>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Vencimento</th>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Status</th>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Pago em</th>
                            <th className="px-4 py-3 text-xs text-zinc-400 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-100 rounded animate-pulse" /></td>
                                ))}</tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">Nenhuma cobrança encontrada</td></tr>
                        ) : filtered.map(c => {
                            const cfg = statusConfig[c.status]
                            const Icon = cfg.icon
                            return (
                                <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-zinc-900">{c.studentName}</td>
                                    <td className="px-4 py-3 text-zinc-900 font-medium">{formatCurrency(c.amount)}</td>
                                    <td className="px-4 py-3 text-zinc-500">{formatDate(c.dueDate)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.cls}`}>
                                            <Icon size={10} />{cfg.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-500">{formatDate(c.paymentDate || '')}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            {c.pixCode && (
                                                <button
                                                    onClick={() => copyPix(c.pixCode!, c.id)}
                                                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                                >
                                                    <Copy size={11} />
                                                    {copied === c.id ? 'Copiado!' : 'PIX'}
                                                </button>
                                            )}
                                            {c.checkoutUrl && (
                                                <a
                                                    href={c.checkoutUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                                >
                                                    <ExternalLink size={11} />Link
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
                {loading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse" />
                )) : filtered.map(c => {
                    const cfg = statusConfig[c.status]
                    const Icon = cfg.icon
                    return (
                        <div key={c.id} className="border border-zinc-100 rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-sm font-medium text-zinc-900">{c.studentName}</p>
                                    <p className="text-xs text-zinc-400">Vence {formatDate(c.dueDate)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <p className="text-sm font-semibold text-zinc-900">{formatCurrency(c.amount)}</p>
                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.cls}`}>
                                        <Icon size={10} />{cfg.label}
                                    </span>
                                </div>
                            </div>
                            {(c.pixCode || c.checkoutUrl) && (
                                <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-50">
                                    {c.pixCode && (
                                        <button
                                            onClick={() => copyPix(c.pixCode!, c.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1 text-xs text-zinc-500 border border-zinc-200 py-1.5 rounded-md hover:bg-zinc-50"
                                        >
                                            <Copy size={11} />{copied === c.id ? 'Copiado!' : 'Copiar PIX'}
                                        </button>
                                    )}
                                    {c.checkoutUrl && (
                                        <a
                                            href={c.checkoutUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-1 text-xs text-zinc-500 border border-zinc-200 py-1.5 rounded-md hover:bg-zinc-50"
                                        >
                                            <ExternalLink size={11} />Ver link
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
