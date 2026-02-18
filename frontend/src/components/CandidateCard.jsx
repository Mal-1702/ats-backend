import { useState } from 'react';
import { Award, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import './CandidateCard.css';

const CandidateCard = ({ candidate, rank }) => {
    const [expanded, setExpanded] = useState(false);

    const getTierColor = (tier) => {
        switch (tier) {
            case 'A':
                return 'tier-a';
            case 'B':
                return 'tier-b';
            case 'C':
                return 'tier-c';
            case 'D':
                return 'tier-d';
            default:
                return 'tier-default';
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'score-excellent';
        if (score >= 60) return 'score-good';
        if (score >= 40) return 'score-fair';
        return 'score-poor';
    };

    return (
        <div className="candidate-card">
            <div className="candidate-header">
                <div className="candidate-rank">#{rank}</div>
                <div className="candidate-info">
                    <h3>{candidate.candidate_filename || 'Candidate'}</h3>
                    <div className="candidate-meta">
                        <span className={`tier-badge ${getTierColor(candidate.tier)}`}>
                            Tier {candidate.tier}
                        </span>
                        <span className={`score-badge ${getScoreColor(candidate.final_score)}`}>
                            {candidate.final_score}/100
                        </span>
                    </div>
                </div>
                <button
                    className="expand-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('Expand button clicked, current state:', expanded);
                        setExpanded(!expanded);
                    }}
                    type="button"
                    aria-label="Expand candidate details"
                >
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {expanded && (
                <div className="candidate-details">
                    {candidate.breakdown && (
                        <div className="score-breakdown">
                            <h4>Score Breakdown</h4>
                            <div className="breakdown-grid">
                                {Object.entries(candidate.breakdown).map(([key, value]) => (
                                    <div key={key} className="breakdown-item">
                                        <span className="breakdown-label">
                                            {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </span>
                                        <div className="breakdown-bar">
                                            <div
                                                className="breakdown-fill"
                                                style={{ width: `${value}%` }}
                                            />
                                        </div>
                                        <span className="breakdown-value">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {candidate.reasoning && (
                        <div className="reasoning-section">
                            <h4>🤖 AI Analysis</h4>
                            <p>{candidate.reasoning}</p>
                        </div>
                    )}

                    {candidate.key_strengths && candidate.key_strengths.length > 0 && (
                        <div className="strengths-section">
                            <h4>
                                <TrendingUp size={18} />
                                Key Strengths
                            </h4>
                            <ul>
                                {candidate.key_strengths.map((strength, idx) => (
                                    <li key={idx}>{strength}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {candidate.gaps && candidate.gaps.length > 0 && (
                        <div className="gaps-section">
                            <h4>
                                <AlertTriangle size={18} />
                                Gaps to Address
                            </h4>
                            <ul>
                                {candidate.gaps.map((gap, idx) => (
                                    <li key={idx}>{gap}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CandidateCard;
