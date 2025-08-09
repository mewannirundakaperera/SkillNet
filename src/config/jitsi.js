// src/config/jitsi.js
export const jitsiConfig = {
    // Public Jitsi Meet server
    domain: 'meet.jit.si',

    // Configuration options
    options: {
        roomName: '',
        parentNode: null,
        width: '100%',
        height: '100%',
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            enableUserRolesBasedOnToken: false,
            enableFeaturesBasedOnToken: false,
            disableModeratorIndicator: false,
            startScreenSharing: false,
            enableEmailInStats: false,
            enableClosePage: false,
            enableRemoteMute: true,
            enableLipSync: false,
            disableInitialGUM: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,
            resolution: 720,
            constraints: {
                video: {
                    aspectRatio: 16/9,
                    height: {
                        ideal: 720,
                        max: 720,
                        min: 240
                    }
                }
            },
            // Disable some features for better performance
            disableAudioLevels: false,
            enableTalkWhileMuted: false,
            disableJoinLeaveSounds: true,
            // UI customizations
            filmstrip: {
                disableResizable: false,
                disableStageFilmstrip: false
            },
            // Toolbar buttons
            toolbarButtons: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting',
                'fullscreen', 'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'select-background', 'download', 'help', 'mute-everyone', 'security'
            ]
        },
        interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
            APP_NAME: 'StudentConnect Meeting',
            NATIVE_APP_NAME: 'StudentConnect',
            PROVIDER_NAME: 'StudentConnect',
            LANG_DETECTION: true,
            CONNECTION_INDICATOR_AUTO_HIDE_ENABLED: true,
            CONNECTION_INDICATOR_AUTO_HIDE_TIMEOUT: 5000,
            VIDEO_LAYOUT_FIT: 'both',
            filmStripOnly: false,
            GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
            DISABLE_VIDEO_BACKGROUND: false,
            INITIAL_TOOLBAR_TIMEOUT: 20000,
            TOOLBAR_TIMEOUT: 4000,
            TOOLBAR_ALWAYS_VISIBLE: false,
            DEFAULT_BACKGROUND: '#040404',
            DISABLE_FOCUS_INDICATOR: false,
            DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
            DISABLE_TRANSCRIPTION_SUBTITLES: false,
            DISABLE_RINGING: false,
            AUDIO_LEVEL_PRIMARY_COLOR: 'rgba(255,255,255,0.4)',
            AUDIO_LEVEL_SECONDARY_COLOR: 'rgba(255,255,255,0.2)',
            POLICY_LOGO: null,
            LOCAL_THUMBNAIL_RATIO: 16 / 9,
            REMOTE_THUMBNAIL_RATIO: 1,
            // Mobile specific
            MOBILE_APP_PROMO: false,
            MAXIMUM_ZOOMING_COEFFICIENT: 1.3,
            // Hide elements
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar', 'sounds', 'more'],
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting',
                'fullscreen', 'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'select-background', 'download', 'help', 'mute-everyone', 'security'
            ]
        },
        // Events we want to listen to
        listeners: {}
    }
};

// Helper function to generate room names
export const generateRoomName = (requestId, userId1, userId2) => {
    // Create a unique room name based on request ID and user IDs
    const roomName = `StudentConnect_${requestId}_${userId1}_${userId2}`;
    return roomName.replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters
};

// Helper function to get meeting URL
export const getMeetingUrl = (roomName) => {
    return `https://${jitsiConfig.domain}/${roomName}`;
};

// User info configuration
export const getUserConfig = (user) => ({
    displayName: user.displayName || user.name || 'Student',
    email: user.email || '',
    avatarURL: user.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Student')}&background=3b82f6&color=fff`
});

export default jitsiConfig;