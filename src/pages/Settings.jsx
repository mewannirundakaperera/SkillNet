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

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentGateways, setPaymentGateways] = useState([]);
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const [connectingGateway, setConnectingGateway] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: ''
  });

  // Security state for payment methods
  const [securityPin, setSecurityPin] = useState('');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [securityVerified, setSecurityVerified] = useState(false);
  const [securityAttempts, setSecurityAttempts] = useState(0);
  const [securityLocked, setSecurityLocked] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(false);
  const [editForm, setEditForm] = useState({
    cardholderName: '',
    billingAddress: ''
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

          // Load payment methods if they exist
          if (result.userData.paymentMethods) {
            setPaymentMethods(result.userData.paymentMethods);
          }

          // Load payment gateways if they exist
          if (result.userData.paymentGateways) {
            setPaymentGateways(result.userData.paymentGateways);
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

  // Handle payment form changes
  const handlePaymentFormChange = (key, value) => {
    setPaymentForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Add new payment method
  const handleAddPaymentMethod = async () => {
    if (!paymentForm.cardNumber || !paymentForm.expiryDate || !paymentForm.cvv || !paymentForm.cardholderName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setAddingPaymentMethod(true);
      
      // Simulate payment method validation and addition
      const newPaymentMethod = {
        id: Date.now().toString(),
        type: 'credit_card',
        last4: paymentForm.cardNumber.slice(-4),
        brand: getCardBrand(paymentForm.cardNumber),
        expiryDate: paymentForm.expiryDate,
        cardholderName: paymentForm.cardholderName,
        isDefault: paymentMethods.length === 0,
        addedAt: new Date().toISOString()
      };

      // Add to local state
      setPaymentMethods(prev => [...prev, newPaymentMethod]);
      
      // Clear form
      setPaymentForm({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        billingAddress: ''
      });

      alert('Payment method added successfully!');
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Failed to add payment method. Please try again.');
    } finally {
      setAddingPaymentMethod(false);
    }
  };

  // Remove payment method
  const handleRemovePaymentMethod = (methodId) => {
    if (window.confirm('Are you sure you want to remove this payment method?')) {
      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
      alert('Payment method removed successfully!');
    }
  };

  // Set default payment method
  const handleSetDefaultPaymentMethod = (methodId) => {
    setPaymentMethods(prev => prev.map(method => ({
      ...method,
      isDefault: method.id === methodId
    })));
    alert('Default payment method updated!');
  };

  // Connect to payment gateway
  const handleConnectGateway = async (gatewayName) => {
    try {
      setConnectingGateway(true);
      
      // Simulate gateway connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newGateway = {
        id: Date.now().toString(),
        name: gatewayName,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        lastSync: new Date().toISOString()
      };

      setPaymentGateways(prev => [...prev, newGateway]);
      alert(`${gatewayName} connected successfully!`);
    } catch (error) {
      console.error('Error connecting to gateway:', error);
      alert('Failed to connect to payment gateway. Please try again.');
    } finally {
      setConnectingGateway(false);
    }
  };

  // Disconnect payment gateway
  const handleDisconnectGateway = (gatewayId) => {
    if (window.confirm('Are you sure you want to disconnect this payment gateway?')) {
      setPaymentGateways(prev => prev.filter(gateway => gateway.id !== gatewayId));
      alert('Payment gateway disconnected successfully!');
    }
  };

  // Get card brand from card number
  const getCardBrand = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, '');
    if (/^4/.test(number)) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'American Express';
    if (/^6/.test(number)) return 'Discover';
    return 'Unknown';
  };

  // Security verification for payment methods
  const verifySecurityPin = () => {
    // In a real app, this would verify against stored security PIN
    const correctPin = '1234'; // This should come from user settings or be set by user
    
    if (securityPin === correctPin) {
      setSecurityVerified(true);
      setSecurityAttempts(0);
      setSecurityPin('');
      return true;
    } else {
      setSecurityAttempts(prev => prev + 1);
      setSecurityPin('');
      
      if (securityAttempts >= 2) {
        setSecurityLocked(true);
        setTimeout(() => {
          setSecurityLocked(false);
          setSecurityAttempts(0);
        }, 300000); // Lock for 5 minutes after 3 failed attempts
      }
      
      return false;
    }
  };

  // Handle security pin input
  const handleSecurityPinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setSecurityPin(value);
  };

  // Show payment method details with security
  const handleShowPaymentDetails = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentDetails(true);
    setSecurityVerified(false);
  };

  // Edit payment method with security
  const handleEditPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    setEditForm({
      cardholderName: method.cardholderName,
      billingAddress: method.billingAddress || ''
    });
    setEditingPaymentMethod(true);
    setSecurityVerified(false);
  };

  // Save edited payment method
  const handleSaveEdit = () => {
    if (!selectedPaymentMethod) return;

    setPaymentMethods(prev => prev.map(method => 
      method.id === selectedPaymentMethod.id 
        ? { ...method, ...editForm }
        : method
    ));

    setEditingPaymentMethod(false);
    setSelectedPaymentMethod(null);
    setSecurityVerified(false);
    alert('Payment method updated successfully!');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingPaymentMethod(false);
    setSelectedPaymentMethod(null);
    setSecurityVerified(false);
    setEditForm({
      cardholderName: '',
      billingAddress: ''
    });
  };

  // Mask sensitive payment information
  const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return '';
    const last4 = cardNumber.slice(-4);
    return `•••• •••• •••• ${last4}`;
  };

  // Mask CVV
  const maskCVV = () => '•••';

  // Mask expiry date (show only month/year)
  const maskExpiryDate = (expiryDate) => {
    if (!expiryDate) return '';
    return expiryDate.replace(/\d(?=\d{2})/g, '•');
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
            <a href="#payments" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
              💳 Payment Methods
            </a>
            <a href="#gateways" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
              🔗 Payment Gateways
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

              {/* Payment Security PIN */}
              <div className="bg-[#2D3748] rounded-lg p-4 border border-[#4A5568]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-white">Payment Security PIN</span>
                    <p className="text-xs text-[#A0AEC0]">4-digit PIN required to view/edit payment methods</p>
                  </div>
                  <div className="text-xs text-[#A0AEC0]">
                    Current PIN: ••••
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter 4-digit PIN"
                    maxLength="4"
                    className="input-dark px-3 py-2 text-sm w-32 text-center tracking-widest"
                    readOnly
                  />
                  <button className="border border-[#4A5568] rounded px-3 py-2 text-xs font-semibold hover:bg-[#2D3748] text-[#E0E0E0] transition-colors">
                    Change PIN
                  </button>
                </div>
              </div>

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

          {/* Payment Methods */}
          <section id="payments" className="card-dark p-6">
            <h2 className="font-semibold mb-4 text-white">Payment Methods</h2>
            <div className="space-y-4">
              {/* Add New Payment Method */}
              <div className="bg-[#2D3748] rounded-lg p-4 border border-[#4A5568]">
                <h3 className="font-medium text-white mb-3">Add New Payment Method</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#A0AEC0]">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={paymentForm.cardNumber}
                      onChange={(e) => handlePaymentFormChange('cardNumber', e.target.value)}
                      className="input-dark w-full px-3 py-2 text-sm"
                      maxLength="19"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#A0AEC0]">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={paymentForm.expiryDate}
                      onChange={(e) => handlePaymentFormChange('expiryDate', e.target.value)}
                      className="input-dark w-full px-3 py-2 text-sm"
                      maxLength="5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#A0AEC0]">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={paymentForm.cvv}
                      onChange={(e) => handlePaymentFormChange('cvv', e.target.value)}
                      className="input-dark w-full px-3 py-2 text-sm"
                      maxLength="4"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#A0AEC0]">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={paymentForm.cardholderName}
                      onChange={(e) => handlePaymentFormChange('cardholderName', e.target.value)}
                      className="input-dark w-full px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1 text-[#A0AEC0]">Billing Address</label>
                  <input
                    type="text"
                    placeholder="123 Main St, City, Country"
                    value={paymentForm.billingAddress}
                    onChange={(e) => handlePaymentFormChange('billingAddress', e.target.value)}
                    className="input-dark w-full px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleAddPaymentMethod}
                  disabled={addingPaymentMethod}
                  className="bg-[#4299E1] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3182CE] disabled:opacity-50 transition-colors"
                >
                  {addingPaymentMethod ? 'Adding...' : 'Add Payment Method'}
                </button>
              </div>

              {/* Existing Payment Methods */}
              {paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-medium text-white">Your Payment Methods</h3>
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between bg-[#2D3748] rounded-lg p-3 border border-[#4A5568]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-6 bg-[#4299E1] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{method.brand}</span>
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            {maskCardNumber(method.cardNumber || `•••• •••• •••• ${method.last4}`)}
                          </div>
                          <div className="text-[#A0AEC0] text-xs">
                            {method.cardholderName} • Expires {maskExpiryDate(method.expiryDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.isDefault && (
                          <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded">Default</span>
                        )}
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            className="text-[#4299E1] text-xs hover:underline"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleShowPaymentDetails(method)}
                          className="text-[#4299E1] text-xs hover:underline"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleEditPaymentMethod(method)}
                          className="text-yellow-400 text-xs hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemovePaymentMethod(method.id)}
                          className="text-red-400 text-xs hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#A0AEC0]">
                  <div className="text-2xl mb-2">💳</div>
                  <p>No payment methods added yet</p>
                  <p className="text-xs">Add a payment method to make transactions easier</p>
                </div>
              )}
            </div>
          </section>

          {/* Payment Gateways */}
          <section id="gateways" className="card-dark p-6">
            <h2 className="font-semibold mb-4 text-white">Payment Gateways</h2>
            <div className="space-y-4">
              {/* Available Gateways */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Stripe', description: 'Credit cards, digital wallets', icon: '💳' },
                  { name: 'PayPal', description: 'PayPal accounts, credit cards', icon: '🔵' },
                  { name: 'Razorpay', description: 'UPI, cards, net banking', icon: '💎' },
                  { name: 'Square', description: 'Point of sale, online payments', icon: '⬜' }
                ].map((gateway) => {
                  const isConnected = paymentGateways.some(g => g.name === gateway.name);
                  return (
                    <div key={gateway.name} className="bg-[#2D3748] rounded-lg p-4 border border-[#4A5568]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{gateway.icon}</span>
                          <div>
                            <div className="font-medium text-white">{gateway.name}</div>
                            <div className="text-xs text-[#A0AEC0]">{gateway.description}</div>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      </div>
                      {isConnected ? (
                        <div className="space-y-2">
                          <div className="text-xs text-green-400">✓ Connected</div>
                          <button
                            onClick={() => handleDisconnectGateway(paymentGateways.find(g => g.name === gateway.name)?.id)}
                            className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnectGateway(gateway.name)}
                          disabled={connectingGateway}
                          className="w-full bg-[#4299E1] text-white px-3 py-2 rounded text-sm hover:bg-[#3182CE] disabled:opacity-50 transition-colors"
                        >
                          {connectingGateway ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Connected Gateways Status */}
              {paymentGateways.length > 0 && (
                <div className="bg-[#2D3748] rounded-lg p-4 border border-[#4A5568]">
                  <h3 className="font-medium text-white mb-3">Connected Gateways Status</h3>
                  <div className="space-y-2">
                    {paymentGateways.map((gateway) => (
                      <div key={gateway.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">●</span>
                          <span className="text-white">{gateway.name}</span>
                        </div>
                        <div className="text-[#A0AEC0] text-xs">
                          Last sync: {new Date(gateway.lastSync).toLocaleDateString()}
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Security Verification Modal for Payment Details */}
          {showPaymentDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-[#2D3748] rounded-lg p-6 max-w-md w-full mx-4 border border-[#4A5568]">
                <div className="text-center mb-6">
                  <div className="text-3xl mb-2">🔒</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Security Verification Required</h3>
                  <p className="text-[#A0AEC0] text-sm">Enter your 4-digit security PIN to view payment details</p>
                </div>

                {securityLocked ? (
                  <div className="text-center">
                    <div className="text-red-400 text-2xl mb-2">⚠️</div>
                    <p className="text-red-400 font-medium mb-2">Account Temporarily Locked</p>
                    <p className="text-[#A0AEC0] text-sm">Too many failed attempts. Please try again in 5 minutes.</p>
                  </div>
                ) : (
                  <>
                    {!securityVerified ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Security PIN</label>
                          <input
                            type="password"
                            placeholder="Enter 4-digit PIN"
                            value={securityPin}
                            onChange={handleSecurityPinChange}
                            maxLength="4"
                            className="input-dark w-full px-4 py-3 text-center text-lg tracking-widest"
                            autoFocus
                          />
                        </div>
                        {securityAttempts > 0 && (
                          <p className="text-red-400 text-sm text-center">
                            Incorrect PIN. {3 - securityAttempts} attempts remaining.
                          </p>
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowPaymentDetails(false);
                              setSelectedPaymentMethod(null);
                              setSecurityVerified(false);
                            }}
                            className="flex-1 bg-[#4A5568] text-white px-4 py-2 rounded font-medium hover:bg-[#2D3748] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={verifySecurityPin}
                            disabled={securityPin.length !== 4}
                            className="flex-1 bg-[#4299E1] text-white px-4 py-2 rounded font-medium hover:bg-[#3182CE] disabled:opacity-50 transition-colors"
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-[#1A202C] rounded-lg p-4 border border-[#4A5568]">
                          <h4 className="font-medium text-white mb-3">Payment Method Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#A0AEC0]">Card Number:</span>
                              <span className="text-white font-mono">{selectedPaymentMethod?.cardNumber || `•••• •••• •••• ${selectedPaymentMethod?.last4}`}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#A0AEC0]">Expiry Date:</span>
                              <span className="text-white">{selectedPaymentMethod?.expiryDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#A0AEC0]">CVV:</span>
                              <span className="text-white">{maskCVV()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#A0AEC0]">Cardholder:</span>
                              <span className="text-white">{selectedPaymentMethod?.cardholderName}</span>
                            </div>
                            {selectedPaymentMethod?.billingAddress && (
                              <div className="flex justify-between">
                                <span className="text-[#A0AEC0]">Billing Address:</span>
                                <span className="text-white text-right">{selectedPaymentMethod.billingAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowPaymentDetails(false);
                            setSelectedPaymentMethod(null);
                            setSecurityVerified(false);
                          }}
                          className="w-full bg-[#4299E1] text-white px-4 py-2 rounded font-medium hover:bg-[#3182CE] transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Edit Payment Method Modal */}
          {editingPaymentMethod && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-[#2D3748] rounded-lg p-6 max-w-md w-full mx-4 border border-[#4A5568]">
                <div className="text-center mb-6">
                  <div className="text-3xl mb-2">✏️</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Edit Payment Method</h3>
                  <p className="text-[#A0AEC0] text-sm">Enter your security PIN to edit payment details</p>
                </div>

                {securityLocked ? (
                  <div className="text-center">
                    <div className="text-red-400 text-2xl mb-2">⚠️</div>
                    <p className="text-red-400 font-medium mb-2">Account Temporarily Locked</p>
                    <p className="text-[#A0AEC0] text-sm">Too many failed attempts. Please try again in 5 minutes.</p>
                  </div>
                ) : (
                  <>
                    {!securityVerified ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Security PIN</label>
                          <input
                            type="password"
                            placeholder="Enter 4-digit PIN"
                            value={securityPin}
                            onChange={handleSecurityPinChange}
                            maxLength="4"
                            className="input-dark w-full px-4 py-3 text-center text-lg tracking-widest"
                            autoFocus
                          />
                        </div>
                        {securityAttempts > 0 && (
                          <p className="text-red-400 text-sm text-center">
                            Incorrect PIN. {3 - securityAttempts} attempts remaining.
                          </p>
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-[#4A5568] text-white px-4 py-2 rounded font-medium hover:bg-[#2D3748] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={verifySecurityPin}
                            disabled={securityPin.length !== 4}
                            className="flex-1 bg-[#4299E1] text-white px-4 py-2 rounded font-medium hover:bg-[#3182CE] disabled:opacity-50 transition-colors"
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Cardholder Name</label>
                          <input
                            type="text"
                            value={editForm.cardholderName}
                            onChange={(e) => setEditForm(prev => ({ ...prev, cardholderName: e.target.value }))}
                            className="input-dark w-full px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Billing Address</label>
                          <input
                            type="text"
                            value={editForm.billingAddress}
                            onChange={(e) => setEditForm(prev => ({ ...prev, billingAddress: e.target.value }))}
                            className="input-dark w-full px-3 py-2"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-[#4A5568] text-white px-4 py-2 rounded font-medium hover:bg-[#2D3748] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 bg-[#4299E1] text-white px-4 py-2 rounded font-medium hover:bg-[#3182CE] transition-colors"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

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