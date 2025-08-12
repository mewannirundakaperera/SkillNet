import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { groupRequestService } from '@/services/groupRequestService';

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

        // Auto-transition to 'paid' state when funding timer expires
        if (onRequestUpdate && requestId) {
          try {
            const result = await groupRequestService.updateGroupRequest(requestId, {
              status: 'paid',
              updatedAt: new Date(),
              fundingExpiredAt: new Date()
            }, currentUserId);

            if (result.success) {
              onRequestUpdate(requestId, {
                status: 'paid',
                fundingExpiredAt: new Date()
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

const RequestCard = ({ request, currentUserId, onRequestUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [paymentDeadline, setPaymentDeadline] = useState('');
  const [teacherNames, setTeacherNames] = useState({});
  const [meetingLink, setMeetingLink] = useState(request.meetingLink || null);

  // ✅ FIXED: Complete user role and permission calculation
  const userRoles = useMemo(() => {
    const owner = request.userId || request.createdBy;
    const isOwner = currentUserId === owner;
    const votees = request.votes || [];
    const isVotee = votees.includes(currentUserId);
    const hasVoted = isVotee;

    // In pending: owner + 5 votees = 6 automatic participants
    const automaticParticipants = new Set([owner, ...votees]);
    const isAutomaticParticipant = automaticParticipants.has(currentUserId);

    // Manual participants (those who chose to join)
    const manualParticipants = request.participants || [];
    const isManualParticipant = manualParticipants.includes(currentUserId);

    // Teachers (those who chose to teach)
    const teachers = request.teachers || [];
    const isTeacher = teachers.includes(currentUserId);
    const isSelectedTeacher = request.selectedTeacher === currentUserId;

    // Paid participants
    const paidParticipants = request.paidParticipants || [];
    const hasPaid = paidParticipants.includes(currentUserId);

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
    switch (request.status) {
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

    return {
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
  }, [request, currentUserId]);

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
    if (request.teachers && request.teachers.length > 0) {
      request.teachers.forEach(userId => {
        getUserDisplayName(userId);
      });
    }
  }, [request.teachers]);

  // ✅ HANDLE VOTING (Only in pending state, owner cannot vote)
  const handleVote = async () => {
    if (!currentUserId || loading || !userRoles.canVote) return;

    try {
      setLoading(true);

      const newVotes = [...(request.votes || []), currentUserId];
      const updateData = {
        votes: newVotes,
        voteCount: newVotes.length
      };

      // Auto-transition to voting_open when 5 votes reached
      if (newVotes.length >= 5) {
        updateData.status = 'voting_open';
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);

      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          ...updateData
        });
      } else {
        alert(result.message || 'Failed to process vote');
      }
    } catch (error) {
      console.error('Error handling vote:', error);
      alert('Failed to process vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLE ROLE SELECTION (Become teacher or join session)
  const handleRoleSelection = async (roleType) => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      let updateData = {};

      if (roleType === 'teacher') {
        updateData = {
          teachers: [...(request.teachers || []), currentUserId],
          teacherCount: (request.teacherCount || 0) + 1
        };

        // If first teacher, change to accepted
        if (!request.teachers || request.teachers.length === 0) {
          updateData.status = 'accepted';
        }
      } else if (roleType === 'participant') {
        updateData = {
          participants: [...(request.participants || []), currentUserId],
          participantCount: (request.participantCount || 0) + 1
        };
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);

      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          ...updateData
        });
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
    if (!selectedTeacher || !paymentDeadline || !userRoles.isOwner) return;

    try {
      setLoading(true);

      const deadlineHours = parseInt(paymentDeadline);
      const paymentDeadlineTime = new Date(Date.now() + (deadlineHours * 60 * 60 * 1000));

      const updateData = {
        selectedTeacher: selectedTeacher,
        status: 'funding',
        paymentDeadline: paymentDeadlineTime,
        paymentDeadlineHours: deadlineHours,
        // Revert all other teachers to regular users
        teachers: [selectedTeacher], // Only selected teacher remains
        teacherCount: 1,
        updatedAt: new Date()
      };

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);

      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          ...updateData
        });
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
    if (!currentUserId || loading || !userRoles.canPay) return;

    try {
      setLoading(true);
      const paymentAmount = parseFloat(request.rate?.replace(/[^0-9.-]+/g,"") || "0");

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newPaidParticipants = [...(request.paidParticipants || []), currentUserId];
      const updateData = {
        paidParticipants: newPaidParticipants,
        totalPaid: (request.totalPaid || 0) + paymentAmount
      };

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);

      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          ...updateData
        });
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
    if (!userRoles.isSelectedTeacher) return;

    try {
      setLoading(true);
      const mockLink = `https://meet.jit.si/SkillNet-${request.id}-${Date.now()}`;

      const updateData = {
        meetingLink: mockLink,
        meetingGeneratedAt: new Date(),
        status: 'live' // Auto-transition to live when teacher joins
      };

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);

      if (result.success) {
        setMeetingLink(mockLink);
        onRequestUpdate?.(request.id, {
          ...request,
          ...updateData
        });

        // Open meeting in new tab with teacher prefix
        window.open(`${mockLink}?userInfo.displayName=Teacher-${teacherNames[currentUserId] || 'Teacher'}`, '_blank');
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
    if (meetingLink || request.meetingLink) {
      const link = meetingLink || request.meetingLink;
      window.open(link, '_blank');
    }
  };

  // ✅ END MEETING (Teacher only)
  const handleEndMeeting = async () => {
    if (!userRoles.isSelectedTeacher) return;

    if (!confirm('Are you sure you want to end the meeting for all participants?')) return;

    try {
      setLoading(true);

      const updateData = {
        status: 'complete',
        meetingEndedAt: new Date(),
        completedAt: new Date()
      };

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);

      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          ...updateData
        });
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
    switch (request.status) {
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
  console.log('RequestCard State:', {
    requestId: request.id,
    status: request.status,
    userRoles,
    votes: request.votes,
    teachers: request.teachers,
    participants: request.participants,
    paidParticipants: request.paidParticipants
  });

  return (
      <div className={`rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-all ${getCardStyling()}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <img
                src={request.avatar || `https://ui-avatars.com/api/?name=${request.name}&background=3b82f6&color=fff`}
                alt={request.name}
                className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{request.title}</h3>
              <p className="text-sm text-gray-600">
                {request.name} • {request.groupName}
              </p>
            </div>
          </div>
          <div className="text-right">
            {request.rate && (
                <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium block mb-2">
              {request.rate}
            </span>
            )}
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
            {request.status.replace('_', ' ').toUpperCase()}
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
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">{request.description}</p>

        {/* Skills */}
        {request.skills && request.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {request.skills.map((skill, index) => (
                  <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {skill}
            </span>
              ))}
            </div>
        )}

        {/* Status-specific content */}
        {request.status === 'pending' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Community Approval</span>
                <span className="text-sm text-gray-600">{request.voteCount || 0}/5</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2 mb-3">
                <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((request.voteCount || 0) / 5) * 100, 100)}%` }}
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
                    ⏳ Waiting for 5 community votes ({request.voteCount || 0}/5)
                  </div>
              )}

              {userRoles.hasVoted && !userRoles.isOwner && (
                  <div className="text-center text-sm text-yellow-700 font-medium">
                    ✓ You voted - automatically participating when approved
                  </div>
              )}
            </div>
        )}

        {request.status === 'voting_open' && (
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

        {request.status === 'accepted' && (
            <div className="mb-4">
              {userRoles.isOwner && request.teachers && request.teachers.length > 0 && (
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
                          {request.teachers.map((teacherId) => (
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

              {!userRoles.isOwner && (
                  <div className="text-center text-sm text-green-700 font-medium">
                    ⏳ Waiting for owner to select teacher and set payment deadline
                  </div>
              )}
            </div>
        )}

        {request.status === 'funding' && (
            <div className="mb-4">
              <div className="bg-purple-100 border border-purple-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-purple-600">💰</span>
                  <span className="font-medium text-purple-800">Funding Phase</span>
                </div>

                {/* Payment Deadline Timer */}
                {request.paymentDeadline && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-600">⏰</span>
                        <span className="font-medium text-red-700">Payment Deadline</span>
                      </div>
                      <div className="text-center">
                        <PaymentCountdownTimer
                            deadline={request.paymentDeadline}
                            requestId={request.id}
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
                  <p className="text-xs text-purple-600">
                    Cost per person: Rs. {request.rate || 'TBD'}
                  </p>
                </div>

                {userRoles.canPay && (
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Processing Payment...' : `Pay Rs. ${request.rate || '0'}`}
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

        {request.status === 'paid' && (
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
                      {userRoles.isSelectedTeacher && !meetingLink && !request.meetingLink && (
                          <button
                              onClick={handleGenerateMeetingLink}
                              disabled={loading}
                              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mb-2"
                          >
                            {loading ? 'Generating...' : '🎥 Generate Meeting Link & Start Session'}
                          </button>
                      )}

                      {(meetingLink || request.meetingLink) && (
                          <button
                              onClick={handleJoinMeeting}
                              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            🎥 Join Meeting Room
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

        {request.status === 'live' && (
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
                        🎥 Join Live Session
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

        {request.status === 'complete' && (
            <div className="mb-4">
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-600">✅</span>
                  <span className="font-medium text-gray-800">Session Completed</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>👥 Participants: {userRoles.participantsWhoPay.length}</div>
                  <div>💰 Paid Participants: {userRoles.paidCount}</div>
                  <div>👨‍🏫 Teacher: {teacherNames[request.selectedTeacher] || 'Unknown'}</div>
                </div>
              </div>
            </div>
        )}

        {request.status === 'cancelled' && (
            <div className="mb-4">
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600">❌</span>
                  <span className="font-medium text-red-800">Session Cancelled</span>
                </div>
                <p className="text-sm text-red-700">
                  {request.cancellationReason || 'Not enough votes or participants'}
                </p>
              </div>
            </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Duration: {request.duration || 'TBD'}</span>
          <Link
              to={`/requests/details/${request.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </Link>
        </div>
      </div>
  );
};

export default RequestCard;