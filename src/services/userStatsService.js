import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export const userStatsService = {
  /**
   * Get comprehensive user statistics for dashboard
   */
  async getUserDashboardStats(userId) {
    try {
      console.log('📊 Fetching comprehensive dashboard stats for user:', userId);

      // Fetch all stats in parallel for better performance
      const [
        requestStats,
        groupStats,
        responseStats,
        activityStats,
        connectionStats
      ] = await Promise.all([
        this.getRequestStats(userId),
        this.getGroupStats(userId),
        this.getResponseStats(userId),
        this.getActivityStats(userId),
        this.getConnectionStats(userId)
      ]);

      const comprehensiveStats = {
        // Request Statistics
        requests: {
          total: requestStats.total,
          draft: requestStats.draft,
          active: requestStats.active,
          completed: requestStats.completed,
          archived: requestStats.archived,
          cancelled: requestStats.cancelled
        },

        // Group Statistics
        groups: {
          joined: groupStats.joined,
          created: groupStats.created,
          participating: groupStats.participating,
          total: groupStats.total
        },

        // Response Statistics
        responses: {
          total: responseStats.total,
          accepted: responseStats.accepted,
          pending: responseStats.pending,
          declined: responseStats.declined
        },

        // Activity Statistics
        activities: {
          total: activityStats.total,
          thisWeek: activityStats.thisWeek,
          thisMonth: activityStats.thisMonth
        },

        // Connection Statistics
        connections: {
          total: connectionStats.total,
          mutual: connectionStats.mutual,
          pending: connectionStats.pending
        },

        // Calculated Statistics
        calculated: {
          successRate: requestStats.total > 0 ? 
            Math.round((requestStats.completed / requestStats.total) * 100) : 0,
          responseRate: responseStats.total > 0 ? 
            Math.round((responseStats.accepted / responseStats.total) * 100) : 0,
          activeGroups: groupStats.participating,
          totalSessions: requestStats.completed + responseStats.accepted
        }
      };

      console.log('✅ Comprehensive dashboard stats:', comprehensiveStats);
      return comprehensiveStats;

    } catch (error) {
      console.error('❌ Error fetching comprehensive dashboard stats:', error);
      return this.getFallbackStats();
    }
  },

  /**
   * Get request statistics
   */
  async getRequestStats(userId) {
    try {
      const requestsRef = collection(db, 'requests');
      const userRequestsQuery = query(
        requestsRef,
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(userRequestsQuery);
      const stats = {
        total: 0,
        draft: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        archived: 0
      };

      snapshot.forEach((doc) => {
        const status = doc.data().status;
        stats.total++;
        if (stats[status] !== undefined) {
          stats[status]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting request stats:', error);
      return { total: 0, draft: 0, active: 0, completed: 0, cancelled: 0, archived: 0 };
    }
  },

  /**
   * Get group statistics
   */
  async getGroupStats(userId) {
    try {
      const groupsRef = collection(db, 'groups');
      const userGroupsQuery = query(
        groupsRef,
        where('members', 'array-contains', userId)
      );

      const snapshot = await getDocs(userGroupsQuery);
      const stats = {
        joined: snapshot.size,
        created: 0,
        participating: 0,
        total: snapshot.size
      };

      // Count groups created by user
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdBy === userId) {
          stats.created++;
        }
        if (data.members?.includes(userId)) {
          stats.participating++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting group stats:', error);
      return { joined: 0, created: 0, participating: 0, total: 0 };
    }
  },

  /**
   * Get response statistics
   */
  async getResponseStats(userId) {
    try {
      const responsesRef = collection(db, 'requestResponses');
      const userResponsesQuery = query(
        responsesRef,
        where('responderId', '==', userId)
      );

      const snapshot = await getDocs(userResponsesQuery);
      const stats = {
        total: 0,
        accepted: 0,
        pending: 0,
        declined: 0
      };

      snapshot.forEach((doc) => {
        const status = doc.data().status;
        stats.total++;
        if (stats[status] !== undefined) {
          stats[status]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting response stats:', error);
      return { total: 0, accepted: 0, pending: 0, declined: 0 };
    }
  },

  /**
   * Get activity statistics
   */
  async getActivityStats(userId) {
    try {
      const activitiesRef = collection(db, 'activities');
      const userActivitiesQuery = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(userActivitiesQuery);
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        total: snapshot.size,
        thisWeek: 0,
        thisMonth: 0
      };

      snapshot.forEach((doc) => {
        const timestamp = doc.data().timestamp?.toDate() || new Date();
        if (timestamp >= oneWeekAgo) {
          stats.thisWeek++;
        }
        if (timestamp >= oneMonthAgo) {
          stats.thisMonth++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting activity stats:', error);
      return { total: 0, thisWeek: 0, thisMonth: 0 };
    }
  },

  /**
   * Get connection statistics
   */
  async getConnectionStats(userId) {
    try {
      // This would depend on your connections data structure
      // For now, returning mock data structure
      const stats = {
        total: 0,
        mutual: 0,
        pending: 0
      };

      // TODO: Implement actual connection counting logic
      // This would typically involve checking a connections collection
      // or user profile data for connection information

      return stats;
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return { total: 0, mutual: 0, pending: 0 };
    }
  },

  /**
   * Get fallback statistics when database queries fail
   */
  getFallbackStats() {
    return {
      requests: { total: 0, draft: 0, active: 0, completed: 0, archived: 0, cancelled: 0 },
      groups: { joined: 0, created: 0, participating: 0, total: 0 },
      responses: { total: 0, accepted: 0, pending: 0, declined: 0 },
      activities: { total: 0, thisWeek: 0, thisMonth: 0 },
      connections: { total: 0, mutual: 0, pending: 0 },
      calculated: { successRate: 0, responseRate: 0, activeGroups: 0, totalSessions: 0 }
    };
  },

  /**
   * Get real-time statistics updates
   */
  subscribeToUserStats(userId, callback) {
    if (!userId) return () => {};

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      async () => {
        try {
          const stats = await this.getUserDashboardStats(userId);
          callback(stats);
        } catch (error) {
          console.error('Error in real-time stats subscription:', error);
          callback(this.getFallbackStats());
        }
      },
      (error) => {
        console.error('Error in real-time stats subscription:', error);
        callback(this.getFallbackStats());
      }
    );

    return unsubscribe;
  }
};
