// src/pages/Teach&learn/OnlineMeeting.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMeeting } from '@/hooks/useMeeting';
import JitsiMeeting from '@/components/Meeting/JitsiMeeting';
import { formatMeetingTime } from '@/utils/meetingUtils';

const OnlineMeeting = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    createMeeting,
    getMeetingById,
    checkMeetingAccess,
    loading,
    error
  } = useMeeting();

  const [meetingState, setMeetingState] = useState('loading'); // loading, setup, joining, meeting, error
  const [meetingData, setMeetingData] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    subject: '',
    otherUserName: '',
    otherUserId: '',
    duration: 60,
    sessionType: 'one-to-one'
  });

  // Get parameters from URL
  const roomName = searchParams.get('room');
  const meetingId = searchParams.get('meetingId');
  const otherUserId = searchParams.get('userId');
  const otherUserName = searchParams.get('userName');
  const subject = searchParams.get('subject');

  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        setMeetingState('loading');

        // If we have a room name, validate access and join
        if (roomName) {
          const accessResult = await checkMeetingAccess(roomName);

          if (!accessResult.hasAccess) {
            setMeetingState('error');
            return;
          }

          setMeetingData({
            roomName,
            meeting: accessResult.meeting,
            userRole: accessResult.userRole,
            otherUserName: otherUserName || 'Other Student',
            subject: subject || 'StudentConnect Session'
          });
          setMeetingState('meeting');
          return;
        }

        // If we have a meeting ID, get meeting details
        if (meetingId) {
          const meeting = await getMeetingById(meetingId);
          setMeetingData({
            roomName: meeting.roomName,
            meeting,
            userRole: meeting.host.userId === user.id ? 'host' : 'participant',
            otherUserName: meeting.host.userId === user.id
                ? meeting.participants[0]?.name
                : meeting.host.name,
            subject: meeting.subject
          });
          setMeetingState('meeting');
          return;
        }

        // If we have request/user info, set up form for creating new meeting
        if (requestId || otherUserId) {
          setMeetingForm(prev => ({
            ...prev,
            otherUserId: otherUserId || '',
            otherUserName: otherUserName || '',
            subject: subject || `Study Session${requestId ? ` for Request #${requestId}` : ''}`
          }));
          setMeetingState('setup');
          return;
        }

        // Default to setup form
        setMeetingState('setup');

      } catch (error) {
        console.error('Error initializing meeting:', error);
        setMeetingState('error');
      }
    };

    if (user) {
      initializeMeeting();
    }
  }, [user, roomName, meetingId, requestId, otherUserId, otherUserName, subject, checkMeetingAccess, getMeetingById]);

  // Handle form submission to create new meeting
  const handleCreateMeeting = async (e) => {
    e.preventDefault();

    if (!meetingForm.subject.trim()) {
      alert('Please enter a subject for the meeting');
      return;
    }

    try {
      setMeetingState('joining');

      const newMeeting = await createMeeting({
        requestId,
        participantUserId: meetingForm.otherUserId,
        participantUserName: meetingForm.otherUserName,
        subject: meetingForm.subject,
        duration: meetingForm.duration,
        sessionType: meetingForm.sessionType,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: new Date().toTimeString().split(' ')[0].substring(0, 5)
      });

      setMeetingData({
        roomName: newMeeting.roomName,
        meeting: newMeeting,
        userRole: 'host',
        otherUserName: meetingForm.otherUserName,
        subject: meetingForm.subject
      });

      setMeetingState('meeting');
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Failed to create meeting. Please try again.');
      setMeetingState('setup');
    }
  };

  // Handle instant meeting (no scheduling)
  const handleInstantMeeting = () => {
    if (!meetingForm.subject.trim()) {
      setMeetingForm(prev => ({ ...prev, subject: 'Quick Study Session' }));
    }

    setMeetingData({
      roomName: `instant_${Date.now()}_${user.id}`,
      meeting: null,
      userRole: 'host',
      otherUserName: meetingForm.otherUserName || 'Student',
      subject: meetingForm.subject || 'Quick Study Session'
    });

    setMeetingState('meeting');
  };

  // Render based on meeting state
  if (meetingState === 'loading' || loading) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Meeting...</h3>
            <p className="text-gray-600">Please wait while we prepare your session</p>
          </div>
        </div>
    );
  }

  if (meetingState === 'error' || error) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Meeting Error</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Unable to access this meeting. Please check your permissions.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                  onClick={() => navigate('/StudentConnect')}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
    );
  }

  if (meetingState === 'setup') {
    return (
        <div className="min-h-screen bg-gray-100 py-8">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Start a Meeting</h1>
                <p className="text-gray-600">Set up your study session with another student</p>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Subject *
                  </label>
                  <input
                      type="text"
                      value={meetingForm.subject}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Math Study Session, Code Review"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                  />
                </div>

                {!otherUserId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Student's Name
                      </label>
                      <input
                          type="text"
                          value={meetingForm.otherUserName}
                          onChange={(e) => setMeetingForm(prev => ({ ...prev, otherUserName: e.target.value }))}
                          placeholder="Student's name (optional)"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Duration
                  </label>
                  <select
                      value={meetingForm.duration}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                  </select>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Meeting Features</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>✅ HD Video and Audio</li>
                    <li>✅ Screen Sharing</li>
                    <li>✅ Chat Messages</li>
                    <li>✅ Recording (if enabled)</li>
                    <li>✅ No time limits</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Meeting'}
                  </button>

                  <button
                      type="button"
                      onClick={handleInstantMeeting}
                      className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Start Instantly
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button
                    onClick={() => navigate('/StudentConnect')}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (meetingState === 'joining') {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">🎥</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Setting up Meeting...</h3>
            <p className="text-gray-600">Creating your study session</p>
          </div>
        </div>
    );
  }

  if (meetingState === 'meeting' && meetingData) {
    return (
        <JitsiMeeting
            roomName={meetingData.roomName}
            otherUserId={meetingForm.otherUserId}
            otherUserName={meetingData.otherUserName}
            subject={meetingData.subject}
            sessionType={meetingForm.sessionType}
        />
    );
  }

  return null;
};

export default OnlineMeeting;