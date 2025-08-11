// src/components/Meeting/MeetingDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MeetingManagementService } from '@/services/MeetingManagementService';

const MeetingDashboard = () => {
    const { user } = useAuth();
    const [activeMeetings, setActiveMeetings] = useState([]);
    const [meetingStats, setMeetingStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedTimeRange, setSelectedTimeRange] = useState('week');
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Fetch active meetings
    const fetchActiveMeetings = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            const meetings = await MeetingManagementService.getUserActiveMeetings(user.id);
            setActiveMeetings(meetings);
        } catch (error) {
            console.error('Error fetching active meetings:', error);
        }
    }, [user?.id]);

    // Fetch meeting statistics
    const fetchMeetingStats = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            const stats = await MeetingManagementService.getMeetingStats(user.id, selectedTimeRange);
            setMeetingStats(stats);
        } catch (error) {
            console.error('Error fetching meeting stats:', error);
        }
    }, [user?.id, selectedTimeRange]);

    // Initialize dashboard
    useEffect(() => {
        if (user?.id) {
            fetchActiveMeetings();
            fetchMeetingStats();
            setLoading(false);
        }
    }, [user?.id, fetchActiveMeetings, fetchMeetingStats]);

    // Set up auto-refresh
    useEffect(() => {
        if (user?.id) {
            const interval = setInterval(() => {
                fetchActiveMeetings();
                fetchMeetingStats();
            }, 30000); // Refresh every 30 seconds
            
            setRefreshInterval(interval);
            
            return () => {
                if (interval) clearInterval(interval);
            };
        }
    }, [user?.id, fetchActiveMeetings, fetchMeetingStats]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [refreshInterval]);

    // Handle meeting status update
    const handleStatusUpdate = async (meetingId, newStatus) => {
        try {
            const result = await MeetingManagementService.updateMeetingStatus(meetingId, newStatus);
            if (result.success) {
                // Refresh meetings
                fetchActiveMeetings();
                fetchMeetingStats();
            }
        } catch (error) {
            console.error('Error updating meeting status:', error);
        }
    };

    // Format time remaining
    const formatTimeRemaining = (endTime) => {
        if (!endTime) return 'No end time set';
        
        const now = new Date();
        const end = endTime.toDate ? endTime.toDate() : new Date(endTime);
        const diff = end - now;
        
        if (diff <= 0) return 'Meeting ended';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        } else {
            return `${minutes}m remaining`;
        }
    };

    // Format meeting duration
    const formatDuration = (minutes) => {
        if (!minutes) return '0m';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Meeting Dashboard</h2>
                <div className="flex gap-2">
                    <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        className="bg-[#2D3748] border border-[#4A5568] rounded-lg px-3 py-2 text-sm text-white"
                    >
                        <option value="day">Last 24 Hours</option>
                        <option value="week">Last Week</option>
                        <option value="month">Last Month</option>
                    </select>
                    <button
                        onClick={() => {
                            fetchActiveMeetings();
                            fetchMeetingStats();
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#2D3748] rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="text-2xl font-bold text-blue-400">{meetingStats.total || 0}</div>
                    <div className="text-[#A0AEC0] text-sm">Total Meetings</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 border-l-4 border-green-500">
                    <div className="text-2xl font-bold text-green-400">{meetingStats.completed || 0}</div>
                    <div className="text-[#A0AEC0] text-sm">Completed</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 border-l-4 border-orange-500">
                    <div className="text-2xl font-bold text-orange-400">{meetingStats.active || 0}</div>
                    <div className="text-[#A0AEC0] text-sm">Active Now</div>
                </div>
                <div className="bg-[#2D3748] rounded-lg p-4 border-l-4 border-purple-500">
                    <div className="text-2xl font-bold text-purple-400">{formatDuration(meetingStats.averageDuration || 0)}</div>
                    <div className="text-[#A0AEC0] text-sm">Avg Duration</div>
                </div>
            </div>

            {/* Active Meetings */}
            <div className="bg-[#2D3748] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                    Active Meetings ({activeMeetings.length})
                </h3>
                
                {activeMeetings.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-[#A0AEC0] text-4xl mb-4">📅</div>
                        <p className="text-[#A0AEC0] text-lg">No active meetings</p>
                        <p className="text-[#A0AEC0] text-sm">Your scheduled meetings will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeMeetings.map((meeting) => (
                            <div
                                key={meeting.id}
                                className="bg-[#1A202C] rounded-lg p-4 border border-[#4A5568]"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-semibold text-white text-lg">
                                                {meeting.roomId}
                                            </h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                meeting.status === MeetingManagementService.MEETING_STATUS.ACTIVE
                                                    ? 'bg-green-900 text-green-300'
                                                    : 'bg-blue-900 text-blue-300'
                                            }`}>
                                                {meeting.status === MeetingManagementService.MEETING_STATUS.ACTIVE ? '🟢 Active' : '🔵 Starting'}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-[#A0AEC0]">Duration:</span>
                                                <span className="text-white ml-2">{formatDuration(meeting.duration)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[#A0AEC0]">Participants:</span>
                                                <span className="text-white ml-2">{meeting.totalParticipants}/{meeting.maxParticipants}</span>
                                            </div>
                                            <div>
                                                <span className="text-[#A0AEC0]">Time Remaining:</span>
                                                <span className="text-white ml-2">{formatTimeRemaining(meeting.scheduledEndTime)}</span>
                                            </div>
                                        </div>

                                        {meeting.scheduledStartTime && (
                                            <div className="mt-2 text-xs text-[#A0AEC0]">
                                                Started: {meeting.scheduledStartTime.toDate ? 
                                                    meeting.scheduledStartTime.toDate().toLocaleString() : 
                                                    new Date(meeting.scheduledStartTime).toLocaleString()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 ml-4">
                                        <button
                                            onClick={() => window.open(meeting.meetingUrl, '_blank')}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors whitespace-nowrap"
                                        >
                                            🎥 Join Meeting
                                        </button>
                                        
                                        {meeting.status === MeetingManagementService.MEETING_STATUS.STARTING && (
                                            <button
                                                onClick={() => handleStatusUpdate(meeting.id, MeetingManagementService.MEETING_STATUS.ACTIVE)}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors whitespace-nowrap"
                                            >
                                                ✅ Start Meeting
                                            </button>
                                        )}
                                        
                                        {meeting.status === MeetingManagementService.MEETING_STATUS.ACTIVE && (
                                            <button
                                                onClick={() => handleStatusUpdate(meeting.id, MeetingManagementService.MEETING_STATUS.COMPLETED)}
                                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors whitespace-nowrap"
                                            >
                                                🏁 Complete Meeting
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Meeting Controls */}
            <div className="bg-[#2D3748] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Meeting Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1A202C] rounded-lg p-4 border border-[#4A5568]">
                        <h4 className="font-medium text-white mb-2">Auto-Completion</h4>
                        <p className="text-[#A0AEC0] text-sm mb-3">
                            Meetings are automatically completed when their scheduled time ends.
                        </p>
                        <div className="text-xs text-green-400">
                            ✅ Enabled - System will auto-complete expired meetings
                        </div>
                    </div>
                    
                    <div className="bg-[#1A202C] rounded-lg p-4 border border-[#4A5568]">
                        <h4 className="font-medium text-white mb-2">Real-time Monitoring</h4>
                        <p className="text-[#A0AEC0] text-sm mb-3">
                            Dashboard refreshes automatically every 30 seconds.
                        </p>
                        <div className="text-xs text-blue-400">
                            🔄 Auto-refresh: {refreshInterval ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingDashboard;
