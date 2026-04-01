/**
 * Test mode flag — gated entirely behind an environment variable.
 * Any test/dev shortcuts MUST check this flag before activating.
 * This value is false in production (env var is unset or not "true").
 */
export const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";
