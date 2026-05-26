import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Overview from './pages/Overview'
import Campanas from './pages/Campanas'
import Creativos from './pages/Creativos'
import Historial from './pages/Historial'
import Alertas from './pages/Alertas'
import Recomendaciones from './pages/Recomendaciones'
import Organico from './pages/Organico'
import Analytics from './pages/Analytics'
import Timeline from './pages/Timeline'
import Benchmarks from './pages/Benchmarks'
import Estrategia from './pages/Estrategia'
import ClientePublico from './pages/ClientePublico'
import { useState } from 'react'

const pages = {
  overview:        Overview,
  campanas:        Campanas,
  creativos:       Creativos,
  historial:       Historial,
  alertas:         Alertas,
  recomendaciones: Recomendaciones,
  organico:        Organico,
  analytics:       Analytics,
  timeline:        Timeline,
  benchmarks:      Benchmarks,
  estrategia:      Estrategia,
}

function Dashboard() {
  const [page, setPage] = useState('overview')
  const Page = pages[page] || Overview
  return (
    <div className="min-h-screen bg-bg font-sans">
      <Sidebar active={page} onNavigate={setPage} />
      <main className="md:ml-60 pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <Page />
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const { client } = useAuth()
  // Ruta pública para cliente final
  if (window.location.pathname === '/cliente') return <ClientePublico />
  return client ? <Dashboard /> : <Login />
}
