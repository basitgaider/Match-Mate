export const ERROR_MESSAGES = {
  AUTH: {
    EMAIL_ALREADY_REGISTERED: 'Email already registered',
    INVALID_CREDENTIALS: 'Invalid email or password',
  },
  PROFILE: {
    MAX_AGE_LESS_THAN_MIN: 'maxAge must be greater than or equal to minAge',
    PARTNER_PREFERENCE_EXISTS: 'Partner preference already exists for this user',
    PROFILE_NOT_FOUND: 'Profile not found',
  },
  CHAT: {
    CONVERSATION_NOT_FOUND: 'Conversation not found',
    NOT_PARTICIPANT: 'You are not a participant in this conversation',
    USER_NOT_FOUND: 'User not found',
  },
  NOTIFICATIONS: {
    NOT_FOUND: 'Notification not found',
  },
  MATCHES: {
    NOT_FOUND: 'Match not found',
  },
  FAVOURITES: {
    CANNOT_FAVOURITE_SELF: 'You cannot favourite your own profile',
    ALREADY_FAVOURITED: 'Profile already in favourites',
    NOT_IN_FAVOURITES: 'Profile is not in your favourites',
    TARGET_USER_NOT_FOUND: 'User not found',
  },
  ENV: {
    JWT_SECRET_REQUIRED: 'JWT_SECRET must be set in environment',
    JWT_SECRET_NOT_SET: 'JWT_SECRET is not set in environment',
    DATABASE_URL_REQUIRED: 'DATABASE_URL is not set in environment',
  },
} as const;
