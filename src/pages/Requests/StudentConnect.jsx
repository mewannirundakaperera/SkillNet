import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentUserData } from "@/services/authService";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "@/config/firebase";

const StudentConnect = () => {
  const { user } = useAuth();

  // User and profile state
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    myRequests: {
      total: 0,
      draft: 0,
      active: 0,
      completed: 0,
      archived: 0,
      pending: 0,
      voting_open: 0,
      accepted: 0,
      payment_complete: 0,
      in_progress: 0,
      cancelled: 0,
      funding: 0,
      paid: 0,
      live: 0
    },
    receivedRequests: {
      total: 0,
      pending: 0,
      accepted: 0,
      declined: 0,
      funding: 0,
      paid: 0,
      live: 0
    },
    allRequests: {
      total: 0,
      available: 0,
      tutoring: 0,
      studyGroups: 0,
      projects: 0,
      voting_open: 0,
      accepted: 0,
      funding: 0
    },
    recentActivity: [],
    upcomingDeadlines: [],
    topSubjects: [],
    weeklyStats: {
      requestsCreated: 0,
      requestsJoined: 0,
      sessionsCompleted: 0,
      responsesSent: 0
    }
  });

  const [recentRequests, setRecentRequests] = useState([]);
  const [trendingSubjects, setTrendingSubjects] = useState([]);

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

  // Load comprehensive dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Load My Requests Stats (both regular and group requests)
        const myRequestsRef = collection(db, 'requests');
        const myRequestsQuery = query(myRequestsRef, where('userId', '==', user.id));
        const myRequestsSnapshot = await getDocs(myRequestsQuery);

        // Load My Group Requests Stats
        const myGroupRequestsRef = collection(db, 'grouprequests');
        const myGroupRequestsQuery = query(myGroupRequestsRef, where('createdBy', '==', user.id));
        const myGroupRequestsSnapshot = await getDocs(myGroupRequestsQuery);

        const myRequestsStats = {
          total: myRequestsSnapshot.size + myGroupRequestsSnapshot.size,
          draft: 0,
          active: 0,
          completed: 0,
          archived: 0,
          pending: 0,
          voting_open: 0,
          accepted: 0,
          payment_complete: 0,
          in_progress: 0,
          cancelled: 0,
          funding: 0,
          paid: 0,
          live: 0
        };

        // Count regular requests
        console.log('🔍 Regular requests found:', myRequestsSnapshot.size);
        myRequestsSnapshot.forEach(doc => {
          const status = doc.data().status;
          console.log('📝 Regular request status:', status);
          if (status === 'open') {
            myRequestsStats.active++;
          } else if (myRequestsStats.hasOwnProperty(status)) {
            myRequestsStats[status]++;
          } else {
            console.log('⚠️ Unknown status for regular request:', status);
          }
        });

        // Count group requests
        console.log('🔍 Group requests found:', myGroupRequestsSnapshot.size);
        myGroupRequestsSnapshot.forEach(doc => {
          const status = doc.data().status;
          console.log('📝 Group request status:', status);
          if (myRequestsStats.hasOwnProperty(status)) {
            myRequestsStats[status]++;
          } else {
            console.log('⚠️ Unknown status for group request:', status);
          }
        });

        // Log final myRequests stats
        console.log('📊 Final myRequests stats:', myRequestsStats);

        // Load Received Requests Stats - Enhanced to include more sources
        const receivedRequestsRef = collection(db, 'requestResponses');
        const receivedRequestsQuery = query(receivedRequestsRef, where('requesterId', '==', user.id));
        const receivedRequestsSnapshot = await getDocs(receivedRequestsQuery);

        // Also check for group request responses - including voting_open for pending count
        const groupResponsesRef = collection(db, 'grouprequests');
        const groupResponsesQuery = query(
          groupResponsesRef, 
          where('participants', 'array-contains', user.id),
          where('status', 'in', ['accepted', 'funding', 'paid', 'live', 'voting_open'])
        );
        const groupResponsesSnapshot = await getDocs(groupResponsesQuery);

        const receivedRequestsStats = {
          total: 0, // Will be calculated after processing all statuses
          pending: 0,
          accepted: 0,
          declined: 0,
          paid: 0,
          live: 0
        };

        receivedRequestsSnapshot.forEach(doc => {
          const status = doc.data().status;
          if (receivedRequestsStats.hasOwnProperty(status)) {
            receivedRequestsStats[status]++;
          } else {
            console.log('⚠️ Unknown status for received request:', status);
          }
        });

        groupResponsesSnapshot.forEach(doc => {
          const status = doc.data().status;
          if (receivedRequestsStats.hasOwnProperty(status)) {
            receivedRequestsStats[status]++;
          } else {
            console.log('⚠️ Unknown status for group response:', status);
          }
        });



        // ✅ NEW: Calculate pending count as one-to-one pending + group voting_open
        // This replaces the old "funding" count in Received Offers to show:
        // - One-to-one requests with "pending" status
        // - Group requests with "voting_open" status (where user is participant)
        const oneToOnePending = receivedRequestsSnapshot.docs.filter(doc => 
          doc.data().status === 'pending'
        ).length;
        
        const groupVotingOpen = groupResponsesSnapshot.docs.filter(doc => 
          doc.data().status === 'voting_open'
        ).length;
        
        receivedRequestsStats.pending = oneToOnePending + groupVotingOpen;
        
        // Calculate total after processing all statuses
        receivedRequestsStats.total = Object.values(receivedRequestsStats).reduce((sum, count) => sum + count, 0);

        // Load All Available Requests Stats (including group requests) - Enhanced
        const allRequestsRef = collection(db, 'requests');
        const allRequestsQuery = query(
          allRequestsRef,
          where('status', 'in', ['open', 'active', 'pending']),
          where('userId', '!=', user.id)
        );
        const allRequestsSnapshot = await getDocs(allRequestsQuery);

        // Load Group Requests from user's groups - Enhanced
        const userGroupsRef = collection(db, 'groups');
        const userGroupsQuery = query(userGroupsRef, where('members', 'array-contains', user.id));
        const userGroupsSnapshot = await getDocs(userGroupsQuery);
        const userGroupIds = userGroupsSnapshot.docs.map(doc => doc.id);

        let allGroupRequestsSnapshot = { docs: [] };
        if (userGroupIds.length > 0) {
          const allGroupRequestsRef = collection(db, 'grouprequests');
          // Get requests from user's groups with more statuses
          const allGroupRequestsQuery = query(
            allGroupRequestsRef,
            where('status', 'in', ['pending', 'voting_open', 'accepted', 'funding', 'payment_complete', 'in_progress'])
          );
          allGroupRequestsSnapshot = await getDocs(allGroupRequestsQuery);
        }

        const allRequestsStats = {
          total: allRequestsSnapshot.size + allGroupRequestsSnapshot.docs.length,
          available: allRequestsSnapshot.size + allGroupRequestsSnapshot.docs.length,
          tutoring: 0,
          studyGroups: allGroupRequestsSnapshot.docs.length,
          projects: 0,
          voting_open: 0,
          accepted: 0,
          funding: 0
        };

        const subjectCount = {};
        
        // Count regular requests
        allRequestsSnapshot.forEach(doc => {
          const data = doc.data();
          const type = data.type;
          const subject = data.subject;

          // Count by type
          if (type === 'tutoring') allRequestsStats.tutoring++;
          else if (type === 'study-group') allRequestsStats.studyGroups++;
          else if (type === 'project-help') allRequestsStats.projects++;

          // Count subjects for trending
          if (subject) {
            subjectCount[subject] = (subjectCount[subject] || 0) + 1;
          }
        });

        // Count group requests
        allGroupRequestsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const category = data.category || data.subject;
          const status = data.status;

          // Count by status
          if (status === 'voting_open') allRequestsStats.voting_open++;
          else if (status === 'accepted') allRequestsStats.accepted++;
          else if (status === 'funding') allRequestsStats.funding++;

          // Count subjects for trending
          if (category) {
            subjectCount[category] = (subjectCount[category] || 0) + 1;
          }
        });

        // Get trending subjects
        const trending = Object.entries(subjectCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([subject, count]) => ({ subject, count }));

        setTrendingSubjects(trending);

        // Load Recent Activity - Enhanced
        const recentActivity = [];

        // Get recent regular requests created by user
        const recentMyRequestsQuery = query(
          myRequestsRef,
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const recentMyRequestsSnapshot = await getDocs(recentMyRequestsQuery);

        recentMyRequestsSnapshot.forEach(doc => {
          const data = doc.data();
          recentActivity.push({
            id: doc.id,
            type: 'created',
            title: data.topic || data.title,
            timestamp: data.createdAt?.toDate() || new Date(),
            status: data.status
          });
        });

        // Get recent group requests created by user
        const recentMyGroupRequestsQuery = query(
          myGroupRequestsRef,
          where('createdBy', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const recentMyGroupRequestsSnapshot = await getDocs(recentMyGroupRequestsQuery);

        recentMyGroupRequestsSnapshot.forEach(doc => {
          const data = doc.data();
          recentActivity.push({
            id: doc.id,
            type: 'group_created',
            title: data.title,
            timestamp: data.createdAt?.toDate() || data.updatedAt?.toDate() || new Date(),
            status: data.status
          });
        });

        // Get recent responses received
        const recentResponsesQuery = query(
          receivedRequestsRef,
          where('requesterId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const recentResponsesSnapshot = await getDocs(recentResponsesQuery);

        recentResponsesSnapshot.forEach(doc => {
          const data = doc.data();
          recentActivity.push({
            id: doc.id,
            type: 'response',
            title: `Response from ${data.responderName}`,
            timestamp: data.createdAt?.toDate() || new Date(),
            status: data.status
          });
        });

        // Get recent group participations
        const recentGroupParticipationsQuery = query(
          groupResponsesRef,
          where('participants', 'array-contains', user.id),
          orderBy('updatedAt', 'desc'),
          limit(2)
        );
        const recentGroupParticipationsSnapshot = await getDocs(recentGroupParticipationsQuery);

        recentGroupParticipationsSnapshot.forEach(doc => {
          const data = doc.data();
          recentActivity.push({
            id: doc.id,
            type: 'joined',
            title: `Joined: ${data.title}`,
            timestamp: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
            status: data.status
          });
        });

        // Sort by timestamp
        recentActivity.sort((a, b) => b.timestamp - a.timestamp);

        // Calculate weekly stats - Enhanced
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const weeklyRequestsCreated = myRequestsSnapshot.docs.filter(doc =>
          doc.data().createdAt?.toDate() > oneWeekAgo
        ).length;

        const weeklyGroupRequestsCreated = myGroupRequestsSnapshot.docs.filter(doc =>
          doc.data().createdAt?.toDate() > oneWeekAgo
        ).length;

        const weeklyResponsesReceived = receivedRequestsSnapshot.docs.filter(doc =>
          doc.data().createdAt?.toDate() > oneWeekAgo
        ).length;

        const weeklyStats = {
          requestsCreated: weeklyRequestsCreated + weeklyGroupRequestsCreated,
          requestsJoined: groupResponsesSnapshot.size,
          sessionsCompleted: myRequestsStats.completed + myRequestsStats.live,
          responsesSent: weeklyResponsesReceived
        };

        // Debug logging
        console.log('🔍 Dashboard Data Loaded:', {
          myRequests: myRequestsStats,
          receivedRequests: receivedRequestsStats,
          allRequests: allRequestsStats,
          weeklyStats
        });

        // Update state
        setDashboardData({
          myRequests: myRequestsStats,
          receivedRequests: receivedRequestsStats,
          allRequests: allRequestsStats,
          recentActivity: recentActivity.slice(0, 5),
          upcomingDeadlines: [], // Would need deadline tracking
          topSubjects: trending,
          weeklyStats
        });

      } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Set fallback data
        setDashboardData({
          myRequests: { total: 0, draft: 0, active: 0, completed: 0, archived: 0, pending: 0, voting_open: 0, accepted: 0, payment_complete: 0, in_progress: 0, cancelled: 0, funding: 0, paid: 0, live: 0 },
          receivedRequests: { total: 0, pending: 0, accepted: 0, declined: 0, paid: 0, live: 0 },
          allRequests: { total: 0, available: 0, tutoring: 0, studyGroups: 0, projects: 0, voting_open: 0, accepted: 0, funding: 0 },
          recentActivity: [],
          upcomingDeadlines: [],
          topSubjects: [],
          weeklyStats: { requestsCreated: 0, requestsJoined: 0, sessionsCompleted: 0, responsesSent: 0 }
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Load recent requests for quick view
  useEffect(() => {
    if (!user?.id) return;

    const requestsRef = collection(db, 'requests');
    const recentRequestsQuery = query(
      requestsRef,
      where('status', 'in', ['open', 'active']),
      orderBy('createdAt', 'desc'),
      limit(6)
    );

    const unsubscribe = onSnapshot(recentRequestsQuery, async (snapshot) => {
      const requests = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Load creator info
        let creatorName = 'Unknown User';
        try {
          const userQuery = query(
            collection(db, 'users'),
            where('uid', '==', data.userId)
          );
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            creatorName = userData.displayName || userData.name || 'User';
          }
        } catch (error) {
          console.error('Error loading user:', error);
        }

        requests.push({
          id: docSnap.id,
          title: data.topic || data.title,
          subject: data.subject,
          creator: creatorName,
          createdAt: data.createdAt?.toDate() || new Date(),
          status: data.status,
          type: data.type,
          paymentAmount: data.paymentAmount,
          participants: data.participants || []
        });
      }

      setRecentRequests(requests);
    });

    return () => unsubscribe();
  }, [user]);

  // Utility functions
  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'open': 'text-green-400',
      'active': 'text-[#4299E1]',
      'pending': 'text-yellow-400',
      'completed': 'text-[#A0AEC0]',
      'draft': 'text-[#718096]',
      'accepted': 'text-green-400',
      'declined': 'text-red-400'
    };
    return colors[status] || 'text-[#A0AEC0]';
  };

  const getActivityIcon = (type) => {
    const icons = {
      'created': '📝',
      'response': '💬',
      'joined': '👥',
      'completed': '✅'
    };
    return icons[type] || '📋';
  };

  if (loading) {
    return (
      <div className="p-8 bg-[#1A202C]">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
            <p className="mt-4 text-[#A0AEC0]">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
          <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden">
        {/* Educational Background Pattern */}
        <div className="absolute inset-0">
          {/* Gradient Overlay - Temporarily removed for better background visibility */}
          {/* <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/60 via-[#1E293B]/50 to-[#334155]/60"></div> */}
          
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={userProfile?.avatar || "https://randomuser.me/api/portraits/men/14.jpg"}
              alt={userProfile?.displayName || "User"}
              className="w-16 h-16 rounded-full object-cover border-4 border-[#4299E1] shadow-lg"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {userProfile?.displayName || "User"}! 👋
              </h1>
              <p className="text-[#E0E7FF]">Here's an overview of all your request activities</p>
            </div>
          </div>
        </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* My Requests Overview */}
        <div className="card-dark p-6 border-l-4 border-[#4299E1]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">My Requests</h3>
            <span className="text-[#4299E1] text-2xl">📝</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-[#4299E1]">{dashboardData.myRequests.total}</span>
              <Link to="/requests/my-requests" className="text-[#4299E1] text-sm hover:text-[#00BFFF] transition-colors">View All</Link>
            </div>
            <div className="text-sm text-[#A0AEC0] space-y-1">
              <div className="flex justify-between">
                <span>Active:</span>
                <span className="font-medium text-green-400">{dashboardData.myRequests.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Funding:</span>
                <span className="font-medium text-yellow-400">{dashboardData.myRequests.funding}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium text-[#4299E1]">{dashboardData.myRequests.completed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Received Requests Overview */}
        <div className="card-dark p-6 border-l-4 border-green-400">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Received Offers</h3>
            <span className="text-green-400 text-2xl">💬</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-green-400">{dashboardData.receivedRequests.total}</span>
              <Link to="/requests/available" className="text-green-400 text-sm hover:text-green-300 transition-colors">View All</Link>
            </div>
            <div className="text-sm text-[#A0AEC0] space-y-1">
              <div className="flex justify-between">
                <span>Accepted:</span>
                <span className="font-medium text-green-400">{dashboardData.receivedRequests.accepted}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-medium text-yellow-400">{dashboardData.receivedRequests.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Live:</span>
                <span className="font-medium text-[#4299E1]">{dashboardData.receivedRequests.live}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Requests Overview */}
        <div className="card-dark p-6 border-l-4 border-[#8B5CF6]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Available Requests</h3>
            <span className="text-[#8B5CF6] text-2xl">🔍</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-[#8B5CF6]">{dashboardData.allRequests.available}</span>
              <Link to="/requests/group" className="text-[#8B5CF6] text-sm hover:text-[#A78BFA] transition-colors">Browse</Link>
            </div>
            <div className="text-sm text-[#A0AEC0] space-y-1">
              <div className="flex justify-between">
                <span>Voting Open:</span>
                <span className="font-medium text-yellow-400">{dashboardData.allRequests.voting_open}</span>
              </div>
              <div className="flex justify-between">
                <span>Accepted:</span>
                <span className="font-medium text-green-400">{dashboardData.allRequests.accepted}</span>
              </div>
              <div className="flex justify-between">
                <span>Funding:</span>
                <span className="font-medium text-orange-400">{dashboardData.allRequests.funding}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Activity Overview */}
        <div className="card-dark p-6 border-l-4 border-orange-400">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">This Week</h3>
            <span className="text-orange-400 text-2xl">📊</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-orange-400">{dashboardData.weeklyStats.requestsCreated}</span>
              <span className="text-orange-400 text-sm">Requests Created</span>
            </div>
            <div className="text-sm text-[#A0AEC0] space-y-1">
              <div className="flex justify-between">
                <span>Joined:</span>
                <span className="font-medium text-white">{dashboardData.weeklyStats.requestsJoined}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium text-white">{dashboardData.weeklyStats.sessionsCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span>Responses:</span>
                <span className="font-medium text-white">{dashboardData.weeklyStats.responsesSent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="card-dark p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <Link to="/RequestHistory" className="text-[#4299E1] text-sm hover:text-[#00BFFF] transition-colors">View History</Link>
            </div>

            {dashboardData.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-[#4A5568] rounded-lg">
                    <div className="text-lg">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                        <span className="text-xs text-[#A0AEC0]">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#A0AEC0]">
                <div className="text-4xl mb-2">📱</div>
                <p>No recent activity</p>
                <Link to="/requests/create" className="text-[#4299E1] hover:text-[#00BFFF] transition-colors text-sm">
                  Create your first request
                </Link>
              </div>
            )}
          </div>

          {/* Recent Requests Feed */}
          <div className="card-dark p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Latest Requests</h2>
              <Link to="/requests/group" className="text-[#4299E1] text-sm hover:text-[#00BFFF] transition-colors">Browse All</Link>
            </div>

            {recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.slice(0, 4).map((request) => (
                  <div key={request.id} className="border border-[#4A5568] rounded-lg p-4 hover:bg-[#4A5568] transition-colors bg-[#2D3748]">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-white line-clamp-1">{request.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(request.status)} bg-[#4A5568]`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-[#A0AEC0] mb-2">
                      <span>📚 {request.subject}</span>
                      <span className="mx-2">•</span>
                      <span>👤 {request.creator}</span>
                      {request.paymentAmount && (
                        <>
                          <span className="mx-2">•</span>
                                                     <span className="text-green-400 font-medium">{request.currency || 'Rs.'}{request.paymentAmount}</span>
                        </>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#718096]">
                        {formatTimeAgo(request.createdAt)}
                      </span>
                      <Link
                        to={`/requests/details/${request.id}`}
                        className="text-[#4299E1] text-xs hover:text-[#00BFFF] transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#A0AEC0]">
                <div className="text-4xl mb-2">🔍</div>
                <p>No recent requests available</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card-dark p-6">
            <h3 className="font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/requests/create"
                className="btn-gradient-primary w-full px-4 py-3 rounded-lg text-center font-medium block"
              >
                📝 Create New Request
              </Link>
              <Link
                to="/requests/group"
                className="btn-secondary w-full px-4 py-3 rounded-lg text-center font-medium block"
              >
                🔍 Browse Requests
              </Link>
              <Link
                to="/groups"
                className="w-full bg-[#2D3748] text-green-400 px-4 py-3 rounded-lg text-center font-medium hover:bg-[#4A5568] transition-colors block border border-green-400"
              >
                👥 Join Study Groups
              </Link>
            </div>
          </div>

          {/* Trending Subjects */}
          <div className="card-dark p-6">
            <h3 className="font-bold text-white mb-4">Trending Subjects</h3>
            {trendingSubjects.length > 0 ? (
              <div className="space-y-2">
                {trendingSubjects.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span className="text-sm text-[#E0E0E0]">{item.subject}</span>
                    <span className="text-xs bg-[#4A5568] text-[#4299E1] px-2 py-1 rounded">
                      {item.count} requests
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#A0AEC0]">No trending subjects yet</p>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-[#2D3748] to-[#4A5568] rounded-xl p-6 border border-[#4299E1]">
            <h3 className="font-bold text-white mb-3">💡 Tips for Success</h3>
            <ul className="text-sm text-[#E0E0E0] space-y-2">
              <li>• Be specific in your request descriptions</li>
              <li>• Set realistic deadlines and expectations</li>
              <li>• Respond promptly to received offers</li>
              <li>• Join study groups for collaborative learning</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
  };
  
export default StudentConnect;