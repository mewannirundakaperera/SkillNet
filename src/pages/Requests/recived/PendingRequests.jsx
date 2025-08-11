import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePendingOffers } from '@/hooks/useRequests';
import integratedRequestService from '@/services/integratedRequestService';

const PendingRequests = () => {
    const { user } = useAuth();
    const { requests, loading, error } = usePendingOffers();
    const [selected, setSelected] = useState(null);
    const [responseLoading, setResponseLoading] = useState({});

    // Update selected when requests change
    useEffect(() => {
        if (requests.length > 0 && !selected) {
            setSelected(requests[0]);
        } else if (selected && !requests.find(r => r.id === selected.id)) {
            setSelected(requests[0] || null);
        }
    }, [requests, selected]);

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

            const result = await integratedRequestService.respondToRequest(requestId, responseData, user.id);

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

                // If not interested, the request will be hidden and removed from the list
                // If accepted, the request will be automatically removed from pending list by the hook
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
                    onClick={() => handleResponse(request.id, 'not_interested', 'Not interested at this time')}
                    disabled={responseLoading[request.id] === 'not_interested'}
                    className="bg-red-900 text-red-300 rounded px-4 py-2 font-medium text-sm hover:bg-red-800 transition-colors disabled:opacity-50 border border-red-700"
                >
                    {responseLoading[request.id] === 'not_interested' ? 'Hiding...' : 'Not Interested'}
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
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-[#1A202C] min-h-screen">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Available Learning Requests</h1>
                <p className="text-[#A0AEC0]">Browse and respond to learning requests from other students</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-yellow-500">
                    <div className="text-lg font-bold text-yellow-400">{stats.total}</div>
                    <div className="text-[#A0AEC0] text-sm">Available Requests</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-[#4299E1]">
                    <div className="text-lg font-bold text-[#4299E1]">{stats.paid}</div>
                    <div className="text-[#A0AEC0] text-sm">Paid Requests</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <div className="text-lg font-bold text-green-400">{stats.subjects}</div>
                    <div className="text-[#A0AEC0] text-sm">Unique Subjects</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div className="text-lg font-bold text-purple-400">{stats.recent}</div>
                    <div className="text-[#A0AEC0] text-sm">New Today</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Request Feed */}
                <section className="flex-1 bg-[#2D3748] rounded-lg shadow-sm p-6 min-h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-xl text-white">
                            Available Requests ({requests.length})
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

                    {requests.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {requests.map((req) => (
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
            {requests.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Urgent Requests */}
                    <div className="bg-red-900 rounded-lg p-4 border border-red-700">
                        <h3 className="font-semibold text-red-300 mb-3">⚡ Urgent (Today/Tomorrow)</h3>
                        <div className="space-y-2">
                            {requests
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
                            {requests
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
                                requests.reduce((acc, req) => {
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
        </div>
    );
};

export default PendingRequests;