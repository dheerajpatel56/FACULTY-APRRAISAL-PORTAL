import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/faculty/DashboardPage';
import AppraisalEditPage from './pages/faculty/AppraisalEditPage';
import AppraisalViewPage from './pages/faculty/AppraisalViewPage';
import ReviewQueuePage from './pages/reviewer/ReviewQueuePage';
import ReviewAppraisalPage from './pages/reviewer/ReviewAppraisalPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAcademicYearsPage from './pages/admin/AdminAcademicYearsPage';
import AdminAppraisalsPage from './pages/admin/AdminAppraisalsPage';
import AdminDepartmentsPage from './pages/admin/AdminDepartmentsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import DeptReportsPage from './pages/reviewer/DeptReportsPage';
import AdminEmailsPage from './pages/admin/AdminEmailsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import FPGPPage from './pages/fpgp/FPGPPage';
import FPGPFormPage from './pages/fpgp/FPGPFormPage';
import FPGPViewPage from './pages/fpgp/FPGPViewPage';
import FPGPDepartmentPage from './pages/fpgp/FPGPDepartmentPage';
import ProfilePage from './pages/faculty/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e3a5f', color: '#fff', borderRadius: '4px', fontSize: '14px' } }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Faculty */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/appraisal" element={<Navigate to="/dashboard" replace />} />
        <Route path="/appraisal/:id/edit" element={<ProtectedRoute><AppraisalEditPage /></ProtectedRoute>} />
        <Route path="/appraisal/:id" element={<ProtectedRoute><AppraisalViewPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* FPGP */}
        <Route path="/fpgp" element={<ProtectedRoute><FPGPPage /></ProtectedRoute>} />
        <Route path="/fpgp/department" element={
          <ProtectedRoute roles={['HOD', 'REVIEWER', 'ADMIN']}>
            <FPGPDepartmentPage />
          </ProtectedRoute>
        } />
        <Route path="/fpgp/:id/edit" element={<ProtectedRoute><FPGPFormPage /></ProtectedRoute>} />
        <Route path="/fpgp/:id" element={<ProtectedRoute><FPGPViewPage /></ProtectedRoute>} />

        {/* Reviewer / HoD */}
        <Route path="/reviews" element={
          <ProtectedRoute roles={['HOD', 'REVIEWER', 'ADMIN']}>
            <ReviewQueuePage />
          </ProtectedRoute>
        } />
        <Route path="/reviews/:id" element={
          <ProtectedRoute roles={['HOD', 'REVIEWER', 'ADMIN']}>
            <ReviewAppraisalPage />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute roles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>
        } />
        <Route path="/admin/academic-years" element={
          <ProtectedRoute roles={['ADMIN']}><AdminAcademicYearsPage /></ProtectedRoute>
        } />
        <Route path="/admin/appraisals" element={
          <ProtectedRoute roles={['ADMIN']}><AdminAppraisalsPage /></ProtectedRoute>
        } />
        <Route path="/admin/departments" element={
          <ProtectedRoute roles={['ADMIN']}><AdminDepartmentsPage /></ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute roles={['ADMIN']}><AdminReportsPage /></ProtectedRoute>
        } />
        <Route path="/reports/department" element={
          <ProtectedRoute roles={['HOD', 'REVIEWER', 'ADMIN']}><DeptReportsPage /></ProtectedRoute>
        } />
        <Route path="/admin/emails" element={
          <ProtectedRoute roles={['ADMIN']}><AdminEmailsPage /></ProtectedRoute>
        } />
        <Route path="/admin/audit" element={
          <ProtectedRoute roles={['ADMIN']}><AdminAuditPage /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
