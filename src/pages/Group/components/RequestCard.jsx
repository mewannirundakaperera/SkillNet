import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { groupRequestService } from '@/services/groupRequestService';

// Helper function to calculate cost per person
const calculateCostPerPerson = (request) => {
  // Safety check - if no request, return 0
  if (!request) {
    console.warn('⚠️ calculateCostPerPerson: No request provided');
    return '0';
  }
  
  // Handle different rate formats safely
  let totalCost = 0;
  if (request?.rate) {
    if (typeof request.rate === 'string') {
      totalCost = parseFloat(request.rate.replace(/[^0-9.-]+/g,"") || "0");
    } else if (typeof request.rate === 'number') {
      totalCost = request.rate;
    } else {
      totalCost = parseFloat(request.rate) || 0;
    }
  }
  
  // Get owner/creator
  const owner = request?.userId || request?.createdBy;
  
  // Get voters (excluding owner to avoid double counting)
  const voters = request?.votes || [];
  const votersExcludingOwner = voters.filter(voterId => voterId !== owner);
  
  // Get manual participants (excluding owner and voters to avoid double counting)
  const manualParticipants = request?.participants || [];
  const manualParticipantsExcludingOwner = manualParticipants.filter(participantId => 
    participantId !== owner && !voters.includes(participantId)
  );
  
  // Calculate total unique participants: owner + voters + manual participants
  const totalParticipants = 1 + votersExcludingOwner.length + manualParticipantsExcludingOwner.length;
  
  console.log('💰 Cost per person calculation:', {
    totalCost,
    owner,
    votersCount: voters.length,
    votersExcludingOwnerCount: votersExcludingOwner.length,
    manualParticipantsCount: manualParticipants.length,
    manualParticipantsExcludingOwnerCount: manualParticipantsExcludingOwner.length,
    totalParticipants,
    costPerPerson: totalParticipants > 0 ? (totalCost / totalParticipants).toFixed(2) : '0'
  });
  
  return totalParticipants > 0 ? (totalCost / totalParticipants).toFixed(2) : '0';
};

// Payment Countdown Timer Component
const PaymentCountdownTimer = ({ deadline, requestId, onRequestUpdate, currentUserId }) => {
  console.log('⏰ PaymentCountdownTimer render:', {
    deadline,
    deadlineType: typeof deadline,
    requestId,
    hasOnRequestUpdate: !!onRequestUpdate,
    currentUserId
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = async () => {
      // ✅ ADDED: Safety check for deadline
      if (!deadline) {
        console.warn('⚠️ PaymentCountdownTimer: No deadline provided');
        setIsExpired(true);
        return;
      }

      console.log('🔄 PaymentCountdownTimer calculateTimeLeft:', {
        deadline,
        deadlineType: typeof deadline,
        now: new Date().toISOString()
      });

      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      console.log('⏱️ Time calculation:', {
        now: new Date(now).toISOString(),
        deadlineTime: new Date(deadlineTime).toISOString(),
        difference,
        differenceInMinutes: Math.floor(difference / (1000 * 60))
      });

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          console.log('⏰ Timer active:', { hours, minutes, seconds });
        setTimeLeft({ hours, minutes, seconds });
        setIsExpired(false);
      } else {
          console.log('⏰ Timer expired, transitioning to paid state');
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);

        // Auto-transition to 'paid' state when funding timer expires
        if (onRequestUpdate && requestId) {
          try {
              console.log('🔄 Auto-transitioning request to paid state...');
            const result = await groupRequestService.updateGroupRequest(requestId, {
              status: 'paid',
              updatedAt: new Date(),
              fundingExpiredAt: new Date()
            }, currentUserId);

            if (result.success) {
                console.log('✅ Auto-transition successful');
              onRequestUpdate(requestId, {
                status: 'paid',
                fundingExpiredAt: new Date()
              });
              } else {
                console.error('❌ Auto-transition failed:', result.message);
            }
          } catch (error) {
              console.error('❌ Error updating request status to paid:', error);
          }
          } else {
            console.warn('⚠️ Cannot auto-transition: missing onRequestUpdate or requestId');
        }
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline, requestId, onRequestUpdate, currentUserId]);

  if (isExpired) {
    return (
        <div className="text-xs text-green-600 font-medium">
          ✅ Payment deadline reached - Session is now ready!
        </div>
    );
  }

  return (
      <div className="text-2xl font-mono font-bold text-red-700 bg-red-50 px-4 py-2 rounded-lg border-2 border-red-300">
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </div>
  );
};

