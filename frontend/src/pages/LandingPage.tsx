import {Link} from 'react-router-dom'
import {ArrowUpRight} from 'lucide-react'

export default function LandingPage() {
    return (
        <div style={{ fontFamily: "'Geist', 'Inter', sans-serif" }} className="min-h-screen bg-white text-zinc-900">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-100">
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-tight">Mensalito</span>
                    <div className="flex items-center gap-6">
                        <Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                            Entrar
                        </Link>
                        <Link
                            to="/register"
                            className="text-sm bg-zinc-900 text-white px-4 py-1.5 rounded-md hover:bg-zinc-700 transition-colors"
                        >
                            Começar grátis
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-40 pb-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mb-6">Para escolas pequenas</p>
                    <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6 max-w-2xl">
                        Cobranças no automático.
                    </h1>
                    <p className="text-zinc-500 text-lg max-w-lg leading-relaxed mb-10">
                        Gera PIX, envia por WhatsApp e cobra seus alunos sozinho todo mês. Para escolas de idiomas, dança, música e artes marciais.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm px-5 py-2.5 rounded-md hover:bg-zinc-700 transition-colors"
                        >
                            30 dias grátis <ArrowUpRight size={14} />
                        </Link>
                        <span className="text-xs text-zinc-400">Sem cartão de crédito</span>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="border-t border-zinc-100 mx-6 max-w-5xl md:mx-auto" />

            {/* Features */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12">
                    {[
                        {
                            title: 'Cobranças automáticas',
                            body: 'PIX e boleto gerados todo mês sem você precisar fazer nada.',
                        },
                        {
                            title: 'WhatsApp automático',
                            body: 'Link de pagamento enviado direto pro celular. Lembretes para inadimplentes no D+3 e D+7.',
                        },
                        {
                            title: 'Dashboard financeiro',
                            body: 'Veja em segundos quanto entrou, quanto está previsto e quem não pagou.',
                        },
                    ].map((f, i) => (
                        <div key={i}>
                            <p className="text-xs text-zinc-400 mb-3">0{i + 1}</p>
                            <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                            <p className="text-sm text-zinc-500 leading-relaxed">{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="border-t border-zinc-100 mx-6 max-w-5xl md:mx-auto" />

            {/* Pricing */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mb-12">Preços</p>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: 'Básico', price: 'R$129', limit: 'Até 50 alunos' },
                            { name: 'Padrão', price: 'R$229', limit: 'Até 150 alunos', highlight: true },
                            { name: 'Pro', price: 'R$349', limit: 'Até 400 alunos' },
                        ].map((p, i) => (
                            <div
                                key={i}
                                className={`p-6 rounded-lg border ${p.highlight ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'}`}
                            >
                                <p className={`text-xs mb-4 ${p.highlight ? 'text-zinc-400' : 'text-zinc-400'}`}>{p.name}</p>
                                <p className="text-3xl font-semibold tracking-tight mb-1">{p.price}<span className={`text-sm font-normal ml-1 ${p.highlight ? 'text-zinc-400' : 'text-zinc-400'}`}>/mês</span></p>
                                <p className={`text-sm mb-6 ${p.highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.limit}</p>
                                <Link
                                    to="/register"
                                    className={`block text-center text-sm py-2 rounded-md transition-colors ${
                                        p.highlight
                                            ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                                            : 'border border-zinc-200 hover:border-zinc-400'
                                    }`}
                                >
                                    Começar
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="border-t border-zinc-100">
                <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
                    <span className="text-sm font-semibold">Mensalito</span>
                    <p className="text-xs text-zinc-400">© {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    )
}