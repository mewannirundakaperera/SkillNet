import React, { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import {
  GroupsService,
  MessagesService,
  ChatPresenceService
} from "@/firebase/collections";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

const mockRequests = [
  {
    id: 1,
    name: 'Jane Doe',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    title: 'Review UI/UX Portfolio',
    message: 'Hi, I hope this message finds you well. I need feedback on my UI/UX portfolio.',
    rate: '$30/hour',
    time: '1 hour ago',
    status: 'active',
  },
  {
    id: 2,
    name: 'Alex Smith',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    title: 'Help with React Hooks',
    message: 'Hello! I am struggling with custom hooks in React and would love some guidance.',
    rate: '$25/hour',
    time: '3 hours ago',
    status: 'pending',
  },
  {
    id: 3,
    name: 'Emily M.',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    title: 'Brainstorm Content Ideas',
    message: 'Hi there! I\'m looking for someone to brainstorm some fresh content ideas.',
    rate: '',
    time: '5 hours ago',
    status: 'accepted',
  },
];

export default function GroupChat() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const chatRef = useRef(null);

  // State management
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
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
          userAvatar: user.avatar || user.photoURL || 'https://randomuser.me/api/portraits/men/14.jpg'
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
        userAvatar: user.avatar || user.photoURL || 'https://randomuser.me/api/portraits/men/14.jpg'
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

  const groupedMessages = groupMessages(messages);

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
    <div className="h-[calc(100vh-4rem)] bg-gray-50 flex overflow-hidden">
      {/* ===== LEFT SIDEBAR - MY GROUPS ===== */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Fixed Header - Aligned with other components */}
        <div className="px-4 py-4 border-b border-gray-200 bg-white flex items-center" style={{ minHeight: '76px' }}>
          <h2 className="font-semibold text-lg">My Groups</h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-1">
            {userGroups.length > 0 ? (
              userGroups.map((g) => (
                <Link
                  key={g.id}
                  to={`/chat/${g.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    g.id === groupId
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  <span className="flex-1 text-left">{g.name}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[80px]">
                    {g.memberCount}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                <p>No groups yet</p>
                <p>Join groups from the groups page!</p>
              </div>
            )}
          </div>

          {userGroups.length === 0 && (
            <div className="mt-4 text-center p-4 border border-dashed border-gray-300 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">No groups found</p>
              {isCurrentUserAdmin ? (
                <Link
                  to="/groups/create"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Create First Group →
                </Link>
              ) : (
                <Link
                  to="/groups"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Browse Groups →
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header - Fixed - Aligned with sidebars */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ minHeight: '76px' }}>
          <div>
            <button
              onClick={() => setShowGroupDetails(!showGroupDetails)}
              className="hover:bg-gray-100 p-2 rounded transition-colors"
            >
              <h1 className="font-bold text-xl text-left">{currentGroup?.name || 'Loading...'}</h1>
              <div className="text-xs text-gray-500 text-left">
                Click to view group details • {onlineUsers.length} online • {currentGroup?.memberCount || 0} total
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Online users indicators */}
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 5).map((member) => (
                <img
                  key={member.id}
                  src={member.userAvatar}
                  alt={member.userName}
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  title={`${member.userName} - online`}
                />
              ))}
              {onlineUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
            <button className="border rounded px-3 py-1 text-sm font-semibold hover:bg-gray-100">
              Invite Members
            </button>
          </div>
        </div>

        {/* Chat Messages Area - Scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
            ref={chatRef}
          >
            {groupedMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">💬</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Welcome to {currentGroup?.name}!</h3>
                <p className="text-gray-500">Start the conversation by sending the first message.</p>
              </div>
            ) : (
              groupedMessages.map((messageGroup) => (
                <div key={messageGroup.messages[0].id} className="flex gap-3">
                  <img
                    src={messageGroup.userAvatar}
                    alt={messageGroup.userName}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{messageGroup.userName}</span>
                      <span className="text-xs text-gray-500">
                        {formatTime(messageGroup.timestamp)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {messageGroup.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-lg px-4 py-2 text-sm break-words ${
                            message.userId === user?.id
                              ? "bg-blue-500 text-white ml-auto max-w-lg"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {message.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Typing Indicator - Fixed above input */}
          {typingUsers.length > 0 && (
            <div className="px-6 py-2 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].userName} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Message Input - Fixed at bottom */}
        <form className="bg-white border-t px-6 py-4 flex items-center gap-2 flex-shrink-0" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Type your message here..."
            value={input}
            onChange={handleInputChange}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      {/* ===== RIGHT SIDEBAR - GROUP REQUESTS ===== */}
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
        {/* Fixed Header - Aligned with other components */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white flex items-center justify-between" style={{ minHeight: '76px' }}>
          <div className="flex flex-col justify-center">
            <h3 className="font-semibold text-lg mb-1">Group Requests</h3>
            <p className="text-xs text-gray-500">Learning requests from group members</p>
          </div>
          <Link
            to="/requests/create"
            className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1 flex-shrink-0"
            title="Create new request"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create
          </Link>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {mockRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3 mb-2">
                  <img
                    src={request.avatar}
                    alt={request.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{request.name}</div>
                    <div className="text-xs text-gray-500">{request.time}</div>
                  </div>
                  {request.rate && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">
                      {request.rate}
                    </span>
                  )}
                </div>

                <h4 className="font-medium text-sm mb-1">{request.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{request.message}</p>

                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      request.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                  }`}>
                    {request.status}
                  </span>
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <Link
            to="/groups/requests"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium block text-center"
          >
            View All Group Requests →
          </Link>
        </div>
      </aside>

      {/* Group Details Modal */}
      {showGroupDetails && currentGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Group Details</h2>
              <button
                onClick={() => setShowGroupDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">{currentGroup.name}</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Description:</strong> {currentGroup.description}</div>
                <div><strong>Category:</strong> {currentGroup.category}</div>
                <div><strong>Members:</strong> {currentGroup.memberCount}</div>
                <div><strong>Created:</strong> {currentGroup.createdAt?.toLocaleDateString()}</div>
                <div><strong>Type:</strong> {currentGroup.isPublic ? 'Public' : 'Private'}</div>
                <div><strong>Created by:</strong> {currentGroup.createdByName}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Online Members ({onlineUsers.length})</h3>
              {onlineUsers.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {onlineUsers.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-gray-50">
                      <img src={member.userAvatar} alt={member.userName} className="w-8 h-8 rounded-full object-cover" />
                      <span className="flex-1">{member.userName}</span>
                      <span className="w-2 h-2 bg-green-500 rounded-full" title="Online"></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No members online right now</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}