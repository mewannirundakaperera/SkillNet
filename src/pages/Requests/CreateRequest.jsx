import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { getCurrentUserData } from "@/services/authService";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function CreateRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    topic: '',
    description: '',
    subject: '',
    preferredDate: '',
    preferredTime: '',
    duration: '60', // in minutes
    visibility: 'public', // 'public' or 'private'
    paymentAmount: '200.00', // default minimum amount
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
    { value: '180', label: '3 hours' },
    { value: 'custom', label: 'Custom' }
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

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

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
  const validateForm = () => {
    const newErrors = {};

    if (!formData.topic.trim()) {
      newErrors.topic = 'Topic is required';
    }

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare request data
      const requestData = {
        ...formData,
        userId: user.id,
        userName: userProfile?.displayName || user.name,
        userAvatar: userProfile?.avatar,
        userEmail: user.email,
        status: 'open',
        participants: [],
        participantCount: 0,
        scheduledDate: new Date(formData.preferredDate + 'T' + formData.preferredTime),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        featured: false,
        views: 0,
        likes: 0
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'requests'), requestData);

      alert('Request created successfully!');
      navigate(`/requests/details/${docRef.id}`);

    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request. Please try again.');
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex gap-8 p-8">
        {/* Left: Form */}
        <section className="flex-1 flex flex-col gap-6">
          <div className="flex items-center gap-4 mb-4">
            {userProfile && (
              <img
                src={userProfile.avatar}
                alt={userProfile.displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-100"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">Create New Request</h1>
              <p className="text-gray-500">Share your learning goals and connect with others</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Details */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold mb-1">Request Details</h2>
              <div className="text-xs text-gray-400 mb-4">Provide basic information about your request.</div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => handleInputChange('topic', e.target.value)}
                    className={`w-full border rounded px-3 py-2 text-sm ${errors.topic ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="e.g., Advanced Calculus Review, React Native Workshop"
                  />
                  {errors.topic && <p className="text-red-500 text-xs mt-1">{errors.topic}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className={`w-full border rounded px-3 py-2 text-sm ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Select a subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full border rounded px-3 py-2 text-sm ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                    rows={4}
                    placeholder="Provide a detailed description of what you need help with or want to discuss. Include any specific topics, goals, or expectations."
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
              </div>
            </div>

            {/* Scheduling Details */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold mb-1">Scheduling Details</h2>
              <div className="text-xs text-gray-400 mb-4">Set the date and time for your request.</div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full border rounded px-3 py-2 text-sm ${errors.preferredDate ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.preferredDate && <p className="text-red-500 text-xs mt-1">{errors.preferredDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Preferred Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.preferredTime}
                    onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                    className={`w-full border rounded px-3 py-2 text-sm ${errors.preferredTime ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.preferredTime && <p className="text-red-500 text-xs mt-1">{errors.preferredTime}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {durations.map(duration => (
                    <option key={duration.value} value={duration.value}>{duration.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold mb-1">Payment Information</h2>
              <div className="text-xs text-gray-400 mb-4">Set the payment amount for this request.</div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Payment Amount (LKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">Rs.</span>
                  <input
                    type="number"
                    min="200"
                    step="0.01"
                    value={formData.paymentAmount}
                    onChange={(e) => handleInputChange('paymentAmount', e.target.value)}
                    className={`w-full border rounded px-8 py-2 text-sm ${errors.paymentAmount ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="200.00"
                  />
                </div>
                {errors.paymentAmount && <p className="text-red-500 text-xs mt-1">{errors.paymentAmount}</p>}
                <p className="text-xs text-gray-500 mt-1">Minimum amount: Rs.200.00</p>
              </div>
            </div>

            {/* Additional Options */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold mb-1">Additional Options</h2>
              <div className="text-xs text-gray-400 mb-4">Customize settings for your request.</div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Request Visibility</label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => handleInputChange('visibility', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="public">Public (Visible to all students)</option>
                    <option value="private">Private (Only invited students)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      placeholder="Add tags (e.g., beginner, advanced, exam-prep)"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-blue-600 text-white rounded px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end mt-6">
              <Link
                to="/requests/group"
                className="border border-gray-300 rounded px-4 py-2 font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Request"}
              </button>
            </div>
          </form>
        </section>

        {/* Right: Summary & Tips */}
        <aside className="w-96 flex flex-col gap-6">
          {/* Enhanced Request Summary */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Request Preview</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600">Topic:</span>
                <span className="flex-1">{summary.topic}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600">Subject:</span>
                <span className="flex-1">{formData.subject || 'Not selected'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600">Date:</span>
                <span className="flex-1">{summary.date}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600">Time:</span>
                <span className="flex-1">{summary.time}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600">Duration:</span>
                <span className="flex-1">{summary.duration}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600">Payment:</span>
                <span className="flex-1 text-orange-600 font-medium">{summary.payment}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-600">Description:</span>
                <span className="flex-1 text-gray-700">{summary.description}</span>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-600">Tags:</span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tips for Great Requests */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Tips for Great Requests</h3>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
              <li><strong>Be Specific:</strong> Clearly state your learning goals and what you need help with.</li>
              <li><strong>Set Realistic Expectations:</strong> Define the scope and difficulty level appropriately.</li>
              <li><strong>Plan Ahead:</strong> Schedule with enough time for participants to prepare.</li>
              <li><strong>Use Tags:</strong> Help others find your request with relevant keywords.</li>
              <li><strong>Be Clear About Timing:</strong> Provide specific dates and times for better responses.</li>
              <li><strong>Write a Good Description:</strong> Include context and specific areas you need help with.</li>
            </ol>
          </div>

          {/* User Stats */}
          {userProfile && (
            <div className="bg-blue-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={userProfile.avatar}
                  alt={userProfile.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold">{userProfile.displayName}</div>
                  <div className="text-xs text-gray-600">{userProfile.email}</div>
                </div>
              </div>
              <div className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> Your profile information will be visible to participants.
                Make sure your profile is complete to attract more responses.
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Footer */}
      <footer className="text-xs text-gray-400 px-6 py-4 text-center border-t">
        <div>© 2025 NetworkPro. All rights reserved.</div>
      </footer>
    </div>
  );
}