import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserData } from "@/services/authService";
import { UserCollectionService } from "@/services/user.js";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const privacyRef = useRef(null);
  const securityRef = useRef(null);
  const accountRef = useRef(null);

  // State management
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // Notification preferences
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true,
    marketingEmails: false,
    newsletter: false,

    // Privacy settings
    profileVisibility: "public", // public, friends, private
    shareUsageData: true,
    personalizedAds: false,

    // Security settings
    twoFactorAuth: false,
    sessionTimeout: 30, // minutes

    // Account preferences
    language: "en",
    timezone: "UTC",
    currency: "LKR"
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    email: '',
    bio: '',
    avatar: ''
  });

  // Load user profile and settings
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getCurrentUserData(user.id);

        if (result.success) {
          const userData = {
            ...user,
            ...result.userData,
            displayName: result.userData.displayName || result.userData.name || user.name || "User",
            bio: result.userData.bio || "Welcome to Skill-Net! Connect with like-minded professionals and grow your network.",
            avatar: result.userData.avatar || result.userData.photoURL || "https://randomuser.me/api/portraits/men/14.jpg"
          };

          setUserProfile(userData);
          setProfileForm({
            displayName: userData.displayName,
            email: userData.email,
            bio: userData.bio,
            avatar: userData.avatar
          });

          // Load user settings if they exist
          if (result.userData.settings) {
            setSettings(prev => ({
              ...prev,
              ...result.userData.settings
            }));
          }
        } else {
          // Fallback to basic user data
          const fallbackData = {
            ...user,
            displayName: user.name || "User",
            bio: "Welcome to Skill-Net!",
            avatar: "https://randomuser.me/api/portraits/men/14.jpg"
          };
          setUserProfile(fallbackData);
          setProfileForm({
            displayName: fallbackData.displayName,
            email: fallbackData.email,
            bio: fallbackData.bio,
            avatar: fallbackData.avatar
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Handle settings changes
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle profile form changes
  const handleProfileChange = (key, value) => {
    setProfileForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle profile picture upload
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadToCloudinary(file);

      setProfileForm(prev => ({
        ...prev,
        avatar: imageUrl
      }));

      alert('Profile picture updated! Click "Save Changes" to apply.');
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const updateData = {
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        avatar: profileForm.avatar,
        photoURL: profileForm.avatar,
        settings: settings,
      };

      await UserCollectionService.updateUser(user.id, updateData);

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        displayName: profileForm.displayName,
        bio: profileForm.bio,
        avatar: profileForm.avatar
      }));

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      try {
        await logout();
        navigate("/login", { replace: true });
      } catch (error) {
        console.error("Sign out error:", error);
        alert("Failed to sign out. Please try again.");
      }
    }
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      if (window.confirm("This will permanently delete all your data. Type 'DELETE' to confirm.")) {
        // In a real app, implement account deletion logic here
        alert("Account deletion feature will be implemented soon. Please contact support for assistance.");
      }
    }
  };

  // Scroll handlers
  const handlePrivacyClick = (e) => {
    e.preventDefault();
    privacyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSecurityClick = (e) => {
    e.preventDefault();
    securityRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAccountClick = (e) => {
    e.preventDefault();
    accountRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-4 text-[#A0AEC0]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#1A202C] min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-[#E0E0E0]">Manage your account settings and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-64 card-dark p-6 h-fit">
          <nav className="flex flex-col gap-2">
            <a href="#profile" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#4299E1] to-[#00BFFF] text-white font-semibold">
              Profile Settings
            </a>
            <a href="#privacy" onClick={handlePrivacyClick} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
              Privacy Settings
            </a>
            <a href="#security" onClick={handleSecurityClick} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
              Security Settings
            </a>
            <a href="#account" onClick={handleAccountClick} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
              Account Management
            </a>
          </nav>
          <div className="mt-6 pt-4 border-t border-[#4A5568]">
            <Link to="/Profile" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#2D3748] text-[#E0E0E0] text-sm transition-colors">
              ← Back to Profile
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Profile Information */}
          <section id="profile" className="card-dark p-6">
            <h2 className="font-semibold mb-4 text-white">Profile Information</h2>
            <div className="flex items-center gap-6 mb-4">
              <div className="relative">
                <img
                  src={profileForm.avatar}
                  alt={profileForm.displayName}
                  className="w-20 h-20 rounded-full object-cover border-4 border-[#4299E1] shadow-lg"
                />
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div>
                <div className="font-bold text-lg text-white">{profileForm.displayName}</div>
                <div className="text-[#A0AEC0] text-sm mb-2">{profileForm.email}</div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-[#4A5568] rounded px-3 py-1 text-xs font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors"
                  disabled={uploadingImage}
                >
                  {uploadingImage ? "Uploading..." : "Upload new photo"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-white">Full Name</label>
                <input
                  type="text"
                  className="input-dark w-full rounded px-3 py-2 text-sm focus:outline-none"
                  value={profileForm.displayName}
                  onChange={(e) => handleProfileChange('displayName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-white">Email Address</label>
                <input
                  type="text"
                  className="w-full border border-[#4A5568] rounded px-3 py-2 text-sm bg-[#2D3748] text-[#E0E0E0]"
                  value={profileForm.email}
                  readOnly
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-white">Bio</label>
              <textarea
                className="input-dark w-full rounded px-3 py-2 text-sm focus:outline-none"
                rows={3}
                value={profileForm.bio}
                onChange={(e) => handleProfileChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
              />
            </div>
            <div className="mt-4">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="btn-gradient-primary px-4 py-2 font-semibold disabled:opacity-50 transition-all duration-200"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>

          {/* Privacy Controls */}
          <section ref={privacyRef} id="privacy" className="card-dark p-6">
            <h2 className="font-semibold mb-4 text-white">Privacy Controls</h2>
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-sm mb-2 text-white">Profile Visibility</div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-[#E0E0E0]">
                    <input
                      type="radio"
                      name="visibility"
                      checked={settings.profileVisibility === 'public'}
                      onChange={() => handleSettingChange('profileVisibility', 'public')}
                      className="accent-[#4299E1]"
                    />
                    Public
                  </label>
                  <label className="flex items-center gap-2 text-[#E0E0E0]">
                    <input
                      type="radio"
                      name="visibility"
                      checked={settings.profileVisibility === 'friends'}
                      onChange={() => handleSettingChange('profileVisibility', 'friends')}
                      className="accent-[#4299E1]"
                    />
                    Friends Only
                  </label>
                  <label className="flex items-center gap-2 text-[#E0E0E0]">
                    <input
                      type="radio"
                      name="visibility"
                      checked={settings.profileVisibility === 'private'}
                      onChange={() => handleSettingChange('profileVisibility', 'private')}
                      className="accent-[#4299E1]"
                    />
                    Private
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.shareUsageData}
                  onChange={(e) => handleSettingChange('shareUsageData', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">Share Usage Data</span>
                <span className="text-xs text-[#A0AEC0]">Help us improve by sharing anonymous usage data.</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.personalizedAds}
                  onChange={(e) => handleSettingChange('personalizedAds', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">Personalized Ads</span>
                <span className="text-xs text-[#A0AEC0]">Receive ads tailored to your interests.</span>
              </label>
            </div>
          </section>

          {/* Notification Settings */}
          <section className="card-dark p-6">
            <h2 className="font-semibold mb-4 text-white">Notification Preferences</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">Email Notifications</span>
                <span className="text-xs text-[#A0AEC0]">Receive important updates via email</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">SMS Notifications</span>
                <span className="text-xs text-[#A0AEC0]">Receive text messages for urgent updates</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.desktopNotifications}
                  onChange={(e) => handleSettingChange('desktopNotifications', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">Desktop Notifications</span>
                <span className="text-xs text-[#A0AEC0]">Show notifications in your browser</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={(e) => handleSettingChange('marketingEmails', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">Marketing Emails</span>
                <span className="text-xs text-[#A0AEC0]">Receive promotional content and offers</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.newsletter}
                  onChange={(e) => handleSettingChange('newsletter', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">Newsletter</span>
                <span className="text-xs text-[#A0AEC0]">Weekly newsletter with tips and updates</span>
              </label>
            </div>
          </section>

          {/* Account Security */}
          <section ref={securityRef} id="security" className="card-dark p-6">
            <h2 className="font-semibold mb-4 text-white">Account Security</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">Change Password</span>
                  <p className="text-xs text-[#A0AEC0]">Update your account password</p>
                </div>
                <button className="border border-[#4A5568] rounded px-3 py-1 text-xs font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
                  Change Password
                </button>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.twoFactorAuth}
                  onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                  className="accent-[#4299E1]"
                />
                <span className="text-white">Two-Factor Authentication</span>
                <span className="text-xs text-[#A0AEC0]">Add an extra layer of security to your account.</span>
              </label>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">Active Sessions</span>
                  <p className="text-xs text-[#A0AEC0]">Manage your logged-in devices</p>
                </div>
                <button className="border border-[#4A5568] rounded px-3 py-1 text-xs font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
                  View Sessions
                </button>
              </div>
            </div>
          </section>

          {/* Account Management */}
          <section ref={accountRef} id="account" className="card-dark p-6">
            <h2 className="font-semibold mb-4 text-white">Account Management</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">Language</span>
                  <p className="text-xs text-[#A0AEC0]">Choose your preferred language</p>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="input-dark px-3 py-1 text-sm"
                >
                  <option value="en">English</option>
                  <option value="si">Sinhala</option>
                  <option value="ta">Tamil</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">Currency</span>
                  <p className="text-xs text-[#A0AEC0]">Default currency for payments</p>
                </div>
                <select
                  value={settings.currency}
                  onChange={(e) => handleSettingChange('currency', e.target.value)}
                  className="input-dark px-3 py-1 text-sm"
                >
                  <option value="LKR">LKR (Sri Lankan Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#4A5568]">
                <button
                  onClick={handleSignOut}
                  className="border border-[#4A5568] rounded px-4 py-2 font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors"
                >
                  Sign Out
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-500 text-white rounded px-4 py-2 font-semibold hover:bg-red-600 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </section>

          {/* Save All Settings Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-gradient-primary px-6 py-3 font-semibold disabled:opacity-50 transition-all duration-200"
            >
              {saving ? "Saving All Settings..." : "Save All Settings"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}