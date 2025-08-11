import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserData } from "@/services/authService";
import databaseService from "@/services/databaseService";

export default function CreateRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams(); // For editing existing requests

  // State management
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state with proper field names for the database
  const [formData, setFormData] = useState({
    topic: '',
    title: '', // Will sync with topic
    description: '',
    subject: '',
    preferredDate: '',
    preferredTime: '',
    duration: '60',
    visibility: 'public',
    paymentAmount: '200.00',
    tags: []
  });

  const [errors, setErrors] = useState({});
  const [currentTag, setCurrentTag] = useState('');

  // Available options
  const subjects = [
    'Mathematics', 'Computer Science', 'Physics', 'Chemistry', 'Biology',
    'History', 'English Literature', 'Philosophy', 'Psychology', 'Economics',
    'Art', 'Music', 'Languages', 'Business', 'Engineering', 'Other'
  ];

  const durations = [
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '180', label: '3 hours' }
  ];

  // Load user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const result = await getCurrentUserData(user.id);
        if (result.success) {
          setUserProfile({
            ...user,
            ...result.userData,
            displayName: result.userData.displayName || result.userData.name || user.name || "User",
            avatar: result.userData.avatar || result.userData.photoURL || "https://randomuser.me/api/portraits/men/14.jpg"
          });
        } else {
          setUserProfile({
            ...user,
            displayName: user.name || "User",
            avatar: "https://randomuser.me/api/portraits/men/14.jpg"
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Load existing request if editing
  useEffect(() => {
    if (editId && user?.id) {
      setIsEditing(true);
      // TODO: Load existing request data using integratedRequestService
      console.log('Loading request for editing:', editId);
    }
  }, [editId, user]);

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      preferredDate: defaultDate,
      preferredTime: '10:00'
    }));
  }, []);

  // Handle form input changes with proper field syncing
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Sync topic and title fields for database consistency
      if (field === 'topic') {
        updated.title = value;
      } else if (field === 'title') {
        updated.topic = value;
      }

      return updated;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle adding tags
  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  // Handle removing tags
  const handleRemoveTag = (tagToRemove) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Validate form
  const validateForm = (isPublishing = true) => {
    const newErrors = {};

    // Basic validation for drafts
    if (!formData.topic.trim()) {
      newErrors.topic = 'Topic is required';
    }

    // Additional validation for publishing
    if (isPublishing) {
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      }

      if (!formData.subject) {
        newErrors.subject = 'Subject is required';
      }

      if (!formData.preferredDate) {
        newErrors.preferredDate = 'Date is required';
      }

      if (!formData.preferredTime) {
        newErrors.preferredTime = 'Time is required';
      }

      if (!formData.paymentAmount || parseFloat(formData.paymentAmount) < 200) {
        newErrors.paymentAmount = 'Payment amount must be at least Rs.200.00';
      }

      // Validate date is not in the past
      if (formData.preferredDate) {
        const selectedDate = new Date(formData.preferredDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          newErrors.preferredDate = 'Date cannot be in the past';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save as draft (draft status)
  const handleSaveDraft = async () => {
    if (!validateForm(false)) {
      return;
    }

    setDraftSaving(true);

    try {
      // Prepare data for the database with user information
      const requestData = {
        ...formData,
        userName: userProfile?.displayName || user?.name || 'User',
        userEmail: user?.email || '',
        userAvatar: userProfile?.avatar || user?.photoURL || ''
      };

      const result = await databaseService.createRequest(
          requestData,
          user.id,
          true // isDraft = true
      );

      if (result.success) {
        alert(result.message);
        if (!isEditing) {
          // Navigate to drafts page after creating new draft
          navigate('/requests/drafts');
        }
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setDraftSaving(false);
    }
  };

  // Handle form submission (publish - open status)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(true)) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for the database with user information
      const requestData = {
        ...formData,
        userName: userProfile?.displayName || user?.name || 'User',
        userEmail: user?.email || '',
        userAvatar: userProfile?.avatar || user?.photoURL || ''
      };

      let result;

      if (isEditing) {
        result = await databaseService.updateRequest(editId, requestData, user.id);
      } else {
        result = await databaseService.createRequest(
            requestData,
            user.id,
            false // isDraft = false (published as 'open')
        );
      }

      if (result.success) {
        alert(result.message);
        if (result.requestId) {
          navigate(`/requests/details/${result.requestId}?type=one-to-one`);
        } else {
          navigate('/requests/my-requests');
        }
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error creating/updating request:', error);
      alert('Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate request summary for preview
  const getRequestSummary = () => {
    return {
      topic: formData.topic || 'Untitled Request',
      date: formData.preferredDate ? new Date(formData.preferredDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Not set',
      time: formData.preferredTime || 'Not set',
      payment: formData.paymentAmount ? `Rs.${parseFloat(formData.paymentAmount).toFixed(2)}` : 'Rs.200.00',
      description: formData.description || 'No description provided',
      duration: durations.find(d => d.value === formData.duration)?.label || 'Not specified'
    };
  };

  const summary = getRequestSummary();

  return (
      <div className="bg-slate-900 p-8">
        {/* Main Content */}
        <div className="flex gap-8 max-w-7xl mx-auto w-full">
          {/* Left: Form */}
          <section className="flex-1 flex flex-col gap-6">
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 hover:shadow-2xl transition-all duration-300 mb-6">
              <div className="flex items-center gap-4">
                {userProfile && (
                    <div className="relative">
                      <img
                          src={userProfile.avatar}
                          alt={userProfile.displayName}
                          className="w-12 h-12 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {isEditing ? 'Edit Request' : 'Create New One-to-One Request'}
                  </h1>
                  <p className="text-slate-300 mt-1 font-medium">Share your learning goals and connect with others</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Request Details */}
              <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Request Details</h2>
                    <p className="text-sm text-slate-400">Provide basic information about your request.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">
                      Topic <span className="text-red-400 font-bold">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.topic}
                        onChange={(e) => handleInputChange('topic', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 bg-slate-700 text-white placeholder-slate-400 ${
                            errors.topic
                                ? 'border-red-400 focus:border-red-300 focus:ring-red-900'
                                : 'border-slate-600 focus:border-blue-400 focus:ring-blue-900'
                        }`}
                        placeholder="e.g., Advanced Calculus Review, React Native Workshop"
                    />
                    {errors.topic && <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.topic}
                    </p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">
                      Subject <span className="text-red-400 font-bold">*</span>
                    </label>
                    <select
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 bg-slate-700 text-white border-slate-600 focus:border-blue-400 focus:ring-blue-900 ${
                            errors.subject
                                ? 'border-red-400 focus:border-red-300 focus:ring-red-900'
                                : 'border-slate-600 focus:border-blue-400 focus:ring-blue-900'
                        }`}
                    >
                      <option value="">Select a subject</option>
                      {subjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                    {errors.subject && <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.subject}
                    </p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">
                      Description <span className="text-red-400 font-bold">*</span>
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 resize-none bg-slate-700 text-white placeholder-slate-400 ${
                            errors.description
                                ? 'border-red-400 focus:border-red-300 focus:ring-red-900'
                                : 'border-slate-600 focus:border-blue-400 focus:ring-blue-900'
                        }`}
                        rows={4}
                        placeholder="Provide a detailed description of what you need help with or want to discuss. Include any specific topics, goals, or expectations."
                    />
                    {errors.description && <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.description}
                    </p>}
                  </div>
                </div>
              </div>

              {/* Scheduling Details */}
              <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Scheduling Details</h2>
                    <p className="text-sm text-slate-400">Set the date and time for your request.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">
                      Preferred Date <span className="text-red-400 font-bold">*</span>
                    </label>
                    <input
                        type="date"
                        value={formData.preferredDate}
                        onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 bg-slate-700 text-white ${
                            errors.preferredDate
                                ? 'border-red-400 focus:border-red-300 focus:ring-red-900'
                                : 'border-slate-600 focus:border-blue-400 focus:ring-blue-900'
                        }`}
                    />
                    {errors.preferredDate && <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.preferredDate}
                    </p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">
                      Preferred Time <span className="text-red-400 font-bold">*</span>
                    </label>
                    <input
                        type="time"
                        value={formData.preferredTime}
                        onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 bg-slate-700 text-white ${
                            errors.preferredTime
                                ? 'border-red-400 focus:border-red-300 focus:ring-red-900'
                                : 'border-slate-600 focus:border-blue-400 focus:ring-blue-900'
                        }`}
                    />
                    {errors.preferredTime && <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.preferredTime}
                    </p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-200">Duration</label>
                  <select
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      className="w-full border-2 border-slate-600 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 focus:border-blue-400 bg-slate-700 text-white"
                  >
                    {durations.map(duration => (
                        <option key={duration.value} value={duration.value}>{duration.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Payment Information</h2>
                    <p className="text-sm text-slate-400">Set the payment amount for this request.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-200">
                    Payment Amount (LKR) <span className="text-red-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm font-medium">Rs.</span>
                    <input
                        type="number"
                        min="200"
                        step="0.01"
                        value={formData.paymentAmount}
                        onChange={(e) => handleInputChange('paymentAmount', e.target.value)}
                        className={`w-full border-2 rounded-xl pl-12 pr-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 bg-slate-700 text-white placeholder-slate-400 ${
                            errors.paymentAmount
                                ? 'border-red-400 focus:border-red-300 focus:ring-red-900'
                                : 'border-slate-600 focus:border-blue-400 focus:ring-blue-900'
                        }`}
                        placeholder="200.00"
                    />
                  </div>
                  {errors.paymentAmount && <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.paymentAmount}
                  </p>}
                                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Minimum amount: Rs.200.00
                    </p>
                </div>
              </div>

              {/* Additional Options */}
              <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Additional Options</h2>
                    <p className="text-sm text-slate-400">Customize settings for your request.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">Request Visibility</label>
                    <select
                        value={formData.visibility}
                        onChange={(e) => handleInputChange('visibility', e.target.value)}
                        className="w-full border-2 border-slate-600 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 focus:border-blue-400 bg-slate-700 text-white"
                    >
                      <option value="public">Public (Visible to all students)</option>
                      <option value="private">Private (Only invited students)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-200">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags.map((tag, index) => (
                          <span key={index} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                        {tag}
                            <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="text-white hover:text-blue-200 transition-colors"
                            >
                          ×
                        </button>
                      </span>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <input
                          type="text"
                          value={currentTag}
                          onChange={(e) => setCurrentTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          className="flex-1 border-2 border-slate-600 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900 focus:border-blue-400 bg-slate-700 text-white placeholder-slate-400"
                          placeholder="Add tags (e.g., beginner, advanced, exam-prep)"
                      />
                      <button
                          type="button"
                          onClick={handleAddTag}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl px-6 py-3 text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-between mt-8 p-6 bg-slate-800 rounded-2xl border border-slate-700">
                <div className="flex gap-3">
                  <Link
                      to="/requests/my-requests"
                      className="border-2 border-slate-600 rounded-xl px-6 py-3 font-semibold text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200"
                  >
                    Cancel
                  </Link>
                  <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={draftSaving}
                      className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl px-6 py-3 font-semibold hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {draftSaving ? "Saving..." : "Save Draft"}
                  </button>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl px-8 py-3 font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? "Publishing..." : isEditing ? "Update Request" : "Publish Request"}
                </button>
              </div>
            </form>
          </section>

          {/* Right: Summary & Tips */}
          <aside className="w-96 flex flex-col gap-6">
            {/* Enhanced Request Summary */}
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Request Preview</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-xl">
                  <span className="font-semibold text-slate-300 min-w-0">Topic:</span>
                  <span className="flex-1 text-slate-200 font-medium">{summary.topic}</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-xl">
                  <span className="font-semibold text-slate-300 min-w-0">Subject:</span>
                  <span className="flex-1 text-slate-200 font-medium">{formData.subject || 'Not selected'}</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-xl">
                  <span className="font-semibold text-slate-300 min-w-0">Date:</span>
                  <span className="flex-1 text-slate-200 font-medium">{summary.date}</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-xl">
                  <span className="font-semibold text-slate-300 min-w-0">Time:</span>
                  <span className="flex-1 text-slate-200 font-medium">{summary.time}</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-xl">
                  <span className="font-semibold text-slate-300 min-w-0">Duration:</span>
                  <span className="flex-1 text-slate-200 font-medium">{summary.duration}</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-orange-900 to-red-900 rounded-xl border border-orange-700">
                  <span className="font-semibold text-orange-300 min-w-0">Payment:</span>
                  <span className="flex-1 text-orange-200 font-bold">{summary.payment}</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-xl">
                  <span className="font-semibold text-slate-300 min-w-0">Description:</span>
                  <span className="flex-1 text-slate-300 text-xs leading-relaxed">{summary.description}</span>
                </div>
                {formData.tags.length > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-xl">
                      <span className="font-semibold text-slate-300 min-w-0">Tags:</span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {formData.tags.map((tag, index) => (
                            <span key={index} className="bg-slate-600 text-slate-200 px-2 py-1 rounded-lg text-xs font-medium">
                        {tag}
                      </span>
                        ))}
                      </div>
                    </div>
                )}
              </div>
            </div>

            {/* Flow Status Info */}
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-lg font-bold text-white mb-4">Request Flow</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg border border-slate-600">
                  <span className="text-yellow-200">Draft - Save and edit later</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg border border-slate-600">
                  <span className="text-green-200">Open - Visible to others</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg border border-slate-600">
                  <span className="text-blue-200">Active - Accepted with meeting</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg border border-slate-600">
                  <span className="text-purple-200">Completed - Session finished</span>
                </div>
              </div>
            </div>

            {/* Tips for Great Requests */}
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Tips for Great Requests</h3>
              </div>
              <ol className="list-decimal list-inside text-sm text-slate-300 space-y-3">
                <li className="p-2 bg-slate-800 rounded-lg border-l-4 border-slate-500">
                  <strong className="text-slate-200">Be Specific:</strong>
                  <span className="text-slate-300"> Clearly state your learning goals and what you need help with.</span>
                </li>
                <li className="p-2 bg-slate-800 rounded-lg border-l-4 border-slate-500">
                  <strong className="text-slate-200">Set Realistic Expectations:</strong>
                  <span className="text-slate-300"> Define the scope and difficulty level appropriately.</span>
                </li>
                <li className="p-2 bg-slate-800 rounded-lg border-l-4 border-slate-500">
                  <strong className="text-slate-200">Plan Ahead:</strong>
                  <span className="text-slate-300"> Schedule with enough time for participants to prepare.</span>
                </li>
                <li className="p-2 bg-slate-800 rounded-lg border-l-4 border-slate-500">
                  <strong className="text-slate-200">Use Tags:</strong>
                  <span className="text-slate-300"> Help others find your request with relevant keywords.</span>
                </li>
                <li className="p-2 bg-slate-800 rounded-lg border-l-4 border-slate-500">
                  <strong className="text-slate-200">Save Drafts:</strong>
                  <span className="text-slate-300"> Use "Save Draft" to work on your request over time.</span>
                </li>
              </ol>
            </div>

            {/* User Stats */}
            {userProfile && (
                <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 border border-blue-700 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <img
                          src={userProfile.avatar}
                          alt={userProfile.displayName}
                          className="w-12 h-12 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <div className="font-bold text-white">{userProfile.displayName}</div>
                      <div className="text-xs text-slate-300">{userProfile.email}</div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-200 bg-blue-800 p-3 rounded-xl border border-blue-600">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-300 text-lg">💡</span>
                      <div>
                        <strong>Tip:</strong> Your profile information will be visible to participants.
                        Make sure your profile is complete to attract more responses.
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </aside>
        </div>
      </div>
  );
}