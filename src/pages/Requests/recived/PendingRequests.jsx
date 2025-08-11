import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import databaseService from '@/services/databaseService';

const PendingRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [responseLoading, setResponseLoading] = useState({});
    const [userProfiles, setUserProfiles] = useState({});
    
    // Filter state management
    const [activeFilters, setActiveFilters] = useState({
        status: 'all',
        subject: 'all',
        payment: 'all',
        urgency: 'all'
    });
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    // Load available requests from other users using databaseService
    useEffect(() => {
        if (!user?.id) {
            console.log('👤 No user ID, setting loading to false');
            setLoading(false);
            return;
        }

        console.log('🔄 Starting to fetch requests for user:', user.id);

        // Set a timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            console.log('⏰ Loading timeout reached, setting loading to false');
            setLoading(false);
            setError('Loading timeout reached. Please check your internet connection and try again.');
        }, 10000); // 10 seconds timeout

        try {
            setLoading(true);
            setError(null);
            
            // Use databaseService to fetch available requests
            const unsubscribe = databaseService.getAvailableRequests(user.id, (fetchedRequests, errorInfo) => {
                console.log('📥 Fetched requests:', fetchedRequests?.length || 0);
                
                // Clear timeout since we got a response (even if it's an error)
                clearTimeout(loadingTimeout);
                
                // Check if there was an error
                if (errorInfo) {
                    console.error('❌ Error from databaseService:', errorInfo);
                    
                    if (errorInfo.error === 'missing_index') {
                        setError(
                            'Firebase index required. Please create the composite index for requests collection. Check console for details.'
                        );
                    } else {
                        setError(`Failed to load requests: ${errorInfo.details}`);
                    }
                    setLoading(false);
                    return;
                }
                
                if (fetchedRequests && fetchedRequests.length > 0) {
                    console.log('✅ Processing', fetchedRequests.length, 'requests');
                    
                    // Process requests to add user profile info and response status
                    const processedRequests = fetchedRequests.map(request => ({
                        ...request,
                        userName: request.userName || 'User',
                        userAvatar: request.userAvatar || `https://ui-avatars.com/api/?name=${request.userName || 'User'}&background=3b82f6&color=fff`,
                        hasResponded: false, // Will be updated below
                        responseStatus: null
                    }));
                    
                    setRequests(processedRequests);
                    setLoading(false);
                    
                    // Check response status for each request (non-blocking)
                    processedRequests.forEach(async (request) => {
                        try {
                            const hasResponded = await checkUserResponse(request.id, user.id);
                            setRequests(prev => prev.map(req => 
                                req.id === request.id 
                                    ? { ...req, hasResponded, responseStatus: hasResponded ? 'pending' : null }
                                    : req
                            ));
                        } catch (error) {
                            console.error('Error checking response status for request:', request.id, error);
                        }
                    });
                } else {
                    console.log('ℹ️ No requests found');
                    setRequests([]);
                    setLoading(false);
                }
            });

            // Cleanup function
            return () => {
                console.log('🧹 Cleaning up request listener');
                clearTimeout(loadingTimeout);
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        } catch (error) {
            console.error('❌ Error setting up request listener:', error);
            clearTimeout(loadingTimeout);
            setError('Failed to load requests. Please try again.');
            setLoading(false);
        }
    }, [user]);

    // Helper function to check if user has responded to a request
    const checkUserResponse = async (requestId, userId) => {
        try {
            // Use databaseService to check responses
            return new Promise((resolve) => {
                databaseService.getUserResponses(userId, null, (responses) => {
                    const hasResponded = responses.some(response => response.id === requestId);
                    resolve(hasResponded);
                });
            });
        } catch (error) {
            console.error('Error checking user response:', error);
            return false;
        }
    };

    // Update selected when requests change
    useEffect(() => {
        if (requests.length > 0) {
            setSelected(requests[0]);
        } else {
            setSelected(requests[0] || null);
        }
    }, [requests]);

    // Apply filters to requests
    const applyFilters = () => {
        let filtered = [...requests];

        if (activeFilters.status !== 'all') {
            filtered = filtered.filter(req => req.status === activeFilters.status);
        }

        if (activeFilters.subject !== 'all') {
            filtered = filtered.filter(req => req.subject === activeFilters.subject);
        }

        if (activeFilters.payment !== 'all') {
            if (activeFilters.payment === 'high') {
                filtered = filtered.filter(req => parseFloat(req.paymentAmount || 0) >= 1000);
            } else if (activeFilters.payment === 'low') {
                filtered = filtered.filter(req => parseFloat(req.paymentAmount || 0) < 1000 && parseFloat(req.paymentAmount || 0) > 0);
            } else if (activeFilters.payment === 'free') {
                filtered = filtered.filter(req => !req.paymentAmount || parseFloat(req.paymentAmount || 0) === 0);
            }
        }

        if (activeFilters.urgency !== 'all') {
            if (activeFilters.urgency === 'urgent') {
                filtered = filtered.filter(req => {
                    if (!req.preferredDate) return false;
                    const requestDate = new Date(req.preferredDate);
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return requestDate <= tomorrow;
                });
            } else if (activeFilters.urgency === 'thisWeek') {
                filtered = filtered.filter(req => {
                    if (!req.preferredDate) return false;
                    const requestDate = new Date(req.preferredDate);
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    return requestDate <= nextWeek;
                });
            }
        }

        setFilteredRequests(filtered);
    };

    // Update filters when activeFilters change
    useEffect(() => {
        applyFilters();
    }, [activeFilters, requests]);

    // Handle filter changes
    const handleFilterChange = (filterType, value) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    // Clear all filters
    const clearFilters = () => {
        setActiveFilters({
            status: 'all',
            subject: 'all',
            payment: 'all',
            urgency: 'all'
        });
    };

    // Get unique subjects for filter dropdown
    const getUniqueSubjects = () => {
        return [...new Set(requests.map(req => req.subject))];
    };

    // Handle request selection
    const handleRequestClick = (request, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        console.log('🎯 Pending request selected:', request.id);
        setSelected(request);
    };

    // Handle response actions (accept/decline)
    const handleResponse = async (requestId, status, message = '') => {
        if (!user?.id) {
            alert('Please log in to respond to requests.');
            return;
        }

        setResponseLoading(prev => ({ ...prev, [requestId]: status }));

        try {
            const responseData = {
                status,
                message,
                responderName: user.displayName || user.name || 'Unknown',
                responderEmail: user.email || ''
            };

            const result = await databaseService.respondToRequest(requestId, responseData, user.id);

            if (result.success) {
                alert(result.message);

                // If accepted and meeting created, show meeting info
                if (status === 'accepted' && result.meetingUrl) {
                    const openMeeting = window.confirm(
                        'Meeting scheduled successfully! Would you like to open the meeting room now?'
                    );
                    if (openMeeting) {
                        window.open(result.meetingUrl, '_blank');
                    }
                }

                // Request will be automatically removed from pending list by the hook
                // since its status changed from 'open' to 'active'
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error responding to request:', error);
            alert('Failed to respond to request. Please try again.');
        } finally {
            setResponseLoading(prev => ({ ...prev, [requestId]: null }));
        }
    };

    // Action buttons for pending requests
    const renderActionButtons = (request) => {
        return (
            <div className="flex gap-2 mt-4">
                <button
                    onClick={() => handleResponse(request.id, 'declined', 'Not interested at this time')}
                    disabled={responseLoading[request.id] === 'declined'}
                    className="bg-red-900 text-red-300 rounded px-4 py-2 font-medium text-sm hover:bg-red-800 transition-colors disabled:opacity-50 border border-red-700"
                >
                    {responseLoading[request.id] === 'declined' ? 'Declining...' : 'Not Interested'}
                </button>
                <button
                    onClick={() => handleResponse(request.id, 'accepted', 'I would like to help with this request')}
                    disabled={responseLoading[request.id] === 'accepted'}
                    className="bg-green-600 text-white rounded px-4 py-2 font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {responseLoading[request.id] === 'accepted' ? 'Accepting...' : 'Accept Request'}
                </button>
            </div>
        );
    };

    // Get status badge
    const getStatusBadge = (status) => {
        return (
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-900 text-yellow-300 border border-yellow-700">
                Available
            </span>
        );
    };

    // Format time ago
    const formatTimeAgo = (date) => {
        if (!date) return 'Unknown';
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return `${Math.floor(diffDays / 7)}w ago`;
    };

    // Get stats from requests
    const getStats = () => {
        return {
            total: requests.length,
            paid: requests.filter(r => r.paymentAmount && parseFloat(r.paymentAmount) > 0).length,
            subjects: new Set(requests.map(r => r.subject)).size,
            recent: requests.filter(r => new Date() - r.createdAt < 24 * 60 * 60 * 1000).length
        };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="p-8 bg-[#1A202C] min-h-screen">
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
                        <p className="mt-4 text-[#A0AEC0]">Loading available requests...</p>
                        <p className="mt-2 text-[#718096] text-sm">
                            This may take a moment. If loading continues, check the console for index requirements.
                        </p>
                        <div className="mt-4 text-[#4A5568] text-xs">
                            <div>⏰ Loading timeout: 10 seconds</div>
                            <div>🔍 Check browser console for any errors</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-[#1A202C] min-h-screen">
                <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Requests</h3>
                    <p className="text-red-400 mb-4">{error}</p>
                    
                    {error.includes('Firebase index required') && (
                        <div className="bg-red-800 border border-red-600 rounded-lg p-4 mb-4 text-left">
                            <h4 className="font-semibold text-red-200 mb-2">🔧 Firebase Index Required</h4>
                            <p className="text-red-300 text-sm mb-3">
                                This error occurs because the database needs a composite index to efficiently query requests.
                            </p>
                            <div className="text-red-400 text-xs space-y-1">
                                <div>• Check the browser console for the index creation URL</div>
                                <div>• Click the URL to go to Firebase Console</div>
                                <div>• Create the composite index for the requests collection</div>
                                <div>• Wait for the index to build (may take a few minutes)</div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                        >
                            Reload Page
                        </button>
                        {error.includes('Firebase index required') && (
                            <button
                                onClick={() => {
                                    setError(null);
                                    setLoading(true);
                                    // This will trigger the useEffect to retry
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-[#1A202C] min-h-screen">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Pending Requests</h1>
                <p className="text-[#A0AEC0]">Review and respond to requests from other students</p>
            </div>

            {/* Filter Controls */}
            <div className="card-dark rounded-lg shadow-sm p-4 mb-6 border border-[#4A5568]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Filters</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="text-[#4299E1] hover:text-[#00BFFF] transition-colors text-sm"
                        >
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>
                        <button
                            onClick={clearFilters}
                            className="text-[#A0AEC0] hover:text-white transition-colors text-sm"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
                
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Status</label>
                            <select
                                value={activeFilters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                            >
                                <option value="all">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>

                        {/* Subject Filter */}
                        <div>
                            <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Subject</label>
                            <select
                                value={activeFilters.subject}
                                onChange={(e) => handleFilterChange('subject', e.target.value)}
                                className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                            >
                                <option value="all">All Subjects</option>
                                {getUniqueSubjects().map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Filter */}
                        <div>
                            <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Payment</label>
                            <select
                                value={activeFilters.payment}
                                onChange={(e) => handleFilterChange('payment', e.target.value)}
                                className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                            >
                                <option value="all">All Payments</option>
                                <option value="high">High (₹1000+)</option>
                                <option value="low">Low (&lt;₹1000)</option>
                                <option value="free">Free</option>
                            </select>
                        </div>

                        {/* Urgency Filter */}
                        <div>
                            <label className="block text-sm font-medium text-[#A0AEC0] mb-2">Urgency</label>
                            <select
                                value={activeFilters.urgency}
                                onChange={(e) => handleFilterChange('urgency', e.target.value)}
                                className="input-dark border border-[#4A5568] rounded-lg px-3 py-2 text-sm w-full"
                            >
                                <option value="all">All Urgencies</option>
                                <option value="urgent">Urgent (Tomorrow)</option>
                                <option value="thisWeek">This Week</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Request List */}
                <section className="flex-1 card-dark rounded-lg shadow-sm p-6 min-h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-xl text-white">
                            Available Requests ({filteredRequests.length})
                        </h2>
                        <div className="flex gap-2">
                            <select className="bg-[#1A202C] border border-[#4A5568] rounded-lg px-3 py-1 text-sm text-[#A0AEC0]">
                                <option>Sort by: Recent</option>
                                <option>Sort by: Payment</option>
                                <option>Sort by: Subject</option>
                                <option>Sort by: Duration</option>
                            </select>
                        </div>
                    </div>

                    {filteredRequests.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {filteredRequests.map((req) => (
                                <div
                                    key={req.id}
                                    className={`flex items-start gap-3 p-3 rounded cursor-pointer border transition-colors ${
                                        selected?.id === req.id
                                            ? 'border-[#4299E1] bg-[#1A202C]'
                                            : 'border-transparent hover:bg-[#1A202C]'
                                    }`}
                                    onClick={(e) => handleRequestClick(req, e)}
                                >
                                    <img
                                        src={req.userAvatar || `https://ui-avatars.com/api/?name=${req.userName}&background=3b82f6&color=fff`}
                                        alt={req.userName}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold text-white">{req.userName}</div>
                                        <div className="text-[#A0AEC0] text-sm">{req.title || req.topic}</div>
                                        <div className="text-[#A0AEC0] text-xs truncate max-w-xs">
                                            {req.description?.substring(0, 80)}...
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-[#A0AEC0]">📚 {req.subject}</span>
                                            <span className="text-xs text-[#A0AEC0]">⏰ {req.duration} min</span>
                                            {req.preferredDate && (
                                                <span className="text-xs text-[#A0AEC0]">
                                                    📅 {new Date(req.preferredDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-[#A0AEC0]">{formatTimeAgo(req.createdAt)}</span>
                                        {req.paymentAmount && parseFloat(req.paymentAmount) > 0 && (
                                            <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded font-medium border border-green-700">
                                                Rs.{req.paymentAmount}
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
                                No requests available
                            </h3>
                            <p className="text-[#A0AEC0]">
                                Check back later for new learning requests from other students.
                            </p>
                        </div>
                    )}
                </section>

                {/* Request Details */}
                {selected && (
                    <aside className="w-[400px] bg-[#2D3748] rounded-lg shadow-sm p-6 border border-[#4A5568] flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <img
                                src={selected.userAvatar || `https://ui-avatars.com/api/?name=${selected.userName}&background=3b82f6&color=fff`}
                                alt={selected.userName}
                                className="w-14 h-14 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-lg text-white">{selected.userName}</div>
                                <div className="text-[#A0AEC0] text-sm">Student</div>
                                <div className="text-xs text-[#A0AEC0]">
                                    Request created {formatTimeAgo(selected.createdAt)}
                                </div>
                            </div>
                        </div>

                        {/* Request Details */}
                        <div className="border-t border-[#4A5568] pt-4">
                            <div className="font-semibold text-white mb-2">{selected.title || selected.topic}</div>

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">📚 Subject:</span>
                                    <span className="text-white">{selected.subject}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">📅 Date:</span>
                                    <span className="text-white">
                                        {selected.preferredDate ? new Date(selected.preferredDate).toLocaleDateString() : 'Not specified'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏰ Time:</span>
                                    <span className="text-white">{selected.preferredTime || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-[#A0AEC0]">⏱️ Duration:</span>
                                    <span className="text-white">{selected.duration} minutes</span>
                                </div>
                                {selected.paymentAmount && parseFloat(selected.paymentAmount) > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[#A0AEC0]">💰 Payment:</span>
                                        <span className="text-green-400 font-semibold">Rs.{selected.paymentAmount}</span>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {selected.tags && selected.tags.length > 0 && (
                                <div className="mb-4">
                                    <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Tags:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selected.tags.map((tag, index) => (
                                            <span key={index} className="bg-[#1A202C] text-[#A0AEC0] px-2 py-1 rounded text-xs border border-[#4A5568]">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="mb-4">
                                <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Description:</span>
                                <div className="text-white text-sm bg-[#1A202C] rounded p-3 border border-[#4A5568] whitespace-pre-line">
                                    {selected.description}
                                </div>
                            </div>

                            {/* Flow Status Info */}
                            <div className="bg-yellow-900 rounded-lg p-3 mb-4 border border-yellow-700">
                                <div className="text-sm">
                                    <div className="font-medium text-yellow-200 mb-1">📋 What happens next?</div>
                                    <div className="text-yellow-300 text-xs space-y-1">
                                        <div>• Accept: Request becomes active with meeting link</div>
                                        <div>• Meeting room will be created automatically</div>
                                        <div>• Both you and requester get meeting access</div>
                                        <div>• Complete session when finished</div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {renderActionButtons(selected)}

                            {/* Contact Options */}
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <button
                                    className="bg-[#1A202C] text-[#4299E1] rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                                    onClick={() => alert('Messaging feature coming soon!')}
                                >
                                    💬 Ask Question
                                </button>
                                <button
                                    className="bg-[#1A202C] text-purple-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                                    onClick={() => alert('Profile view feature coming soon!')}
                                >
                                    👤 View Profile
                                </button>
                            </div>

                            {/* Report Option */}
                            <div
                                className="text-[#A0AEC0] text-xs mt-4 cursor-pointer hover:text-red-400 transition-colors text-center border-t border-[#4A5568] pt-4"
                                onClick={() => alert('Report feature coming soon!')}
                            >
                                🚩 Report Request
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Quick Filters */}
            {filteredRequests.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Urgent Requests */}
                    <div className="bg-red-900 rounded-lg p-4 border border-red-700">
                        <h3 className="font-semibold text-red-300 mb-3">⚡ Urgent (Today/Tomorrow)</h3>
                        <div className="space-y-2">
                            {filteredRequests
                                .filter(req => {
                                    if (!req.preferredDate) return false;
                                    const requestDate = new Date(req.preferredDate);
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    return requestDate <= tomorrow;
                                })
                                .slice(0, 3)
                                .map(req => (
                                    <div
                                        key={req.id}
                                        className="text-sm cursor-pointer hover:bg-red-800 p-2 rounded"
                                        onClick={() => setSelected(req)}
                                    >
                                        <div className="font-medium text-red-200">{req.title || req.topic}</div>
                                        <div className="text-red-400 text-xs">
                                            {req.subject} • {new Date(req.preferredDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* High Paying */}
                    <div className="bg-green-900 rounded-lg p-4 border border-green-700">
                        <h3 className="font-semibold text-green-300 mb-3">💰 High Paying (Rs.1000+)</h3>
                        <div className="space-y-2">
                            {filteredRequests
                                .filter(req => parseFloat(req.paymentAmount || 0) >= 1000)
                                .slice(0, 3)
                                .map(req => (
                                    <div
                                        key={req.id}
                                        className="text-sm cursor-pointer hover:bg-green-800 p-2 rounded"
                                        onClick={() => setSelected(req)}
                                    >
                                        <div className="font-medium text-green-200">{req.title || req.topic}</div>
                                        <div className="text-green-400 text-xs">
                                            {req.subject} • Rs.{req.paymentAmount}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Popular Subjects */}
                    <div className="bg-[#2D3748] rounded-lg p-4 border border-[#4A5568]">
                        <h3 className="font-semibold text-[#4299E1] mb-3">📚 Popular Subjects</h3>
                        <div className="space-y-2">
                            {Object.entries(
                                filteredRequests.reduce((acc, req) => {
                                    acc[req.subject] = (acc[req.subject] || 0) + 1;
                                    return acc;
                                }, {})
                            )
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 5)
                                .map(([subject, count]) => (
                                    <div key={subject} className="text-sm">
                                        <span className="font-medium text-[#4299E1]">{subject}</span>
                                        <span className="text-[#A0AEC0] text-xs ml-2">({count} requests)</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* No Results Message */}
            {filteredRequests.length === 0 && requests.length > 0 && (
                <div className="mt-8 text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-white mb-2">No requests match your filters</h3>
                    <p className="text-[#A0AEC0] mb-4">Try adjusting your filters or clear them to see all available requests.</p>
                    <button
                        onClick={clearFilters}
                        className="text-[#4299E1] hover:text-[#00BFFF] transition-colors text-sm underline"
                    >
                        Clear all filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default PendingRequests;