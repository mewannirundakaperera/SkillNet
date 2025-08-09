// Updated IntelligentNavbar.jsx - Now searches userProfiles collection
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserData } from "@/services/authService";

// Dropdown menu data for navigation matching the design images
const navigationData = {
  explora: {
    sections: [
      {
        title: "Subjects & Communities",
        items: [
          { icon: "📚", title: "All Subjects", description: "" },
          { icon: "👥", title: "Course-Based Communities", description: "" },
          { icon: "🌐", title: "Common Community", description: "" },
          { icon: "🔥", title: "Popular Topics", badge: "NEW", description: "" },
          { icon: "⭐", title: "Browse Tutors", description: "" }
        ]
      },
      {
        title: "Skill Exchange",
        items: [
          { icon: "🎯", title: "Free Sessions", description: "" },
          { icon: "💼", title: "Paid Sessions", description: "" },
          { icon: "📅", title: "Upcoming Sessions", badge: "NEW", description: "" },
          { icon: "⭐", title: "Most Requested", description: "" },
          { icon: "👨‍🎓", title: "Tutor Reviews", description: "" }
        ]
      },
      {
        title: "Knowledge Boards",
        items: [
          { icon: "❓", title: "Latest Questions", description: "" },
          { icon: "💰", title: "Paid Sessions", description: "" },
          { icon: "🔥", title: "Trending Topics", badge: "NEW", description: "" },
          { icon: "👁️", title: "Most Viewed Answers", description: "" },
          { icon: "👨‍🏫", title: "New Teachers", description: "" }
        ]
      }
    ]
  },
  teach: {
    sections: [
      {
        title: "Become a Tutor",
        items: [
          { icon: "👨‍🏫", title: "Register as Tutor", description: "" },
          { icon: "🎯", title: "Set Available Subjects", description: "" },
          { icon: "⏰", title: "Add Time Slots", description: "" },
          { icon: "💰", title: "Set Price (Optional)", description: "" }
        ]
      },
      {
        title: "Manage Teaching",
        items: [
          { icon: "📊", title: "Your Sessions", description: "" },
          { icon: "💵", title: "Earnings", description: "" },
          { icon: "⭐", title: "Student Feedback", badge: "NEW", description: "" },
          { icon: "✏️", title: "Edit Tutor Profile", description: "" }
        ]
      }
    ]
  },
  learn: {
    sections: [
      {
        title: "Request Knowledge",
        items: [
          { icon: "🎯", title: "Request Helper", description: "" },
          { icon: "👥", title: "One-on-One Learning", description: "" },
          { icon: "👨‍👩‍👧‍👦", title: "Group Sessions", badge: "NEW", description: "" },
          { icon: "📅", title: "Join Upcoming Session", description: "" }
        ]
      },
      {
        title: "My Learning",
        items: [
          { icon: "📚", title: "Enrolled Sessions", description: "" },
          { icon: "📖", title: "Learning History", description: "" },
          { icon: "📝", title: "Notes", description: "" },
          { icon: "❓", title: "Ask a Tutor", description: "" }
        ]
      }
    ]
  }
};
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function IntelligentNavbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // State management
  const [userProfile, setUserProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownTimeout, setDropdownTimeout] = useState(null);

  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Load user profile when authenticated
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

    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [user, isAuthenticated]);

  // Load notifications for authenticated users
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;

      try {
        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
          notificationsRef,
          where('userId', '==', user.id),
          where('read', '==', false),
          orderBy('timestamp', 'desc'),
          limit(5)
        );

        const snapshot = await getDocs(notificationsQuery);
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setNotifications(notificationsData);
        setUnreadCount(notificationsData.length);
      } catch (error) {
        console.error("Error loading notifications:", error);
        // Mock notifications for fallback
        setNotifications([
          { id: '1', message: 'New connection request from Alice', read: false },
          { id: '2', message: 'You have a new message', read: false }
        ]);
        setUnreadCount(2);
      }
    };

    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [user, isAuthenticated]);

  // Handle search functionality - Updated to use userProfiles collection
  const handleSearch = async (value) => {
    setSearchQuery(value);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    try {
      // Search users in userProfiles collection (public data)
      const usersRef = collection(db, 'userProfiles');
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs
        .map(doc => ({ id: doc.id, type: 'user', ...doc.data() }))
        .filter(user =>
          user.displayName?.toLowerCase().includes(value.toLowerCase()) ||
          user.bio?.toLowerCase().includes(value.toLowerCase()) ||
          user.location?.toLowerCase().includes(value.toLowerCase()) ||
          user.skills?.some(skill => skill.toLowerCase().includes(value.toLowerCase())) ||
          user.interests?.some(interest => interest.toLowerCase().includes(value.toLowerCase()))
        )
        .slice(0, 5); // Increased to 5 since we removed email search

      // Search groups
      const groupsRef = collection(db, 'groups');
      const groupsSnapshot = await getDocs(groupsRef);
      const groups = groupsSnapshot.docs
        .map(doc => ({ id: doc.id, type: 'group', ...doc.data() }))
        .filter(group =>
          group.name?.toLowerCase().includes(value.toLowerCase()) ||
          group.description?.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 3);

      // Search requests (if authenticated)
      let requests = [];
      if (isAuthenticated) {
        const requestsRef = collection(db, 'requests');
        const requestsSnapshot = await getDocs(requestsRef);
        requests = requestsSnapshot.docs
          .map(doc => ({ id: doc.id, type: 'request', ...doc.data() }))
          .filter(request =>
            request.title?.toLowerCase().includes(value.toLowerCase()) ||
            request.description?.toLowerCase().includes(value.toLowerCase())
          )
          .slice(0, 2);
      }

      setSearchResults([...users, ...groups, ...requests]);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setProfileMenuOpen(false);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login", { replace: true });
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define navigation configurations based on page type and auth status
  const getNavConfig = () => {
    const currentPath = location.pathname;

    // Landing page (unauthenticated users)
    if (!isAuthenticated) {
      return {
        showSearch: false,
        showNotifications: false,
        showProfile: false,
        rightSection: (
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="modern-btn modern-btn-ghost px-4 py-2 text-sm"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="modern-btn modern-btn-primary px-6 py-2 text-sm"
            >
              Sign up/Login
            </Link>
          </div>
        ),
        navItems: []
      };
    }

    // Request pages - clean navbar + sidebar navigation
    if (currentPath.includes('/request') || currentPath === '/StudentConnect') {
      return {
        showSearch: true,
        showNotifications: true,
        showProfile: true,
        searchPlaceholder: "Search users, groups, requests...",
        navItems: [
          { to: "/", label: "Home" },
          { to: "/groups", label: "Groups" },
        ]
      };
    }

    // Group/Chat pages - Updated navigation (REMOVED CREATE GROUP BUTTON)
    if (currentPath.includes('/group') || currentPath.includes('/chat') || currentPath.includes('/groups')) {
      return {
        showSearch: true,
        showNotifications: true,
        showProfile: true,
        searchPlaceholder: "Search groups, members...",
        rightSection: null, // ✅ REMOVED: Create Group button from navbar
        navItems: [
          { to: "/", label: "Home" },
          { to: "/groups", label: "My Groups" },
          { to: "/groups/discover", label: "Discover Groups" }
        ]
      };
    }



    // Profile/Settings pages
    if (currentPath.includes('/profile')) {
      return {
        showSearch: false,
        showNotifications: true,
        showProfile: true,
        rightSection: null,
        navItems: [
          { to: "/", label: "Home" },
          { to: "/profile", label: "Profile" },
          { to: "/StudentConnect", label: "Requests" },
          { to: "/groups", label: "Groups" },
        ]
      };
    }

    if (currentPath.includes('/settings')) {
      return {
        showSearch: false,
        showNotifications: true,
        showProfile: true,
        rightSection: null,
        navItems: [
          { to: "/", label: "Home" },
          { to: "/settings", label: "Settings" },
          { to: "/StudentConnect", label: "Requests" },
          { to: "/groups", label: "Groups" },
        ]
      };
    }

    // Homepage - keep it simple like original Navbar.jsx
    if (currentPath === "/") {
      return {
        showSearch: isAuthenticated, // Only show search if authenticated
        showNotifications: isAuthenticated,
        showProfile: isAuthenticated,
        searchPlaceholder: "Search people, groups, posts...",
        rightSection: null, // No extra buttons on homepage
        navItems: [
          { to: "/", label: "Home" },
          { to: "/StudentConnect", label: "Requests" },
          { to: "/groups", label: "Groups" },
        ]
      };
    }

    // Default (other general pages)
    return {
      showSearch: true,
      showNotifications: true,
      showProfile: true,
      searchPlaceholder: "Search people, groups, posts...",
      navItems: [
        { to: "/", label: "Home" },
        { to: "/StudentConnect", label: "Requests" },
        { to: "/groups", label: "Groups" },
      ]
    };
  };

  // Get active link styling
  const getLinkClass = (path) => {
    const baseClass = "hover:text-indigo-600 transition-colors px-3 py-2 rounded-md text-sm font-medium";

    // Special handling for groups routes - highlight for /groups, /chat, /GroupChat paths
    const isGroupsActive = path === "/groups" && (
      location.pathname === "/groups" ||
      location.pathname.startsWith("/chat/") ||
      location.pathname === "/GroupChat" ||
      location.pathname.startsWith("/groups/")
    );

    const isActive = location.pathname === path || isGroupsActive;

    return isActive
      ? `${baseClass} text-indigo-600 bg-indigo-50`
      : `${baseClass} text-gray-700`;
  };

  const navConfig = getNavConfig();

  return (
    <nav className="modern-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="src/assets/skillnet-logo.svg" alt="SkillNet" className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navConfig.navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="modern-nav-item px-3 py-2 text-sm font-medium"
              >
                {item.label}
                <svg className="ml-1 h-4 w-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search Bar (conditional) */}
            {navConfig.showSearch && (
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={navConfig.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="modern-input px-4 py-2 pl-10 w-56 text-sm"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 modern-dropdown mt-1 max-h-80 overflow-y-auto modern-scrollbar">
                    {searchLoading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((result, index) => (
                          <Link
                            key={`${result.type}-${result.id}-${index}`}
                            to={
                              result.type === 'user' ? `/profile/${result.id}` :
                              result.type === 'group' ? `/chat/${result.id}` :
                              `/requests/details/${result.id}`
                            }
                            className="modern-dropdown-item"
                            onClick={() => {
                              setShowSearchResults(false);
                              setSearchQuery("");
                            }}
                          >
                            <img
                              src={
                                result.avatar ||
                                result.image ||
                                "https://randomuser.me/api/portraits/men/14.jpg"
                              }
                              alt={result.displayName || result.name || result.title}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {result.displayName || result.name || result.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {result.type === 'user' ?
                                  result.bio?.substring(0, 50) + (result.bio?.length > 50 ? '...' : '') ||
                                  result.location || 'Skill-Net Member' :
                                 result.type === 'group' ? `${result.memberCount || 0} members` :
                                 result.subject || 'Request'}
                              </div>
                            </div>
                            <span className="ml-auto modern-dropdown-badge">
                              {result.type === 'user' ? 'Person' :
                               result.type === 'group' ? 'Group' : 'Request'}
                            </span>
                          </Link>
                        ))}
                      </>
                    ) : searchQuery.length >= 2 ? (
                      <div className="p-4 text-center text-gray-500">
                        No results found for "{searchQuery}"
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Page-specific Right Section */}
            {navConfig.rightSection}

            

            {/* User Profile (conditional) */}
            {navConfig.showProfile && userProfile && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                >
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.displayName}
                    className="h-8 w-8 rounded-full object-cover border-2 border-white shadow"
                  />
                  <span className="font-medium text-gray-700 text-sm">
                    {userProfile.displayName}
                  </span>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute top-full right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 w-64 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="font-medium text-sm">{userProfile.displayName}</div>
                      <div className="text-xs text-gray-500">{userProfile.email}</div>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm">View Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">Settings</span>
                    </Link>

                    <Link
                      to="/help"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">Help & Support</span>
                    </Link>

                    <div className="border-t border-gray-100 mt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors w-full text-left text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center p-2 text-gray-600 hover:text-indigo-700 focus:outline-none transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-700 py-4 modern-nav">
            {/* Mobile Search */}
            {navConfig.showSearch && (
              <div className="px-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={navConfig.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="modern-input w-full px-4 py-2 pl-10"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Mobile Search Results */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <Link
                        key={`mobile-${result.type}-${result.id}-${index}`}
                        to={
                          result.type === 'user' ? `/profile/${result.id}` :
                          result.type === 'group' ? `/chat/${result.id}` :
                          `/requests/details/${result.id}`
                        }
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery("");
                          setMenuOpen(false);
                        }}
                      >
                        <img
                          src={
                            result.avatar ||
                            result.image ||
                            "https://randomuser.me/api/portraits/men/14.jpg"
                          }
                          alt={result.displayName || result.name || result.title}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {result.displayName || result.name || result.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {result.type === 'user' ?
                              result.bio?.substring(0, 30) + (result.bio?.length > 30 ? '...' : '') ||
                              result.location || 'Skill-Net Member' :
                             result.type === 'group' ? `${result.memberCount || 0} members` :
                             result.subject || 'Request'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Profile Info */}
            {navConfig.showProfile && userProfile && (
              <div className="flex items-center gap-3 px-4 mb-4 pb-4 border-b border-gray-200">
                <img
                  src={userProfile.avatar}
                  alt={userProfile.displayName}
                  className="h-10 w-10 rounded-full object-cover border-2 border-indigo-100"
                />
                <div>
                  <div className="font-medium text-sm">{userProfile.displayName}</div>
                  <div className="text-xs text-gray-500">{userProfile.email}</div>
                </div>
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="px-4 space-y-2">
              {navConfig.navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.to ||
                    (item.to === "/groups" && (location.pathname.startsWith("/chat/") || location.pathname === "/GroupChat" || location.pathname.startsWith("/groups/")))
                      ? 'text-indigo-600 bg-indigo-50 border border-indigo-200'
                      : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {/* Add icons for better mobile UX */}
                  <span className="text-lg mr-3">
                    {item.to === "/" ? "🏠" : 
                     item.to.includes("StudentConnect") || item.to.includes("request") ? "📋" :
                     item.to.includes("groups") || item.to.includes("Groups") ? "👥" :
                     item.to.includes("profile") ? "👤" :
                     item.to.includes("settings") ? "⚙️" : "📍"}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Mobile Action Buttons */}
            <div className="px-4 mt-6 space-y-3 border-t border-gray-200 pt-4">
              {isAuthenticated ? (
                <>
                  {/* Profile Actions */}
                  <div className="space-y-2 mb-4">
                    <Link
                      to="/profile"
                      className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="text-lg mr-3">👤</span>
                      <span className="text-sm font-medium">View Profile</span>
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="text-lg mr-3">⚙️</span>
                      <span className="text-sm font-medium">Settings</span>
                    </Link>
                    <Link
                      to="/help-support"
                      className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="text-lg mr-3">❓</span>
                      <span className="text-sm font-medium">Help & Support</span>
                    </Link>
                  </div>

                  {/* Additional right section content */}
                  {navConfig.rightSection && (
                    <div className="pb-4 border-b border-gray-200">
                      {navConfig.rightSection}
                    </div>
                  )}

                  {/* Sign out */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full px-4 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-semibold text-sm transition-colors"
                  >
                    <span className="text-lg mr-3">🚪</span>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block w-full px-4 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-semibold text-sm text-center transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="block w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm text-center transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}