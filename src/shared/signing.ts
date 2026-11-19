const APPLE_SECRET_NAMES = [
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
  'CSC_LINK',
  'CSC_KEY_PASSWORD'
] as const

export function signingEnabled(env: Record<string, string | undefined>): boolean {
  return APPLE_SECRET_NAMES.every((name) => (env[name] ?? '').trim().length > 0)
}
