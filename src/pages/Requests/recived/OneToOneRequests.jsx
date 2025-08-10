import React, { useState } from 'react';
import { useOneToOneRequests } from '@/hooks/useRequests';
import { requestService } from '@/services/requestService';
import { useAuth } from '@/hooks/useAuth';

const OneToOneRequests = () => {
  const { user } = useAuth();
  const {
    requests,
    loading,
    error
  } = useOneToOneRequests();

  const [selected, setSelected] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [responseLoading, setResponseLoading] = useState({});

  // Set first request as selected when requests load
  React.useEffect(() => {
    if (requests.length > 0 && !selected) {
      setSelected(requests[0]);
    }
  }, [requests, selected]);

  // Handle request selection
  const handleRequestClick = (request, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    console.log('🎯 Request selected:', request.id);
    setSelected(request);
  };

  // Handle response actions
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

      const result = await requestService.respondToRequest(requestId, responseData, user.id);

      if (result.success) {
        alert(result.message);
        // Update the request in the list to show it's been responded to
        const updatedRequests = requests.map(req =>
            req.id === requestId
                ? { ...req, hasResponded: true, responseStatus: status }
                : req
        );
        // Note: This would need to be implemented in the hook to update state
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

  // Utility functions
  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const dateObj = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const getStatusBadge = (status) => {
    const badgeClasses = {
      open: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700'
    };

    const labels = {
      open: 'Open',
      active: 'Active',
      pending: 'Pending'
    };

    return (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${badgeClasses[status] || badgeClasses.open}`}>
                {labels[status] || status}
            </span>
    );
  };

  // Filter and categorize requests
  const categorizeRequests = () => {
    const categories = {
      urgent: requests.filter(req => {
        const requestDate = new Date(req.preferredDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return requestDate <= tomorrow;
      }),
      thisWeek: requests.filter(req => {
        const requestDate = new Date(req.preferredDate);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return requestDate <= nextWeek && requestDate > new Date();
      }),
      highPaying: requests.filter(req =>
          parseFloat(req.paymentAmount || 0) >= 1000
      ),
      subjects: {}
    };

    // Group by subjects
    requests.forEach(req => {
      if (!categories.subjects[req.subject]) {
        categories.subjects[req.subject] = [];
      }
      categories.subjects[req.subject].push(req);
    });

    return categories;
  };

  const categories = categorizeRequests();

  if (loading) {
    return (
        <div className="p-8 bg-[#1A202C]">
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
        <div className="p-8 bg-[#1A202C]">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Requests</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="btn-gradient-primary px-4 py-2 rounded-lg font-semibold"
            >
              Reload Page
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="p-8 bg-[#1A202C]">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">One-to-One Learning Requests</h1>
          <p className="text-[#A0AEC0]">Browse and respond to individual learning requests from other students</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-[#4299E1]">
            <div className="text-lg font-bold text-[#4299E1]">{requests.length}</div>
            <div className="text-[#A0AEC0] text-sm">Available Requests</div>
          </div>
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-red-500">
            <div className="text-lg font-bold text-red-400">{categories.urgent.length}</div>
            <div className="text-[#A0AEC0] text-sm">Urgent (Tomorrow)</div>
          </div>
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-green-500">
            <div className="text-lg font-bold text-green-400">{categories.highPaying.length}</div>
            <div className="text-[#A0AEC0] text-sm">High Paying (₹1000+)</div>
          </div>
          <div className="card-dark rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
            <div className="text-lg font-bold text-purple-400">{Object.keys(categories.subjects).length}</div>
            <div className="text-[#A0AEC0] text-sm">Different Subjects</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Request Feed */}
          <section className="flex-1 card-dark rounded-lg shadow-sm p-6 min-h-[600px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-white">
                Available Requests ({requests.length})
              </h2>
              <div className="flex gap-2">
                <select className="input-dark border border-[#4A5568] rounded-lg px-3 py-1 text-sm">
                  <option>Sort by: Recent</option>
                  <option>Sort by: Payment</option>
                  <option>Sort by: Subject</option>
                  <option>Sort by: Urgency</option>
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
                        <img
                            src={req.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.userName || 'User')}&background=3b82f6&color=fff`}
                            alt={req.userName || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white">{req.userName || 'Anonymous User'}</div>
                          <div className="text-[#A0AEC0] text-sm">{req.title}</div>
                          <div className="text-[#A0AEC0] text-xs truncate max-w-xs">{req.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#A0AEC0]">📚 {req.subject}</span>
                            <span className="text-xs text-[#A0AEC0]">⏰ {req.duration || '60'} min</span>
                            {req.preferredDate && (
                                <span className="text-xs text-[#A0AEC0]">📅 {new Date(req.preferredDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-[#A0AEC0]">{formatTimeAgo(req.createdAt)}</span>
                          {req.paymentAmount && (
                              <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded font-medium">
                                                Rs.{req.paymentAmount}
                                            </span>
                          )}
                          {getStatusBadge(req.status)}
                          {req.hasResponded && (
                              <span className="text-xs bg-[#2D3748] text-[#4299E1] px-2 py-0.5 rounded">
                                                Responded
                                            </span>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
                <div className="text-center py-12">
                  <div className="text-[#A0AEC0] text-4xl mb-4">📝</div>
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
              <aside className="w-[400px] card-dark rounded-lg shadow-sm p-6 border border-[#4A5568] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <img
                      src={selected.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.userName || 'User')}&background=3b82f6&color=fff`}
                      alt={selected.userName || 'User'}
                      className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white">{selected.userName || 'Anonymous User'}</div>
                    <div className="text-[#A0AEC0] text-sm">Student</div>
                    <div className="text-xs text-[#A0AEC0]">
                      Request created {formatTimeAgo(selected.createdAt)}
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
                      <span className="text-[#E0E0E0]">
                                        {selected.preferredDate ? new Date(selected.preferredDate).toLocaleDateString() : 'Not specified'}
                                    </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#A0AEC0]">⏰ Time:</span>
                      <span className="text-[#E0E0E0]">{selected.preferredTime || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#A0AEC0]">⏱️ Duration:</span>
                      <span className="text-[#E0E0E0]">{selected.duration || '60'} minutes</span>
                    </div>
                    {selected.paymentAmount && (
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
                              <span key={index} className="bg-[#2D3748] text-[#A0AEC0] px-2 py-1 rounded text-xs border border-[#4A5568]">
                                                {tag}
                                            </span>
                          ))}
                        </div>
                      </div>
                  )}

                  {/* Description */}
                  <div className="mb-4">
                    <span className="font-medium text-[#A0AEC0] text-sm block mb-2">Description:</span>
                    <div className="text-[#E0E0E0] text-sm bg-[#2D3748] rounded p-3 border border-[#4A5568] whitespace-pre-line">
                      {selected.description}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!selected.hasResponded ? (
                      <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => handleResponse(selected.id, 'declined', 'Not interested at this time')}
                            disabled={responseLoading[selected.id] === 'declined'}
                            className="bg-red-900 text-red-300 rounded px-4 py-2 font-medium text-sm hover:bg-red-800 transition-colors disabled:opacity-50"
                        >
                          {responseLoading[selected.id] === 'declined' ? 'Declining...' : 'Not Interested'}
                        </button>
                        <button
                            onClick={() => handleResponse(selected.id, 'accepted', 'I would like to help with this request')}
                            disabled={responseLoading[selected.id] === 'accepted'}
                            className="btn-gradient-primary rounded px-4 py-2 font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          {responseLoading[selected.id] === 'accepted' ? 'Accepting...' : 'Accept Request'}
                        </button>
                      </div>
                  ) : (
                      <div className="bg-[#2D3748] text-[#4299E1] rounded px-4 py-2 text-sm text-center mt-4 flex items-center justify-center gap-2 border border-[#4A5568]">
                        <span>✅</span>
                        <span>You have responded to this request</span>
                      </div>
                  )}

                  {/* Contact Options */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                        className="bg-[#2D3748] text-[#4299E1] rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
                        onClick={() => alert('Messaging feature coming soon!')}
                    >
                      💬 Message
                    </button>
                    <button
                        className="bg-[#2D3748] text-purple-400 rounded px-3 py-2 text-sm hover:bg-[#4A5568] transition-colors border border-[#4A5568]"
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

        {/* Quick Categories */}
        {requests.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Urgent Requests */}
              {categories.urgent.length > 0 && (
                  <div className="bg-red-900 rounded-lg p-4 border border-red-700">
                    <h3 className="font-semibold text-red-300 mb-3">⚡ Urgent Requests</h3>
                    <div className="space-y-2">
                      {categories.urgent.slice(0, 3).map(req => (
                          <div
                              key={req.id}
                              className="text-sm cursor-pointer hover:bg-red-800 p-2 rounded"
                              onClick={() => setSelected(req)}
                          >
                            <div className="font-medium text-red-200">{req.title}</div>
                            <div className="text-red-400 text-xs">{req.subject} • {new Date(req.preferredDate).toLocaleDateString()}</div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* High Paying */}
              {categories.highPaying.length > 0 && (
                  <div className="bg-green-900 rounded-lg p-4 border border-green-700">
                    <h3 className="font-semibold text-green-300 mb-3">💰 High Paying</h3>
                    <div className="space-y-2">
                      {categories.highPaying.slice(0, 3).map(req => (
                          <div
                              key={req.id}
                              className="text-sm cursor-pointer hover:bg-green-800 p-2 rounded"
                              onClick={() => setSelected(req)}
                          >
                            <div className="font-medium text-green-200">{req.title}</div>
                            <div className="text-green-400 text-xs">{req.subject} • Rs.{req.paymentAmount}</div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* Popular Subjects */}
              <div className="bg-[#2D3748] rounded-lg p-4 border border-[#4A5568]">
                <h3 className="font-semibold text-[#4299E1] mb-3">📚 Popular Subjects</h3>
                <div className="space-y-2">
                  {Object.entries(categories.subjects)
                      .sort(([,a], [,b]) => b.length - a.length)
                      .slice(0, 5)
                      .map(([subject, reqs]) => (
                          <div key={subject} className="text-sm">
                            <span className="font-medium text-[#4299E1]">{subject}</span>
                            <span className="text-[#A0AEC0] text-xs ml-2">({reqs.length} requests)</span>
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

export default OneToOneRequests;