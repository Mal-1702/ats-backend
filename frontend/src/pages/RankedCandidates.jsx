import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rankingAPI, jobsAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import CandidateCard from '../components/CandidateCard';
import { Users, TrendingUp, Loader, AlertCircle } from 'lucide-react';
import './RankedCandidates.css';

const RankedCandidates = () => {
    const { jobId } = useParams();
    const [job, setJob] = useState(null);
    const [rankings, setRankings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    // Per-card expand state: Set of resume_ids that are currently expanded
    const [expandedIds, setExpandedIds] = useState(new Set());
    const navigate = useNavigate();

    const toggleExpanded = (resumeId) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(resumeId)) {
                next.delete(resumeId);
            } else {
                next.add(resumeId);
            }
            return next;
        });
    };

    useEffect(() => {
        fetchJobAndRankings();
    }, [jobId]);

    const fetchJobAndRankings = async () => {
        try {
            const [jobResponse, rankingsResponse] = await Promise.all([
                jobsAPI.getById(jobId),
                rankingAPI.getShortlist(jobId),
            ]);

            setJob(jobResponse.data);
            setRankings(rankingsResponse.data);
        } catch (err) {
            setError('Failed to load rankings');
        } finally {
            setLoading(false);
        }
    };

    const triggerRanking = async () => {
        setProcessing(true);
        setError('');

        try {
            await rankingAPI.triggerRanking(jobId);

            // Poll for results
            setTimeout(async () => {
                await fetchJobAndRankings();
                setProcessing(false);
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to trigger ranking');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-layout">
                <Sidebar />
                <div className="dashboard-main">
                    <div className="container">
                        <div className="spinner-large"></div>
                    </div>
                </div>
            </div>
        );
    }

    const hasResults = rankings?.shortlist && rankings.shortlist.length > 0;

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <div className="ranked-candidates-page">
                    <div className="container">
                        <div className="candidates-header">
                            <div className="job-info">
                                <h1>{job?.title || 'Job Position'}</h1>
                                <div className="job-meta">
                                    <span className="meta-item">
                                        <Users size={16} />
                                        {rankings ? rankings.shortlist_size : 0} candidates
                                    </span>
                                </div>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={triggerRanking}
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <Loader size={18} className="spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp size={18} />
                                        <span>Trigger Ranking</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {!hasResults ? (
                            <div className="empty-state">
                                <Users size={64} />
                                <h2>No Rankings Yet</h2>
                                <p>
                                    {rankings?.message || 'Trigger the ranking process to match candidates with this job'}
                                </p>
                                <button className="btn btn-primary mt-2" onClick={triggerRanking}>
                                    <TrendingUp size={18} />
                                    <span>Start Matching</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="rankings-summary">
                                    <div className="summary-card">
                                        <div className="summary-icon icon-total">
                                            <Users size={32} />
                                        </div>
                                        <div className="summary-content">
                                            <div className="summary-label">Total Candidates</div>
                                            <div className="summary-value">{rankings.shortlist_size}</div>
                                        </div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-icon icon-tier">
                                            <TrendingUp size={32} />
                                        </div>
                                        <div className="summary-content">
                                            <div className="summary-label">Top Tier (A)</div>
                                            <div className="summary-value">
                                                {rankings.shortlist.filter((c) => c.tier === 'A').length}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-icon icon-score">
                                            <TrendingUp size={32} />
                                        </div>
                                        <div className="summary-content">
                                            <div className="summary-label">Average Score</div>
                                            <div className="summary-value">
                                                {Math.round(
                                                    rankings.shortlist.reduce((sum, c) => sum + c.final_score, 0) /
                                                    rankings.shortlist.length
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {rankings.recommendations && (
                                    <div className="recommendations-card">
                                        <h3>🤖 AI Recommendations</h3>
                                        <p>{rankings.recommendations}</p>
                                    </div>
                                )}

                                <div className="candidates-list">
                                    <h2>Shortlisted Candidates</h2>
                                    {rankings.shortlist.map((candidate, index) => (
                                        <CandidateCard
                                            key={candidate.resume_id ?? index}
                                            candidate={candidate}
                                            rank={index + 1}
                                            isExpanded={expandedIds.has(candidate.resume_id)}
                                            onToggle={() => toggleExpanded(candidate.resume_id)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RankedCandidates;
