import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import WelcomeScreen from './pages/WelcomeScreen';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import JobCreate from './pages/JobCreate';
import ResumeUpload from './pages/ResumeUpload';
import ResumeList from './pages/ResumeList';
import ResumeRating from './pages/ResumeRating';
import RankedCandidates from './pages/RankedCandidates';
import CandidatePortal from './pages/CandidatePortal';
import Settings from './pages/Settings';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};

// CEO-only route — non-CEO authenticated users get redirected to dashboard
const CeoRoute = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuth();
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner" /></div>;
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user?.role !== 'ceo') return <Navigate to="/dashboard" />;
    return children;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<WelcomeScreen />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/jobs/create"
                        element={
                            <ProtectedRoute>
                                <JobCreate />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/upload"
                        element={
                            <ProtectedRoute>
                                <ResumeUpload />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/resumes"
                        element={
                            <ProtectedRoute>
                                <ResumeList />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/rate-resume"
                        element={
                            <ProtectedRoute>
                                <ResumeRating />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/jobs/:jobId/candidates"
                        element={
                            <ProtectedRoute>
                                <RankedCandidates />
                            </ProtectedRoute>
                        }
                    />

                    {/* Public Route — No auth required */}
                    <Route path="/apply" element={<CandidatePortal />} />

                    {/* CEO-only Settings */}
                    <Route
                        path="/settings"
                        element={
                            <CeoRoute>
                                <Settings />
                            </CeoRoute>
                        }
                    />

                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

