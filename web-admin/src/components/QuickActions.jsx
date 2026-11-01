import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/premium-dashboard.css';

/**
 * Quick Actions Panel Component
 * Provides one-click access to common business operations
 */
const QuickActions = () => {
    const navigate = useNavigate();

        const actions = [
        {
            id: 'live-orders',
            title: 'Live Kitchen Orders',
            icon: '🍽️',
            description: 'Active KOT dispatch',
            color: 'warning',
            path: '/food-orders'
        },
        {
            id: 'table-qr',
            title: 'Table & QR Stands',
            icon: '📱',
            description: 'Instant scan-to-order',
            color: 'primary',
            path: '/table-qr'
        },
        {
            id: 'billing-pos',
            title: 'Billing & POS',
            icon: '🧾',
            description: 'Fast counter settlement',
            color: 'success',
            path: '/billing'
        },
        {
            id: 'menu-catalog',
            title: 'Food Menu',
            icon: '🍕',
            description: 'Dishes & categories',
            color: 'purple',
            path: '/food-orders'
        },
        {
            id: 'expense',
            title: 'Add Expense',
            icon: '💰',
            description: 'Kitchen groceries & bills',
            color: 'danger',
            path: '/expenses'
        },
        {
            id: 'kitchen-inventory',
            title: 'Kitchen Stock',
            icon: '📦',
            description: 'Ingredients & raw items',
            color: 'info',
            path: '/inventory'
        },
        {
            id: 'reports',
            title: 'Sales Analytics',
            icon: '📊',
            description: 'Daily revenue & trends',
            color: 'info',
            path: '/report'
        },
        {
            id: 'monthly-bill',
            title: 'Monthly Bill',
            icon: '💳',
            description: 'SaaS plan & invoice',
            color: 'purple',
            path: '/subscription'
        }
    ];

    const colorClasses = {
        primary: 'hover:border-indigo-500 hover:bg-indigo-50',
        success: 'hover:border-green-500 hover:bg-green-50',
        warning: 'hover:border-amber-500 hover:bg-amber-50',
        danger: 'hover:border-red-500 hover:bg-red-50',
        info: 'hover:border-blue-500 hover:bg-blue-50',
        purple: 'hover:border-purple-500 hover:bg-purple-50'
    };

    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                <span className="text-sm text-gray-500">One-click operations</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => navigate(action.path)}
                        className={`quick-action-btn text-left ${colorClasses[action.color]}`}
                    >
                        <div className="text-3xl mb-2">{action.icon}</div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{action.title}</h3>
                        <p className="text-xs text-gray-500">{action.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;
