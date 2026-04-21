import { useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    LayoutDashboard,
    LayoutList,
    BarChart,
    FileText,
    RefreshCw,
    Settings,
    Users,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    Target,
    Trophy,
    Rocket,
    Network,
    User,
    LogOut
} from 'lucide-react'
import logo from '../assets/logo.png'


interface CRMLayoutProps {
    toggleTheme: () => void
    theme: 'dark' | 'light'
    setShowDictionary: (show: boolean) => void
}

export default function CRMLayout({ toggleTheme, theme, setShowDictionary }: CRMLayoutProps) {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const { user, logout } = useAuth()

    // State for collapsible menus
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        'Implantação': true, // Default open
        'Integração': true
    })

    const toggleMenu = (label: string) => {
        setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }))
    }

    const navItems = [
        {
            section: 'OPERACIONAL',
            items: [
                {
                    label: 'Implantação',
                    icon: Rocket,
                    children: [
                        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
                        { to: '/monitor', label: 'Monitor', icon: LayoutList },
                        { to: '/analytics', label: 'Analytics', icon: BarChart },
                        { to: '/reports', label: 'Relatórios', icon: FileText },
                        { to: '/team-diagnostics', label: 'Gestão do Time', icon: Users },
                    ]
                },
                {
                    label: 'Integração',
                    icon: Network,
                    children: [
                        { to: '/integration/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { to: '/integration/monitor', label: 'Monitor', icon: Target },
                        { to: '/integration/analytics', label: 'Analytics', icon: BarChart },
                        { to: '/integration/reports', label: 'Relatórios', icon: FileText },
                    ]
                }
            ]
        },
        {
            section: 'SISTEMA',
            items: [
                { to: '/sync', label: 'Sincronização', icon: RefreshCw },
            ]
        },
        {
            section: 'ADMINISTRATIVO',
            items: [
                { to: '/admin/performance', label: 'Performance (Bônus)', icon: Trophy },
                { to: '/admin/configs', label: 'Configurações', icon: Settings },
                { to: '/admin/users', label: 'Usuários', icon: Users },
            ]
        }
    ]

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
            {/* SEO Metadata for Audit */}
            <div className="hidden" aria-hidden="true">
                <meta name="description" content="CRM Instabuy - Gestão Operacional de E-commerce" />
                <meta property="og:title" content="Instabuy CRM" />
            </div>
            {/* Sidebar */}
            <aside
                className={`${collapsed ? 'w-20' : 'w-72'} 
                bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 
                flex flex-col transition-all duration-300 fixed h-full z-50 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 print:hidden`}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-100 dark:border-zinc-800/50">
                    <div className="relative group shrink-0">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                        <img src={logo} alt="Instabuy" className="relative h-8 w-auto object-contain" />
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden whitespace-nowrap">
                            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
                                CRM <span className="text-orange-500">Instabuy</span>
                            </h2>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium tracking-wider uppercase mt-0.5">
                                v3.0 Evolution
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className={`flex-1 py-6 px-3 space-y-6 ${collapsed ? 'overflow-visible' : 'overflow-y-auto no-scrollbar'}`}>
                    {navItems.map((group, idx) => (
                        <div key={idx}>
                            {!collapsed && (
                                <h3 className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-2 transition-opacity duration-300">
                                    {group.section}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item: any) => {
                                    // HAS CHILDREN (FOLDER)
                                    if (item.children) {
                                        const isOpen = openMenus[item.label] || false
                                        return (
                                            <div key={item.label} className="space-y-1 relative group">
                                                <button
                                                    onClick={() => toggleMenu(item.label)}
                                                    className={`
                                                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                                        ${isOpen && !collapsed
                                                            ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}
                                                    `}
                                                    title={collapsed ? item.label : undefined}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className="w-5 h-5 shrink-0 stroke-2" />
                                                        {!collapsed && <span>{item.label}</span>}
                                                    </div>
                                                    {!collapsed && (
                                                        <ChevronRight size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                                                    )}
                                                </button>

                                                {/* Submenu - Normal (Expanded) */}
                                                {!collapsed && isOpen && (
                                                    <div className="pl-4 space-y-1 relative before:absolute before:left-7 before:top-0 before:bottom-0 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800 animate-in slide-in-from-top-2 duration-200">
                                                        {item.children.map((child: any) => {

                                                            return (
                                                                <NavLink
                                                                    key={child.to}
                                                                    to={child.to}
                                                                    className={({ isActive }) => `
                                                                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ml-2
                                                                        ${isActive
                                                                            ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                                                            : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                                                                        }
                                                                    `}
                                                                >
                                                                    <child.icon className="w-4 h-4 shrink-0 stroke-2" />
                                                                    <span>{child.label}</span>
                                                                </NavLink>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* Submenu - Collapsed (Floating) */}
                                                {collapsed && (
                                                    <div className="absolute left-14 top-0 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-50">
                                                        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                                                            <span className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">{item.label}</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {item.children.map((child: any) => (
                                                                <NavLink
                                                                    key={child.to}
                                                                    to={child.to}
                                                                    className={({ isActive }) => `
                                                                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                                                        ${isActive
                                                                            ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                                                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                                        }
                                                                    `}
                                                                >
                                                                    <child.icon className="w-4 h-4 shrink-0" />
                                                                    <span>{child.label}</span>
                                                                </NavLink>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }

                                    // SINGLE ITEM
                                    const isActive = location.pathname === item.to
                                    return (
                                        <div key={item.to} className="relative group">
                                            <NavLink
                                                to={item.to}
                                                className={({ isActive }) => `
                                                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                                    ${isActive
                                                        ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm ring-1 ring-orange-200 dark:ring-orange-500/20'
                                                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                                                    }
                                                    ${collapsed ? 'justify-center' : ''}
                                                `}
                                            >
                                                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                                {!collapsed && <span>{item.label}</span>}
                                            </NavLink>

                                            {/* Tooltip for Single Items when Collapsed */}
                                            {collapsed && (
                                                <div className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 pointer-events-none">
                                                    {item.label}
                                                    {/* Little arrow */}
                                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900 dark:border-r-white"></div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer / Toggle */}
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-2">
                    <button
                        onClick={toggleTheme}
                        className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors
                            ${collapsed ? 'justify-center' : ''}
                        `}
                        title={theme === 'dark' ? "Modo Claro" : "Modo Escuro"}
                    >
                        <span className="text-xl leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
                        {!collapsed && <span>Alterar Tema</span>}
                    </button>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center justify-center p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden
                ${collapsed ? 'ml-20' : 'ml-72'} print:ml-0 print:w-full print:bg-white
                `}
            >
                {/* Header/Topbar area if needed (e.g. for Breadcrumbs or global actions) */}
                <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-8 flex items-center justify-end gap-4 print:hidden">
                    <button
                        onClick={() => setShowDictionary(true)}
                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
                        title="Dicionário de Métricas"
                    >
                        <HelpCircle size={20} />
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>

                    <Link
                        to="/profile"
                        className="flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                    >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold object-cover ring-2 ring-orange-500/20">
                            {user?.profile_picture ? (
                                <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                        </div>
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 hidden md:block">
                            {user?.name?.split(' ')[0]}
                        </span>
                    </Link>

                    <button
                        onClick={logout}
                        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                        title="Sair do Sistema"
                    >
                        <LogOut size={20} />
                    </button>
                </header>

                <div className={location.pathname.includes('/monitor') ? 'p-0 print:p-0' : 'p-8 print:p-0'}>
                    <div className={`${location.pathname.includes('/monitor') ? 'max-w-full' : 'max-w-7xl'} mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Global AI Chat */}

        </div>
    )
}
