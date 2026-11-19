import { appendFileSync } from 'node:fs'

const keys = [
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
  'CSC_LINK',
  'CSC_KEY_PASSWORD'
]
const enabled = keys.every((key) => (process.env[key] ?? '').trim() !== '')
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `sign=${enabled ? 'true' : 'false'}\n`)
}
if (!enabled) {
  console.log('未签名，其他 Mac 上通常会被 Gatekeeper 拦截，接收者需要明确同意才能打开')
}
console.log(enabled ? 'signing=enabled' : 'signing=disabled')
