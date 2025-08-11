import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { groupRequestService } from "@/services/groupRequestService";
import { collection, getDocs, limit, query, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";

// Payment Countdown Timer Component
const PaymentCountdownTimer = ({ deadline, requestId, onRequestUpdate, currentUserId }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = async () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ hours, minutes, seconds });
        setIsExpired(false);
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        
        // Auto-transition to 'paid' state when timer expires
        if (onRequestUpdate && requestId) {
          try {
            const result = await groupRequestService.updateGroupRequest(requestId, {
              status: 'paid',
              updatedAt: new Date(),
              paymentExpiredAt: new Date()
            }, currentUserId);
            
            if (result.success) {
              onRequestUpdate(requestId, {
                status: 'paid',
                paymentExpiredAt: new Date()
              });
            }
          } catch (error) {
            console.error('Error updating request status to paid:', error);
          }
        }
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline, requestId, onRequestUpdate, currentUserId]);

  if (isExpired) {
    return (
      <div className="text-xs text-red-600 font-medium">
        ⏰ Payment deadline expired!
      </div>
    );
  }

  return (
    <div className="text-sm font-mono text-red-700">
      {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
    </div>
  );
};

// Enhanced Group Request Card Component
const EnhancedGroupRequestCard = ({ request, currentUserId, onRequestUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [timeUntilSession, setTimeUntilSession] = useState(null);
  const [conferenceLink, setConferenceLink] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherNames, setTeacherNames] = useState({});
  const [paymentDeadline, setPaymentDeadline] = useState('');
  const [permissions, setPermissions] = useState({
    canVote: false,
    canParticipate: false,
    canPay: false,
    isLoading: true
  });

  // Calculate derived states
  const isOwner = request.createdBy === currentUserId || request.userId === currentUserId;
  const hasVoted = request.votes?.includes(currentUserId);
  const isTeaching = request.teachers?.includes(currentUserId);
  const isParticipating = request.participants?.includes(currentUserId);
  const hasPaid = request.paidParticipants?.includes(currentUserId);
  const voteCount = request.voteCount || request.votes?.length || 0;
  const teacherCount = request.teacherCount || request.teachers?.length || 0;
  const participantCount = request.participantCount || request.participants?.length || 0;
  const paidCount = request.paidParticipants?.length || 0;

  // Calculate correct participant count including voters and owner
  const getCorrectParticipantCount = () => {
    const baseParticipants = request.participants || [];
    const voters = request.votes || [];
    const requestCreator = request.userId || request.createdBy;
    
    // Combine all participants, voters, and request creator
    const allParticipants = [...new Set([...baseParticipants, ...voters])];
    if (requestCreator && !allParticipants.includes(requestCreator)) {
      allParticipants.push(requestCreator);
    }
    
    return allParticipants.length;
  };

  const correctParticipantCount = getCorrectParticipantCount();

  // Calculate expected payment count (all participants should pay)
  const expectedPaymentCount = correctParticipantCount;
  
  // Calculate actual payment count (those who have completed payment)
  const actualPaymentCount = paidCount;
  
  // Calculate pending payment count
  const pendingPaymentCount = expectedPaymentCount - actualPaymentCount;

  // ✅ FIXED: Add permission checking with group membership verification
  useEffect(() => {
    const checkPermissions = async () => {
      if (!currentUserId || !request) {
        setPermissions({
          canVote: false,
          canParticipate: false,
          canTeach: false,
          canPay: false,
          isLoading: false
        });
        return;
      }

      try {
        setPermissions(prev => ({ ...prev, isLoading: true }));

        // Check voting permission with async group membership verification
        let canVote = false;
        if (!isOwner && !hasVoted && ['pending', 'voting_open'].includes(request.status)) {
          const voteResult = await groupRequestService.canUserVoteAsync(request, currentUserId);
          canVote = voteResult.canVote;
        }

        // Check participation permission
        let canParticipate = false;
        if (!isParticipating && request.status === 'voting_open') {
          const participateResult = await groupRequestService.canUserParticipateAsync(request, currentUserId);
          canParticipate = participateResult.canParticipate;
        }

        // Check teaching permission - any group member can teach
        let canTeach = false;
        if (!isTeaching && ['voting_open', 'accepted'].includes(request.status)) {
          const teachResult = await groupRequestService.canUserTeachAsync(request, currentUserId);
          canTeach = teachResult.canTeach;
        }

        // Check payment permission
        let canPay = false;
        if (request.status === 'accepted' && isParticipating && !hasPaid) {
          canPay = true; // Already participating, so group membership is confirmed
        }

        setPermissions({
          canVote,
          canParticipate,
          canTeach,
          canPay,
          isLoading: false
        });

      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissions({
          canVote: false,
          canParticipate: false,
          canTeach: false,
          canPay: false,
          isLoading: false
        });
      }
    };

    checkPermissions();
  }, [request, currentUserId, isOwner, hasVoted, isParticipating, isTeaching, hasPaid]);

  // Get user display name from database
  const getUserDisplayName = async (userId) => {
    if (!userId || teacherNames[userId]) return teacherNames[userId];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = userData.displayName || userData.name || 'Unknown User';
        setTeacherNames(prev => ({ ...prev, [userId]: displayName }));
        return displayName;
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
    return 'Unknown User';
  };

  // Load teacher names when component mounts or teachers change
  useEffect(() => {
    if (request.teachers && request.teachers.length > 0) {
      request.teachers.forEach(userId => {
        getUserDisplayName(userId);
      });
    }
  }, [request.teachers]);

  // Handle teacher selection and confirmation
  const handleTeacherSelection = async () => {
    if (!selectedTeacher || !paymentDeadline || !isOwner) return;
    
    try {
      setLoading(true);
      
      // Calculate payment deadline timestamp
      const deadlineHours = parseInt(paymentDeadline);
      const paymentDeadlineTime = new Date(Date.now() + (deadlineHours * 60 * 60 * 1000));
      
      const updateData = {
        selectedTeacher: selectedTeacher,
        status: 'funding',
        paymentDeadline: paymentDeadlineTime,
        paymentDeadlineHours: deadlineHours,
        updatedAt: new Date()
      };
      
      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          selectedTeacher: selectedTeacher,
          status: 'funding',
          paymentDeadline: paymentDeadlineTime,
          paymentDeadlineHours: deadlineHours
        });
        setSelectedTeacher('');
        setPaymentDeadline('');
        alert(`Teacher ${teacherNames[selectedTeacher] || selectedTeacher} has been selected! Payment deadline set to ${deadlineHours} hour(s).`);
      } else {
        alert(result.message || 'Failed to select teacher');
      }
    } catch (error) {
      console.error('Error selecting teacher:', error);
      alert('Failed to select teacher. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      } else {
        console.error('❌ Status update failed:', result.message);
        alert(result.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Handle voting with proper validation
  const handleVote = async () => {
    if (!currentUserId || loading) return;

    // ✅ FIXED: Add owner check
    if (isOwner) {
      alert('You cannot vote on your own request');
      return;
    }

    // ✅ FIXED: Verify permissions before proceeding
    if (!permissions.canVote) {
      if (permissions.isLoading) {
        alert('Please wait while we verify your permissions...');
        return;
      }
      alert('You cannot vote on this request. You may not be a member of this group.');
      return;
    }

    try {
      setLoading(true);

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
        
        // Automatically add all voters and request creator as participants
        const allVoters = newVotes;
        const requestCreator = request.userId || request.createdBy;
        
        // Add all voters as participants (excluding if already there)
        const existingParticipants = request.participants || [];
        const newParticipants = [...new Set([...existingParticipants, ...allVoters])];
        
        // Add request creator if not already a participant
        if (requestCreator && !newParticipants.includes(requestCreator)) {
          newParticipants.push(requestCreator);
        }
        
        updateData.participants = newParticipants;
        updateData.participantCount = newParticipants.length;
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          votes: newVotes,
          voteCount: newVotes.length,
          status: updateData.status || request.status
        });
      } else {
        console.error('❌ Vote failed:', result.message);
        alert(result.message || 'Failed to process vote');
      }
    } catch (error) {
      console.error('Error handling vote:', error);
      alert('Failed to process vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Handle participation (voting) with proper validation
  const handleParticipation = async () => {
    if (!currentUserId || loading) return;

    // ✅ FIXED: Check permissions
    if (!permissions.canParticipate && !isParticipating) {
      if (permissions.isLoading) {
        alert('Please wait while we verify your permissions...');
        return;
      }
      alert('You cannot join this request. You may not be a member of this group.');
      return;
    }

    try {
      setLoading(true);

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

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          participants: newParticipants,
          participantCount: newParticipants.length
        });
      } else {
        console.error('❌ Participation failed:', result.message);
        alert(result.message || 'Failed to update participation');
      }
    } catch (error) {
      console.error('Error handling participation:', error);
      alert('Failed to update participation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Handle teaching participation with proper validation
  const handleTeachingParticipation = async () => {
    if (!currentUserId || loading) return;

    // ✅ FIXED: Check permissions
    if (!permissions.canTeach && !isTeaching) {
      if (permissions.isLoading) {
        alert('Please wait while we verify your permissions...');
        return;
      }
      alert('You cannot become a teacher. You may not be a member of this group.');
      return;
    }

    try {
      setLoading(true);

      let newTeachers;
      let newStatus = request.status;
      
      if (isTeaching) {
        newTeachers = request.teachers?.filter(id => id !== currentUserId) || [];
        
        // If no more teachers, change status back to voting_open
        if (newTeachers.length === 0) {
          newStatus = 'voting_open';
        }
      } else {
        newTeachers = [...(request.teachers || []), currentUserId];
        
        // Change status to accepted when first teacher joins (if coming from voting_open)
        if (request.status === 'voting_open') {
          newStatus = 'accepted';
        }
      }

      const updateData = {
        teachers: newTeachers,
        teacherCount: newTeachers.length,
        status: newStatus
      };

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          teachers: newTeachers,
          teacherCount: newTeachers.length,
          status: newStatus
        });
      } else {
        console.error('❌ Teaching participation failed:', result.message);
        alert(result.message || 'Failed to update teaching participation');
      }
    } catch (error) {
      console.error('Error handling teaching participation:', error);
      alert('Failed to update teaching participation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle payment (mock implementation)
  const handlePayment = async () => {
    if (!currentUserId || loading) return;

    if (!permissions.canPay) {
      alert('You cannot make payment at this time.');
      return;
    }

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
      } else {
        console.error('❌ Payment failed:', result.message);
        alert(result.message || 'Payment failed');
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
          borderColor: 'border-yellow-500',
          bgColor: 'bg-yellow-900',
          statusColor: 'bg-yellow-800 text-yellow-200'
        };
      case 'voting_open':
        return {
          borderColor: 'border-orange-500',
          bgColor: 'bg-orange-900',
          statusColor: 'bg-orange-800 text-orange-200'
        };

      case 'accepted':
        return {
          borderColor: 'border-green-500',
          bgColor: 'bg-green-900',
          statusColor: 'bg-green-800 text-green-200'
        };
      case 'payment_complete':
        return {
          borderColor: 'border-yellow-400',
          bgColor: 'bg-gradient-to-br from-yellow-900 to-yellow-800',
          statusColor: 'bg-yellow-700 text-yellow-100'
        };
      case 'in_progress':
        return {
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-900',
          statusColor: 'bg-blue-800 text-blue-200'
        };
      case 'completed':
        return {
          borderColor: 'border-slate-600',
          bgColor: 'bg-slate-800',
          statusColor: 'bg-slate-700 text-slate-200'
        };
      case 'cancelled':
        return {
          borderColor: 'border-red-500',
          bgColor: 'bg-red-900',
          statusColor: 'bg-red-800 text-red-200'
        };
      default:
        return {
          borderColor: 'border-slate-600',
          bgColor: 'bg-slate-800',
          statusColor: 'bg-slate-700 text-slate-200'
        };
    }
  };

  const styling = getCardStyling();

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
                {isOwner ? '👑 Your Request' : request.createdByName || request.name}
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
            {isOwner && (
                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
              Owner
            </span>
            )}
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

        {/* ✅ FIXED: State-specific content with proper permission checks */}
        {request.status === 'pending' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {isOwner ? 'Awaiting community votes' : 'Community voting'}
                </span>
                <span className="text-xs text-gray-600">{voteCount}/5</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-1.5 mb-2">
                <div
                    className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((voteCount / 5) * 100, 100)}%` }}
                />
              </div>

              {/* ✅ FIXED: Voting button with proper permissions */}
              {permissions.canVote && !permissions.isLoading && (
                  <button
                      onClick={handleVote}
                      disabled={loading}
                      className="w-full bg-yellow-500 text-white py-1.5 px-3 rounded-lg font-medium text-xs hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : '👍 Vote to Approve'}
                  </button>
              )}

              {/* Already voted */}
              {!isOwner && hasVoted && (
                  <div className="w-full bg-yellow-200 text-yellow-800 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                    ✓ You voted to approve
                  </div>
              )}

              {/* Owner view */}
              {isOwner && (
                  <div className="bg-yellow-100 text-yellow-700 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                    ⏳ Waiting for community approval ({voteCount}/5)
                  </div>
              )}

              {/* Cannot vote (not group member) */}
              {!permissions.canVote && !permissions.isLoading && !isOwner && !hasVoted && (
                  <div className="bg-gray-100 text-gray-600 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                    ❌ Cannot vote (not a group member)
                  </div>
              )}

              {/* Loading permissions */}
              {permissions.isLoading && !isOwner && (
                  <div className="bg-gray-100 text-gray-600 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                    🔄 Checking permissions...
                  </div>
              )}
            </div>
        )}

        {request.status === 'voting_open' && (
            <div className="mb-3">
              {/* Participants Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    Join this session
                  </span>
                  <span className="text-xs text-gray-600">{participantCount} joined</span>
                </div>

                                 {/* ✅ FIXED: Participation button with proper permissions - Owner excluded */}
                 {permissions.canParticipate && !permissions.isLoading && !isOwner && (
                     <button
                         onClick={handleParticipation}
                         disabled={loading}
                         className="w-full bg-orange-500 text-white py-1.5 px-3 rounded-lg font-medium text-xs hover:bg-orange-600 transition-colors disabled:opacity-50"
                     >
                       {loading ? 'Joining...' : 'Join Session'}
                     </button>
                 )}

                {/* Already participating */}
                {isParticipating && (
                    <div className="flex gap-1">
                      <div className="flex-1 bg-orange-200 text-orange-800 py-1.5 px-2 rounded-lg text-center text-xs font-medium">
                        ✓ You're participating
                      </div>
                      <button
                          onClick={handleParticipation}
                          disabled={loading}
                          className="bg-gray-200 text-gray-700 py-1.5 px-2 rounded-lg text-xs hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        Leave
                      </button>
                    </div>
                )}

                                 {/* Can't participate or Owner status */}
                 {!permissions.isLoading && (
                   <>
                     {/* Owner message */}
                     {isOwner && (
                       <div className="w-full bg-blue-100 text-blue-700 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                         👑 You are the session owner and automatic participant
                       </div>
                     )}
                     
                     {/* Non-owner can't participate message */}
                     {!isOwner && !permissions.canParticipate && !isParticipating && (
                       <div className="w-full bg-gray-100 text-gray-600 py-1.5 px-3 rounded-lg text-center text-xs font-medium">
                         {participantCount > 0 ? `👥 ${participantCount} participants joined` : '❌ Cannot join (not a group member)'}
                       </div>
                     )}
                   </>
                 )}
              </div>

              {/* Teachers Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    Teachers
                  </span>
                  <span className="text-xs text-gray-600">{teacherCount} joined</span>
                </div>

                {/* Want to Teach Button - Only show if not teaching, has permissions, and is not the owner */}
                {!isTeaching && !isOwner && permissions.canTeach && !permissions.isLoading && (
                    <div className="mt-2">
                      <button
                          onClick={handleTeachingParticipation}
                          disabled={loading}
                          className="w-full bg-green-600 text-white py-1.5 px-3 rounded-lg font-medium text-xs hover:bg-green-700 transition-colors disabled:opacity-50 border-2 border-green-500"
                      >
                          {loading ? 'Processing...' : '🎯 Want to Teach'}
                      </button>
                      <p className="text-xs text-gray-500 text-center mt-1">
                          Join as a teacher/mentor for this session
                      </p>
                    </div>
                )}

                {/* Show current teachers if any */}
                {teacherCount > 0 && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-xs text-green-700 mb-1">
                      {teacherCount} teacher(s) want to teach this session
                    </div>
                    <div className="space-y-1">
                      {request.teachers?.map((teacherId, index) => (
                        <div key={index} className="text-xs text-green-600">
                          Teacher {index + 1} (ID: {teacherId})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
        )}



        {request.status === 'accepted' && (
            <div className="mb-4">
              {/* Teachers Section - Only visible to owner */}
              {isOwner && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600">👨‍🏫</span>
                    <span className="text-sm font-medium text-green-800">Teachers</span>
                  </div>
                  
                  {/* Show current teachers */}
                  {teacherCount > 0 ? (
                    <div className="mb-3">
                      <div className="text-xs text-green-700 mb-2">
                        {teacherCount} teacher(s) joined
                      </div>
                      <div className="space-y-2">
                        {request.teachers?.map((teacherId, index) => (
                          <div key={index} className="flex items-center justify-between bg-green-50 rounded px-2 py-1">
                            <span className="text-xs text-green-800">
                              Teacher {index + 1}: {teacherNames[teacherId] || teacherId}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Teacher Selection Dropdown - Only for owner */}
                      <div className="mt-3">
                        <label htmlFor="teacherSelection" className="block text-sm font-medium text-green-700 mb-1">
                          Select Teacher:
                        </label>
                        <select
                          id="teacherSelection"
                          value={selectedTeacher}
                          onChange={(e) => setSelectedTeacher(e.target.value)}
                          className="w-full border border-green-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select a teacher</option>
                          {request.teachers?.map((teacherId) => (
                            <option key={teacherId} value={teacherId}>
                              {teacherNames[teacherId] || teacherId}
                            </option>
                          ))}
                        </select>
                        
                        {/* Payment Countdown Timer Selection */}
                        <div className="mt-3">
                          <label htmlFor="paymentTimer" className="block text-sm font-medium text-green-700 mb-1">
                            Payment Deadline:
                          </label>
                          <select
                            id="paymentTimer"
                            value={paymentDeadline}
                            onChange={(e) => setPaymentDeadline(e.target.value)}
                            className="w-full border border-green-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select payment deadline</option>
                            <option value="1">1 hour</option>
                            <option value="3">3 hours</option>
                            <option value="6">6 hours</option>
                            <option value="12">12 hours</option>
                            <option value="24">24 hours</option>
                            <option value="48">48 hours</option>
                            <option value="72">3 days</option>
                          </select>
                        </div>
                        
                        <button
                          onClick={handleTeacherSelection}
                          disabled={loading || !selectedTeacher || !paymentDeadline}
                          className="mt-2 w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Processing...' : `Confirm Teacher & Set Deadline`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-green-700 mb-2">
                      No teachers joined yet
                    </div>
                  )}
                </div>
              )}









              {/* Role Selection for non-owners in accepted state - ONLY for users who haven't chosen any role */}
              {!isOwner && currentUserId !== request.userId && currentUserId !== request.createdBy && !isTeaching && !isParticipating && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-center mb-3">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Choose Your Role</h4>
                    <p className="text-xs text-blue-600">You haven't joined this session yet. Choose how you want to participate:</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Join as Participant Button */}
                    <button
                      onClick={handleParticipation}
                      disabled={loading}
                      className="bg-blue-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : '👥 Join as Participant'}
                    </button>
                    
                    {/* Want to Teach Button */}
                    {permissions.canTeach && (
                      <button
                        onClick={handleTeachingParticipation}
                        disabled={loading}
                        className="bg-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : '🎯 Want to Teach'}
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-blue-600 text-center mt-2">
                    Participants can join the session, teachers can mentor and guide
                  </p>
                </div>
              )}

              {/* Only show role selection for users who haven't chosen any role */}
              {/* Individual role buttons are removed - users can only choose one role */}
            </div>
        )}

        {request.status === 'funding' && (
            <div className="mb-4">
              <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-600">💰</span>
                  <span className="text-sm font-medium text-purple-800">Funding Phase</span>
                </div>
                
                {/* Show selected teacher */}
                {request.selectedTeacher && (
                  <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded">
                    <div className="text-xs text-purple-700 mb-1">
                      Selected Teacher: {teacherNames[request.selectedTeacher] || request.selectedTeacher}
                    </div>
                    <div className="text-xs text-purple-600">
                      Status: Awaiting payment from participants
                    </div>
                  </div>
                )}

                {/* Show participants who need to pay */}
                {participantCount > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-purple-700 mb-2">
                      {participantCount} participant(s) need to complete payment
                    </div>
                    <div className="space-y-1">
                      {request.participants?.map((participantId, index) => (
                        <div key={index} className="flex items-center justify-between bg-purple-50 rounded px-2 py-1">
                          <span className="text-xs text-purple-600">
                            Participant {index + 1}: {teacherNames[participantId] || participantId}
                          </span>
                          <span className="text-xs text-purple-500">
                            {request.paidParticipants?.includes(participantId) ? '✓ Paid' : '⏳ Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment progress bar - Always filled with auto-payment */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Payment Progress</span>
                    <span className="text-sm text-blue-600">{actualPaymentCount}/{expectedPaymentCount} paid</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${expectedPaymentCount > 0 ? (actualPaymentCount / expectedPaymentCount) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    Average cost per participant: Rs. {request.rate || 'TBD'}
                  </div>
                </div>

                {/* Payment Countdown Timer */}
                {request.paymentDeadline && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-600">⏰</span>
                      <span className="text-xs font-medium text-red-700">Payment Deadline</span>
                    </div>
                    <PaymentCountdownTimer 
                      deadline={request.paymentDeadline} 
                      requestId={request.id}
                      onRequestUpdate={onRequestUpdate}
                      currentUserId={currentUserId}
                    />
                    <div className="text-xs text-red-600 mt-1">
                      Complete payment before time runs out!
                    </div>
                  </div>
                )}

                {/* Role-based UI for different user types */}
                
                {/* 1. Confirmed Teacher - See role getting message */}
                {request.selectedTeacher === currentUserId && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                    <div className="text-xs text-green-700 text-center">
                      🎯 You are the confirmed teacher for this session!
                    </div>
                  </div>
                )}

                {/* 2. Other Teachers - Become non-role, see participant button */}
                {isTeaching && request.selectedTeacher !== currentUserId && (
                  <div className="mb-3">
                    <div className="text-xs text-purple-600 text-center mb-2">
                      Another teacher was selected for this session
                    </div>
                    <button
                      onClick={handleParticipation}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : '👥 Join as Participant'}
                    </button>
                  </div>
                )}

                {/* 3. Owner - Already automatic participant, show status */}
                {(currentUserId === request.userId || currentUserId === request.createdBy) && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs text-blue-700 text-center">
                      👑 You are the session owner and automatic participant
                    </div>
                  </div>
                )}

                {/* 4. Participants - Show pay button if not paid */}
                {isParticipating && !hasPaid && (
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing Payment...' : `Pay Rs. ${request.rate || 'Now'}`}
                  </button>
                )}

                {/* 5. Participants who have paid - Show confirmation */}
                {isParticipating && hasPaid && (
                  <div className="text-xs bg-purple-100 text-purple-700 py-2 px-4 rounded-lg text-center font-medium">
                    ✓ Payment Complete - Waiting for others
                    </div>
                )}

                {/* 6. Others - Show pay and participant buttons */}
                {!isTeaching && !isParticipating && currentUserId !== request.userId && currentUserId !== request.createdBy && (
                  <div className="space-y-2">
                    <button
                      onClick={handleParticipation}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : '👥 Join as Participant'}
                    </button>
                    <div className="text-xs text-purple-600 text-center">
                      Join as participant to contribute to this session
                    </div>
                  </div>
                )}
              </div>
            </div>
        )}

        {request.status === 'paid' && (
            <div className="mb-4">
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600">✅</span>
                  <span className="text-sm font-medium text-blue-800">Payment Complete</span>
                </div>
                
                {/* Show selected teacher */}
                {request.selectedTeacher && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs text-blue-700 mb-1">
                      Selected Teacher: {teacherNames[request.selectedTeacher] || request.selectedTeacher}
                    </div>
                    <div className="text-xs text-blue-600">
                      Status: All payments completed successfully
                    </div>
                  </div>
                )}

                {/* Show payment summary */}
                <div className="mb-3">
                  <div className="text-xs text-blue-700 mb-2">
                    Payment Summary
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">Total Participants:</span>
                      <span className="text-blue-700">{participantCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">Total Paid:</span>
                      <span className="text-blue-700">{paidCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">Rate per Person:</span>
                      <span className="text-blue-700">Rs. {request.rate || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">Total Collected:</span>
                      <span className="text-blue-700">Rs. {request.totalPaid || 'TBD'}</span>
                    </div>
                  </div>
                </div>

                {/* Show next steps message */}
                <div className="text-xs text-blue-600 text-center">
                  🎉 All payments completed! Session can now proceed to scheduling.
                </div>
              </div>
            </div>
        )}

        {request.status === 'payment_complete' && timeUntilSession && (
            <div className="mb-4">
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-700">🕐</span>
                  <span className="text-sm font-medium text-yellow-800">Session starts in:</span>
                </div>
                <div className="text-lg font-bold text-yellow-800 mb-2">
                  {timeUntilSession.hours}h {timeUntilSession.minutes}m
                </div>
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

// Rest of the AllGroupRequests component remains the same, no changes needed
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

  // Load group requests using the service with real-time updates
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

        const requests = await groupRequestService.getAllGroupRequests({
          userId: user.id,
          isAdmin: isCurrentUserAdmin
        });

        console.log('✅ Group requests loaded:', requests.length);

        if (requests.length === 0) {
          try {
            const userGroups = await groupRequestService.getUserGroups(user.id);
            console.log('👥 User belongs to groups:', userGroups);

            if (userGroups.length === 0) {
              setError('You need to join groups to see group requests. Visit the Groups page to join some groups!');
              setLoading(false);
              return;
            }
          } catch (groupError) {
            console.error('❌ Error checking user groups:', groupError);
          }
        }

        // Process and format the requests with proper payment data
        const formattedRequests = requests.map((request) => {
          return {
            ...request,
            votes: request.votes || [],
            participants: request.participants || [],
            paidParticipants: request.paidParticipants || [],
            teachers: request.teachers || [],
            teacherCount: request.teacherCount || 0,
            selectedTeacher: request.selectedTeacher || null,
            skills: request.skills || [],
            name: request.createdByName || request.userName || 'Unknown User',
            avatar: request.createdByAvatar || request.userAvatar || `https://ui-avatars.com/api/?name=${request.createdByName}&background=3b82f6&color=fff`,
            message: request.description || request.message || '',
            status: request.status || 'pending',
            voteCount: request.voteCount || request.votes?.length || 0,
            participantCount: request.participantCount || request.participants?.length || 0,
            // Ensure payment data is properly initialized
            rate: request.rate || '0',
            totalPaid: request.totalPaid || 0
          };
        });

        setGroupRequests(formattedRequests);

        // Set up real-time listeners for payment updates
        if (formattedRequests.length > 0) {
          const unsubscribePromises = formattedRequests.map(request => {
            if (request.id) {
              return new Promise((resolve) => {
                const unsubscribe = onSnapshot(doc(db, 'grouprequests', request.id), (doc) => {
                  if (doc.exists()) {
                    const updatedData = doc.data();
                    setGroupRequests(prevRequests =>
                      prevRequests.map(prevRequest =>
                        prevRequest.id === request.id 
                          ? { ...prevRequest, ...updatedData }
                          : prevRequest
                      )
                    );
                  }
                });
                resolve(unsubscribe);
              });
            }
            return Promise.resolve(() => {});
          });

          // Store unsubscribe functions for cleanup
          Promise.all(unsubscribePromises).then(unsubscribes => {
            // Clean up previous listeners
            if (window.requestListeners) {
              window.requestListeners.forEach(unsub => unsub());
            }
            window.requestListeners = unsubscribes.filter(unsub => typeof unsub === 'function');
          });

        }

      } catch (error) {
        console.error('❌ Error loading group requests:', error);

        let errorMessage = 'Failed to load group requests';
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your authentication and group memberships.';
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

    // Cleanup function
    return () => {
      if (window.requestListeners) {
        window.requestListeners.forEach(unsub => unsub());
        window.requestListeners = [];
      }
    };
  }, [user, isCurrentUserAdmin]);

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
        <div className="bg-slate-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-300">Loading group requests...</p>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="bg-slate-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        </div>
    );
  }

  return (
      <div className="bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">All Group Requests</h1>
                <p className="mt-2 text-sm text-slate-300">
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

          {/* Status Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            {[
              { key: 'all', label: 'Total', color: 'bg-slate-700 text-slate-200' },
              { key: 'pending', label: 'Pending', color: 'bg-yellow-900 text-yellow-200' },
              { key: 'voting_open', label: 'Voting', color: 'bg-orange-900 text-orange-200' },
              { key: 'accepted', label: 'Accepted', color: 'bg-green-900 text-green-200' },
              { key: 'payment_complete', label: 'Ready', color: 'bg-yellow-800 text-yellow-100' },
              { key: 'in_progress', label: 'Live', color: 'bg-blue-900 text-blue-200' },
              { key: 'completed', label: 'Done', color: 'bg-slate-600 text-slate-100' },
              { key: 'cancelled', label: 'Cancelled', color: 'bg-red-900 text-red-200' }
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
          <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Search</label>
                <input
                    type="text"
                    placeholder="Search requests, skills, or names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-700 text-white placeholder-slate-400"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Category</label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-700 text-white"
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
                <label className="block text-sm font-medium text-slate-200 mb-2">Status</label>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-700 text-white"
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
            <p className="text-sm text-slate-300">
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
                <div className="text-slate-400 text-6xl mb-4">
                  {groupRequests.length === 0 ? '📚' : '🔍'}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {groupRequests.length === 0 ? 'No group requests yet' : 'No requests found'}
                </h3>
                <p className="text-slate-300 mb-4">
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
                          className="text-blue-400 hover:text-blue-300 font-medium"
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