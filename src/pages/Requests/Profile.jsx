import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserData } from "@/services/authService";
import { UserCollectionService } from "@/services/user.js";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";

export default function Profile() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State for user data and UI
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    skills: [],
    interests: [],
    avatar: ''
  });

  // Mock data for demonstration - in real app, this would come from Firebase
  const [stats, setStats] = useState({
    averageRating: 4.8,
    totalRatings: 124,
    upcomingSessions: 3,
    completedRequests: 45
  });

  const [friends] = useState([
    { name: "Alice Smith", avatar: "https://ui-avatars.com/api/?name=Alice+Smith&background=f97316&color=ffffff&size=128&bold=true&rounded=true" },
    { name: "Bob Johnson", avatar: "https://ui-avatars.com/api/?name=Bob+Johnson&background=059669&color=ffffff&size=128&bold=true&rounded=true" },
    { name: "Charlie Brown", avatar: "https://ui-avatars.com/api/?name=Charlie+Brown&background=7c3aed&color=ffffff&size=128&bold=true&rounded=true" },
    { name: "Diana Prince", avatar: "https://ui-avatars.com/api/?name=Diana+Prince&background=dc2626&color=ffffff&size=128&bold=true&rounded=true" },
  ]);

  const [weeklyActivity] = useState([2, 4, 3, 7, 6, 1, 0]);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getCurrentUserData(user.id);

        if (result.success) {
          const profileData = {
            ...user,
            ...result.userData,
            displayName: result.userData.displayName || result.userData.name || user.name || "User",
            bio: result.userData.bio || "Welcome to Skill-Net! Connect with like-minded professionals and grow your network.",
            location: result.userData.location || "Location not set",
            skills: result.userData.skills || ["React.js", "TypeScript", "Tailwind CSS", "Next.js", "Python", "Data Analysis", "Problem Solving", "Teamwork"],
            interests: result.userData.interests || ["Machine Learning", "Web Development", "UI/UX Design", "Artificial Intelligence", "Cybersecurity", "Gaming"],
            memberSince: result.userData.createdAt ? new Date(result.userData.createdAt).getFullYear() : new Date().getFullYear(),
            avatar: result.userData.avatar || result.userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.userData.displayName || result.userData.name || user.name || user.email || 'User')}&background=6366f1&color=ffffff&size=128&bold=true&rounded=true`
          };

          setUserProfile(profileData);
          setEditForm({
            displayName: profileData.displayName,
            bio: profileData.bio,
            location: profileData.location,
            skills: profileData.skills,
            interests: profileData.interests,
            avatar: profileData.avatar
          });
        } else {
          // Fallback to basic user data if Firestore fetch fails
          const fallbackProfile = {
            ...user,
            displayName: user.name || "User",
            bio: "Welcome to Skill-Net! Connect with like-minded professionals and grow your network.",
            location: "Location not set",
            skills: ["React.js", "TypeScript"],
            interests: ["Web Development", "Programming"],
            memberSince: new Date().getFullYear(),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=6366f1&color=ffffff&size=128&bold=true&rounded=true`
          };
          setUserProfile(fallbackProfile);
          setEditForm({
            displayName: fallbackProfile.displayName,
            bio: fallbackProfile.bio,
            location: fallbackProfile.location,
            skills: fallbackProfile.skills,
            interests: fallbackProfile.interests,
            avatar: fallbackProfile.avatar
          });
          setError("Could not load complete profile data");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleSignOut = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Sign out error:", error);
      navigate("/login", { replace: true });
    }
  };

  const handleEditToggle = () => {
    if (isEditing && userProfile) {
      // Reset form when canceling edit
      setEditForm({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        skills: userProfile.skills || [],
        interests: userProfile.interests || [],
        avatar: userProfile.avatar || ''
      });
    }
    setIsEditing(!isEditing);
  };

  // Handle profile picture upload
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📸 File selected:', file);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(`Image size should be less than 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    try {
      setUploadingImage(true);
      console.log('🚀 Starting upload process...');

      const imageUrl = await uploadToCloudinary(file);
      console.log('✅ Upload successful, URL:', imageUrl);

      // Update the edit form with new avatar URL
      setEditForm(prev => ({
        ...prev,
        avatar: imageUrl
      }));

      // If not in editing mode, save immediately
      if (!isEditing) {
        await updateProfilePicture(imageUrl);
      } else {
        alert('Profile picture updated! Don\'t forget to save your changes.');
      }

    } catch (error) {
      console.error('❌ Image upload failed:', error);

      // Show more specific error messages
      let errorMessage = 'Failed to upload image. ';

      if (error.message.includes('Upload preset')) {
        errorMessage += 'Configuration error: Please check your Cloudinary upload preset.';
      } else if (error.message.includes('Network error')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (error.message.includes('Upload failed')) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again or contact support if the problem persists.';
      }

      alert(errorMessage);
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Update profile picture immediately (when not in edit mode)
  const updateProfilePicture = async (imageUrl) => {
    if (!user?.id) return;

    try {
      const updateData = {
        avatar: imageUrl,
        photoURL: imageUrl, // Also update photoURL for compatibility
      };

      await UserCollectionService.updateUser(user.id, updateData);

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        avatar: imageUrl,
        photoURL: imageUrl
      }));

      alert("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error updating profile picture:", error);
      alert("Failed to update profile picture. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Use the UserCollectionService to update both private and public profiles
      const updateData = {
        displayName: editForm.displayName,
        bio: editForm.bio,
        location: editForm.location,
        skills: editForm.skills,
        interests: editForm.interests,
        avatar: editForm.avatar,
        photoURL: editForm.avatar, // For compatibility
      };

      await UserCollectionService.updateUser(user.id, updateData);

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        displayName: editForm.displayName,
        name: editForm.displayName,
        bio: editForm.bio,
        location: editForm.location,
        skills: editForm.skills,
        interests: editForm.interests,
        avatar: editForm.avatar,
        photoURL: editForm.avatar
      }));

      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = (skill) => {
    if (skill.trim() && !editForm.skills.includes(skill.trim())) {
      setEditForm(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleAddInterest = (interest) => {
    if (interest.trim() && !editForm.interests.includes(interest.trim())) {
      setEditForm(prev => ({
        ...prev,
        interests: [...prev.interests, interest.trim()]
      }));
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    setEditForm(prev => ({
      ...prev,
      interests: prev.interests.filter(interest => interest !== interestToRemove)
    }));
  };

  // Loading state
  if (loading && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A202C]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0]">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A202C]">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
          <p className="text-[#A0AEC0] mb-4">{error || "Unable to load profile data"}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-gradient-primary px-4 py-2 rounded transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden">
      {/* Educational Background Pattern */}
      <div className="absolute inset-0">
        {/* Geometric Shapes - Increased opacity and size for better visibility */}
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-[#3B82F6]/40 to-[#1D4ED8]/40 rounded-full blur-2xl"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-gradient-to-br from-[#8B5CF6]/40 to-[#7C3AED]/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-48 h-48 bg-gradient-to-br from-[#10B981]/40 to-[#059669]/40 rounded-full blur-2xl"></div>
        
        {/* Additional geometric elements for more visual interest */}
        <div className="absolute top-1/3 left-1/6 w-32 h-32 bg-gradient-to-br from-[#F59E0B]/30 to-[#D97706]/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/6 w-40 h-40 bg-gradient-to-br from-[#EC4899]/30 to-[#DB2777]/30 rounded-full blur-xl"></div>
        
        {/* Educational Icons Pattern - Increased opacity for better visibility */}
        <div className="absolute top-1/4 left-1/3 opacity-15">
          <svg className="w-32 h-32 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09v6.82L12 23 1 15.82V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9z"/>
          </svg>
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-15">
          <svg className="w-28 h-28 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
          </svg>
        </div>
        <div className="absolute bottom-1/3 left-1/6 opacity-15">
          <svg className="w-20 h-20 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        
        {/* Additional educational icons for more visual richness */}
        <div className="absolute top-1/2 right-1/3 opacity-10">
          <svg className="w-24 h-24 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
        <div className="absolute bottom-1/3 right-1/4 opacity-10">
          <svg className="w-16 h-16 text-[#EC4899]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1.08-1.36-1.9-1.36h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Profile Card */}
      <section className="card-dark p-6 flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-6">
          {/* Profile Picture with Upload */}
          <div className="relative">
            <img
              src={isEditing ? editForm.avatar : userProfile.avatar}
              alt={userProfile.displayName || "User"}
              className="w-24 h-24 rounded-full object-cover border-4 border-[#4299E1] shadow-lg"
            />

            {/* Upload overlay */}
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              {uploadingImage ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="font-bold text-2xl border-b-2 border-[#4299E1] focus:outline-none bg-transparent text-white"
                  placeholder="Your name"
                />
              ) : (
                <h2 className="font-bold text-2xl text-white">{userProfile.displayName || "User"}</h2>
              )}
              <div className="ml-auto flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="bg-green-600 text-white rounded px-3 py-1 text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleEditToggle}
                      className="border border-[#4A5568] rounded px-3 py-1 text-xs font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="border border-[#4A5568] rounded px-3 py-1 text-xs font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors"
                  >
                    Edit profile
                  </button>
                )}
                <Link
                  to="/Settings"
                  className="border border-[#4A5568] rounded px-3 py-1 text-xs font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white rounded px-3 py-1 text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
            <div className="text-[#A0AEC0] text-sm">{userProfile.email}</div>
            <div className="text-[#718096] text-xs flex items-center gap-2">
              @{userProfile.email?.split('@')[0] || 'user'} •
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="border-b border-[#4A5568] focus:outline-none focus:border-[#4299E1] bg-transparent text-white"
                  placeholder="Your location"
                />
              ) : (
                <span className="text-[#E0E0E0]">{userProfile.location}</span>
              )} • Member since {userProfile.memberSince}
            </div>
            <div className="mt-2 text-[#E0E0E0] text-sm">
              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="input-dark w-full rounded p-2 focus:outline-none focus:border-[#4299E1]"
                  rows="3"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                userProfile.bio
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-6 mb-6">
        <div className="card-dark p-6 flex flex-col items-center">
          <div className="text-yellow-500 text-2xl mb-1">★</div>
          <div className="text-2xl font-bold text-white">{stats.averageRating} <span className="text-yellow-500 text-lg">★</span></div>
          <div className="text-[#A0AEC0] text-xs">{stats.totalRatings} ratings</div>
          <div className="mt-2 text-xs text-[#E0E0E0] font-medium">Average Rating</div>
        </div>
        <div className="card-dark p-6 flex flex-col items-center">
          <div className="text-[#4299E1] text-2xl mb-1">📅</div>
          <div className="text-2xl font-bold text-white">{stats.upcomingSessions}</div>
          <div className="text-[#A0AEC0] text-xs">Next 7 days</div>
          <div className="mt-2 text-xs text-[#E0E0E0] font-medium">Upcoming Class Connects</div>
        </div>
        <div className="card-dark p-6 flex flex-col items-center">
          <div className="text-green-500 text-2xl mb-1">✓</div>
          <div className="text-2xl font-bold text-white">{stats.completedRequests}</div>
          <div className="text-[#A0AEC0] text-xs">All time</div>
          <div className="mt-2 text-xs text-[#E0E0E0] font-medium">Requests Completed</div>
        </div>
      </section>

      {/* Friends & Skills */}
      <section className="grid grid-cols-2 gap-6 mb-6">
        <div className="card-dark p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-white">My Friends</h3>
            <Link to="#" className="text-[#4299E1] text-xs font-medium hover:text-[#00BFFF] transition-colors">View All</Link>
          </div>
          <div className="flex flex-col gap-2">
            {friends.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={f.avatar} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm font-medium text-white">{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-dark p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-white">Skills & Interests</h3>
          </div>
          <div>
            <div className="font-semibold text-xs mb-1 text-white">Skills</div>
            {isEditing ? (
              <div className="mb-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.skills.map((skill, i) => (
                    <span key={i} className="bg-[#4A5568] text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 border border-[#718096]">
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add skill (press Enter)"
                  className="input-dark text-xs px-2 py-1 focus:outline-none focus:border-[#4299E1]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSkill(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-2">
                {userProfile.skills?.map((skill, i) => (
                  <span key={i} className="bg-[#4A5568] text-white px-2 py-1 rounded text-xs font-medium border border-[#718096]">{skill}</span>
                ))}
              </div>
            )}

            <div className="font-semibold text-xs mb-1 text-white">Interests</div>
            {isEditing ? (
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.interests.map((interest, i) => (
                    <span key={i} className="bg-[#4A5568] text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 border border-[#718096]">
                      {interest}
                      <button
                        onClick={() => handleRemoveInterest(interest)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add interest (press Enter)"
                  className="input-dark text-xs px-2 py-1 focus:outline-none focus:border-[#4299E1]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddInterest(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userProfile.interests?.map((interest, i) => (
                  <span key={i} className="bg-[#4A5568] text-white px-2 py-1 rounded text-xs font-medium border border-[#718096]">{interest}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Weekly Activity */}
      <section className="card-dark p-6 flex flex-col gap-4 mb-6">
        <h3 className="font-semibold mb-2 text-white">Weekly Activity Overview</h3>
        <div className="text-xs text-[#A0AEC0] mb-2">Your interactions over the last 7 days.</div>
        <div className="flex items-end gap-4 h-32">
          {weeklyActivity.map((val, i) => (
            <div key={i} className="flex flex-col items-center justify-end h-full">
              <div
                className="w-8 rounded bg-gradient-to-t from-[#4299E1] to-[#00BFFF]"
                style={{ height: `${val * 18}px` }}
              ></div>
              <span className="text-xs text-[#E0E0E0] mt-1">{days[i]}</span>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}