// Updated GroupsList.jsx - Removed "Create New Group" button from right sidebar
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { GroupsService, GROUP_CATEGORIES } from '@/firebase/collections';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  arrayUnion,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function GroupsList() {
  const { user } = useAuth();

  // State management
  const [publicGroups, setPublicGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState(null);
  const [error, setError] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  console.log('🐛 GroupsList Render:', {
    user: user?.id,
    loading,
    error,
    userGroupsCount: userGroups.length,
    publicGroupsCount: publicGroups.length
  });

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        console.log('🔍 Checking admin status for user:', user.id);
        
        // Check admin status from user document role field
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const isUserAdmin = userData.role === 'admin';
          setIsCurrentUserAdmin(isUserAdmin);
          console.log('✅ Admin status from user role:', isUserAdmin);
        } else {
          console.log('ℹ️ User document not found, assuming not admin');
          setIsCurrentUserAdmin(false);
        }
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
        setIsCurrentUserAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Load groups with proper error handling and fallbacks
  useEffect(() => {
    const loadGroups = async () => {
      if (!user?.id) {
        console.log('⏭️ No user ID, skipping group load');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Starting group load for user:', user.id);

        let userGroupsData = [];
        let publicGroupsData = [];

        // Method 1: Try using GroupsService (if available)
        try {
          if (GroupsService && typeof GroupsService.getUserGroups === 'function') {
            console.log('📦 Using GroupsService methods...');

            // Load user groups
            try {
              userGroupsData = await GroupsService.getUserGroups(user.id);
              console.log('✅ User groups loaded via service:', userGroupsData.length);
            } catch (userGroupError) {
              console.warn('⚠️ getUserGroups failed:', userGroupError.message);
              // Continue to fallback
            }

            // Load public groups
            try {
              publicGroupsData = await GroupsService.getPublicGroups(20);
              console.log('✅ Public groups loaded via service:', publicGroupsData.length);
            } catch (publicGroupError) {
              console.warn('⚠️ getPublicGroups failed:', publicGroupError.message);
              // Continue to fallback
            }
          }
        } catch (serviceError) {
          console.log('⚠️ GroupsService not available or failed:', serviceError.message);
        }

        // Method 2: Fallback to direct Firestore queries if service failed
        if (userGroupsData.length === 0 || publicGroupsData.length === 0) {
          console.log('🔄 Using direct Firestore queries as fallback...');

          try {
            const groupsRef = collection(db, 'groups');

            // Load user groups directly - try without orderBy first
            if (userGroupsData.length === 0) {
              console.log('🔍 Loading user groups directly...');

              try {
                // Try with orderBy first
                const userGroupsQueryWithOrder = query(
                  groupsRef,
                  where('members', 'array-contains', user.id),
                  orderBy('lastActivity', 'desc')
                );
                const userGroupsSnapshot = await getDocs(userGroupsQueryWithOrder);
                userGroupsData = userGroupsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  memberCount: doc.data().members?.length || 0,
                  createdAt: doc.data().createdAt?.toDate(),
                  lastActivity: doc.data().lastActivity?.toDate()
                }));
                console.log('✅ User groups loaded with orderBy:', userGroupsData.length);

              } catch (orderError) {
                console.log('⚠️ OrderBy failed, trying without orderBy:', orderError.message);

                // Fallback without orderBy
                const userGroupsQuerySimple = query(
                  groupsRef,
                  where('members', 'array-contains', user.id)
                );
                const userGroupsSnapshot = await getDocs(userGroupsQuerySimple);
                userGroupsData = userGroupsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  memberCount: doc.data().members?.length || 0,
                  createdAt: doc.data().createdAt?.toDate(),
                  lastActivity: doc.data().lastActivity?.toDate()
                }));

                // Sort manually
                userGroupsData.sort((a, b) => {
                  const aTime = a.lastActivity || a.createdAt || new Date(0);
                  const bTime = b.lastActivity || b.createdAt || new Date(0);
                  return bTime - aTime;
                });

                console.log('✅ User groups loaded without orderBy:', userGroupsData.length);
              }
            }

            // Load public groups directly
            if (publicGroupsData.length === 0) {
              console.log('🔍 Loading public groups directly...');

              try {
                // Try with orderBy first
                const publicGroupsQueryWithOrder = query(
                  groupsRef,
                  where('isPublic', '==', true),
                  orderBy('memberCount', 'desc'),
                  limit(20)
                );
                const publicGroupsSnapshot = await getDocs(publicGroupsQueryWithOrder);
                publicGroupsData = publicGroupsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  memberCount: doc.data().members?.length || 0,
                  createdAt: doc.data().createdAt?.toDate(),
                  lastActivity: doc.data().lastActivity?.toDate()
                }));
                console.log('✅ Public groups loaded with orderBy:', publicGroupsData.length);

              } catch (orderError) {
                console.log('⚠️ OrderBy failed, trying without orderBy:', orderError.message);

                // Fallback without orderBy and limit
                const publicGroupsQuerySimple = query(
                  groupsRef,
                  where('isPublic', '==', true)
                );
                const publicGroupsSnapshot = await getDocs(publicGroupsQuerySimple);
                publicGroupsData = publicGroupsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  memberCount: doc.data().members?.length || 0,
                  createdAt: doc.data().createdAt?.toDate(),
                  lastActivity: doc.data().lastActivity?.toDate()
                }));

                // Sort and limit manually
                publicGroupsData.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
                publicGroupsData = publicGroupsData.slice(0, 20);

                console.log('✅ Public groups loaded without orderBy:', publicGroupsData.length);
              }
            }

          } catch (firestoreError) {
            console.error('❌ Direct Firestore queries failed:', firestoreError);

            // Last resort: Get all groups and filter in memory
            try {
              console.log('🔄 Last resort: loading all groups...');
              const groupsRef = collection(db, 'groups');
              const allGroupsSnapshot = await getDocs(groupsRef);
              const allGroups = allGroupsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                memberCount: doc.data().members?.length || 0,
                createdAt: doc.data().createdAt?.toDate(),
                lastActivity: doc.data().lastActivity?.toDate()
              }));

              // Filter user groups
              userGroupsData = allGroups.filter(group =>
                group.members && group.members.includes(user.id)
              );

              // Filter public groups (exclude user's groups)
              publicGroupsData = allGroups.filter(group =>
                group.isPublic &&
                (!group.members || !group.members.includes(user.id)) &&
                (!group.hiddenMembers || !group.hiddenMembers.includes(user.id))
              );

              console.log('✅ Last resort successful:', {
                total: allGroups.length,
                userGroups: userGroupsData.length,
                publicGroups: publicGroupsData.length
              });

            } catch (lastResortError) {
              console.error('❌ All methods failed:', lastResortError);
              throw new Error(`Unable to load groups: ${lastResortError.message}`);
            }
          }
        }

        // Process the data
        console.log('📊 Processing loaded groups:', {
          userGroups: userGroupsData.length,
          publicGroups: publicGroupsData.length
        });

        // Set user groups
        setUserGroups(userGroupsData);

        // Filter out groups user is already member of
        const availableGroups = publicGroupsData.filter(group => {
          const isInRegularMembers = group.members?.includes(user.id);
          const isInHiddenMembers = group.hiddenMembers?.includes(user.id);
          return !isInRegularMembers && !isInHiddenMembers;
        });

        setPublicGroups(availableGroups);
        console.log('✅ Groups loaded successfully:', {
          userGroups: userGroupsData.length,
          availableGroups: availableGroups.length
        });

      } catch (error) {
        console.error('❌ Critical error in loadGroups:', error);

        // Set user-friendly error message based on error type
        let errorMessage = 'Failed to load groups';

        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Database temporarily unavailable. Please try again.';
        } else if (error.code === 'failed-precondition') {
          errorMessage = 'Database indexes may be missing. Check your Firestore console.';
        } else if (error.message.includes('offline')) {
          errorMessage = 'You appear to be offline. Please check your connection.';
        } else if (error.message.includes('indexes')) {
          errorMessage = 'Database indexes are being built. Please wait a few minutes and try again.';
        } else {
          errorMessage = `Failed to load groups: ${error.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadGroups();
    }
  }, [user?.id]); // Removed isCurrentUserAdmin dependency to avoid infinite loop

  // Join group function
  const handleJoinGroup = async (groupId, groupName) => {
    if (!user?.id || joiningGroup === groupId) return;

    setJoiningGroup(groupId);

    try {
      console.log('🔗 Joining group:', groupId);

      // Try GroupsService first
      if (GroupsService && typeof GroupsService.joinGroup === 'function') {
        await GroupsService.joinGroup(groupId, user.id, {
          userName: user.displayName || user.name,
          userAvatar: user.avatar || user.photoURL || 'https://randomuser.me/api/portraits/men/14.jpg'
        });
      } else {
        // Fallback to direct Firestore update
        const groupRef = doc(db, 'groups', groupId);

        if (isCurrentUserAdmin) {
          // Admin joins as hidden member
          await updateDoc(groupRef, {
            hiddenMembers: arrayUnion(user.id),
            totalMemberCount: increment(1),
            updatedAt: serverTimestamp()
          });
        } else {
          // Regular user joins as visible member
          await updateDoc(groupRef, {
            members: arrayUnion(user.id),
            memberCount: increment(1),
            updatedAt: serverTimestamp()
          });
        }
      }

      // Update local state
      const joinedGroup = publicGroups.find(g => g.id === groupId);
      if (joinedGroup) {
        const updatedGroup = {
          ...joinedGroup,
          members: isCurrentUserAdmin ? joinedGroup.members : [...(joinedGroup.members || []), user.id],
          hiddenMembers: isCurrentUserAdmin ? [...(joinedGroup.hiddenMembers || []), user.id] : joinedGroup.hiddenMembers,
          memberCount: isCurrentUserAdmin ? joinedGroup.memberCount : (joinedGroup.memberCount || 0) + 1,
          totalMemberCount: (joinedGroup.totalMemberCount || 0) + 1
        };

        setUserGroups(prev => [...prev, updatedGroup]);
        setPublicGroups(prev => prev.filter(g => g.id !== groupId));
      }

      alert(`Successfully joined ${groupName}!`);

    } catch (error) {
      console.error('❌ Error joining group:', error);
      alert(`Failed to join group: ${error.message}`);
    } finally {
      setJoiningGroup(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden flex">
        {/* Educational Background Pattern */}
        <div className="absolute inset-0">
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
        
        <div className="relative z-10 flex w-full">
        <aside className="w-80 card-dark border-r border-[#4A5568] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Groups</h2>
            {/* ✅ Show Create button for all users */}
            <Link to="/groups/create" className="btn-gradient-primary px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
              + Create
            </Link>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4299E1] mx-auto"></div>
              <p className="mt-2 text-[#A0AEC0] text-sm">Loading groups...</p>
            </div>
          </div>
        </aside>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#A0AEC0] text-6xl mb-4">💬</div>
            <h1 className="text-2xl font-bold text-white mb-2">Loading Groups...</h1>
            <p className="text-[#A0AEC0]">Please wait while we load your groups</p>
          </div>
        </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden flex">
        {/* Educational Background Pattern */}
        <div className="absolute inset-0">
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
        
        <div className="relative z-10 flex w-full">
        <aside className="w-80 card-dark border-r border-[#4A5568] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Groups</h2>
            <Link to="/groups/create" className="btn-gradient-primary px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
              + Create
            </Link>
          </div>

          <div className="text-center py-8">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">Error Loading Groups</h3>
            <p className="text-[#E0E0E0] mb-4 text-sm">{error}</p>

            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full btn-gradient-primary px-4 py-2 rounded hover:bg-[#3182CE] text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#A0AEC0] text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Groups</h1>
            <p className="text-[#A0AEC0] mb-4">{error}</p>

            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6 text-left max-w-md">
              <h3 className="font-semibold text-yellow-400 mb-2">Possible Solutions:</h3>
              <ul className="text-sm text-yellow-300 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Verify you're logged in properly</li>
                <li>• Check browser console for detailed errors</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="btn-gradient-primary px-6 py-3 rounded-lg font-semibold hover:bg-[#3182CE] transition-colors"
            >
              Retry Loading
            </button>
          </div>
        </main>
        </div>
      </div>
    );
  }

  // Success state - render normal groups list
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] relative overflow-hidden">
      {/* Educational Background Pattern */}
      <div className="absolute inset-0">
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
      <div className="relative z-10 flex">
      {/* Left Sidebar - Groups */}
      <aside className="w-80 card-dark border-r border-[#4A5568] p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Groups</h2>
            {isCurrentUserAdmin && (
              <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded">Admin</span>
            )}
          </div>
          {/* Show Create button only for admins */}
          {isCurrentUserAdmin && (
            <Link
              to="/groups/create"
              className="btn-gradient-primary px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
            >
              + Create
            </Link>
          )}
        </div>

        {/* My Groups Section */}
        {userGroups.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#A0AEC0] uppercase tracking-wide mb-3">
              My Groups ({userGroups.length})
            </h3>
            <div className="space-y-2">
              {userGroups.map((group) => (
                <Link
                  key={group.id}
                  to={`/chat/${group.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#2D3748] transition-colors group"
                >
                  <div className="w-10 h-10 bg-[#2D3748] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#4A5568]">
                    {group.image ? (
                      <img src={group.image} alt={group.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <span className="text-[#4299E1] font-bold">
                        {group.name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{group.name || 'Unnamed Group'}</h4>
                    <p className="text-xs text-[#A0AEC0]">{group.memberCount || 0} members</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-[#4A5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Available Groups Section */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#A0AEC0] uppercase tracking-wide mb-3">
            Available Groups ({publicGroups.length})
          </h3>

          {publicGroups.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[#A0AEC0] text-3xl mb-3">🏢</div>
              <h4 className="text-sm font-semibold text-white mb-2">
                {userGroups.length > 0 ? 'No new groups available' : 'No groups found'}
              </h4>
              <p className="text-xs text-[#A0AEC0] mb-4">
                {userGroups.length > 0
                  ? "You've joined all available groups!"
                  : isCurrentUserAdmin
                    ? "Create the first group to get started!"
                    : "No groups available yet. Check back later!"
                }
              </p>
              {/* Show Create Group button only for admins */}
              {isCurrentUserAdmin && (
                <Link
                  to="/groups/create"
                  className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                >
                  Create First Group
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {publicGroups.map((group) => (
                <div
                  key={group.id}
                  className="p-3 rounded-lg border border-[#4A5568] hover:border-green-400 transition-colors bg-[#2D3748]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#2D3748] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#4A5568]">
                      {group.image ? (
                        <img src={group.image} alt={group.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <span className="text-green-400 font-bold text-sm">
                          {group.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate text-sm">{group.name || 'Unnamed Group'}</h4>
                      <p className="text-xs text-[#A0AEC0]">{group.memberCount || 0} members</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#E0E0E0] mb-3 line-clamp-2">{group.description || 'No description available'}</p>

                  <button
                    onClick={() => handleJoinGroup(group.id, group.name)}
                    disabled={joiningGroup === group.id}
                    className="w-full bg-green-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joiningGroup === group.id ? 'Joining...' : 'Join Group'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </aside>

      {/* Main Content - ✅ REMOVED: Create Group action buttons from right side */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#A0AEC0] text-6xl mb-4">💬</div>
          <h1 className="text-2xl font-bold text-white mb-2">Select a Group to Start Chatting</h1>
          <p className="text-[#A0AEC0] mb-6">Choose a group from the sidebar to join the conversation</p>

          <div className="flex gap-4 justify-center">
            {/* ✅ REMOVED: Create New Group button from main content area */}
            {userGroups.length > 0 && (
              <Link
                to={`/chat/${userGroups[0].id}`}
                className="btn-gradient-primary px-6 py-3 rounded-lg font-semibold hover:bg-[#3182CE] transition-colors"
              >
                Open Recent Group
              </Link>
            )}
          </div>

          {isCurrentUserAdmin && (
            <div className="mt-6 p-4 bg-purple-900 border border-purple-700 rounded-lg">
              <p className="text-purple-300 text-sm font-medium">🔧 Admin Mode Active</p>
              <p className="text-purple-400 text-xs">You have special access to groups and can see additional information</p>
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}

