import React, { useMemo } from 'react';
import '../styles/premium-dashboard.css';

/**
 * Smart Alerts Component
 * Displays business insights, warnings, and actionable notifications
 */
const SmartAlerts = ({
    revenue,
    roomCounts,
    inventoryItems,
    expenses,
    services,
    bookings
}) => {
    const alerts = useMemo(() => {
        const alertsList = [];
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Revenue Alerts
        if (revenue?.today > 0) {
            const avgDaily = revenue.month / now.getDate();
            if (revenue.today > avgDaily * 1.2) {
                alertsList.push({
                    type: 'success',
                    icon: '📈',
                    title: 'High Revenue Day!',
                    message: `Today's revenue is 20% above average`,
                    priority: 'high'
                });
            } else if (revenue.today < avgDaily * 0.5) {
                alertsList.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Low Revenue Alert',
                    message: `Today's revenue is below average`,
                    priority: 'medium'
                });
            }
        }

        // Occupancy Alerts
        if (roomCounts) {
            const occupancyRate = (roomCounts.occupied / roomCounts.total) * 100;
            if (occupancyRate >= 90) {
                alertsList.push({
                    type: 'info',
                    icon: '🏆',
                    title: 'High Occupancy',
                    message: `${occupancyRate.toFixed(0)}% rooms occupied - Near full capacity!`,
                    priority: 'high'
                });
            } else if (occupancyRate < 30) {
                alertsList.push({
                    type: 'warning',
                    icon: '📉',
                    title: 'Low Occupancy',
                    message: `Only ${occupancyRate.toFixed(0)}% occupancy - Consider promotions`,
                    priority: 'medium'
                });
            }

            if (roomCounts.maintenance > 0) {
                alertsList.push({
                    type: 'warning',
                    icon: '🔧',
                    title: 'Rooms Under Maintenance',
                    message: `${roomCounts.maintenance} room(s) need attention`,
                    priority: 'medium'
                });
            }
        }

        // Inventory Alerts
        if (inventoryItems && inventoryItems.length > 0) {
            const lowStock = inventoryItems.filter(item => {
                const stock = Number(item.current_stock || item.quantity || 0);
                const min = Number(item.minimum_stock || item.min_quantity || 0);
                return stock > 0 && stock <= min;
            });

            if (lowStock.length > 0) {
                alertsList.push({
                    type: 'danger',
                    icon: '📦',
                    title: 'Low Inventory Alert',
                    message: `${lowStock.length} item(s) running low on stock`,
                    priority: 'high'
                });
            }
        }

        // Expense Alerts
        if (expenses && revenue) {
            const expenseRatio = (expenses.month / revenue.month) * 100;
            if (expenseRatio > 70) {
                alertsList.push({
                    type: 'danger',
                    icon: '💸',
                    title: 'High Expense Ratio',
                    message: `Expenses are ${expenseRatio.toFixed(0)}% of revenue`,
                    priority: 'high'
                });
            }
        }

        // Service Alerts
        if (services && Array.isArray(services)) {
            const pendingServices = services.filter(s => {
                const status = (s.status || '').toLowerCase();
                return status === 'pending' || status === 'assigned';
            });

            if (pendingServices.length > 5) {
                alertsList.push({
                    type: 'info',
                    icon: '🛎️',
                    title: 'Pending Services',
                    message: `${pendingServices.length} services awaiting completion`,
                    priority: 'medium'
                });
            }
        }

        // Booking Alerts
        if (bookings && Array.isArray(bookings)) {
            const todayCheckIns = bookings.filter(b => {
                const checkIn = b.check_in ? new Date(b.check_in).toISOString().slice(0, 10) : null;
                return checkIn === todayStr && b.status?.toLowerCase() === 'confirmed';
            });

            if (todayCheckIns.length > 0) {
                alertsList.push({
                    type: 'info',
                    icon: '📅',
                    title: 'Today\'s Check-ins',
                    message: `${todayCheckIns.length} guest(s) expected to check-in today`,
                    priority: 'high'
                });
            }
        }

        // Sort by priority
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return alertsList.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }, [revenue, roomCounts, inventoryItems, expenses, services, bookings]);

    if (alerts.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Smart Alerts</h2>
                    <span className="badge-success px-3 py-1 rounded-full text-xs">All Clear</span>
                </div>
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">✨</div>
                    <p className="text-gray-600">No alerts at the moment. Everything looks good!</p>
                </div>
            </div>
        );
    }

    const getAlertClass = (type) => {
        switch (type) {
            case 'success':
                return 'alert-success';
            case 'warning':
                return 'alert-warning';
            case 'danger':
                return 'alert-danger';
            case 'info':
            default:
                return 'alert-info';
        }
    };

    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Smart Alerts</h2>
                <span className="badge-warning px-3 py-1 rounded-full text-xs">
                    {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {alerts.map((alert, index) => (
                    <div key={index} className={`${getAlertClass(alert.type)} flex items-start gap-3`}>
                        <div className="text-2xl flex-shrink-0">{alert.icon}</div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm mb-1">{alert.title}</h3>
                            <p className="text-xs text-gray-700">{alert.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SmartAlerts;
