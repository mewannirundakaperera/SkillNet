import React, { useState, useEffect } from "react";
import { useAuth } from '@/hooks/useAuth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs
} from "firebase/firestore";
import { db } from "@/config/firebase";

const RequestDetailsPopup = ({ requestId, isOpen, onClose }) => {
  const { user } = useAuth();

  // State management
  const [request, setRequest] = useState(null);
  const [requestCreator, setRequestCreator] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Load request details
  useEffect(() => {
    if (!isOpen || !requestId) return;

    const loadRequest = async () => {
      try {
        setLoading(true);
        setError(null);

        const requestDoc = await getDoc(doc(db, 'requests', requestId));

        if (requestDoc.exists()) {
          const requestData = {
            id: requestDoc.id,
            ...requestDoc.data(),
            createdAt: requestDoc.data().createdAt?.toDate() || new Date(),
            scheduledDate: requestDoc.data().preferredDate || requestDoc.data().scheduledDate,
            scheduledTime: requestDoc.data().preferredTime || requestDoc.data().scheduledTime
          };

          setRequest(requestData);

          // Load request creator info
          await loadUserProfile(requestData.userId);

          // Load participants
          if (requestData.participants && requestData.participants.length > 0) {
            await loadParticipants(requestData.participants);
          }

        } else {
          setError("Request not found");
        }
      } catch (error) {
        console.error("Error loading request:", error);
        setError("Failed to load request details");
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId, isOpen]);

  // Load user profile
  const loadUserProfile = async (userId) => {
    try {
      // Try userProfiles collection first
      const userProfilesRef = collection(db, 'userProfiles');
      const profileQuery = query(userProfilesRef, where('uid', '==', userId));
      const profileSnapshot = await getDocs(profileQuery);

      if (!profileSnapshot.empty) {
        setRequestCreator({
          id: profileSnapshot.docs[0].id,
          ...profileSnapshot.docs[0].data()
        });
      } else {
        // Fallback to users collection
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRequestCreator({
            id: userDoc.id,
            displayName: userData.displayName || userData.name || 'User',
            avatar: userData.avatar || userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}&background=3b82f6&color=fff`,
            email: userData.email
          });
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  // Load participants
  const loadParticipants = async (participantIds) => {
    try {
      const participantsData = [];

      for (const participantId of participantIds) {
        // Try userProfiles first
        const userProfilesRef = collection(db, 'userProfiles');
        const profileQuery = query(userProfilesRef, where('uid', '==', participantId));
        const profileSnapshot = await getDocs(profileQuery);

        if (!profileSnapshot.empty) {
          participantsData.push({
            id: participantId,
            ...profileSnapshot.docs[0].data()
          });
        } else {
          // Fallback to users collection
          const userDoc = await getDoc(doc(db, 'users', participantId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            participantsData.push({
              id: participantId,
              displayName: userData.displayName || userData.name || 'User',
              avatar: userData.avatar || userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}&background=3b82f6&color=fff`
            });
          }
        }
      }

      setParticipants(participantsData);
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  // Load messages with real-time updates
  useEffect(() => {
    if (!requestId || !isOpen) return;

    const messagesQuery = query(
      collection(db, 'requests', requestId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData = [];

      for (const messageDoc of snapshot.docs) {
        const messageData = messageDoc.data();

        // Load user info for each message
        let userInfo = { name: 'Unknown User', avatar: '' };
        if (messageData.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', messageData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userInfo = {
                name: userData.displayName || userData.name || 'User',
                avatar: userData.avatar || userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}&background=3b82f6&color=fff`
              };
            }
          } catch (error) {
            console.error("Error loading message user:", error);
          }
        }

        messagesData.push({
          id: messageDoc.id,
          ...messageData,
          user: userInfo.name,
          avatar: userInfo.avatar,
          time: messageData.createdAt?.toDate()?.toLocaleString() || 'Just now',
          createdAt: messageData.createdAt?.toDate() || new Date()
        });
      }

      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [requestId, isOpen]);

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'requests', requestId, 'messages'), {
        userId: user.id,
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Handle joining request
  const handleJoinRequest = async () => {
    if (!user?.id || !request) return;

    setActionLoading(prev => ({ ...prev, join: true }));

    try {
      await updateDoc(doc(db, 'requests', requestId), {
        participants: arrayUnion(user.id),
        participantCount: (request.participants?.length || 0) + 1,
        updatedAt: serverTimestamp()
      });

      // Add notification for request creator
      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        type: 'request_join',
        title: 'New Participant',
        message: `${user.displayName || user.name} joined your request "${request.topic || request.title}"`,
        requestId: requestId,
        createdAt: serverTimestamp(),
        read: false
      });

      alert("Successfully joined the request!");
      // Reload request data
      const updatedRequest = { ...request, participants: [...(request.participants || []), user.id] };
      setRequest(updatedRequest);
    } catch (error) {
      console.error("Error joining request:", error);
      alert("Failed to join request. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, join: false }));
    }
  };

  // Handle leaving request
  const handleLeaveRequest = async () => {
    if (!user?.id || !request) return;
    if (!window.confirm("Are you sure you want to leave this request?")) return;

    setActionLoading(prev => ({ ...prev, leave: true }));

    try {
      await updateDoc(doc(db, 'requests', requestId), {
        participants: arrayRemove(user.id),
        participantCount: Math.max((request.participants?.length || 1) - 1, 0),
        updatedAt: serverTimestamp()
      });

      alert("Successfully left the request.");
      // Update local state
      const updatedParticipants = request.participants?.filter(id => id !== user.id) || [];
      setRequest({ ...request, participants: updatedParticipants });
    } catch (error) {
      console.error("Error leaving request:", error);
      alert("Failed to leave request. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, leave: false }));
    }
  };

  // Check if user is participant
  const isParticipant = request?.participants?.includes(user?.id);
  const isCreator = request?.userId === user?.id;
  const canJoin = !isParticipant && !isCreator && request?.status === 'open';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading request details...</p>
              </div>
            </div>
          ) : error || !request ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Request Not Found</h3>
                <p className="text-gray-600">{error || "The requested item could not be found."}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Request Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="font-bold text-xl flex-1">{request.topic || request.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      request.status === 'open' ? 'bg-green-100 text-green-700' :
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      request.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      request.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {request.status}
                    </span>
                  </div>

                  {requestCreator && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                      <img
                        src={requestCreator.avatar}
                        alt={requestCreator.displayName}
                        className="w-6 h-6 rounded-full"
                      />
                      <span>Created by {requestCreator.displayName}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">📝 Description:</span>
                      <p className="text-gray-600 mt-1">{request.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">📚 Subject:</span>
                      <p className="text-gray-600 mt-1">{request.subject}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">📅 Date:</span>
                      <p className="text-gray-600 mt-1">{request.scheduledDate || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">⏰ Time:</span>
                      <p className="text-gray-600 mt-1">{request.scheduledTime || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">⏱️ Duration:</span>
                      <p className="text-gray-600 mt-1">{request.duration || '60'} minutes</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">💵 Payment:</span>
                      <p className="text-gray-600 mt-1">Rs.{request.paymentAmount || '0.00'}</p>
                    </div>
                  </div>

                  {request.tags && request.tags.length > 0 && (
                    <div className="mt-4">
                      <span className="font-semibold text-sm text-gray-700">Tags: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {request.tags.map((tag, index) => (
                          <span key={index} className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Participants */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold mb-4">Participants ({participants.length})</h4>
                  {participants.length > 0 ? (
                    <div className="flex gap-4 flex-wrap">
                      {participants.map((participant) => (
                        <div key={participant.id} className="flex flex-col items-center gap-2">
                          <img
                            src={participant.avatar}
                            alt={participant.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {participant.displayName}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <div className="text-3xl mb-2">👥</div>
                      <p className="text-sm">No participants yet. Be the first to join!</p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold mb-4">Discussion</h4>
                  <div className="flex flex-col gap-3 max-h-48 overflow-y-auto mb-4">
                    {messages.length > 0 ? (
                      messages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-3">
                          <img
                            src={msg.avatar}
                            alt={msg.user}
                            className="w-8 h-8 rounded-full object-cover mt-1"
                          />
                          <div>
                            <div className="font-semibold text-sm text-gray-800">
                              {msg.user}
                              <span className="text-xs text-gray-400 font-normal ml-2">{msg.time}</span>
                            </div>
                            <div className="text-gray-700 text-sm">{msg.text}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>

                  {(isParticipant || isCreator) && (
                    <form className="flex gap-2" onSubmit={handleSendMessage}>
                      <input
                        type="text"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Right Column - Actions */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold mb-4">Quick Actions</h4>
                  <div className="space-y-3">
                    {canJoin && (
                      <button
                        onClick={handleJoinRequest}
                        disabled={actionLoading.join}
                        className="w-full bg-green-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading.join ? 'Joining...' : '✅ Join Request'}
                      </button>
                    )}

                    {isParticipant && !isCreator && (
                      <button
                        onClick={handleLeaveRequest}
                        disabled={actionLoading.leave}
                        className="w-full bg-yellow-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {actionLoading.leave ? 'Leaving...' : '🚪 Leave Request'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Request Info */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold mb-4">Request Info</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        request.status === 'open' ? 'bg-green-100 text-green-700' :
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        request.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900">{request.createdAt?.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span className="text-gray-900">{request.participants?.length || 0}/{request.maxParticipants || 5}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsPopup;
