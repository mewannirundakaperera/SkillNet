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
    { name: "Alice Smith", avatar: "https://randomuser.me/api/portraits/women/10.jpg" },
    { name: "Bob Johnson", avatar: "https://randomuser.me/api/portraits/men/11.jpg" },
    { name: "Charlie Brown", avatar: "https://randomuser.me/api/portraits/men/12.jpg" },
    { name: "Diana Prince", avatar: "https://randomuser.me/api/portraits/women/13.jpg" },
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
            bio: result.userData.bio || "Welcome to NetworkPro! Connect with like-minded professionals and grow your network.",
            location: result.userData.location || "Location not set",
            skills: result.userData.skills || ["React.js", "TypeScript", "Tailwind CSS", "Next.js", "Python", "Data Analysis", "Problem Solving", "Teamwork"],
            interests: result.userData.interests || ["Machine Learning", "Web Development", "UI/UX Design", "Artificial Intelligence", "Cybersecurity", "Gaming"],
            memberSince: result.userData.createdAt ? new Date(result.userData.createdAt).getFullYear() : new Date().getFullYear(),
            avatar: result.userData.avatar || result.userData.photoURL || "https://randomuser.me/api/portraits/men/14.jpg"
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
            bio: "Welcome to NetworkPro! Connect with like-minded professionals and grow your network.",
            location: "Location not set",
            skills: ["React.js", "TypeScript"],
            interests: ["Web Development", "Programming"],
            memberSince: new Date().getFullYear(),
            avatar: "https://randomuser.me/api/portraits/men/14.jpg"
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "Unable to load profile data"}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Profile Card */}
      <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-6">
          {/* Profile Picture with Upload */}
          <div className="relative">
            <img
              src={isEditing ? editForm.avatar : userProfile.avatar}
              alt={userProfile.displayName || "User"}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow"
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
                  className="font-bold text-2xl border-b-2 border-blue-500 focus:outline-none bg-transparent"
                  placeholder="Your name"
                />
              ) : (
                <h2 className="font-bold text-2xl">{userProfile.displayName || "User"}</h2>
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
                      className="border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                  >
                    Edit profile
                  </button>
                )}
                <Link
                  to="/Settings"
                  className="border rounded px-3 py-1 text-xs font-semibold hover:bg-gray-100 transition-colors"
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
            <div className="text-gray-500 text-sm">{userProfile.email}</div>
            <div className="text-gray-400 text-xs flex items-center gap-2">
              @{userProfile.email?.split('@')[0] || 'user'} •
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="border-b border-gray-300 focus:outline-none focus:border-blue-500 bg-transparent"
                  placeholder="Your location"
                />
              ) : (
                <span>{userProfile.location}</span>
              )} • Member since {userProfile.memberSince}
            </div>
            <div className="mt-2 text-gray-700 text-sm">
              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
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
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-yellow-500 text-2xl mb-1">★</div>
          <div className="text-2xl font-bold">{stats.averageRating} <span className="text-yellow-500 text-lg">★</span></div>
          <div className="text-gray-400 text-xs">{stats.totalRatings} ratings</div>
          <div className="mt-2 text-xs text-gray-500 font-medium">Average Rating</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-blue-500 text-2xl mb-1">📅</div>
          <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
          <div className="text-gray-400 text-xs">Next 7 days</div>
          <div className="mt-2 text-xs text-gray-500 font-medium">Upcoming Class Connects</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <div className="text-green-500 text-2xl mb-1">✓</div>
          <div className="text-2xl font-bold">{stats.completedRequests}</div>
          <div className="text-gray-400 text-xs">All time</div>
          <div className="mt-2 text-xs text-gray-500 font-medium">Requests Completed</div>
        </div>
      </section>

      {/* Friends & Skills */}
      <section className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">My Friends</h3>
            <Link to="#" className="text-blue-600 text-xs font-medium">View All</Link>
          </div>
          <div className="flex flex-col gap-2">
            {friends.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={f.avatar} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm font-medium text-gray-700">{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Skills & Interests</h3>
          </div>
          <div>
            <div className="font-semibold text-xs mb-1">Skills</div>
            {isEditing ? (
              <div className="mb-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.skills.map((skill, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add skill (press Enter)"
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
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
                  <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">{skill}</span>
                ))}
              </div>
            )}

            <div className="font-semibold text-xs mb-1">Interests</div>
            {isEditing ? (
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.interests.map((interest, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      {interest}
                      <button
                        onClick={() => handleRemoveInterest(interest)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add interest (press Enter)"
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
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
                  <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">{interest}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Weekly Activity */}
      <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 mb-6">
        <h3 className="font-semibold mb-2">Weekly Activity Overview</h3>
        <div className="text-xs text-gray-400 mb-2">Your interactions over the last 7 days.</div>
        <div className="flex items-end gap-4 h-32">
          {weeklyActivity.map((val, i) => (
            <div key={i} className="flex flex-col items-center justify-end h-full">
              <div
                className="w-8 rounded bg-blue-500"
                style={{ height: `${val * 18}px` }}
              ></div>
              <span className="text-xs text-gray-500 mt-1">{days[i]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}