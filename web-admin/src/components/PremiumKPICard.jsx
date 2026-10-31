import React from 'react';
import '../styles/premium-dashboard.css';

/**
 * Premium KPI Card Component
 * Displays key performance indicators with trends, comparisons, and visual enhancements
 */
const PremiumKPICard = ({
    title,
    value,
    subtitle,
    icon,
    trend, // { direction: 'up'|'down'|'neutral', value: '12%', label: 'vs last month' }
    color = 'primary', // primary, success, warning, danger, info, purple
    progress, // { current: 75, target: 100, label: '75% of target' }
    onClick,
    loading = false
}) => {
    const colorClasses = {
        primary: 'from-indigo-500 to-purple-600',
        success: 'from-green-500 to-emerald-600',
        warning: 'from-amber-500 to-orange-600',
        danger: 'from-red-500 to-rose-600',
        info: 'from-blue-500 to-cyan-600',
        purple: 'from-purple-500 to-fuchsia-600'
    };

    const iconBgClasses = {
        primary: 'bg-gradient-to-br from-indigo-100 to-purple-100',
        success: 'bg-gradient-to-br from-green-100 to-emerald-100',
        warning: 'bg-gradient-to-br from-amber-100 to-orange-100',
        danger: 'bg-gradient-to-br from-red-100 to-rose-100',
        info: 'bg-gradient-to-br from-blue-100 to-cyan-100',
        purple: 'bg-gradient-to-br from-purple-100 to-fuchsia-100'
    };

    const getTrendIcon = () => {
        if (!trend) return null;
        switch (trend.direction) {
            case 'up':
                return <span className="text-green-500">↑</span>;
            case 'down':
                return <span className="text-red-500">↓</span>;
            default:
                return <span className="text-gray-500">→</span>;
        }
    };

    const getTrendColor = () => {
        if (!trend) return '';
        switch (trend.direction) {
            case 'up':
                return 'text-green-600';
            case 'down':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    if (loading) {
        return (
            <div className="glass-card rounded-2xl p-6 hover-lift">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`glass-card rounded-2xl p-6 hover-lift kpi-card ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            {/* Header with Icon */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-gray-900 animate-count">{value}</h3>
                        {trend && (
                            <div className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor()}`}>
                                {getTrendIcon()}
                                <span>{trend.value}</span>
                            </div>
                        )}
                    </div>
                </div>
                {icon && (
                    <div className={`icon-container ${iconBgClasses[color]}`}>
                        <span className={`text-2xl bg-gradient-to-br ${colorClasses[color]} bg-clip-text text-transparent`}>
                            {icon}
                        </span>
                    </div>
                )}
            </div>

            {/* Subtitle or Trend Label */}
            {(subtitle || trend?.label) && (
                <p className="text-xs text-gray-500 mb-3">
                    {subtitle || trend?.label}
                </p>
            )}

            {/* Progress Bar */}
            {progress && (
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-600">{progress.label}</span>
                        <span className="text-xs font-semibold text-gray-700">
                            {Math.round((progress.current / progress.target) * 100)}%
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className={`progress-fill bg-gradient-to-r ${colorClasses[color]}`}
                            style={{ width: `${Math.min((progress.current / progress.target) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PremiumKPICard;
