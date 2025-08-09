// src/components/Meeting/MeetingButton.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MeetingInvite from './MeetingInvite';

const MeetingButton = ({
                           requestData,
                           otherUser,
                           variant = 'button', // 'button', 'icon', 'link'
                           size = 'md', // 'sm', 'md', 'lg'
                           className = ''
                       }) => {
    const navigate = useNavigate();
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Quick start meeting (for instant use)
    const handleQuickMeeting = () => {
        const params = new URLSearchParams({
            userId: otherUser.id,
            userName: otherUser.name,
            subject: requestData?.subject ? `${requestData.subject} Session` : 'Study Session'
        });

        if (requestData?.id) {
            params.append('requestId', requestData.id);
        }

        navigate(`/OnlineMeeting?${params.toString()}`);
    };

    // Button variants
    const getButtonClasses = () => {
        const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base'
        };

        const variantClasses = {
            button: 'bg-blue-600 text-white hover:bg-blue-700 rounded-lg',
            icon: 'p-2 text-blue-600 hover:bg-blue-50 rounded-full',
            link: 'text-blue-600 hover:text-blue-700 hover:underline'
        };

        return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
    };

    // Button content based on variant
    const getButtonContent = () => {
        switch (variant) {
            case 'icon':
                return <span className="text-xl">🎥</span>;
            case 'link':
                return 'Start Video Call';
            default:
                return (
                    <>
                        <span className="mr-2">🎥</span>
                        Meet Now
                    </>
                );
        }
    };

    return (
        <>
            {/* Main Button */}
            <div className="relative">
                <button
                    onClick={() => setShowInviteModal(true)}
                    className={getButtonClasses()}
                    title="Start video meeting"
                >
                    {getButtonContent()}
                </button>

                {/* Quick action dropdown (for medium/large buttons) */}
                {(size === 'md' || size === 'lg') && variant === 'button' && (
                    <button
                        onClick={handleQuickMeeting}
                        className="ml-1 px-2 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-r-lg border-l border-blue-400 transition-colors"
                        title="Start meeting instantly"
                    >
                        ⚡
                    </button>
                )}
            </div>

            {/* Meeting Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md">
                        <MeetingInvite
                            requestData={requestData}
                            otherUser={otherUser}
                            onClose={() => setShowInviteModal(false)}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

// Quick Meeting Link Component (for simple text links)
export const MeetingLink = ({ requestData, otherUser, children, className = '' }) => {
    const navigate = useNavigate();

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const params = new URLSearchParams({
            userId: otherUser.id,
            userName: otherUser.name,
            subject: requestData?.subject ? `${requestData.subject} Session` : 'Study Session'
        });

        if (requestData?.id) {
            params.append('requestId', requestData.id);
        }

        navigate(`/OnlineMeeting?${params.toString()}`);
    };

    return (
        <button
            onClick={handleClick}
            className={`text-blue-600 hover:text-blue-700 hover:underline transition-colors ${className}`}
        >
            {children || 'Start Video Call'}
        </button>
    );
};

// Meeting Status Badge (shows if meeting is available)
export const MeetingStatus = ({ otherUser, className = '' }) => {
    // This could be enhanced to show real-time online status
    return (
        <div className={`inline-flex items-center text-xs ${className}`}>
            <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
            <span className="text-gray-600">Available for video call</span>
        </div>
    );
};

export default MeetingButton;