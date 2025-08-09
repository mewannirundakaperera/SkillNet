import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { groupRequestService } from "@/services/groupRequestService";
import { collection, getDocs, limit, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

// Enhanced Group Request Card Component
const EnhancedGroupRequestCard = ({ request, currentUserId, onRequestUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [timeUntilSession, setTimeUntilSession] = useState(null);
  const [conferenceLink, setConferenceLink] = useState(null);

  // Calculate time until session starts
  useEffect(() => {
    if (request.scheduledDateTime && (request.status === 'payment_complete' || request.status === 'in_progress')) {
      const interval = setInterval(() => {
        const now = new Date();
        const sessionTime = new Date(request.scheduledDateTime);
        const diffMs = sessionTime - now;

        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeUntilSession({ hours, minutes, total: diffMs });

          // Create conference link 10 minutes before
          if (diffMs <= 10 * 60 * 1000 && !conferenceLink) {
            generateConferenceLink();
          }
        } else {
          setTimeUntilSession(null);
          if (request.status === 'payment_complete') {
            updateRequestStatus('in_progress');
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [request.scheduledDateTime, request.status, conferenceLink]);

  // Generate conference link
  const generateConferenceLink = async () => {
    try {
      const mockLink = `https://meet.skillnet.com/session/${request.id}`;
      setConferenceLink(mockLink);

      await groupRequestService.updateGroupRequest(request.id, {
        conferenceLink: mockLink
      }, currentUserId);
    } catch (error) {
      console.error('Error generating conference link:', error);
    }
  };

  // Update request status using service
  const updateRequestStatus = async (newStatus, reason = null) => {
    try {
      setLoading(true);
      const updateData = { status: newStatus };
      if (reason) {
        updateData.cancellationReason = reason;
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, { ...request, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle voting using service
  const handleVote = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const hasVoted = request.votes?.includes(currentUserId);

      // Note: You'd need to add vote handling to the service
      // For now, we'll use a simple approach
      let newVotes;
      if (hasVoted) {
        newVotes = request.votes?.filter(id => id !== currentUserId) || [];
      } else {
        newVotes = [...(request.votes || []), currentUserId];
      }

      const updateData = {
        votes: newVotes,
        voteCount: newVotes.length
      };

      // Auto-transition to voting_open if enough votes
      if (newVotes.length >= 5 && request.status === 'pending') {
        updateData.status = 'voting_open';
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          votes: newVotes,
          voteCount: newVotes.length,
          status: updateData.status || request.status
        });
      }
    } catch (error) {
      console.error('Error handling vote:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle participation using service
  const handleParticipation = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const isParticipating = request.participants?.includes(currentUserId);

      let newParticipants;
      if (isParticipating) {
        newParticipants = request.participants?.filter(id => id !== currentUserId) || [];
      } else {
        newParticipants = [...(request.participants || []), currentUserId];
      }

      const updateData = {
        participants: newParticipants,
        participantCount: newParticipants.length
      };

      // Auto-approve if enough participants
      if (newParticipants.length >= (request.minParticipants || 3) && request.status === 'voting_open') {
        updateData.status = 'accepted';
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          participants: newParticipants,
          participantCount: newParticipants.length,
          status: updateData.status || request.status
        });
      }
    } catch (error) {
      console.error('Error handling participation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment (mock implementation)
  const handlePayment = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const paymentAmount = parseFloat(request.rate?.replace(/[^0-9.-]+/g,"") || "25");

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newPaidParticipants = [...(request.paidParticipants || []), currentUserId];
      const updateData = {
        paidParticipants: newPaidParticipants,
        totalPaid: (request.totalPaid || 0) + paymentAmount
      };

      // Check if payment is complete
      if (newPaidParticipants.length >= (request.participantCount || 1)) {
        updateData.status = 'payment_complete';
        // Schedule session for 1 hour from now (for demo)
        updateData.scheduledDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          paidParticipants: newPaidParticipants,
          totalPaid: updateData.totalPaid,
          status: updateData.status || request.status,
          scheduledDateTime: updateData.scheduledDateTime || request.scheduledDateTime
        });
        alert('Payment successful!');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get card styling based on status
  const getCardStyling = () => {
    switch (request.status) {
      case 'pending':
        return {
          borderColor: 'border-yellow-300',
          bgColor: 'bg-yellow-50',
          statusColor: 'bg-yellow-100 text-yellow-800'
        };
      case 'voting_open':
        return {
          borderColor: 'border-orange-300',
          bgColor: 'bg-orange-50',
          statusColor: 'bg-orange-100 text-orange-800'
        };
      case 'accepted':
        return {
          borderColor: 'border-green-300',
          bgColor: 'bg-green-50',
          statusColor: 'bg-green-100 text-green-800'
        };
      case 'payment_complete':
        return {
          borderColor: 'border-yellow-400',
          bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
          statusColor: 'bg-yellow-200 text-yellow-900'
        };
      case 'in_progress':
        return {
          borderColor: 'border-blue-400',
          bgColor: 'bg-blue-50',
          statusColor: 'bg-blue-100 text-blue-800'
        };
      case 'completed':
        return {
          borderColor: 'border-gray-600',
          bgColor: 'bg-gray-900 text-white',
          statusColor: 'bg-gray-700 text-gray-200'
        };
      case 'cancelled':
        return {
          borderColor: 'border-red-400',
          bgColor: 'bg-red-50',
          statusColor: 'bg-red-100 text-red-800'
        };
      default:
        return {
          borderColor: 'border-gray-200',
          bgColor: 'bg-white',
          statusColor: 'bg-gray-100 text-gray-700'
        };
    }
  };

  const styling = getCardStyling();
  const voteCount = request.voteCount || request.votes?.length || 0;
  const participantCount = request.participantCount || request.participants?.length || 0;
  const paidCount = request.paidParticipants?.length || 0;
  const hasVoted = request.votes?.includes(currentUserId);
  const isParticipating = request.participants?.includes(currentUserId);
  const hasPaid = request.paidParticipants?.includes(currentUserId);

  return (
      <div className={`rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-all h-full flex flex-col ${styling.borderColor} ${styling.bgColor}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2">
            <img
                src={request.createdByAvatar || request.avatar}
                alt={request.createdByName || request.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold text-base line-clamp-1 ${request.status === 'completed' ? 'text-white' : 'text-gray-900'}`}>
                {request.title}
              </h3>
              <p className={`text-xs ${request.status === 'completed' ? 'text-gray-300' : 'text-gray-600'}`}>
                {request.createdByName || request.name}
              </p>
              <p className={`text-xs ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
                in {request.groupName}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {request.rate && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
              {request.rate}
            </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${styling.statusColor}`}>
            {groupRequestService.getStatusDisplay(request.status).label}
          </span>
          </div>
        </div>

        {/* Description */}
        <p className={`text-sm mb-3 line-clamp-2 ${request.status === 'completed' ? 'text-gray-300' : 'text-gray-700'}`}>
          {request.description}
        </p>

        {/* Skills */}
        {request.skills && request.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {request.skills.slice(0, 3).map((skill, index) => (
                  <span
                      key={index}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                          request.status === 'completed'
                              ? 'bg-gray-800 text-gray-300 border-gray-600'
                              : 'bg-white text-gray-700 border-gray-200'
                      }`}
                  >
              {skill}
            </span>
              ))}
              {request.skills.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{request.skills.length - 3} more
                  </span>
              )}
            </div>
        )}

        {/* State-specific content */}
        {request.status === 'pending' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Needs votes</span>
                <span className="text-xs text-gray-600">{voteCount}/5</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-1.5 mb-2">
                <div
                    className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((voteCount / 5) * 100, 100)}%` }}
                />
              </div>
              {currentUserId && (
                  <button
                      onClick={handleVote}
                      disabled={loading}
                      className={`w-full py-1.5 px-3 rounded-lg font-medium text-xs transition-colors ${
                          hasVoted
                              ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                              : 'bg-yellow-500 text-white hover:bg-yellow-600'
                      } disabled:opacity-50`}
                  >
                    {loading ? 'Processing...' : hasVoted ? '✓ Voted' : 'Vote to Approve'}
                  </button>
              )}
            </div>
        )}

        {request.status === 'voting_open' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Participants</span>
                <span className="text-xs text-gray-600">{participantCount} joined</span>
              </div>
              <div className="flex gap-1">
                {currentUserId && (
                    <button
                        onClick={handleVote}
                        disabled={loading}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition-colors ${
                            hasVoted
                                ? 'bg-orange-200 text-orange-800 hover:bg-orange-300'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        } disabled:opacity-50`}
                    >
                      {hasVoted ? `❤️ ${voteCount}` : `👍 ${voteCount}`}
                    </button>
                )}
                {currentUserId && (
                    <button
                        onClick={handleParticipation}
                        disabled={loading}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition-colors ${
                            isParticipating
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                        } disabled:opacity-50`}
                    >
                      {loading ? '...' : isParticipating ? 'Leave' : 'Join'}
                    </button>
                )}
              </div>
            </div>
        )}

        {request.status === 'accepted' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Payment Progress</span>
                <span className="text-sm text-gray-600">{paidCount}/{participantCount} paid</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2 mb-3">
                <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${participantCount > 0 ? (paidCount / participantCount) * 100 : 0}%` }}
                />
              </div>
              {currentUserId && isParticipating && !hasPaid && (
                  <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing Payment...' : `Pay ${request.rate || 'Now'}`}
                  </button>
              )}
              {hasPaid && (
                  <div className="w-full bg-green-100 text-green-700 py-2 px-4 rounded-lg text-center text-sm font-medium">
                    ✓ Payment Complete - Waiting for others
                  </div>
              )}
            </div>
        )}

        {request.status === 'payment_complete' && (
            <div className="mb-4">
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-700">🕐</span>
                  <span className="text-sm font-medium text-yellow-800">Session starts in:</span>
                </div>
                {timeUntilSession && (
                    <div className="text-lg font-bold text-yellow-800 mb-2">
                      {timeUntilSession.hours}h {timeUntilSession.minutes}m
                    </div>
                )}
                <div className="text-xs text-yellow-700 mb-2">
                  Scheduled: {new Date(request.scheduledDateTime).toLocaleString()}
                </div>
                {(conferenceLink || request.conferenceLink) && (
                    <a
                        href={conferenceLink || request.conferenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-yellow-500 text-white text-center py-2 px-4 rounded-lg font-medium text-sm hover:bg-yellow-600 transition-colors"
                    >
                      Join Conference
                    </a>
                )}
              </div>
            </div>
        )}

        {request.status === 'in_progress' && (
            <div className="mb-4">
              <div className="bg-blue-100 border border-blue-400 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-800">Session in Progress</span>
                </div>
                <div className="text-xs text-blue-700 mb-2">
                  Started: {new Date(request.sessionStartedAt || Date.now()).toLocaleString()}
                </div>
                {(conferenceLink || request.conferenceLink) && isParticipating && (
                    <a
                        href={conferenceLink || request.conferenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-blue-500 text-white text-center py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors"
                    >
                      Rejoin Conference
                    </a>
                )}
              </div>
            </div>
        )}

        {request.status === 'completed' && (
            <div className="mb-4">
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-300">✅</span>
                  <span className="text-sm font-medium text-gray-200">Session Completed</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Completed: {new Date(request.completedAt || Date.now()).toLocaleString()}
                </div>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-gray-500 transition-colors">
                  Leave Feedback
                </button>
              </div>
            </div>
        )}

        {request.status === 'cancelled' && (
            <div className="mb-4">
              <div className="bg-red-100 border border-red-400 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-700">❌</span>
                  <span className="text-sm font-medium text-red-800">Session Cancelled</span>
                </div>
                <div className="text-xs text-red-700 mb-1">
                  Reason: {request.cancellationReason || 'Not enough participants'}
                </div>
                {request.refundStatus && (
                    <div className="text-xs text-red-600">
                      Refund: {request.refundStatus}
                    </div>
                )}
              </div>
            </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          <div className={`text-xs ${request.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(request.createdAt?.toDate?.() || request.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Link
                to={`/requests/details/${request.id}`}
                className={`text-xs font-medium hover:underline ${
                    request.status === 'completed'
                        ? 'text-gray-300 hover:text-white'
                        : 'text-blue-600 hover:text-blue-800'
                }`}
            >
              Details
            </Link>
          </div>
        </div>
      </div>
  );
};

const AllGroupRequests = () => {
  const { user } = useAuth();
  const [groupRequests, setGroupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        console.log('🔍 Checking admin status for user:', user.id);
        const adminRef = doc(db, 'admin', user.id);
        const adminSnap = await getDoc(adminRef);
        const isAdmin = adminSnap.exists();
        setIsCurrentUserAdmin(isAdmin);
        console.log('✅ Admin status:', isAdmin);
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
        setIsCurrentUserAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Load group requests using the service
  useEffect(() => {
    const loadGroupRequests = async () => {
      if (!user?.id) {
        console.log('⏭️ No user ID, skipping group requests load');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Loading group requests using service...');
        console.log('👤 User ID:', user.id);
        console.log('📧 User Email:', user.email);
        console.log('🔐 Is Admin:', isCurrentUserAdmin);

        // Test if the service exists
        if (!groupRequestService || typeof groupRequestService.getAllGroupRequests !== 'function') {
          throw new Error('groupRequestService.getAllGroupRequests is not available');
        }

        // ✅ FIX: Pass required parameters to the service method
        console.log('📞 Calling groupRequestService.getAllGroupRequests...');
        const requests = await groupRequestService.getAllGroupRequests({
          userId: user.id,
          isAdmin: isCurrentUserAdmin
        });

        console.log('✅ Group requests loaded:', requests.length);
        console.log('📊 Raw requests data:', requests);

        if (requests.length === 0) {
          console.log('⚠️ No requests found. This could mean:');
          console.log('   1. User is not a member of any groups');
          console.log('   2. No requests exist in the groups user belongs to');
          console.log('   3. User has not created any requests');
          console.log('   4. Firestore security rules are blocking access');

          // Let's test if user belongs to any groups
          try {
            const userGroups = await groupRequestService.getUserGroups(user.id);
            console.log('👥 User belongs to groups:', userGroups);

            if (userGroups.length === 0) {
              console.log('⚠️ User is not a member of any groups - this explains why no requests are visible');
              setError('You need to join groups to see group requests. Visit the Groups page to join some groups!');
              setLoading(false);
              return;
            }
          } catch (groupError) {
            console.error('❌ Error checking user groups:', groupError);
          }
        }

        // Process and format the requests
        const formattedRequests = requests.map((request, index) => {
          console.log(`📝 Processing request ${index + 1}:`, {
            id: request.id,
            title: request.title,
            status: request.status,
            createdBy: request.createdBy || request.userId,
            targetGroupId: request.targetGroupId || request.groupId
          });

          return {
            ...request,
            // Ensure required fields exist
            votes: request.votes || [],
            participants: request.participants || [],
            paidParticipants: request.paidParticipants || [],
            skills: request.skills || [],
            // Compatibility fields
            name: request.createdByName || request.userName || 'Unknown User',
            avatar: request.createdByAvatar || request.userAvatar || `https://ui-avatars.com/api/?name=${request.createdByName}&background=3b82f6&color=fff`,
            message: request.description || request.message || '',
            // Ensure status exists
            status: request.status || 'pending',
            voteCount: request.voteCount || request.votes?.length || 0,
            participantCount: request.participantCount || request.participants?.length || 0
          };
        });

        console.log('✅ Formatted requests:', formattedRequests.length);
        console.log('📊 Formatted requests data:', formattedRequests);

        setGroupRequests(formattedRequests);

      } catch (error) {
        console.error('❌ Error loading group requests:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });

        // Provide more specific error messages
        let errorMessage = 'Failed to load group requests';

        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your authentication and group memberships.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Database temporarily unavailable. Please try again later.';
        } else if (error.message.includes('not available')) {
          errorMessage = 'Service not properly initialized. Please refresh the page.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadGroupRequests();
  }, [user, isCurrentUserAdmin]); // ✅ Include both dependencies

  // Test group request service function
  const testGroupRequestService = async () => {
    console.log('🧪 Testing groupRequestService...');

    try {
      // Test 1: Check if service exists
      console.log('✅ groupRequestService exists:', !!groupRequestService);
      console.log('✅ getAllGroupRequests method exists:', typeof groupRequestService.getAllGroupRequests);

      // Test 2: Check user groups
      if (groupRequestService.getUserGroups) {
        const userGroups = await groupRequestService.getUserGroups(user?.id);
        console.log('👥 User groups:', userGroups);
      }

      // Test 3: Try the main call
      const requests = await groupRequestService.getAllGroupRequests({
        userId: user?.id,
        isAdmin: isCurrentUserAdmin
      });
      console.log('📊 Test requests result:', requests);

      alert('✅ Service test completed! Check console for results.');

    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('❌ Service test failed: ' + error.message);
    }
  };

  // Test database structure function
  const testDatabaseStructure = async () => {
    console.log('🧪 Testing database structure...');

    try {
      console.log('📋 Testing collections:');

      // Test grouprequests collection
      try {
        const groupRequestsRef = collection(db, 'grouprequests');
        const snapshot = await getDocs(query(groupRequestsRef, limit(3)));
        console.log('✅ grouprequests collection exists, found', snapshot.size, 'documents');

        if (snapshot.size > 0) {
          console.log('📊 Sample grouprequest documents:');
          snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Document ${index + 1}:`, {
              id: doc.id,
              title: data.title,
              status: data.status,
              userId: data.userId,
              createdBy: data.createdBy,
              targetGroupId: data.targetGroupId,
              groupId: data.groupId,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });
        } else {
          console.log('⚠️ No documents found in grouprequests collection');
        }
      } catch (groupRequestsError) {
        console.error('❌ Error accessing grouprequests collection:', groupRequestsError);
      }

      // Test groups collection
      try {
        const groupsRef = collection(db, 'groups');
        const groupsSnapshot = await getDocs(query(groupsRef, limit(3)));
        console.log('✅ groups collection exists, found', groupsSnapshot.size, 'documents');

        if (groupsSnapshot.size > 0) {
          console.log('📊 Sample group documents:');
          groupsSnapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Group ${index + 1}:`, {
              id: doc.id,
              name: data.name,
              members: data.members?.length || 0,
              hiddenMembers: data.hiddenMembers?.length || 0,
              isPublic: data.isPublic,
              createdBy: data.createdBy
            });
          });

          // Check if current user is a member of any groups
          const userGroups = [];
          groupsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.members?.includes(user?.id) || data.hiddenMembers?.includes(user?.id)) {
              userGroups.push({ id: doc.id, name: data.name });
            }
          });

          if (userGroups.length > 0) {
            console.log('✅ User is member of groups:', userGroups);
          } else {
            console.log('⚠️ User is not a member of any groups - this explains why no requests are visible!');
            console.log('💡 Solution: User needs to join groups first');
          }
        }
      } catch (groupsError) {
        console.error('❌ Error accessing groups collection:', groupsError);
      }

      // Test admin status
      try {
        const adminRef = doc(db, 'admin', user?.id);
        const adminSnap = await getDoc(adminRef);
        console.log('👑 User admin status:', adminSnap.exists());
      } catch (adminError) {
        console.error('❌ Error checking admin status:', adminError);
      }

      alert('✅ Database test completed! Check console for detailed results.');

    } catch (error) {
      console.error('❌ Database test failed:', error);
      alert('❌ Database test failed: ' + error.message);
    }
  };

  // Handle request updates
  const handleRequestUpdate = (requestId, updatedRequest) => {
    setGroupRequests(prevRequests =>
        prevRequests.map(request =>
            request.id === requestId ? { ...request, ...updatedRequest } : request
        )
    );
  };

  // Get unique categories and statuses
  const categories = ['all', ...new Set(groupRequests.map(req => req.category?.toLowerCase()).filter(Boolean))];
  const statuses = [
    'all',
    'pending',
    'voting_open',
    'accepted',
    'payment_complete',
    'in_progress',
    'completed',
    'cancelled'
  ];

  // Filter requests
  const filteredRequests = groupRequests.filter(request => {
    const matchesCategory = selectedCategory === 'all' || request.category?.toLowerCase() === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesSearch = searchQuery === '' ||
        request.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.createdByName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Get status statistics
  const getStatusStats = () => {
    const stats = {};
    statuses.forEach(status => {
      if (status === 'all') {
        stats[status] = groupRequests.length;
      } else {
        stats[status] = groupRequests.filter(req => req.status === status).length;
      }
    });
    return stats;
  };

  const statusStats = getStatusStats();

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading group requests...</p>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Requests</h2>
                <p className="text-gray-600 mb-4">{error}</p>
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
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">All Group Requests</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Browse and participate in group learning sessions
                </p>
              </div>
              {isCurrentUserAdmin && (
                  <Link
                      to="/group/create-group-request"
                      className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Group Request
                  </Link>
              )}
            </div>
          </div>

          {/* Debug Buttons (Development Only) */}
          {import.meta.env.DEV && (
              <div className="mb-6 flex gap-2">
                <button
                    onClick={testGroupRequestService}
                    className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
                >
                  🧪 Test Service
                </button>
                <button
                    onClick={testDatabaseStructure}
                    className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700"
                >
                  🗄️ Test Database
                </button>
              </div>
          )}

          {/* Status Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            {[
              { key: 'all', label: 'Total', color: 'bg-gray-100 text-gray-700' },
              { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
              { key: 'voting_open', label: 'Voting', color: 'bg-orange-100 text-orange-700' },
              { key: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
              { key: 'payment_complete', label: 'Ready', color: 'bg-yellow-200 text-yellow-800' },
              { key: 'in_progress', label: 'Live', color: 'bg-blue-100 text-blue-700' },
              { key: 'completed', label: 'Done', color: 'bg-gray-200 text-gray-800' },
              { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' }
            ].map(({ key, label, color }) => (
                <button
                    key={key}
                    onClick={() => setSelectedStatus(key)}
                    className={`p-3 rounded-lg text-center transition-colors ${
                        selectedStatus === key ? `${color} ring-2 ring-blue-500` : `${color} hover:opacity-75`
                    }`}
                >
                  <div className="text-lg font-bold">{statusStats[key] || 0}</div>
                  <div className="text-xs">{label}</div>
                </button>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                    type="text"
                    placeholder="Search requests, skills, or names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statuses.map(status => (
                      <option key={status} value={status}>
                        {groupRequestService.getStatusDisplay(status).label}
                      </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredRequests.length} of {groupRequests.length} requests
            </p>
          </div>

          {/* Requests Grid - 3 cards per row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((request) => (
                <EnhancedGroupRequestCard
                    key={request.id}
                    request={request}
                    currentUserId={user?.id}
                    onRequestUpdate={handleRequestUpdate}
                />
            ))}
          </div>

          {/* Empty State */}
          {filteredRequests.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">
                  {groupRequests.length === 0 ? '📚' : '🔍'}
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {groupRequests.length === 0 ? 'No group requests yet' : 'No requests found'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {groupRequests.length === 0
                      ? "No group learning requests available. Create the first one!"
                      : "Try adjusting your filters or search query to find more requests."
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  {groupRequests.length > 0 && (
                      <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('all');
                            setSelectedStatus('all');
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear all filters
                      </button>
                  )}
                  {groupRequests.length === 0 && (
                      <Link
                          to="/groups"
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Join Groups First
                      </Link>
                  )}
                  {isCurrentUserAdmin && (
                      <Link
                          to="/group/create-group-request"
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        {groupRequests.length === 0 ? 'Create First Request' : 'Create New Request'}
                      </Link>
                  )}
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default AllGroupRequests;