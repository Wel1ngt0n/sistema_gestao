import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, HelpCircle, Layers, ChevronDown, ChevronRight, BarChart3, FileText, PieChart, Settings } from 'lucide-react';
import IntegrationDashboard from './modules/integracao/IntegrationDashboard';
import ImplementationDashboard from './modules/implantacao/ImplementationDashboard';
import ImplementationSettings from './modules/implantacao/ImplementationSettings';

import ImplementationAnalytics from './modules/implantacao/ImplementationAnalytics';

// Placeholder Pages
const PlaceholderPage = ({ title, color }) => (
    <div className="p-8">
        <h1 className={`text-2xl font-bold ${color}`}>{title}</h1>
        <p className="mt-2 text-gray-600">Este módulo está em desenvolvimento.</p>
    </div>
);

const SuportePage = () => <PlaceholderPage title="🎧 Módulo Suporte" color="text-orange-500" />;

// Sidebar Menu Item Component
const SidebarMenuItem = ({ icon: Icon, label, to, children }) => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    // Check if any child route is active
    const isActive = to ? location.pathname.startsWith(to) : false;

    // Toggle collapse
    const toggle = () => setIsOpen(!isOpen);

    if (children) {
        return (
            <div className="mb-1">
                <button
                    onClick={toggle}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                    <div className="flex items-center gap-3">
                        <Icon size={20} />
                        <span className="font-medium">{label}</span>
                    </div>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {/* Submenu */}
                {isOpen && (
                    <div className="ml-9 mt-1 space-y-1 border-l border-slate-700 pl-2">
                        {children}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 mb-1 ${location.pathname === to ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </Link>
    );
};

const SidebarSubItem = ({ to, label, icon: Icon }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 ${isActive ? 'text-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}`}
        >
            {Icon && <Icon size={14} />}
            {label}
        </Link>
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="flex h-screen bg-slate-50">
                {/* Sidebar */}
                <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
                    <div className="p-6 border-b border-slate-800">
                        <h1 className="text-xl font-bold tracking-tight">Gestão <span className="text-blue-400">3.0</span></h1>
                        <p className="text-xs text-slate-500 mt-1">Corporate Edition</p>
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

                        {/* Módulo Implantação */}
                        <SidebarMenuItem icon={LayoutDashboard} label="Implantação" to="/implantacao">
                            <SidebarSubItem to="/implantacao/dashboard" label="Dashboard" icon={PieChart} />
                            {/* <SidebarSubItem to="/implantacao/configuracoes" label="Configurações (Monitor)" icon={Settings} /> -> Movido para Admin */}
                            <SidebarSubItem to="/implantacao/relatorios" label="Relatórios" icon={FileText} />
                            <SidebarSubItem to="/implantacao/analytics" label="Analytics" icon={BarChart3} />
                        </SidebarMenuItem>

                        {/* Módulo Integração */}
                        <SidebarMenuItem icon={Layers} label="Integração" to="/integracao">
                            <SidebarSubItem to="/integracao/dashboard" label="Dashboard" icon={PieChart} />
                            <SidebarSubItem to="/integracao/relatorios" label="Relatórios" icon={FileText} />
                            <SidebarSubItem to="/integracao/analytics" label="Analytics" icon={BarChart3} />
                        </SidebarMenuItem>

                        {/* Módulo Suporte */}
                        <SidebarMenuItem icon={HelpCircle} label="Suporte" to="/suporte">
                            <SidebarSubItem to="/suporte/dashboard" label="Dashboard" icon={PieChart} />
                            <SidebarSubItem to="/suporte/relatorios" label="Relatórios" icon={FileText} />
                            <SidebarSubItem to="/suporte/analytics" label="Analytics" icon={BarChart3} />
                        </SidebarMenuItem>

                        {/* Administração (Section) */}
                        <div className="my-4 px-4">
                            <div className="h-px bg-slate-800"></div>
                            <p className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Administração</p>
                        </div>

                        <SidebarMenuItem icon={Settings} label="Configurações" to="/admin/configuracoes" />
                        <SidebarMenuItem icon={Users} label="Usuários" to="/admin/usuarios" />

                    </nav>

                    <div className="p-4 border-t border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs">US</div>
                            <div className="text-sm">
                                <p className="font-medium">Admin User</p>
                                <p className="text-xs text-slate-500">Online</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-auto bg-slate-50/50">
                    <div className="p-8 max-w-7xl mx-auto">
                        <Routes>
                            {/* Redirect Root to Implantação Dashboard */}
                            <Route path="/" element={<Navigate to="/implantacao/dashboard" replace />} />

                            {/* Implantação Routes */}
                            <Route path="/implantacao" element={<Navigate to="/implantacao/dashboard" replace />} />
                            <Route path="/implantacao/dashboard" element={<ImplementationDashboard />} />
                            {/* <Route path="/implantacao/configuracoes" element={<ImplementationSettings />} /> */}
                            <Route path="/implantacao/relatorios" element={<PlaceholderPage title="Nenhum Relatório Disponível" color="text-slate-600" />} />
                            <Route path="/implantacao/analytics" element={<ImplementationAnalytics />} />

                            {/* Integração Routes */}
                            <Route path="/integracao" element={<Navigate to="/integracao/dashboard" replace />} />
                            <Route path="/integracao/dashboard" element={<IntegrationDashboard />} />
                            <Route path="/integracao/relatorios" element={<PlaceholderPage title="Relatórios de Integração" color="text-slate-600" />} />
                            <Route path="/integracao/analytics" element={<PlaceholderPage title="Analytics de Integração" color="text-slate-600" />} />

                            {/* Suporte Routes */}
                            <Route path="/suporte" element={<Navigate to="/suporte/dashboard" replace />} />
                            <Route path="/suporte/dashboard" element={<SuportePage />} />
                            <Route path="/suporte/relatorios" element={<PlaceholderPage title="Relatórios de Suporte" color="text-slate-600" />} />
                            <Route path="/suporte/analytics" element={<PlaceholderPage title="Analytics de Suporte" color="text-slate-600" />} />

                            {/* Admin Routes */}
                            <Route path="/admin/configuracoes" element={<ImplementationSettings />} />
                            <Route path="/admin/usuarios" element={<PlaceholderPage title="Gestão de Usuários" color="text-indigo-600" />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </BrowserRouter>
    )
}

export default App;
