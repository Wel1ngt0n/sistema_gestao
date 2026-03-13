import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginScreen from './pages/LoginScreen'

import CRMLayout from './layouts/CRMLayout'
import Dashboard from './components/Dashboard'
import Monitor from './components/MonitorV2'
// Módulos de Integração
import IntegrationDashboard from './features/integration/IntegrationDashboard'
import IntegrationMonitor from './features/integration/IntegrationMonitor'
import IntegrationReports from './features/integration/IntegrationReports'
import IntegrationAnalytics from './features/integration/IntegrationAnalytics'

import DashboardAnalytics from './components/analytics/DashboardAnalytics'
import ForecastPage from './features/forecast/ForecastPage'
import MonthlyReport from './components/reports/MonthlyReport'
import SyncPage from './features/sync/SyncPage'
import MetricsDictionaryModal from './components/MetricsDictionaryModal'
import SuperAdminDashboard from './features/admin/SuperAdminDashboard'
import SettingsPage from './features/admin/SettingsPage'
import UserManagementPage from './features/admin/UserManagementPage'
import AIChatPage from './components/ai/AIChatPage'
import { ProfilePage } from './features/profile/ProfilePage'

function App() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')
    const [showDictionary, setShowDictionary] = useState(false)

    // Lógica de Alternância de Tema
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    return (
        <>
            <Routes>
                {/* Rota pública de Login */}
                <Route path="/login" element={<LoginScreen />} />

                {/* Rotas Protegidas pelo AuthContext */}
                <Route element={
                    <ProtectedRoute>
                        <CRMLayout
                            theme={theme}
                            toggleTheme={toggleTheme}
                            setShowDictionary={setShowDictionary}
                        />
                    </ProtectedRoute>
                }>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/monitor" element={<Monitor />} />

                    {/* Suíte de Integração */}
                    <Route path="/integration" element={<Navigate to="/integration/dashboard" replace />} />
                    <Route path="/integration/dashboard" element={<IntegrationDashboard />} />
                    <Route path="/integration/monitor" element={<IntegrationMonitor />} />
                    <Route path="/integration/analytics" element={<IntegrationAnalytics />} />
                    <Route path="/integration/reports" element={<IntegrationReports />} />

                    <Route path="/analytics" element={<DashboardAnalytics />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/reports" element={<MonthlyReport />} />
                    <Route path="/sync" element={<SyncPage />} />

                    {/* Rotas de Admin */}
                    <Route path="/admin/performance" element={<SuperAdminDashboard />} />
                    <Route path="/admin/users" element={<UserManagementPage />} />
                    <Route path="/admin/configs" element={<SettingsPage />} />

                    {/* AI Command Center */}
                    <Route path="/ai-command-center" element={<AIChatPage />} />

                    {/* User Profile */}
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Catch all (Captura tudo) */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>

            <MetricsDictionaryModal
                isOpen={showDictionary}
                onClose={() => setShowDictionary(false)}
            />
        </>
    )
}

export default App
