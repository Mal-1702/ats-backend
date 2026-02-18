import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import JobCreate from './pages/JobCreate';
import ResumeUpload from './pages/ResumeUpload';
import ResumeList from './pages/ResumeList';
import ResumeRating from './pages/ResumeRating';
import RankedCandidates from './pages/RankedCandidates';

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

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

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

                    <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

