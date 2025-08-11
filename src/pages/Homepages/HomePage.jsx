import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, getDoc, orderBy, limit, doc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { GroupsService } from "@/firebase/collections/groups";

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
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [suggestedGroups, setSuggestedGroups] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [isVisitor, setIsVisitor] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setIsVisitor(false);
      loadDashboardData();
    } else if (user === null) {
      // User is not authenticated (visitor)
      setIsVisitor(true);
      setLoading(false);
      loadPublicGroups();
    }
    // If user is undefined, still loading auth state
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user stats
      const userDoc = await getDoc(doc(db, 'users', user.id));
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

      // Load initial groups
      await loadRandomGroups();

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

  const loadRandomGroups = async () => {
    try {
      const groups = await GroupsService.getRandomGroups(user.id, 3);
      setSuggestedGroups(groups);
    } catch (error) {
      console.error('Error loading groups:', error);
      setSuggestedGroups([]);
    }
  };

  const loadPublicGroups = async () => {
    try {
      const groups = await GroupsService.getPublicGroups(3);
      if (groups.length === 0) {
        // If no groups in database, show sample groups for demonstration
        setSuggestedGroups([
          {
            id: 'sample-1',
            name: 'Web Development Community',
            description: 'A community for web developers to share knowledge, discuss latest technologies, and collaborate on projects.',
            category: 'technology',
            memberCount: 156,
            image: null,
            photoURL: null,
            createdAt: new Date('2024-01-15'),
            lastActivity: new Date('2024-01-20'),
            members: []
          },
          {
            id: 'sample-2',
            name: 'Creative Design Hub',
            description: 'Connect with fellow designers, share your work, get feedback, and discover new design trends.',
            category: 'creative',
            memberCount: 89,
            image: null,
            photoURL: null,
            createdAt: new Date('2024-01-10'),
            lastActivity: new Date('2024-01-19'),
            members: []
          },
          {
            id: 'sample-3',
            name: 'Business Networking',
            description: 'Professional networking group for entrepreneurs, business owners, and professionals to connect and grow.',
            category: 'business',
            memberCount: 234,
            image: null,
            photoURL: null,
            createdAt: new Date('2024-01-05'),
            lastActivity: new Date('2024-01-21'),
            members: []
          }
        ]);
      } else {
        setSuggestedGroups(groups);
      }
    } catch (error) {
      console.error('Error loading public groups:', error);
      setSuggestedGroups([]);
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

  const handleJoinGroup = async (groupId) => {
    try {
      await GroupsService.joinGroup(groupId, user.id, {
        displayName: user.displayName || user.name,
        photoURL: user.photoURL
      });
      
      // Refresh the groups data
      await loadRandomGroups();
      
      // Update user stats
      setStats(prev => ({
        ...prev,
        groups: prev.groups + 1
      }));
      
      // Show success message (you can add a toast notification here)
      alert('Successfully joined the group!');
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group. Please try again.');
    }
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

  if (loading && !isVisitor) {
    return (
        <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0] text-lg">Loading your dashboard...</p>
        </div>
        </div>
    );
  }

  // Show loading while auth state is being determined
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0] text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVisitor) {
    return (
      <div className="min-h-screen bg-[#1A202C]">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 flex flex-col xl:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-8 min-w-0">
            {/* Welcome Banner for Visitors */}
            <section className="card-dark p-8 flex flex-col items-center text-center mb-2">
              <div className="mb-6">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Welcome to SkillNet</h1>
                <p className="text-xl text-[#E0E0E0] mb-6">Connect. Collaborate. Grow. Join our professional community today.</p>
                <div className="flex gap-4 flex-wrap justify-center">
                  <Link
                    to="/login"
                    className="btn-gradient-primary px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg rounded-lg transition-all duration-300"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </section>

            {/* Public Groups for Visitors */}
            <section className="card-dark p-6 mb-2">
              <div className="flex justify-between items-center mb-6 min-w-0">
                <h2 className="text-2xl font-bold text-white break-words flex-1 min-w-0">
                  Discover Groups
                  <span className="text-sm font-normal text-[#A0AEC0] ml-2">
                    (Public Groups)
                  </span>
                </h2>
                <Link to="/groups" className="text-[#4299E1] text-sm font-medium hover:underline flex-shrink-0">
                  View All Groups
                </Link>
              </div>
              {suggestedGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestedGroups.map((group) => (
                    <div key={group.id} className="group bg-[#1A202C] rounded-lg p-4 hover:bg-[#2D3748] transition-all duration-200 border border-[#2D3748] hover:border-[#4A5568] hover:shadow-lg">
                      {/* Group Image */}
                      <div className="mb-4 text-center">
                        <img
                          src={group.image || group.photoURL || `https://ui-avatars.com/api/?name=${group.name}&background=3b82f6&color=fff&size=80`}
                          alt={group.name}
                          className="w-20 h-20 rounded-lg object-cover border-2 border-[#4A5568] group-hover:border-[#4299E1] transition-colors duration-200 mx-auto"
                        />
                      </div>
                      
                      {/* Group Content */}
                      <div className="text-center mb-4">
                        <h4 className="font-semibold text-lg text-white mb-2 line-clamp-1 group-hover:text-[#4299E1] transition-colors duration-200 break-words" title={group.name}>
                          {group.name}
                        </h4>
                        
                        {/* Category Badge */}
                        {group.category && (
                          <span className="inline-block px-3 py-1 bg-[#4299E1] text-white text-xs rounded-full mb-3">
                            {group.category.charAt(0).toUpperCase() + group.category.slice(1)}
                          </span>
                        )}
                        
                        <div className="text-sm text-[#A0AEC0] mb-3">
                          <span className="font-medium">{group.memberCount?.toLocaleString() || 0}</span> Members
                        </div>
                        
                        <p className="text-sm text-[#E0E0E0] line-clamp-2 leading-relaxed break-words" title={group.description}>
                          {group.description || 'No description available'}
                        </p>
                        
                        {/* Additional Info */}
                        <div className="text-xs text-[#718096] mt-3 space-y-1">
                          {group.createdAt && (
                            <div>Created: {group.createdAt.toLocaleDateString()}</div>
                          )}
                          {group.lastActivity && (
                            <div>Last Active: {group.lastActivity.toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Button for Visitors */}
                      <div className="text-center">
                        <Link
                          to="/login"
                          className="w-full btn-gradient-primary px-4 py-2 font-medium text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-center"
                        >
                          Sign In to Join
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[#A0AEC0]">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold mb-3 text-white">No Public Groups Available</h3>
                  <p className="mb-6">There are no public groups to display right now.</p>
                  <div className="flex justify-center">
                    <Link
                      to="/signup" 
                      className="inline-flex items-center gap-2 bg-[#4299E1] hover:bg-[#3182CE] text-white px-6 py-3 rounded-lg transition-colors text-lg font-medium"
                    >
                      <span>Create Your First Group</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar for Visitors */}
          <aside className="w-full xl:w-96 flex flex-col gap-8 min-w-0">
            {/* Features Overview */}
            <section className="card-dark p-6 flex flex-col items-center mb-2">
              <h3 className="text-xl font-bold mb-6 text-white text-center">Why Join SkillNet?</h3>
              <div className="space-y-4 w-full">
                <div className="p-4 bg-gradient-to-br from-[#4299E1] to-[#00BFFF] rounded-lg text-white text-center">
                  <div className="text-2xl mb-2">🤝</div>
                  <div className="font-semibold">Connect</div>
                  <div className="text-sm opacity-90">Build professional relationships</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#48BB78] to-[#38A169] rounded-lg text-white text-center">
                  <div className="text-2xl mb-2">💡</div>
                  <div className="font-semibold">Collaborate</div>
                  <div className="text-sm opacity-90">Work together on projects</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] rounded-lg text-white text-center">
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-semibold">Grow</div>
                  <div className="text-sm opacity-90">Develop your skills</div>
                </div>
              </div>
            </section>

            {/* Call to Action */}
            <section className="card-dark p-6 text-center">
              <h3 className="text-lg font-bold mb-4 text-white">Ready to Get Started?</h3>
              <p className="text-[#A0AEC0] mb-6">Join thousands of professionals already using SkillNet</p>
              <Link
                to="/signup"
                className="btn-gradient-primary w-full px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-300"
              >
                Create Free Account
              </Link>
            </section>
          </aside>
        </main>
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

          {/* Suggested Groups */}
          <section className="card-dark p-6 mb-2">
            <div className="flex justify-between items-center mb-6 min-w-0">
              <h2 className="text-2xl font-bold text-white break-words flex-1 min-w-0">
                Discover Groups
                <span className="text-sm font-normal text-[#A0AEC0] ml-2">
                  (Random Selection)
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setGroupsLoading(true);
                    try {
                      await loadRandomGroups();
                    } catch (error) {
                      console.error('Error refreshing groups:', error);
                    } finally {
                      setGroupsLoading(false);
                    }
                  }}
                  className="p-2 text-[#4299E1] hover:text-[#00BFFF] transition-colors rounded-lg hover:bg-[#2D3748] disabled:opacity-50"
                  title="Refresh groups"
                  disabled={groupsLoading}
                >
                  {groupsLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4299E1]"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
                <Link to="/groups" className="text-[#4299E1] text-sm font-medium hover:underline flex-shrink-0">
                  View All Groups
                </Link>
              </div>
            </div>
            {suggestedGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestedGroups.map((group) => (
                  <div key={group.id} className="group bg-[#1A202C] rounded-lg p-4 hover:bg-[#2D3748] transition-all duration-200 border border-[#2D3748] hover:border-[#4A5568] hover:shadow-lg">
                    {/* Group Image */}
                    <div className="mb-4 text-center">
                      <img
                        src={group.image || group.photoURL || `https://ui-avatars.com/api/?name=${group.name}&background=3b82f6&color=fff&size=80`}
                        alt={group.name}
                        className="w-20 h-20 rounded-lg object-cover border-2 border-[#4A5568] group-hover:border-[#4299E1] transition-colors duration-200 mx-auto"
                      />
                    </div>
                    
                    {/* Group Content */}
                    <div className="text-center mb-4">
                      <h4 className="font-semibold text-lg text-white mb-2 line-clamp-1 group-hover:text-[#4299E1] transition-colors duration-200 break-words" title={group.name}>
                        {group.name}
                      </h4>
                      
                      {/* Category Badge */}
                      {group.category && (
                        <span className="inline-block px-3 py-1 bg-[#4299E1] text-white text-xs rounded-full mb-3">
                          {group.category.charAt(0).toUpperCase() + group.category.slice(1)}
                        </span>
                      )}
                      
                      <div className="text-sm text-[#A0AEC0] mb-3">
                        <span className="font-medium">{group.memberCount?.toLocaleString() || 0}</span> Members
                      </div>
                      
                      <p className="text-sm text-[#E0E0E0] line-clamp-2 leading-relaxed break-words" title={group.description}>
                        {group.description || 'No description available'}
                      </p>
                      
                      {/* Additional Info */}
                      <div className="text-xs text-[#718096] mt-3 space-y-1">
                        {group.createdAt && (
                          <div>Created: {group.createdAt.toLocaleDateString()}</div>
                        )}
                        {group.lastActivity && (
                          <div>Last Active: {group.lastActivity.toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link
                        to={`/group/${group.id}`}
                        className="flex-1 btn-gradient-primary px-4 py-2 font-medium text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-center"
                      >
                        View Group
                      </Link>
                      <button
                        onClick={() => handleJoinGroup(group.id)}
                        className="px-4 py-2 bg-[#48BB78] hover:bg-[#38A169] text-white font-medium text-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="text-center py-12 text-[#A0AEC0]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto mb-4"></div>
                <p className="text-lg">Loading groups...</p>
              </div>
            ) : (
              <div className="text-center py-12 text-[#A0AEC0]">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold mb-3 text-white">No Groups Available</h3>
                <p className="mb-6">There are no new groups to suggest right now.</p>
                <div className="flex justify-center">
                  <Link
                    to="/groups" 
                    className="inline-flex items-center gap-2 text-[#4299E1] hover:text-[#00BFFF] transition-colors text-sm font-medium hover:underline px-4 py-2 border border-[#4299E1] rounded-lg hover:bg-[#4299E1] hover:text-white"
                  >
                    <span>Browse All Groups</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
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