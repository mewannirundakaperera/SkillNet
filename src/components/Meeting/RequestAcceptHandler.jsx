// src/components/Meeting/RequestAcceptHandler.jsx
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMeeting } from '@/hooks/useMeeting';
import {
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const RequestAcceptHandler = ({
                                  request,
                                  requestType = 'one-to-one', // 'one-to-one' or 'group'
                                  onAcceptComplete,
                                  onError,
                                  children, // Custom accept button or use default
                                  autoCreateMeeting = true // Whether to automatically create meeting on accept
                              }) => {
    const { user } = useAuth();
    const { createOneToOneMeeting, createGroupMeeting } = useMeeting();
    const [isAccepting, setIsAccepting] = useState(false);

    // Handle accepting request and creating meeting
    const handleAcceptRequest = async () => {
        if (!request || !user) return;

        try {
            setIsAccepting(true);

            // Step 1: Update request status to 'accepted'
            const collection = requestType === 'one-to-one' ? 'requests' : 'grouprequests';
            const requestRef = doc(db, collection, request.id);

            await updateDoc(requestRef, {
                status: 'accepted',
                acceptedBy: user.id,
                acceptedByName: user.displayName || user.name || 'Student',
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            let meetingResult = null;

            // Step 2: Create meeting if auto-create is enabled
            if (autoCreateMeeting) {
                if (requestType === 'one-to-one') {
                    meetingResult = await createOneToOneMeeting(
                        request.id,
                        request,
                        user.id,
                        user.displayName || user.name || 'Student'
                    );
                } else {
                    meetingResult = await createGroupMeeting(request.id, request);
                }
            }

            // Step 3: Call completion callback
            if (onAcceptComplete) {
                onAcceptComplete({
                    request: {
                        ...request,
                        status: 'accepted',
                        acceptedBy: user.id,
                        acceptedByName: user.displayName || user.name || 'Student',
                        acceptedAt: new Date()
                    },
                    meeting: meetingResult
                });
            }

        } catch (error) {
            console.error('Error accepting request:', error);
            if (onError) {
                onError(error);
            }
        } finally {
            setIsAccepting(false);
        }
    };

    // Default accept button if no children provided
    const defaultButton = (
        <button
            onClick={handleAcceptRequest}
            disabled={isAccepting || request?.status !== 'pending'}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {isAccepting ? (
                <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {autoCreateMeeting ? 'Accepting & Creating Meeting...' : 'Accepting...'}
                </>
            ) : (
                <>
                    <span className="mr-2">✅</span>
                    Accept Request
                </>
            )}
        </button>
    );

    // Don't render if request is not pending or user is the requester
    if (!request || request.status !== 'pending' || request.userId === user?.id || request.createdBy === user?.id) {
        return null;
    }

    return (
        <div className="space-y-2">
            {children ? (
                React.cloneElement(children, {
                    onClick: handleAcceptRequest,
                    disabled: isAccepting,
                    loading: isAccepting
                })
            ) : (
                defaultButton
            )}

            {isAccepting && autoCreateMeeting && (
                <div className="text-center text-sm text-gray-600">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Creating secure meeting room...
                    </div>
                </div>
            )}
        </div>
    );
};

// Specialized component for one-to-one requests
export const OneToOneAcceptHandler = (props) => (
    <RequestAcceptHandler {...props} requestType="one-to-one" />
);

// Specialized component for group requests
export const GroupAcceptHandler = (props) => (
    <RequestAcceptHandler {...props} requestType="group" />
);

// Complete request card with accept functionality
export const AcceptableRequestCard = ({
                                          request,
                                          requestType = 'one-to-one',
                                          onAcceptComplete,
                                          className = ''
                                      }) => {
    const { user } = useAuth();
    const [showDetails, setShowDetails] = useState(false);

    // Don't render if user is the requester
    if (request?.userId === user?.id || request?.createdBy === user?.id) {
        return null;
    }

    return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${className}`}>
            {/* Request Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">
                        {request.title || request.topic || 'Study Session Request'}
                    </h3>
                    <p className="text-sm text-gray-600">
                        From: {request.userName || request.createdByName || 'Student'}
                    </p>
                    {request.category && (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
              {request.category}
            </span>
                    )}
                </div>

                {/* Urgency indicator */}
                {request.urgency && request.urgency !== 'medium' && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                        request.urgency === 'high'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {request.urgency} priority
                    </div>
                )}
            </div>

            {/* Request Description */}
            {request.description || request.message ? (
                <div className="mb-4">
                    <p className="text-gray-700 text-sm line-clamp-2">
                        {request.description || request.message}
                    </p>
                    {(request.description || request.message).length > 100 && (
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-blue-600 hover:text-blue-700 text-xs mt-1"
                        >
                            {showDetails ? 'Show less' : 'Show more'}
                        </button>
                    )}
                    {showDetails && (
                        <p className="text-gray-700 text-sm mt-2">
                            {request.description || request.message}
                        </p>
                    )}
                </div>
            ) : null}

            {/* Skills/Topics for group requests */}
            {requestType === 'group' && request.skills && request.skills.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                        {request.skills.slice(0, 3).map((skill, index) => (
                            <span
                                key={index}
                                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                            >
                {skill}
              </span>
                        ))}
                        {request.skills.length > 3 && (
                            <span className="text-gray-500 text-xs">
                +{request.skills.length - 3} more
              </span>
                        )}
                    </div>
                </div>
            )}

            {/* Accept Button */}
            <RequestAcceptHandler
                request={request}
                requestType={requestType}
                onAcceptComplete={onAcceptComplete}
                onError={(error) => {
                    console.error('Error accepting request:', error);
                    alert('Failed to accept request. Please try again.');
                }}
            />

            {/* Request Metadata */}
            <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {requestType === 'group' ? 'Group Request' : 'One-to-One Request'}
          </span>
                    {request.createdAt && (
                        <span>
              {new Date(request.createdAt.toDate ? request.createdAt.toDate() : request.createdAt).toLocaleDateString()}
            </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestAcceptHandler;