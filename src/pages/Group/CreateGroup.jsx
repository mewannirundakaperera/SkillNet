import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { GroupsService, GROUP_CATEGORIES } from '@/firebase/collections';

// Import the upload function
import { uploadGroupImageToCloudinary } from '@/utils/uploadGroupImage';

export default function CreateGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    isPublic: true,
    maxMembers: 100,
    rules: '',
    tags: [],
    allowFileSharing: true,
    allowVoiceMessages: true,
    moderatedJoining: false,
    allowInvites: true
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setImageFile(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && tag.length <= 20 && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle tag input key press
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Form validation
  const validateForm = () => {
    if (!formData.name.trim()) return 'Group name is required';
    if (formData.name.length < 3) return 'Group name must be at least 3 characters';
    if (formData.name.length > 50) return 'Group name must be less than 50 characters';
    if (!formData.description.trim()) return 'Group description is required';
    if (formData.description.length < 10) return 'Description must be at least 10 characters';
    if (formData.description.length > 500) return 'Description must be less than 500 characters';
    if (!formData.category) return 'Please select a category';
    if (formData.maxMembers < 2 || formData.maxMembers > 1000) return 'Max members must be between 2 and 1000';
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setUploadingImage(!!imageFile);
    setError('');
    setSuccess('');

    try {
      // Prepare group data
      const groupData = {
        ...formData,
        createdBy: user.id,
        createdByName: user.displayName || user.name,
        createdByAvatar: user.avatar || user.photoURL || 'https://randomuser.me/api/portraits/men/14.jpg',
        settings: {
          allowFileSharing: formData.allowFileSharing,
          allowVoiceMessages: formData.allowVoiceMessages,
          moderatedJoining: formData.moderatedJoining,
          allowInvites: formData.allowInvites
        }
      };

      console.log('Creating group with data:', groupData);

      // Create group with image (if provided)
      const newGroup = await GroupsService.createGroup(groupData, imageFile);

      console.log('Group created successfully:', newGroup);

      // Show success message
      setSuccess(`Group "${newGroup.name}" created successfully! Redirecting...`);
      setError('');
      
      // Redirect to the new group after a short delay
      setTimeout(() => {
        navigate(`/chat/${newGroup.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error creating group:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create group. Please try again.';
      
      if (error.message.includes('Image upload failed')) {
        errorMessage = 'Group image upload failed. The group will be created without an image.';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'Permission denied. Please check your authentication and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A202C]">
      <div className="max-w-6xl mx-auto py-12 px-6">
        {/* Enhanced Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <Link
              to="/groups"
              className="p-3 text-[#A0AEC0] hover:text-white hover:bg-[#2D3748] rounded-xl transition-all duration-200 shadow-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Create New Group</h1>
              <p className="text-lg text-[#A0AEC0]">Start a new community and connect with like-minded people</p>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="card-dark p-6 shadow-sm border border-[#4A5568]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#2D3748] rounded-full flex items-center justify-center border border-[#4299E1]">
                <svg className="w-5 h-5 text-[#4299E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Set up your group</h3>
                <p className="text-sm text-[#A0AEC0]">Fill in the details below to create your group</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Form */}
        <form onSubmit={handleSubmit} className="card-dark rounded-2xl shadow-lg p-10 border border-[#4A5568]">
        {/* Success Display */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.437-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Group Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Group Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input-dark w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                placeholder="Enter group name"
                maxLength={50}
                required
              />
              <p className="text-xs text-[#A0AEC0] mt-1">{formData.name.length}/50 characters</p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="input-dark w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                placeholder="Describe what your group is about..."
                maxLength={500}
                required
              />
              <p className="text-xs text-[#A0AEC0] mt-1">{formData.description.length}/500 characters</p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-white mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input-dark w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                {Object.entries(GROUP_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="input-dark flex-1 px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                  placeholder="Add a tag..."
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn-gradient-primary px-4 py-2 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#2D3748] text-[#4299E1] rounded-full text-sm border border-[#4299E1]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-[#4299E1] hover:text-[#00BFFF]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-[#A0AEC0] mt-1">
                {formData.tags.length}/10 tags • Max 20 characters per tag
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Group Image */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Group Image (Optional)
                {uploadingImage && (
                  <span className="ml-2 text-xs text-[#4299E1] animate-pulse">
                    • Uploading...
                  </span>
                )}
              </label>
              <div className="border-2 border-dashed border-[#4299E1] rounded-lg p-6 text-center relative">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Group preview"
                      className="w-32 h-32 rounded-lg object-cover mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="w-12 h-12 text-[#A0AEC0] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-[#E0E0E0]">Click to upload group image</p>
                    <p className="text-xs text-[#A0AEC0]">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Group Settings */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Group Settings</h3>
              <div className="space-y-4">
                {/* Public/Private */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Public Group</h4>
                    <p className="text-xs text-[#A0AEC0]">Anyone can find and join this group</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPublic"
                      checked={formData.isPublic}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#4A5568] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4299E1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#4A5568] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4299E1]"></div>
                  </label>
                </div>

                {/* Max Members */}
                <div>
                  <label htmlFor="maxMembers" className="block text-sm font-medium text-white mb-1">
                    Maximum Members
                  </label>
                  <input
                    type="number"
                    id="maxMembers"
                    name="maxMembers"
                    value={formData.maxMembers}
                    onChange={handleInputChange}
                    min={2}
                    max={1000}
                    className="input-dark w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                  />
                </div>

                {/* File Sharing */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Allow File Sharing</h4>
                    <p className="text-xs text-[#A0AEC0]">Members can share files and images</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowFileSharing"
                      checked={formData.allowFileSharing}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#4A5568] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4299E1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#4A5568] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4299E1]"></div>
                  </label>
                </div>

                {/* Voice Messages */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Allow Voice Messages</h4>
                    <p className="text-xs text-[#A0AEC0]">Members can send voice messages</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowVoiceMessages"
                      checked={formData.allowVoiceMessages}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#4A5568] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4299E1] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#4A5568] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4299E1]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Group Rules */}
            <div>
              <label htmlFor="rules" className="block text-sm font-medium text-white mb-2">
                Group Rules (Optional)
              </label>
              <textarea
                id="rules"
                name="rules"
                value={formData.rules}
                onChange={handleInputChange}
                rows={3}
                className="input-dark w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                placeholder="Set guidelines for your group members..."
                maxLength={1000}
              />
              <p className="text-xs text-[#A0AEC0] mt-1">{formData.rules.length}/1000 characters</p>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[#4A5568]">
          <Link
            to="/groups"
            className="px-6 py-3 border border-[#4A5568] text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-gradient-primary px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {loading 
              ? uploadingImage 
                ? 'Uploading Image & Creating Group...' 
                : 'Creating Group...' 
              : 'Create Group'
            }
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}