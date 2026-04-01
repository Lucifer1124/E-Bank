import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import AdminDashboard from './AdminDashBoard';

import ProtectedRoute from './ProtectecRoute';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserPage from './pages/UserPage';

function App() {
  return (
    <BrowserRouter>
     <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="" element={<Signup />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/admin" element={
    <ProtectedRoute role="ADMIN">
      <AdminDashboard />
    </ProtectedRoute>
  } />
  <Route path="/user" element={
    <ProtectedRoute role="USER">
      <UserPage />
    </ProtectedRoute>
  } />
</Routes>
    </BrowserRouter>
  );
}

export default App;