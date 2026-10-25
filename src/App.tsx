import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewDeal from './pages/NewDeal'
import ClaimDeal from './pages/ClaimDeal'
import Marketplace from './pages/Marketplace'
import ManageDeal from './pages/ManageDeal'
import Admin from './pages/Admin'

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
        <Route path="/admin" element={<Layout><Admin /></Layout>} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
  )
}
