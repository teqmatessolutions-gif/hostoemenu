/**
 * Notification System - DISABLED
 * This is a stub to prevent breaking existing code that imports notification context
 * All notification functionality has been removed for performance reasons
 */

import React, { createContext, useContext } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        // Return dummy functions if context is not available
        return {
            notifications: [],
            unreadCount: 0,
            fetchNotifications: () => { },
            markAsRead: () => { },
            markAllAsRead: () => { },
            deleteNotification: () => { },
            clearAll: () => { }
        };
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    // Provide dummy notification context
    const value = {
        notifications: [],
        unreadCount: 0,
        fetchNotifications: () => {
            console.log('[INFO] Notification system is disabled');
        },
        markAsRead: () => { },
        markAllAsRead: () => { },
        deleteNotification: () => { },
        clearAll: () => { }
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

// Notification Bell Component - DISABLED (returns null to hide it)
export const NotificationBell = () => {
    // Return null to completely hide the notification bell
    return null;
};

export default NotificationProvider;
