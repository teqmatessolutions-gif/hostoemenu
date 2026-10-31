/**
 * Real-Time Update Hooks
 * Reusable hooks for optimistic updates and preventing duplicate API calls
 */

import { useCallback, useRef, useState } from 'react';

/**
 * Hook to prevent duplicate API calls (single-flight pattern)
 * Ensures only one instance of an API call is in flight at a time
 */
export const useSingleFlight = () => {
    const pendingRef = useRef(new Map());

    return useCallback(async (key, apiCall) => {
        // If this call is already in flight, return the existing promise
        if (pendingRef.current.has(key)) {
            return pendingRef.current.get(key);
        }

        // Start new call
        const promise = apiCall();
        pendingRef.current.set(key, promise);

        try {
            const result = await promise;
            return result;
        } finally {
            // Clean up after call completes
            pendingRef.current.delete(key);
        }
    }, []);
};

/**
 * Hook for debouncing function calls
 * Useful for preventing excessive API calls during rapid user actions
 */
export const useDebounce = (callback, delay = 300) => {
    const timeoutRef = useRef(null);

    return useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
};

/**
 * Hook for optimistic updates with automatic rollback on error
 * 
 * @param {Function} setState - State setter function
 * @param {Function} apiCall - Async function that makes the API call
 * @param {Function} optimisticUpdate - Function that returns the optimistic state
 * @param {Function} onSuccess - Optional callback on success
 * @param {Function} onError - Optional callback on error
 */
export const useOptimisticUpdate = () => {
    const [isUpdating, setIsUpdating] = useState(false);

    const executeUpdate = useCallback(async ({
        setState,
        apiCall,
        optimisticUpdate,
        rollbackUpdate,
        onSuccess,
        onError
    }) => {
        setIsUpdating(true);

        // Apply optimistic update immediately
        setState(optimisticUpdate);

        try {
            // Make API call
            const result = await apiCall();

            // Call success callback if provided
            if (onSuccess) {
                onSuccess(result);
            }

            return result;
        } catch (error) {
            // Rollback on error
            setState(rollbackUpdate);

            // Call error callback if provided
            if (onError) {
                onError(error);
            } else {
                console.error('Optimistic update failed:', error);
                alert(`Update failed: ${error.response?.data?.detail || error.message}`);
            }

            throw error;
        } finally {
            setIsUpdating(false);
        }
    }, []);

    return { executeUpdate, isUpdating };
};

/**
 * Hook for managing list data with optimistic CRUD operations
 */
export const useOptimisticList = (initialData = []) => {
    const [items, setItems] = useState(initialData);
    const { executeUpdate, isUpdating } = useOptimisticUpdate();

    // Create item with optimistic update
    const createItem = useCallback(async (apiCall, newItemData) => {
        const tempId = `temp_${Date.now()}`;
        const optimisticItem = { ...newItemData, id: tempId, _isOptimistic: true };

        return executeUpdate({
            setState: setItems,
            apiCall,
            optimisticUpdate: (prev) => [optimisticItem, ...prev],
            rollbackUpdate: (prev) => prev.filter(item => item.id !== tempId),
            onSuccess: (result) => {
                // Replace optimistic item with real data
                setItems(prev => prev.map(item =>
                    item.id === tempId ? result.data : item
                ));
            }
        });
    }, [executeUpdate]);

    // Update item with optimistic update
    const updateItem = useCallback(async (id, apiCall, updates) => {
        const oldItem = items.find(item => item.id === id);

        return executeUpdate({
            setState: setItems,
            apiCall,
            optimisticUpdate: (prev) => prev.map(item =>
                item.id === id ? { ...item, ...updates } : item
            ),
            rollbackUpdate: (prev) => prev.map(item =>
                item.id === id ? oldItem : item
            ),
            onSuccess: (result) => {
                // Update with server response
                setItems(prev => prev.map(item =>
                    item.id === id ? result.data : item
                ));
            }
        });
    }, [items, executeUpdate]);

    // Delete item with optimistic update
    const deleteItem = useCallback(async (id, apiCall) => {
        const oldItem = items.find(item => item.id === id);
        const oldIndex = items.findIndex(item => item.id === id);

        return executeUpdate({
            setState: setItems,
            apiCall,
            optimisticUpdate: (prev) => prev.filter(item => item.id !== id),
            rollbackUpdate: (prev) => {
                const newItems = [...prev];
                newItems.splice(oldIndex, 0, oldItem);
                return newItems;
            }
        });
    }, [items, executeUpdate]);

    return {
        items,
        setItems,
        createItem,
        updateItem,
        deleteItem,
        isUpdating
    };
};

export default {
    useSingleFlight,
    useDebounce,
    useOptimisticUpdate,
    useOptimisticList
};
