import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewDeal from './pages/NewDeal'
import ClaimDeal from './pages/ClaimDeal'
import Marketplace from './pages/Marketplace'
import ManageDeal from './pages/ManageDeal'
import Admin from './pages/Admin'

const OWNER = '0x96cb116869808e935b870e94517f6f58cded5cde'

function AdminRoute() {
  const { address } = useAccount()
  if (!address) return <Navigate to="/" replace />
  if (address.toLowerCase() !== OWNER) return <Navigate to="/" replace />
  return <Layout><Admin /></Layout>
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/deal/new" element={<Layout><NewDeal /></Layout>} />
          <Route path="/deal/claim/:token" element={<Layout><ClaimDeal /></Layout>} />
          <Route path="/marketplace" element={<Layout><Marketplace /></Layout>} />
          <Route path="/deal/:id/manage" element={<Layout><ManageDeal /></Layout>} />
          <Route path="/deal/manage/:id" element={<Layout><ManageDeal /></Layout>} />
          <Route path="/admin" element={<AdminRoute />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
