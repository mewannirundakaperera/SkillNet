import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, arrayUnion, increment, serverTimestamp } from 'firebase/firestore';
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
        
        // Auto-transition to 'paid' state when funding countdown expires
        if (onRequestUpdate && requestId) {
          try {
            const result = await groupRequestService.updateGroupRequest(requestId, {
              status: 'paid',
              updatedAt: new Date(),
              fundingDeadlineExpiredAt: new Date()
            }, currentUserId);
            
            if (result.success) {
              // Generate conference link automatically when status becomes 'paid'
              try {
                const mockLink = `https://meet.skillnet.com/session/${requestId}`;
                await groupRequestService.updateGroupRequest(requestId, {
                  conferenceLink: mockLink,
                  linkGeneratedAt: new Date()
                }, currentUserId);
                
                // Update the request with both status and conference link
                onRequestUpdate(requestId, {
                  status: 'paid',
                  fundingDeadlineExpiredAt: new Date(),
                  conferenceLink: mockLink,
                  linkGeneratedAt: new Date()
                });
              } catch (linkError) {
                console.error('Error generating conference link:', linkError);
                // Still update the status even if link generation fails
                onRequestUpdate(requestId, {
                  status: 'paid',
                  fundingDeadlineExpiredAt: new Date()
                });
              }
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
        ✅ Funding deadline reached - Request is now ready for session!
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
  const [timeUntilSession, setTimeUntilSession] = useState(null);
  const [conferenceLink, setConferenceLink] = useState(null);
      const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState({ ...request });
  const [showActions, setShowActions] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherNames, setTeacherNames] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  const [paymentDeadline, setPaymentDeadline] = useState('');

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

  // Generate conference link (mock implementation)
  const generateConferenceLink = async () => {
    try {
      // In real app, integrate with Zoom/Google Meet/Jitsi API
      const mockLink = `https://meet.skillnet.com/session/${request.id}`;
      setConferenceLink(mockLink);

      // Update request with conference link
      const result = await groupRequestService.updateGroupRequest(request.id, {
        conferenceLink: mockLink,
        linkGeneratedAt: new Date()
      }, currentUserId);
      
      if (!result.success) {
        console.error('❌ Conference link update failed:', result.message);
      }
    } catch (error) {
      console.error('Error generating conference link:', error);
    }
  };

  // Handle input changes during editing
  const handleInputChange = (field, value) => {
    setEditedRequest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle skills array updates
  const handleSkillsChange = (skillsString) => {
    const skillsArray = skillsString.split(',').map(skill => skill.trim()).filter(skill => skill);
    setEditedRequest(prev => ({
      ...prev,
      skills: skillsArray
    }));
  };

  // Save changes
  const handleSave = async () => {
    try {
      setLoading(true);
      const result = await groupRequestService.updateGroupRequest(request.id, {
        ...editedRequest,
        updatedAt: new Date()
      }, currentUserId);
      
      if (result.success) {
        onRequestUpdate?.(editedRequest.id, editedRequest);
        setIsEditing(false);
        setShowActions(false);
      } else {
        console.error('❌ Save failed:', result.message);
        alert(result.message || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving request:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditedRequest({ ...request });
    setIsEditing(false);
    setShowActions(false);
  };

  // Update request status
  const updateRequestStatus = async (newStatus, reason = null) => {
    try {
      setLoading(true);
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (reason) {
        updateData.cancellationReason = reason;
        updateData.cancelledAt = new Date();
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

  // Change status quickly
  const handleStatusChange = (newStatus) => {
    updateRequestStatus(newStatus);
    setShowActions(false);
  };

  // Handle voting
  const handleVote = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const hasVoted = request.votes?.includes(currentUserId);

      let updateData;
      if (hasVoted) {
        // Remove vote
        updateData = {
          votes: request.votes?.filter(id => id !== currentUserId) || [],
          voteCount: (request.voteCount || 1) - 1,
          updatedAt: new Date()
        };

        // Also remove from participants if they were added as a voter
        const existingParticipants = request.participants || [];
        const newParticipants = existingParticipants.filter(id => id !== currentUserId);
        updateData.participants = newParticipants;
        updateData.participantCount = newParticipants.length;
      } else {
        // Add vote
        updateData = {
          votes: [...(request.votes || []), currentUserId],
          voteCount: (request.voteCount || 0) + 1,
          updatedAt: new Date()
        };

        // Automatically add voter as participant
        const existingParticipants = request.participants || [];
        if (!existingParticipants.includes(currentUserId)) {
          updateData.participants = [...existingParticipants, currentUserId];
          updateData.participantCount = (request.participantCount || 0) + 1;
        }

        // Check if we reached 5 votes to change status
        const newVoteCount = (request.voteCount || 0) + 1;
        if (newVoteCount >= 5 && request.status === 'pending') {
          updateData.status = 'voting_open';
          
          // Ensure all voters are participants
          const allVoters = [...(request.votes || []), currentUserId];
          const requestCreator = request.userId || request.createdBy;
          
          // Add all voters as participants (excluding if already there)
          const newParticipants = [...new Set([...updateData.participants || [], ...allVoters])];
          
          // Add request creator if not already a participant
          if (requestCreator && !newParticipants.includes(requestCreator)) {
            newParticipants.push(requestCreator);
          }
          
          updateData.participants = newParticipants;
          updateData.participantCount = newParticipants.length;
        }
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      
      if (result.success) {
        // Update local state
        const newVotes = updateData.votes;
        const newVoteCount = updateData.voteCount;
        const newStatus = updateData.status || request.status;
        const newParticipants = updateData.participants;
        const newParticipantCount = updateData.participantCount;

        onRequestUpdate?.(request.id, {
          ...request,
          votes: newVotes,
          voteCount: newVoteCount,
          status: newStatus,
          participants: newParticipants,
          participantCount: newParticipantCount
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

  // Handle accept/cancel participation (voting)
  const handleParticipation = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const isParticipating = request.participants?.includes(currentUserId);

      let updateData;
      if (isParticipating) {
        // Cancel participation
        updateData = {
          participants: request.participants?.filter(id => id !== currentUserId) || [],
          participantCount: (request.participantCount || 1) - 1,
          updatedAt: new Date()
        };
      } else {
        // Accept participation
        updateData = {
          participants: [...(request.participants || []), currentUserId],
          participantCount: (request.participantCount || 0) + 1,
          updatedAt: new Date()
        };
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      
      if (result.success) {
        // Update local state
        const newParticipants = updateData.participants;
        const newParticipantCount = updateData.participantCount;

        onRequestUpdate?.(request.id, {
          ...request,
          participants: newParticipants,
          participantCount: newParticipantCount
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
  }

  // Handle accept/cancel teaching participation
  const handleTeachingParticipation = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const isCurrentlyTeaching = request.teachers?.includes(currentUserId);

      let updateData;
      if (isCurrentlyTeaching) {
        // Cancel teaching
        updateData = {
          teachers: request.teachers?.filter(id => id !== currentUserId) || [],
          teacherCount: Math.max((request.teacherCount || 1) - 1, 0),
          updatedAt: new Date()
        };

        // If no more teachers, change status back to voting_open
        if (updateData.teacherCount === 0) {
          updateData.status = 'voting_open';
          updateData.statusChangedAt = new Date();
        }

        console.log('🔄 Canceling teaching role for user:', currentUserId);
      } else {
        // Accept teaching
        updateData = {
          teachers: [...(request.teachers || []), currentUserId],
          teacherCount: (request.teacherCount || 0) + 1,
          updatedAt: new Date()
        };

        // Change status to accepted when first teacher joins (if coming from voting_open)
        if (request.status === 'voting_open') {
          updateData.status = 'accepted';
          updateData.statusChangedAt = new Date();
        }

        console.log('🎯 Adding teaching role for user:', currentUserId);
      }

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      
      if (result.success) {
        // Update local state
        const newTeachers = updateData.teachers;
        const newStatus = updateData.status || request.status;
        const newTeacherCount = updateData.teacherCount;

        onRequestUpdate?.(request.id, {
          ...request,
          teachers: newTeachers,
          teacherCount: newTeacherCount,
          status: newStatus
        });

        // Show success message
        if (isCurrentlyTeaching) {
          alert('✅ Teaching role cancelled successfully!');
        } else {
          alert('🎯 You are now teaching this session!');
        }
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
  }

  // Handle payment (mock implementation)
  const handlePayment = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      // Mock payment process
      const paymentAmount = parseFloat(request.rate?.replace(/[^0-9.-]+/g,"") || "0");

      // In real app, integrate with payment gateway
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate payment processing

      const updateData = {
        paidParticipants: arrayUnion(currentUserId),
        totalPaid: increment(paymentAmount),
        updatedAt: serverTimestamp()
      };

      // Check if payment is complete
      const newPaidCount = (request.paidParticipants?.length || 0) + 1;
      const requiredPayments = request.participantCount || 1;

      if (newPaidCount >= requiredPayments) {
        updateData.status = 'payment_complete';
        updateData.paymentCompletedAt = serverTimestamp();
      }

      // Use groupRequestService instead of direct database access
      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      
      if (result.success) {
        const newPaidParticipants = [...(request.paidParticipants || []), currentUserId];
        onRequestUpdate?.(request.id, {
          ...request,
          paidParticipants: newPaidParticipants,
          status: newPaidParticipants.length >= requiredPayments ? 'payment_complete' : request.status
        });
        alert('Payment successful!');
      } else {
        alert(result.message || 'Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get status styling
  const getStatusStyle = (status) => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'voting_open':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'funding':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'paid':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'payment_complete':
        return 'bg-yellow-200 text-yellow-800 border-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-gray-200 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get urgency styling
  const getUrgencyStyle = (urgency) => {
    switch(urgency) {
      case 'high':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'medium':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'low':
        return 'bg-green-50 text-green-600 border-green-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Get card styling based on status
  const getCardStyling = () => {
    switch (request.status) {
      case 'pending':
        return {
          borderColor: 'border-yellow-300',
          bgColor: 'bg-yellow-50',
          statusColor: 'bg-yellow-100 text-yellow-700'
        };
      case 'voting_open':
        return {
          borderColor: 'border-orange-300',
          bgColor: 'bg-orange-50',
          statusColor: 'bg-orange-100 text-orange-700'
        };

      case 'accepted':
        return {
          borderColor: 'border-green-300',
          bgColor: 'bg-green-50',
          statusColor: 'bg-green-100 text-green-700'
        };
      case 'funding':
        return {
          borderColor: 'border-purple-300',
          bgColor: 'bg-purple-50',
          statusColor: 'bg-purple-100 text-purple-700'
        };
      case 'paid':
        return {
          borderColor: 'border-blue-300',
          bgColor: 'bg-blue-50',
          statusColor: 'bg-blue-100 text-blue-700'
        };
      case 'payment_complete':
        return {
          borderColor: 'border-yellow-400',
          bgColor: 'bg-yellow-100',
          statusColor: 'bg-yellow-200 text-yellow-800'
        };
      case 'in_progress':
        return {
          borderColor: 'border-blue-400',
          bgColor: 'bg-blue-50',
          statusColor: 'bg-blue-100 text-blue-700'
        };
      case 'completed':
        return {
          borderColor: 'border-gray-600',
          bgColor: 'bg-gray-100',
          statusColor: 'bg-gray-200 text-gray-800'
        };
      case 'cancelled':
        return {
          borderColor: 'border-red-400',
          bgColor: 'bg-red-50',
          statusColor: 'bg-red-100 text-red-700'
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
  
  // Calculate correct participant count including voters
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
  
  // Ensure all data is properly fetched from database with fallbacks
  const voteCount = request.voteCount || request.votes?.length || 0;
  const teacherCount = request.teacherCount || request.teachers?.length || 0;
  const participantCount = request.participantCount || request.participants?.length || 0;
  
  // Debug logging for participant count calculation
  if (request.status === 'funding' || request.status === 'accepted') {
    console.log('👥 Participant Count Debug:', {
      requestId: request.id,
      status: request.status,
      participantCount,
      participantsArray: request.participants,
      participantsLength: request.participants?.length,
      votes: request.votes,
      voteCount: request.voteCount,
      votesLength: request.votes?.length,
      requestCreator: request.userId || request.createdBy,
      correctParticipantCount,
      expectedPaymentCount: correctParticipantCount,
      actualPaymentCount: paidCount,
      pendingPaymentCount: expectedPaymentCount - actualPaymentCount,
      calculatedCount: Math.max(request.participantCount || 0, request.participants?.length || 0, request.votes?.length || 0)
    });
  }
  
  // Payment data from database
  const paidParticipants = Array.isArray(request.paidParticipants) ? request.paidParticipants : [];
  const paidCount = paidParticipants.length;
  const hasPaid = paidParticipants.includes(currentUserId);
  
  // Calculate expected payment count (all participants should pay)
  const expectedPaymentCount = correctParticipantCount;
  
  // Calculate actual payment count (those who have completed payment)
  const actualPaymentCount = paidCount;
  
  // Calculate pending payment count
  const pendingPaymentCount = expectedPaymentCount - actualPaymentCount;
  
  // User status from database
  const hasVoted = request.votes?.includes(currentUserId) || false;
  const isTeaching = request.teachers?.includes(currentUserId) || false;
  const isParticipating = request.participants?.includes(currentUserId) || false;
  
  // Debug logging for payment data
  if (request.status === 'funding') {
    console.log('💰 Funding State Data:', {
      requestId: request.id,
      participantCount,
      expectedPaymentCount,
      actualPaymentCount,
      pendingPaymentCount,
      paidParticipants,
      rate: request.rate,
      totalPaid: request.totalPaid
    });
  }

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

  // Check if current user is owner
  useEffect(() => {
    setIsOwner(currentUserId === request.userId || currentUserId === request.createdBy);
  }, [currentUserId, request.userId, request.createdBy]);

  // Ensure payment data is properly synced from database
  useEffect(() => {
    if (request && request.id) {
      // Update local state when request data changes
      setEditedRequest({ ...request });
      
      // Ensure all payment-related fields are properly initialized
      if (request.paidParticipants && !Array.isArray(request.paidParticipants)) {
        console.warn('⚠️ paidParticipants is not an array:', request.paidParticipants);
      }
      if (request.participants && !Array.isArray(request.participants)) {
        console.warn('⚠️ participants is not an array:', request.participants);
      }
      if (request.teachers && !Array.isArray(request.teachers)) {
        console.warn('⚠️ teachers is not an array:', request.teachers);
      }
    }
  }, [request]);

  // Handle teacher selection and confirmation
  const handleTeacherSelection = async () => {
    if (!selectedTeacher || !paymentDeadline || !isOwner) return;
    
    try {
      setLoading(true);
      
      // Calculate payment deadline timestamp
      const deadlineHours = parseInt(paymentDeadline);
      const paymentDeadlineTime = new Date(Date.now() + (deadlineHours * 60 * 60 * 1000));
      
      // Ensure all voters are included as participants
      const allVoters = request.votes || [];
      const existingParticipants = request.participants || [];
      const requestCreator = request.userId || request.createdBy;
      
      // Combine voters, existing participants, and request creator
      const allParticipants = [...new Set([...existingParticipants, ...allVoters])];
      if (requestCreator && !allParticipants.includes(requestCreator)) {
        allParticipants.push(requestCreator);
      }
      
      const updateData = {
        selectedTeacher: selectedTeacher,
        status: 'funding',
        paymentDeadline: paymentDeadlineTime,
        paymentDeadlineHours: deadlineHours,
        participants: allParticipants,
        participantCount: allParticipants.length,
        updatedAt: new Date()
      };
      
      console.log('🎯 Teacher Selection - Ensuring all voters are participants:', {
        voters: allVoters,
        existingParticipants,
        allParticipants,
        participantCount: allParticipants.length
      });
      
      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          selectedTeacher: selectedTeacher,
          status: 'funding',
          paymentDeadline: paymentDeadlineTime,
          paymentDeadlineHours: deadlineHours,
          participants: allParticipants,
          participantCount: allParticipants.length
        });
        setSelectedTeacher('');
        setPaymentDeadline('');
        alert(`Teacher ${teacherNames[selectedTeacher] || selectedTeacher} has been selected! Payment deadline set to ${deadlineHours} hour(s). All ${allParticipants.length} participants (including voters) are now required to pay.`);
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

  const handleCancelRequest = async () => {
    if (!currentUserId || loading || !isOwner) return;

    const reason = prompt('Please provide a reason for cancelling this request:');
    if (!reason) return;

    if (!window.confirm('Are you sure you want to cancel this request? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: currentUserId,
        updatedAt: new Date()
      };

      const result = await groupRequestService.updateGroupRequest(request.id, updateData, currentUserId);
      
      if (result.success) {
        onRequestUpdate?.(request.id, {
          ...request,
          ...updateData
        });
        alert('✅ Request cancelled successfully');
      } else {
        alert(result.message || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Failed to cancel request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get user's role in this request
  const getUserRole = () => {
    if (currentUserId === request.userId || currentUserId === request.createdBy) {
      return { role: 'owner', label: '👑 Owner', color: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    if (request.selectedTeacher === currentUserId) {
      return { role: 'teacher', label: '🎯 Confirmed Teacher', color: 'bg-green-100 text-green-700 border-green-200' };
    }
    if (request.teachers && request.teachers.includes(currentUserId)) {
      return { role: 'teacher_candidate', label: '👨‍🏫 Teacher Candidate', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (request.votes && request.votes.includes(currentUserId)) {
      return { role: 'voter', label: '🗳️ Voter & Participant', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    }
    if (request.participants && request.participants.includes(currentUserId)) {
      return { role: 'participant', label: '👥 Participant', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    }
    return { role: 'viewer', label: '👁️ Viewer', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  const userRole = getUserRole();

  if (isEditing) {
    return (
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-300 p-6">
          {/* Edit Mode Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              ✏️ Editing
            </span>
            </div>
            <div className="flex gap-2">
              <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                  onClick={handleCancel}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                  type="text"
                  value={editedRequest.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Request title"
              />
            </div>

            {/* Message/Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                  value={editedRequest.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Request description"
              />
            </div>

            {/* Status and Urgency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                    value={editedRequest.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="voting_open">Voting Open</option>
                  <option value="accepted">Accepted</option>
                  <option value="payment_complete">Payment Complete</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                    value={editedRequest.urgency}
                    onChange={(e) => handleInputChange('urgency', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Rate and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                <input
                    type="number"
                    value={editedRequest.rate}
                    onChange={(e) => handleInputChange('rate', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rs. 2500/hour"
                    min="0"
                    step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                    type="text"
                    value={editedRequest.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1-2 hours"
                />
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
              <input
                  type="text"
                  value={editedRequest.skills?.join(', ') || ''}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="React, JavaScript, UI/UX"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                  type="text"
                  value={editedRequest.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Programming"
              />
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
              <input
                  type="number"
                  value={editedRequest.maxParticipants || ''}
                  onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                  min="1"
              />
            </div>
          </div>
        </div>
    );
  }

  // Display Mode
  return (
      <div className={`rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-all relative ${styling.borderColor} ${styling.bgColor}`}>
        {/* Actions Menu */}
        {showActions && (
            <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 min-w-[140px]">
              <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Request
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              <div className="px-4 py-1">
                <span className="text-xs text-gray-500 font-medium">Change Status:</span>
              </div>

              {['pending', 'voting_open', 'accepted', 'payment_complete', 'in_progress', 'completed', 'cancelled'].map((status) => (
                  <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full px-4 py-1 text-left text-xs hover:bg-gray-50 ${
                          request.status === status ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      disabled={request.status === status || loading}
                  >
                    {status === 'voting_open' ? 'Voting Open' :
                        status === 'payment_complete' ? 'Payment Complete' :
                            status === 'in_progress' ? 'In Progress' :
                                status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
              ))}

              <div className="border-t border-gray-100 my-1"></div>

              <button
                  onClick={() => setShowActions(false)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-500"
              >
                Close Menu
              </button>
            </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <img
                src={request.createdByAvatar || request.avatar}
                alt={request.createdByName || request.name}
                className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{request.title}</h3>
              <p className="text-sm text-gray-600">
                {request.createdByName || request.name} • {request.time} •
                {request.sessionType === 'group-session' ? ' Group Session' : ' Individual'}
              </p>
              <p className="text-xs text-gray-500">in {request.groupName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {request.rate && (
                <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
              {request.rate}
            </span>
            )}
            <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Actions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Role Identification */}
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${userRole.color} font-medium text-sm`}>
            {userRole.label}
            {userRole.role === 'owner' && (
              <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                Creator
              </span>
            )}
            {userRole.role === 'teacher' && (
              <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                Selected
              </span>
            )}
            {userRole.role === 'teacher_candidate' && (
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                Applied
              </span>
            )}
            {userRole.role === 'voter' && (
              <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                Auto-Participant
              </span>
            )}
            {userRole.role === 'participant' && (
              <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">
                Joined
              </span>
            )}
          </div>
        </div>

        {/* Count Validation Banner */}
        {(request.status === 'funding' || request.status === 'accepted') && (
          <div className={`mb-4 p-3 rounded-lg border ${
            expectedPaymentCount >= 6 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {expectedPaymentCount >= 6 ? '✅' : '⚠️'}
              </span>
              <span className="font-medium">
                {expectedPaymentCount >= 6 ? 'Counts Valid' : 'Counts Need Migration'}
              </span>
            </div>
            <div className="text-sm space-y-1">
              <div>• Expected Participants: <strong>{expectedPaymentCount}</strong> (Owner + Voters + Additional)</div>
              <div>• Database Participants: <strong>{request.participants?.length || 0}</strong></div>
              <div>• Database Votes: <strong>{request.votes?.length || 0}</strong></div>
              <div>• Database Owner: <strong>{request.userId || request.createdBy ? 'Present' : 'Missing'}</strong></div>
              <div>• Minimum Required: <strong>6</strong> (1 Owner + 5 Voters)</div>
              {expectedPaymentCount < 6 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                  ⚠️ This request needs database migration to include voters and owner as participants
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
          {request.message || request.description}
        </p>

        {/* Skills */}
        {request.skills && request.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {request.skills.map((skill, index) => (
                  <span
                      key={index}
                      className="text-xs bg-white text-gray-700 px-2 py-1 rounded-full border"
                  >
              {skill}
            </span>
              ))}
            </div>
        )}

        {/* State-specific content */}
        {request.status === 'pending' && (
            <div className="mb-4">
              {/* Current User Role Information */}
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-700 mb-2">
                  🎭 <strong>Your Role in This Session:</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${userRole.color}`}>
                      {userRole.label}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600">
                    {userRole.role === 'owner' && 'You created this session and are waiting for votes'}
                    {userRole.role === 'teacher' && 'You can apply to teach this session'}
                    {userRole.role === 'teacher_candidate' && 'You can apply to teach this session'}
                    {userRole.role === 'voter' && 'You voted and are automatically a participant'}
                    {userRole.role === 'participant' && 'You joined as a participant'}
                    {userRole.role === 'viewer' && 'You can vote to approve this session'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Needs approval votes</span>
                <span className="text-sm text-gray-600">{voteCount}/5 votes</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2 mb-3">
                <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((voteCount / 5) * 100, 100)}%` }}
                />
              </div>
              <button
                  onClick={handleVote}
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                      hasVoted
                          ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : hasVoted ? '✓ Voted' : 'Vote to Approve'}
              </button>
              
              {/* Info about voting making you a participant */}
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-600">
                  💡 <strong>Note:</strong> Voting automatically makes you a participant in this session
                </p>
              </div>
            </div>
        )}

        {request.status === 'voting_open' && (
            <div className="mb-4">
              {/* Current User Role Information */}
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-700 mb-2">
                  🎭 <strong>Your Role in This Session:</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${userRole.color}`}>
                      {userRole.label}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600">
                    {userRole.role === 'owner' && 'You created this session and are waiting for votes'}
                    {userRole.role === 'teacher' && 'You can apply to teach this session'}
                    {userRole.role === 'teacher_candidate' && 'You can apply to teach this session'}
                    {userRole.role === 'voter' && 'You voted and are automatically a participant'}
                    {userRole.role === 'participant' && 'You joined as a participant'}
                    {userRole.role === 'viewer' && 'You can vote to approve this session'}
                  </div>
                </div>
              </div>
              
              {/* Participants/Voters Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Participants</span>
                  <span className="text-sm text-gray-600">{participantCount} joined</span>
                </div>
                <div className="flex gap-2">
                  <button
                      onClick={handleVote}
                      disabled={loading}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                          hasVoted
                              ? 'bg-orange-200 text-orange-800 hover:bg-orange-300'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      } disabled:opacity-50`}
                  >
                    {hasVoted ? `❤️ ${voteCount}` : `👍 Like (${voteCount})`}
                  </button>
                  {/* Participation button - Owner excluded since they're automatic participant */}
                  {!isOwner && (
                    <button
                        onClick={handleParticipation}
                        disabled={loading}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                            isParticipating
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                        } disabled:opacity-50`}
                    >
                      {loading ? '...' : isParticipating ? 'Cancel' : 'Accept Request'}
                    </button>
                  )}
                  
                  {/* Owner status message */}
                  {isOwner && (
                    <div className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg text-center text-sm font-medium">
                      👑 Owner (Automatic Participant)
                    </div>
                  )}
                </div>
                
                {/* Info about voting making you a participant */}
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Note:</strong> Voting automatically makes you a participant in this session
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    When a teacher is selected, all voters will be required to complete payment
                  </p>
                </div>
              </div>

              {/* Teachers Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Teachers</span>
                  <span className="text-sm text-gray-600">{teacherCount} joined</span>
                </div>
                
                {/* Want to Teach Button - Only show if not teaching and is not the owner */}
                {!isTeaching && currentUserId !== request.userId && currentUserId !== request.createdBy && (
                    <div className="mt-3">
                      <button
                          onClick={handleTeachingParticipation}
                          disabled={loading}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 border-2 border-green-500"
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
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-700 mb-2">
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
              {/* Current User Role Information */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-700 mb-2">
                  🎭 <strong>Your Role in This Session:</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${userRole.color}`}>
                      {userRole.label}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600">
                    {userRole.role === 'owner' && 'You created this session and can select teachers and set deadlines'}
                    {userRole.role === 'teacher' && 'You are a teacher candidate for this session'}
                    {userRole.role === 'teacher_candidate' && 'You applied to teach this session'}
                    {userRole.role === 'voter' && 'You voted and are automatically a participant'}
                    {userRole.role === 'participant' && 'You joined as a participant'}
                    {userRole.role === 'viewer' && 'You can view this session but have not joined'}
                  </div>
                </div>
              </div>
              
              {/* Teachers Section - Only visible to owner */}
              {isOwner && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                    <span className="text-green-600">👨‍🏫</span>
                    <span className="text-sm font-medium text-green-800">Teachers</span>
                    </div>
                    {/* Cancel Request Button for Owner */}
                    <button
                      onClick={handleCancelRequest}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      title="Cancel this request"
                    >
                      ❌ Cancel Request
                    </button>
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
              {/* Individual Role Buttons - Show only the role that hasn't been chosen yet */}
              {!isOwner && currentUserId !== request.userId && currentUserId !== request.createdBy && (
                <>
                  {/* Show "Join as Participant" button only if user is not participating and not teaching */}
                  {!isParticipating && !isTeaching && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-center mb-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Join as Participant</h4>
                        <p className="text-xs text-blue-600">Participate in this session as a learner</p>
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

                  {/* Show "Want to Teach" button only if user is not teaching, not participating, and not a voter */}
                  {!isTeaching && !isParticipating && !hasVoted && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-center mb-3">
                        <h4 className="text-sm font-medium text-green-800 mb-2">Join as Teacher</h4>
                        <p className="text-xs text-green-600">Mentor and guide participants in this session</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to join as a teacher for this session? You will be responsible for mentoring and guiding participants.')) {
                            handleTeachingParticipation();
                          }
                        }}
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : '🎯 Want to Teach'}
                      </button>
                    </div>
                  )}

                  {/* Show voter status - they are automatically participants */}
                  {hasVoted && !isTeaching && (
                    <div className="mt-4 bg-blue-100 border border-blue-300 rounded-lg p-3">
                      <div className="text-center">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">🗳️ You're a Voter & Participant</h4>
                        <p className="text-xs text-blue-600">You voted to approve this session, so you're automatically a participant</p>
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to leave this session? This will also remove your vote.')) {
                                handleParticipation();
                              }
                            }}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            ❌ Leave Session
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show current role status if user has already chosen one (non-voters) */}
                  {isParticipating && !hasVoted && (
                    <div className="mt-4 bg-blue-100 border border-blue-300 rounded-lg p-3">
                      <div className="text-center">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">✅ You're a Participant</h4>
                        <p className="text-xs text-blue-600">You've joined this session as a participant</p>
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to leave this session as a participant?')) {
                                handleParticipation();
                              }
                            }}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            ❌ Leave Session
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isTeaching && (
                    <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-3">
                      <div className="text-center">
                        <h4 className="text-sm font-medium text-green-800 mb-2">🎯 You're a Teacher</h4>
                        <p className="text-xs text-green-600">You've joined this session as a teacher</p>
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to leave this session as a teacher?')) {
                                handleTeachingParticipation();
                              }
                            }}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            ❌ Leave Session
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Participant Actions - Show for participants */}
                {isParticipating && (
                  <div className="mt-3 pt-2 border-t border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700">Payment Progress</span>
                    <span className="text-sm text-blue-600">{actualPaymentCount}/{expectedPaymentCount} paid</span>
                    </div>
                    
                    {/* Count Validation Display for Accepted State */}
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-xs text-yellow-800 font-medium mb-1">🔍 Count Validation:</div>
                      <div className="text-xs text-yellow-700 space-y-1">
                        <div>• Expected Participants: {expectedPaymentCount} (Owner + Voters + Additional)</div>
                        <div>• Database Participants: {request.participants?.length || 0}</div>
                        <div>• Database Votes: {request.votes?.length || 0}</div>
                        <div>• Status: {expectedPaymentCount >= 6 ? '✅ Valid' : '⚠️ Needs Migration'}</div>
                      </div>
                    </div>

                    {/* Payment Countdown Timer for Accepted State */}
                    {request.paymentDeadline && (
                      <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-orange-600">⏰</span>
                          <span className="text-xs font-medium text-orange-700">Payment Deadline</span>
                        </div>
                        <PaymentCountdownTimer 
                          deadline={request.paymentDeadline} 
                          requestId={request.id}
                          onRequestUpdate={onRequestUpdate}
                          currentUserId={currentUserId}
                        />
                        <div className="text-xs text-orange-600 mt-1">
                          Complete payment before time runs out!
                        </div>
                        <div className="text-xs text-green-600 mt-2 font-medium">
                          💡 When countdown ends: Request automatically changes to "Session Ready" state
                        </div>
                      </div>
                    )}
                    
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                      <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${expectedPaymentCount > 0 ? (actualPaymentCount / expectedPaymentCount) * 100 : 0}%` }}
                      />
                    </div>
                    {!hasPaid && (
                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                        {loading ? 'Processing Payment...' : `Pay Rs. ${request.rate || 'Now'}`}
                        </button>
                    )}
                    {hasPaid && (
                        <div className="text-xs bg-blue-100 text-blue-700 py-2 px-4 rounded-lg text-center font-medium">
                          ✓ Payment Complete - Waiting for others
                        </div>
                    )}
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
                
                {/* Payment Countdown Timer - Prominently displayed in funding header */}
                {request.paymentDeadline ? (
                  <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 text-lg">⏰</span>
                        <span className="text-base font-bold text-red-800">Payment Deadline</span>
                      </div>
                      <span className="text-xs text-red-600 bg-red-200 px-2 py-1 rounded-full">
                        Time Remaining
                      </span>
                    </div>
                    <div className="text-center">
                      <PaymentCountdownTimer 
                        deadline={request.paymentDeadline} 
                        requestId={request.id}
                        onRequestUpdate={onRequestUpdate}
                        currentUserId={currentUserId}
                      />
                    </div>
                    <div className="text-center mt-2">
                      <div className="text-sm text-red-700 font-medium">
                        Complete payment before time runs out!
                      </div>
                      <div className="text-xs text-green-600 mt-1 font-medium">
                        💡 When countdown ends: Request automatically changes to "Session Ready" state
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-100 border-2 border-yellow-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600 text-lg">⚠️</span>
                      <span className="text-base font-bold text-yellow-800">No Payment Deadline Set</span>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-yellow-700 font-medium">
                        ⚠️ No payment deadline set. Please set a deadline to ensure timely payments.
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        The owner needs to select a teacher and set a payment deadline to start the funding phase.
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Explanation of voter-to-participant system */}
                <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded">
                  <div className="text-xs text-purple-700">
                    💡 <strong>Note:</strong> All voters automatically become participants and must complete payment to proceed with the session.
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    👑 <strong>Owner:</strong> Session creator is automatically a participant and must pay.
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    🗳️ <strong>Voters:</strong> All 5 voters are automatically participants and must pay.
                  </div>
                  
                  {/* Count Validation Display */}
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="text-xs text-yellow-800 font-medium mb-1">🔍 Count Validation:</div>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <div>• Expected Participants: {expectedPaymentCount} (Owner + Voters + Additional)</div>
                      <div>• Database Participants: {request.participants?.length || 0}</div>
                      <div>• Database Votes: {request.votes?.length || 0}</div>
                      <div>• Database Owner: {request.userId || request.createdBy ? 'Present' : 'Missing'}</div>
                      <div>• Status: {expectedPaymentCount >= 6 ? '✅ Valid' : '⚠️ Needs Migration'}</div>
                    </div>
                  </div>
                </div>
                
                {/* Participant Summary */}
                <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded">
                  <div className="text-xs text-purple-700 mb-1">
                    📊 <strong>Participant Breakdown:</strong>
                  </div>
                  <div className="text-xs text-purple-600 space-y-1">
                    <div>• Owner: 1 (automatic participant)</div>
                    <div>• Voters: {request.votes?.length || 0} (automatic participants)</div>
                    <div>• Additional Participants: {(request.participants?.length || 0) - (request.votes?.length || 0)}</div>
                    <div>• Total Required: {expectedPaymentCount}</div>
                    <div>• Paid: {actualPaymentCount}</div>
                    <div>• Pending: {pendingPaymentCount}</div>
                  </div>
                </div>



                {/* Role-based UI for different user types */}
                
                {/* Current User Role Information */}
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-xs text-blue-700 mb-2">
                    🎭 <strong>Your Role in This Session:</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${userRole.color}`}>
                        {userRole.label}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600">
                      {userRole.role === 'owner' && 'You created this session and are automatically a participant'}
                      {userRole.role === 'teacher' && 'You are the selected teacher for this session'}
                      {userRole.role === 'teacher_candidate' && 'You applied to teach but another teacher was selected'}
                      {userRole.role === 'voter' && 'You voted and are automatically a participant'}
                      {userRole.role === 'participant' && 'You joined as a participant'}
                      {userRole.role === 'viewer' && 'You can view this session but have not joined'}
                    </div>
                  </div>
                </div>
                
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
                {expectedPaymentCount > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-purple-700 mb-2">
                      {pendingPaymentCount} participant(s) need to complete payment
                    </div>
                    
                    {/* Show voters who are automatically participants */}
                    {request.votes && request.votes.length > 0 && (
                      <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded">
                        <div className="text-xs text-purple-700 mb-1">
                          🗳️ <strong>Voters (Automatically Participants):</strong>
                    </div>
                        <div className="space-y-1">
                          {request.votes.map((voterId, index) => (
                            <div key={index} className="flex items-center justify-between bg-purple-100 rounded px-2 py-1">
                              <span className="text-xs text-purple-700">
                                Voter {index + 1}: {teacherNames[voterId] || voterId}
                              </span>
                              <span className="text-xs text-purple-500">
                                {request.paidParticipants?.includes(voterId) ? '✓ Paid' : '⏳ Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show owner payment status */}
                    <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded">
                      <div className="text-xs text-purple-700 mb-1">
                        👑 <strong>Owner (Automatic Participant):</strong>
                      </div>
                      <div className="flex items-center justify-between bg-purple-100 rounded px-2 py-1">
                        <span className="text-xs text-purple-700">
                          Owner: {teacherNames[request.userId || request.createdBy] || (request.userId || request.createdBy)}
                        </span>
                        <span className="text-xs text-purple-500">
                          {request.paidParticipants?.includes(request.userId || request.createdBy) ? '✓ Paid' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Show all participants */}
                    <div className="space-y-1">
                      {request.participants?.map((participantId, index) => (
                        <div key={index} className="flex items-center justify-between bg-purple-50 rounded px-2 py-1">
                          <span className="text-xs text-purple-600">
                            Participant {index + 1}: {teacherNames[participantId] || participantId}
                            {request.votes?.includes(participantId) && (
                              <span className="ml-1 text-purple-500">(Voter)</span>
                            )}
                          </span>
                          <span className="text-xs text-purple-500">
                            {request.paidParticipants?.includes(participantId) ? '✓ Paid' : '⏳ Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment progress bar - Show actual payment progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-purple-700">Payment Progress</span>
                    <span className="text-xs text-purple-600">
                      {actualPaymentCount}/{expectedPaymentCount} paid
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${expectedPaymentCount > 0 ? (actualPaymentCount / expectedPaymentCount) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    Average cost per participant: Rs. {request.rate || 'TBD'}
                  </div>
                </div>
              </div>
            </div>
        )}

        {request.status === 'paid' && (
            <div className="mb-4">
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600">🎯</span>
                  <span className="text-sm font-medium text-green-800">Session Ready</span>
                </div>
                
                {/* Current User Role Information */}
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-xs text-blue-700 mb-2">
                    🎭 <strong>Your Role in This Session:</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${userRole.color}`}>
                        {userRole.label}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600">
                      {userRole.role === 'owner' && 'You created this session and can start it when ready'}
                      {userRole.role === 'teacher' && 'You are the confirmed teacher for this session'}
                      {userRole.role === 'teacher_candidate' && 'Another teacher was selected for this session'}
                      {userRole.role === 'voter' && 'You voted and are a participant in this session'}
                      {userRole.role === 'participant' && 'You are a participant in this session'}
                      {userRole.role === 'viewer' && 'You can view this session'}
                    </div>
                  </div>
                </div>
                
                {/* Session Status */}
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                  <div className="text-xs text-green-700 mb-1">
                    🎉 <strong>Congratulations!</strong> All payments are complete and the session is ready to begin.
                  </div>
                  <div className="text-xs text-green-600">
                    The funding deadline has been reached and all participants have completed their payments.
                  </div>
                </div>

                {/* Meeting Link Section */}
                {request.conferenceLink ? (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-600">🔗</span>
                      <span className="text-sm font-medium text-blue-800">Jitsi Meeting Room</span>
                    </div>
                    <div className="mb-2">
                      <div className="text-xs text-blue-700 mb-1">
                        Your meeting room is ready! Click the link below to join:
                      </div>
                      <a
                        href={request.conferenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors text-center"
                      >
                        🚀 Join Meeting Room
                      </a>
                    </div>
                    <div className="text-xs text-blue-600 text-center">
                      Link generated on: {request.linkGeneratedAt ? new Date(request.linkGeneratedAt).toLocaleString() : 'Recently'}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600">⚠️</span>
                      <span className="text-sm font-medium text-yellow-800">Meeting Link Pending</span>
                    </div>
                    <div className="text-xs text-yellow-700 text-center">
                      Meeting link is being generated. Please wait a moment...
                    </div>
                  </div>
                )}

                {/* Session Details */}
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                  <div className="text-xs text-green-700 mb-1">
                    📊 <strong>Session Summary:</strong>
                  </div>
                  <div className="text-xs text-green-600 space-y-1">
                    <div>• Total Participants: {expectedPaymentCount}</div>
                    <div>• Confirmed Teacher: {teacherNames[request.selectedTeacher] || request.selectedTeacher}</div>
                    <div>• Session Rate: Rs. {request.rate || 'TBD'}</div>
                    <div>• Status: Ready to begin</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {request.conferenceLink && (
                    <button
                      onClick={() => window.open(request.conferenceLink, '_blank')}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
                    >
                      🎯 Start Session Now
                    </button>
                  )}
                  
                  <button
                    onClick={() => updateRequestStatus('in_progress')}
                    disabled={loading || !request.conferenceLink}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : '📝 Mark Session as Started'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {request.status === 'payment_complete' && (
            <div className="mb-4">
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-600">🕐</span>
                  <span className="text-sm font-medium text-yellow-800">Session starts in:</span>
                </div>
                {timeUntilSession && (
                    <div className="text-lg font-bold text-yellow-800 mb-2">
                      {timeUntilSession.hours}h {timeUntilSession.minutes}m
                    </div>
                )}
                <div className="text-xs text-yellow-700">
                  Scheduled: {new Date(request.scheduledDateTime).toLocaleString()}
                </div>
                {conferenceLink && (
                    <a
                        href={conferenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block w-full bg-yellow-500 text-white text-center py-2 px-4 rounded-lg font-medium text-sm hover:bg-yellow-600 transition-colors"
                    >
                      Join Conference
                    </a>
                )}
              </div>
            </div>
        )}

        {request.status === 'in_progress' && (
            <div className="mb-4">
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-800">Session in Progress</span>
                </div>
                <div className="text-xs text-blue-700 mb-2">
                  Started: {new Date(request.sessionStartedAt || Date.now()).toLocaleString()}
                </div>
                {conferenceLink && isParticipating && (
                    <a
                        href={conferenceLink}
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
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-600">✅</span>
                  <span className="text-sm font-medium text-gray-800">Session Completed</span>
                </div>
                <div className="text-xs text-gray-600">
                  Completed: {new Date(request.completedAt || Date.now()).toLocaleString()}
                </div>
                <button className="mt-2 w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors">
                  Leave Feedback
                </button>
              </div>
            </div>
        )}

        {request.status === 'cancelled' && (
            <div className="mb-4">
              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600">❌</span>
                  <span className="text-sm font-medium text-red-800">Session Cancelled</span>
                </div>
                <div className="text-xs text-red-700">
                  Reason: {request.cancellationReason || 'Not enough participants'}
                </div>
                {request.refundStatus && (
                    <div className="text-xs text-red-600 mt-1">
                      Refund: {request.refundStatus}
                    </div>
                )}
              </div>
            </div>
        )}



        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>Duration: {request.duration || 'TBD'}</span>
          <span>Max: {request.maxParticipants || 1} people</span>
          <span className={`px-2 py-1 rounded-full border ${getUrgencyStyle(request.urgency)}`}>
          {request.urgency || 'medium'} priority
        </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusStyle(request.status)}`}>
            {request.status === 'voting_open' ? 'Voting Open' :
                request.status === 'funding' ? 'Funding Phase' :
                request.status === 'paid' ? 'Session Ready' :
                request.status === 'payment_complete' ? 'Ready to Start' :
                    request.status === 'in_progress' ? 'In Progress' :
                        request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
                to={`/requests/${request.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Details
            </Link>
            {(request.status === 'pending' || request.status === 'voting_open') && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Respond
                </button>
            )}
          </div>
        </div>
      </div>
  );
};

export default RequestCard;