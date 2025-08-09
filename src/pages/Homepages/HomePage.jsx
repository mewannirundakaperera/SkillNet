import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserData } from "@/services/authService";
import { groupService } from "@/services/groupService";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  where
} from "firebase/firestore";
import { db } from "@/config/firebase";

export default function HomePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth(); // ✅ Get auth loading state

  // User and profile state
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false); // ✅ Changed initial loading to false
  const [authInitialized, setAuthInitialized] = useState(false); // ✅ Track auth initialization

  // Activity feed state
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Groups state
  const [suggestedGroups, setSuggestedGroups] = useState([]);
  const [joiningGroups, setJoiningGroups] = useState(new Set());

  // Dashboard stats
  const [stats, setStats] = useState({
    connections: 0,
    groupsJoined: 0,
    postsLiked: 0,
    profileViews: 0
  });

  // Trending topics with real data structure
  const [trendingTopics] = useState([
    { id: 1, name: "Future of Work", icon: "🧳", posts: 1200, trend: "+15%" },
    { id: 2, name: "Generative AI Ethics", icon: "🤖", posts: 850, trend: "+28%" },
    { id: 3, name: "Sustainable Business Practices", icon: "🌱", posts: 620, trend: "+12%" },
    { id: 4, name: "Leadership in Digital Transformation", icon: "💡", posts: 910, trend: "+20%" }
  ]);

  // Visitor content data
  const [features] = useState([
    {
      icon: "🤝",
      title: "Connect & Network",
      description: "Build meaningful professional relationships with like-minded individuals in your field."
    },
    {
      icon: "📚",
      title: "Learn & Grow",
      description: "Access peer-to-peer learning opportunities and skill-sharing sessions."
    },
    {
      icon: "👥",
      title: "Join Groups",
      description: "Participate in focused communities around your interests and professional goals."
    },
    {
      icon: "📅",
      title: "Schedule Sessions",
      description: "Book 1-on-1 learning sessions with experts in various subjects."
    }
  ]);

  const [testimonials] = useState([
    {
      name: "Shanika Rajapaksha",
      role: "Software Engineer",
      avatar: "https://randomuser.me/api/portraits/women/1.jpg",
      quote: "Skill-Net helped me connect with amazing professionals and accelerate my career growth."
    },
    {
      name: "Vinodh kumara",
      role: "Data Scientist",
      avatar: "https://randomuser.me/api/portraits/men/2.jpg",
      quote: "The peer learning sessions have been invaluable for developing my technical skills."
    },
    {
      name: "Nathaliya Vijemuni",
      role: "Product Manager",
      avatar: "https://randomuser.me/api/portraits/women/3.jpg",
      quote: "I've built lasting professional relationships through the groups and networking features."
    }
  ]);

  const [stats_public] = useState({
    users: "10,000+",
    groups: "500+",
    sessions: "25,000+",
    countries: "50+"
  });

  // ✅ NEW: Track auth initialization
  useEffect(() => {
    if (!authLoading) {
      setAuthInitialized(true);
    }
  }, [authLoading]);

  // ✅ UPDATED: Load user profile data with proper loading management
  useEffect(() => {
    const fetchUserProfile = async () => {
      // Wait for auth to be initialized
      if (!authInitialized) return;

      // If not authenticated, no need to load user data
      if (!isAuthenticated || !user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true); // ✅ Set loading when starting to fetch user data

      try {
        const result = await getCurrentUserData(user.id);

        if (result.success) {
          const profileData = {
            ...user,
            ...result.userData,
            displayName: result.userData.displayName || result.userData.name || user.name || "User",
            avatar: result.userData.avatar || result.userData.photoURL || "https://randomuser.me/api/portraits/men/14.jpg",
            joinedGroups: result.userData.joinedGroups || [],
            connections: result.userData.connections || []
          };

          setUserProfile(profileData);

          // Update stats
          setStats({
            connections: profileData.connections?.length || 0,
            groupsJoined: profileData.joinedGroups?.length || 0,
            postsLiked: result.userData.postsLiked?.length || 0,
            profileViews: result.userData.profileViews || 0
          });
        } else {
          // Fallback data
          setUserProfile({
            ...user,
            displayName: user.name || "User",
            avatar: "https://randomuser.me/api/portraits/men/14.jpg",
            joinedGroups: [],
            connections: []
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Set fallback data even on error
        setUserProfile({
          ...user,
          displayName: user.name || "User",
          avatar: "https://randomuser.me/api/portraits/men/14.jpg",
          joinedGroups: [],
          connections: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, isAuthenticated, authInitialized]); // ✅ Added authInitialized dependency

  // Load recent activities (real-time) - only for authenticated users
  useEffect(() => {
    if (!authInitialized || !isAuthenticated || !user?.id) {
      setLoadingActivities(false);
      return;
    }

    const activitiesRef = collection(db, 'activities');
    const activitiesQuery = query(
        activitiesRef,
        where('userId', '==', user.id),
        orderBy('timestamp', 'desc'),
        limit(10)
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      setActivities(activitiesData);
      setLoadingActivities(false);
    }, (error) => {
      console.error("Error loading activities:", error);
      // Fallback to mock data if real data fails
      setActivities(getMockActivities());
      setLoadingActivities(false);
    });

    return () => unsubscribe();
  }, [user, isAuthenticated, authInitialized]); // ✅ Added authInitialized dependency

  // Load suggested groups - only for authenticated users
  useEffect(() => {
    if (!authInitialized || !isAuthenticated || !userProfile) return;

    const fetchSuggestedGroups = async () => {
      try {
        const groupsRef = collection(db, 'groups');
        const groupsQuery = query(groupsRef, limit(6));
        const snapshot = await getDocs(groupsQuery);

        const groups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(group =>
            !userProfile?.joinedGroups?.includes(group.id)
        );

        setSuggestedGroups(groups);
      } catch (error) {
        console.error("Error loading groups:", error);
        // Fallback to mock data
        setSuggestedGroups(getMockGroups());
      }
    };

    fetchSuggestedGroups();
  }, [userProfile, isAuthenticated, authInitialized]); // ✅ Added authInitialized dependency

  // Mock data fallbacks
  const getMockActivities = () => [
    {
      id: '1',
      type: 'connection',
      actorName: 'Neesha Pathirana',
      actorAvatar: 'https://randomuser.me/api/portraits/women/10.jpg',
      action: 'connected with you',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      actionable: true
    },
    {
      id: '2',
      type: 'group_join',
      actorName: 'Janith Vikrama',
      actorAvatar: 'https://randomuser.me/api/portraits/men/11.jpg',
      action: 'joined "AI & Machine Learning" group',
      description: 'Exploring the latest breakthroughs in neural networks and deep learning.',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      actionable: false
    },
    {
      id: '3',
      type: 'like',
      actorName: 'Sudith Arachchi',
      actorAvatar: 'https://randomuser.me/api/portraits/men/12.jpg',
      action: 'liked your post',
      description: '"Insights on Q3 Market Trends"',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      actionable: false
    },
    {
      id: '4',
      type: 'connection',
      actorName: 'Samalka Weerakoon',
      actorAvatar: 'https://randomuser.me/api/portraits/women/13.jpg',
      action: 'connected with you',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      actionable: true
    },
    {
      id: '5',
      type: 'discussion',
      actorName: 'Nalaka Perera',
      actorAvatar: 'https://randomuser.me/api/portraits/men/15.jpg',
      action: 'started a new discussion in "Product Management Forum"',
      description: '"Best Practices for Agile Product Roadmapping"',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      actionable: false
    }
  ];

  const getMockGroups = () => [
    {
      id: 'ai-ml-group',
      name: 'Computer science & technology degree (20/21)',
      description: 'A community of degrees common studies ',
      members: 15432,
      image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=facearea&w=96&h=96',
      category: 'Technology'
    },
    {
      id: 'product-mgmt-group',
      name: 'Product Management Forum',
      description: 'Dedicated to product managers, owners, and strategists',
      members: 8765,
      image: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=facearea&w=96&h=96',
      category: 'Business'
    },
    {
      id: 'startup-founders-group',
      name: 'Startup Founders Network',
      description: 'Connect with fellow entrepreneurs, share challenges',
      members: 4120,
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=facearea&w=96&h=96',
      category: 'Entrepreneurship'
    },
    {
      id: 'digital-marketing-group',
      name: 'Digital Marketing Masters',
      description: 'A hub for digital marketers to discuss SEO, SEM, and more',
      members: 11200,
      image: 'https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=facearea&w=96&h=96',
      category: 'Marketing'
    }
  ];

  // ✅ UPDATED: Handle group joining with improved error handling
  const handleJoinGroup = async (groupId, groupName) => {
    if (!user?.id || joiningGroups.has(groupId)) return;

    setJoiningGroups(prev => new Set([...prev, groupId]));

    try {
      // Use the new group service instead of direct Firestore calls
      const result = await groupService.joinGroup(groupId, user.id);

      if (result.success) {
        // Update local state
        setUserProfile(prev => ({
          ...prev,
          joinedGroups: [...(prev.joinedGroups || []), groupId]
        }));

        setSuggestedGroups(prev =>
            prev.filter(group => group.id !== groupId)
        );

        setStats(prev => ({
          ...prev,
          groupsJoined: prev.groupsJoined + 1
        }));

        // Show success message
        alert(result.message);
      } else {
        // Show error message from the service
        alert(result.message);
      }

    } catch (error) {
      console.error('Error joining group:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setJoiningGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  // ✅ NEW: Add function for leaving groups
  const handleLeaveGroup = async (groupId, groupName) => {
    if (!user?.id) return;

    const confirmLeave = window.confirm(`Are you sure you want to leave "${groupName}"?`);
    if (!confirmLeave) return;

    try {
      const result = await groupService.leaveGroup(groupId, user.id);

      if (result.success) {
        // Update local state
        setUserProfile(prev => ({
          ...prev,
          joinedGroups: (prev.joinedGroups || []).filter(id => id !== groupId)
        }));

        setStats(prev => ({
          ...prev,
          groupsJoined: Math.max(0, prev.groupsJoined - 1)
        }));

        // Show success message
        alert(result.message);
      } else {
        alert(result.message);
      }

    } catch (error) {
      console.error('Error leaving group:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  };

  // ✅ UPDATED: Show loading screen while auth is being determined OR user profile is loading
  if (authLoading || (!authInitialized) || (isAuthenticated && loading)) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {authLoading || !authInitialized ? 'Checking authentication...' : 'Loading your dashboard...'}
            </p>
          </div>
        </div>
    );
  }

  // ======================================
  // VISITOR/UNAUTHENTICATED VIEW
  // ======================================
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen modern-dark-theme">
          {/* Hero Section */}
          <section className="modern-hero text-white relative">
            <div className="modern-hero-content max-w-7xl mx-auto px-4 py-12 md:py-20 text-center">
              <div className="mb-6">
                <span className="text-sm font-semibold tracking-wider text-blue-300 uppercase">MORE THAN A WEBSITE BUILDER</span>
              </div>
              <h1 className="modern-hero-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 md:mb-8">
                YOUR SITE SHOULD DO<br />
                <span className="modern-gradient-text">MORE THAN LOOK GOOD</span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl mb-8 md:mb-12 text-slate-300 max-w-4xl mx-auto px-4 leading-relaxed">
                Learn how to build stunning, fully responsive websites using the power of<br className="hidden md:block" />
                React 19 and Tailwind CSS v4 — from start to finish.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center px-4">
                <Link
                    to="/signup"
                    className="modern-btn modern-btn-primary px-8 md:px-10 py-4 md:py-5 text-base md:text-lg font-bold"
                >
                  Login
                </Link>
                <Link
                    to="/help-support"
                    className="modern-btn modern-btn-secondary px-8 md:px-10 py-4 md:py-5 text-base md:text-lg font-bold"
                >
                  Help
                </Link>
              </div>
            </div>
          </section>

          {/* Platform Stats */}
          <section className="py-12 md:py-16 bg-slate-900">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
                <div className="modern-stat-card">
                  <div className="modern-stat-number">{stats_public.users}</div>
                  <div className="modern-stat-label">Active Users</div>
                </div>
                <div className="modern-stat-card">
                  <div className="modern-stat-number text-purple-400">{stats_public.groups}</div>
                  <div className="modern-stat-label">Learning Groups</div>
                </div>
                <div className="modern-stat-card">
                  <div className="modern-stat-number text-green-400">{stats_public.sessions}</div>
                  <div className="modern-stat-label">Sessions Completed</div>
                </div>
                <div className="modern-stat-card">
                  <div className="modern-stat-number text-orange-400">{stats_public.countries}</div>
                  <div className="modern-stat-label">Countries</div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Skill-Net?</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Everything you need to advance your career through meaningful connections and continuous learning
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="text-4xl mb-4">{feature.icon}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Members Say</h2>
                <p className="text-xl text-gray-600">Real stories from real professionals</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <img
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            className="w-12 h-12 rounded-full mr-4"
                        />
                        <div>
                          <div className="font-bold text-gray-900">{testimonial.name}</div>
                          <div className="text-gray-600 text-sm">{testimonial.role}</div>
                        </div>
                      </div>
                      <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Career?</h2>
              <p className="text-xl mb-8 text-blue-100">
                Join thousands of professionals who are already growing their networks and skills
              </p>
              <Link
                  to="/signup"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg inline-block"
              >
                Start Your Journey Today
              </Link>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-8 px-6 bg-gray-100 text-center text-sm text-gray-500 flex flex-col items-center gap-4">
            <div className="flex gap-6 text-sm">
              <Link to="/help-support" className="text-blue-600 hover:text-blue-700 font-medium">
                Help & Support
              </Link>
              <Link to="/privacy-policy" className="text-gray-600 hover:text-gray-700">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-gray-600 hover:text-gray-700">
                Terms of Service
              </Link>
            </div>
            <span>© 2025 Skill-Net. All rights reserved.</span>
            <span className="flex items-center gap-1 text-xs">
            Made with <span className="text-blue-600 font-bold">Visily</span>
          </span>
          </footer>
        </div>
    );
  }

  // ======================================
  // AUTHENTICATED USER VIEW
  // ======================================
  return (
      <div className="min-h-screen modern-dark-theme">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-4 md:py-8 px-4 flex flex-col lg:flex-row gap-4 md:gap-8">
          <div className="flex-1 flex flex-col gap-8">
            {/* Welcome Banner with Dynamic User Data */}
            <section className="modern-card p-4 md:p-8 flex flex-col items-center text-center mb-2 modern-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                <img
                    src={userProfile?.avatar}
                    alt={userProfile?.displayName}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-blue-400 flex-shrink-0 modern-glow"
                />
                <div className="text-center sm:text-left">
                  <h1 className="modern-heading-2 mb-2">
                    Welcome Back, <span className="modern-gradient-text">{userProfile?.displayName || 'User'}</span>!
                  </h1>
                  <p className="modern-small">
                    {userProfile?.email}
                  </p>
                </div>
              </div>
              <p className="modern-body mb-6 max-w-2xl">
                Connect. Collaborate. Grow. Your professional journey continues here.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                    to="/help-support"
                    className="modern-btn modern-btn-primary px-4 sm:px-6 py-3 text-center text-sm md:text-base"
                >
                  Help & Support
                </Link>
                <Link
                    to="/profile"
                    className="modern-btn modern-btn-secondary px-4 sm:px-6 py-3 text-center text-sm md:text-base"
                >
                  View Profile
                </Link>
              </div>
            </section>

            {/* Recent Activities with Real Data */}
            <section className="modern-card p-4 md:p-6 mb-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-4">
                <h2 className="modern-heading-3">Recent Activities</h2>
                <Link to="/activities" className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors self-start sm:self-auto">
                  View All
                </Link>
              </div>

              {loadingActivities ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
              ) : activities.length > 0 ? (
                  <ul className="flex flex-col gap-4">
                    {activities.map((activity) => (
                        <li key={activity.id} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-3">
                            <img
                                src={activity.actorAvatar}
                                alt={activity.actorName}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                        <span>
                          <b className="text-blue-700">{activity.actorName}</b> {activity.action}
                        </span>
                              {activity.description && (
                                  <div className="text-gray-400 text-xs">{activity.description}</div>
                              )}
                              <span className="text-gray-400 text-xs">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                            </div>
                          </div>
                          {activity.actionable && (
                              <Link
                                  to={`/profile/${activity.actorId || '#'}`}
                                  className="text-blue-600 text-sm font-medium hover:underline"
                              >
                                View Profile
                              </Link>
                          )}
                        </li>
                    ))}
                  </ul>
              ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No recent activities to show.</p>
                    <Link to="/explore" className="text-blue-600 hover:underline">
                      Explore the network to get started
                    </Link>
                  </div>
              )}
            </section>

            
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-96 flex flex-col gap-4 md:gap-8">
            {/* Enhanced Dashboard with Real Stats */}
            <section className="modern-card p-4 md:p-6 flex flex-col items-center mb-2">
              <h3 className="modern-heading-3 mb-4">My Dashboard</h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4 w-full text-center">
                <div className="modern-stat-card">
                  <div className="modern-stat-number">{stats.connections.toLocaleString()}</div>
                  <div className="modern-stat-label">Connections</div>
                </div>
                <div className="modern-stat-card">
                  <div className="modern-stat-number text-green-400">{stats.groupsJoined}</div>
                  <div className="modern-stat-label">Groups</div>
                </div>
                <div className="modern-stat-card">
                  <div className="modern-stat-number text-purple-400">{stats.postsLiked}</div>
                  <div className="modern-stat-label">Posts Liked</div>
                </div>
                <div className="modern-stat-card">
                  <div className="modern-stat-number text-orange-400">{stats.profileViews}</div>
                  <div className="modern-stat-label">Profile Views</div>
                </div>
              </div>
            </section>

            {/* Interactive Suggested Groups */}
            <section className="modern-card p-4 md:p-6 mb-2">
              <h3 className="modern-heading-3 mb-4">Suggested Groups</h3>
              {suggestedGroups.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {suggestedGroups.slice(0, 4).map((group) => (
                        <div key={group.id} className="modern-list-item flex gap-3 md:gap-4 items-center">
                          <img
                              src={group.image}
                              alt={group.name}
                              className="w-12 h-12 md:w-16 md:h-16 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm md:text-base truncate">{group.name}</div>
                            <div className="text-xs md:text-sm text-gray-500 mb-1">
                              {group.members?.toLocaleString() || 0} Members
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2 hidden sm:block">
                              {group.description}
                            </div>
                            {group.category && (
                                <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded">
                          {group.category}
                        </span>
                            )}
                          </div>
                          <button
                              onClick={() => handleJoinGroup(group.id, group.name)}
                              disabled={joiningGroups.has(group.id)}
                              className="modern-btn modern-btn-primary px-3 md:px-4 py-2 text-xs flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="hidden sm:inline">
                              {joiningGroups.has(group.id) ? 'Joining...' : 'Join Group'}
                            </span>
                            <span className="sm:hidden">
                              {joiningGroups.has(group.id) ? '...' : 'Join'}
                            </span>
                          </button>
                        </div>
                    ))}
                  </div>
              ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No new groups to suggest right now.</p>
                    <Link to="/groups" className="text-blue-600 hover:underline text-sm">
                      Browse all groups
                    </Link>
                  </div>
              )}
            </section>

            {/* Premium Features Card */}
            
          </aside>
        </main>

        
        
      </div>
  );
}