// src/components/Meeting/MeetingInvite.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMeeting } from '@/hooks/useMeeting';
import { formatMeetingTime } from '@/utils/meetingUtils';

const MeetingInvite = ({
                           requestData,
                           otherUser,
                           onClose,
                           className = ''
                       }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { createMeeting, loading } = useMeeting();

    const [meetingForm, setMeetingForm] = useState({
        subject: requestData?.subject ? `${requestData.subject} Study Session` : 'Study Session',
        scheduledDate: '',
        scheduledTime: '',
        duration: 60,
        message: `Hi! I'd like to schedule a study session with you${requestData?.subject ? ` for ${requestData.subject}` : ''}.`
    });

    const [inviteType, setInviteType] = useState('instant'); // instant, scheduled
    const [step, setStep] = useState('form'); // form, sending, sent

    // Handle form changes
    const handleFormChange = (field, value) => {
        setMeetingForm(prev => ({ ...prev, [field]: value }));
    };

    // Handle instant meeting
    const handleInstantMeeting = () => {
        const params = new URLSearchParams({
            room: `instant_${Date.now()}_${user.id}_${otherUser.id}`,
            userId: otherUser.id,
            userName: otherUser.name,
            subject: meetingForm.subject
        });

        navigate(`/OnlineMeeting?${params.toString()}`);
    };

    // Handle scheduled meeting
    const handleScheduledMeeting = async () => {
        if (!meetingForm.scheduledDate || !meetingForm.scheduledTime) {
            alert('Please select a date and time for the meeting');
            return;
        }

        try {
            setStep('sending');

            const meeting = await createMeeting({
                requestId: requestData?.id,
                participantUserId: otherUser.id,
                participantUserName: otherUser.name,
                subject: meetingForm.subject,
                scheduledDate: meetingForm.scheduledDate,
                scheduledTime: meetingForm.scheduledTime,
                duration: meetingForm.duration,
                sessionType: 'one-to-one'
            });

            setStep('sent');

            // Auto-close after 3 seconds
            setTimeout(() => {
                onClose && onClose();
            }, 3000);

        } catch (error) {
            console.error('Error creating scheduled meeting:', error);
            alert('Failed to schedule meeting. Please try again.');
            setStep('form');
        }
    };

    // Get minimum date (today)
    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Get minimum time (current time if today is selected)
    const getMinTime = () => {
        const today = new Date();
        const selectedDate = new Date(meetingForm.scheduledDate);

        if (selectedDate.toDateString() === today.toDateString()) {
            const hours = today.getHours().toString().padStart(2, '0');
            const minutes = Math.ceil(today.getMinutes() / 15) * 15; // Round to next 15 min
            return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }

        return '09:00';
    };

    if (step === 'sending') {
        return (
            <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Sending Invite...</h3>
                    <p className="text-gray-600">Creating your meeting and sending invitation</p>
                </div>
            </div>
        );
    }

    if (step === 'sent') {
        return (
            <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
                <div className="text-center">
                    <div className="text-green-500 text-4xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Invitation Sent!</h3>
                    <p className="text-gray-600 mb-4">
                        {otherUser.name} will receive a notification about your meeting request.
                    </p>
                    <div className="bg-green-50 rounded-lg p-4 text-left">
                        <h4 className="font-medium text-green-800 mb-2">Meeting Details:</h4>
                        <div className="text-sm text-green-700 space-y-1">
                            <div><strong>Subject:</strong> {meetingForm.subject}</div>
                            <div><strong>Date & Time:</strong> {formatMeetingTime(meetingForm.scheduledDate, meetingForm.scheduledTime)}</div>
                            <div><strong>Duration:</strong> {meetingForm.duration} minutes</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <img
                        src={otherUser.avatar}
                        alt={otherUser.name}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                        <h3 className="font-semibold text-gray-800">Invite {otherUser.name}</h3>
                        <p className="text-sm text-gray-600">Start a study session</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Meeting Type Selection */}
            <div className="mb-6">
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setInviteType('instant')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                            inviteType === 'instant'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Start Now
                    </button>
                    <button
                        onClick={() => setInviteType('scheduled')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                            inviteType === 'scheduled'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Schedule Later
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meeting Subject
                    </label>
                    <input
                        type="text"
                        value={meetingForm.subject}
                        onChange={(e) => handleFormChange('subject', e.target.value)}
                        placeholder="e.g., Math Study Session"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Scheduled Meeting Fields */}
                {inviteType === 'scheduled' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={meetingForm.scheduledDate}
                                    onChange={(e) => handleFormChange('scheduledDate', e.target.value)}
                                    min={getMinDate()}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Time
                                </label>
                                <input
                                    type="time"
                                    value={meetingForm.scheduledTime}
                                    onChange={(e) => handleFormChange('scheduledTime', e.target.value)}
                                    min={meetingForm.scheduledDate === getMinDate() ? getMinTime() : '09:00'}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Duration
                            </label>
                            <select
                                value={meetingForm.duration}
                                onChange={(e) => handleFormChange('duration', parseInt(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value={30}>30 minutes</option>
                                <option value={60}>1 hour</option>
                                <option value={90}>1.5 hours</option>
                                <option value={120}>2 hours</option>
                                <option value={180}>3 hours</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Message (Optional)
                            </label>
                            <textarea
                                value={meetingForm.message}
                                onChange={(e) => handleFormChange('message', e.target.value)}
                                placeholder="Add a personal message..."
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <div className="pt-4">
                    {inviteType === 'instant' ? (
                        <button
                            onClick={handleInstantMeeting}
                            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                        >
                            🎥 Start Meeting Now
                        </button>
                    ) : (
                        <button
                            onClick={handleScheduledMeeting}
                            disabled={loading || !meetingForm.scheduledDate || !meetingForm.scheduledTime}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Sending Invite...' : '📅 Send Meeting Invite'}
                        </button>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <div className="text-blue-500 text-lg">ℹ️</div>
                        <div className="text-sm text-blue-700">
                            <div className="font-medium mb-1">Meeting Features:</div>
                            <ul className="space-y-1">
                                <li>• HD video and audio calling</li>
                                <li>• Screen sharing for presentations</li>
                                <li>• Chat messaging</li>
                                <li>• No time limits or restrictions</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingInvite;