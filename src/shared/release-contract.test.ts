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

  it('keeps electron in devDependencies so unsigned packaging can start', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    expect(pkg.dependencies.electron).toBeUndefined()
    expect(pkg.devDependencies.electron).toBe('43.7.5')
  })

  it('uses the supplied macOS icon instead of the Electron default', () => {
    const builder = readFileSync('electron-builder.yml', 'utf8')
    const icon = readFileSync('build/icon.png')
    expect(builder).toContain('icon: build/icon.png')
    expect(icon.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    expect(icon.readUInt32BE(16)).toBe(1024)
    expect(icon.readUInt32BE(20)).toBe(1024)
  })

  it('does not ship a screenshot debugger in the main process', () => {
    const main = readFileSync('src/main/index.ts', 'utf8')
    expect(main).not.toContain('LEAFNOTE_SCREENSHOT')
    expect(main).not.toContain('debugger.attach')
    expect(main).not.toContain('executeJavaScript')
  })
})
