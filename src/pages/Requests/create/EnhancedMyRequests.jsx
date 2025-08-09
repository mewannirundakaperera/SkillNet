// src/pages/Requests/create/EnhancedMyRequests.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const EnhancedMyRequests = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState('all'); // all, one-to-one, group
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [actionLoading, setActionLoading] = useState({});

    // Load user's requests
    useEffect(() => {
        if (!user?.id) return;

        const loadUserRequests = async () => {
            try {
                setLoading(true);
                const allRequests = [];

                // Load one-to-one requests
                const oneToOneQuery = query(
                    collection(db, 'requests'),
                    where('userId', '==', user.id),
                    orderBy('createdAt', 'desc')
                );

                // Load group requests
                const groupRequestsQuery = query(
                    collection(db, 'groupRequests'),
                    where('createdBy', '==', user.id),
                    orderBy('createdAt', 'desc')
                );

                // Set up real-time listeners
                const unsubscribeOneToOne = onSnapshot(oneToOneQuery, (snapshot) => {
                    const oneToOneRequests = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        oneToOneRequests.push({
                            id: doc.id,
                            type: 'one-to-one',
                            title: data.topic || data.title,
                            description: data.description,
                            subject: data.subject,
                            status: data.status || 'open',
                            createdAt: data.createdAt?.toDate() || new Date(),
                            updatedAt: data.updatedAt?.toDate(),
                            preferredDate: data.preferredDate,
                            preferredTime: data.preferredTime,
                            duration: data.duration,
                            paymentAmount: data.paymentAmount,
                            tags: data.tags || [],
                            responses: data.responses || [],
                            responseCount: data.responses?.length || 0,
                            originalData: data
                        });
                    });
                    updateRequestsList(oneToOneRequests, 'one-to-one');
                });

                const unsubscribeGroup = onSnapshot(groupRequestsQuery, (snapshot) => {
                    const groupRequests = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        groupRequests.push({
                            id: doc.id,
                            type: 'group',
                            title: data.title,
                            description: data.description,
                            category: data.category,
                            status: data.status || 'pending',
                            createdAt: data.createdAt?.toDate() || new Date(),
                            updatedAt: data.updatedAt?.toDate(),
                            deadline: data.deadline ? new Date(data.deadline) : null,
                            duration: data.duration,
                            rate: data.rate,
                            sessionType: data.sessionType,
                            maxParticipants: data.maxParticipants,
                            skills: data.skills || [],
                            tags: data.tags || [],
                            votes: data.votes || [],
                            participants: data.participants || [],
                            voteCount: data.voteCount || data.votes?.length || 0,
                            participantCount: data.participantCount || data.participants?.length || 0,
                            targetGroupId: data.targetGroupId,
                            groupName: data.groupName,
                            originalData: data
                        });
                    });
                    updateRequestsList(groupRequests, 'group');
                });

                return () => {
                    unsubscribeOneToOne();
                    unsubscribeGroup();
                };

            } catch (error) {
                console.error('Error loading user requests:', error);
                setLoading(false);
            }
        };

        loadUserRequests();
    }, [user]);

    // Helper to update requests list
    const updateRequestsList = (newRequests, type) => {
        setRequests(prevRequests => {
            // Remove old requests of this type and add new ones
            const filteredRequests = prevRequests.filter(req => req.type !== type);
            const updatedRequests = [...filteredRequests, ...newRequests];

            // Sort by creation date
            updatedRequests.sort((a, b) => b.createdAt - a.createdAt);

            return updatedRequests;
        });
        setLoading(false);
    };

    // Handle request actions
    const handleRequestAction = async (requestId, action, requestType) => {
        setActionLoading(prev => ({ ...prev, [requestId]: action }));

        try {
            const collectionName = requestType === 'group' ? 'groupRequests' : 'requests';
            const requestRef = doc(db, collectionName, requestId);

            switch (action) {
                case 'activate':
                    await updateDoc(requestRef, {
                        status: 'open',
                        updatedAt: new Date()
                    });
                    break;
                case 'pause':
                    await updateDoc(requestRef, {
                        status: 'paused',
                        updatedAt: new Date()
                    });
                    break;
                case 'complete':
                    await updateDoc(requestRef, {
                        status: 'completed',
                        updatedAt: new Date()
                    });
                    break;
                case 'delete':
                    if (window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
                        await deleteDoc(requestRef);
                    }
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error(`Error ${action}ing request:`, error);
            alert(`Failed to ${action} request. Please try again.`);
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    // Filter requests
    const filteredRequests = requests.filter(request => {
        const matchesType = selectedType === 'all' || request.type === selectedType;
        const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
        return matchesType && matchesStatus;
    });

    // Get status display
    const getStatusDisplay = (status, type) => {
        const statusMap = {
            open: { label: 'Open', color: 'bg-green-100 text-green-700' },
            pending: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
            voting_open: { label: 'Voting Open', color: 'bg-orange-100 text-orange-700' },
            accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700' },
            active: { label: 'Active', color: 'bg-blue-100 text-blue-700' },
            paused: { label: 'Paused', color: 'bg-gray-100 text-gray-700' },
            completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700' },
            cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
            draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' }
        };
        return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
    };

    // Format time ago
    const formatTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return `${Math.floor(diffDays / 7)}w ago`;
    };

    // Get request stats
    const getRequestStats = () => {
        const stats = {
            total: requests.length,
            oneToOne: requests.filter(r => r.type === 'one-to-one').length,
            group: requests.filter(r => r.type === 'group').length,
            open: requests.filter(r => r.status === 'open').length,
            pending: requests.filter(r => r.status === 'pending').length,
            active: requests.filter(r => ['active', 'accepted', 'voting_open'].includes(r.status)).length,
            completed: requests.filter(r => r.status === 'completed').length
        };
        return stats;
    };

    const stats = getRequestStats();

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading your requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">My Requests</h1>
                    <p className="text-gray-600">Manage all your learning requests in one place</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/requests/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <span>➕</span>
                        New 1:1 Request
                    </Link>
                    <Link
                        to="/requests/create-group"
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <span>👥</span>
                        New Group Request
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-blue-600">{stats.total}</div>
                    <div className="text-gray-500 text-sm">Total Requests</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-600">{stats.oneToOne}</div>
                    <div className="text-gray-500 text-sm">One-to-One</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-600">{stats.group}</div>
                    <div className="text-gray-500 text-sm">Group</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-yellow-500">
                    <div className="text-lg font-bold text-yellow-600">{stats.open + stats.pending}</div>
                    <div className="text-gray-500 text-sm">Open/Pending</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="text-lg font-bold text-orange-600">{stats.active}</div>
                    <div className="text-gray-500 text-sm">Active</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-500">
                    <div className="text-lg font-bold text-gray-600">{stats.completed}</div>
                    <div className="text-gray-500 text-sm">Completed</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option value="one-to-one">One-to-One</option>
                            <option value="group">Group</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="pending">Pending</option>
                            <option value="voting_open">Voting Open</option>
                            <option value="accepted">Accepted</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="paused">Paused</option>
                        </select>
                    </div>
                    <div className="ml-auto">
                        <p className="text-sm text-gray-600">
                            Showing {filteredRequests.length} of {requests.length} requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            {filteredRequests.length > 0 ? (
                <div className="space-y-4">
                    {filteredRequests.map((request) => (
                        <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            request.type === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                      {request.type === 'group' ? '👥 Group' : '👤 1:1'}
                    </span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            getStatusDisplay(request.status, request.type).color
                                        }`}>
                      {getStatusDisplay(request.status, request.type).label}
                    </span>
                                    </div>

                                    <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                                        <span>📅 Created {formatTimeAgo(request.createdAt)}</span>
                                        {request.type === 'one-to-one' && (
                                            <>
                                                <span>📚 {request.subject}</span>
                                                <span>💬 {request.responseCount} responses</span>
                                                {request.paymentAmount && <span>💰 Rs.{request.paymentAmount}</span>}
                                            </>
                                        )}
                                        {request.type === 'group' && (
                                            <>
                                                <span>🏷️ {request.category}</span>
                                                <span>👍 {request.voteCount} votes</span>
                                                <span>👥 {request.participantCount} participants</span>
                                                {request.rate && <span>💰 {request.rate}</span>}
                                            </>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {request.tags && request.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {request.tags.map((tag, index) => (
                                                <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Skills (for group requests) */}
                                    {request.skills && request.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {request.skills.map((skill, index) => (
                                                <span key={index} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                          {skill}
                        </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 ml-6">
                                    <Link
                                        to={`/requests/details/${request.id}?type=${request.type}`}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        View Details
                                    </Link>

                                    {/* Status-specific actions */}
                                    {(request.status === 'open' || request.status === 'pending') && (
                                        <button
                                            onClick={() => handleRequestAction(request.id, 'pause', request.type)}
                                            disabled={actionLoading[request.id] === 'pause'}
                                            className="text-yellow-600 hover:text-yellow-700 text-sm font-medium disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'pause' ? 'Pausing...' : 'Pause'}
                                        </button>
                                    )}

                                    {request.status === 'paused' && (
                                        <button
                                            onClick={() => handleRequestAction(request.id, 'activate', request.type)}
                                            disabled={actionLoading[request.id] === 'activate'}
                                            className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'activate' ? 'Activating...' : 'Activate'}
                                        </button>
                                    )}

                                    {['open', 'pending', 'active', 'accepted'].includes(request.status) && (
                                        <button
                                            onClick={() => handleRequestAction(request.id, 'complete', request.type)}
                                            disabled={actionLoading[request.id] === 'complete'}
                                            className="text-gray-600 hover:text-gray-700 text-sm font-medium disabled:opacity-50"
                                        >
                                            {actionLoading[request.id] === 'complete' ? 'Completing...' : 'Mark Complete'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleRequestAction(request.id, 'delete', request.type)}
                                        disabled={actionLoading[request.id] === 'delete'}
                                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                                    >
                                        {actionLoading[request.id] === 'delete' ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        {requests.length === 0 ? 'No requests created yet' : 'No requests match your filters'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {requests.length === 0
                            ? 'Create your first request to start connecting with other students!'
                            : 'Try adjusting your filters to see more requests.'
                        }
                    </p>
                    <div className="flex gap-3 justify-center">
                        {requests.length > 0 && (
                            <button
                                onClick={() => {
                                    setSelectedType('all');
                                    setSelectedStatus('all');
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear Filters
                            </button>
                        )}
                        <Link
                            to="/requests/create"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Create 1:1 Request
                        </Link>
                        <Link
                            to="/requests/create-group"
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                            Create Group Request
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedMyRequests;