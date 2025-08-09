// src/hooks/useRequests.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { requestService } from '@/services/requestService';
import { groupRequestService } from '@/services/groupRequestService';

export const useRequests = (options = {}) => {
    const {
        type = 'all', // 'all', 'one-to-one', 'group'
        status = null, // null for all, or specific status
        userId = null, // null for current user
        includeOwn = true,
        includeOthers = false,
        realTime = true
    } = options;

    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [groupRequests, setGroupRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const targetUserId = userId || user?.id;

    // Load requests based on options
    useEffect(() => {
        if (!targetUserId) return;

        setLoading(true);
        setError(null);

        const unsubscribers = [];

        try {
            // Load one-to-one requests
            if (type === 'all' || type === 'one-to-one') {
                if (includeOwn) {
                    if (status) {
                        // Load specific status
                        const unsubscribe = requestService.getUserRequestsByStatus(
                            targetUserId,
                            status,
                            (data) => {
                                setRequests(data);
                                setLoading(false);
                            }
                        );
                        unsubscribers.push(unsubscribe);
                    } else {
                        // Load all user requests
                        const unsubscribe = requestService.getAllUserRequests(
                            targetUserId,
                            (data) => {
                                setRequests(data);
                                setLoading(false);
                            }
                        );
                        unsubscribers.push(unsubscribe);
                    }
                } else if (includeOthers) {
                    // Load available requests from others
                    const unsubscribe = requestService.getAllAvailableRequests(
                        targetUserId,
                        (data) => {
                            setRequests(data);
                            setLoading(false);
                        }
                    );
                    unsubscribers.push(unsubscribe);
                }
            }

            // Load group requests
            if (type === 'all' || type === 'group') {
                const loadGroupRequests = async () => {
                    try {
                        let groupData;
                        if (status) {
                            groupData = await groupRequestService.getUserGroupRequests(targetUserId, status);
                        } else if (includeOwn) {
                            groupData = await groupRequestService.getUserGroupRequests(targetUserId);
                        } else if (includeOthers) {
                            groupData = await groupRequestService.getAllGroupRequests({
                                userId: targetUserId,
                                isAdmin: false
                            });
                        } else {
                            groupData = [];
                        }

                        setGroupRequests(groupData);
                    } catch (error) {
                        console.error('Error loading group requests:', error);
                        setGroupRequests([]);
                    } finally {
                        if (type === 'group') {
                            setLoading(false);
                        }
                    }
                };

                loadGroupRequests();
            }

        } catch (error) {
            console.error('Error setting up requests listeners:', error);
            setError(error.message);
            setLoading(false);
        }

        return () => {
            unsubscribers.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        };
    }, [targetUserId, type, status, includeOwn, includeOthers]);

    // Combine requests
    const combinedRequests = useCallback(() => {
        const combined = [];

        // Add one-to-one requests
        if (type === 'all' || type === 'one-to-one') {
            const oneToOneFormatted = requests.map(req => ({
                ...req,
                type: 'one-to-one',
                title: req.topic || req.title || 'Untitled Request'
            }));
            combined.push(...oneToOneFormatted);
        }

        // Add group requests
        if (type === 'all' || type === 'group') {
            const groupFormatted = groupRequests.map(req => ({
                ...req,
                type: 'group',
                title: req.title || 'Untitled Group Request',
                topic: req.title
            }));
            combined.push(...groupFormatted);
        }

        // Sort by updated date
        combined.sort((a, b) => {
            const aTime = a.updatedAt || a.createdAt || new Date(0);
            const bTime = b.updatedAt || b.createdAt || new Date(0);
            return bTime - aTime;
        });

        return combined;
    }, [requests, groupRequests, type]);

    // Request actions
    const createRequest = useCallback(async (requestData, isDraft = false) => {
        try {
            const result = await requestService.createRequest(requestData, targetUserId, isDraft);
            return result;
        } catch (error) {
            console.error('Error creating request:', error);
            return { success: false, message: error.message };
        }
    }, [targetUserId]);

    const updateRequest = useCallback(async (requestId, updateData, requestType = 'one-to-one') => {
        try {
            let result;
            if (requestType === 'group') {
                result = await groupRequestService.updateGroupRequest(requestId, updateData, targetUserId);
            } else {
                result = await requestService.updateRequest(requestId, updateData, targetUserId);
            }
            return result;
        } catch (error) {
            console.error('Error updating request:', error);
            return { success: false, message: error.message };
        }
    }, [targetUserId]);

    const deleteRequest = useCallback(async (requestId, requestType = 'one-to-one') => {
        try {
            let result;
            if (requestType === 'group') {
                result = await groupRequestService.deleteGroupRequest(requestId, targetUserId);
            } else {
                result = await requestService.deleteRequest(requestId, targetUserId);
            }
            return result;
        } catch (error) {
            console.error('Error deleting request:', error);
            return { success: false, message: error.message };
        }
    }, [targetUserId]);

    const publishDraft = useCallback(async (requestId, requestType = 'one-to-one') => {
        try {
            let result;
            if (requestType === 'group') {
                result = await groupRequestService.changeRequestStatus(requestId, 'pending', targetUserId);
            } else {
                result = await requestService.publishDraft(requestId, targetUserId);
            }
            return result;
        } catch (error) {
            console.error('Error publishing draft:', error);
            return { success: false, message: error.message };
        }
    }, [targetUserId]);

    const changeStatus = useCallback(async (requestId, newStatus, requestType = 'one-to-one') => {
        try {
            let result;
            if (requestType === 'group') {
                result = await groupRequestService.changeRequestStatus(requestId, newStatus, targetUserId);
            } else {
                result = await requestService.changeRequestStatus(requestId, newStatus, targetUserId);
            }
            return result;
        } catch (error) {
            console.error('Error changing status:', error);
            return { success: false, message: error.message };
        }
    }, [targetUserId]);

    const saveDraft = useCallback(async (requestData, requestId = null) => {
        try {
            const result = await requestService.saveDraft(requestData, targetUserId, requestId);
            return result;
        } catch (error) {
            console.error('Error saving draft:', error);
            return { success: false, message: error.message };
        }
    }, [targetUserId]);

    // Statistics
    const getStats = useCallback(() => {
        const combined = combinedRequests();
        return {
            total: combined.length,
            oneToOne: requests.length,
            group: groupRequests.length,
            draft: combined.filter(r => r.status === 'draft').length,
            active: combined.filter(r => ['open', 'active', 'pending', 'voting_open'].includes(r.status)).length,
            completed: combined.filter(r => r.status === 'completed').length,
            archived: combined.filter(r => ['archived', 'cancelled'].includes(r.status)).length,
            byStatus: combined.reduce((acc, req) => {
                acc[req.status] = (acc[req.status] || 0) + 1;
                return acc;
            }, {})
        };
    }, [combinedRequests, requests, groupRequests]);

    return {
        // Data
        requests: combinedRequests(),
        oneToOneRequests: requests,
        groupRequests,
        stats: getStats(),

        // States
        loading,
        error,

        // Actions
        createRequest,
        updateRequest,
        deleteRequest,
        publishDraft,
        changeStatus,
        saveDraft,

        // Utils
        refresh: () => {
            setLoading(true);
            // The useEffect will re-run and refresh the data
        }
    };
};

// Specific hooks for common use cases
export const useMyRequests = (status = null) => {
    return useRequests({
        type: 'all',
        status,
        includeOwn: true,
        includeOthers: false
    });
};

export const useDraftRequests = () => {
    return useRequests({
        type: 'all',
        status: 'draft',
        includeOwn: true,
        includeOthers: false
    });
};

export const useActiveRequests = () => {
    return useRequests({
        type: 'all',
        status: 'active',
        includeOwn: true,
        includeOthers: false
    });
};

export const useCompletedRequests = () => {
    return useRequests({
        type: 'all',
        status: 'completed',
        includeOwn: true,
        includeOthers: false
    });
};

export const useAvailableRequests = () => {
    return useRequests({
        type: 'all',
        includeOwn: false,
        includeOthers: true
    });
};

export const useOneToOneRequests = () => {
    return useRequests({
        type: 'one-to-one',
        includeOwn: false,
        includeOthers: true
    });
};

export const useGroupRequests = () => {
    return useRequests({
        type: 'group',
        includeOwn: false,
        includeOthers: true
    });
};