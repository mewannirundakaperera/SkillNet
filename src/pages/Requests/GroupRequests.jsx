import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { groupRequestService } from "@/services/groupRequestService";
import RequestCard from "../Group/components/RequestCard";

// Rest of the GroupRequests component
const GroupRequests = () => {
  const { user } = useAuth();
  const [groupRequests, setGroupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all group requests from user's groups (not just their own requests)
  useEffect(() => {
    const loadGroupRequests = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Loading all group requests from user\'s groups...');

        // Get all group requests from groups where user is a member
        const requests = await groupRequestService.getAllGroupRequests({
          userId: user.id,
          isAdmin: false // Regular user, not admin-specific view
        });

        console.log('✅ Group requests from user\'s groups loaded:', requests.length);

        // Process and format the requests
        const formattedRequests = requests.map((request) => {
          return {
            ...request,
            // Ensure required fields exist
            votes: request.votes || [],
            participants: request.participants || [],
            paidParticipants: request.paidParticipants || [],
            skills: request.skills || [],
            // ✅ FIXED: Use correct field names that RequestCard expects
            createdByName: request.createdByName || request.userName || 'Unknown User',
            createdByAvatar: request.createdByAvatar || request.userAvatar || `https://ui-avatars.com/api/?name=${request.createdByName}&background=3b82f6&color=fff`,
            description: request.description || request.message || '',
            // Ensure status exists
            status: request.status || 'pending',
            voteCount: request.voteCount || request.votes?.length || 0,
            participantCount: request.participantCount || request.participants?.length || 0
          };
        });

        setGroupRequests(formattedRequests);

        // Debug: Log all unique status values found
        const uniqueStatuses = [...new Set(formattedRequests.map(req => req.status))];
        console.log('🔍 Unique status values found in group requests:', uniqueStatuses);
        console.log('📊 Status breakdown:', uniqueStatuses.reduce((acc, status) => {
          acc[status] = formattedRequests.filter(req => req.status === status).length;
          return acc;
        }, {}));

      } catch (error) {
        console.error('❌ Error loading user group requests:', error);

        let errorMessage = 'Failed to load your group requests';
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Database temporarily unavailable. Please try again later.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadGroupRequests();
  }, [user]);

  // Handle request updates
  const handleRequestUpdate = (requestId, updatedRequest) => {
    setGroupRequests(prevRequests =>
        prevRequests.map(request =>
            request.id === requestId ? { ...request, ...updatedRequest } : request
        )
    );
  };

  if (loading) {
    return (
        <div className="p-8 bg-slate-900">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-300">Loading your group requests...</p>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-8 bg-slate-900">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-white mb-2">Error Loading Requests</h2>
              <p className="text-slate-300 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Try Again
                </button>
                <Link
                    to="/groups"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Browse Groups
                </Link>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden">
      {/* Educational Background Pattern */}
      <div className="absolute inset-0">
        {/* Geometric Shapes - Increased opacity and size for better visibility */}
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-[#3B82F6]/40 to-[#1D4ED8]/40 rounded-full blur-2xl"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-gradient-to-br from-[#8B5CF6]/40 to-[#7C3AED]/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-48 h-48 bg-gradient-to-br from-[#10B981]/40 to-[#059669]/40 rounded-full blur-2xl"></div>
        
        {/* Additional geometric elements for more visual interest */}
        <div className="absolute top-1/3 left-1/6 w-32 h-32 bg-gradient-to-br from-[#F59E0B]/30 to-[#D97706]/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/6 w-40 h-40 bg-gradient-to-br from-[#EC4899]/30 to-[#DB2777]/30 rounded-full blur-xl"></div>
        
        {/* Educational Icons Pattern - Increased opacity for better visibility */}
        <div className="absolute top-1/4 left-1/3 opacity-15">
          <svg className="w-32 h-32 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09v6.82L12 23 1 15.82V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9z"/>
          </svg>
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-15">
          <svg className="w-28 h-28 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
          </svg>
        </div>
        <div className="absolute bottom-1/3 left-1/6 opacity-15">
          <svg className="w-20 h-20 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        
        {/* Additional educational icons for more visual richness */}
        <div className="absolute top-1/2 right-1/3 opacity-10">
          <svg className="w-24 h-24 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
        <div className="absolute bottom-1/3 right-1/4 opacity-10">
          <svg className="w-16 h-16 text-[#EC4899]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1.08-1.36-1.9-1.36h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Group Requests</h1>
            <p className="text-[#E0E0E0]">Manage and respond to group learning requests</p>
          </div>

          {/* Statistics Bar */}
          <div className="mb-6">
            {/* Total Count */}
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-white">{groupRequests.length}</div>
              <div className="text-[#A0AEC0] text-sm">Total Group Requests</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { key: 'pending', label: 'Pending', color: 'bg-yellow-600', textColor: 'text-yellow-100' },
                { key: 'voting_open', label: 'Voting', color: 'bg-blue-600', textColor: 'text-blue-100' },
                { key: 'accepted', label: 'Accepted', color: 'bg-green-600', textColor: 'text-green-100' },
                { key: 'funding', label: 'Funding', color: 'bg-purple-600', textColor: 'text-purple-100' },
                { key: 'payment_complete', label: 'Paid', color: 'bg-indigo-600', textColor: 'text-indigo-100' },
                { key: 'in_progress', label: 'Live', color: 'bg-orange-600', textColor: 'text-orange-100' },
                { key: 'completed', label: 'Complete', color: 'bg-emerald-600', textColor: 'text-emerald-100' },
                { key: 'cancelled', label: 'Cancel', color: 'bg-red-600', textColor: 'text-red-100' }
              ].map((status) => {
                // Handle potential status variations
                const statusVariations = {
                  'payment_complete': ['payment_complete', 'paid', 'payment_completed'],
                  'completed': ['completed', 'complete', 'finished'],
                  'in_progress': ['in_progress', 'live', 'active', 'ongoing'],
                  'voting_open': ['voting_open', 'voting', 'vote'],
                  'accepted': ['accepted', 'approved', 'confirmed'],
                  'funding': ['funding', 'fund', 'collecting'],
                  'pending': ['pending', 'waiting', 'open'],
                  'cancelled': ['cancelled', 'canceled', 'cancelled']
                };
                
                const variations = statusVariations[status.key] || [status.key];
                const count = groupRequests.filter(req => 
                  variations.includes(req.status)
                ).length;
                
                return (
                  <div key={status.key} className={`${status.color} ${status.textColor} rounded-lg p-3 text-center`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs opacity-90">{status.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Real Data Statistics */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-dark p-4 text-center">
              <div className="text-2xl font-bold text-[#4299E1]">
                {groupRequests.filter(req => req.voteCount > 0).length}
              </div>
              <div className="text-[#A0AEC0] text-sm">Requests with Votes</div>
            </div>
            
            <div className="card-dark p-4 text-center">
              <div className="text-2xl font-bold text-[#48BB78]">
                {groupRequests.reduce((total, req) => total + (req.participantCount || 0), 0)}
              </div>
              <div className="text-[#A0AEC0] text-sm">Participated Meetings</div>
            </div>
            
            <div className="card-dark p-4 text-center">
              <div className="text-2xl font-bold text-[#8B5CF6]">
                {new Set(groupRequests.map(req => req.category).filter(Boolean)).size}
              </div>
              <div className="text-[#A0AEC0] text-sm">Unique Categories</div>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Request List */}
            <div className="lg:col-span-2">
              <div className="card-dark p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Available Requests</h2>
                <div className="space-y-4">
                  {groupRequests.map((request, index) => (
                    <div key={index} className="border border-[#4A5568] rounded-lg p-4 hover:border-[#4299E1] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white">{request.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                          request.status === 'voting_open' ? 'bg-blue-900 text-blue-300' :
                          request.status === 'accepted' ? 'bg-green-900 text-green-300' :
                          request.status === 'funding' ? 'bg-purple-900 text-purple-300' :
                          request.status === 'payment_complete' ? 'bg-indigo-900 text-indigo-300' :
                          request.status === 'in_progress' ? 'bg-orange-900 text-orange-300' :
                          request.status === 'completed' ? 'bg-emerald-900 text-emerald-300' :
                          request.status === 'cancelled' ? 'bg-red-900 text-red-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {(() => {
                            // Use the same status mapping for consistency
                            const statusMap = {
                              'pending': 'Pending',
                              'voting_open': 'Voting Open',
                              'accepted': 'Accepted',
                              'funding': 'Funding',
                              'payment_complete': 'Payment Complete',
                              'in_progress': 'In Progress',
                              'completed': 'Completed',
                              'cancelled': 'Cancelled'
                            };
                            return statusMap[request.status] || request.status.replace('_', ' ').charAt(0).toUpperCase() + request.status.replace('_', ' ').slice(1);
                          })()}
                        </span>
                      </div>
                      <p className="text-[#A0AEC0] text-sm mb-3">{request.description}</p>
                      <div className="flex items-center justify-between text-xs text-[#718096]">
                        <span>Posted by {request.createdByName || request.userName || 'Unknown User'}</span>
                        <span>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              <div className="card-dark p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full btn-gradient-primary py-2 px-4 rounded-lg font-medium transition-all duration-200 hover:scale-105">
                    Create New Request
                  </button>
                  <button className="w-full bg-[#2D3748] hover:bg-[#4A5568] text-white py-2 px-4 rounded-lg font-medium transition-colors">
                    View My Requests
                  </button>
                  <button className="w-full bg-[#2D3748] hover:bg-[#4A5568] text-white py-2 px-4 rounded-lg font-medium transition-colors">
                    Request History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupRequests;