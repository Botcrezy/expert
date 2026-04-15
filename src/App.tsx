import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VerificationGuard } from "@/components/VerificationGuard";
import { HelmetProvider } from "react-helmet-async";
import { FloatingNavBar } from "@/components/layout/DynamicNavbar";

// Code-splitting for better PageSpeed scores (reduce initial JS)
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Services = lazy(() => import("./pages/Services"));
const Pricing = lazy(() => import("./pages/Pricing"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const FAQ = lazy(() => import("./pages/FAQ"));
const FreelancersPage = lazy(() => import("./pages/FreelancersPage"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceRequestDetails = lazy(() => import("./pages/MarketplaceRequestDetails"));
const PublicRequestView = lazy(() => import("./pages/PublicRequestView"));
const PaymentCollection = lazy(() => import("./pages/PaymentCollection"));
const PublicPortfolio = lazy(() => import("./pages/PublicPortfolio"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));

const DynamicPage = lazy(() => import("./pages/DynamicPage"));
const CMSPage = lazy(() => import("./pages/CMSPage"));
const DynamicCMSPage = lazy(() => import("./pages/CMSPage").then((m) => ({ default: m.DynamicCMSPage })));

// Auth pages
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const FreelancerRegister = lazy(() => import("./pages/auth/FreelancerRegister"));

// Client pages
const ClientDashboard = lazy(() => import("./pages/client/ClientDashboard"));
const ClientLogin = lazy(() => import("./pages/client/ClientLogin"));
const CreateRequest = lazy(() => import("./pages/client/CreateRequest"));
const ClientRequests = lazy(() => import("./pages/client/ClientRequests"));
const ClientWallet = lazy(() => import("./pages/client/ClientWallet"));
const ClientCheckout = lazy(() => import("./pages/client/ClientCheckout"));
const ClientSettings = lazy(() => import("./pages/client/ClientSettings"));
const ClientPlan = lazy(() => import("./pages/client/ClientPlan"));
const ClientBilling = lazy(() => import("./pages/client/ClientBilling"));
const ClientSupport = lazy(() => import("./pages/client/ClientSupport"));
const ClientSupportChat = lazy(() => import("./pages/client/ClientSupportChat"));
const RequestDetails = lazy(() => import("./pages/client/RequestDetails"));
const ClientFiles = lazy(() => import("./pages/client/ClientFiles"));
const ClientCreditDashboard = lazy(() => import("./pages/client/ClientCreditDashboard"));
const ClientStudio = lazy(() => import("./pages/client/ClientStudio"));
const ClientPurchasedServices = lazy(() => import("./pages/client/ClientPurchasedServices"));
const ClientIdentityVerification = lazy(() => import("./pages/client/IdentityVerification"));
const ClientCourseViewer = lazy(() => import("./pages/client/ClientCourseViewer"));
const ClientReferrals = lazy(() => import("./pages/client/ClientReferrals"));
const ClientBrand = lazy(() => import("./pages/client/ClientBrand"));
const ClientBrandDetails = lazy(() => import("./pages/client/ClientBrandDetails"));
const ClientFavorites = lazy(() => import("./pages/client/ClientFavorites"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const SetupAdmin = lazy(() => import("./pages/admin/SetupAdmin"));
const AdminTechnicalSupport = lazy(() => import("./pages/admin/AdminTechnicalSupport"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminRequestsQueue = lazy(() => import("./pages/admin/AdminRequestsQueue"));
const AdminRequestDetails = lazy(() => import("./pages/admin/AdminRequestDetails"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminFreelancers = lazy(() => import("./pages/admin/AdminFreelancers"));
const AdminPendingFreelancers = lazy(() => import("./pages/admin/AdminPendingFreelancers"));
const AdminAssignments = lazy(() => import("./pages/admin/AdminAssignments"));
const AdminCredits = lazy(() => import("./pages/admin/AdminCredits"));
const AdminWallets = lazy(() => import("./pages/admin/AdminWallets"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminQC = lazy(() => import("./pages/admin/AdminQC"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminAddons = lazy(() => import("./pages/admin/AdminAddons"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminIdentityVerifications = lazy(() => import("./pages/admin/AdminIdentityVerifications"));
const AdminUserDetails = lazy(() => import("./pages/admin/AdminUserDetails"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminFiles = lazy(() => import("./pages/admin/AdminFiles"));
const PageBuilder = lazy(() => import("./pages/admin/PageBuilder"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminNavigation = lazy(() => import("./pages/admin/AdminNavigation"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
const AdminPageTemplates = lazy(() => import("./pages/admin/AdminPageTemplates"));
const AdminSystemLogs = lazy(() => import("./pages/admin/AdminSystemLogs"));
const AdminSecurityLogs = lazy(() => import("./pages/admin/AdminSecurityLogs"));
const AdminReferralSettings = lazy(() => import("./pages/admin/AdminReferralSettings"));
const AdminHeaderFooter = lazy(() => import("./pages/admin/AdminHeaderFooter"));
const AdminPaymentGateways = lazy(() => import("./pages/admin/AdminPaymentGateways"));
const AdminPaymentCollections = lazy(() => import("./pages/admin/AdminPaymentCollections"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminBrandDetails = lazy(() => import("./pages/admin/AdminBrandDetails"));
const AdminTrainingTasks = lazy(() => import("./pages/admin/AdminTrainingTasks"));
const AdminTrainingTaskDetails = lazy(() => import("./pages/admin/AdminTrainingTaskDetails"));
const AdminFreelancerProfile = lazy(() => import("./pages/admin/AdminFreelancerProfile"));
const AdminSiteSettings = lazy(() => import("./pages/admin/AdminSiteSettings"));
const AdminLearningTracks = lazy(() => import("./pages/admin/AdminLearningTracks"));
const AdminTrackDetails = lazy(() => import("./pages/admin/AdminTrackDetails"));
const AdminTrainingQC = lazy(() => import("./pages/admin/AdminTrainingQC"));
const AdminTelegramSettings = lazy(() => import("./pages/admin/AdminTelegramSettings"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminSupabaseSync = lazy(() => import("./pages/admin/AdminSupabaseSync"));
const AdminDocumentation = lazy(() => import("./pages/admin/AdminDocumentation"));
const AdminTaskSizes = lazy(() => import("./pages/admin/AdminTaskSizes"));
const AdminActionCenter = lazy(() => import("./pages/admin/AdminActionCenter"));
const AdminNotificationRules = lazy(() => import("./pages/admin/AdminNotificationRules"));
const AdminFixedAgreements = lazy(() => import("./pages/admin/AdminFixedAgreements"));
const AdminPortfolios = lazy(() => import("./pages/admin/AdminPortfolios"));
const AdminProposals = lazy(() => import("./pages/admin/AdminProposals"));
const AdminAIRequests = lazy(() => import("./pages/admin/AdminAIRequests"));
const AdminRequestTemplates = lazy(() => import("./pages/admin/AdminRequestTemplates"));

// Freelancer pages
const FreelancerLogin = lazy(() => import("./pages/freelancer/FreelancerLogin"));
const FreelancerDashboard = lazy(() => import("./pages/freelancer/FreelancerDashboard"));
const FreelancerTasks = lazy(() => import("./pages/freelancer/FreelancerTasks"));
const FreelancerTaskDetails = lazy(() => import("./pages/freelancer/FreelancerTaskDetails"));
const FreelancerWallet = lazy(() => import("./pages/freelancer/FreelancerWallet"));
const FreelancerProfile = lazy(() => import("./pages/freelancer/FreelancerProfile"));
const FreelancerSettings = lazy(() => import("./pages/freelancer/FreelancerSettings"));
const FreelancerPending = lazy(() => import("./pages/freelancer/FreelancerPending"));
const FreelancerMessages = lazy(() => import("./pages/freelancer/FreelancerMessages"));
const FreelancerSupport = lazy(() => import("./pages/freelancer/FreelancerSupport"));
const FreelancerSupportChat = lazy(() => import("./pages/freelancer/FreelancerSupportChat"));
const FreelancerFiles = lazy(() => import("./pages/freelancer/FreelancerFiles"));
const FreelancerDeliveries = lazy(() => import("./pages/freelancer/FreelancerDeliveries"));
const FreelancerNotifications = lazy(() => import("./pages/freelancer/FreelancerNotifications"));
const FreelancerAccountPending = lazy(() => import("./pages/freelancer/FreelancerAccountPending"));
const FreelancerReferrals = lazy(() => import("./pages/freelancer/FreelancerReferrals"));
const FreelancerCheckout = lazy(() => import("./pages/freelancer/FreelancerCheckout"));
const FreelancerAdfaly = lazy(() => import("./pages/freelancer/FreelancerAdfaly"));
const FreelancerPortfolio = lazy(() => import("./pages/freelancer/FreelancerPortfolio"));
const FreelancerServiceOrders = lazy(() => import("./pages/freelancer/FreelancerServiceOrders"));
const FreelancerTraining = lazy(() => import("./pages/freelancer/FreelancerTraining"));
const FreelancerStudio = lazy(() => import("./pages/freelancer/FreelancerStudio"));
const FreelancerIdentityVerification = lazy(() => import("./pages/freelancer/FreelancerIdentityVerification"));
const FreelancerTrackDetails = lazy(() => import("./pages/freelancer/FreelancerTrackDetails"));
const FreelancerCourseViewer = lazy(() => import("./pages/freelancer/FreelancerCourseViewer"));
const FreelancerProposals = lazy(() => import("./pages/freelancer/FreelancerProposals"));
const FreelancerProposalDetails = lazy(() => import("./pages/freelancer/FreelancerProposalDetails"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FloatingNavBar />
            <Suspense
              fallback={
                <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
                  Loading…
                </div>
              }
            >
              <Routes>
              {/* Public CMS routes */}
              <Route path="/" element={<Marketplace />} />
              <Route path="/services" element={<CMSPage slug="services" fallbackComponent={Services} />} />
              <Route path="/pricing" element={<CMSPage slug="pricing" fallbackComponent={Pricing} />} />
              <Route path="/how-it-works" element={<CMSPage slug="how-it-works" fallbackComponent={HowItWorks} />} />
              <Route path="/faq" element={<CMSPage slug="faq" fallbackComponent={FAQ} />} />
              <Route path="/freelancers" element={<FreelancersPage />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/:id" element={<MarketplaceRequestDetails />} />
              <Route path="/share/request/:token" element={<PublicRequestView />} />
              <Route path="/pay/:token" element={<PaymentCollection />} />
              <Route path="/u/:slug" element={<PublicPortfolio />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />

              {/* Explicit 404 route (prevents redirect loop from DynamicCMSPage) */}
              <Route path="/404" element={<NotFound />} />

              <Route path="/:slug" element={<DynamicCMSPage />} />
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/freelancer-register" element={<FreelancerRegister />} />

              {/* Dedicated Login / Setup Pages */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/setup" element={<SetupAdmin />} />
              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/freelancer/login" element={<FreelancerLogin />} />

              {/* Client Routes - Protected */}
              <Route
                path="/client/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientDashboard />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/create-request"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <CreateRequest />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/requests"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientRequests />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/wallet"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientWallet />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/checkout"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientCheckout />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/purchased-services"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientPurchasedServices />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/settings"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientSettings />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/plan"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientPlan />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/billing"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientBilling />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/support"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientSupport />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/support/:conversationId"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientSupportChat />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/requests/:id"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <RequestDetails />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/files"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientFiles />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/credits"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientCreditDashboard />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/referrals"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientReferrals />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/brand"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientBrand />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/brand/:brandId"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientBrandDetails />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/identity-verification"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientIdentityVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/studio"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientStudio />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/course/:trackId"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientCourseViewer />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/course/:trackId/lesson/:lessonId"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientCourseViewer />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/client/favorites"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <VerificationGuard userType="client">
                      <ClientFavorites />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes - Protected */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/requests/queue"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminRequestsQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/requests/:id"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminRequestDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/fixed-agreements"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminFixedAgreements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/assignments"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminAssignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/qc"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminQC />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/verifications"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminVerifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/identity"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminIdentityVerifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminUserDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/freelancers"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminFreelancers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/freelancers/pending"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPendingFreelancers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/plans"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPlans />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/task-sizes"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminTaskSizes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/addons"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminAddons />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/coupons"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminCoupons />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/refunds"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminRefunds />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/disputes"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDisputes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/support"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSupport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/technical-support"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminTechnicalSupport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cms"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminCMS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cms/page/:pageId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <PageBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/files"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminFiles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminAuditLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/navigation"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminNavigation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/referrals"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminReferrals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/referral-settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminReferralSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/page-templates"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPageTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/wallets"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminWallets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/credits"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminCredits />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/finance/withdrawals"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminWithdrawals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/notifications"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminNotifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/action-center"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminActionCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/notification-rules"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminNotificationRules />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/system-logs"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSystemLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/security-logs"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSecurityLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/header-footer"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminHeaderFooter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payment-gateways"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPaymentGateways />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/portfolios"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPortfolios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/proposals"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminProposals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ai-requests"
                element={
                  <ProtectedRoute allowedRoles={["admin", "team_leader"]}>
                    <AdminAIRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/request-templates"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminRequestTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payment-collections"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPaymentCollections />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/brands"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminBrands />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/brands/:brandId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminBrandDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/training"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminTrainingTasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/training/:id"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminTrainingTaskDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/freelancer/:userId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminFreelancerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/site-settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSiteSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studio"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminLearningTracks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studio/tracks/:trackId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminTrackDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/studio/qc"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminTrainingQC />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/telegram"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminTelegramSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/newsletter"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminNewsletter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/supabase-sync"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSupabaseSync />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/documentation"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDocumentation />
                  </ProtectedRoute>
                }
              />

              {/* Freelancer Routes - Protected */}
              <Route
                path="/freelancer/account-pending"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerAccountPending />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerDashboard />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/service-orders"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerServiceOrders />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/tasks"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerTasks />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/tasks/:id"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerTaskDetails />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/wallet"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerWallet />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/profile"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerProfile />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/settings"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerSettings />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/pending"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerPending />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/proposals"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerProposals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/proposals/:id"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerProposalDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerMessages />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/files"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerFiles />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/deliveries"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerDeliveries />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/notifications"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerNotifications />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/support"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerSupport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/support/:conversationId"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerSupportChat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/referrals"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerReferrals />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/adfaly"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerAdfaly />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/portfolio"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerPortfolio />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/training"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerTraining />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/studio"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerStudio />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/identity-verification"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <FreelancerIdentityVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/studio/track/:trackId"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerTrackDetails />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/course/:trackId"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerCourseViewer />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/course/:trackId/lesson/:lessonId"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerCourseViewer />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/freelancer/checkout"
                element={
                  <ProtectedRoute allowedRoles={["freelancer"]}>
                    <VerificationGuard userType="freelancer">
                      <FreelancerCheckout />
                    </VerificationGuard>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
