// Test script to create a test accepted request with Jitsi meeting
// Run this in your browser console or create a test page

import { databaseService } from './src/services/databaseService.js';
import { UnifiedJitsiMeetingService } from './src/services/UnifiedJitsiMeetingService.js';

// Test function to create an accepted request
async function createTestAcceptedRequest() {
    try {
        console.log('🧪 Creating test accepted request...');
        
        // Step 1: Create a test request
        const testRequestData = {
            topic: 'Test Jitsi Meeting - React Fundamentals',
            description: 'This is a test request to verify Jitsi meeting functionality. We will cover React basics, hooks, and component lifecycle.',
            subject: 'Computer Science',
            preferredDate: '2024-01-15',
            preferredTime: '14:00',
            duration: '60',
            paymentAmount: '25',
            tags: ['React', 'JavaScript', 'Frontend', 'Test']
        };
        
        // Create the request (you'll need to replace 'testUserId' with an actual user ID)
        const createResult = await databaseService.createRequest(testRequestData, 'testUserId', false);
        
        if (!createResult.success) {
            throw new Error(`Failed to create request: ${createResult.message}`);
        }
        
        const requestId = createResult.requestId;
        console.log('✅ Test request created:', requestId);
        
        // Step 2: Create a response to accept the request
        const responseData = {
            status: 'accepted',
            message: 'I would love to help you with React fundamentals! I have 3+ years of experience.',
            responderName: 'Test Teacher',
            responderEmail: 'teacher@test.com',
            proposedDate: '2024-01-15',
            proposedTime: '14:00',
            proposedDuration: '60'
        };
        
        // Accept the request (you'll need to replace 'testResponderId' with an actual user ID)
        const acceptResult = await databaseService.respondToRequest(requestId, responseData, 'testResponderId');
        
        if (!acceptResult.success) {
            throw new Error(`Failed to accept request: ${acceptResult.message}`);
        }
        
        console.log('✅ Request accepted successfully!');
        console.log('🎥 Meeting URL:', acceptResult.meetingUrl);
        
        // Step 3: Verify the meeting was created
        const meetingResult = await databaseService.getMeetingForRequest(requestId);
        
        if (meetingResult.success && meetingResult.meeting) {
            console.log('✅ Meeting verified:', meetingResult.meeting);
            console.log('🔗 Jitsi Room ID:', meetingResult.meeting.roomId);
            console.log('🌐 Meeting URL:', meetingResult.meeting.meetingUrl);
        } else {
            console.log('⚠️ Meeting verification failed:', meetingResult);
        }
        
        return {
            requestId,
            meetingUrl: acceptResult.meetingUrl,
            success: true
        };
        
    } catch (error) {
        console.error('❌ Error creating test accepted request:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Alternative: Create test data directly in Firestore
async function createTestDataDirectly() {
    try {
        console.log('🧪 Creating test data directly in Firestore...');
        
        // This would require direct Firestore access
        // You can run this in a component or service file
        
        const testRequest = {
            topic: 'Test Jitsi Meeting - Advanced JavaScript',
            description: 'Testing Jitsi integration with a pre-accepted request',
            subject: 'Computer Science',
            userId: 'testUserId',
            createdBy: 'testUserId',
            userName: 'Test Student',
            userEmail: 'student@test.com',
            status: 'active', // Already accepted
            acceptedBy: 'testResponderId',
            acceptedByName: 'Test Teacher',
            acceptedAt: new Date(),
            meetingId: 'test-meeting-123',
            meetingUrl: 'https://meet.jit.si/test-room-123',
            roomId: 'test-room-123',
            meetingStatus: 'scheduled',
            participants: ['testUserId', 'testResponderId'],
            participantCount: 2,
            type: 'one-to-one',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('📝 Test request data prepared:', testRequest);
        console.log('🔗 Test meeting URL:', testRequest.meetingUrl);
        
        return testRequest;
        
    } catch (error) {
        console.error('❌ Error preparing test data:', error);
        return null;
    }
}

// Export for use in components
export { createTestAcceptedRequest, createTestDataDirectly };

// For browser console testing
if (typeof window !== 'undefined') {
    window.createTestAcceptedRequest = createTestAcceptedRequest;
    window.createTestDataDirectly = createTestDataDirectly;
    console.log('🧪 Test functions loaded. Use createTestAcceptedRequest() or createTestDataDirectly()');
}

