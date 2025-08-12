import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, getDoc, orderBy, limit, doc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { GroupsService } from "@/firebase/collections/groups";
import { GroupIcon, LightbulbIcon, RocketIcon } from '@/components/Icons/SvgIcons';

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    connections: 0,
    likes: 0,
    requests: 0,
    groups: 0,
    earnings: 0
  });

  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [suggestedGroups, setSuggestedGroups] = useState([]);

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

      // Calculate requests (all requests user can see: one-to-one + group requests + accepted)
      const requestsQuery = query(
        collection(db, 'requests'),
        where('requesterId', '==', user.id),
        where('status', 'in', ['active', 'pending', 'accepted', 'completed'])
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const oneToOneRequests = requestsSnapshot.size;

      // Get group requests from user's groups
      const userGroups = userData?.groupsJoined || [];
      let groupRequests = 0;
      
      if (userGroups.length > 0) {
        const groupRequestsQuery = query(
          collection(db, 'grouprequests'),
          where('groupId', 'in', userGroups)
        );
        const groupRequestsSnapshot = await getDocs(groupRequestsQuery);
        groupRequests = groupRequestsSnapshot.size;
      }

      // Total requests = one-to-one + group requests
      const requests = oneToOneRequests + groupRequests;

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
        requests,
        groups,
        earnings: totalEarnings
      });

      // Load initial groups
      await loadRandomGroups();

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

  if (loading && !isVisitor) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] flex items-center justify-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-full blur-xl"></div>
          </div>
          <div className="text-center relative z-10">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0] text-lg">Loading your dashboard...</p>
        </div>
        </div>
    );
  }

  // Show loading while auth state is being determined
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-full blur-xl"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0] text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVisitor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden">
        {/* Educational Background Pattern */}
        <div className="absolute inset-0">
          {/* Gradient Overlay - Reduced opacity to show background more */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/60 via-[#1E293B]/50 to-[#334155]/60"></div>
          
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
        <main className="max-w-7xl mx-auto py-8 px-4 flex flex-col xl:flex-row gap-8 relative z-10">
          <div className="flex-1 flex flex-col gap-8 min-w-0">
            {/* Welcome Banner for Visitors */}
            <section className="card-dark p-8 flex flex-col items-center text-center mb-2 backdrop-blur-sm bg-[#1E293B]/80 border border-[#334155]/50">
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
            <section className="card-dark p-6 mb-2 backdrop-blur-sm bg-[#1E293B]/80 border border-[#334155]/50">
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
                    <div key={group.id} className="group bg-[#1E293B]/60 backdrop-blur-sm rounded-lg p-4 hover:bg-[#334155]/60 transition-all duration-200 border border-[#475569]/30 hover:border-[#64748B] hover:shadow-lg">
                      {/* Group Image */}
                      <div className="mb-4 text-center">
                        <img
                          src={group.image || group.photoURL || `https://ui-avatars.com/api/?name=${group.name}&background=3b82f6&color=fff&size=80`}
                          alt={group.name}
                          className="w-20 h-20 rounded-lg object-cover border-2 border-[#475569] group-hover:border-[#4299E1] transition-colors duration-200 mx-auto"
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
                  <div className="text-6xl mb-4">
                    <GroupIcon className="w-24 h-24 mx-auto text-purple-500" />
                  </div>
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
            <section className="card-dark p-6 flex flex-col items-center mb-2 backdrop-blur-sm bg-[#1E293B]/80 border border-[#334155]/50">
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
            <section className="card-dark p-6 text-center backdrop-blur-sm bg-[#1E293B]/80 border border-[#334155]/50">
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
        <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden">
                  {/* Educational Background Pattern */}
        <div className="absolute inset-0">
          {/* Gradient Overlay - Reduced opacity to show background more */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A]/60 via-[#1E293B]/50 to-[#334155]/60"></div>
          
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
          <main className="max-w-7xl mx-auto py-8 px-4 flex flex-col xl:flex-row gap-8 relative z-10">
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Welcome Banner */}
              <section className="card-dark p-8 flex flex-col items-center text-center mb-2 backdrop-blur-sm bg-[#1E293B]/80 border border-[#334155]/50">
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
            </div>
          </section>

          {/* Suggested Groups */}
              <section className="card-dark p-6 mb-2 backdrop-blur-sm bg-[#1E293B]/80 border border-[#334155]/50">
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
                      className="p-2 text-[#4299E1] hover:text-[#00BFFF] transition-colors rounded-lg hover:bg-[#334155]/50 disabled:opacity-50"
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
                      <div key={group.id} className="group bg-[#1E293B]/60 backdrop-blur-sm rounded-lg p-4 hover:bg-[#334155]/60 transition-all duration-200 border border-[#475569]/30 hover:border-[#64748B] hover:shadow-lg">
                    {/* Group Image */}
                    <div className="mb-4 text-center">
                      <img
                        src={group.image || group.photoURL || `https://ui-avatars.com/api/?name=${group.name}&background=3b82f6&color=fff&size=80`}
                        alt={group.name}
                            className="w-20 h-20 rounded-lg object-cover border-2 border-[#475569] group-hover:border-[#4299E1] transition-colors duration-200 mx-auto"
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
                    <div className="text-6xl mb-4">
                        <GroupIcon className="w-24 h-24 mx-auto text-purple-500" />
                      </div>
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
          {/* Enhanced Dashboard with Three Stats */}
                <section className="card-dark p-6 flex flex-col items-center mb-2 backdrop-blur-sm bg-[#1E293B]/80 border border-[#334155]/50">
            <h3 className="text-base font-bold mb-4 text-white break-words">My Dashboard</h3>
            <div className="grid grid-cols-1 gap-4 w-full text-center">

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
          </aside>
        </main>
      </div>
  );
}