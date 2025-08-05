// src/firebase/collections/index.js
// Export all collection services for easy importing

// Existing services
export { UserCollectionService, COLLECTIONS, USER_TEMPLATE } from '@services/user.js';
export {
  UserActivityService,
  ConnectionsService,
  ACTIVITY_TYPES,
  CONNECTION_TYPES,
  CONNECTION_STATUS
} from './userActivityAndConnections.js';

// Request services
export {
  RequestsService,
  REQUEST_STATUS,
  REQUEST_TYPES,
  REQUEST_TEMPLATE
} from './requests.js';

// New chat services
export { GroupsService, GROUP_CATEGORIES, GROUP_TEMPLATE } from './groups.js';
export {
  MessagesService,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  MESSAGE_TEMPLATE
} from './messages.js';
export { ChatPresenceService } from './chatPresence.js';