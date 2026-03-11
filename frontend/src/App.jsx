import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import JobCreate from './pages/JobCreate';
import ResumeUpload from './pages/ResumeUpload';
import ResumeList from './pages/ResumeList';
import ResumeRating from './pages/ResumeRating';
import RankedCandidates from './pages/RankedCandidates';
import CandidatePortal from './pages/CandidatePortal';
import { AnimatePresence, motion } from 'framer-motion';
import AnimatedBackground from './components/AnimatedBackground';
import Settings from './pages/Settings';

// Page Transition Wrapper
const PageTransition = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.99 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
        {children}
    </motion.div>
);

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
            <AnimatedBackground />
            <BrowserRouter>
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
                        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
                        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />

                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><Dashboard /></PageTransition>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/jobs/create"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><JobCreate /></PageTransition>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/upload"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><ResumeUpload /></PageTransition>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/resumes"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><ResumeList /></PageTransition>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/rate-resume"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><ResumeRating /></PageTransition>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/jobs/:jobId/candidates"
                            element={
                                <ProtectedRoute>
                                    <PageTransition><RankedCandidates /></PageTransition>
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/apply" element={<PageTransition><CandidatePortal /></PageTransition>} />

                        <Route
                            path="/settings"
                            element={
                                <CeoRoute>
                                    <PageTransition><Settings /></PageTransition>
                                </CeoRoute>
                            }
                        />

                        <Route path="/" element={<Navigate to="/dashboard" />} />
                    </Routes>
                </AnimatePresence>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

