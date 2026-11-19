import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('release contract', () => {
  it('builds both mac arches without the Orca identity', () => {
    const builder = readFileSync('electron-builder.yml', 'utf8')
    const workflow = readFileSync('.github/workflows/macos-release.yml', 'utf8')
    const readme = readFileSync('README.md', 'utf8')
    const entitlements = readFileSync('entitlements.mac.plist', 'utf8')
    expect(builder).toContain('appId: app.leafnote.macos')
    expect(builder).toContain('LeafNote-macos-arm64')
    expect(builder).toContain('LeafNote-macos-x64')
    expect(builder).not.toContain('6CX3WHS9HZ')
    expect(workflow).toContain('arch: [arm64, x64]')
    expect(workflow).toContain('workflow_dispatch')
    expect(entitlements).toContain('com.apple.security.cs.allow-jit')
    expect(entitlements).not.toContain('camera')
    expect(readme).toContain('Gatekeeper')
    expect(readme).toContain('未签名')
  })

  it('does not embed the upstream bundle id or product name', () => {
    const builder = readFileSync('electron-builder.yml', 'utf8')
    const workflow = readFileSync('.github/workflows/macos-release.yml', 'utf8')
    const joined = `${builder}\n${workflow}\n${readFileSync('package.json', 'utf8')}`
    expect(joined).not.toContain('com.yongwuzhijin.dmonwork')
    expect(joined).not.toContain('DmonWork')
    expect(joined).not.toContain('6CX3WHS9HZ')
  })
})
