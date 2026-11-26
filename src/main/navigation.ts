export function isAllowedAppUrl(url: string, appOrigin: string): boolean {
  try {
    const parsed = new URL(url)
    const allowed = new URL(appOrigin)
    return parsed.protocol === allowed.protocol && parsed.host === allowed.host
  } catch {
    return false
  }
}

export function isSystemLink(url: string): boolean {
  try {
    const protocol = new URL(url).protocol
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:'
  } catch {
    return false
  }
}

export function windowSecurityOptions(): {
  contextIsolation: true
  nodeIntegration: false
  sandbox: true
  webSecurity: true
} {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true
  }
}
