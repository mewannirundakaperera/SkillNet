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
      archived: 0
    },
    receivedRequests: {
      total: 0,
      pending: 0,
      accepted: 0,
      declined: 0
    },
    allRequests: {
      total: 0,
      available: 0,
      tutoring: 0,
      studyGroups: 0,
      projects: 0
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
          cancelled: 0
        };

        // Count regular requests
        myRequestsSnapshot.forEach(doc => {
          const status = doc.data().status;
          if (status === 'open') {
            myRequestsStats.active++;
          } else if (myRequestsStats[status] !== undefined) {
            myRequestsStats[status]++;
          }
        });

        // Count group requests
        myGroupRequestsSnapshot.forEach(doc => {
          const status = doc.data().status;
          if (myRequestsStats[status] !== undefined) {
            myRequestsStats[status]++;
          }
        });

        // Load Received Requests Stats
        const receivedRequestsRef = collection(db, 'requestResponses');
        const receivedRequestsQuery = query(receivedRequestsRef, where('requesterId', '==', user.id));
        const receivedRequestsSnapshot = await getDocs(receivedRequestsQuery);

        const receivedRequestsStats = {
          total: receivedRequestsSnapshot.size,
          pending: 0,
          accepted: 0,
          declined: 0
        };

        receivedRequestsSnapshot.forEach(doc => {
          const status = doc.data().status;
          if (receivedRequestsStats[status] !== undefined) {
            receivedRequestsStats[status]++;
          }
        });

        // Load All Available Requests Stats (including group requests)
        const allRequestsRef = collection(db, 'requests');
        const allRequestsQuery = query(
          allRequestsRef,
          where('status', 'in', ['open', 'active']),
          where('userId', '!=', user.id)
        );
        const allRequestsSnapshot = await getDocs(allRequestsQuery);

        // Load Group Requests from user's groups
        const userGroupsRef = collection(db, 'groups');
        const userGroupsQuery = query(userGroupsRef, where('members', 'array-contains', user.id));
        const userGroupsSnapshot = await getDocs(userGroupsQuery);
        const userGroupIds = userGroupsSnapshot.docs.map(doc => doc.id);

        let allGroupRequestsSnapshot = { docs: [] };
        if (userGroupIds.length > 0) {
          const allGroupRequestsRef = collection(db, 'grouprequests');
          // Get requests from user's groups
          const allGroupRequestsQuery = query(
            allGroupRequestsRef,
            where('status', 'in', ['pending', 'voting_open', 'accepted', 'payment_complete', 'in_progress'])
          );
          allGroupRequestsSnapshot = await getDocs(allGroupRequestsQuery);
        }

        const allRequestsStats = {
          total: allRequestsSnapshot.size + allGroupRequestsSnapshot.docs.length,
          available: allRequestsSnapshot.size + allGroupRequestsSnapshot.docs.length,
          tutoring: 0,
          studyGroups: allGroupRequestsSnapshot.docs.length, // All group requests count as study groups
          projects: 0
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

        // Load Recent Activity
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

        // Sort by timestamp
        recentActivity.sort((a, b) => b.timestamp - a.timestamp);

        // Calculate weekly stats (simplified)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const weeklyRequestsCreated = myRequestsSnapshot.docs.filter(doc =>
          doc.data().createdAt?.toDate() > oneWeekAgo
        ).length;

        const weeklyStats = {
          requestsCreated: weeklyRequestsCreated,
          requestsJoined: 0, // Would need to track join events
          sessionsCompleted: 0, // Would need sessions collection
          responsesSent: 0 // Would need to track sent responses
        };

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
          myRequests: { total: 0, draft: 0, active: 0, completed: 0, archived: 0 },
          receivedRequests: { total: 0, pending: 0, accepted: 0, declined: 0 },
          allRequests: { total: 0, available: 0, tutoring: 0, studyGroups: 0, projects: 0 },
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
      'open': 'text-green-600',
      'active': 'text-blue-600',
      'pending': 'text-yellow-600',
      'completed': 'text-gray-600',
      'draft': 'text-gray-400',
      'accepted': 'text-green-600',
      'declined': 'text-red-600'
    };
    return colors[status] || 'text-gray-400';
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
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img
            src={userProfile?.avatar || "https://randomuser.me/api/portraits/men/14.jpg"}
            alt={userProfile?.displayName || "User"}
            className="w-16 h-16 rounded-full object-cover border-4 border-blue-100"
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {userProfile?.displayName || "User"}! 👋
            </h1>
            <p className="text-gray-600">Here's an overview of all your request activities</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* My Requests Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Requests</h3>
            <span className="text-blue-500 text-2xl">📝</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-blue-600">{dashboardData.myRequests.total}</span>
              <Link to="/requests/my-requests" className="text-blue-600 text-sm hover:underline">View All</Link>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Active:</span>
                <span className="font-medium text-green-600">{dashboardData.myRequests.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Draft:</span>
                <span className="font-medium text-gray-500">{dashboardData.myRequests.draft}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium text-blue-600">{dashboardData.myRequests.completed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Received Requests Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Received Offers</h3>
            <span className="text-green-500 text-2xl">💬</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-green-600">{dashboardData.receivedRequests.total}</span>
              <Link to="/OneToOneRequests" className="text-green-600 text-sm hover:underline">View All</Link>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-medium text-yellow-600">{dashboardData.receivedRequests.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Accepted:</span>
                <span className="font-medium text-green-600">{dashboardData.receivedRequests.accepted}</span>
              </div>
              <div className="flex justify-between">
                <span>Declined:</span>
                <span className="font-medium text-red-600">{dashboardData.receivedRequests.declined}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Requests Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Available Requests</h3>
            <span className="text-purple-500 text-2xl">🔍</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-purple-600">{dashboardData.allRequests.available}</span>
              <Link to="/requests/group" className="text-purple-600 text-sm hover:underline">Browse</Link>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Tutoring:</span>
                <span className="font-medium text-blue-600">{dashboardData.allRequests.tutoring}</span>
              </div>
              <div className="flex justify-between">
                <span>Study Groups:</span>
                <span className="font-medium text-green-600">{dashboardData.allRequests.studyGroups}</span>
              </div>
              <div className="flex justify-between">
                <span>Projects:</span>
                <span className="font-medium text-purple-600">{dashboardData.allRequests.projects}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Activity Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">This Week</h3>
            <span className="text-orange-500 text-2xl">📊</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-2xl font-bold text-orange-600">{dashboardData.weeklyStats.requestsCreated}</span>
              <span className="text-orange-600 text-sm">Requests Created</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Joined:</span>
                <span className="font-medium">{dashboardData.weeklyStats.requestsJoined}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium">{dashboardData.weeklyStats.sessionsCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span>Responses:</span>
                <span className="font-medium">{dashboardData.weeklyStats.responsesSent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              <Link to="/RequestHistory" className="text-blue-600 text-sm hover:underline">View History</Link>
            </div>

            {dashboardData.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📱</div>
                <p>No recent activity</p>
                <Link to="/requests/create" className="text-blue-600 hover:underline text-sm">
                  Create your first request
                </Link>
              </div>
            )}
          </div>

          {/* Recent Requests Feed */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Latest Requests</h2>
              <Link to="/requests/group" className="text-blue-600 text-sm hover:underline">Browse All</Link>
            </div>

            {recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.slice(0, 4).map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 line-clamp-1">{request.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(request.status)} bg-gray-100`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span>📚 {request.subject}</span>
                      <span className="mx-2">•</span>
                      <span>👤 {request.creator}</span>
                      {request.paymentAmount && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-green-600 font-medium">Rs.{request.paymentAmount}</span>
                        </>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(request.createdAt)}
                      </span>
                      <Link
                        to={`/requests/details/${request.id}`}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🔍</div>
                <p>No recent requests available</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/requests/create"
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg text-center font-medium hover:bg-blue-700 transition-colors block"
              >
                📝 Create New Request
              </Link>
              <Link
                to="/requests/group"
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg text-center font-medium hover:bg-gray-200 transition-colors block"
              >
                🔍 Browse Requests
              </Link>
              <Link
                to="/groups"
                className="w-full bg-green-100 text-green-700 px-4 py-3 rounded-lg text-center font-medium hover:bg-green-200 transition-colors block"
              >
                👥 Join Study Groups
              </Link>
            </div>
          </div>

          {/* Trending Subjects */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Trending Subjects</h3>
            {trendingSubjects.length > 0 ? (
              <div className="space-y-2">
                {trendingSubjects.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-700">{item.subject}</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      {item.count} requests
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No trending subjects yet</p>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-3">💡 Tips for Success</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Be specific in your request descriptions</li>
              <li>• Set realistic deadlines and expectations</li>
              <li>• Respond promptly to received offers</li>
              <li>• Join study groups for collaborative learning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentConnect;