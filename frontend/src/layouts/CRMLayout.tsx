import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
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
    Sparkles,
    Target,
    Trophy,
    Rocket,
    Network,
    LogOut
} from 'lucide-react'

interface CRMLayoutProps {
    toggleTheme?: () => void
    theme?: 'dark' | 'light'
    setShowDictionary: (show: boolean) => void
}

export default function CRMLayout({ setShowDictionary }: CRMLayoutProps) {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const { user, logout } = useAuth()

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        'Implantação': true,
        'Integração': false
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
                { to: '/ai-command-center', label: 'Inteligência I.A.', icon: Sparkles },
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
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-200">
            {/* Sidebar */}
            <aside
                className={`${collapsed ? 'w-20' : 'w-64'} 
                bg-white border-r border-gray-200
                flex flex-col transition-all duration-300 fixed h-full z-40 print:hidden`}
            >
                {/* Logo Area */}
                <div className="pt-6 pb-6 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[10px] bg-orange-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm shadow-orange-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-orange-600 to-orange-400"></div>
                            <div className="relative w-3.5 h-3.5 border-[2px] border-white rounded-sm"></div>
                        </div>
                        {!collapsed && (
                            <div className="font-bold text-gray-900 text-[15px] tracking-tight truncate">
                                CRM\_Operações
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-2 overflow-y-auto no-scrollbar">
                    <div className="px-3 space-y-6">
                        {navItems.map((group, idx) => (
                            <div key={idx} className="space-y-1">
                                {!collapsed && (
                                    <h3 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        {group.section}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item: any) => {
                                        if (item.children) {
                                            const isOpen = openMenus[item.label] || false
                                            const isActiveChild = item.children.some((child: any) => location.pathname === child.to || location.pathname.startsWith(child.to + '/'))
                                            return (
                                                <div key={item.label} className="space-y-1 relative group">
                                                    <button
                                                        onClick={() => toggleMenu(item.label)}
                                                        className={`
                                                            w-full flex items-center justify-between px-3 py-2.5 rounded-md text-[13.5px] font-medium transition-colors
                                                            ${isOpen || isActiveChild
                                                                ? 'text-gray-900 bg-orange-50/50'
                                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                                            }
                                                        `}
                                                        title={collapsed ? item.label : undefined}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <item.icon className={`w-[18px] h-[18px] shrink-0 ${isOpen || isActiveChild ? 'text-orange-500' : ''}`} strokeWidth={isOpen || isActiveChild ? 2.5 : 2} />
                                                            {!collapsed && <span className="truncate">{item.label}</span>}
                                                        </div>
                                                        {!collapsed && (
                                                            <ChevronRight size={14} className={`transition-transform duration-200 text-gray-400 shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
                                                        )}
                                                    </button>
                                                    {!collapsed && isOpen && (
                                                        <div className="mt-1 space-y-1">
                                                            {item.children.map((child: any) => {
                                                                const isActive = location.pathname === child.to || (child.to !== '/' && location.pathname.startsWith(child.to))
                                                                return (
                                                                    <NavLink
                                                                        key={child.to}
                                                                        to={child.to}
                                                                        className={`
                                                                            flex items-center gap-3 pl-10 pr-3 py-2 rounded-md text-[13px] transition-colors
                                                                            ${isActive
                                                                                ? 'bg-orange-50/50 text-orange-600 font-semibold'
                                                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium'
                                                                            }
                                                                        `}
                                                                    >
                                                                        <span className="truncate">{child.label}</span>
                                                                    </NavLink>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        }

                                        const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
                                        return (
                                            <NavLink
                                                key={item.to}
                                                to={item.to}
                                                className={`
                                                    flex items-center gap-3 px-3 py-2.5 rounded-md text-[13.5px] transition-colors
                                                    ${isActive
                                                        ? 'bg-orange-50/50 text-orange-600 font-semibold'
                                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium'
                                                    }
                                                    ${collapsed ? 'justify-center' : ''}
                                                `}
                                                title={collapsed ? item.label : undefined}
                                            >
                                                <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                                                {!collapsed && <span className="truncate">{item.label}</span>}
                                            </NavLink>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>

                {/* Footer User */}
                <div className="border-t border-gray-100 p-4">
                    {!collapsed ? (
                        <div className="flex items-center gap-3 w-full hover:bg-gray-50 p-2 rounded-md transition-colors cursor-pointer group">
                            <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-gray-600 font-semibold">
                                {user?.profile_picture ? (
                                    <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0) || 'A'
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold text-gray-900 truncate">{user?.name?.split(' ')[0] || 'Administrador'}</div>
                                <div className="text-[12px] text-gray-500 font-medium truncate">Minha Conta</div>
                            </div>
                            <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-50">
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center w-full hover:bg-gray-50 p-2 rounded-md transition-colors cursor-pointer" onClick={logout} title="Sair">
                            <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-gray-600 font-semibold">
                                <LogOut size={16} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center justify-center w-full p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300
                ${collapsed ? 'ml-20' : 'ml-64'} print:ml-0 print:w-full print:bg-white
                `}
            >
                {/* Minimal Header */}
                <header className="h-14 bg-white/50 backdrop-blur-md border-b border-gray-200/50 px-8 flex items-center justify-end gap-4 print:hidden sticky top-0 z-30">
                    <button
                        onClick={() => setShowDictionary(true)}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Dicionário de Métricas"
                    >
                        <HelpCircle size={18} strokeWidth={2.5} />
                    </button>
                </header>

                <div className={location.pathname.includes('/monitor') ? 'p-0 print:p-0' : 'p-6 lg:p-8 print:p-0'}>
                    <div className={`${location.pathname.includes('/monitor') ? 'max-w-full' : 'max-w-[1200px]'} mx-auto`}>
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    )
}
