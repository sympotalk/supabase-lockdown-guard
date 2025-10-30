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
import InviteValidation from "./pages/auth/InviteValidation";
import Dashboard from "./pages/admin/Dashboard";
import MasterDashboard from "./pages/master/Dashboard";
import MasterAgencies from "./pages/master/Agencies";
import MasterAccountManager from "./pages/master/MasterAccountManager";
import MasterOrphanLinker from "./pages/master/OrphanLinker";
import MasterLogs from "./pages/master/Logs";
import MasterAlertHistory from "./pages/master/AlertHistory";
import MasterQAReports from "./pages/master/QAReports";
import Events from "./pages/admin/Events";
import EventOverview from "./pages/admin/EventOverview";
import EventDetailLayout from "./layouts/EventDetailLayout";
import ParticipantsTab from "./pages/admin/event-detail/ParticipantsTab";
import RoomingTab from "./pages/admin/event-detail/RoomingTab";
import MessagesTab from "./pages/admin/event-detail/MessagesTab";
import FormsTab from "./pages/admin/event-detail/FormsTab";
import Participants from "./pages/admin/Participants";
import Rooming from "./pages/admin/Rooming";
import Messages from "./pages/admin/Messages";
import Forms from "./pages/admin/Forms";
import Account from "./pages/admin/Account";
import AdminSettings from "./pages/admin/Settings";
import AgencyAccount from "./pages/agency/Account";
import AgencyProfile from "./pages/agency/Profile";
import AgencySettings from "./pages/agency/Settings";
import AgencyNotifications from "./pages/agency/Notifications";
import AgencySecurity from "./pages/agency/Security";
import AgencyView from "./pages/agency/AgencyView";
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
            <Route path="/invite" element={<InviteValidation />} />
            <Route path="/signup/:inviteId" element={<Signup />} />

            {/* Master-only routes */}
            <Route path="/master" element={
              <ProtectedRoute requiredRole="master">
                <MasterLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<MasterDashboard />} />
              <Route path="agencies" element={<MasterAgencies />} />
              <Route path="account" element={<MasterAccountManager />} />
              <Route path="orphan-linker" element={<MasterOrphanLinker />} />
              <Route path="logs" element={<MasterLogs />} />
              <Route path="alert-history" element={<MasterAlertHistory />} />
              <Route path="qa-reports" element={<MasterQAReports />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Legacy redirect */}
            <Route path="/master-dashboard" element={<Navigate to="/master/dashboard" replace />} />

            {/* Admin routes - accessible by master in view mode OR agency users */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["master", "agency_owner", "staff"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="events/:eventId/overview" element={<EventOverview />} />
              
              {/* [LOCKED][71-H5.UNIFIED-DETAIL.LAYOUT] Event detail with state-based tabs */}
              <Route path="events/:eventId" element={<EventDetailLayout />} />
              
              {/* [LOCKED][71-G.FIX.ROUTING.R1 + 71-H.STABLE] Redirect old routes to unified event list */}
              <Route path="participants" element={<Navigate to="/admin/events" replace />} />
              <Route path="rooming" element={<Navigate to="/admin/events" replace />} />
              <Route path="messages" element={<Navigate to="/admin/events" replace />} />
              <Route path="forms" element={<Navigate to="/admin/events" replace />} />
              
              <Route path="account" element={<Account />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* [LOCKED] Agency view route - accessible by master for viewing agency details */}
            <Route
              path="/agency/:id"
              element={
                <ProtectedRoute allowedRoles={["master"]}>
                  <AgencyView />
                </ProtectedRoute>
              }
            />

            {/* Agency user-specific routes */}
            <Route
              path="/agency/*"
              element={
                <ProtectedRoute allowedRoles={["staff", "agency_owner"]}>
                  <Routes>
                    <Route path="account" element={<AgencyAccount />} />
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
