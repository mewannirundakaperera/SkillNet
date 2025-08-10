import React, { useState, useEffect } from 'react';
import { useAuth } from '@hooks/useAuth.js';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    onSnapshot,
    serverTimestamp,
    addDoc
} from 'firebase/firestore';
import { db } from '@config/firebase.js';

const AcceptedRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [userProfiles, setUserProfiles] = useState({}); // Cache for user profiles

    // Handle request selection
    const handleRequestClick = (request, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        console.log('🎯 Accepted request selected:', request.id);
        setSelected(request);
    };

    // Handle action clicks
    const handleActionClick = (requestId, action, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        console.log('🔘 Action clicked:', action, 'for request:', requestId);
        handleStatusChange(requestId, action);
    };

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
            avatar: `https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff`,
            bio: 'No bio available',
            role: 'Student',
            rating: 4.5,
            completedSessions: 0
        };
        setUserProfiles(prev => ({ ...prev, [userId]: defaultProfile }));
        return defaultProfile;
    };

    // Load accepted requests from RequestResponses collection
    useEffect(() => {
        if (!user?.id) return;

        const fetchAcceptedRequests = async () => {
            try {
                setLoading(true);

                // Get accepted responses by current user
                const responsesRef = collection(db, 'requestResponses');
                const responsesQuery = query(
                    responsesRef,
                    where('responderId', '==', user.id),
                    where('status', '==', 'accepted'),
                    orderBy('createdAt', 'desc')
                );

                // Real-time listener for responses
                const unsubscribe = onSnapshot(responsesQuery, async (snapshot) => {
                    const fetchedRequests = [];
                    const requestIds = [];

                    // Get all accepted response records
                    for (const docSnap of snapshot.docs) {
                        const responseData = {
                            id: docSnap.id,
                            ...docSnap.data(),
                            createdAt: docSnap.data().createdAt?.toDate() || new Date()
                        };
                        requestIds.push(responseData.requestId);
                    }

                    // Fetch original request data for each accepted response
                    if (requestIds.length > 0) {
                        const requestsRef = collection(db, 'requests');
                        const requestsSnapshot = await getDocs(requestsRef);

                        for (const reqDoc of requestsSnapshot.docs) {
                            const requestData = { id: reqDoc.id, ...reqDoc.data() };

                            if (requestIds.includes(requestData.id)) {
                                // Load user profile for the request creator
                                const profile = await loadUserProfile(requestData.userId);

                                // Transform data to match component expectations
                                const transformedRequest = {
                                    id: requestData.id,
                                    name: profile.displayName,
                                    avatar: profile.avatar,
                                    title: requestData.topic || requestData.title,
                                    message: requestData.description,
                                    rate: requestData.paymentAmount ? `Rs.${requestData.paymentAmount}/session` : null,
                                    time: formatTimeAgo(requestData.createdAt?.toDate() || new Date()),
                                    status: 'accepted',
                                    category: 'accepted',
                                    subject: requestData.subject,
                                    scheduledDate: requestData.preferredDate,
                                    scheduledTime: requestData.preferredTime,
                                    duration: `${requestData.duration || 60} minutes`,
                                    tags: requestData.tags || [],
                                    createdAt: requestData.createdAt?.toDate() || new Date(),
                                    acceptedAt: snapshot.docs.find(doc => doc.data().requestId === requestData.id)?.data().createdAt?.toDate(),
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
                        }
                    }

                    setRequests(fetchedRequests);
                    if (fetchedRequests.length > 0 && !selected) {
                        setSelected(fetchedRequests[0]);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error('Error fetching accepted requests:', error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error setting up accepted requests listener:', error);
                setLoading(false);
            }
        };

        fetchAcceptedRequests();
    }, [user, selected]);

    // Handle status change for requests
    const handleStatusChange = async (requestId, newStatus) => {
        try {
            if (newStatus === 'archived') {
                // Create archive record
                const archiveData = {
                    requestId,
                    responderId: user.id,
                    responderName: user.displayName || user.name,
                    responderEmail: user.email,
                    status: 'archived',
                    createdAt: serverTimestamp(),
                    message: 'Request archived by responder'
                };

                // Add archive record
                await addDoc(collection(db, 'requestResponses'), archiveData);

                // Update local state - move to archived
                setRequests(prev => prev.filter(req => req.id !== requestId));

                // Clear selection if it was the changed request
                if (selected?.id === requestId) {
                    const remainingRequests = requests.filter(req => req.id !== requestId);
                    setSelected(remainingRequests.length > 0 ? remainingRequests[0] : null);
                }

                alert('Request archived successfully!');
            }
        } catch (error) {
            console.error('Error updating request status:', error);
            alert('Failed to update request status. Please try again.');
        }
    };

    // Action buttons for accepted requests
    const renderActionButtons = (request) => {
        return (
            <div className="space-y-3 mt-4">
                <div className="bg-green-50 text-green-700 rounded px-4 py-2 text-sm text-center flex items-center justify-center gap-2">
                    <span>✅</span>
                    <span>Request Accepted</span>
                </div>

                {/* Session management buttons */}
                <div className="flex gap-2">
                    <button
                        className="btn-gradient-primary text-white rounded px-4 py-2 font-medium text-sm transition-colors flex-1"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Start session clicked for:', request.id);
                            alert('Session management feature coming soon!');
                        }}
                    >
                        Start Session
                    </button>
                    <button
                        className="bg-[#2D3748] text-[#A0AEC0] rounded px-4 py-2 font-medium text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={(e) => handleActionClick(request.id, 'archived', e)}
                    >
                        Archive
                    </button>
                </div>

                {/* Contact options */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        className="bg-[#2D3748] text-green-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Message student clicked for:', request.id);
                            alert('Messaging feature coming soon!');
                        }}
                    >
                        💬 Message
                    </button>
                    <button
                        className="bg-[#2D3748] text-purple-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Schedule session clicked for:', request.id);
                            alert('Scheduling feature coming soon!');
                        }}
                    >
                        📅 Schedule
                    </button>
                </div>
            </div>
        );
    };

    // Get status badge
    const getStatusBadge = (status) => {
        return (
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-900 text-green-300 border border-green-700">
        Accepted
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
        return `${Math.floor(diffDays / 7)}w ago`;
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
                        <p className="mt-4 text-[#A0AEC0]">Loading accepted requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-[#1A202C]">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Accepted Requests</h1>
                <p className="text-[#A0AEC0]">Requests you have accepted and are currently managing</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">{requests.length}</div>
                    <div className="text-[#A0AEC0] text-sm">Accepted Requests</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div className="text-lg font-bold text-[#4299E1]">
                        {requests.filter(r => r.rate).length}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">Paid Sessions</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">
                        {new Set(requests.map(r => r.subject)).size}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">Subjects Teaching</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
                    <div className="text-lg font-bold text-orange-400">
                        {requests.filter(r => r.acceptedAt && new Date() - r.acceptedAt < 7 * 24 * 60 * 60 * 1000).length}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">New This Week</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Request Feed */}
                <section className="flex-1 card-dark rounded-lg shadow-sm p-6 min-h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-xl text-white">
                            Accepted Requests ({requests.length})
                        </h2>
                        <div className="flex gap-2">
                            <select className="input-dark border border-[#4A5568] rounded-lg px-3 py-1 text-sm">
                                <option>Sort by: Recent</option>
                                <option>Sort by: Payment</option>
                                <option>Sort by: Subject</option>
                                <option>Sort by: Acceptance Date</option>
                            </select>
                        </div>
                    </div>

                    {requests.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {requests.map((req) => (
                                <div
                                    key={req.id}
                                    className={`flex items-start gap-3 p-3 rounded cursor-pointer border transition-colors ${
                                        selected?.id === req.id
                                            ? 'border-[#4299E1] bg-[#2D3748]'
                                            : 'border-transparent hover:bg-[#2D3748]'
                                    }`}
                                    onClick={(e) => handleRequestClick(req, e)}
                                >
                                    <img src={req.avatar} alt={req.name} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex-1">
                                        <div className="font-semibold text-white">{req.name}</div>
                                        <div className="text-[#A0AEC0] text-sm">{req.title}</div>
                                        <div className="text-[#A0AEC0] text-xs truncate max-w-xs">{req.message}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-[#A0AEC0]">📚 {req.subject}</span>
                                            <span className="text-xs text-[#A0AEC0]">⏰ {req.duration}</span>
                                            {req.acceptedAt && (
                                                <span className="text-xs text-green-400">✅ Accepted {formatTimeAgo(req.acceptedAt)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-[#A0AEC0]">{req.time}</span>
                                        {req.rate && (
                                            <span className="text-xs bg-[#2D3748] text-[#4299E1] px-2 py-0.5 rounded font-medium border border-[#4A5568]">
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
                            <div className="text-[#A0AEC0] text-4xl mb-4">✅</div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                No accepted requests
                            </h3>
                            <p className="text-[#A0AEC0]">
                                You haven't accepted any requests yet. Check pending requests to get started.
                            </p>
                        </div>
                    )}
                </section>

                {/* Request Details */}
                {selected && (
                    <aside className="w-[400px] card-dark rounded-lg shadow-sm p-6 border border-[#4A5568] flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <img src={selected.avatar} alt={selected.name} className="w-14 h-14 rounded-full object-cover" />
                            <div className="flex-1">
                                <div className="font-bold text-lg text-white">{selected.name}</div>
                                <div className="text-[#A0AEC0] text-sm">{selected.profile?.role || 'Student'}</div>
                                <div className="flex items-center gap-2 text-xs text-[#A0AEC0]">
                                    <span>⭐ {selected.profile?.rating || '4.5'}</span>
                                    <span>•</span>
                                    <span>{selected.profile?.completedSessions || '0'} sessions</span>
                                </div>
                                <div
                                    className="text-[#4299E1] text-xs font-medium cursor-pointer hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Profile view clicked for:', selected.name);
                                        alert('Profile view feature coming soon!');
                                    }}
                                >
                                    View Full Profile
                                </div>
                            </div>
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
                                        <span className="text-green-400 font-semibold">{selected.rate}</span>
                                    </div>
                                )}
                                {selected.acceptedAt && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[#A0AEC0]">✅ Accepted:</span>
                                        <span className="text-green-400 font-semibold">{formatTimeAgo(selected.acceptedAt)}</span>
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

                            {/* Report Option */}
                            <div
                                className="text-[#A0AEC0] text-xs mt-4 cursor-pointer hover:text-red-400 transition-colors text-center border-t border-[#4A5568] pt-4"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Report request clicked for:', selected.id);
                                    alert('Report feature coming soon!');
                                }}
                            >
                                🚩 Report Request
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default AcceptedRequests;