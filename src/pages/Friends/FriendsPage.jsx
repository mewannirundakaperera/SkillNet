import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("friends"); // friends, requests, discover
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    subject: "",
    duration: 60,
    budget: "",
    urgency: "normal"
  });

  // Load user's friends and pending requests
  useEffect(() => {
    if (!user?.id) return;

    const loadFriendsData = async () => {
      try {
        setLoading(true);

        // Get user's friends
        const userDoc = await getDocs(doc(db, 'users', user.id));
        const userData = userDoc.data();
        const friendIds = userData?.friends || [];
        const pendingIds = userData?.pendingFriendRequests || [];

        // Load friend details
        const friendsData = [];
        for (const friendId of friendIds) {
          const friendDoc = await getDocs(doc(db, 'users', friendId));
          if (friendDoc.exists()) {
            friendsData.push({
              id: friendId,
              ...friendDoc.data()
            });
          }
        }

        // Load pending request details
        const pendingData = [];
        for (const pendingId of pendingIds) {
          const pendingDoc = await getDocs(doc(db, 'users', pendingId));
          if (pendingDoc.exists()) {
            pendingData.push({
              id: pendingId,
              ...pendingDoc.data()
            });
          }
        }

        setFriends(friendsData);
        setPendingRequests(pendingData);

        // Load suggested users (not friends, not pending) with completed request check
        const allUsersQuery = query(collection(db, 'users'));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        const suggested = [];

        for (const userDoc of allUsersSnapshot.docs) {
          const potentialUser = { id: userDoc.id, ...userDoc.data() };
          
          // Skip if it's the current user, already a friend, or pending
          if (potentialUser.id === user.id || 
              friendIds.includes(potentialUser.id) || 
              pendingIds.includes(potentialUser.id)) {
            continue;
          }

          // Check if there's at least one completed request between users
          const hasCompletedRequest = await checkCompletedRequest(user.id, potentialUser.id);
          
          if (hasCompletedRequest) {
            suggested.push(potentialUser);
          }
        }

        // Limit to 10 suggested users
        setSuggestedUsers(suggested.slice(0, 10));

      } catch (error) {
        console.error('Error loading friends data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriendsData();
  }, [user]);

  // Check if there's a completed request between two users
  const checkCompletedRequest = async (userId1, userId2) => {
    try {
      // Check requests where user1 is requester and user2 is target, and status is completed
      const requesterQuery = query(
        collection(db, 'requests'),
        where('requesterId', '==', userId1),
        where('targetUserId', '==', userId2),
        where('status', '==', 'completed')
      );
      const requesterSnapshot = await getDocs(requesterQuery);

      if (!requesterSnapshot.empty) {
        return true;
      }

      // Check requests where user2 is requester and user1 is target, and status is completed
      const targetQuery = query(
        collection(db, 'requests'),
        where('requesterId', '==', userId2),
        where('targetUserId', '==', userId1),
        where('status', '==', 'completed')
      );
      const targetSnapshot = await getDocs(targetQuery);

      if (!targetSnapshot.empty) {
        return true;
      }

      // Check group requests where both users participated and status is completed
      const groupRequestsQuery = query(
        collection(db, 'requests'),
        where('type', '==', 'group'),
        where('status', '==', 'completed')
      );
      const groupSnapshot = await getDocs(groupRequestsQuery);

      for (const doc of groupSnapshot.docs) {
        const groupRequest = doc.data();
        if (groupRequest.participants && 
            groupRequest.participants.includes(userId1) && 
            groupRequest.participants.includes(userId2)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking completed requests:', error);
      return false;
    }
  };

  // Send friend request
  const sendFriendRequest = async (targetUserId) => {
    try {
      // Double-check that there's a completed request before allowing friendship
      const hasCompletedRequest = await checkCompletedRequest(user.id, targetUserId);
      
      if (!hasCompletedRequest) {
        alert('You can only send friend requests to users you have completed requests with.');
        return;
      }

      // Add to user's sent requests
      await updateDoc(doc(db, 'users', user.id), {
        sentFriendRequests: arrayUnion(targetUserId),
        updatedAt: serverTimestamp()
      });

      // Add to target user's pending requests
      await updateDoc(doc(db, 'users', targetUserId), {
        pendingFriendRequests: arrayUnion(user.id),
        updatedAt: serverTimestamp()
      });

      // Update local state
      setSuggestedUsers(prev => prev.filter(u => u.id !== targetUserId));
      setPendingRequests(prev => [...prev, { id: targetUserId, ...suggestedUsers.find(u => u.id === targetUserId) }]);

    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requesterId) => {
    try {
      // Double-check that there's a completed request before allowing friendship
      const hasCompletedRequest = await checkCompletedRequest(user.id, requesterId);
      
      if (!hasCompletedRequest) {
        alert('You can only become friends with users you have completed requests with.');
        return;
      }

      // Remove from pending requests
      await updateDoc(doc(db, 'users', user.id), {
        pendingFriendRequests: arrayRemove(requesterId),
        friends: arrayUnion(requesterId),
        updatedAt: serverTimestamp()
      });

      // Add to requester's friends
      await updateDoc(doc(db, 'users', requesterId), {
        sentFriendRequests: arrayRemove(user.id),
        friends: arrayUnion(user.id),
        updatedAt: serverTimestamp()
      });

      // Update local state
      const acceptedUser = pendingRequests.find(u => u.id === requesterId);
      setPendingRequests(prev => prev.filter(u => u.id !== requesterId));
      setFriends(prev => [...prev, acceptedUser]);

    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Failed to accept friend request. Please try again.');
    }
  };

  // Decline friend request
  const declineFriendRequest = async (requesterId) => {
    try {
      // Remove from pending requests
      await updateDoc(doc(db, 'users', user.id), {
        pendingFriendRequests: arrayRemove(requesterId),
        updatedAt: serverTimestamp()
      });

      // Remove from requester's sent requests
      await updateDoc(doc(db, 'users', requesterId), {
        sentFriendRequests: arrayRemove(user.id),
        updatedAt: serverTimestamp()
      });

      // Update local state
      setPendingRequests(prev => prev.filter(u => u.id !== requesterId));

    } catch (error) {
      console.error('Error declining friend request:', error);
      alert('Failed to decline friend request. Please try again.');
    }
  };

  // Remove friend
  const removeFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;

    try {
      // Remove from user's friends
      await updateDoc(doc(db, 'users', user.id), {
        friends: arrayRemove(friendId),
        updatedAt: serverTimestamp()
      });

      // Remove from friend's friends
      await updateDoc(doc(db, 'users', friendId), {
        friends: arrayRemove(user.id),
        updatedAt: serverTimestamp()
      });

      // Update local state
      setFriends(prev => prev.filter(u => u.id !== friendId));

    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend. Please try again.');
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!chatMessage.trim() || !selectedFriend) return;

    try {
      const messageData = {
        senderId: user.id,
        receiverId: selectedFriend.id,
        message: chatMessage.trim(),
        timestamp: serverTimestamp(),
        read: false
      };

      // Add to chat collection
      await addDoc(collection(db, 'privateChats'), messageData);

      // Update local state
      setChatHistory(prev => [...prev, {
        ...messageData,
        timestamp: new Date(),
        id: Date.now().toString()
      }]);

      setChatMessage("");

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Send target request to friend
  const sendTargetRequest = async (e) => {
    e.preventDefault();
    if (!selectedFriend || !requestForm.title.trim() || !requestForm.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const requestData = {
        title: requestForm.title.trim(),
        description: requestForm.description.trim(),
        subject: requestForm.subject.trim(),
        duration: parseInt(requestForm.duration),
        budget: requestForm.budget ? parseFloat(requestForm.budget) : null,
        urgency: requestForm.urgency,
        requesterId: user.id,
        requesterName: user.displayName || user.name || user.email,
        targetUserId: selectedFriend.id,
        targetUserName: selectedFriend.displayName || selectedFriend.name || selectedFriend.email,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type: 'target_request'
      };

      // Add to requests collection
      await addDoc(collection(db, 'requests'), requestData);

      // Reset form and show success message
      setRequestForm({
        title: "",
        description: "",
        subject: "",
        duration: 60,
        budget: "",
        urgency: "normal"
      });
      setShowRequestForm(false);
      alert(`Target request sent to ${selectedFriend.displayName || selectedFriend.name}!`);

    } catch (error) {
      console.error('Error sending target request:', error);
      alert('Failed to send target request. Please try again.');
    }
  };

  // Filter users based on search
  const filteredUsers = (users) => {
    if (!searchQuery) return users;
    return users.filter(user => 
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#4299E1] mx-auto"></div>
          <p className="mt-4 text-[#A0AEC0] text-lg">Loading your friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A202C]">
      {/* Header */}
      <div className="bg-[#2D3748] border-b border-[#4A5568] px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Friends & Chat</h1>
          <p className="text-[#A0AEC0]">Connect with friends, chat privately, and make target requests</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search friends, users, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-[#2D3748] border border-[#4A5568] rounded-lg px-4 py-3 text-white placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-[#2D3748] rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "friends"
                ? "bg-[#4299E1] text-white"
                : "text-[#A0AEC0] hover:text-white"
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "requests"
                ? "bg-[#4299E1] text-white"
                : "text-[#A0AEC0] hover:text-white"
            }`}
          >
            Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "discover"
                ? "bg-[#4299E1] text-white"
                : "text-[#A0AEC0] hover:text-white"
            }`}
          >
            Discover People
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Friends/Users List */}
          <div className="lg:col-span-1">
            <div className="bg-[#2D3748] rounded-lg p-6">
              {activeTab === "friends" && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Your Friends</h2>
                  {friends.length === 0 ? (
                    <p className="text-[#A0AEC0] text-center py-8">No friends yet. Start connecting with people!</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers(friends).map((friend) => (
                        <div
                          key={friend.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedFriend?.id === friend.id
                              ? "bg-[#4299E1] bg-opacity-20 border border-[#4299E1]"
                              : "hover:bg-[#4A5568]"
                          }`}
                          onClick={() => setSelectedFriend(friend)}
                        >
                          <img
                            src={friend.avatar || friend.photoURL || `https://ui-avatars.com/api/?name=${friend.displayName || friend.name}&background=3b82f6&color=fff`}
                            alt={friend.displayName || friend.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">
                              {friend.displayName || friend.name || "Unknown User"}
                            </div>
                            <div className="text-sm text-[#A0AEC0] truncate">
                              {friend.email}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFriend(friend.id);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Remove friend"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "requests" && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Friend Requests</h2>
                  {pendingRequests.length === 0 ? (
                    <p className="text-[#A0AEC0] text-center py-8">No pending friend requests</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers(pendingRequests).map((requester) => (
                        <div key={requester.id} className="bg-[#4A5568] rounded-lg p-3">
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={requester.avatar || requester.photoURL || `https://ui-avatars.com/api/?name=${requester.displayName || requester.name}&background=3b82f6&color=fff`}
                              alt={requester.displayName || requester.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white truncate">
                                {requester.displayName || requester.name || "Unknown User"}
                              </div>
                              <div className="text-sm text-[#A0AEC0] truncate">
                                {requester.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptFriendRequest(requester.id)}
                              className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => declineFriendRequest(requester.id)}
                              className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "discover" && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Discover People</h2>
                  <p className="text-sm text-[#A0AEC0] mb-4 text-center">
                    Only users you have completed requests with can become friends
                  </p>
                  {suggestedUsers.length === 0 ? (
                    <p className="text-[#A0AEC0] text-center py-8">No users with completed requests found</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers(suggestedUsers).map((suggestedUser) => (
                        <div key={suggestedUser.id} className="bg-[#4A5568] rounded-lg p-3">
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={suggestedUser.avatar || suggestedUser.photoURL || `https://ui-avatars.com/api/?name=${suggestedUser.displayName || suggestedUser.name}&background=3b82f6&color=fff`}
                              alt={suggestedUser.displayName || suggestedUser.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white truncate">
                                {suggestedUser.displayName || suggestedUser.name || "Unknown User"}
                              </div>
                              <div className="text-sm text-[#A0AEC0] truncate">
                                {suggestedUser.email}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-green-400 text-center mb-2">
                            ✓ Has completed requests with you
                          </div>
                          <button
                            onClick={() => sendFriendRequest(suggestedUser.id)}
                            className="w-full bg-[#4299E1] text-white px-3 py-2 rounded text-sm font-medium hover:bg-[#3182CE] transition-colors"
                          >
                            Send Friend Request
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Chat Area & Target Request Form */}
          <div className="lg:col-span-2">
            {showRequestForm ? (
              // Target Request Form
              <div className="bg-[#2D3748] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    Send Target Request to {selectedFriend?.displayName || selectedFriend?.name || "Friend"}
                  </h2>
                  <button
                    onClick={() => setShowRequestForm(false)}
                    className="text-[#A0AEC0] hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={sendTargetRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Request Title *
                    </label>
                    <input
                      type="text"
                      value={requestForm.title}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-[#4A5568] border border-[#2D3748] rounded-lg px-3 py-2 text-white placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                      placeholder="e.g., Help with Calculus Assignment"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Description *
                    </label>
                    <textarea
                      value={requestForm.description}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full bg-[#4A5568] border border-[#2D3748] rounded-lg px-3 py-2 text-white placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                      placeholder="Describe what you need help with..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={requestForm.subject}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full bg-[#4A5568] border border-[#2D3748] rounded-lg px-3 py-2 text-white placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                        placeholder="e.g., Mathematics"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Duration (minutes)
                      </label>
                      <select
                        value={requestForm.duration}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        className="w-full bg-[#4A5568] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Budget (Rs.)
                      </label>
                      <input
                        type="number"
                        value={requestForm.budget}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full bg-[#4A5568] border border-[#2D3748] rounded-lg px-3 py-2 text-white placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                        placeholder="Optional"
                        min="0"
                        step="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Urgency
                      </label>
                      <select
                        value={requestForm.urgency}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, urgency: e.target.value }))}
                        className="w-full bg-[#4A5568] border border-[#2D3748] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-[#4299E1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#3182CE] transition-colors"
                    >
                      Send Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRequestForm(false)}
                      className="flex-1 bg-[#4A5568] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2D3748] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Chat Area
              <div className="bg-[#2D3748] rounded-lg h-96 flex flex-col">
                {selectedFriend ? (
                  <>
                    {/* Chat Header with Target Request Button */}
                    <div className="flex items-center justify-between p-4 border-b border-[#4A5568]">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedFriend.avatar || selectedFriend.photoURL || `https://ui-avatars.com/api/?name=${selectedFriend.displayName || selectedFriend.name}&background=3b82f6&color=fff`}
                          alt={selectedFriend.displayName || selectedFriend.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {selectedFriend.displayName || selectedFriend.name || "Unknown User"}
                          </div>
                          <div className="text-sm text-[#A0AEC0]">Online</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowRequestForm(true)}
                        className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                        title="Send Target Request"
                      >
                        🎯 Target Request
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 p-4 overflow-y-auto">
                      {chatHistory.length === 0 ? (
                        <div className="text-center text-[#A0AEC0] py-8">
                          <div className="text-4xl mb-2">💬</div>
                          <p>Start a conversation with {selectedFriend.displayName || selectedFriend.name}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {chatHistory.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${
                                  message.senderId === user.id
                                    ? "bg-[#4299E1] text-white"
                                    : "bg-[#4A5568] text-white"
                                }`}
                              >
                                {message.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-[#4A5568]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type your message..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          className="flex-1 bg-[#4A5568] border border-[#2D3748] rounded-lg px-3 py-2 text-white placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#4299E1] focus:border-transparent"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!chatMessage.trim()}
                          className="bg-[#4299E1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#3182CE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-[#A0AEC0]">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-xl font-semibold text-white mb-2">Select a Friend</h3>
                      <p>Choose a friend from the list to start chatting or send target requests</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
