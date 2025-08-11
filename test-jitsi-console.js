// Test Jitsi Functionality - Run this in your browser console
// Make sure you're logged in and on a page that has access to the services

console.log('🧪 Jitsi Test Script Loaded');
console.log('Available test functions:');
console.log('- testCreateRequest() - Create a test request');
console.log('- testAcceptRequest(requestId) - Accept a request (creates Jitsi meeting)');
console.log('- testJoinMeeting(meetingUrl) - Test joining a meeting');

// Test function to create a request
window.testCreateRequest = async function() {
    try {
        console.log('🔄 Creating test request...');
        
        // Check if we have access to the required services
        if (typeof window.databaseService === 'undefined') {
            console.error('❌ databaseService not available. Make sure you\'re on the right page.');
            return;
        }
        
        const testRequestData = {
            topic: `Test Jitsi Meeting - ${new Date().toLocaleTimeString()}`,
            description: 'This is a test request to verify Jitsi meeting functionality.',
            subject: 'Computer Science',
            preferredDate: new Date().toISOString().split('T')[0],
            preferredTime: '14:00',
            duration: '60',
            paymentAmount: '25',
            tags: ['React', 'JavaScript', 'Frontend', 'Test']
        };
        
        // You'll need to replace 'testUserId' with an actual user ID from your auth context
        const createResult = await window.databaseService.createRequest(testRequestData, 'testUserId', false);
        
        if (createResult.success) {
            console.log('✅ Test request created successfully!');
            console.log('Request ID:', createResult.requestId);
            console.log('Message:', createResult.message);
            return createResult.requestId;
        } else {
            console.error('❌ Failed to create request:', createResult.message);
        }
    } catch (error) {
        console.error('❌ Error creating test request:', error);
    }
};

// Test function to accept a request
window.testAcceptRequest = async function(requestId) {
    try {
        console.log('🔄 Accepting test request...', requestId);
        
        if (!requestId) {
            console.error('❌ Please provide a request ID');
            return;
        }
        
        const responseData = {
            status: 'accepted',
            message: 'I would love to help you with this! I have 3+ years of experience.',
            responderName: 'Test Teacher',
            responderEmail: 'teacher@test.com',
            proposedDate: new Date().toISOString().split('T')[0],
            proposedTime: '14:00',
            proposedDuration: '60'
        };
        
        // You'll need to replace 'testResponderId' with an actual user ID
        const acceptResult = await window.databaseService.respondToRequest(requestId, responseData, 'testResponderId');
        
        if (acceptResult.success) {
            console.log('✅ Request accepted successfully!');
            console.log('Meeting URL:', acceptResult.meetingUrl);
            console.log('Message:', acceptResult.message);
            return acceptResult;
        } else {
            console.error('❌ Failed to accept request:', acceptResult.message);
        }
    } catch (error) {
        console.error('❌ Error accepting request:', error);
    }
};

// Test function to join a meeting
window.testJoinMeeting = function(meetingUrl) {
    if (!meetingUrl) {
        console.error('❌ Please provide a meeting URL');
        return;
    }
    
    console.log('🎥 Opening meeting URL:', meetingUrl);
    
    // Open meeting in new tab
    const newWindow = window.open(meetingUrl, '_blank');
    
    if (newWindow) {
        console.log('✅ Meeting opened in new tab');
    } else {
        console.error('❌ Failed to open meeting (popup blocked?)');
        console.log('Try manually navigating to:', meetingUrl);
    }
};

// Test function to check meeting status
window.testCheckMeeting = async function(requestId) {
    try {
        console.log('🔄 Checking meeting status for request:', requestId);
        
        if (!requestId) {
            console.error('❌ Please provide a request ID');
            return;
        }
        
        const meetingResult = await window.databaseService.getMeetingForRequest(requestId);
        
        if (meetingResult.success && meetingResult.meeting) {
            console.log('✅ Meeting found:', meetingResult.meeting);
            console.log('Room ID:', meetingResult.meeting.roomId);
            console.log('Meeting URL:', meetingResult.meeting.meetingUrl);
            console.log('Status:', meetingResult.meeting.status);
        } else {
            console.log('⚠️ No meeting found or error:', meetingResult);
        }
    } catch (error) {
        console.error('❌ Error checking meeting:', error);
    }
};

// Helper function to list all test functions
window.showTestFunctions = function() {
    console.log('🧪 Available Test Functions:');
    console.log('1. testCreateRequest() - Create a test request');
    console.log('2. testAcceptRequest(requestId) - Accept a request');
    console.log('3. testJoinMeeting(meetingUrl) - Join a meeting');
    console.log('4. testCheckMeeting(requestId) - Check meeting status');
    console.log('5. showTestFunctions() - Show this help');
    console.log('');
    console.log('Example usage:');
    console.log('const requestId = await testCreateRequest();');
    console.log('const result = await testAcceptRequest(requestId);');
    console.log('testJoinMeeting(result.meetingUrl);');
};

// Show available functions when script loads
window.showTestFunctions();

console.log('✅ Jitsi test script ready! Use showTestFunctions() to see available commands.');

