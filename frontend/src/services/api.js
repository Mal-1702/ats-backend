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
    getCurrentUser: () => api.get('/auth/me'),
};

export const jobsAPI = {
    create: (data) => api.post('/jobs', data),
    getAll: () => api.get('/jobs'),
    getById: (id) => api.get(`/jobs/${id}`),
    toggleStatus: (jobId, isActive) => api.patch(`/jobs/${jobId}/status`, null, { params: { is_active: isActive } }),
};

export const uploadAPI = {
    uploadResume: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    getTaskStatus: (taskId) => api.get(`/task-status/${taskId}`),
};

export const resumesAPI = {
    getAll: () => api.get('/resumes'),
    delete: (resumeId) => api.delete(`/resumes/${resumeId}`),
    downloadResume: (resumeId) => api.get(`/resumes/${resumeId}/download`, { responseType: 'blob' }),
    viewResume: (resumeId) => api.get(`/resumes/${resumeId}/view`, { responseType: 'blob' }),
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
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    chat: (sessionId, message) => api.post(`/resume-analysis/chat/${sessionId}`, { message }),
};

export default api;
