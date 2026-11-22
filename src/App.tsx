import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewDeal from './pages/NewDeal'
import ClaimDeal from './pages/ClaimDeal'
import Marketplace from './pages/Marketplace'
import ManageDeal from './pages/ManageDeal'

// Loaded on demand. Access control is enforced by the contracts (onlyOwner), not by hiding the page.
const Admin = lazy(() => import('./pages/Admin'))

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
          <Route path="/admin" element={<Layout><Suspense fallback={null}><Admin /></Suspense></Layout>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
