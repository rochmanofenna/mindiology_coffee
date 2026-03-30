// constants/config.ts — Feature flags and app configuration

export const CONFIG = {
  // Flip to true when ESB order submission is unblocked
  // Requires: encryptedVisitPurpose generation + POS outlet online
  REAL_ORDERS_ENABLED: true,

  // Simulated order delay in ms (staging only)
  SIMULATED_ORDER_DELAY: 1500,

  // ESB environment
  ESB_ENV: 'staging' as 'staging' | 'production',
} as const;
