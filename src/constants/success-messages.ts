export const SUCCESS_MESSAGES = {
  AUTH: {
    REGISTER: 'Registration successful',
    LOGIN: 'Login successful',
  },
  PROFILE: {
    COMPLETE: 'Profile completed successfully',
    PARTNER_PREFERENCE: 'Partner preference saved successfully',
  },
  MATCHES: {
    NEW_MATCH_TITLE: 'We have found a new match for you',
    NEW_MATCH_BODY: (name: string) => `${name} matches your preferences. Tap to view.`,
    LIKED_BACK_TITLE: (name: string) => `${name} liked you back!`,
    LIKED_BACK_BODY: "You're now a match. Tap to say hi.",
  },
} as const;
