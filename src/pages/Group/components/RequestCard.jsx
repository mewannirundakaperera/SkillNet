import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "@/config/firebase";

const RequestCard = ({ request, currentUserId, onRequestUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [timeUntilSession, setTimeUntilSession] = useState(null);
  const [conferenceLink, setConferenceLink] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState({ ...request });
  const [showActions, setShowActions] = useState(false);

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
      if (db && request.id) {
        await updateDoc(doc(db, 'requests', request.id), {
          conferenceLink: mockLink,
          linkGeneratedAt: serverTimestamp()
        });
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
      if (db && request.id) {
        await updateDoc(doc(db, 'requests', request.id), {
          ...editedRequest,
          updatedAt: serverTimestamp()
        });
      }
      onRequestUpdate?.(editedRequest.id, editedRequest);
      setIsEditing(false);
      setShowActions(false);
    } catch (error) {
      console.error('Error saving request:', error);
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
        updatedAt: serverTimestamp()
      };

      if (reason) {
        updateData.cancellationReason = reason;
        updateData.cancelledAt = serverTimestamp();
      }

      if (db && request.id) {
        await updateDoc(doc(db, 'requests', request.id), updateData);
      }
      onRequestUpdate?.(request.id, { ...request, status: newStatus });
    } catch (error) {
      console.error('Error updating request status:', error);
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
          votes: arrayRemove(currentUserId),
          voteCount: increment(-1),
          updatedAt: serverTimestamp()
        };
      } else {
        // Add vote
        updateData = {
          votes: arrayUnion(currentUserId),
          voteCount: increment(1),
          updatedAt: serverTimestamp()
        };

        // Check if we reached 5 votes to change status
        const newVoteCount = (request.voteCount || 0) + 1;
        if (newVoteCount >= 5 && request.status === 'pending') {
          updateData.status = 'voting_open';
        }
      }

      if (db && request.id) {
        await updateDoc(doc(db, 'requests', request.id), updateData);
      }

      // Update local state
      const newVotes = hasVoted
          ? request.votes?.filter(id => id !== currentUserId) || []
          : [...(request.votes || []), currentUserId];

      onRequestUpdate?.(request.id, {
        ...request,
        votes: newVotes,
        voteCount: newVotes.length,
        status: newVotes.length >= 5 && request.status === 'pending' ? 'voting_open' : request.status
      });
    } catch (error) {
      console.error('Error handling vote:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle accept/cancel participation
  const handleParticipation = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      const isParticipating = request.participants?.includes(currentUserId);

      let updateData;
      if (isParticipating) {
        // Cancel participation
        updateData = {
          participants: arrayRemove(currentUserId),
          participantCount: increment(-1),
          updatedAt: serverTimestamp()
        };

        // If no more participants, change status back to voting_open
        const newParticipantCount = (request.participantCount || 1) - 1;
        if (newParticipantCount === 0) {
          updateData.status = 'voting_open';
        }
      } else {
        // Accept participation
        updateData = {
          participants: arrayUnion(currentUserId),
          participantCount: increment(1),
          updatedAt: serverTimestamp()
        };

        // Change status to accepted when first participant joins (if coming from voting_open)
        if (!request.participants || request.participants.length === 0) {
          if (request.status === 'voting_open') {
            updateData.status = 'accepted';
          } else {
            updateData.status = 'active';
          }
        }
      }

      if (db && request.id) {
        await updateDoc(doc(db, 'requests', request.id), updateData);
      }

      // Update local state
      const newParticipants = isParticipating
          ? request.participants?.filter(id => id !== currentUserId) || []
          : [...(request.participants || []), currentUserId];

      const newStatus = updateData.status || request.status;

      onRequestUpdate?.(request.id, {
        ...request,
        participants: newParticipants,
        participantCount: newParticipants.length,
        status: newStatus
      });
    } catch (error) {
      console.error('Error handling participation:', error);
      alert('Failed to update participation. Please try again.');
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

      if (db && request.id) {
        await updateDoc(doc(db, 'requests', request.id), updateData);
      }

      const newPaidParticipants = [...(request.paidParticipants || []), currentUserId];
      onRequestUpdate?.(request.id, {
        ...request,
        paidParticipants: newPaidParticipants,
        status: newPaidParticipants.length >= requiredPayments ? 'payment_complete' : request.status
      });

      alert('Payment successful!');
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
  const voteCount = request.voteCount || request.votes?.length || 0;
  const participantCount = request.participantCount || request.participants?.length || 0;
  const paidCount = request.paidParticipants?.length || 0;
  const hasVoted = request.votes?.includes(currentUserId);
  const isParticipating = request.participants?.includes(currentUserId);
  const hasPaid = request.paidParticipants?.includes(currentUserId);

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
                    type="text"
                    value={editedRequest.rate}
                    onChange={(e) => handleInputChange('rate', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="$25/hour"
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
            </div>
        )}

        {request.status === 'voting_open' && (
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
              </div>
              
              {/* Want to Teach Button - Only show if not participating and is not the owner */}
              {!isParticipating && currentUserId !== request.userId && currentUserId !== request.createdBy && (
                  <div className="mt-3">
                    <button
                        onClick={handleParticipation}
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
              {isParticipating && !hasPaid && (
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