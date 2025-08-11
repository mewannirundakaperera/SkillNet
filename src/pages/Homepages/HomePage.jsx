import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit, doc } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    connections: 0,
    likes: 0,
    requests: 0,
    groups: 0,
    earnings: 0
  });
  const [chartData, setChartData] = useState({
    connections: [],
    likes: [],
    requests: [],
    groups: [],
    earnings: []
  });
  const [loading, setLoading] = useState(true);
  const [suggestedGroups, setSuggestedGroups] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user stats
      const userDoc = await getDocs(doc(db, 'users', user.id));
      const userData = userDoc.data();

      // Calculate connections (friends count)
      const connections = userData?.friends?.length || 0;

      // Calculate likes (posts liked)
      const likes = userData?.postsLiked?.length || 0;

      // Calculate requests (active requests count)
      const requestsQuery = query(
        collection(db, 'requests'),
        where('requesterId', '==', user.id),
        where('status', 'in', ['active', 'pending', 'accepted'])
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.size;

      // Calculate groups (joined groups count)
      const groups = userData?.groupsJoined?.length || 0;

      // Calculate earnings (from completed requests)
      const earningsQuery = query(
        collection(db, 'requests'),
        where('requesterId', '==', user.id),
        where('status', '==', 'completed')
      );
      const earningsSnapshot = await getDocs(earningsQuery);
      let totalEarnings = 0;
      earningsSnapshot.forEach(doc => {
        const requestData = doc.data();
        if (requestData.budget) {
          totalEarnings += parseFloat(requestData.budget);
        }
      });

      setStats({
        connections,
        likes,
        requests,
        groups,
        earnings: totalEarnings
      });

      // Generate chart data for the last 7 days
      const chartData = generateChartData({
        connections,
        likes,
        requests,
        groups,
        earnings: totalEarnings
      });
      setChartData(chartData);

      // Load suggested groups (groups user hasn't joined)
      const groupsQuery = query(
        collection(db, 'groups'),
        orderBy('createdAt', 'desc'),
        limit(20) // Load more to filter out joined ones
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      const allGroups = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter out groups the user has already joined
      const userJoinedGroups = userData?.groupsJoined || [];
      const suggestedGroups = allGroups.filter(group => 
        !userJoinedGroups.includes(group.id)
      ).slice(0, 6); // Take first 6 after filtering
      
      setSuggestedGroups(suggestedGroups);

      // Load recent requests
      const recentRequestsQuery = query(
        collection(db, 'requests'),
        where('requesterId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(4)
      );
      const recentRequestsSnapshot = await getDocs(recentRequestsQuery);
      const requestsData = recentRequestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentRequests(requestsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (currentStats) => {
    const days = 7;
    const data = {
      connections: [],
      likes: [],
      requests: [],
      groups: [],
      earnings: []
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Generate realistic progression data
      const progress = Math.min(0.9, (days - i) / days);
      
      data.connections.push({
        date: dateStr,
        value: Math.round(currentStats.connections * progress)
      });
      
      data.likes.push({
        date: dateStr,
        value: Math.round(currentStats.likes * progress)
      });
      
      data.requests.push({
        date: dateStr,
        value: Math.round(currentStats.requests * progress)
      });
      
      data.groups.push({
        date: dateStr,
        value: Math.round(currentStats.groups * progress)
      });
      
      data.earnings.push({
        date: dateStr,
        value: Math.round(currentStats.earnings * progress)
      });
    }

    return data;
  };

  const renderChart = (data, color, title) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const minHeight = 60;

    return (
      <div className="bg-[#2D3748] rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 text-center">{title}</h4>
        <div className="flex items-end justify-between h-20 gap-1">
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.value / maxValue) * minHeight : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${Math.max(height, 4)}px`,
                    backgroundColor: color
                  }}
                />
                <span className="text-xs text-[#A0AEC0] mt-1 text-center">
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-2">
          <span className="text-lg font-bold text-white">
            {data[data.length - 1]?.value || 0}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0] text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A202C]">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 flex flex-col xl:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Welcome Banner */}
          <section className="card-dark p-8 flex flex-col items-center text-center mb-2">
            <div className="flex items-center gap-4 mb-4 w-full max-w-full">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.name}&background=3b82f6&color=fff`}
                alt={user?.displayName || user?.name}
                className="w-16 h-16 rounded-full object-cover border-4 border-[#4299E1] flex-shrink-0"
              />
              <div className="min-w-0 flex-1 max-w-full">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white break-words" title={user?.displayName || user?.name || 'User'}>
                  Welcome Back, {user?.displayName || user?.name || 'User'}!
                </h1>
                <p className="text-[#A0AEC0] text-sm break-all" title={user?.email}>
                  {user?.email}
                </p>
              </div>
            </div>
            <p className="text-[#E0E0E0] mb-6 break-words">Connect. Collaborate. Grow. Your professional journey continues here.</p>
            <div className="flex gap-4 flex-wrap">
              <Link
                to="/profile"
                className="btn-gradient-primary px-6 py-3 rounded-lg font-semibold transition-all duration-300"
              >
                View Profile
              </Link>
              <Link
                to="/friends"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-300"
              >
                💬 Friends & Chat
              </Link>
            </div>
          </section>



          {/* Recent Requests */}
          <section className="card-dark p-6 mb-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Requests</h2>
              <Link
                to="/requests/my-requests"
                className="text-[#4299E1] hover:text-[#3182CE] transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-[#2D3748] rounded-lg p-4 hover:bg-[#4A5568] transition-colors duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white truncate flex-1 mr-4">
                      {request.title || 'Untitled Request'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'active' ? 'bg-green-600 text-white' :
                      request.status === 'pending' ? 'bg-yellow-600 text-white' :
                      request.status === 'accepted' ? 'bg-blue-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-[#A0AEC0] text-sm mb-3 line-clamp-2">
                    {request.description || 'No description available'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#A0AEC0]">
                    <span>Budget: Rs. {request.budget || 'Not specified'}</span>
                    <span>{request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="w-full xl:w-96 flex flex-col gap-8 min-w-0">
          {/* Enhanced Dashboard with Five Stats */}
          <section className="card-dark p-6 flex flex-col items-center mb-2">
            <h3 className="text-base font-bold mb-4 text-white break-words">My Dashboard</h3>
            <div className="grid grid-cols-1 gap-4 w-full text-center">
              <div className="p-4 bg-gradient-to-br from-[#4299E1] to-[#00BFFF] rounded-lg text-white hover:scale-105 transition-transform duration-200">
                <div className="text-2xl font-bold">{stats.connections.toLocaleString()}</div>
                <div className="text-sm opacity-90">Connections</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-[#48BB78] to-[#38A169] rounded-lg text-white hover:scale-105 transition-transform duration-200">
                <div className="text-2xl font-bold">{stats.likes.toLocaleString()}</div>
                <div className="text-sm opacity-90">Likes</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] rounded-lg text-white hover:scale-105 transition-transform duration-200">
                <div className="text-2xl font-bold">{stats.requests.toLocaleString()}</div>
                <div className="text-sm opacity-90">Requests</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-[#ED8936] to-[#F56565] rounded-lg text-white hover:scale-105 transition-transform duration-200">
                <div className="text-2xl font-bold">{stats.groups.toLocaleString()}</div>
                <div className="text-sm opacity-90">Groups</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-[#F6AD55] to-[#ED8936] rounded-lg text-white hover:scale-105 transition-transform duration-200">
                <div className="text-2xl font-bold">Rs. {stats.earnings.toLocaleString()}</div>
                <div className="text-sm opacity-90">Earnings</div>
              </div>
            </div>
          </section>



          {/* Recent Requests */}
          <section className="card-dark p-6 mb-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Requests</h2>
              <Link
                to="/requests/my-requests"
                className="text-[#4299E1] hover:text-[#3182CE] transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-[#2D3748] rounded-lg p-4 hover:bg-[#4A5568] transition-colors duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white truncate flex-1 mr-4">
                      {request.title || 'Untitled Request'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'active' ? 'bg-green-600 text-white' :
                      request.status === 'pending' ? 'bg-yellow-600 text-white' :
                      request.status === 'accepted' ? 'bg-blue-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-[#A0AEC0] text-sm mb-3 line-clamp-2">
                    {request.description || 'No description available'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#A0AEC0]">
                    <span>Budget: Rs. {request.budget || 'Not specified'}</span>
                    <span>{request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}