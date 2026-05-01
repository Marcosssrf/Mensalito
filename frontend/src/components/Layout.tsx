import {NavLink, Outlet, useLocation, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import {
    BookOpen,
    CreditCard,
    FileText,
    GraduationCap,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    Users,
    X
} from 'lucide-react'
import {useEffect, useState} from 'react'
import {Button} from '@/components/ui/button'
import {Separator} from '@/components/ui/separator'

const navItems = [
    { to: '/app/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/app/students',    label: 'Alunos',      icon: Users },
    { to: '/app/plans',       label: 'Planos',      icon: FileText },
    { to: '/app/classes',     label: 'Turmas',      icon: BookOpen },
    { to: '/app/enrollments', label: 'Matrículas',  icon: GraduationCap },
    { to: '/app/charges',     label: 'Cobranças',   icon: CreditCard },
]

export default function Layout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => { setMobileOpen(false) }, [location.pathname])

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth < 768) setSidebarOpen(false) }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    function handleLogout() { logout(); navigate('/login') }

    const allItems = [...navItems, { to: '/app/settings', label: 'Configurações', icon: Settings }]
    const currentPage = allItems.find(item => location.pathname.startsWith(item.to))?.label || 'Mensalito'
    const expanded = sidebarOpen || mobileOpen

    return (
        <div className="flex h-screen bg-background" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            {mobileOpen && (
                <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />
            )}

            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
                ${sidebarOpen ? 'w-56' : 'md:w-16'} w-56
                transition-all duration-300 border-r bg-card flex flex-col shadow-lg md:shadow-none
            `}>
                <div className="p-4 flex items-center justify-between h-14">
                    {expanded && <span className="text-sm font-semibold tracking-tight text-zinc-900">Mensalito</span>}
                    <Button variant="ghost" size="icon" className="hidden md:flex ml-auto" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
                    </Button>
                    <Button variant="ghost" size="icon" className="md:hidden ml-auto" onClick={() => setMobileOpen(false)}>
                        <X size={16} />
                    </Button>
                </div>

                <Separator />

                {/* Main nav */}
                <nav className="flex-1 p-2 space-y-0.5 mt-2">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                                    isActive ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                                }`
                            }
                        >
                            <Icon size={16} className="shrink-0" />
                            {expanded && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <Separator />

                {/* Bottom: Settings + Logout */}
                <div className="p-2 space-y-0.5">
                    <NavLink
                        to="/app/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                                isActive ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                            }`
                        }
                    >
                        <Settings size={16} className="shrink-0" />
                        {expanded && <span>Configurações</span>}
                    </NavLink>

                    <div className="px-1 pb-1">
                        {expanded && <p className="text-xs text-zinc-400 px-2 pt-2 pb-1 truncate">{user?.name}</p>}
                        <Button
                            variant="ghost"
                            size={expanded ? 'default' : 'icon'}
                            className="w-full text-zinc-400 hover:text-zinc-900 text-sm justify-start"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            {expanded && <span className="ml-2">Sair</span>}
                        </Button>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b bg-card shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                        <Menu size={18} />
                    </Button>
                    <span className="text-sm font-semibold text-zinc-900">{currentPage}</span>
                </div>

                <main className="flex-1 overflow-auto">
                    <div className="p-4 md:p-6 max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
