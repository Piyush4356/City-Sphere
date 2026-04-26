import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ExploreProvider } from './context/ExploreContext';

// Layout
import MainLayout from './layouts/MainLayout';

// Pages
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ExplorePage from './pages/ExplorePage';
import FeedbackPage from './pages/FeedbackPage';
import EmergencyPage from './pages/EmergencyPage';
import ProfilePage from './pages/ProfilePage';
import AdminReviewPage from './pages/admin/AdminReviewPage';

// Auth Features
import LoginForm from './features/auth/LoginForm';
import RegisterForm from './features/auth/RegisterForm';
import VerifyOTP from './features/auth/VerifyOTP';
import ForgotPassword from './features/auth/ForgotPassword';
import ResetPassword from './features/auth/ResetPassword';

// Shared Components
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <ExploreProvider>
                <Router>
                    <Routes>
                        {/* Layout wrapper — all routes share header/footer/chatbot */}
                        <Route element={<MainLayout />}>
                            {/* Public Routes */}
                            <Route path="/login" element={<LoginForm />} />
                            <Route path="/register" element={<RegisterForm />} />
                            <Route path="/verify-otp" element={<VerifyOTP />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password/:token" element={<ResetPassword />} />

                            {/* Protected Routes */}
                            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                            <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
                            <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
                            <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
                            <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
                            <Route path="/admin/review" element={<ProtectedRoute><AdminReviewPage /></ProtectedRoute>} />
                            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                        </Route>
                    </Routes>
                </Router>
            </ExploreProvider>
        </AuthProvider>
    );
}

export default App;
