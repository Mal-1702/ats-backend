import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
    getCurrentUser: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (payload) => api.post('/auth/reset-password', payload),
};

export const jobsAPI = {
    create: (data) => api.post('/jobs', data),
    getAll: () => api.get('/jobs'),
    getById: (id) => api.get(`/jobs/${id}`),
    toggleStatus: (jobId, isActive) => api.patch(`/jobs/${jobId}/status`, null, { params: { is_active: isActive } }),
    delete: (jobId) => api.delete(`/jobs/${jobId}`),
    updateSkills: (jobId, skills) => api.patch(`/jobs/${jobId}/skills`, { skills }),
    uploadResumes: (jobId, files) => {
        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('files', file));
        return api.post(`/jobs/${jobId}/upload-resumes`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
};

export const uploadAPI = {
    uploadResume: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    getTaskStatus: (taskId) => api.get(`/task-status/${taskId}`),
};

export const resumesAPI = {
    getAll: (params = {}) => api.get('/resumes', { params }),
    getUniqueSkills: () => api.get('/resumes/skills'),
    getJobsForFilter: () => api.get('/resumes/jobs-filter'),
    delete: (resumeId) => api.delete(`/resumes/${resumeId}`),
    bulkDelete: (resumeIds) => api.delete('/resumes/bulk-delete', { data: { resume_ids: resumeIds } }),
    downloadResume: (resumeId) => api.get(`/resumes/${resumeId}/download`, { responseType: 'blob' }),
    viewResume: (resumeId) => api.get(`/resumes/${resumeId}/view`, { responseType: 'blob' }),
};

export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    createUser: (data) => api.post('/admin/users', data),
    deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
    updateRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
    resetPassword: (userId, password) => api.patch(`/admin/users/${userId}/password`, { password }),
};

export const dashboardAPI = {
    getNewResumesCount: (params = {}) => api.get('/dashboard/new-resumes-count', { params }),
    getWeeklyStats: () => api.get('/dashboard/weekly-stats'),
};


export const rankingAPI = {
    triggerRanking: (jobId) => api.post(`/rank/job/${jobId}`),
    getResults: (jobId) => api.get(`/rank/job/${jobId}`),
    getShortlist: (jobId) => api.get(`/rank/job/${jobId}/shortlist`),
    getFullReport: (jobId) => api.get(`/rank/job/${jobId}/full-report`),
};

export const resumeAnalysisAPI = {
    analyzeSingle: (resumeId) => api.post(`/resume-analysis/single/${resumeId}`),
    analyzeBatch: (resumeIds) => api.post('/resume-analysis/batch', { resume_ids: resumeIds }),
    uploadAndAnalyze: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/resume-analysis/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    chat: (sessionId, message) => api.post(`/resume-analysis/chat/${sessionId}`, { message }),
    chatStream: async (sessionId, message, onToken, onError, onDone) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/resume-analysis/chat-stream/${sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        const data = line.trim().slice(6);
                        if (data === '[DONE]') {
                            onDone?.();
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.token) onToken(parsed.token);
                            if (parsed.error) onError?.(parsed.error);
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            onError?.(error.message);
        }
    }
};

// ─────────────────────────────────────────────────────
// Public API — No authentication required
// Used exclusively by the Candidate Portal (/apply page)
// ─────────────────────────────────────────────────────
const publicApi = axios.create({
    baseURL: API_BASE_URL,
});

export const publicAPI = {
    getOpenJobs: () => publicApi.get('/public/jobs'),
    submitApplication: (formData) =>
        publicApi.post('/public/apply', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export default api;
