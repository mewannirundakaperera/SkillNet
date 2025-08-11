import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { GroupsService, ChatPresenceService } from '@/firebase/collections';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp,
  updateDoc,
  arrayUnion,
  increment,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function GroupDetails() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [currentGroup, setCurrentGroup] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [groupStats, setGroupStats] = useState({
    totalMessages: 0,
    activeToday: 0,
    joinedThisWeek: 0,
    lastActivity: null
  });
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        const adminRef = doc(db, 'admin', user.id);
        const adminSnap = await getDoc(adminRef);
        setIsCurrentUserAdmin(adminSnap.exists());
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsCurrentUserAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Load group details with validation
  useEffect(() => {
    const loadGroupDetails = async () => {
      if (!groupId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Loading group details for groupId:', groupId);

        // Use the specific group service to get the exact group
        const groupData = await GroupsService.getGroupById(groupId);

        if (groupData && groupData.id === groupId) {
          console.log('✅ Group data loaded:', groupData);
          setCurrentGroup(groupData);
          
          // Check if user is a member (including hidden members for admins)
          const isMember = groupData.members?.includes(user.id);
          const isHiddenMember = groupData.hiddenMembers?.includes(user.id);
          
          if (!isMember && !isHiddenMember) {
            setError('You are not a member of this group');
            setLoading(false);
            return;
          }

          // Load additional group statistics
          await loadGroupStatistics(groupId);
          
        } else {
          console.error('❌ Group not found or ID mismatch');
          setError('Group not found');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('❌ Error loading group details:', error);
        setError(`Failed to load group: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadGroupDetails();
  }, [groupId, user?.id]);

  // Listen to online users
  useEffect(() => {
    if (!groupId || !currentGroup) return;

    const unsubscribe = ChatPresenceService.subscribeToOnlineUsers(
      groupId,
      (users) => {
        setOnlineUsers(users);
      }
    );

    return unsubscribe;
  }, [groupId, currentGroup]);

  // Load group statistics
  const loadGroupStatistics = async (groupId) => {
    try {
      console.log('📊 Loading group statistics for:', groupId);

      // Load recent messages count
      const messagesRef = collection(db, 'messages');
      const messagesQuery = query(
        messagesRef,
        where('groupId', '==', groupId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayMessages = messages.filter(msg => msg.timestamp >= today).length;
      const lastMessage = messages[0];

      setGroupStats({
        totalMessages: messages.length,
        activeToday: todayMessages,
        joinedThisWeek: 0, // This would need additional user tracking
        lastActivity: lastMessage?.timestamp || null
      });

      setRecentMessages(messages.slice(0, 5));

    } catch (error) {
      console.error('❌ Error loading group statistics:', error);
    }
  };

  // Load real member profiles from userProfiles collection
  useEffect(() => {
    const loadAllMembers = async () => {
      if (!currentGroup?.members) {
        setLoadingMembers(false);
        return;
      }

      try {
        setLoadingMembers(true);
        console.log('👥 Loading member profiles for group:', currentGroup.id);

        const memberProfiles = [];
        
        // Get all member IDs (including regular and hidden members)
        const allMemberIds = [
          ...(currentGroup.members || []),
          ...(currentGroup.hiddenMembers || [])
        ];

        // Fetch user profiles from userProfiles collection
        for (const memberId of allMemberIds) {
          try {
            // Try to get from userProfiles collection first
            const userProfileRef = doc(db, 'userProfiles', memberId);
            const userProfileSnap = await getDoc(userProfileRef);
            
            if (userProfileSnap.exists()) {
              const profileData = userProfileSnap.data();
              memberProfiles.push({
                id: memberId,
                name: profileData.displayName || profileData.name || `User ${memberId.slice(-4)}`,
                avatar: profileData.avatar || profileData.photoURL || 'https://randomuser.me/api/portraits/men/14.jpg',
                bio: profileData.bio || '',
                location: profileData.location || '',
                joinedAt: profileData.createdAt?.toDate() || null,
                isOnline: onlineUsers.some(ou => ou.userId === memberId),
                isHidden: currentGroup.hiddenMembers?.includes(memberId) || false
              });
            } else {
              // Fallback: try to get from users collection
              const userRef = doc(db, 'users', memberId);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const userData = userSnap.data();
                memberProfiles.push({
                  id: memberId,
                  name: userData.displayName || userData.name || `User ${memberId.slice(-4)}`,
                  avatar: userData.avatar || userData.photoURL || 'https://randomuser.me/api/portraits/men/14.jpg',
                  bio: userData.bio || '',
                  location: userData.location || '',
                  joinedAt: userData.createdAt?.toDate() || null,
                  isOnline: onlineUsers.some(ou => ou.userId === memberId),
                  isHidden: currentGroup.hiddenMembers?.includes(memberId) || false
                });
              } else {
                // Last fallback: create placeholder
                memberProfiles.push({
                  id: memberId,
                  name: `User ${memberId.slice(-4)}`,
                  avatar: 'https://randomuser.me/api/portraits/men/14.jpg',
                  bio: '',
                  location: '',
                  joinedAt: null,
                  isOnline: onlineUsers.some(ou => ou.userId === memberId),
                  isHidden: currentGroup.hiddenMembers?.includes(memberId) || false
                });
              }
            }
          } catch (memberError) {
            console.error(`❌ Error loading member ${memberId}:`, memberError);
            // Add placeholder for failed member
            memberProfiles.push({
              id: memberId,
              name: `User ${memberId.slice(-4)}`,
              avatar: 'https://randomuser.me/api/portraits/men/14.jpg',
              bio: '',
              location: '',
              joinedAt: null,
              isOnline: onlineUsers.some(ou => ou.userId === memberId),
              isHidden: currentGroup.hiddenMembers?.includes(memberId) || false
            });
          }
        }

        // Sort members: online first, then by name
        memberProfiles.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return a.name.localeCompare(b.name);
        });

        setAllMembers(memberProfiles);
        console.log('✅ Loaded member profiles:', memberProfiles.length);

      } catch (error) {
        console.error('❌ Error loading member profiles:', error);
        // Set fallback data
        const fallbackMembers = (currentGroup.members || []).map(memberId => ({
          id: memberId,
          name: `User ${memberId.slice(-4)}`,
          avatar: 'https://randomuser.me/api/portraits/men/14.jpg',
          bio: '',
          location: '',
          joinedAt: null,
          isOnline: onlineUsers.some(ou => ou.userId === memberId),
          isHidden: false
        }));
        setAllMembers(fallbackMembers);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadAllMembers();
  }, [currentGroup, onlineUsers]);

  // Utility functions
  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle leaving group
  const handleLeaveGroup = async () => {
    if (!currentGroup || !user?.id) return;

    const confirmLeave = window.confirm(`Are you sure you want to leave "${currentGroup.name}"?`);
    if (!confirmLeave) return;

    try {
      await GroupsService.leaveGroup(groupId, user.id);
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group. Please try again.');
    }
  };

  // Search for users to invite
  const searchUsersToInvite = async (query) => {
    if (query.trim().length < 2) {
      setSearchUsers([]);
      return;
    }

    setSearching(true);
    try {
      const usersRef = collection(db, 'userProfiles');
      const snapshot = await getDocs(usersRef);
      
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => {
          const isAlreadyMember = currentGroup?.members?.includes(user.uid) || 
                                currentGroup?.hiddenMembers?.includes(user.uid);
          const matchesSearch = user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                              user.email?.toLowerCase().includes(query.toLowerCase());
          return !isAlreadyMember && matchesSearch;
        })
        .slice(0, 5);

      setSearchUsers(users);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchUsers([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle inviting a user to the group
  const handleInviteUser = async (userToInvite) => {
    if (!currentGroup || !user?.id || !userToInvite.uid) return;

    setInviting(true);
    try {
      // Try to use GroupsService if available
      if (GroupsService && typeof GroupsService.joinGroup === 'function') {
        await GroupsService.joinGroup(groupId, userToInvite.uid, {
          userName: userToInvite.displayName,
          userAvatar: userToInvite.avatar
        });
      } else {
        // Fallback: Direct Firestore update
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          members: arrayUnion(userToInvite.uid),
          memberCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }

      // Send notification to invited user
      await addDoc(collection(db, 'notifications'), {
        userId: userToInvite.uid,
        type: 'group_invite',
        title: 'Group Invitation',
        message: `You've been invited to join "${currentGroup.name}" by ${user.displayName || user.name}`,
        groupId: groupId,
        createdAt: serverTimestamp(),
        read: false
      });

      alert(`Successfully invited ${userToInvite.displayName} to the group!`);
      
      // Refresh the page to show updated member list
      window.location.reload();
      
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Failed to invite user. Please try again.');
    } finally {
      setInviting(false);
      setShowInviteModal(false);
      setSearchQuery('');
      setSearchUsers([]);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#1A202C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0]">Loading group details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-[#1A202C] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-[#A0AEC0] mb-4">{error}</p>
          <Link
            to="/groups"
            className="btn-gradient-primary px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A202C]">
      {/* Header */}
      <div className="card-dark shadow-sm border-b border-[#4A5568]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/chat/${groupId}`}
                className="p-2 text-[#A0AEC0] hover:text-white hover:bg-[#2D3748] rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Group Details</h1>
                <p className="text-[#A0AEC0]">Comprehensive information about {currentGroup?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Invite Members Button - Only for group members */}
              {(currentGroup?.members?.includes(user?.id) || currentGroup?.hiddenMembers?.includes(user?.id)) && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Invite Members
                </button>
              )}
              <Link
                to={`/chat/${groupId}`}
                className="btn-gradient-primary px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Chat
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Group Information */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Group Overview Card */}
            <div className="card-dark rounded-xl shadow-sm border border-[#4A5568] overflow-hidden">
              <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-6 py-4 border-b border-[#4A5568]">
                <h2 className="text-lg font-semibold text-white">Group Overview</h2>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-6 mb-6">
                  {currentGroup?.image ? (
                    <img
                      src={currentGroup.image}
                      alt={currentGroup.name}
                      className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                      <span className="text-3xl font-bold text-blue-600">
                        {currentGroup?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{currentGroup?.name}</h3>
                    <p className="text-[#E0E0E0] mb-4 leading-relaxed">{currentGroup?.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                        <div className="text-2xl font-bold text-[#4299E1]">{currentGroup?.memberCount || 0}</div>
                        <div className="text-xs text-[#A0AEC0]">Total Members</div>
                      </div>
                      <div className="text-center p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                        <div className="text-2xl font-bold text-[#48BB78]">{onlineUsers.length}</div>
                        <div className="text-xs text-[#A0AEC0]">Online Now</div>
                      </div>
                      <div className="text-center p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                        <div className="text-2xl font-bold text-[#8B5CF6]">{groupStats.totalMessages}</div>
                        <div className="text-xs text-[#A0AEC0]">Messages</div>
                      </div>
                      <div className="text-center p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                        <div className="text-2xl font-bold text-[#ED8936]">{groupStats.activeToday}</div>
                        <div className="text-xs text-[#A0AEC0]">Active Today</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Basic Information */}
              <div className="card-dark rounded-xl shadow-sm border border-[#4A5568]">
                <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-4 py-3 border-b border-[#4A5568]">
                  <h3 className="font-semibold text-white">Basic Information</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#A0AEC0]">Category</label>
                    <p className="text-white capitalize">{currentGroup?.category || 'General'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#A0AEC0]">Created</label>
                    <p className="text-white">{formatDate(currentGroup?.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#A0AEC0]">Created by</label>
                    <p className="text-white">{currentGroup?.createdByName || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#A0AEC0]">Group Type</label>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        currentGroup?.isPublic 
                          ? 'bg-green-900 text-green-400' 
                          : 'bg-blue-900 text-blue-400'
                      }`}>
                        {currentGroup?.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Status */}
              <div className="card-dark rounded-xl shadow-sm border border-[#4A5568]">
                <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-4 py-3 border-b border-[#4A5568]">
                  <h3 className="font-semibold text-white">Activity Status</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#A0AEC0]">Last Activity</label>
                    <p className="text-white">{formatTimeAgo(groupStats.lastActivity)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#A0AEC0]">Max Members</label>
                    <p className="text-white">{currentGroup?.maxMembers || 'Unlimited'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#A0AEC0]">Member Capacity</label>
                    <div className="w-full bg-[#4A5568] rounded-full h-2">
                      <div 
                        className="bg-[#4299E1] h-2 rounded-full" 
                        style={{ 
                          width: currentGroup?.maxMembers 
                            ? `${Math.min((currentGroup.memberCount / currentGroup.maxMembers) * 100, 100)}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-[#A0AEC0] mt-1">
                      {currentGroup?.memberCount || 0} / {currentGroup?.maxMembers || '∞'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Settings */}
            <div className="card-dark rounded-xl shadow-sm border border-[#4A5568]">
              <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-6 py-4 border-b border-[#4A5568]">
                <h3 className="text-lg font-semibold text-white">Group Settings & Permissions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                      <span className="text-white font-medium">File Sharing</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        currentGroup?.settings?.allowFileSharing 
                          ? 'bg-green-900 text-green-400' 
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {currentGroup?.settings?.allowFileSharing ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                      <span className="text-white font-medium">Voice Messages</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        currentGroup?.settings?.allowVoiceMessages 
                          ? 'bg-green-900 text-green-400' 
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {currentGroup?.settings?.allowVoiceMessages ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                      <span className="text-white font-medium">Moderated Joining</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        currentGroup?.settings?.moderatedJoining 
                          ? 'bg-yellow-900 text-yellow-400' 
                          : 'bg-green-900 text-green-400'
                      }`}>
                        {currentGroup?.settings?.moderatedJoining ? 'Required' : 'Open'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#2D3748] rounded-lg border border-[#4A5568]">
                      <span className="text-white font-medium">Invitations</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        currentGroup?.settings?.allowInvites 
                          ? 'bg-green-900 text-green-400' 
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {currentGroup?.settings?.allowInvites ? 'Allowed' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Rules */}
            {currentGroup?.rules && (
              <div className="card-dark rounded-xl shadow-sm border border-[#4A5568]">
                <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-6 py-4 border-b border-[#4A5568]">
                  <h3 className="text-lg font-semibold text-white">Group Rules</h3>
                </div>
                <div className="p-6">
                  <div className="bg-[#2D3748] rounded-lg p-4 border-l-4 border-[#4299E1]">
                    <p className="text-white whitespace-pre-line leading-relaxed">{currentGroup.rules}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {!isCurrentUserAdmin && currentGroup?.createdBy !== user?.id && (
              <div className="card-dark rounded-xl shadow-sm border border-[#4A5568]">
                <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-6 py-4 border-b border-[#4A5568]">
                  <h3 className="text-lg font-semibold text-white">Actions</h3>
                </div>
                <div className="p-6">
                  <button
                    onClick={handleLeaveGroup}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Leave Group
                  </button>
                  <p className="text-sm text-[#A0AEC0] mt-2">
                    This action cannot be undone. You'll need to request to join again.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Members */}
          <div className="space-y-6">
            
            {/* Online Members */}
            <div className="card-dark rounded-xl shadow-sm border border-[#4A5568]">
              <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-4 py-3 border-b border-[#4A5568] flex items-center justify-between">
                <h3 className="font-semibold text-white">Online Now</h3>
                <span className="bg-green-900 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                  {onlineUsers.length}
                </span>
              </div>
              <div className="p-4">
                {onlineUsers.length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {onlineUsers.map((member) => (
                      <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2D3748] transition-colors">
                        <div className="relative">
                          <img
                            src={member.userAvatar}
                            alt={member.userName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.userName}</p>
                          <p className="text-xs text-green-400">Online</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#A0AEC0]">
                    <svg className="w-8 h-8 mx-auto mb-2 text-[#4A5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm">No members online</p>
                  </div>
                )}
              </div>
            </div>

            {/* All Members */}
            <div className="card-dark rounded-xl shadow-sm border border-[#4A5568]">
              <div className="bg-gradient-to-r from-[#2D3748] to-[#4A5568] px-4 py-3 border-b border-[#4A5568] flex items-center justify-between">
                <h3 className="font-semibold text-white">All Members</h3>
                <span className="bg-blue-900 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                  {allMembers.length}
                </span>
              </div>
              <div className="p-4">
                {loadingMembers ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4299E1] mx-auto"></div>
                    <p className="text-sm text-[#A0AEC0] mt-2">Loading members...</p>
                  </div>
                ) : allMembers.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {allMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2D3748] transition-colors">
                        <div className="relative">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          {member.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                          {member.isHidden && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white" title="Admin"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-[#A0AEC0]">
                              {member.isOnline ? 'Online' : 'Offline'}
                            </p>
                            {member.isHidden && (
                              <span className="text-xs bg-purple-900 text-purple-400 px-1 py-0.5 rounded">Admin</span>
                            )}
                          </div>
                          {member.bio && (
                            <p className="text-xs text-[#A0AEC0] truncate">{member.bio}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#A0AEC0]">
                    <p className="text-sm">No members found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-dark rounded-xl shadow-xl p-6 w-96 max-h-96 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Invite Members</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery('');
                  setSearchUsers([]);
                }}
                className="text-[#A0AEC0] hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#E0E0E0] mb-2">
                Search for users to invite
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsersToInvite(e.target.value);
                }}
                placeholder="Type name or email..."
                className="input-dark w-full px-3 py-2 border border-[#4A5568] rounded-lg focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {searching ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4299E1] mx-auto"></div>
                  <p className="text-sm text-[#A0AEC0] mt-2">Searching users...</p>
                </div>
              ) : searchUsers.length > 0 ? (
                <div className="space-y-2">
                  {searchUsers.map((searchUser) => (
                    <div key={searchUser.id} className="flex items-center justify-between p-2 border border-[#4A5568] rounded-lg hover:bg-[#2D3748] transition-colors">
                      <div className="flex items-center gap-3">
                        <img
                          src={searchUser.avatar || 'https://randomuser.me/api/portraits/men/14.jpg'}
                          alt={searchUser.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{searchUser.displayName}</p>
                          <p className="text-xs text-[#A0AEC0]">{searchUser.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInviteUser(searchUser)}
                        disabled={inviting}
                        className="btn-gradient-primary px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {inviting ? 'Inviting...' : 'Invite'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-4 text-[#A0AEC0]">
                  <svg className="w-8 h-8 mx-auto mb-2 text-[#4A5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="text-center py-4 text-[#A0AEC0]">
                  <svg className="w-8 h-8 mx-auto mb-2 text-[#4A5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">Start typing to search for users</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
