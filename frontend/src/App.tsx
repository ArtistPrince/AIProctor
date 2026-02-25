import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { RequireAuth, roleDefaultRoute } from '@/components/auth/RequireAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import InstitutesPage from '@/pages/admin/InstitutesPage';
import BatchesPage from '@/pages/admin/BatchesPage';
import ExamAdminDashboard from '@/pages/exam-admin/ExamAdminDashboard';
import ExamSetupPage from './pages/exam-admin/ExamSetupPage';
import QuestionBankPage from './pages/exam-admin/QuestionBankPage';
import AssignExamPage from '@/pages/exam-admin/AssignExamPage';
import ExamAttemptsPage from '@/pages/exam-admin/ExamAttemptsPage';
import ExamResultsPage from '@/pages/exam-admin/ExamResultsPage';
import ProctorDashboard from '@/pages/proctor/ProctorDashboard';
import ProctoringMonitoringPage from '@/pages/proctor/ProctoringMonitoringPage';
import ProctoringResultsPage from '@/pages/proctor/ProctoringResultsPage';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentExamsPage from '@/pages/student/StudentExamsPage';
import StudentResultsPage from '@/pages/student/StudentResultsPage';
import StudentExamFlow from '@/pages/student/StudentExamFlow';
import PlaceholderPage from '@/pages/PlaceholderPage';

const queryClient = new QueryClient();

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    return <Navigate to={roleDefaultRoute[user.role]} replace />;
  }
  return <Navigate to="/login" replace />;
}

const App = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isF12 = event.key === 'F12';
      const isDevtoolsCombo = event.ctrlKey && event.shiftKey && (key === 'i' || key === 'j' || key === 'c');
      const isViewSource = event.ctrlKey && key === 'u';

      if (isF12 || isDevtoolsCombo || isViewSource) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleCopy = (event: ClipboardEvent) => {
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route element={<RequireAuth allowedRoles={['super_admin', 'institute_admin']}><DashboardLayout /></RequireAuth>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/institutes" element={<InstitutesPage />} />
              <Route path="/admin/users" element={<PlaceholderPage />} />
              <Route path="/admin/subscriptions" element={<PlaceholderPage />} />
              <Route path="/admin/batches" element={<BatchesPage />} />
              <Route path="/admin/students" element={<PlaceholderPage />} />
              <Route path="/admin/settings" element={<PlaceholderPage />} />
            </Route>

            <Route element={<RequireAuth allowedRoles={['exam_admin']}><DashboardLayout /></RequireAuth>}>
              <Route path="/exam-admin" element={<ExamAdminDashboard />} />
              <Route path="/exam-admin/create" element={<ExamSetupPage />} />
              <Route path="/exam-admin/questions" element={<QuestionBankPage />} />
              <Route path="/exam-admin/assign" element={<AssignExamPage />} />
              <Route path="/exam-admin/results" element={<ExamAttemptsPage />} />
              <Route path="/exam-admin/results/:examId" element={<ExamResultsPage />} />
            </Route>

            <Route element={<RequireAuth allowedRoles={['proctor']}><DashboardLayout /></RequireAuth>}>
              <Route path="/proctor" element={<ProctorDashboard />} />
              <Route path="/proctor/monitoring" element={<ProctoringMonitoringPage />} />
              <Route path="/proctor/monitoring/:examId" element={<ProctoringResultsPage />} />
              <Route path="/proctor/live" element={<PlaceholderPage />} />
              <Route path="/proctor/incidents" element={<PlaceholderPage />} />
            </Route>

            <Route path="/student" element={<RequireAuth allowedRoles={['student']}><StudentDashboard /></RequireAuth>} />
            <Route path="/student/exams" element={<RequireAuth allowedRoles={['student']}><StudentExamsPage /></RequireAuth>} />
            <Route path="/student/results" element={<RequireAuth allowedRoles={['student']}><StudentResultsPage /></RequireAuth>} />

            <Route path="/exam/:id/live" element={<RequireAuth allowedRoles={['student']}><StudentExamFlow /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
