export const ROUTES = {
  AUTH: {
    ROOT: 'auth',
    REGISTER: 'register',
    LOGIN: 'login',
  },
  PROFILE: {
    ROOT: 'profile',
    ME: 'me',
    LIST: 'list',
    COMPLETE: 'complete',
    PARTNER_PREFERENCE: 'partner-preference',
  },
  FAVOURITES: {
    ROOT: 'favourites',
    ID: ':targetUserId',
    LIST: 'list',
  },
  CHAT: {
    ROOT: 'chats',
    ID: ':conversationId',
    MESSAGES: 'messages',
    READ: 'read',
    WITH_USER: 'with',
  },
  NOTIFICATIONS: {
    ROOT: 'notifications',
    ID: ':id',
    READ: 'read',
    MARK_ALL_READ: 'read-all',
  },
  MATCHES: {
    ROOT: 'matches',
    ID: ':id',
    SEEN: 'seen',
    SEEN_ALL: 'seen-all',
    RUN_JOB: 'run-job',
  },
} as const;
