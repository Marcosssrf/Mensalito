import {Navigate, Route, Routes, useSearchParams} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AcceptInvitePage from '@/pages/AcceptInvitePage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import StudentsPage from '@/pages/StudentsPage'
import StudentDetailPage from '@/pages/StudentDetailPage'
import PlansPage from '@/pages/PlansPage'
import ClassesPage from '@/pages/ClassesPage'
import EnrollmentsPage from '@/pages/EnrollmentsPage'
import ChargesPage from '@/pages/ChargesPage'
import SettingsPage from '@/pages/SettingsPage'
import ReportsPage from '@/pages/ReportsPage'
import WhatsAppPage from '@/pages/WhatsAppPage'
import ActivityPage from '@/pages/ActivityPage'
import BillingPage from '@/pages/BillingPage'
import TeachersPage from '@/pages/TeachersPage'
import Layout from '@/components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth()
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function RegisterRoute() {
    const [params] = useSearchParams()
    return params.has('invite') ? <AcceptInvitePage /> : <RegisterPage />
}

export default function App() {
    return (
        <Routes>
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterRoute />} />
            {/* Rota de callback do Supabase após confirmação de email */}
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/app" element={
                <PrivateRoute>
                    <Layout />
                </PrivateRoute>
            }>
                <Route index element={<Navigate to="/app/dashboard" />} />
                <Route path="dashboard"   element={<DashboardPage />} />
                <Route path="students"    element={<StudentsPage />} />
                <Route path="students/:id" element={<StudentDetailPage />} />
                <Route path="plans"       element={<PlansPage />} />
                <Route path="classes"     element={<ClassesPage />} />
                <Route path="enrollments" element={<EnrollmentsPage />} />
                <Route path="charges"     element={<ChargesPage />} />
                <Route path="settings"    element={<SettingsPage />} />
                <Route path="reports"     element={<ReportsPage />} />
                <Route path="whatsapp"    element={<WhatsAppPage />} />
                <Route path="activity"    element={<ActivityPage />} />
                <Route path="billing"     element={<BillingPage />} />
                <Route path="teachers"    element={<TeachersPage />} />
            </Route>
        </Routes>
    )
}