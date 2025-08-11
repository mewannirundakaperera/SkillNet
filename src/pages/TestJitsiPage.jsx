import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import databaseService from '@/services/databaseService';
import UnifiedJitsiMeetingService from '@/services/UnifiedJitsiMeetingService';

const TestJitsiPage = () => {
    const { user } = useAuth();
    const [testRequests, setTestRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Create a test request
    const createTestRequest = async () => {
        if (!user) {
            setMessage('Please log in to create test requests');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const testRequestData = {
                topic: `Test Jitsi Meeting - ${new Date().toLocaleTimeString()}`,
                description: 'This is a test request to verify Jitsi meeting functionality. We will cover React basics, hooks, and component lifecycle.',
                subject: 'Computer Science',
                preferredDate: new Date().toISOString().split('T')[0],
                preferredTime: '14:00',
                duration: '60',
                paymentAmount: '25',
                tags: ['React', 'JavaScript', 'Frontend', 'Test']
            };

            const createResult = await databaseService.createRequest(testRequestData, user.id, false);
            
            if (createResult.success) {
                setMessage(`✅ Test request created with ID: ${createResult.requestId}`);
                // Refresh the list
                loadTestRequests();
            } else {
                setMessage(`❌ Failed to create request: ${createResult.message}`);
            }
        } catch (error) {
            console.error('Error creating test request:', error);
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Accept a test request (simulate another user accepting)
    const acceptTestRequest = async (requestId) => {
        if (!user) {
            setMessage('Please log in to accept requests');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const responseData = {
                status: 'accepted',
                message: 'I would love to help you with this! I have 3+ years of experience.',
                responderName: user.displayName || user.name || 'Test Teacher',
                responderEmail: user.email || 'teacher@test.com',
                proposedDate: new Date().toISOString().split('T')[0],
                proposedTime: '14:00',
                proposedDuration: '60'
            };

            const acceptResult = await databaseService.respondToRequest(requestId, responseData, user.id);
            
            if (acceptResult.success) {
                setMessage(`✅ Request accepted! Meeting URL: ${acceptResult.meetingUrl}`);
                // Refresh the list
                loadTestRequests();
            } else {
                setMessage(`❌ Failed to accept request: ${acceptResult.message}`);
            }
        } catch (error) {
            console.error('Error accepting request:', error);
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Load test requests
    const loadTestRequests = () => {
        if (!user) return;

        try {
            const unsubscribe = databaseService.getUserRequests(user.id, null, (requests) => {
                setTestRequests(requests);
            });
            
            // Store unsubscribe function for cleanup if needed
            return unsubscribe;
        } catch (error) {
            console.error('Error loading test requests:', error);
        }
    };

    // Join meeting
    const joinMeeting = (meetingUrl) => {
        if (meetingUrl) {
            window.open(meetingUrl, '_blank');
        } else {
            setMessage('❌ No meeting URL available');
        }
    };

    // Complete request
    const completeRequest = async (requestId) => {
        if (!user) return;

        try {
            const result = await databaseService.completeRequest(requestId, user.id);
            if (result.success) {
                setMessage('✅ Request completed successfully!');
                loadTestRequests();
            } else {
                setMessage(`❌ Failed to complete request: ${result.message}`);
            }
        } catch (error) {
            console.error('Error completing request:', error);
            setMessage(`❌ Error: ${error.message}`);
        }
    };

    // Load requests on component mount
    useEffect(() => {
        loadTestRequests();
    }, [user]);

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Test Jitsi Page</h1>
                    <p className="text-slate-300">Please log in to test Jitsi functionality</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        🧪 Test Jitsi Meeting Functionality
                    </h1>
                    <p className="text-slate-300 text-lg">
                        Create and test accepted requests with Jitsi meetings
                    </p>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${
                        message.includes('✅') ? 'bg-green-900 text-green-100' : 
                        message.includes('❌') ? 'bg-red-900 text-red-100' : 
                        'bg-blue-900 text-blue-100'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center mb-8">
                    <button
                        onClick={createTestRequest}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg transition-colors"
                    >
                        {loading ? 'Creating...' : '➕ Create Test Request'}
                    </button>
                    
                    <button
                        onClick={loadTestRequests}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        🔄 Refresh Requests
                    </button>
                </div>

                {/* Test Requests List */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white text-center mb-6">
                        Test Requests ({testRequests.length})
                    </h2>
                    
                    {testRequests.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            <p>No test requests found. Create one to get started!</p>
                        </div>
                    ) : (
                        testRequests.map((request) => (
                            <div key={request.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white mb-2">
                                            {request.topic || request.title}
                                        </h3>
                                        <p className="text-slate-300 mb-2">
                                            {request.description}
                                        </p>
                                        <div className="flex gap-4 text-sm text-slate-400">
                                            <span>Subject: {request.subject}</span>
                                            <span>Status: {request.status}</span>
                                            <span>Duration: {request.duration}min</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            request.status === 'open' ? 'bg-yellow-900 text-yellow-100' :
                                            request.status === 'active' ? 'bg-blue-900 text-blue-100' :
                                            request.status === 'completed' ? 'bg-green-900 text-green-100' :
                                            'bg-slate-700 text-slate-300'
                                        }`}>
                                            {request.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 flex-wrap">
                                    {request.status === 'open' && (
                                        <button
                                            onClick={() => acceptTestRequest(request.id)}
                                            disabled={loading}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium rounded-lg transition-colors"
                                        >
                                            {loading ? 'Accepting...' : '✅ Accept Request'}
                                        </button>
                                    )}
                                    
                                    {request.status === 'active' && request.meetingUrl && (
                                        <button
                                            onClick={() => joinMeeting(request.meetingUrl)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                        >
                                            🎥 Join Meeting
                                        </button>
                                    )}
                                    
                                    {request.status === 'active' && (
                                        <button
                                            onClick={() => completeRequest(request.id)}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                                        >
                                            ✅ Complete Request
                                        </button>
                                    )}
                                </div>

                                {/* Meeting Information */}
                                {request.meetingUrl && (
                                    <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                                        <h4 className="text-white font-medium mb-2">🎥 Meeting Details:</h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="text-slate-300">
                                                <strong>Room ID:</strong> {request.roomId || 'N/A'}
                                            </p>
                                            <p className="text-slate-300">
                                                <strong>Meeting URL:</strong> 
                                                <a 
                                                    href={request.meetingUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 ml-2 underline"
                                                >
                                                    {request.meetingUrl}
                                                </a>
                                            </p>
                                            <p className="text-slate-300">
                                                <strong>Status:</strong> {request.meetingStatus || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestJitsiPage;
