import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    onSnapshot,
    updateDoc,
    doc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const ArchivedRequests = () => {
    const { user } = useAuth();
    const [archivedRequests, setArchivedRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [userProfiles, setUserProfiles] = useState({});
    const [actionLoading, setActionLoading] = useState({});

    // Load user profiles for request creators
    const loadUserProfile = async (userId) => {
        if (userProfiles[userId]) return userProfiles[userId];

        try {
            // Try userProfiles collection first (public data)
            const publicProfileQuery = query(
                collection(db, 'userProfiles'),
                where('uid', '==', userId)
            );
            const publicSnapshot = await getDocs(publicProfileQuery);

            let profile = null;
            if (!publicSnapshot.empty) {
                profile = { id: publicSnapshot.docs[0].id, ...publicSnapshot.docs[0].data() };
            } else {
                // Fallback to users collection
                const usersQuery = query(
                    collection(db, 'users'),
                    where('uid', '==', userId)
                );
                const usersSnapshot = await getDocs(usersQuery);

                if (!usersSnapshot.empty) {
                    const userData = usersSnapshot.docs[0].data();
                    profile = {
                        id: usersSnapshot.docs[0].id,
                        displayName: userData.displayName || userData.name || 'User',
                        avatar: userData.avatar || userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}&background=3b82f6&color=fff`,
                        bio: userData.bio || 'No bio available',
                        role: userData.role || 'Student',
                        rating: userData.stats?.averageRating || 4.5,
                        completedSessions: userData.stats?.completedSessions || 0
                    };
                }
            }

            if (profile) {
                setUserProfiles(prev => ({ ...prev, [userId]: profile }));
                return profile;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }

        // Return default profile if loading fails
        const defaultProfile = {
            displayName: 'User',
            avatar: `https://ui-avatars.com/api/?name=User&background=6b7280&color=fff`,
            bio: 'No bio available',
            role: 'Student',
            rating: 4.5,
            completedSessions: 0
        };
        setUserProfiles(prev => ({ ...prev, [userId]: defaultProfile }));
        return defaultProfile;
    };

    // Load archived requests from Firestore
    useEffect(() => {
        if (!user?.id) return;

        const fetchArchivedRequests = async () => {
            try {
                setLoading(true);

                // Get archived/declined requests and responses
                const requestResponsesRef = collection(db, 'requestResponses');
                const archivedQuery = query(
                    requestResponsesRef,
                    where('responderId', '==', user.id),
                    where('status', 'in', ['archived', 'declined', 'completed']),
                    orderBy('createdAt', 'desc')
                );

                // Real-time listener for archived responses
                const unsubscribe = onSnapshot(archivedQuery, async (snapshot) => {
                    const fetchedRequests = [];

                    for (const docSnap of snapshot.docs) {
                        const responseData = {
                            id: docSnap.id,
                            ...docSnap.data(),
                            createdAt: docSnap.data().createdAt?.toDate() || new Date()
                        };

                        try {
                            // Get the original request data
                            const requestDoc = await getDocs(query(
                                collection(db, 'requests'),
                                where('__name__', '==', responseData.requestId)
                            ));

                            if (!requestDoc.empty) {
                                const requestData = {
                                    id: requestDoc.docs[0].id,
                                    ...requestDoc.docs[0].data()
                                };

                                // Load user profile for the request creator
                                const profile = await loadUserProfile(requestData.userId);

                                // Transform data to match component expectations
                                const transformedRequest = {
                                    id: responseData.id,
                                    requestId: responseData.requestId,
                                    name: profile.displayName,
                                    avatar: profile.avatar,
                                    title: requestData.topic || requestData.title,
                                    message: requestData.description,
                                    rate: requestData.paymentAmount ? `Rs.${requestData.paymentAmount}/session` : null,
                                    time: formatTimeAgo(responseData.createdAt),
                                    status: responseData.status,
                                    category: responseData.status,
                                    subject: requestData.subject,
                                    scheduledDate: requestData.preferredDate,
                                    scheduledTime: requestData.preferredTime,
                                    duration: `${requestData.duration || 60} minutes`,
                                    tags: requestData.tags || [],
                                    archivedAt: responseData.createdAt,
                                    responseMessage: responseData.message,
                                    originalData: requestData,
                                    profile: {
                                        username: `@${profile.displayName?.toLowerCase().replace(/\s+/g, '_')}`,
                                        role: profile.role,
                                        bio: profile.bio,
                                        company: profile.company || 'Student',
                                        rating: profile.rating,
                                        completedSessions: profile.completedSessions
                                    }
                                };

                                fetchedRequests.push(transformedRequest);
                            }
                        } catch (error) {
                            console.error('Error fetching request data:', error);
                        }
                    }

                    setArchivedRequests(fetchedRequests);
                    if (fetchedRequests.length > 0 && !selected) {
                        setSelected(fetchedRequests[0]);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error('Error fetching archived requests:', error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error setting up archived requests listener:', error);
                setLoading(false);
            }
        };

        fetchArchivedRequests();
    }, [user, selected]);

    // Handle request click
    const handleRequestClick = (request, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        setSelected(request);
    };

    // Handle restore request
    const handleRestoreRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to restore this request to pending status?')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'restoring' }));

        try {
            await updateDoc(doc(db, 'requestResponses', requestId), {
                status: 'pending'
            });

            alert('Request restored successfully!');

            // Remove from archived list
            setArchivedRequests(prev => prev.filter(req => req.id !== requestId));
            if (selected?.id === requestId) {
                setSelected(archivedRequests[0] || null);
            }
        } catch (error) {
            console.error('Error restoring request:', error);
            alert('Failed to restore request. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    // Handle delete permanently
    const handleDeletePermanently = async (requestId) => {
        if (!window.confirm('Are you sure you want to permanently delete this request? This action cannot be undone.')) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [requestId]: 'deleting' }));

        try {
            await deleteDoc(doc(db, 'requestResponses', requestId));
            alert('Request deleted permanently!');

            // Remove from archived list
            setArchivedRequests(prev => prev.filter(req => req.id !== requestId));
            if (selected?.id === requestId) {
                setSelected(archivedRequests[0] || null);
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Failed to delete request. Please try again.');
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const badgeClasses = {
            archived: 'bg-[#2D3748] text-[#A0AEC0] border border-[#4A5568]',
            declined: 'bg-red-900 text-red-300 border border-red-700',
            completed: 'bg-green-900 text-green-300 border border-green-700'
        };

        const labels = {
            archived: 'Archived',
            declined: 'Declined',
            completed: 'Completed'
        };

        return (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClasses[status] || badgeClasses.archived}`}>
        {labels[status] || status}
      </span>
        );
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
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return `${Math.floor(diffDays / 30)}m ago`;
    };

    // Render action buttons for archived requests
    const renderActionButtons = (request) => {
        return (
            <div className="flex gap-2 mt-4">
                <button
                    className="bg-[#2D3748] text-[#4299E1] rounded px-4 py-2 font-medium text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRestoreRequest(request.id);
                    }}
                    disabled={actionLoading[request.id] === 'restoring'}
                >
                    {actionLoading[request.id] === 'restoring' ? 'Restoring...' : 'Restore'}
                </button>
                <button
                    className="bg-red-900 text-red-300 rounded px-4 py-2 font-medium text-sm hover:bg-red-800 transition-colors border border-red-700"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeletePermanently(request.id);
                    }}
                    disabled={actionLoading[request.id] === 'deleting'}
                >
                    {actionLoading[request.id] === 'deleting' ? 'Deleting...' : 'Delete Forever'}
                </button>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
                        <p className="mt-4 text-[#A0AEC0]">Loading archived requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-[#1A202C]">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Archived Requests</h1>
                <p className="text-[#A0AEC0]">Completed, declined, and archived requests from other users</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-[#4A5568]">
                    <div className="text-lg font-bold text-[#A0AEC0]">{archivedRequests.length}</div>
                    <div className="text-[#A0AEC0] text-sm">Total Archived</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">
                        {archivedRequests.filter(r => r.status === 'completed').length}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">Completed</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-red-500">
                    <div className="text-lg font-bold text-red-400">
                        {archivedRequests.filter(r => r.status === 'declined').length}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">Declined</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">
                        {archivedRequests.filter(r => r.status === 'archived').length}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">Archived</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Archived Requests Feed */}
                <section className="flex-1 card-dark rounded-lg shadow-sm p-6 min-h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-xl text-white">
                            Archived Requests ({archivedRequests.length})
                        </h2>
                        <div className="flex gap-2">
                            <select className="input-dark border border-[#4A5568] rounded-lg px-3 py-1 text-sm">
                                <option>Sort by: Recent</option>
                                <option>Sort by: Status</option>
                                <option>Sort by: Subject</option>
                            </select>
                        </div>
                    </div>

                    {archivedRequests.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {archivedRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className={`flex items-start gap-3 p-3 rounded cursor-pointer border transition-colors ${
                                        selected?.id === req.id
                                            ? 'border-[#4299E1] bg-[#2D3748]'
                                            : 'border-transparent hover:bg-[#2D3748]'
                                    }`}
                                    onClick={(e) => handleRequestClick(req, e)}
                                >
                                    <img
                                        src={req.avatar}
                                        alt={req.name}
                                        className="w-10 h-10 rounded-full object-cover opacity-75"
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold text-white">{req.name}</div>
                                        <div className="text-[#A0AEC0] text-sm">{req.title}</div>
                                        <div className="text-[#A0AEC0] text-xs truncate max-w-xs">{req.message}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-[#A0AEC0]">📚 {req.subject}</span>
                                            <span className="text-xs text-[#A0AEC0]">⏰ {req.duration}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-[#A0AEC0]">Archived {req.time}</span>
                                        {req.rate && (
                                            <span className="text-xs bg-[#2D3748] text-[#A0AEC0] px-2 py-0.5 rounded font-medium border border-[#4A5568]">
                      {req.rate}
                    </span>
                                        )}
                                        {getStatusBadge(req.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-[#A0AEC0] text-4xl mb-4">📁</div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                No archived requests found
                            </h3>
                            <p className="text-[#A0AEC0]">
                                Your archived, completed, and declined requests will appear here.
                            </p>
                        </div>
                    )}
                </section>

                {/* Request Details */}
                {selected && (
                    <aside className="w-[400px] card-dark rounded-lg shadow-sm p-6 border border-[#4A5568] flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <img
                                src={selected.avatar}
                                alt={selected.name}
                                className="w-14 h-14 rounded-full object-cover opacity-75"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-lg text-white">{selected.name}</div>
                                <div className="text-[#A0AEC0] text-sm">{selected.profile?.role || 'Student'}</div>
                                <div className="flex items-center gap-2 text-xs text-[#A0AEC0]">
                                    <span>⭐ {selected.profile?.rating || '4.5'}</span>
                                    <span>•</span>
                                    <span>{selected.profile?.completedSessions || '0'} sessions</span>
                                </div>
                            </div>
                        </div>

                        {/* Archived Status */}
                        <div className="bg-[#2D3748] border border-[#4A5568] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">Status</span>
                                {getStatusBadge(selected.status)}
                            </div>
                            <div className="text-sm text-[#A0AEC0]">
                                Archived {formatTimeAgo(selected.archivedAt)}
                            </div>
                            {selected.responseMessage && (
                                <div className="text-xs text-[#A0AEC0] mt-1">
                                    "{selected.responseMessage}"
                                </div>
                            )}
                        </div>

                        {/* Request Details */}
                        <div className="border-t border-[#4A5568] pt-4">
                            <div className="font-semibold text-white mb-2">{selected.title}</div>

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">📚 Subject:</span>
                                    <span className="text-white">{selected.subject}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">📅 Date:</span>
                                    <span className="text-white">{selected.scheduledDate || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏰ Time:</span>
                                    <span className="text-white">{selected.scheduledTime || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏱️ Duration:</span>
                                    <span className="text-white">{selected.duration}</span>
                                </div>
                                {selected.rate && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[#A0AEC0]">💰 Payment:</span>
                                        <span className="text-[#A0AEC0] font-semibold">{selected.rate}</span>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {selected.tags && selected.tags.length > 0 && (
                                <div className="mb-4">
                                    <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Tags:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selected.tags.map((tag, index) => (
                                            <span key={index} className="bg-[#2D3748] text-[#A0AEC0] px-2 py-1 rounded text-xs border border-[#4A5568]">
                      {tag}
                    </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Message */}
                            <div className="mb-4">
                                <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Description:</span>
                                <div className="text-white text-sm bg-[#2D3748] rounded p-3 border border-[#4A5568] whitespace-pre-line">
                                    {selected.message}
                                </div>
                            </div>

                            {/* User Profile Info */}
                            {selected.profile && (
                                <div className="bg-[#2D3748] rounded-lg p-3 mb-4 border border-[#4A5568]">
                                    <div className="text-sm">
                                        <div className="font-medium text-white mb-1">About {selected.name}</div>
                                        <div className="text-[#A0AEC0] text-xs mb-2">{selected.profile.bio}</div>
                                        {selected.profile.company && (
                                            <div className="text-xs text-[#A0AEC0]">
                                                🏢 {selected.profile.company}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {renderActionButtons(selected)}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ArchivedRequests;