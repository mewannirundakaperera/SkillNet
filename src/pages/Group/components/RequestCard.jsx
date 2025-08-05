import React, { useState } from "react";

const RequestCard = ({ request, onRequestUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState({ ...request });
  const [showActions, setShowActions] = useState(false);

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
              value={editedRequest.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Request title"
            />
          </div>

          {/* Message */}
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
              value={editedRequest.skills.join(', ')}
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
        </div>
      </div>
    );
  }

  // Display Mode
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative">
      {/* Actions Menu */}
      {showActions && (
        <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 min-w-[120px]">
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
            src={request.avatar}
            alt={request.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{request.title}</h3>
            <p className="text-sm text-gray-600">{request.name} • {request.time}</p>
            <p className="text-xs text-gray-500">in {request.groupName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        {request.message}
      </p>

      {/* Skills */}
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

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>Duration: {request.duration}</span>
        <span>Category: {request.category}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusStyle(request.status)}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full border ${getUrgencyStyle(request.urgency)}`}>
            {request.urgency} priority
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View Details
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Respond
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;