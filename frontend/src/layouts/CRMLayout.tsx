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
    setShowDictionary: (show: boolean) => void
}

export default function CRMLayout({ setShowDictionary }: CRMLayoutProps) {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const { user, logout } = useAuth()

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        'Implantação': true,
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
        <div className="flex min-h-screen bg-[#EEF0F8] text-slate-900">
            {/* SEO Metadata */}
            <div className="hidden" aria-hidden="true">
                <meta name="description" content="CRM Instabuy - Gestão Operacional de E-commerce" />
                <meta property="og:title" content="Instabuy CRM" />
            </div>

            {/* Sidebar */}
            <aside
                className={`${collapsed ? 'w-20' : 'w-72'}
                bg-white border-r border-slate-200
                flex flex-col transition-all duration-300 fixed h-full z-50 shadow-sm print:hidden`}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
                    <div className="relative group shrink-0">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                        <img src={logo} alt="Instabuy" className="relative h-8 w-auto object-contain" />
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden whitespace-nowrap">
                            <h2 className="text-sm font-black tracking-tighter text-slate-900 leading-none">
                                SISTEMA <span className="text-indigo-600">GESTÃO</span>
                            </h2>
                            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
                                Operações
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className={`flex-1 py-6 px-3 space-y-6 ${collapsed ? 'overflow-visible' : 'overflow-y-auto no-scrollbar'}`}>
                    {navItems.map((group, idx) => (
                        <div key={idx}>
                            {!collapsed && (
                                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
                                                            ? 'bg-slate-100 text-slate-900'
                                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
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

                                                {/* Submenu - Expanded */}
                                                {!collapsed && isOpen && (
                                                    <div className="pl-4 space-y-1 relative before:absolute before:left-7 before:top-0 before:bottom-0 before:w-px before:bg-slate-200 animate-in slide-in-from-top-2 duration-200">
                                                        {item.children.map((child: any) => (
                                                            <NavLink
                                                                key={child.to}
                                                                to={child.to}
                                                                className={({ isActive }) => `
                                                                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ml-2
                                                                    ${isActive
                                                                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                                                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                                    }
                                                                `}
                                                            >
                                                                <child.icon className="w-4 h-4 shrink-0 stroke-2" />
                                                                <span>{child.label}</span>
                                                            </NavLink>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Submenu - Collapsed (Floating) */}
                                                {collapsed && (
                                                    <div className="absolute left-14 top-0 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-50">
                                                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                                            <span className="text-xs font-bold uppercase text-slate-400">{item.label}</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {item.children.map((child: any) => (
                                                                <NavLink
                                                                    key={child.to}
                                                                    to={child.to}
                                                                    className={({ isActive }) => `
                                                                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                                                        ${isActive
                                                                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                                                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                                                        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-200'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                    }
                                                    ${collapsed ? 'justify-center' : ''}
                                                `}
                                            >
                                                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                                {!collapsed && <span>{item.label}</span>}
                                            </NavLink>

                                            {/* Tooltip for Collapsed Items */}
                                            {collapsed && (
                                                <div className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 pointer-events-none">
                                                    {item.label}
                                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden
                ${collapsed ? 'ml-20' : 'ml-72'} print:ml-0 print:w-full print:bg-white
                `}
            >
                {/* Topbar */}
                <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-8 flex items-center justify-end gap-4 print:hidden">
                    <button
                        onClick={() => setShowDictionary(true)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Dicionário de Métricas"
                    >
                        <HelpCircle size={20} />
                    </button>

                    <div className="h-6 w-px bg-slate-200"></div>

                    <Link
                        to="/profile"
                        className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200"
                    >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold ring-2 ring-indigo-500/20">
                            {user?.profile_picture ? (
                                <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                        </div>
                        <span className="text-sm font-bold text-slate-700 hidden md:block">
                            {user?.name?.split(' ')[0]}
                        </span>
                    </Link>

                    <button
                        onClick={logout}
                        className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
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
        </div>
    )
}
