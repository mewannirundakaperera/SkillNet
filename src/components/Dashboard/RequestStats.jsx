// src/components/Dashboard/RequestStats.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    limit
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const RequestStats = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        oneToOne: {
            created: 0,
            received: 0,
            accepted: 0,
            completed: 0
        },
        group: {
            created: 0,
            received: 0,
            participating: 0,
            completed: 0
        },
        loading: true
    });
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        if (!user?.id) return;

        const loadStats = async () => {
            try {
                // Load one-to-one request stats
                const loadOneToOneStats = async () => {
                    // Created requests
                    const createdQuery = query(
                        collection(db, 'requests'),
                        where('userId', '==', user.id)
                    );
                    const createdSnapshot = await getDocs(createdQuery);
                    const created = createdSnapshot.size;

                    // Received requests (responses to others' requests)
                    const receivedQuery = query(
                        collection(db, 'requests'),
                        where('userId', '!=', user.id),
                        where('status', 'in', ['open', 'pending', 'active'])
                    );
                    const receivedSnapshot = await getDocs(receivedQuery);
                    const received = receivedSnapshot.size;

                    // Accepted requests (responses user made)
                    const acceptedQuery = query(
                        collection(db, 'requestResponses'),
                        where('responderId', '==', user.id),
                        where('status', '==', 'accepted')
                    );
                    const acceptedSnapshot = await getDocs(acceptedQuery);
                    const accepted = acceptedSnapshot.size;

                    // Completed requests
                    const completedQuery = query(
                        collection(db, 'requests'),
                        where('userId', '==', user.id),
                        where('status', '==', 'completed')
                    );
                    const completedSnapshot = await getDocs(completedQuery);
                    const completed = completedSnapshot.size;

                    return { created, received, accepted, completed };
                };

                // Load group request stats
                const loadGroupStats = async () => {
                    // Get user's groups first
                    const groupsQuery = query(
                        collection(db, 'groups'),
                        where('members', 'array-contains', user.id)
                    );
                    const groupsSnapshot = await getDocs(groupsQuery);
                    const userGroupIds = groupsSnapshot.docs.map(doc => doc.id);

                    if (userGroupIds.length === 0) {
                        return { created: 0, received: 0, participating: 0, completed: 0 };
                    }

                    // Created group requests
                    const createdGroupQuery = query(
                        collection(db, 'groupRequests'),
                        where('createdBy', '==', user.id)
                    );
                    const createdGroupSnapshot = await getDocs(createdGroupQuery);
                    const created = createdGroupSnapshot.size;

                    // Received group requests (from user's groups, not created by user)
                    const receivedGroupQuery = query(
                        collection(db, 'groupRequests'),
                        where('targetGroupId', 'in', userGroupIds),
                        where('createdBy', '!=', user.id),
                        where('status', 'in', ['pending', 'voting_open', 'accepted'])
                    );
                    const receivedGroupSnapshot = await getDocs(receivedGroupQuery);
                    const received = receivedGroupSnapshot.size;

                    // Participating in group requests
                    const participatingQuery = query(
                        collection(db, 'groupRequests'),
                        where('participants', 'array-contains', user.id)
                    );
                    const participatingSnapshot = await getDocs(participatingQuery);
                    const participating = participatingSnapshot.size;

                    // Completed group requests
                    const completedGroupQuery = query(
                        collection(db, 'groupRequests'),
                        where('participants', 'array-contains', user.id),
                        where('status', '==', 'completed')
                    );
                    const completedGroupSnapshot = await getDocs(completedGroupQuery);
                    const completed = completedGroupSnapshot.size;

                    return { created, received, participating, completed };
                };

                // Load recent activity
                const loadRecentActivity = async () => {
                    const activities = [];

                    // Recent one-to-one requests
                    const recentRequestsQuery = query(
                        collection(db, 'requests'),
                        orderBy('createdAt', 'desc'),
                        limit(5)
                    );
                    const recentRequestsSnapshot = await getDocs(recentRequestsQuery);

                    recentRequestsSnapshot.forEach(doc => {
                        const data = doc.data();
                        activities.push({
                            id: doc.id,
                            type: 'one-to-one',
                            action: 'created',
                            title: data.topic || data.title,
                            user: data.userName,
                            time: data.createdAt?.toDate() || new Date(),
                            status: data.status
                        });
                    });

                    // Recent group requests
                    const recentGroupQuery = query(
                        collection(db, 'groupRequests'),
                        orderBy('createdAt', 'desc'),
                        limit(5)
                    );
                    const recentGroupSnapshot = await getDocs(recentGroupQuery);

                    recentGroupSnapshot.forEach(doc => {
                        const data = doc.data();
                        activities.push({
                            id: doc.id,
                            type: 'group',
                            action: 'created',
                            title: data.title,
                            user: data.createdByName,
                            time: data.createdAt?.toDate() || new Date(),
                            status: data.status
                        });
                    });

                    // Sort by time and take most recent 10
                    return activities
                        .sort((a, b) => b.time - a.time)
                        .slice(0, 10);
                };

                // Load all stats
                const [oneToOneStats, groupStats, activities] = await Promise.all([
                    loadOneToOneStats(),
                    loadGroupStats(),
                    loadRecentActivity()
                ]);

                setStats({
                    oneToOne: oneToOneStats,
                    group: groupStats,
                    loading: false
                });

                setRecentActivity(activities);

            } catch (error) {
                console.error('Error loading dashboard stats:', error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        loadStats();
    }, [user]);

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

    const getStatusColor = (status, type) => {
        const colors = {
            open: 'text-blue-600',
            pending: 'text-yellow-600',
            accepted: 'text-green-600',
            active: 'text-blue-600',
            completed: 'text-gray-600',
            voting_open: 'text-orange-600',
            payment_complete: 'text-purple-600',
            in_progress: 'text-blue-600'
        };
        return colors[status] || 'text-gray-600';
    };

    if (stats.loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* One-to-One Created */}
                <Link to="/requests/my-requests" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">My 1:1 Requests</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.oneToOne.created}</p>
                            <p className="text-xs text-gray-500">Created by you</p>
                        </div>
                        <div className="text-blue-500 text-2xl">👤</div>
                    </div>
                </Link>

                {/* One-to-One Received */}
                <Link to="/OneToOneRequests" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">1:1 Available</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.oneToOne.received}</p>
                            <p className="text-xs text-gray-500">From other students</p>
                        </div>
                        <div className="text-green-500 text-2xl">💬</div>
                    </div>
                </Link>

                {/* Group Created */}
                <Link to="/requests/my-requests" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">My Group Requests</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.group.created}</p>
                            <p className="text-xs text-gray-500">Created by you</p>
                        </div>
                        <div className="text-purple-500 text-2xl">👥</div>
                    </div>
                </Link>

                {/* Group Available */}
                <Link to="/requests/group-received" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Group Available</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.group.received}</p>
                            <p className="text-xs text-gray-500">From your groups</p>
                        </div>
                        <div className="text-orange-500 text-2xl">🎯</div>
                    </div>
                </Link>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* One-to-One Accepted */}
                <Link to="/OneToOneRequests/accepted" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.oneToOne.accepted}</p>
                        <p className="text-sm text-gray-600">1:1 Accepted</p>
                    </div>
                </Link>

                {/* One-to-One Completed */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{stats.oneToOne.completed}</p>
                        <p className="text-sm text-gray-600">1:1 Completed</p>
                    </div>
                </div>

                {/* Group Participating */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{stats.group.participating}</p>
                        <p className="text-sm text-gray-600">Group Participating</p>
                    </div>
                </div>

                {/* Group Completed */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{stats.group.completed}</p>
                        <p className="text-sm text-gray-600">Group Completed</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        to="/requests/create"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="bg-blue-100 text-blue-600 rounded-full p-2">👤</div>
                        <div>
                            <p className="font-medium text-gray-900">Create 1:1 Request</p>
                            <p className="text-sm text-gray-500">Get individual help</p>
                        </div>
                    </Link>

                    <Link
                        to="/requests/create-group"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="bg-purple-100 text-purple-600 rounded-full p-2">👥</div>
                        <div>
                            <p className="font-medium text-gray-900">Create Group Request</p>
                            <p className="text-sm text-gray-500">Collaborate with groups</p>
                        </div>
                    </Link>

                    <Link
                        to="/OneToOneRequests"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="bg-green-100 text-green-600 rounded-full p-2">💬</div>
                        <div>
                            <p className="font-medium text-gray-900">Browse 1:1 Requests</p>
                            <p className="text-sm text-gray-500">Help other students</p>
                        </div>
                    </Link>

                    <Link
                        to="/requests/group-received"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="bg-orange-100 text-orange-600 rounded-full p-2">🎯</div>
                        <div>
                            <p className="font-medium text-gray-900">Browse Group Requests</p>
                            <p className="text-sm text-gray-500">Join group sessions</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {recentActivity.map((activity, index) => (
                            <div key={`${activity.id}-${index}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                                <div className={`rounded-full p-2 ${
                                    activity.type === 'group' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                    {activity.type === 'group' ? '👥' : '👤'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                        {activity.user} {activity.action} a {activity.type} request
                                    </p>
                                    <p className="text-sm text-gray-600 truncate">{activity.title}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-medium ${getStatusColor(activity.status, activity.type)}`}>
                                        {activity.status}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.time)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestStats;