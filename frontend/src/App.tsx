import {Navigate, Route, Routes} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import StudentsPage from '@/pages/StudentsPage'
import PlansPage from '@/pages/PlansPage'
import ClassesPage from '@/pages/ClassesPage'
import EnrollmentsPage from '@/pages/EnrollmentsPage'
import ChargesPage from '@/pages/ChargesPage'
import SettingsPage from '@/pages/SettingsPage'
import Layout from '@/components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth()
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/app" element={
                <PrivateRoute>
                    <Layout />
                </PrivateRoute>
            }>
                <Route index element={<Navigate to="/app/dashboard" />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="plans" element={<PlansPage />} />
                <Route path="classes" element={<ClassesPage />} />
                <Route path="enrollments" element={<EnrollmentsPage />} />
                <Route path="charges" element={<ChargesPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    )
}
