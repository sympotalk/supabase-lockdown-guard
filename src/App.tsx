import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { ProtectedRoute } from "@/components/routing/ProtectedRoute";
import { MasterLayout } from "@/components/layout/MasterLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/admin/Dashboard";
import MasterDashboard from "./pages/master/Dashboard";
import MasterAgencies from "./pages/master/Agencies";
import MasterLogs from "./pages/master/Logs";
import MasterAlertHistory from "./pages/master/AlertHistory";
import Events from "./pages/admin/Events";
import EventOverview from "./pages/admin/EventOverview";
import Participants from "./pages/admin/Participants";
import Rooming from "./pages/admin/Rooming";
import Messages from "./pages/admin/Messages";
import Forms from "./pages/admin/Forms";
import Account from "./pages/admin/Account";
import AdminSettings from "./pages/admin/Settings";
import AgencyProfile from "./pages/agency/Profile";
import AgencySettings from "./pages/agency/Settings";
import AgencyNotifications from "./pages/agency/Notifications";
import AgencySecurity from "./pages/agency/Security";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserProvider>
          <AppDataProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/signup/:inviteId" element={<Signup />} />

            {/* Master-only routes */}
            <Route path="/master" element={
              <ProtectedRoute requiredRole="master">
                <MasterLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<MasterDashboard />} />
              <Route path="agencies" element={<MasterAgencies />} />
              <Route path="logs" element={<MasterLogs />} />
              <Route path="alert-history" element={<MasterAlertHistory />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Legacy redirect */}
            <Route path="/master-dashboard" element={<Navigate to="/master/dashboard" replace />} />

            {/* Admin routes - accessible by master in view mode OR agency users */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["master", "agency_owner", "admin", "staff"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="events/:eventId/overview" element={<EventOverview />} />
              <Route path="participants" element={<Participants />} />
              <Route path="rooming" element={<Rooming />} />
              <Route path="messages" element={<Messages />} />
              <Route path="forms" element={<Forms />} />
              <Route path="account" element={<Account />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Agency user-specific routes */}
            <Route
              path="/agency/*"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin", "agency_owner"]}>
                  <Routes>
                    <Route path="profile" element={<AgencyProfile />} />
                    <Route path="settings" element={<AgencySettings />} />
                    <Route path="notifications" element={<AgencyNotifications />} />
                    <Route path="security" element={<AgencySecurity />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AppDataProvider>
        </UserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
