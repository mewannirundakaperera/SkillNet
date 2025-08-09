import React, { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GroupChatMain from '@/pages/Group/components/GroupChatMain';
import GroupRequestsSidebar from '@/pages/Group/components/GroupRequestsSidebar';
import MyGroupsSidebar from '@/pages/Group/components/MyGroupsSidebar';
import {
  GroupsService,
  MessagesService,
  ChatPresenceService
} from "@/firebase/collections";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function GroupChat() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatRef = useRef(null);

  // State management
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [groupRequests, setGroupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        console.log('🔍 Checking admin status for user:', user.id);
        const adminRef = doc(db, 'admin', user.id);
        const adminSnap = await getDoc(adminRef);
        const isAdmin = adminSnap.exists();
        setIsCurrentUserAdmin(isAdmin);
        console.log('✅ Admin status:', isAdmin);
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
        setIsCurrentUserAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Load current group
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const groupData = await GroupsService.getGroupById(groupId);

        if (groupData) {
          setCurrentGroup(groupData);
          if (!groupData.members || !groupData.members.includes(user.id)) {
            setError('You are not a member of this group');
            setLoading(false);
            return;
          }
          setError(null);
        } else {
          setError('Group not found');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('❌ Error loading group:', error);
        setError(`Failed to load group: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId, user?.id]);

  // Load user's groups for sidebar
  useEffect(() => {
    const loadUserGroups = async () => {
      if (!user?.id) return;

      try {
        const groups = await GroupsService.getUserGroups(user.id);
        setUserGroups(groups);
      } catch (error) {
        console.error('❌ Error loading user groups:', error);
      }
    };

    loadUserGroups();
  }, [user]);

  // Load group requests
  useEffect(() => {
    const loadGroupRequests = async () => {
      if (!groupId) return;

      try {
        const requestsRef = collection(db, 'requests');
        const q = query(
            requestsRef,
            where('groupId', '==', groupId),
            where('status', 'in', ['active', 'pending']),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().createdByName,
          avatar: doc.data().createdByAvatar,
          title: doc.data().title,
          message: doc.data().description,
          rate: doc.data().rate,
          time: formatTimeAgo(doc.data().createdAt)
        }));

        setGroupRequests(requests);
      } catch (error) {
        console.error('❌ Error loading group requests:', error);
        // Fallback to empty array if there's an error
        setGroupRequests([]);
      }
    };

    loadGroupRequests();
  }, [groupId]);

  // Listen to messages (real-time)
  useEffect(() => {
    if (!groupId || !currentGroup) return;

    const unsubscribe = MessagesService.subscribeToMessages(
        groupId,
        (newMessages) => {
          setMessages(newMessages);
          scrollToBottom();
        },
        (error) => {
          console.error('❌ Error loading messages:', error);
        }
    );

    return unsubscribe;
  }, [groupId, currentGroup]);

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

  // Listen to typing users
  useEffect(() => {
    if (!groupId || !currentGroup) return;

    const unsubscribe = ChatPresenceService.subscribeToTypingUsers(
        groupId,
        (users) => {
          const otherUsers = users.filter(u => u.userId !== user?.id);
          setTypingUsers(otherUsers);
        }
    );

    return unsubscribe;
  }, [groupId, currentGroup, user]);

  // Update user presence
  useEffect(() => {
    if (!groupId || !user || !currentGroup) return;

    const updatePresence = (isOnline) => {
      ChatPresenceService.updateUserPresence(
          groupId,
          user.id,
          {
            userName: user.displayName || user.name,
            userAvatar: user.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.name || user.email || 'User')}&background=3b82f6&color=ffffff&size=128&bold=true&rounded=true`
          },
          isOnline
      );
    };

    updatePresence(true);
    return () => updatePresence(false);
  }, [groupId, user, currentGroup]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, 100);
  };

  // Handle typing indicator
  const handleTyping = (isTyping) => {
    if (!user || !groupId) return;

    ChatPresenceService.updateTypingStatus(
        groupId,
        user.id,
        isTyping,
        user.displayName || user.name
    );
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim() || sending || !user || !groupId) return;

    const messageText = input.trim();
    setInput('');
    setSending(true);
    handleTyping(false);

    try {
      await MessagesService.sendMessage(groupId, {
        text: messageText,
        userId: user.id,
        userName: user.displayName || user.name,
        userAvatar: user.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.name || user.email || 'User')}&background=3b82f6&color=ffffff&size=128&bold=true&rounded=true`
      });

      await GroupsService.updateLastActivity(groupId, {
        text: messageText,
        userId: user.id,
        userName: user.displayName || user.name
      });
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (e.target.value.trim()) {
      handleTyping(true);
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        handleTyping(false);
      }, 3000);
    } else {
      handleTyping(false);
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format time ago for requests
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown time';

    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  };

  // Group consecutive messages from same user
  const groupMessages = (messages) => {
    const grouped = [];
    let currentGroup = null;

    messages.forEach((message) => {
      if (currentGroup &&
          currentGroup.userId === message.userId &&
          (message.timestamp - currentGroup.lastTimestamp) < 300000) {
        currentGroup.messages.push(message);
        currentGroup.lastTimestamp = message.timestamp;
      } else {
        currentGroup = {
          userId: message.userId,
          userName: message.userName,
          userAvatar: message.userAvatar,
          messages: [message],
          timestamp: message.timestamp,
          lastTimestamp: message.timestamp
        };
        grouped.push(currentGroup);
      }
    });

    return grouped;
  };

  // Navigate to group details page
  const handleNavigateToDetails = () => {
    navigate(`/groups/${groupId}/details`);
  };

  // Loading state
  if (loading) {
    return (
        <div className="h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading chat...</p>
          </div>
        </div>
    );
  }

  // Error state
  if (error) {
    return (
        <div className="h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
                to="/groups"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Groups
            </Link>
          </div>
        </div>
    );
  }

  return (
      <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-gray-100 flex overflow-hidden">
        {/* LEFT SIDEBAR - MY GROUPS */}
        <MyGroupsSidebar
            userGroups={userGroups}
            currentGroupId={groupId}
            isCurrentUserAdmin={isCurrentUserAdmin}
            groupRequests={groupRequests}
        />

        {/* MAIN CHAT AREA - Expanded */}
        <GroupChatMain
            currentGroup={currentGroup}
            onlineUsers={onlineUsers}
            messages={messages}
            user={user}
            input={input}
            sending={sending}
            typingUsers={typingUsers}
            chatRef={chatRef}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            formatTime={formatTime}
            groupMessages={groupMessages}
            onNavigateToDetails={handleNavigateToDetails}
        />

        {/* RIGHT SIDEBAR - GROUP REQUESTS */}
        <GroupRequestsSidebar
            requests={groupRequests}
            currentGroupId={groupId}
        />
      </div>
  );
}