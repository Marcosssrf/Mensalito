import {NavLink, Outlet, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import {BookOpen, CreditCard, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Users, X} from 'lucide-react'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {Separator} from '@/components/ui/separator'

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Alunos', icon: Users },
    { to: '/plans', label: 'Planos', icon: FileText },
    { to: '/classes', label: 'Turmas', icon: BookOpen },
    { to: '/enrollments', label: 'Matrículas', icon: GraduationCap },
    { to: '/charges', label: 'Cobranças', icon: CreditCard },
]

export default function Layout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(true)

    function handleLogout() {
        logout()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 border-r bg-card flex flex-col`}>
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                    {sidebarOpen && (
                        <span className="text-xl font-bold text-primary">Mensalito</span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </Button>
                </div>

                <Separator />

                {/* Nav */}
                <nav className="flex-1 p-2 space-y-1 mt-2">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`
                            }
                        >
                            <Icon size={18} className="shrink-0" />
                            {sidebarOpen && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <Separator />

                {/* Footer */}
                <div className="p-3">
                    {sidebarOpen && (
                        <p className="text-xs text-muted-foreground mb-2 px-3 truncate">
                            {user?.name}
                        </p>
                    )}
                    <Button
                        variant="ghost"
                        size={sidebarOpen ? 'default' : 'icon'}
                        className="w-full text-muted-foreground hover:text-foreground"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        {sidebarOpen && <span className="ml-2">Sair</span>}
                    </Button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}