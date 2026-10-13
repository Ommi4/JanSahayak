import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Schemes from './pages/Schemes';
import SchemeDetails from './pages/SchemeDetails';
import Chat from './pages/Chat';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSchemes from './pages/admin/AdminSchemes';
import AdminSchemeForm from './pages/admin/AdminSchemeForm';
import AdminUsers from './pages/admin/AdminUsers';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Citizen Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schemes"
                element={
                  <ProtectedRoute>
                    <Schemes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schemes/:id"
                element={
                  <ProtectedRoute>
                    <SchemeDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />

              {/* Protected Administrator Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/schemes"
                element={
                  <AdminRoute>
                    <AdminSchemes />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/schemes/new"
                element={
                  <AdminRoute>
                    <AdminSchemeForm />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/schemes/:id/edit"
                element={
                  <AdminRoute>
                    <AdminSchemeForm />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                }
              />

              {/* Default Redirects */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
