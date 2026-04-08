// constants/config.ts — Feature flags and app configuration

// Determine environment from Expo env var or default to staging
const ENV = (process.env.EXPO_PUBLIC_ENV || 'staging') as 'staging' | 'production';

const ENV_CONFIG = {
  staging: {
    ESB_COMPANY_CODE: 'SAE',
    ESB_DEFAULT_BRANCH: 'MDOUT',
    ESB_BASE_URL: 'https://stg7.esb.co.id/api-ezo/web',
    API_BASE_URL: 'https://api-staging.kamarasan.app',
  },
  production: {
    ESB_COMPANY_CODE: 'MBLA',
    ESB_DEFAULT_BRANCH: 'MCE',
    ESB_BASE_URL: 'https://eso-api.esb.co.id',
    API_BASE_URL: 'https://api.kamarasan.app',
  },
};

export const CONFIG = {
  // Current environment
  ENV,
  ...ENV_CONFIG[ENV],

  // Flip to true when ESB order submission is unblocked
  REAL_ORDERS_ENABLED: true,

  // Simulated order delay in ms (staging only)
  SIMULATED_ORDER_DELAY: 1500,

  // ESB environment — matches ENV
  ESB_ENV: ENV,

  // Google Places API key (restrict to bundle ID in Google Console)
  GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || '',
} as const;
