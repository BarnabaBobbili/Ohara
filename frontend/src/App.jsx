import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BookDetail from './pages/BookDetail';
import SearchResults from './pages/SearchResults';
import MemberDashboard from './pages/MemberDashboard';
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BookCatalog from './pages/BookCatalog';
import BookReader from './components/BookReader';

// External Books
import UnifiedSearch from './pages/UnifiedSearch';
import ExternalBookDetail from './pages/ExternalBookDetail';

// Admin Imports
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import BookManagement from './pages/admin/BookManagement';
import MemberManagement from './pages/admin/MemberManagement';
import CirculationDesk from './pages/admin/CirculationDesk';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/book/:id" element={<BookDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/dashboard" element={<MemberDashboard />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Book Catalog */}
        <Route path="/catalog" element={<BookCatalog />} />


        {/* External Book Source Routes */}
        <Route path="/unified-search" element={<UnifiedSearch />} />
        <Route path="/external-book/:source/:sourceId" element={<ExternalBookDetail />} />
        <Route path="/book-reader" element={<BookReader />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="books" element={<BookManagement />} />
          <Route path="members" element={<MemberManagement />} />
          <Route path="circulation" element={<CirculationDesk />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
