import { X } from 'lucide-react';
import './SkillPriorityCard.css';

export const PRIORITY_LEVELS = [
    { label: 'Critical', value: 1.00, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
    { label: 'High', value: 0.75, color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)' },
    { label: 'Medium', value: 0.50, color: '#eab308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)' },
    { label: 'Low', value: 0.25, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.4)' },
    { label: 'Optional', value: 0.10, color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.4)' },
];

export function getPriorityConfig(priority) {
    if (priority >= 0.90) return PRIORITY_LEVELS[0];
    if (priority >= 0.65) return PRIORITY_LEVELS[1];
    if (priority >= 0.40) return PRIORITY_LEVELS[2];
    if (priority >= 0.20) return PRIORITY_LEVELS[3];
    return PRIORITY_LEVELS[4];
}

export default function SkillPriorityCard({ skillObj, onRemove, onPriorityChange }) {
    const { skill, priority } = skillObj;
    const cfg = getPriorityConfig(priority);
    const barW = Math.round(priority * 100);

    return (
        <div className="skill-priority-card" style={{ borderColor: cfg.border, background: cfg.bg }}>
            {/* Top row: name + remove */}
            <div className="skill-card-header">
                <span className="skill-card-name">{skill}</span>
                <button
                    type="button"
                    className="skill-card-remove"
                    onClick={() => onRemove(skill)}
                    aria-label={`Remove ${skill}`}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Priority bar */}
            <div className="priority-bar-track">
                <div
                    className="priority-bar-fill"
                    style={{ width: `${barW}%`, background: cfg.color }}
                />
            </div>

            {/* Slider */}
            <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.01"
                value={priority}
                onChange={(e) => onPriorityChange(skill, parseFloat(e.target.value))}
                className="priority-slider"
                style={{ '--thumb-color': cfg.color, '--track-color': cfg.border }}
                aria-label={`Priority for ${skill}`}
            />

            {/* Level chips */}
            <div className="priority-chips">
                {PRIORITY_LEVELS.map((lvl) => (
                    <button
                        key={lvl.label}
                        type="button"
                        className={`priority-chip ${Math.abs(priority - lvl.value) < 0.13 ? 'active' : ''}`}
                        style={
                            Math.abs(priority - lvl.value) < 0.13
                                ? { background: lvl.bg, borderColor: lvl.border, color: lvl.color }
                                : {}
                        }
                        onClick={() => onPriorityChange(skill, lvl.value)}
                    >
                        {lvl.label}
                    </button>
                ))}
            </div>

            {/* Current label */}
            <div className="priority-label" style={{ color: cfg.color }}>
                {barW}% — {cfg.label}
            </div>
        </div>
    );
}
