import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui/Primitives'
import { useAuth } from './firebase/auth'
import { isFirebaseConfigured } from './firebase/config'
import { DataProvider, useData } from './data/store'
import { FirebaseSetup } from './pages/FirebaseSetup'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { CalendarView } from './pages/CalendarView'
import { Events } from './pages/Events'
import { EventForm } from './pages/EventForm'
import { EventDetails } from './pages/EventDetails'
import { Clients } from './pages/Clients'
import { Payments } from './pages/Payments'
import { CrewFootage } from './pages/CrewFootage'
import { Notifications } from './pages/Notifications'
import { Settings } from './pages/Settings'
import { NotFound } from './pages/NotFound'

export default function App() {
  const { user, loading } = useAuth()

  // Without keys there is no database to talk to, so explain the setup instead
  // of showing a sign-in form that cannot possibly work.
  if (!isFirebaseConfigured) return <FirebaseSetup />

  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner size={26} />
        <span>Checking your sign-in…</span>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  )
}

function AppRoutes() {
  const { ready } = useData()

  if (!ready) {
    return (
      <div className="loading-screen">
        <Spinner size={26} />
        <span>Loading your events…</span>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="events" element={<Events />} />
        <Route path="events/new" element={<EventForm />} />
        <Route path="events/:eventId" element={<EventDetails />} />
        <Route path="events/:eventId/edit" element={<EventForm />} />
        <Route path="clients" element={<Clients />} />
        <Route path="payments" element={<Payments />} />
        <Route path="crew" element={<CrewFootage />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
