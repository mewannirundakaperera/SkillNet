import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from "@/config/firebase";

export default function RequestDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [request, setRequest] = useState(null);
  const [requestCreator, setRequestCreator] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [relatedRequests, setRelatedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Load request details
  useEffect(() => {
    const loadRequest = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        // Try to load from regular requests collection first
        let requestDoc = await getDoc(doc(db, 'requests', id));
        let collection_name = 'requests';

        // If not found in requests, try grouprequests collection
        if (!requestDoc.exists()) {
          requestDoc = await getDoc(doc(db, 'grouprequests', id));
          collection_name = 'grouprequests';
        }

        if (requestDoc.exists()) {
          const requestData = {
            id: requestDoc.id,
            ...requestDoc.data(),
            createdAt: requestDoc.data().createdAt?.toDate() || requestDoc.data().updatedAt?.toDate() || new Date(),
            scheduledDate: requestDoc.data().preferredDate || requestDoc.data().scheduledDate,
            scheduledTime: requestDoc.data().preferredTime || requestDoc.data().scheduledTime,
            // Handle different field names between collections
            topic: requestDoc.data().topic || requestDoc.data().title,
            description: requestDoc.data().description || requestDoc.data().message,
            subject: requestDoc.data().subject || requestDoc.data().category || 'General',
            userId: requestDoc.data().userId || requestDoc.data().createdBy,
            collection: collection_name
          };

          console.log(`RequestDetails: Loading ${collection_name} request:`, requestData);
          setRequest(requestData);

          // Load request creator info
          await loadUserProfile(requestData.userId);

          // Load participants
          if (requestData.participants && requestData.participants.length > 0) {
            await loadParticipants(requestData.participants);
          }

          // Load related requests
          await loadRelatedRequests(requestData.subject, requestData.userId);

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
  }, [id]);

  // Load user profile
  const loadUserProfile = async (userId) => {
    try {
      // Try userProfiles collection first
      const publicProfileQuery = query(
        collection(db, 'userProfiles'),
        where('uid', '==', userId)
      );
      const publicSnapshot = await getDocs(publicProfileQuery);

      if (!publicSnapshot.empty) {
        setRequestCreator({
          id: publicSnapshot.docs[0].id,
          ...publicSnapshot.docs[0].data()
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
        const publicProfileQuery = query(
          collection(db, 'userProfiles'),
          where('uid', '==', participantId)
        );
        const publicSnapshot = await getDocs(publicProfileQuery);

        if (!publicSnapshot.empty) {
          participantsData.push({
            id: participantId,
            ...publicSnapshot.docs[0].data()
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

  // Load related requests
  const loadRelatedRequests = async (subject, creatorId) => {
    try {
      const relatedQuery = query(
        collection(db, 'requests'),
        where('subject', '==', subject),
        where('userId', '!=', creatorId),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(relatedQuery);
      const related = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().topic || doc.data().title || 'Untitled Request',
        subject: doc.data().subject
      }));

      setRelatedRequests(related);
    } catch (error) {
      console.error("Error loading related requests:", error);
    }
  };

  // Load messages with real-time updates
  useEffect(() => {
    if (!id || !request) return;

    const collectionName = request.collection || 'requests';
    const messagesQuery = query(
      collection(db, collectionName, id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData = [];

      for (const doc of snapshot.docs) {
        const messageData = doc.data();

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
          id: doc.id,
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
  }, [id, request]);

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id || !request) return;

    setSending(true);
    try {
      const collectionName = request.collection || 'requests';
      await addDoc(collection(db, collectionName, id, 'messages'), {
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
      const collectionName = request.collection || 'requests';
      await updateDoc(doc(db, collectionName, id), {
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
        requestId: id,
        createdAt: serverTimestamp(),
        read: false
      });

      alert("Successfully joined the request!");
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
      const collectionName = request.collection || 'requests';
      await updateDoc(doc(db, collectionName, id), {
        participants: arrayRemove(user.id),
        participantCount: Math.max((request.participants?.length || 1) - 1, 0),
        updatedAt: serverTimestamp()
      });

      alert("Successfully left the request.");
    } catch (error) {
      console.error("Error leaving request:", error);
      alert("Failed to leave request. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, leave: false }));
    }
  };

  // Handle canceling request (only by creator)
  const handleCancelRequest = async () => {
    if (!user?.id || !request || request.userId !== user.id) return;
    if (!window.confirm("Are you sure you want to cancel this request? This action cannot be undone.")) return;

    setActionLoading(prev => ({ ...prev, cancel: true }));

    try {
      const collectionName = request.collection || 'requests';
      await updateDoc(doc(db, collectionName, id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert("Request cancelled successfully.");
      navigate("/requests/my-requests");
    } catch (error) {
      console.error("Error cancelling request:", error);
      alert("Failed to cancel request. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, cancel: false }));
    }
  };

  // Check if user is participant
  const isParticipant = request?.participants?.includes(user?.id);
  const isCreator = request?.userId === user?.id;
  const canJoin = !isParticipant && !isCreator && request?.status === 'open';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Request Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The requested item could not be found."}</p>
          <Link
            to="/requests/group"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex gap-8 p-8">
        <section className="flex-1 flex flex-col gap-6">
          {/* Request Details */}
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="font-bold text-xl flex-1">{request.topic || request.title}</h2>
              <span className={`px-3 py-1 rounded text-xs font-semibold ${
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

            <div className="text-xs text-gray-400 mb-4">Details for this scheduling request.</div>

            <div className="flex flex-col gap-2 text-sm mb-4">
              <div className="flex items-start gap-2">
                <span className="font-semibold">📝 Description:</span>
                <span>{request.description || 'No description provided'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">📚 Subject:</span>
                <span>{request.subject}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">📅 Date:</span>
                <span>{request.scheduledDate || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">⏰ Time:</span>
                <span>{request.scheduledTime || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">⏱️ Duration:</span>
                <span>{request.duration || '60'} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">💵 Payment:</span>
                <span>Rs.{request.paymentAmount || '0.00'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">👥 Participants:</span>
                <span>{request.participants?.length || 0}/{request.maxParticipants || 5}</span>
              </div>
            </div>

            {request.tags && request.tags.length > 0 && (
              <div className="mb-4">
                <span className="font-semibold text-sm">Tags: </span>
                {request.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs mr-2">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Link
                to="/requests/group"
                className="border rounded px-4 py-2 font-semibold hover:bg-gray-100"
              >
                Back to Requests
              </Link>

              {isCreator && (
                <>
                  <Link
                    to={`/requests/edit/${id}`}
                    className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700"
                  >
                    Edit Request
                  </Link>
                  <button
                    onClick={handleCancelRequest}
                    disabled={actionLoading.cancel}
                    className="bg-red-600 text-white rounded px-4 py-2 font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading.cancel ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </>
              )}

              {canJoin && (
                <button
                  onClick={handleJoinRequest}
                  disabled={actionLoading.join}
                  className="bg-green-600 text-white rounded px-4 py-2 font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading.join ? 'Joining...' : 'Join Request'}
                </button>
              )}

              {isParticipant && !isCreator && (
                <button
                  onClick={handleLeaveRequest}
                  disabled={actionLoading.leave}
                  className="bg-yellow-600 text-white rounded px-4 py-2 font-semibold hover:bg-yellow-700 disabled:opacity-50"
                >
                  {actionLoading.leave ? 'Leaving...' : 'Leave Request'}
                </button>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <h3 className="font-semibold mb-4">Participants ({participants.length})</h3>
            {participants.length > 0 ? (
              <div className="flex gap-8 flex-wrap">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex flex-col items-center gap-2">
                    <img
                      src={participant.avatar}
                      alt={participant.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {participant.displayName}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👥</div>
                <p>No participants yet. Be the first to join!</p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <h3 className="font-semibold mb-4">Discussion</h3>
            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto mb-4">
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
              <form className="flex gap-2 mt-2" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Right: Actions & Related */}
        <aside className="w-96 flex flex-col gap-6">
          {/* Request Status & Actions */}
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <h3 className="font-semibold mb-4">Request Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
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

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Created:</span>
                <span className="text-sm text-gray-900">
                  {request.createdAt?.toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Participants:</span>
                <span className="text-sm text-gray-900">
                  {request.participants?.length || 0}/{request.maxParticipants || 5}
                </span>
              </div>

              {request.views && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Views:</span>
                  <span className="text-sm text-gray-900">{request.views}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {canJoin && (
                <button
                  onClick={handleJoinRequest}
                  disabled={actionLoading.join}
                  className="w-full bg-green-600 text-white rounded px-4 py-2 font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading.join ? 'Joining...' : '✅ Join Request'}
                </button>
              )}

              {isParticipant && !isCreator && (
                <button
                  onClick={handleLeaveRequest}
                  disabled={actionLoading.leave}
                  className="w-full bg-yellow-600 text-white rounded px-4 py-2 font-semibold hover:bg-yellow-700 disabled:opacity-50"
                >
                  {actionLoading.leave ? 'Leaving...' : '🚪 Leave Request'}
                </button>
              )}

              {isCreator && (
                <>
                  <Link
                    to={`/requests/edit/${id}`}
                    className="w-full bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 block text-center"
                  >
                    ✏️ Edit Request
                  </Link>
                  <button
                    onClick={handleCancelRequest}
                    disabled={actionLoading.cancel}
                    className="w-full bg-red-600 text-white rounded px-4 py-2 font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading.cancel ? 'Cancelling...' : '❌ Cancel Request'}
                  </button>
                </>
              )}

              <Link
                to="/requests/create"
                className="w-full bg-purple-600 text-white rounded px-4 py-2 font-semibold hover:bg-purple-700 block text-center"
              >
                📝 Create Similar Request
              </Link>
            </div>
          </div>

          {/* Related Requests */}
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <h3 className="font-semibold mb-4">Related Requests</h3>
            {relatedRequests.length > 0 ? (
              <ul className="space-y-3">
                {relatedRequests.map((relatedRequest) => (
                  <li key={relatedRequest.id}>
                    <Link
                      to={`/requests/details/${relatedRequest.id}`}
                      className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      📚 {relatedRequest.title}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1">
                      {relatedRequest.subject}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-2xl mb-2">🔍</div>
                <p className="text-sm">No related requests found</p>
              </div>
            )}
          </div>

          {/* Creator Info */}
          {requestCreator && !isCreator && (
            <div className="bg-white rounded-xl shadow p-6 mb-2">
              <h3 className="font-semibold mb-4">Request Creator</h3>
              <div className="flex items-center gap-3">
                <img
                  src={requestCreator.avatar}
                  alt={requestCreator.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    {requestCreator.displayName}
                  </div>
                  {requestCreator.bio && (
                    <div className="text-xs text-gray-500 mt-1">
                      {requestCreator.bio.substring(0, 100)}
                      {requestCreator.bio.length > 100 && '...'}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <Link
                  to={`/profile/${requestCreator.id}`}
                  className="text-blue-600 text-sm hover:underline"
                >
                  View Full Profile →
                </Link>
              </div>
            </div>
          )}

          {/* Help & Support */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-semibold mb-3 text-gray-800">Need Help?</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span>📧</span>
                <a href="mailto:support@networkpro.com" className="hover:text-blue-600">
                  Contact Support
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span>❓</span>
                <Link to="/help" className="hover:text-blue-600">
                  Help Center
                </Link>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span>🚩</span>
                <button className="hover:text-red-600">
                  Report Request
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="text-xs text-gray-400 px-6 py-2 flex items-center gap-1 border-t">
        Made with <span className="text-indigo-500 font-bold">NetworkPro</span>
      </footer>
    </div>
  );
}