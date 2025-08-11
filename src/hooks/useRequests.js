// src/hooks/useRequests.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import databaseService from '@/services/databaseService';
import { groupRequestService } from '@/services/groupRequestService';

// Base hook for request management with proper flow handling
export const useRequests = (type = 'all', status = null, userId = null) => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        oneToOne: 0,
        group: 0,
        draft: 0,
        open: 0,
        active: 0,
        completed: 0,
        archived: 0,
        pending: 0,
        byStatus: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const targetUserId = userId || user?.id;

    useEffect(() => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        let unsubscribe = null;

        const loadRequests = async () => {
            try {
                setLoading(true);
                setError(null);

                if (type === 'one-to-one') {
                    // One-to-one requests only
                    unsubscribe = databaseService.getUserRequests(targetUserId, status, (data) => {
                        setRequests(data);
                        updateStats(data, []);
                        setLoading(false);
                    });
                } else if (type === 'available') {
                    // Available requests from others (for pending offers)
                    unsubscribe = databaseService.getAvailableRequests(targetUserId, (data) => {
                        setRequests(data);
                        updateStats(data, []);
                        setLoading(false);
                    });
                } else if (type === 'group') {
                    // Group requests only
                    const groupRequests = await groupRequestService.getUserGroupRequests(targetUserId, status);
                    setRequests(groupRequests);
                    updateStats([], groupRequests);
                    setLoading(false);
                } else {
                    // All requests (both types) - for My Requests page
                    const promises = [];

                    // Get one-to-one requests
                    promises.push(new Promise((resolve) => {
                        databaseService.getUserRequests(targetUserId, status, resolve);
                    }));

                    // Get group requests
                    promises.push(groupRequestService.getUserGroupRequests(targetUserId, status));

                    const [oneToOneRequests, groupRequests] = await Promise.all(promises);

                    const combined = [
                        ...oneToOneRequests.map(req => ({ ...req, type: 'one-to-one' })),
                        ...groupRequests.map(req => ({ ...req, type: 'group' }))
                    ];

                    // Sort by updated date
                    combined.sort((a, b) => {
                        const aTime = a.updatedAt || a.createdAt || new Date(0);
                        const bTime = b.updatedAt || b.createdAt || new Date(0);
                        return bTime - aTime;
                    });

                    setRequests(combined);
                    updateStats(oneToOneRequests, groupRequests);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error loading requests:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadRequests();

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [targetUserId, type, status]);

    const updateStats = useCallback((oneToOneRequests = [], groupRequests = []) => {
        const allRequests = [...oneToOneRequests, ...groupRequests];

        const newStats = {
            total: allRequests.length,
            oneToOne: oneToOneRequests.length,
            group: groupRequests.length,
            draft: 0,
            open: 0,
            active: 0,
            completed: 0,
            archived: 0,
            pending: 0,
            byStatus: {}
        };

        allRequests.forEach(req => {
            const status = req.status || 'unknown';
            newStats.byStatus[status] = (newStats.byStatus[status] || 0) + 1;

            // Count specific statuses according to the flow
            switch (status) {
                case 'draft':
                    newStats.draft++;
                    break;
                case 'open':
                    newStats.open++;
                    break;
                case 'active':
                case 'voting_open':
                case 'accepted':
                    newStats.active++;
                    break;
                case 'completed':
                    newStats.completed++;
                    break;
                case 'archived':
                case 'cancelled':
                    newStats.archived++;
                    break;
                case 'pending':
                    newStats.pending++;
                    break;
            }
        });

        setStats(newStats);
    }, []);

    const changeStatus = useCallback(async (requestId, newStatus, requestType = 'one-to-one') => {
        try {
            let result;
            if (requestType === 'group') {
                result = await groupRequestService.changeRequestStatus(requestId, newStatus, targetUserId);
            } else {
                // Use specific methods for the flow
                switch (newStatus) {
                    case 'completed':
                        result = await databaseService.completeRequest(requestId, targetUserId);
                        break;
                    case 'archived':
                        result = await databaseService.archiveRequest(requestId, targetUserId);
                        break;
                    default:
                        // For other status changes, update directly
                        result = await databaseService.updateRequest(requestId, { status: newStatus }, targetUserId);
                }
            }
            return result;
        } catch (err) {
            console.error('Error changing status:', err);
            return { success: false, message: err.message };
        }
    }, [targetUserId]);

    const deleteRequest = useCallback(async (requestId, requestType = 'one-to-one') => {
        try {
            let result;
            if (requestType === 'group') {
                result = await groupRequestService.deleteGroupRequest(requestId, targetUserId);
            } else {
                result = await databaseService.deleteRequest(requestId, targetUserId);
            }
            return result;
        } catch (err) {
            console.error('Error deleting request:', err);
            return { success: false, message: err.message };
        }
    }, [targetUserId]);

    const publishDraft = useCallback(async (requestId) => {
        try {
            return await databaseService.publishDraft(requestId, targetUserId);
        } catch (err) {
            console.error('Error publishing draft:', err);
            return { success: false, message: err.message };
        }
    }, [targetUserId]);

    const respondToRequest = useCallback(async (requestId, responseData) => {
        try {
            return await databaseService.respondToRequest(requestId, responseData, targetUserId);
        } catch (err) {
            console.error('Error responding to request:', err);
            return { success: false, message: err.message };
        }
    }, [targetUserId]);

    return {
        requests,
        stats,
        loading,
        error,
        changeStatus,
        deleteRequest,
        publishDraft,
        respondToRequest
    };
};

// Hook for user's own requests (My Requests page)
export const useMyRequests = () => useRequests('all');

// Hook for draft requests (Draft page)
export const useDraftRequests = () => useRequests('one-to-one', 'draft');

// Hook for active requests created by user (Active Requests page)
export const useActiveRequests = () => useRequests('one-to-one', 'active');

// Hook for completed requests (Completed page)
export const useCompletedRequests = () => useRequests('one-to-one', 'completed');

// Hook for available requests from others (Pending Offers page)
export const usePendingOffers = () => useRequests('available');

// Hook specifically for user responses with enhanced data
export const useUserResponses = (status = null) => {
    const { user } = useAuth();
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        const unsubscribe = databaseService.getUserResponses(user.id, status, (data) => {
            setResponses(data);
            setLoading(false);
        });

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [user?.id, status]);

    return {
        responses,
        loading,
        error
    };
};

// Hook for accepted requests (requests the user has accepted)
export const useAcceptedRequests = () => useUserResponses('accepted');

// Hook for archived responses
export const useArchivedResponses = () => useUserResponses('archived');