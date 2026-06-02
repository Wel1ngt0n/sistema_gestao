import { useState } from 'react'
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
import AnalystProfileView from './pages/implantadores/AnalystProfileView'
import { SupportDashboard } from './pages/SupportDashboard'

import PainelAnalyticsFinal from './components/analytics/PainelAnalyticsFinal'
import ForecastPage from './features/forecast/ForecastPage'
import MonthlyReport from './components/reports/MonthlyReport'
import SyncPage from './features/sync/SyncPage'
import MetricsDictionaryModal from './components/MetricsDictionaryModal'
import SuperAdminDashboard from './features/admin/SuperAdminDashboard'
import SettingsPage from './features/admin/SettingsPage'
import UserManagementPage from './features/admin/UserManagementPage'
import { ProfilePage } from './features/profile/ProfilePage'
import Jarvis from './pages/Jarvis'

function App() {
    const [showDictionary, setShowDictionary] = useState(false)

    return (
        <>
            <Routes>
                {/* Rota pública de Login */}
                <Route path="/login" element={<LoginScreen />} />

                {/* Rotas Protegidas pelo AuthContext */}
                <Route element={
                    <ProtectedRoute>
                        <CRMLayout setShowDictionary={setShowDictionary} />
                    </ProtectedRoute>
                }>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/jarvis" element={<Jarvis />} />
                    <Route path="/jarvis-cockpit" element={<Navigate to="/analytics" replace />} />
                    <Route path="/monitor" element={<Monitor />} />
                    <Route path="/team-diagnostics" element={<Navigate to="/analytics" replace />} />
                    <Route path="/team-diagnostics/:name" element={<AnalystProfileView />} />

                    {/* Suíte de Integração */}
                    <Route path="/integration" element={<Navigate to="/integration/dashboard" replace />} />
                    <Route path="/integration/dashboard" element={<IntegrationDashboard />} />
                    <Route path="/integration/monitor" element={<IntegrationMonitor />} />
                    <Route path="/integration/analytics" element={<IntegrationAnalytics />} />
                    <Route path="/integration/reports" element={<IntegrationReports />} />
                    
                    {/* Suporte Zenvia */}
                    <Route path="/support" element={<SupportDashboard />} />

                    <Route path="/analytics" element={<PainelAnalyticsFinal />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/reports" element={<MonthlyReport />} />
                    <Route path="/sync" element={
                        <ProtectedRoute requiredPermission="manage_sync">
                            <SyncPage />
                        </ProtectedRoute>
                    } />

                    {/* Rotas de Admin */}
                    <Route path="/admin/performance" element={<SuperAdminDashboard />} />
                    <Route path="/admin/users" element={<UserManagementPage />} />
                    <Route path="/admin/configs" element={<SettingsPage />} />

                    {/* User Profile */}
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Catch all */}
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