const RequestCard = ({ request, currentUserId, onRequestUpdate, currentUserDisplayName }) => {
  // ✅ DEBUG: Add comprehensive logging
  console.log('🔍 RequestCard Render:', {
    requestId: request?.id,
    requestStatus: request?.status,
    currentUserId,
    hasOnRequestUpdate: !!onRequestUpdate
  });

  // ✅ FIXED: Add local state for request to ensure proper re-rendering
  const [localRequest, setLocalRequest] = useState(request);
  
  // Update local request when prop changes
  useEffect(() => {
    console.log('🔄 RequestCard useEffect - request prop changed:', {
      oldRequestId: localRequest?.id,
      newRequestId: request?.id,
      oldStatus: localRequest?.status,
      newStatus: request?.status
    });
    setLocalRequest(request);
  }, [request]);

  // Safety check for request object
  if (!localRequest) {
    return (
      <div className="rounded-lg shadow-sm border-2 p-6 bg-gray-50">
        <div className="text-center text-gray-500">
          <p>No request data available</p>
        </div>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [paymentDeadline, setPaymentDeadline] = useState('');
  const [teacherNames, setTeacherNames] = useState({});
  const [meetingLink, setMeetingLink] = useState(localRequest.meetingLink || null);

  // ✅ FIXED: Complete user role and permission calculation with data validation
  const userRoles = useMemo(() => {
    console.log('🧮 Calculating userRoles:', {
      currentUserId,
      localRequestId: localRequest?.id,
      localRequestStatus: localRequest?.status,
      localRequestUserId: localRequest?.userId,
      localRequestCreatedBy: localRequest?.createdBy
    });

    // Safety check for currentUserId
    if (!currentUserId) {
      console.log('⚠️ No currentUserId, returning viewer role');
      return {
        userRole: 'viewer',
        roleLabel: '👁️ Viewer (Not Logged In)',
        isOwner: false,
        isVotee: false,
        hasVoted: false,
        isAutomaticParticipant: false,
        isManualParticipant: false,
        isTeacher: false,
        isSelectedTeacher: false,
        hasPaid: false,
        canVote: false,
        canChooseRole: false,
        canBecomeTeacher: false,
        canJoinSession: false,
        canPay: false,
        canViewMeeting: false,
        totalParticipantCount: 0,
        participantsWhoPay: [],
        paidCount: 0,
        pendingPaymentCount: 0,
        automaticParticipants: [],
        allParticipants: []
      };
    }

    // ✅ ADDED: Validate request data structure
    if (!localRequest || typeof localRequest !== 'object') {
      console.warn('❌ RequestCard: Invalid request object received:', localRequest);
      return {
        userRole: 'viewer',
        roleLabel: '⚠️ Invalid Data',
        isOwner: false,
        isVotee: false,
        hasVoted: false,
        isAutomaticParticipant: false,
        isManualParticipant: false,
        isTeacher: false,
        isSelectedTeacher: false,
        hasPaid: false,
        canVote: false,
        canChooseRole: false,
        canBecomeTeacher: false,
        canJoinSession: false,
        canPay: false,
        canViewMeeting: false,
        totalParticipantCount: 0,
        participantsWhoPay: [],
        paidCount: 0,
        pendingPaymentCount: 0,
        automaticParticipants: [],
        allParticipants: []
      };
    }

    const owner = localRequest?.userId || localRequest?.createdBy;
    const isOwner = currentUserId === owner;
    const votees = localRequest?.votes || [];
    const isVotee = votees.includes(currentUserId);
    const hasVoted = isVotee;

    // In pending: owner + 5 votees = 6 automatic participants
    const automaticParticipants = new Set([owner, ...votees]);
    const isAutomaticParticipant = automaticParticipants.has(currentUserId);

    // Manual participants (those who chose to join)
    const manualParticipants = localRequest?.participants || [];
    const isManualParticipant = manualParticipants.includes(currentUserId);

    // Teachers (those who chose to teach)
    const teachers = localRequest?.teachers || [];
    const isTeacher = teachers.includes(currentUserId);
    const isSelectedTeacher = localRequest?.selectedTeacher === currentUserId;

    // Paid participants
    const paidParticipants = localRequest?.paidParticipants || [];
    const hasPaid = paidParticipants.includes(currentUserId);

    console.log('👤 User role calculation:', {
      owner,
      isOwner,
      votees: votees.length,
      isVotee,
      hasVoted,
      automaticParticipants: automaticParticipants.size,
      isAutomaticParticipant,
      manualParticipants: manualParticipants.length,
      isManualParticipant,
      teachers: teachers.length,
      isTeacher,
      isSelectedTeacher,
      paidParticipants: paidParticipants.length,
      hasPaid
    });

    // Role determination based on state and user actions
    let userRole = 'viewer';
    let roleLabel = '👁️ Viewer';
    let canVote = false;
    let canChooseRole = false;
    let canBecomeTeacher = false;
    let canJoinSession = false;
    let canPay = false;
    let canViewMeeting = false;

    // Calculate total participants (automatic + manual)
    const allParticipants = new Set([...automaticParticipants, ...manualParticipants]);
    const totalParticipantCount = allParticipants.size;

    // Calculate who needs to pay (all participants)
    const participantsWhoPay = Array.from(allParticipants);
    const paidCount = participantsWhoPay.filter(id => paidParticipants.includes(id)).length;
    const pendingPaymentCount = participantsWhoPay.length - paidCount;

    // Role and permission logic by status
    console.log('🎯 Processing status:', localRequest?.status);
    switch (localRequest?.status) {
      case 'pending':
        if (isOwner) {
          userRole = 'owner';
          roleLabel = '👑 Owner (Auto Participant)';
          canVote = false; // Owner cannot vote
        } else if (hasVoted) {
          userRole = 'votee';
          roleLabel = '🗳️ Votee (Auto Participant)';
          canVote = false; // Already voted
        } else {
          userRole = 'voter';
          roleLabel = '👁️ Can Vote';
          canVote = true; // Can vote to approve
        }
        break;

      case 'voting_open':
        if (isOwner) {
          userRole = 'owner';
          roleLabel = '👑 Owner (Auto Participant)';
        } else if (isVotee) {
          userRole = 'votee';
          roleLabel = '🗳️ Votee (Auto Participant)';
        } else if (isTeacher) {
          userRole = 'teacher';
          roleLabel = '👨‍🏫 Teacher Candidate';
        } else if (isManualParticipant) {
          userRole = 'participant';
          roleLabel = '👥 Participant';
        } else {
          userRole = 'chooser';
          roleLabel = '🎯 Choose Your Role';
          canChooseRole = true;
          canBecomeTeacher = true;
          canJoinSession = true;
        }
        break;

      case 'accepted':
        if (isOwner) {
          userRole = 'owner';
          roleLabel = '👑 Owner (Can Select Teacher)';
        } else if (isVotee) {
          userRole = 'votee';
          roleLabel = '🗳️ Votee (Auto Participant)';
        } else if (isSelectedTeacher) {
          userRole = 'selected_teacher';
          roleLabel = '🎯 Selected Teacher';
        } else if (isTeacher) {
          userRole = 'teacher_candidate';
          roleLabel = '👨‍🏫 Teacher Candidate';
        } else if (isManualParticipant) {
          userRole = 'participant';
          roleLabel = '👥 Participant';
        } else {
          userRole = 'viewer';
          roleLabel = '👁️ Viewer';
        }
        break;

      case 'funding':
        const isParticipant = allParticipants.has(currentUserId);
        if (isOwner) {
          userRole = 'owner';
          roleLabel = '👑 Owner (Must Pay)';
          canPay = !hasPaid;
        } else if (isVotee) {
          userRole = 'votee';
          roleLabel = '🗳️ Votee (Must Pay)';
          canPay = !hasPaid;
        } else if (isSelectedTeacher) {
          userRole = 'selected_teacher';
          roleLabel = '🎯 Selected Teacher';
        } else if (isParticipant) {
          userRole = 'participant';
          roleLabel = hasPaid ? '💰 Paid Participant' : '👥 Participant (Must Pay)';
          canPay = !hasPaid;
        } else {
          userRole = 'viewer';
          roleLabel = '👁️ Can Join as Participant';
          canJoinSession = true; // Can still join as participant
        }
        break;

      case 'paid':
        const isAuthorizedViewer = allParticipants.has(currentUserId) || isSelectedTeacher;
        if (isSelectedTeacher) {
          userRole = 'selected_teacher';
          roleLabel = '🎯 Confirmed Teacher';
          canViewMeeting = true;
        } else if (isAuthorizedViewer) {
          userRole = 'authorized_participant';
          roleLabel = hasPaid ? '💰 Paid Participant' : '👥 Authorized Participant';
          canViewMeeting = true;
        } else {
          userRole = 'viewer';
          roleLabel = '⏰ Payment Time Expired';
        }
        break;

      case 'live':
        const isAuthorizedForLive = allParticipants.has(currentUserId) || isSelectedTeacher;
        if (isSelectedTeacher) {
          userRole = 'active_teacher';
          roleLabel = '🔴 Teaching Now';
          canViewMeeting = true;
        } else if (isAuthorizedForLive) {
          userRole = 'active_participant';
          roleLabel = '🔴 In Session';
          canViewMeeting = true;
        } else {
          userRole = 'viewer';
          roleLabel = '🔴 Session in Progress';
        }
        break;

      case 'complete':
        userRole = 'viewer';
        roleLabel = '✅ Session Completed';
        break;

      case 'cancelled':
        userRole = 'viewer';
        roleLabel = '❌ Session Cancelled';
        break;
    }

    const finalUserRoles = {
      userRole,
      roleLabel,
      isOwner,
      isVotee,
      hasVoted,
      isAutomaticParticipant,
      isManualParticipant,
      isTeacher,
      isSelectedTeacher,
      hasPaid,
      canVote,
      canChooseRole,
      canBecomeTeacher,
      canJoinSession,
      canPay,
      canViewMeeting,
      totalParticipantCount,
      participantsWhoPay,
      paidCount,
      pendingPaymentCount,
      automaticParticipants: Array.from(automaticParticipants),
      allParticipants: Array.from(allParticipants)
    };

    console.log('✅ Final userRoles:', finalUserRoles);
    return finalUserRoles;
  }, [localRequest, currentUserId]); // ✅ FIXED: Added localRequest dependency

  // Get user display names for teachers
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

  // Load teacher names
  useEffect(() => {
    if (localRequest?.teachers && localRequest?.teachers.length > 0) {
      localRequest?.teachers.forEach(userId => {
        if (userId) { // ✅ ADDED: Safety check for userId
          getUserDisplayName(userId);
        }
      });
    }
  }, [localRequest?.teachers]); // ✅ FIXED: Removed getUserDisplayName dependency to avoid infinite loop

  // ✅ HANDLE VOTING (Only in pending state, owner cannot vote)
  const handleVote = async () => {
    console.log('🗳️ handleVote called:', {
      currentUserId,
      loading,
      canVote: userRoles.canVote,
      requestId: localRequest?.id,
      currentStatus: localRequest?.status
    });

    if (!currentUserId || loading || !userRoles.canVote) {
      if (!currentUserId) {
        alert('Please log in to vote on requests');
      }
      console.log('❌ handleVote blocked:', { currentUserId, loading, canVote: userRoles.canVote });
      return;
    }

    try {
      setLoading(true);

      // ✅ ADDED: Validate request data before voting
      if (!localRequest?.id || !Array.isArray(localRequest.votes)) {
        console.error('❌ Invalid request data for voting:', {
          hasId: !!localRequest?.id,
          hasVotes: Array.isArray(localRequest?.votes),
          localRequest
        });
        throw new Error('Invalid request data for voting');
      }

      const newVotes = [...(localRequest.votes || []), currentUserId];
      const updateData = {
        votes: newVotes,
        voteCount: newVotes.length,
        updatedAt: new Date() // ✅ FIXED: Add updatedAt field to match isVotingUpdate() requirements
      };

      // Auto-transition to voting_open when 5 votes reached
      if (newVotes.length >= 5) {
        updateData.status = 'voting_open';
        console.log('🎉 Auto-transitioning to voting_open - 5 votes reached!');
      }

      console.log('📝 Voting update data:', updateData);

      console.log('🚀 Calling groupRequestService.updateGroupRequest...');
      const result = await groupRequestService.updateGroupRequest(localRequest.id, updateData, currentUserId);
      console.log('📡 Voting result:', result);

      if (result.success) {
        console.log('✅ Voting successful, updating local state...');
        // ✅ FIXED: Update local state immediately
        const updatedRequest = {
          ...localRequest,
          ...updateData
        };
        console.log('🔄 Setting local state:', updatedRequest);
        setLocalRequest(updatedRequest);
        
        // Notify parent component
        console.log('📢 Notifying parent component...');
        onRequestUpdate?.(localRequest.id, updatedRequest);
        console.log('✅ Voting complete!');
      } else {
        console.error('❌ Voting failed:', result.message);
        alert(result.message || 'Failed to process vote');
      }
    } catch (error) {
      console.error('Error handling vote:', error);
      alert(`Failed to process vote: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLE ROLE SELECTION (Become teacher or join session)
  const handleRoleSelection = async (roleType) => {
    if (!currentUserId || loading) {
      if (!currentUserId) {
        alert('Please log in to participate in requests');
      }
      return;
    }

    try {
      setLoading(true);
      let updateData = {};

      if (roleType === 'teacher') {
        updateData = {
          teachers: [...(localRequest?.teachers || []), currentUserId],
          teacherCount: (localRequest?.teacherCount || 0) + 1,
          updatedAt: new Date() // ✅ FIXED: Add updatedAt field to match isTeachingUpdate() requirements
        };

        // If first teacher, change to accepted
        if (!localRequest?.teachers || localRequest.teachers.length === 0) {
          updateData.status = 'accepted';
        }
      } else if (roleType === 'participant') {
        updateData = {
          participants: [...(localRequest?.participants || []), currentUserId],
          participantCount: (localRequest?.participantCount || 0) + 1,
          updatedAt: new Date() // ✅ FIXED: Add updatedAt field to match isParticipationUpdate() requirements
        };
      }

      const result = await groupRequestService.updateGroupRequest(localRequest?.id, updateData, currentUserId);

      if (result.success) {
        // ✅ FIXED: Update local state immediately
        const updatedRequest = {
          ...localRequest,
          ...updateData
        };
        setLocalRequest(updatedRequest);
        
        // Notify parent component
        onRequestUpdate?.(localRequest?.id, updatedRequest);
      } else {
        alert(result.message || 'Failed to select role');
      }
    } catch (error) {
      console.error('Error handling role selection:', error);
      alert('Failed to select role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLE TEACHER SELECTION BY OWNER (In accepted state)
  const handleTeacherSelection = async () => {
    console.log('👨‍🏫 handleTeacherSelection called:', {
      currentUserId,
      selectedTeacher,
      paymentDeadline,
      isOwner: userRoles.isOwner,
      requestId: localRequest?.id,
      currentStatus: localRequest?.status
    });

    if (!currentUserId || !selectedTeacher || !paymentDeadline || !userRoles.isOwner) {
      if (!currentUserId) {
        alert('Please log in to manage requests');
      }
      console.log('❌ handleTeacherSelection blocked:', { 
        currentUserId, 
        selectedTeacher, 
        paymentDeadline, 
        isOwner: userRoles.isOwner 
      });
      return;
    }

    try {
      setLoading(true);

      const deadlineHours = parseInt(paymentDeadline);
      console.log('⏰ Payment deadline calculation:', {
        deadlineHours,
        currentTime: new Date().toISOString(),
        currentTimestamp: Date.now()
      });

      // ✅ FIXED: Create deadline timestamp as a number (milliseconds since epoch)
      // This ensures Firebase stores it correctly and PaymentCountdownTimer can parse it
      const paymentDeadlineTime = Date.now() + (deadlineHours * 60 * 60 * 1000);
      console.log('📅 Payment deadline will be:', {
        timestamp: paymentDeadlineTime,
        date: new Date(paymentDeadlineTime).toISOString(),
        hoursFromNow: deadlineHours
      });

      const updateData = {
        selectedTeacher: selectedTeacher,
        status: 'funding',
        paymentDeadline: paymentDeadlineTime, // ✅ Store as number timestamp
        paymentDeadlineHours: deadlineHours,
        // Revert all other teachers to regular users
        teachers: [selectedTeacher], // Only selected teacher remains
        teacherCount: 1,
        updatedAt: new Date()
      };

      console.log('📝 Teacher selection update data:', updateData);

      const result = await groupRequestService.updateGroupRequest(localRequest?.id, updateData, currentUserId);

      if (result.success) {
        // ✅ FIXED: Update local state immediately
        const updatedRequest = {
          ...localRequest,
          ...updateData
        };
        setLocalRequest(updatedRequest);
        
        // Notify parent component
        onRequestUpdate?.(localRequest?.id, updatedRequest);
        
        setSelectedTeacher('');
        setPaymentDeadline('');
        alert(`Teacher selected! Payment deadline set to ${deadlineHours} hour(s).`);
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

  // ✅ HANDLE PAYMENT (In funding state)
  const handlePayment = async () => {
    if (!currentUserId || loading || !userRoles.canPay) {
      if (!currentUserId) {
        alert('Please log in to make payments');
      }
      return;
    }

    try {
      setLoading(true);
      // Handle different rate formats safely
      let paymentAmount = 0;
      if (localRequest?.rate) {
        if (typeof localRequest.rate === 'string') {
          paymentAmount = parseFloat(localRequest.rate.replace(/[^0-9.-]+/g,"") || "0");
        } else if (typeof localRequest.rate === 'number') {
          paymentAmount = localRequest.rate;
        } else {
          paymentAmount = parseFloat(localRequest.rate) || 0;
        }
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newPaidParticipants = [...(localRequest?.paidParticipants || []), currentUserId];
      const updateData = {
        paidParticipants: newPaidParticipants,
        totalPaid: (localRequest?.totalPaid || 0) + paymentAmount,
        updatedAt: new Date() // ✅ FIXED: Add updatedAt field to match isPaymentUpdate() requirements
      };

      const result = await groupRequestService.updateGroupRequest(localRequest?.id, updateData, currentUserId);

      if (result.success) {
        // ✅ FIXED: Update local state immediately
        const updatedRequest = {
          ...localRequest,
          ...updateData
        };
        setLocalRequest(updatedRequest);
        
        // Notify parent component
        onRequestUpdate?.(localRequest?.id, updatedRequest);
        alert('Payment successful!');
      } else {
        alert(result.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ GENERATE MEETING LINK (In paid state, for teacher)
  const handleGenerateMeetingLink = async () => {
    if (!currentUserId || !userRoles.isSelectedTeacher) {
      if (!currentUserId) {
        alert('Please log in to manage meetings');
      }
      return;
    }

    try {
      setLoading(true);
      const mockLink = `https://meet.jit.si/SkillNet-${localRequest?.id}-${Date.now()}`;

      const updateData = {
        meetingLink: mockLink,
        meetingGeneratedAt: new Date(),
        status: 'live', // Auto-transition to live when teacher joins
        updatedAt: new Date() // ✅ FIXED: Add updatedAt field to match isMeetingUpdate() requirements
      };

      const result = await groupRequestService.updateGroupRequest(localRequest?.id, updateData, currentUserId);

      if (result.success) {
        setMeetingLink(mockLink);
        // ✅ FIXED: Update local state immediately
        const updatedRequest = {
          ...localRequest,
          ...updateData
        };
        setLocalRequest(updatedRequest);
        
        // Notify parent component
        onRequestUpdate?.(localRequest?.id, updatedRequest);

        // Open meeting in new tab with teacher prefix and auto-name entry
        const teacherDisplayName = `Teacher-${teacherNames[currentUserId] || currentUserDisplayName || 'Teacher'}`;
        
        console.log('🔗 Teacher display name prepared:', {
          teacherDisplayName,
          currentUserId,
          teacherNames: teacherNames[currentUserId],
          currentUserDisplayName
        });
        
        // Use the same improved approach as handleJoinMeeting
        const configParams = [
          `config.prejoinPageEnabled=false`,
          `config.prejoinConfig.name=${encodeURIComponent(teacherDisplayName)}`,
          `config.prejoinConfig.prejoinButtonText=Start Teaching`,
          `userInfo.displayName=${encodeURIComponent(teacherDisplayName)}`,
          `userInfo.preferredDisplayName=${encodeURIComponent(teacherDisplayName)}`
        ];
        
        let enhancedLink = `${mockLink}?${configParams.join('&')}`;
        
        // Add additional parameters
        const additionalParams = [
          `displayName=${encodeURIComponent(teacherDisplayName)}`,
          `preferredDisplayName=${encodeURIComponent(teacherDisplayName)}`,
          `userInfo.name=${encodeURIComponent(teacherDisplayName)}`,
          `name=${encodeURIComponent(teacherDisplayName)}`
        ];
        enhancedLink += `&${additionalParams.join('&')}`;
        
        // Add URL fragment
        enhancedLink += `#userInfo.displayName=${encodeURIComponent(teacherDisplayName)}`;
        
        console.log('🔗 Generated meeting link with auto-name:', {
          originalLink: mockLink,
          enhancedLink,
          teacherDisplayName,
          currentUserId,
          configParams,
          additionalParams
        });
        
        // Store in localStorage as backup
        try {
          localStorage.setItem('jitsi_display_name', teacherDisplayName);
          localStorage.setItem('jitsi_teacher_mode', 'true');
          console.log('💾 Stored teacher display name in localStorage:', teacherDisplayName);
        } catch (error) {
          console.warn('⚠️ Could not store in localStorage:', error);
        }
        
        // Open the meeting and inject the enhanced script
        const meetingWindow = window.open(enhancedLink, '_blank');
        
        // Inject the same enhanced script for automatic setup
        if (meetingWindow) {
          setTimeout(() => {
            try {
              const enhancedScript = `
                try {
                  console.log('🔧 Starting automatic Jitsi setup for teacher: ${teacherDisplayName}');
                  
                  // Wait for Jitsi to load
                  const checkJitsi = setInterval(() => {
                    if (window.JitsiMeetExternalAPI || document.querySelector('[data-testid="prejoin.join-button"]')) {
                      clearInterval(checkJitsi);
                      console.log('✅ Jitsi loaded, starting automatic teacher setup...');
                      
                      // Step 1: Set display name in prejoin page
                      const nameInput = document.querySelector('input[data-testid="prejoin.input.name"]');
                      if (nameInput) {
                        nameInput.value = '${teacherDisplayName}';
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('✅ Teacher display name set:', '${teacherDisplayName}');
                      }
                      
                      // Step 2: Also try alternative name input selectors
                      const alternativeNameInputs = [
                        'input[placeholder*="name" i]',
                        'input[placeholder*="display" i]',
                        'input[name*="name" i]',
                        'input[id*="name" i]',
                        '.prejoin-input-name input',
                        '.prejoin-input input'
                      ];
                      
                      alternativeNameInputs.forEach(selector => {
                        const altInput = document.querySelector(selector);
                        if (altInput && altInput !== nameInput) {
                          altInput.value = '${teacherDisplayName}';
                          altInput.dispatchEvent(new Event('input', { bubbles: true }));
                          altInput.dispatchEvent(new Event('change', { bubbles: true }));
                          console.log('✅ Alternative teacher name input filled:', selector);
                        }
                      });
                      
                      // Step 3: Store in localStorage as backup
                      localStorage.setItem('jitsi_meeting_display_name', '${teacherDisplayName}');
                      localStorage.setItem('jitsi_display_name', '${teacherDisplayName}');
                      
                      // Step 4: Wait a bit for name to be processed, then auto-join
                      setTimeout(() => {
                        console.log('🚀 Teacher attempting to auto-join meeting...');
                        
                        // Try multiple join button selectors
                        const joinButtonSelectors = [
                          '[data-testid="prejoin.join-button"]',
                          '.prejoin-join-button',
                          '.prejoin-button',
                          'button[data-testid*="join"]',
                          'button:contains("Join")',
                          'button:contains("join")',
                          '.btn-join',
                          '.join-button'
                        ];
                        
                        let joinButton = null;
                        for (const selector of joinButtonSelectors) {
                          try {
                            joinButton = document.querySelector(selector);
                            if (joinButton) {
                              console.log('✅ Found teacher join button:', selector);
                              break;
                            }
                          } catch (e) {
                            // Skip invalid selectors
                          }
                        }
                        
                        if (joinButton) {
                          console.log('🚀 Teacher auto-clicking join button');
                          joinButton.click();
                          
                          // Step 5: After joining, automatically select logging option
                          setTimeout(() => {
                            console.log('🔍 Teacher looking for logging options...');
                            
                            // Try to find and select logging options
                            const loggingSelectors = [
                              'input[type="checkbox"][name*="log"]',
                              'input[type="checkbox"][id*="log"]',
                              'input[type="checkbox"][value*="log"]',
                              'input[type="checkbox"][data-testid*="log"]',
                              '.logging-option input[type="checkbox"]',
                              '.log-option input[type="checkbox"]',
                              'input[type="checkbox"]:contains("logging")',
                              'input[type="checkbox"]:contains("Logging")'
                            ];
                            
                            loggingSelectors.forEach(selector => {
                              try {
                                const loggingCheckbox = document.querySelector(selector);
                                if (loggingCheckbox && !loggingCheckbox.checked) {
                                  loggingCheckbox.checked = true;
                                  loggingCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                                  loggingCheckbox.dispatchEvent(new Event('click', { bubbles: true }));
                                  console.log('✅ Teacher logging option selected:', selector);
                                }
                              } catch (e) {
                                // Skip invalid selectors
                              }
                            });
                            
                            // Also try to find logging options by text content
                            const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
                            allCheckboxes.forEach(checkbox => {
                              const label = checkbox.nextElementSibling || checkbox.parentElement;
                              if (label && label.textContent && 
                                  (label.textContent.toLowerCase().includes('log') || 
                                   label.textContent.toLowerCase().includes('logging'))) {
                                if (!checkbox.checked) {
                                  checkbox.checked = true;
                                  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                                  checkbox.dispatchEvent(new Event('click', { bubbles: true }));
                                  console.log('✅ Teacher logging option selected by text:', label.textContent);
                                }
                              }
                            });
                            
                          }, 2000); // Wait 2 seconds after joining
                          
                        } else {
                          console.warn('⚠️ No teacher join button found');
                        }
                      }, 1500); // Wait 1.5 seconds for name processing
                      
                    }
                  }, 1000);
                  
                  // Timeout after 15 seconds
                  setTimeout(() => {
                    clearInterval(checkJitsi);
                    console.log('⏰ Teacher Jitsi setup timeout reached');
                  }, 15000);
                  
                } catch (error) {
                  console.warn('❌ Could not inject teacher display name script:', error);
                }
              `;
              
              meetingWindow.eval(enhancedScript);
              console.log('🔧 Injected enhanced teacher script into meeting window');
            } catch (error) {
              console.warn('⚠️ Could not inject enhanced script into teacher meeting window:', error);
            }
          }, 2000); // Wait 2 seconds for the page to start loading
        }
      } else {
        alert(result.message || 'Failed to generate meeting link');
      }
    } catch (error) {
      console.error('Error generating meeting link:', error);
      alert('Failed to generate meeting link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ JOIN EXISTING MEETING (In live state)
  const handleJoinMeeting = () => {
    console.log('🔗 handleJoinMeeting called with:', {
      meetingLink,
      localRequestMeetingLink: localRequest?.meetingLink,
      currentUserId,
      currentUserDisplayName,
      selectedTeacher: localRequest?.selectedTeacher
    });

    if (meetingLink || localRequest?.meetingLink) {
      // Automatically join without modal
      const isSelectedTeacher = localRequest?.selectedTeacher === currentUserId;
      const displayName = isSelectedTeacher ? `Teacher-${currentUserDisplayName || 'User'}` : (currentUserDisplayName || 'User');
      
      console.log('🚀 Auto-joining meeting with display name:', displayName);
      
      // Show brief confirmation message
      const roleText = isSelectedTeacher ? 'Teacher' : 'Participant';
      alert(`🚀 Joining meeting as ${roleText}: ${displayName}\n\n🤖 Automatic setup in progress...`);
      
      // Call the automatic joining function directly
      joinMeetingAutomatically(displayName);
    } else {
      console.warn('⚠️ No meeting link available for joining');
    }
  };

    // ✅ AUTOMATICALLY JOIN MEETING (No modal needed)
  const joinMeetingAutomatically = (displayName) => {
    const link = meetingLink || localRequest?.meetingLink;
    const isSelectedTeacher = localRequest?.selectedTeacher === currentUserId;
    
    console.log('🔗 Automatically joining meeting:', {
      displayName,
      isSelectedTeacher,
      link
    });
    
    // Try multiple approaches for automatic name entry
    
    // Approach 1: Use Jitsi Meet's config parameters (most reliable)
    const separator = link.includes('?') ? '&' : '?';
    const configParams = [
      `config.prejoinPageEnabled=false`,
      `config.prejoinConfig.name=${encodeURIComponent(displayName)}`,
      `config.prejoinConfig.prejoinButtonText=Join Session`,
      `userInfo.displayName=${encodeURIComponent(displayName)}`,
      `userInfo.preferredDisplayName=${encodeURIComponent(displayName)}`
    ];
    
    let enhancedLink = `${link}${separator}${configParams.join('&')}`;
    
    // Approach 2: Add additional Jitsi Meet parameters
    const additionalParams = [
      `displayName=${encodeURIComponent(displayName)}`,
      `preferredDisplayName=${encodeURIComponent(displayName)}`,
      `userInfo.name=${encodeURIComponent(displayName)}`,
      `name=${encodeURIComponent(displayName)}`
    ];
    enhancedLink += `&${additionalParams.join('&')}`;
    
    // Approach 3: Use URL fragment as fallback
    enhancedLink += `#userInfo.displayName=${encodeURIComponent(displayName)}`;
    
    console.log('🔗 Joining meeting with automatic name:', {
      originalLink: link,
      enhancedLink,
      displayName,
      isSelectedTeacher,
      configParams,
      additionalParams
    });
    
    // Store in localStorage as backup
    try {
      localStorage.setItem('jitsi_display_name', displayName);
      localStorage.setItem('jitsi_teacher_mode', isSelectedTeacher.toString());
      console.log('💾 Stored display name in localStorage:', displayName);
    } catch (error) {
      console.warn('⚠️ Could not store in localStorage:', error);
    }
    
    // Open the meeting
    const meetingWindow = window.open(enhancedLink, '_blank');
    
    // Try to inject a script that will set the display name after Jitsi loads
    if (meetingWindow) {
      // Multiple injection attempts with different timing
      const injectScript = (attempt = 1) => {
        try {
          console.log(`🔧 Attempt ${attempt}: Injecting script for ${displayName}`);
          
          const enhancedScript = `
            try {
              console.log('🔧 Starting automatic Jitsi setup for: ${displayName}');
              
              // More aggressive element detection
              const findElement = (selectors) => {
                for (const selector of selectors) {
                  try {
                    const element = document.querySelector(selector);
                    if (element) return element;
                  } catch (e) {}
                }
                return null;
              };
              
              // Wait for Jitsi to load with multiple detection methods
              const checkJitsi = setInterval(() => {
                const jitsiLoaded = window.JitsiMeetExternalAPI || 
                                   document.querySelector('[data-testid="prejoin.join-button"]') ||
                                   document.querySelector('.prejoin-join-button') ||
                                   document.querySelector('input[placeholder*="name" i]') ||
                                   document.querySelector('input[placeholder*="display" i]') ||
                                   document.querySelector('.prejoin-input input');
                
                if (jitsiLoaded) {
                  clearInterval(checkJitsi);
                  console.log('✅ Jitsi loaded, starting automatic setup...');
                  
                  // Step 1: Set display name with multiple attempts
                  const nameInputSelectors = [
                    'input[data-testid="prejoin.input.name"]',
                    'input[placeholder*="name" i]',
                    'input[placeholder*="display" i]',
                    'input[name*="name" i]',
                    'input[id*="name" i]',
                    '.prejoin-input-name input',
                    '.prejoin-input input',
                    'input[type="text"]'
                  ];
                  
                  let nameInput = findElement(nameInputSelectors);
                  if (nameInput) {
                    nameInput.value = '${displayName}';
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                    console.log('✅ Display name set:', '${displayName}');
                  } else {
                    console.warn('⚠️ No name input found, trying alternative methods...');
                    
                    // Try to find any input field and fill it
                    const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
                    allInputs.forEach(input => {
                      if (input.placeholder && (input.placeholder.toLowerCase().includes('name') || 
                          input.placeholder.toLowerCase().includes('display'))) {
                        input.value = '${displayName}';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('✅ Found and filled input by placeholder:', input.placeholder);
                      }
                    });
                  }
                  
                  // Step 2: Store in localStorage as backup
                  try {
                    localStorage.setItem('jitsi_meeting_display_name', '${displayName}');
                    localStorage.setItem('jitsi_display_name', '${displayName}');
                    console.log('💾 Stored in localStorage');
                  } catch (e) {
                    console.warn('⚠️ Could not store in localStorage');
                  }
                  
                  // Step 3: Wait and then auto-join
                  setTimeout(() => {
                    console.log('🚀 Attempting to auto-join meeting...');
                    
                    // Try multiple join button selectors
                    const joinButtonSelectors = [
                      '[data-testid="prejoin.join-button"]',
                      '.prejoin-join-button',
                      '.prejoin-button',
                      'button[data-testid*="join"]',
                      'button:contains("Join")',
                      'button:contains("join")',
                      '.btn-join',
                      '.join-button',
                      'button[class*="join"]',
                      'button[class*="Join"]'
                    ];
                    
                    let joinButton = findElement(joinButtonSelectors);
                    
                    if (joinButton) {
                      console.log('✅ Found join button, clicking...');
                      joinButton.click();
                      
                      // Step 4: After joining, automatically select logging option
                      setTimeout(() => {
                        console.log('🔍 Looking for logging options...');
                        
                        // Try to find and select logging options
                        const loggingSelectors = [
                          'input[type="checkbox"][name*="log"]',
                          'input[type="checkbox"][id*="log"]',
                          'input[type="checkbox"][value*="log"]',
                          'input[type="checkbox"][data-testid*="log"]',
                          '.logging-option input[type="checkbox"]',
                          '.log-option input[type="checkbox"]'
                        ];
                        
                        loggingSelectors.forEach(selector => {
                          try {
                            const loggingCheckbox = document.querySelector(selector);
                            if (loggingCheckbox && !loggingCheckbox.checked) {
                              loggingCheckbox.checked = true;
                              loggingCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                              loggingCheckbox.dispatchEvent(new Event('click', { bubbles: true }));
                              console.log('✅ Logging option selected:', selector);
                            }
                          } catch (e) {}
                        });
                        
                        // Also try to find logging options by text content
                        const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
                        allCheckboxes.forEach(checkbox => {
                          try {
                            const label = checkbox.nextElementSibling || checkbox.parentElement;
                            if (label && label.textContent && 
                                (label.textContent.toLowerCase().includes('log') || 
                                 label.textContent.toLowerCase().includes('logging'))) {
                              if (!checkbox.checked) {
                                checkbox.checked = true;
                                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                                checkbox.dispatchEvent(new Event('click', { bubbles: true }));
                                console.log('✅ Logging option selected by text:', label.textContent);
                              }
                            }
                          } catch (e) {}
                        });
                        
                      }, 3000); // Wait 3 seconds after joining
                      
                    } else {
                      console.warn('⚠️ No join button found, trying to find by text...');
                      
                      // Try to find button by text content
                      const allButtons = document.querySelectorAll('button');
                      allButtons.forEach(button => {
                        if (button.textContent && button.textContent.toLowerCase().includes('join')) {
                          console.log('✅ Found join button by text, clicking...');
                          button.click();
                        }
                      });
                    }
                  }, 2000); // Wait 2 seconds for name processing
                  
                }
              }, 500); // Check every 500ms instead of 1000ms
              
              // Timeout after 20 seconds
              setTimeout(() => {
                clearInterval(checkJitsi);
                console.log('⏰ Jitsi setup timeout reached');
              }, 20000);
              
            } catch (error) {
              console.warn('❌ Could not inject display name script:', error);
            }
          `;
          
          meetingWindow.eval(enhancedScript);
          console.log(`🔧 Script injection attempt ${attempt} successful`);
          
          // If first attempt, try again after 5 seconds as backup
          if (attempt === 1) {
            setTimeout(() => injectScript(2), 5000);
          }
          
        } catch (error) {
          console.warn(`⚠️ Script injection attempt ${attempt} failed:`, error);
          
          // Retry after 3 seconds
          if (attempt < 3) {
            setTimeout(() => injectScript(attempt + 1), 3000);
          }
        }
      };
      
      // Start first injection attempt after 1 second
      setTimeout(() => injectScript(1), 1000);
    }
  };

  // ✅ END MEETING (Teacher only)
  const handleEndMeeting = async () => {
    if (!currentUserId || !userRoles.isSelectedTeacher) {
      if (!currentUserId) {
        alert('Please log in to manage meetings');
      }
      return;
    }

    if (!confirm('Are you sure you want to end the meeting for all participants?')) return;

    try {
      setLoading(true);

      const updateData = {
        status: 'complete',
        meetingEndedAt: new Date(),
        completedAt: new Date(),
        updatedAt: new Date() // ✅ FIXED: Add updatedAt field to match Firebase rules
      };

      const result = await groupRequestService.updateGroupRequest(localRequest?.id, updateData, currentUserId);

      if (result.success) {
        // ✅ FIXED: Update local state immediately
        const updatedRequest = {
          ...localRequest,
          ...updateData
        };
        setLocalRequest(updatedRequest);
        
        // Notify parent component
        onRequestUpdate?.(localRequest?.id, updatedRequest);
        alert('Meeting ended successfully!');
      } else {
        alert(result.message || 'Failed to end meeting');
      }
    } catch (error) {
      console.error('Error ending meeting:', error);
      alert('Failed to end meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get card styling based on status
  const getCardStyling = () => {
    switch (localRequest?.status) {
      case 'pending':
        return 'border-yellow-300 bg-yellow-50';
      case 'voting_open':
        return 'border-orange-300 bg-orange-50';
      case 'accepted':
        return 'border-green-300 bg-green-50';
      case 'funding':
        return 'border-purple-300 bg-purple-50';
      case 'paid':
        return 'border-blue-300 bg-blue-50';
      case 'live':
        return 'border-red-400 bg-red-50';
      case 'complete':
        return 'border-gray-400 bg-gray-100';
      case 'cancelled':
        return 'border-red-400 bg-red-100';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  // Debug logging
  console.log('🔍 RequestCard Final State:', {
    requestId: localRequest?.id,
    status: localRequest?.status,
    userRoles,
    votes: localRequest?.votes,
    teachers: localRequest?.teachers,
    participants: localRequest?.participants,
    paidParticipants: localRequest?.paidParticipants,
    paymentDeadline: localRequest?.paymentDeadline,
    paymentDeadlineType: typeof localRequest?.paymentDeadline
  });

  return (
      <div className={`rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-all ${getCardStyling()}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <img
                src={localRequest?.createdByAvatar || `https://ui-avatars.com/api/?name=${localRequest?.createdByName}&background=3b82f6&color=fff`}
                alt={localRequest?.createdByName}
                className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{localRequest?.title}</h3>
              <p className="text-sm text-gray-600">
                {localRequest?.createdByName} • {localRequest?.groupName}
              </p>
            </div>
          </div>
          <div className="text-right">
            {localRequest?.rate && (
                <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium block mb-2">
              {localRequest?.rate}
            </span>
            )}
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
            {localRequest?.status?.replace('_', ' ').toUpperCase()}
          </span>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
          {userRoles.roleLabel}
        </span>
        </div>

        {/* Description */}
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">{localRequest?.description}</p>

        {/* Skills */}
        {localRequest?.skills && localRequest?.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {localRequest?.skills.map((skill, index) => (
                  <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {skill}
            </span>
              ))}
            </div>
        )}

        {/* Status-specific content */}
        {localRequest?.status === 'pending' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Community Approval</span>
                <span className="text-sm text-gray-600">{localRequest?.voteCount || 0}/5</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2 mb-3">
                <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((localRequest?.voteCount || 0) / 5) * 100, 100)}%` }}
                />
              </div>

              {userRoles.canVote && (
                  <button
                      onClick={handleVote}
                      disabled={loading}
                      className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Voting...' : '👍 Vote to Approve'}
                  </button>
              )}

              {userRoles.isOwner && (
                  <div className="text-center text-sm text-yellow-700 font-medium">
                    ⏳ Waiting for 5 community votes ({localRequest?.voteCount || 0}/5)
                  </div>
              )}

              {userRoles.hasVoted && !userRoles.isOwner && (
                  <div className="text-center text-sm text-yellow-700 font-medium">
                    ✓ You voted - automatically participating when approved
                  </div>
              )}
            </div>
        )}

        {localRequest?.status === 'voting_open' && (
            <div className="mb-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Session Approved!</span>
                  <span className="text-sm text-gray-600">{userRoles.totalParticipantCount} participants</span>
                </div>
              </div>

              {userRoles.canChooseRole && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">Choose how you want to participate:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                          onClick={() => handleRoleSelection('teacher')}
                          disabled={loading}
                          className="bg-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        🎯 Become Teacher
                      </button>
                      <button
                          onClick={() => handleRoleSelection('participant')}
                          disabled={loading}
                          className="bg-orange-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
                      >
                        👥 Join Session
                      </button>
                    </div>
                  </div>
              )}

              {(userRoles.isOwner || userRoles.isVotee) && (
                  <div className="text-center text-sm text-orange-700 font-medium">
                    ✓ You're automatically participating in this session
                  </div>
              )}

              {userRoles.isTeacher && (
                  <div className="text-center text-sm text-green-700 font-medium">
                    🎯 You applied to teach this session
                  </div>
              )}

              {userRoles.isManualParticipant && (
                  <div className="text-center text-sm text-orange-700 font-medium">
                    👥 You joined this session as a participant
                  </div>
              )}
            </div>
        )}

        {localRequest?.status === 'accepted' && (
            <div className="mb-4">
              {userRoles.isOwner && localRequest?.teachers && localRequest?.teachers.length > 0 && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-green-800 mb-3">Select Teacher & Set Payment Deadline</h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">Choose Teacher:</label>
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            className="w-full border border-green-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select a teacher</option>
                          {localRequest?.teachers.map((teacherId) => (
                              <option key={teacherId} value={teacherId}>
                                {teacherNames[teacherId] || teacherId}
                              </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">Payment Deadline:</label>
                        <select
                            value={paymentDeadline}
                            onChange={(e) => setPaymentDeadline(e.target.value)}
                            className="w-full border border-green-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select deadline</option>
                          <option value="1">1 hour</option>
                          <option value="3">3 hours</option>
                          <option value="6">6 hours</option>
                          <option value="12">12 hours</option>
                          <option value="24">24 hours</option>
                        </select>
                      </div>

                      <button
                          onClick={handleTeacherSelection}
                          disabled={loading || !selectedTeacher || !paymentDeadline}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Confirming...' : 'Confirm Teacher & Start Funding'}
                      </button>
                    </div>
                  </div>
              )}

              {/* Role Selection for Non-Owners in Accepted State */}
              {!userRoles.isOwner && userRoles.canChooseRole && (
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-800 mb-3">Choose Your Role</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      The request has been accepted! Choose how you want to participate:
                    </p>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleRoleSelection('teacher')}
                            disabled={loading}
                            className="bg-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          🎯 Become Teacher
                        </button>
                        <button
                            onClick={() => handleRoleSelection('participant')}
                            disabled={loading}
                            className="bg-orange-600 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
                        >
                          👥 Join as Participant
                        </button>
                      </div>
                    </div>
                  </div>
              )}

              {!userRoles.isOwner && !userRoles.canChooseRole && (
                  <div className="text-center text-sm text-green-700 font-medium">
                    ⏳ Waiting for owner to select teacher and set payment deadline
                  </div>
              )}
            </div>
        )}

        {localRequest?.status === 'funding' && (
            <div className="mb-4">
              <div className="bg-purple-100 border border-purple-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-purple-600">💰</span>
                  <span className="font-medium text-purple-800">Funding Phase</span>
                </div>

                {/* Payment Deadline Timer */}
                {localRequest?.paymentDeadline && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-600">⏰</span>
                        <span className="font-medium text-red-700">Payment Deadline</span>
                      </div>
                      <div className="text-center">
                        <PaymentCountdownTimer
                            deadline={localRequest?.paymentDeadline}
                            requestId={localRequest?.id}
                            onRequestUpdate={onRequestUpdate}
                            currentUserId={currentUserId}
                        />
                      </div>
                    </div>
                )}

                {/* Payment Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700">Payment Progress</span>
                    <span className="text-sm text-purple-600">
                  {userRoles.paidCount}/{userRoles.participantsWhoPay.length}
                </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                    <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${userRoles.participantsWhoPay.length > 0 ? (userRoles.paidCount / userRoles.participantsWhoPay.length) * 100 : 0}%`
                        }}
                    />
                  </div>
                  
                  {/* Participant Information */}
                  <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-xs text-purple-700 mb-2">
                      <strong>Participants who must pay:</strong>
                    </div>
                    <div className="text-xs text-purple-600 space-y-1">
                      <div>👑 Owner: {userRoles.isOwner ? 'You' : 'Session Creator'}</div>
                      <div>🗳️ Voters: {(userRoles.automaticParticipants || []).filter(id => id !== (localRequest?.userId || localRequest?.createdBy)).length} people (automatic participants & payers)</div>
                      {(userRoles.manualParticipants || []).length > 0 && (
                        <div>👥 Manual Participants: {(userRoles.manualParticipants || []).length} people</div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-purple-600">
                    Cost per person: Rs. {localRequest ? calculateCostPerPerson(localRequest) : '0'}
                  </p>
                </div>

                {userRoles.canPay && (
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing Payment...' : `Pay Rs. ${localRequest ? calculateCostPerPerson(localRequest) : '0'}`}
                    </button>
                )}

                {userRoles.hasPaid && (
                    <div className="text-center text-sm text-purple-700 font-medium">
                      ✓ Payment completed - waiting for others
                    </div>
                )}

                {userRoles.canJoinSession && (
                    <button
                        onClick={() => handleRoleSelection('participant')}
                        disabled={loading}
                        className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Joining...' : '👥 Join as Participant'}
                    </button>
                )}
              </div>
            </div>
        )}

        {localRequest?.status === 'paid' && (
            <div className="mb-4">
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-blue-600">✅</span>
                  <span className="font-medium text-blue-800">Session Ready!</span>
                </div>

                <p className="text-sm text-blue-700 mb-3">
                  All payments completed. Ready to start the session.
                </p>

                {userRoles.canViewMeeting && (
                    <>
                      {userRoles.isSelectedTeacher && !meetingLink && !localRequest?.meetingLink && (
                          <button
                              onClick={handleGenerateMeetingLink}
                              disabled={loading}
                              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mb-2"
                          >
                            {loading ? 'Generating...' : '🎥 Generate Meeting Link & Start Session'}
                          </button>
                      )}

                      {(meetingLink || localRequest?.meetingLink) && (
                          <button
                              onClick={handleJoinMeeting}
                              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                             🚀 Join Meeting Automatically
                          </button>
                      )}
                    </>
                )}

                {!userRoles.canViewMeeting && (
                    <div className="text-center text-sm text-gray-600">
                      ⏰ Payment deadline has expired
                    </div>
                )}
              </div>
            </div>
        )}

        {localRequest?.status === 'live' && (
            <div className="mb-4">
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-red-800">Session in Progress</span>
                </div>

                {userRoles.canViewMeeting && (
                    <>
                      <button
                          onClick={handleJoinMeeting}
                          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors mb-2"
                      >
                         🚀 Join Session Automatically
                       </button>
                      
                      {/* Debug button to test automatic name entry */}
                       <button
                           onClick={() => {
                             const link = meetingLink || localRequest?.meetingLink;
                             if (link) {
                               const isSelectedTeacher = localRequest?.selectedTeacher === currentUserId;
                               let displayName = currentUserDisplayName || 'User';
                               if (isSelectedTeacher) {
                                 displayName = `Teacher-${displayName}`;
                               }
                               
                               console.log('🔍 Debug - Testing automatic setup:', {
                                 displayName,
                                 isSelectedTeacher,
                                 link
                               });
                               
                               // Test the automatic joining function
                               joinMeetingAutomatically(displayName);
                             }
                           }}
                           className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-700 transition-colors mb-2 text-sm"
                       >
                         🔍 Debug: Test Auto-Setup
                      </button>

                      {userRoles.isSelectedTeacher && (
                          <button
                              onClick={handleEndMeeting}
                              disabled={loading}
                              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                          >
                            {loading ? 'Ending...' : '🛑 End Meeting'}
                          </button>
                      )}
                    </>
                )}

                {!userRoles.canViewMeeting && (
                    <div className="text-center text-sm text-red-700">
                      🔴 Meeting is currently in progress
                    </div>
                )}
              </div>
            </div>
        )}

        {localRequest?.status === 'complete' && (
            <div className="mb-4">
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-600">✅</span>
                  <span className="font-medium text-gray-800">Session Completed</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>👥 Participants: {userRoles.participantsWhoPay.length}</div>
                  <div>💰 Paid Participants: {userRoles.paidCount}</div>
                  <div>👨‍🏫 Teacher: {teacherNames[localRequest?.selectedTeacher] || 'Unknown'}</div>
                </div>
              </div>
            </div>
        )}

        {localRequest?.status === 'cancelled' && (
            <div className="mb-4">
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600">❌</span>
                  <span className="font-medium text-red-800">Session Cancelled</span>
                </div>
                <p className="text-sm text-red-700">
                  {localRequest?.cancellationReason || 'Not enough votes or participants'}
                </p>
              </div>
            </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Duration: {localRequest?.duration || 'TBD'}</span>
          <Link
              to={`/requests/details/${localRequest?.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </Link>
        </div>

        
      </div>
  );
};

export default RequestCard;