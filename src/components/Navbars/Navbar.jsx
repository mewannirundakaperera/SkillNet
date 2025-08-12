import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserData } from "@/services/authService";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  ComputerIcon,
  GroupIcon,
  GlobeIcon,
  FireIcon,
  StarIcon,
  LightningIcon,
  DocumentIcon,
  ClockIcon,
  TrophyIcon,
  ChatIcon,
  LightbulbIcon,
  BookIcon,
  GraduationIcon,
  MusicIcon,
  ClipboardIcon,
  MoneyIcon,
  RefreshIcon,
  UserIcon,
  WrenchIcon
} from "@/components/Icons/SvgIcons";

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

  // Handle search functionality
  const handleSearch = async (value) => {
    setSearchQuery(value);
    if (value.length < 2) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    // Simulate search delay
    setTimeout(() => {
      // Mock search results - replace with actual search logic
      const mockResults = [
        {
          type: 'user',
          id: '1',
          displayName: 'John Doe',
          email: 'john@example.com',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
        },
        {
          type: 'group',
          id: '1',
          name: 'React Developers',
          memberCount: 150,
          image: 'https://randomuser.me/api/portraits/men/2.jpg'
        }
      ];

      setSearchResults(mockResults);
      setSearchLoading(false);
    }, 500);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle click outside
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

  // Navigation configuration
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
              className="text-white hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="btn-gradient-primary px-4 py-2 rounded-md text-sm font-medium transition-all duration-300"
            >
              Sign up/Login
            </Link>
          </div>
        ),
        navItems: []
      };
    }

    // Request pages
    if (currentPath.includes('/request') || currentPath === '/StudentConnect') {
      return {
        showSearch: true,
        showNotifications: true,
        showProfile: true,
        searchPlaceholder: "Search requests, users, groups...",
        rightSection: (
          <Link
            to="/requests/create"
            className="btn-gradient-primary rounded-lg px-4 py-2 font-semibold transition-all duration-300 text-sm"
          >
            + Create Request
          </Link>
        ),
        navItems: [
          { to: "/", label: "Home" },
          { to: "/StudentConnect", label: "Dashboard" },
          { to: "/requests/group", label: "Group Requests" },
          { to: "/OneToOneRequests", label: "1-to-1 Requests" },
          { to: "/RequestHistory", label: "History" }
        ]
      };
    }

    // Groups listing page - hide Discover Groups button
    if (currentPath === '/groups') {
      return {
        showSearch: true,
        showNotifications: true,
        showProfile: true,
        searchPlaceholder: "Search groups, members...",
        rightSection: null,
        navItems: [] // Empty navItems to hide Discover Groups button
      };
    }

    // Chat pages - show Discover Groups button
    if (currentPath.includes('/chat') || currentPath === '/GroupChat' || currentPath.startsWith('/group/')) {
      return {
        showSearch: true,
        showNotifications: true,
        showProfile: true,
        searchPlaceholder: "Search groups, members...",
        rightSection: null,
        navItems: [
          { to: "/groups", label: "Discover Groups" }
        ]
      };
    }

    // Teach & Learn pages
    if (currentPath.includes('/teach') || currentPath.includes('/SelectTeacher')) {
      return {
        showSearch: true,
        showNotifications: true,
        showProfile: true,
        searchPlaceholder: "Search teachers, subjects...",
        rightSection: (
          <Link
            to="/teach/become-teacher"
            className="btn-gradient-primary rounded-lg px-4 py-2 font-semibold transition-all duration-300 text-sm"
          >
            Become a Teacher
          </Link>
        ),
        navItems: [
          { to: "/", label: "Home" },
          { to: "/SelectTeacher", label: "Find Teachers" },
          { to: "/teach/my-sessions", label: "My Sessions" },
          { to: "/teach/earnings", label: "Earnings" }
        ]
      };
    }

    // Profile/Settings pages
    if (currentPath.includes('/profile') || currentPath.includes('/settings')) {
      return {
        showSearch: false,
        showNotifications: true,
        showProfile: true,
        rightSection: null,
        navItems: [
          { to: "/", label: "Home" },
          { to: "/profile", label: "Profile" },
          { to: "/settings", label: "Settings" }
        ]
      };
    }

    // Default (Home and other pages)
    return {
      showSearch: true,
      showNotifications: true,
      showProfile: true,
      searchPlaceholder: "Search connections, groups, posts...",
      rightSection: (
        <div className="flex gap-2">
          <Link
            to="/requests/create"
            className="btn-gradient-primary rounded-lg px-4 py-2 font-semibold transition-all duration-300 text-sm"
          >
            + Create Request
          </Link>
          <Link
            to="/group/join"
            className="btn-secondary rounded-lg px-4 py-2 font-semibold transition-all duration-300 text-sm"
          >
            Join Groups
          </Link>
        </div>
      ),
      navItems: [
        { to: "/", label: "Home" },
        { to: "/StudentConnect", label: "Requests" },
        { to: "/GroupChat", label: "Groups" },
        { to: "/SelectTeacher", label: "Teach & Learn" },
        { to: "/Settings", label: "Settings" }
      ]
    };
  };

  // Get active link styling
  const getLinkClass = (path) => {
    const baseClass = "nav-link px-3 py-2 rounded-md text-sm font-medium";
    return location.pathname === path
      ? `${baseClass} active`
      : baseClass;
  };

  const navConfig = getNavConfig();

  // Navigation items with dropdowns
  const navigationItems = [
    {
      label: "Explora",
      to: "/explore",
      hasDropdown: true,
      dropdownItems: [
        {
          section: "Subjects & Communities",
          items: [
            { label: "All Subjects", icon: <ComputerIcon className="w-5 h-5" color="#4299E1" />, to: "/subjects" },
            { label: "Course-Based Communities", icon: <GroupIcon className="w-5 h-5" color="#4299E1" />, to: "/communities" },
            { label: "Common Community", icon: <GlobeIcon className="w-5 h-5" color="#4299E1" />, to: "/common" },
            { label: "Popular Topics", icon: <FireIcon className="w-5 h-5" color="#4299E1" />, to: "/topics", isNew: true },
            { label: "Browse Tutors", icon: <StarIcon className="w-5 h-5" color="#4299E1" />, to: "/tutors" }
          ]
        },
        {
          section: "Skill Exchange",
          items: [
            { label: "Free Sessions", icon: <LightningIcon className="w-5 h-5" color="#4299E1" />, to: "/free-sessions" },
            { label: "Paid Sessions", icon: <DocumentIcon className="w-5 h-5" color="#4299E1" />, to: "/paid-sessions" },
            { label: "Upcoming Sessions", icon: <ClockIcon className="w-5 h-5" color="#4299E1" />, to: "/upcoming", isNew: true },
            { label: "Most Requested", icon: <TrophyIcon className="w-5 h-5" color="#4299E1" />, to: "/requested" },
            { label: "Tutor Reviews", icon: <ChatIcon className="w-5 h-5" color="#4299E1" />, to: "/reviews" }
          ]
        },
        {
          section: "Knowledge Boards",
          items: [
            { label: "Latest Questions", icon: <LightbulbIcon className="w-5 h-5" color="#4299E1" />, to: "/questions" },
            { label: "Paid Sessions", icon: <DocumentIcon className="w-5 h-5" color="#4299E1" />, to: "/paid" },
            { label: "Trending Topics", icon: <FireIcon className="w-5 h-5" color="#4299E1" />, to: "/trending", isNew: true },
            { label: "Most Viewed Answers", icon: <BookIcon className="w-5 h-5" color="#4299E1" />, to: "/answers" },
            { label: "New Teachers", icon: <GraduationIcon className="w-5 h-5" color="#4299E1" />, to: "/teachers" }
          ]
        }
      ]
    },
    {
      label: "Teach",
      to: "/teach",
      hasDropdown: true,
      dropdownItems: [
        {
          section: "Become a Tutor",
          items: [
            { label: "Register as Tutor", icon: <MusicIcon className="w-5 h-5" color="#4299E1" />, to: "/register-tutor" },
            { label: "Set Available Subjects", icon: <ClipboardIcon className="w-5 h-5" color="#4299E1" />, to: "/subjects" },
            { label: "Add Time Slots", icon: <ClockIcon className="w-5 h-5" color="#4299E1" />, to: "/time-slots" },
            { label: "Set Price (Optional)", icon: <MoneyIcon className="w-5 h-5" color="#4299E1" />, to: "/pricing" }
          ]
        },
        {
          section: "Manage Teaching",
          items: [
            { label: "Your Sessions", icon: <RefreshIcon className="w-5 h-5" color="#4299E1" />, to: "/sessions" },
            { label: "Earnings", icon: <MoneyIcon className="w-5 h-5" color="#4299E1" />, to: "/earnings" },
            { label: "Student Feedback", icon: <ChatIcon className="w-5 h-5" color="#4299E1" />, to: "/feedback", isNew: true },
            { label: "Edit Tutor Profile", icon: <UserIcon className="w-5 h-5" color="#4299E1" />, to: "/edit-profile" }
          ]
        }
      ]
    },
    {
      label: "Learn",
      to: "/learn",
      hasDropdown: true,
      dropdownItems: [
        {
          section: "Learning Options",
          items: [
            { label: "Request Knowledge", icon: <DocumentIcon className="w-5 h-5" color="#4299E1" />, to: "/request-knowledge" },
            { label: "Request Help", icon: <WrenchIcon className="w-5 h-5" color="#4299E1" />, to: "/request-help" },
            { label: "One-on-One Learning", icon: <GroupIcon className="w-5 h-5" color="#4299E1" />, to: "/one-on-one" },
            { label: "Group Sessions", icon: <GroupIcon className="w-5 h-5" color="#4299E1" />, to: "/group-sessions", isNew: true },
            { label: "Join Upcoming Session", icon: <ClockIcon className="w-5 h-5" color="#4299E1" />, to: "/join-session" }
          ]
        },
        {
          section: "My Learning",
          items: [
            { label: "Enrolled Sessions", icon: <ClipboardIcon className="w-5 h-5" color="#4299E1" />, to: "/enrolled" },
            { label: "Learning History", icon: <ClipboardIcon className="w-5 h-5" color="#4299E1" />, to: "/history" },
            { label: "Notes", icon: <DocumentIcon className="w-5 h-5" color="#4299E1" />, to: "/notes" },
            { label: "Ask a Tutor", icon: <ChatIcon className="w-5 h-5" color="#4299E1" />, to: "/ask-tutor" }
          ]
        }
      ]
    },
    { label: "Messages", to: "/messages", hasDropdown: false },
    { label: "More", to: "/more", hasDropdown: false }
  ];

  return (
          <nav className="bg-[#0A0D14] shadow-lg border-b border-[#2D3748] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section - Logo and Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src="/brain-logo.png" alt="Logo" className="h-8 w-8" />
              <div className="flex items-center">
                <span className="font-bold text-xl text-[#4299E1]">Skill</span>
                <span className="font-bold text-xl text-white">Net</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <div key={item.label} className="relative">
                  <button
                    className={`nav-link px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 ${
                      activeDropdown === item.label ? 'text-[#4299E1]' : 'text-white'
                    }`}
                    onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                    onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.label)}
                    onMouseLeave={() => item.hasDropdown && setActiveDropdown(null)}
                  >
                    {item.label}
                    {item.hasDropdown && (
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          activeDropdown === item.label ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {item.hasDropdown && activeDropdown === item.label && (
                    <div
                      className="absolute top-full left-0 mt-2 w-96 dropdown-dark py-4 z-50"
                      onMouseEnter={() => setActiveDropdown(item.label)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      <div className="grid grid-cols-3 gap-6 px-6">
                        {item.dropdownItems.map((section, sectionIndex) => (
                          <div key={sectionIndex}>
                            <h3 className="font-bold text-sm text-[#2D3748] mb-3 uppercase tracking-wide">
                              {section.section}
                            </h3>
                            <ul className="space-y-2">
                              {section.items.map((subItem, itemIndex) => (
                                <li key={itemIndex}>
                                  <Link
                                    to={subItem.to}
                                    className="flex items-center gap-2 text-sm text-[#4A5568] hover:text-[#4299E1] transition-colors group"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    <span className="text-lg group-hover:scale-110 transition-transform">
                                      {subItem.icon}
                                    </span>
                                    <span className="flex-1">{subItem.label}</span>
                                    {subItem.isNew && (
                                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                        NEW
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search Bar (conditional) */}
            {navConfig.showSearch && (
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={navConfig.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="input-dark w-64 pl-10 pr-4 py-2"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#A0AEC0]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 dropdown-dark mt-1 max-h-80 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4299E1] mx-auto"></div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((result, index) => (
                          <Link
                            key={`${result.type}-${result.id}-${index}`}
                            to={
                              result.type === 'user' ? `/profile/${result.id}` :
                              result.type === 'group' ? `/groups/${result.id}` :
                              `/requests/details/${result.id}`
                            }
                            className="flex items-center gap-3 p-3 hover:bg-[#1A202C] border-b border-[#2D3748] last:border-b-0"
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
                            <div>
                              <div className="font-medium text-sm text-[#2D3748]">
                                {result.displayName || result.name || result.title}
                              </div>
                              <div className="text-xs text-[#A0AEC0]">
                                {result.type === 'user' ? result.email :
                                 result.type === 'group' ? `${result.memberCount || 0} members` :
                                 result.subject || 'Request'}
                              </div>
                            </div>
                            <span className="ml-auto text-xs bg-[#1A202C] px-2 py-1 rounded text-[#A0AEC0] border border-[#2D3748]">
                              {result.type === 'user' ? 'Person' :
                               result.type === 'group' ? 'Group' : 'Request'}
                            </span>
                          </Link>
                        ))}
                      </>
                    ) : searchQuery.length >= 2 ? (
                      <div className="p-4 text-center text-[#A0AEC0]">
                        No results found for "{searchQuery}"
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Page-specific Right Section */}
            {navConfig.rightSection}

            {/* Notifications (conditional) */}
            {navConfig.showNotifications && (
              <div className="relative">
                <button className="relative p-2 text-white hover:text-[#4299E1] transition-colors">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a8.38 8.38 0 010-6L20 4h-5M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* User Profile (conditional) */}
            {navConfig.showProfile && userProfile && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 hover:bg-[#1A202C] px-2 py-1 rounded transition-colors"
                >
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.displayName}
                    className="h-8 w-8 rounded-full object-cover border-2 border-white shadow"
                  />
                  <span className="font-medium text-white text-sm">
                    {userProfile.displayName}
                  </span>
                  <svg
                    className={`h-4 w-4 text-[#A0AEC0] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute top-full right-0 dropdown-dark mt-1 w-64 py-2">
                    <div className="px-4 py-2 border-b border-[#4A5568]">
                      <div className="font-medium text-sm text-white">{userProfile.displayName}</div>
                      <div className="text-xs text-[#A0AEC0]">{userProfile.email}</div>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[#1A202C] transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <svg className="h-4 w-4 text-[#A0AEC0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm text-[#2D3748]">View Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[#1A202C] transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <svg className="h-4 w-4 text-[#A0AEC0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-[#2D3748]">Settings</span>
                    </Link>

                    <Link
                      to="/help-and-support"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[#1A202C] transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <svg className="h-4 w-4 text-[#A0AEC0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-[#2D3748]">Help & Support</span>
                    </Link>

                    <div className="border-t border-[#2D3748] mt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1A202C] transition-colors w-full text-left text-red-400"
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
            className="md:hidden flex items-center p-2 text-white focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#2D3748] py-4 mobile-nav">
            {/* Mobile Search */}
            {navConfig.showSearch && (
              <div className="px-4 mb-4">
                <input
                  type="text"
                  placeholder={navConfig.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full input-dark px-4 py-2 focus:outline-none"
                />
              </div>
            )}

            {/* Mobile Profile Info */}
            {navConfig.showProfile && userProfile && (
              <div className="flex items-center gap-3 px-4 mb-4 pb-4 border-b border-[#2D3748]">
                <img
                  src={userProfile.avatar}
                  alt={userProfile.displayName}
                  className="h-10 w-10 rounded-full object-cover border-2 border-[#4299E1]"
                />
                <div>
                  <div className="font-medium text-sm text-white">{userProfile.displayName}</div>
                  <div className="text-xs text-[#A0AEC0]">{userProfile.email}</div>
                </div>
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="px-4 space-y-1">
              {navConfig.navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.to
                      ? 'text-[#4299E1] bg-[#1A202C]'
                      : 'text-white hover:text-[#4299E1] hover:bg-[#1A202C]'
                  } transition-colors`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Mobile Action Buttons */}
            <div className="px-4 mt-4 space-y-2">
              {isAuthenticated ? (
                <>
                  {navConfig.rightSection && (
                    <div className="pb-4 border-b border-[#2D3748]">
                      {navConfig.rightSection}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 border border-red-600 text-red-400 rounded hover:bg-red-900 font-semibold text-sm"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block w-full px-4 py-2 border border-[#4299E1] text-[#4299E1] rounded hover:bg-[#2D3748] font-semibold text-sm text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="block w-full px-4 py-2 btn-gradient-primary font-semibold text-sm text-center"
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