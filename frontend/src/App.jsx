import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BookDetail from './pages/BookDetail';
import MemberDashboard from './pages/MemberDashboard';
import About from './pages/About';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Signup from './pages/Signup';
import BookCatalog from './pages/BookCatalog';
import BookReader from './components/BookReader';
import CollectionsPage from './pages/CollectionsPage';

// Admin Imports
import AdminRoute from './components/AdminRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import BookManagement from './pages/admin/BookManagement';
import MemberManagement from './pages/admin/MemberManagement';
import CirculationDesk from './pages/admin/CirculationDesk';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import AuditTrail from './pages/admin/AuditTrail';
import CMSManager from './pages/admin/CMSManager';
import EbookManager from './pages/admin/EbookManager';
import ContentManager from './pages/admin/ContentManager';
import ReviewModeration from './pages/admin/ReviewModeration';
import LoanOverview from './pages/admin/LoanOverview';
import WishlistPage from './pages/WishlistPage';
import EbookLibrary from './pages/EbookLibrary';

import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/book/:id" element={<BookDetail />} />
        <Route path="/search" element={<BookCatalog />} />
        <Route path="/dashboard" element={<MemberDashboard />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/signup" element={<Signup />} />

        {/* Book Catalog */}
        <Route path="/catalog" element={<BookCatalog />} />
        <Route path="/catalogue" element={<BookCatalog />} />
        <Route path="/book-reader" element={<BookReader />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/ebooks" element={<EbookLibrary />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="books" element={<BookManagement />} />
          <Route path="members" element={<MemberManagement />} />
          <Route path="circulation" element={<CirculationDesk />} />
          <Route path="audit-trail" element={<AuditTrail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="cms" element={<CMSManager />} />
          <Route path="ebooks" element={<EbookManager />} />
          <Route path="reviews" element={<ReviewModeration />} />
          <Route path="content" element={<ContentManager />} />
          <Route path="loan-overview" element={<LoanOverview />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
