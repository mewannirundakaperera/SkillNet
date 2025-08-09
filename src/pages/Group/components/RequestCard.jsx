import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { groupRequestService } from "@/services/groupRequestService";

const RequestCard = ({ request, onRequestUpdate, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState({ ...request });
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    canVote: false,
    canParticipate: false,
    loading: true
  });

  // Check if current user is the owner of this request
  const isOwner = currentUserId === request.userId || currentUserId === request.createdBy;

  // Check permissions when component mounts or relevant data changes
  useEffect(() => {
    const checkPermissions = async () => {
      if (!currentUserId || isOwner) {
        setPermissions({
          canVote: false,
          canParticipate: false,
          loading: false
        });
        return;
      }

      try {
        setPermissions(prev => ({ ...prev, loading: true }));

        const [votePermission, participatePermission] = await Promise.all([
          groupRequestService.canUserVoteAsync(request, currentUserId),
          groupRequestService.canUserParticipateAsync(request, currentUserId)
        ]);

        setPermissions({
          canVote: votePermission.canVote,
          canParticipate: participatePermission.canParticipate,
          loading: false
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissions({
          canVote: false,
          canParticipate: false,
          loading: false
        });
      }
    };

    checkPermissions();
  }, [currentUserId, request.id, request.status, isOwner]);

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
  const handleSave = () => {
    onRequestUpdate(editedRequest.id, editedRequest);
    setIsEditing(false);
    setShowActions(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditedRequest({ ...request });
    setIsEditing(false);
    setShowActions(false);
  };

  // Change status quickly
  const handleStatusChange = (newStatus) => {
    const updatedRequest = { ...request, status: newStatus };
    onRequestUpdate(request.id, updatedRequest);
    setShowActions(false);
  };

  // Handle voting on request
  const handleVote = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      
      // First check if user can vote (including group membership)
      const votePermission = await groupRequestService.canUserVoteAsync(request, currentUserId);
      if (!votePermission.canVote) {
        alert(votePermission.reason);
        return;
      }

      const hasVoted = request.votes?.includes(currentUserId);
      const result = await groupRequestService.voteOnRequest(request.id, currentUserId, !hasVoted);
      
      if (result.success) {
        // Update the local state
        const newVotes = hasVoted 
          ? request.votes?.filter(id => id !== currentUserId) || []
          : [...(request.votes || []), currentUserId];
        
        const updatedRequest = {
          ...request,
          votes: newVotes,
          voteCount: newVotes.length
        };

        // Auto-transition to voting_open if enough votes
        if (newVotes.length >= 5 && request.status === 'pending') {
          updatedRequest.status = 'voting_open';
        }

        onRequestUpdate(request.id, updatedRequest);
      } else {
        console.error('Voting failed:', result.message);
        alert(result.message);
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle joining/leaving request
  const handleParticipation = async () => {
    if (!currentUserId || loading) return;

    try {
      setLoading(true);
      
      // First check if user can participate (including group membership)
      const participationPermission = await groupRequestService.canUserParticipateAsync(request, currentUserId);
      if (!participationPermission.canParticipate) {
        alert(participationPermission.reason);
        return;
      }

      const isParticipating = request.participants?.includes(currentUserId);
      const result = isParticipating 
        ? await groupRequestService.leaveRequest(request.id, currentUserId)
        : await groupRequestService.joinRequest(request.id, currentUserId);
      
      if (result.success) {
        // Update the local state
        const newParticipants = isParticipating
          ? request.participants?.filter(id => id !== currentUserId) || []
          : [...(request.participants || []), currentUserId];
        
        const updatedRequest = {
          ...request,
          participants: newParticipants,
          participantCount: newParticipants.length
        };

        // Auto-approve if enough participants
        if (newParticipants.length >= (request.minParticipants || 3) && request.status === 'voting_open') {
          updatedRequest.status = 'accepted';
        }

        onRequestUpdate(request.id, updatedRequest);
      } else {
        console.error('Participation failed:', result.message);
        alert(result.message);
      }
    } catch (error) {
      console.error('Error with participation:', error);
      alert('Failed to update participation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get status styling
  const getStatusStyle = (status) => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-700 border-purple-200';
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

  // Format time
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

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
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Save
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
                  value={editedRequest.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Request title"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                  value={editedRequest.message || editedRequest.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
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
                    value={editedRequest.status || 'active'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                    value={editedRequest.urgency || 'medium'}
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
                    value={editedRequest.rate || ''}
                    onChange={(e) => handleInputChange('rate', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="$25/hour"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                    type="text"
                    value={editedRequest.duration || ''}
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
                  value={(editedRequest.skills || []).join(', ')}
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
                  value={editedRequest.category || ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Programming"
              />
            </div>
          </div>
        </div>
    );
  }

  // Display Mode
  return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow relative h-full flex flex-col">
        {/* Actions Menu - Only show for request owner */}
        {showActions && isOwner && (
            <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 min-w-[120px]">
              <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowActions(false);
                  }}
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

              {['active', 'pending', 'accepted', 'completed', 'cancelled'].map((status) => (
                  <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full px-4 py-1 text-left text-xs hover:bg-gray-50 ${
                          request.status === status ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      disabled={request.status === status}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
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
                src={request.avatar || request.createdByAvatar || `https://ui-avatars.com/api/?name=${request.name || request.createdByName}&background=3b82f6&color=fff`}
                alt={request.name || request.createdByName || 'User'}
                className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{request.title}</h3>
              <p className="text-sm text-gray-600">
                {request.name || request.createdByName} • {formatTimeAgo(request.updatedAt || request.createdAt)}
              </p>
              {request.groupName && (
                  <p className="text-xs text-gray-500">in {request.groupName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {request.rate && (
                <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
              {request.rate}
            </span>
            )}
            {isOwner && (
                <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Actions"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
            )}
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
          {request.message || request.description || 'No description provided'}
        </p>

        {/* Skills */}
        {request.skills && request.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {request.skills.map((skill, index) => (
                  <span
                      key={index}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                  >
              {skill}
            </span>
              ))}
            </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>Duration: {request.duration || 'Not specified'}</span>
          <span>Category: {request.category || 'General'}</span>
        </div>

        {/* Voting and Participation Section */}
        {!isOwner && (request.status === 'pending' || request.status === 'voting_open') && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            {request.status === 'pending' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Needs Approval</span>
                  <span className="text-sm text-gray-600">{request.voteCount || 0}/5 votes</span>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-2 mb-3">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((request.voteCount || 0) / 5) * 100, 100)}%` }}
                  />
                </div>
                {permissions.canVote && !permissions.loading && (
                  <button
                    onClick={handleVote}
                    disabled={loading}
                    className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                      request.votes?.includes(currentUserId)
                        ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Processing...' : request.votes?.includes(currentUserId) ? '✓ Voted' : 'Vote to Approve'}
                  </button>
                )}
                {!permissions.canVote && !permissions.loading && !isOwner && (
                  <div className="w-full py-2 px-3 rounded-lg bg-gray-100 text-gray-500 text-center text-sm">
                    You must be a group member to vote
                  </div>
                )}
              </div>
            )}

            {request.status === 'voting_open' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Open for Participation</span>
                  <span className="text-sm text-gray-600">{request.participantCount || 0} joined</span>
                </div>
                <div className="flex gap-2">
                  {permissions.canVote && !permissions.loading && (
                    <button
                      onClick={handleVote}
                      disabled={loading}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                        request.votes?.includes(currentUserId)
                          ? 'bg-orange-200 text-orange-800 hover:bg-orange-300'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      } disabled:opacity-50`}
                    >
                      {request.votes?.includes(currentUserId) ? `❤️ ${request.voteCount || 0}` : `👍 Like (${request.voteCount || 0})`}
                    </button>
                  )}
                  {permissions.canParticipate && !permissions.loading && (
                    <button
                      onClick={handleParticipation}
                      disabled={loading}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                        request.participants?.includes(currentUserId)
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      } disabled:opacity-50`}
                    >
                      {loading ? '...' : request.participants?.includes(currentUserId) ? 'Leave' : 'Join Request'}
                    </button>
                  )}
                  {(!permissions.canVote && !permissions.canParticipate) && !permissions.loading && !isOwner && (
                    <div className="w-full py-2 px-3 rounded-lg bg-gray-100 text-gray-500 text-center text-sm">
                      You must be a group member to participate
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Section */}
        {!isOwner && request.status === 'accepted' && request.participants?.includes(currentUserId) && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-center">
              <p className="text-sm text-green-700 font-medium">💰 Payment Required</p>
              <p className="text-xs text-green-600 mb-2">Session approved! Please complete payment to confirm your spot.</p>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                Pay {request.rate || 'Now'}
              </button>
            </div>
          </div>
        )}

        {/* Status info for owner */}
        {isOwner && (request.status === 'pending' || request.status === 'voting_open' || request.status === 'accepted') && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            {request.status === 'pending' && (
              <div className="text-center">
                <p className="text-sm text-blue-700 font-medium">⏳ Awaiting Community Approval</p>
                <p className="text-xs text-blue-600">{request.voteCount || 0}/5 votes received</p>
              </div>
            )}
            {request.status === 'voting_open' && (
              <div className="text-center">
                <p className="text-sm text-blue-700 font-medium">✅ Approved! Members Can Join</p>
                <p className="text-xs text-blue-600">{request.participantCount || 0} members joined</p>
              </div>
            )}
            {request.status === 'accepted' && (
              <div className="text-center">
                <p className="text-sm text-blue-700 font-medium">💰 Collecting Payments</p>
                <p className="text-xs text-blue-600">{request.paidParticipants?.length || 0}/{request.participantCount || 0} participants paid</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusStyle(request.status || 'active')}`}>
            {(request.status || 'active').charAt(0).toUpperCase() + (request.status || 'active').slice(1)}
          </span>
            {request.urgency && (
                <span className={`text-xs px-2 py-1 rounded-full border ${getUrgencyStyle(request.urgency)}`}>
              {request.urgency} priority
            </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
                to={`/requests/details/${request.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Details
            </Link>
            {!isOwner && (
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