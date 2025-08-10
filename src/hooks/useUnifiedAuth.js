// src/hooks/useUnifiedAuth.js
import { useAuth } from '@/hooks/useAuth';

/**
 * ✅ UNIFIED AUTH HOOK
 *
 * This hook ensures consistent user object structure across all components.
 * It wraps the main useAuth hook and guarantees that user.id is always available
 * and consistent, preventing the uid vs id conflicts we identified.
 */
export const useUnifiedAuth = () => {
    const { user, isAuthenticated, loading, logout, forceLogout } = useAuth();

    // ✅ Ensure consistent user object structure
    const unifiedUser = user ? {
        // PRIMARY ID - use this everywhere for consistency
        id: user.id,
        uid: user.id,  // Alias for backward compatibility with components using user.uid

        // Standard user properties
        email: user.email,
        name: user.name,
        displayName: user.name || user.displayName,
        photoURL: user.photoURL,

        // Timestamps (if available)
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,

        // Additional properties passed through
        ...user
    } : null;

    // ✅ Helper function to verify user is authenticated
    const requireAuth = (action = 'perform this action') => {
        if (!unifiedUser?.id) {
            throw new Error(`You must be logged in to ${action}`);
        }
        return unifiedUser.id;
    };

    // ✅ Helper function to get user ID safely
    const getUserId = () => {
        return unifiedUser?.id || null;
    };

    // ✅ Helper function to check if user is authenticated
    const isUserAuthenticated = () => {
        return Boolean(unifiedUser?.id && isAuthenticated);
    };

    return {
        user: unifiedUser,
        isAuthenticated: isUserAuthenticated(),
        loading,
        logout,
        forceLogout,

        // Helper functions
        requireAuth,
        getUserId,
        isUserAuthenticated
    };
};

/**
 * ✅ GROUP REQUEST VOTING HOOK
 *
 * Specialized hook for group request voting that ensures proper authentication
 * and provides safe methods for voting operations.
 */
export const useGroupRequestVoting = () => {
    const { user, requireAuth, isUserAuthenticated } = useUnifiedAuth();

    // ✅ Check if user can vote on a request (basic client-side check)
    const canUserVoteBasic = (request) => {
        if (!isUserAuthenticated()) {
            return { canVote: false, reason: 'Not authenticated' };
        }

        const isOwner = request.createdBy === user.id || request.userId === user.id;
        if (isOwner) {
            return { canVote: false, reason: 'Cannot vote on own request' };
        }

        const hasVoted = request.votes?.includes(user.id);
        if (hasVoted) {
            return { canVote: false, reason: 'Already voted' };
        }

        if (!['pending', 'voting_open'].includes(request.status)) {
            return { canVote: false, reason: 'Voting not allowed in current status' };
        }

        return { canVote: true, reason: 'Can vote' };
    };

    // ✅ Check if user can participate in a request (basic client-side check)
    const canUserParticipateBasic = (request) => {
        if (!isUserAuthenticated()) {
            return { canParticipate: false, reason: 'Not authenticated' };
        }

        const isParticipating = request.participants?.includes(user.id);
        if (isParticipating) {
            return { canParticipate: false, reason: 'Already participating' };
        }

        if (request.status !== 'voting_open') {
            return { canParticipate: false, reason: 'Participation not allowed in current status' };
        }

        return { canParticipate: true, reason: 'Can participate' };
    };

    // ✅ Check if user can pay for a request (basic client-side check)
    const canUserPayBasic = (request) => {
        if (!isUserAuthenticated()) {
            return { canPay: false, reason: 'Not authenticated' };
        }

        const isParticipating = request.participants?.includes(user.id);
        if (!isParticipating) {
            return { canPay: false, reason: 'Must be participant to pay' };
        }

        const hasPaid = request.paidParticipants?.includes(user.id);
        if (hasPaid) {
            return { canPay: false, reason: 'Already paid' };
        }

        if (request.status !== 'accepted') {
            return { canPay: false, reason: 'Payment not allowed in current status' };
        }

        return { canPay: true, reason: 'Can pay' };
    };

    // ✅ Get user's relationship to a request
    const getUserRequestStatus = (request) => {
        if (!isUserAuthenticated()) {
            return {
                isOwner: false,
                hasVoted: false,
                isParticipating: false,
                hasPaid: false,
                canVote: false,
                canParticipate: false,
                canPay: false
            };
        }

        const isOwner = request.createdBy === user.id || request.userId === user.id;
        const hasVoted = request.votes?.includes(user.id) || false;
        const isParticipating = request.participants?.includes(user.id) || false;
        const hasPaid = request.paidParticipants?.includes(user.id) || false;

        const voteCheck = canUserVoteBasic(request);
        const participateCheck = canUserParticipateBasic(request);
        const payCheck = canUserPayBasic(request);

        return {
            isOwner,
            hasVoted,
            isParticipating,
            hasPaid,
            canVote: voteCheck.canVote,
            canParticipate: participateCheck.canParticipate,
            canPay: payCheck.canPay,
            voteReason: voteCheck.reason,
            participateReason: participateCheck.reason,
            payReason: payCheck.reason
        };
    };

    return {
        user,
        isAuthenticated: isUserAuthenticated(),
        requireAuth,
        canUserVoteBasic,
        canUserParticipateBasic,
        canUserPayBasic,
        getUserRequestStatus
    };
};

// ✅ Export the main hook as default for easy importing
export default useUnifiedAuth;