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

const PendingRequests = () => {
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
        console.log('🎯 Pending request selected:', request.id);
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

    // Load pending requests from Firestore
    useEffect(() => {
        if (!user?.id) return;

        const fetchRequests = async () => {
            try {
                setLoading(true);

                // Get only pending/open requests from other users
                const requestsRef = collection(db, 'requests');
                const requestsQuery = query(
                    requestsRef,
                    where('userId', '!=', user.id),
                    where('status', 'in', ['open', 'pending']),
                    orderBy('createdAt', 'desc')
                );

                // Real-time listener for requests
                const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
                    const fetchedRequests = [];

                    for (const docSnap of snapshot.docs) {
                        const requestData = {
                            id: docSnap.id,
                            ...docSnap.data(),
                            createdAt: docSnap.data().createdAt?.toDate() || new Date()
                        };

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
                            time: formatTimeAgo(requestData.createdAt),
                            status: 'pending',
                            category: 'pending',
                            subject: requestData.subject,
                            scheduledDate: requestData.preferredDate,
                            scheduledTime: requestData.preferredTime,
                            duration: `${requestData.duration || 60} minutes`,
                            tags: requestData.tags || [],
                            createdAt: requestData.createdAt,
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

                    setRequests(fetchedRequests);
                    if (fetchedRequests.length > 0 && !selected) {
                        setSelected(fetchedRequests[0]);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error('Error fetching pending requests:', error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error setting up pending requests listener:', error);
                setLoading(false);
            }
        };

        fetchRequests();
    }, [user, selected]);

    // Handle status change for requests
    const handleStatusChange = async (requestId, newStatus) => {
        try {
            // Create a response/application record
            const responseData = {
                requestId,
                responderId: user.id,
                responderName: user.displayName || user.name,
                responderEmail: user.email,
                status: newStatus,
                createdAt: serverTimestamp(),
                message: newStatus === 'accepted' ? 'Request accepted' : 'Request declined'
            };

            // Add response to requestResponses collection
            await addDoc(collection(db, 'requestResponses'), responseData);

            // Update local state - remove the request as it's no longer pending
            setRequests(prev => prev.filter(req => req.id !== requestId));

            // Clear selection if it was the changed request
            if (selected?.id === requestId) {
                const remainingRequests = requests.filter(req => req.id !== requestId);
                setSelected(remainingRequests.length > 0 ? remainingRequests[0] : null);
            }

            // Show success message
            const messages = {
                accepted: 'Request accepted successfully! The requester will be notified.',
                declined: 'Request declined successfully!'
            };
            alert(messages[newStatus] || 'Status updated successfully!');

        } catch (error) {
            console.error('Error updating request status:', error);
            alert('Failed to update request status. Please try again.');
        }
    };

    // Action buttons for pending requests
    const renderActionButtons = (request) => {
        return (
            <div className="flex gap-2 mt-4">
                <button
                    className="bg-red-100 text-red-700 rounded px-4 py-2 font-medium text-sm hover:bg-red-200 transition-colors"
                    onClick={(e) => handleActionClick(request.id, 'declined', e)}
                >
                    Decline
                </button>
                <button
                    className="bg-green-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-green-700 transition-colors"
                    onClick={(e) => handleActionClick(request.id, 'accepted', e)}
                >
                    Accept
                </button>
            </div>
        );
    };

    // Get status badge
    const getStatusBadge = (status) => {
        return (
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-100 text-yellow-700">
        Pending
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
            <div className="p-8 bg-[#1A202C]">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
                        <p className="mt-4 text-[#A0AEC0]">Loading pending requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-[#1A202C]">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Pending Offers</h1>
                <p className="text-[#A0AEC0]">Requests waiting for your response</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-yellow-500">
                    <div className="text-lg font-bold text-yellow-400">{requests.length}</div>
                    <div className="text-[#A0AEC0] text-sm">Pending Requests</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-[#4299E1]">
                    <div className="text-lg font-bold text-[#4299E1]">
                        {requests.filter(r => r.rate).length}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">Paid Requests</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">
                        {new Set(requests.map(r => r.subject)).size}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">Unique Subjects</div>
                </div>
                <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">
                        {requests.filter(r => new Date() - r.createdAt < 24 * 60 * 60 * 1000).length}
                    </div>
                    <div className="text-[#A0AEC0] text-sm">New Today</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Request Feed */}
                <section className="flex-1 card-dark rounded-lg shadow-sm p-6 min-h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-xl text-white">
                            Pending Requests ({requests.length})
                        </h2>
                        <div className="flex gap-2">
                            <select className="input-dark border border-[#4A5568] rounded-lg px-3 py-1 text-sm">
                                <option>Sort by: Recent</option>
                                <option>Sort by: Payment</option>
                                <option>Sort by: Subject</option>
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
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-[#A0AEC0]">{req.time}</span>
                                        {req.rate && (
                                            <span className="text-xs bg-[#2D3748] text-[#4299E1] px-2 py-0.5 rounded font-medium">
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
                            <div className="text-[#A0AEC0] text-4xl mb-4">⏳</div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                No pending requests
                            </h3>
                            <p className="text-[#A0AEC0]">
                                All requests have been reviewed. Check back later for new requests.
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
                                    <span className="text-[#E0E0E0]">{selected.subject}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">📅 Date:</span>
                                    <span className="text-[#E0E0E0]">{selected.scheduledDate || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏰ Time:</span>
                                    <span className="text-[#E0E0E0]">{selected.scheduledTime || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏱️ Duration:</span>
                                    <span className="text-[#E0E0E0]">{selected.duration}</span>
                                </div>
                                {selected.rate && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[#A0AEC0]">💰 Payment:</span>
                                        <span className="text-green-400 font-semibold">{selected.rate}</span>
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
                                <div className="text-[#E0E0E0] text-sm bg-[#2D3748] rounded p-3 border border-[#4A5568] whitespace-pre-line">
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

export default PendingRequests;