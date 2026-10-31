import React from 'react';
import '../styles/premium-dashboard.css';

/**
 * Performance Gauge Component
 * Displays circular progress indicators for key performance metrics
 */
const PerformanceGauge = ({ title, value, max, unit = '%', color = 'primary', size = 'md' }) => {
    const percentage = Math.min((value / max) * 100, 100);

    const sizeClasses = {
        sm: { container: 'w-24 h-24', text: 'text-lg', label: 'text-xs' },
        md: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-sm' },
        lg: { container: 'w-40 h-40', text: 'text-3xl', label: 'text-base' }
    };

    const colorClasses = {
        primary: { stroke: '#667eea', bg: '#e0e7ff' },
        success: { stroke: '#10b981', bg: '#d1fae5' },
        warning: { stroke: '#f59e0b', bg: '#fef3c7' },
        danger: { stroke: '#ef4444', bg: '#fee2e2' },
        info: { stroke: '#3b82f6', bg: '#dbeafe' },
        purple: { stroke: '#a855f7', bg: '#f3e8ff' }
    };

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className={`relative ${sizeClasses[size].container}`}>
                <svg className="transform -rotate-90 w-full h-full">
                    {/* Background circle */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        stroke={colorClasses[color].bg}
                        strokeWidth="8"
                        fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        stroke={colorClasses[color].stroke}
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{
                            transition: 'stroke-dashoffset 1s ease-in-out'
                        }}
                    />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-bold ${sizeClasses[size].text}`} style={{ color: colorClasses[color].stroke }}>
                        {Math.round(percentage)}
                    </span>
                    <span className={`text-gray-500 ${sizeClasses[size].label}`}>{unit}</span>
                </div>
            </div>
            <p className={`mt-3 font-medium text-gray-700 text-center ${sizeClasses[size].label}`}>{title}</p>
        </div>
    );
};

/**
 * Performance Dashboard Component
 * Groups multiple performance gauges together
 */
const PerformanceDashboard = ({ metrics }) => {
    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Performance Metrics</h2>
                <span className="text-sm text-gray-500">Real-time tracking</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {metrics.map((metric, index) => (
                    <PerformanceGauge
                        key={index}
                        title={metric.title}
                        value={metric.value}
                        max={metric.max}
                        unit={metric.unit}
                        color={metric.color}
                        size={metric.size || 'md'}
                    />
                ))}
            </div>
        </div>
    );
};

export { PerformanceGauge, PerformanceDashboard };
export default PerformanceDashboard;
