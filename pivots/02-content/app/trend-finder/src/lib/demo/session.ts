export type DemoStepId = 'research' | 'breakdown' | 'script' | 'route' | 'canvas' | 'edit' | 'result'
export type DemoRoute = 'shoot' | 'ai'

export type DemoSession = {
  version: 1
  active: boolean
  stepId: DemoStepId
  route: DemoRoute | null
  revealedAssetIds: string[]
}

export const DEMO_SESSION_STORAGE_KEY = 'buildclub:demo:session:v1'
export const DEMO_STEP_IDS: readonly DemoStepId[] = ['research', 'breakdown', 'script', 'route', 'canvas', 'edit', 'result']

export function createDemoSession(): DemoSession {
  return { version: 1, active: true, stepId: 'research', route: null, revealedAssetIds: [] }
}

export function nextDemo(session: DemoSession): DemoSession {
  if (!session.active || (session.stepId === 'route' && session.route === null)) return session
  const index = DEMO_STEP_IDS.indexOf(session.stepId)
  return { ...session, stepId: DEMO_STEP_IDS[Math.min(index + 1, DEMO_STEP_IDS.length - 1)] }
}

export function previousDemo(session: DemoSession): DemoSession {
  if (!session.active) return session
  return { ...session, stepId: DEMO_STEP_IDS[Math.max(0, DEMO_STEP_IDS.indexOf(session.stepId) - 1)] }
}

export function chooseDemoRoute(session: DemoSession, route: DemoRoute): DemoSession {
  return { ...session, route }
}

export function resetDemoSession(_session?: DemoSession): DemoSession {
  void _session
  return createDemoSession()
}

export function exitDemoSession(session: DemoSession): DemoSession {
  return { ...session, active: false }
}

export function parseDemoSession(raw: string | null): DemoSession | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const { version, active, stepId, route, revealedAssetIds } = value as Record<string, unknown>
    if (version !== 1 || typeof active !== 'boolean' ||
      !DEMO_STEP_IDS.includes(stepId as DemoStepId) ||
      (route !== null && route !== 'shoot' && route !== 'ai') ||
      !Array.isArray(revealedAssetIds) ||
      !revealedAssetIds.every(id => typeof id === 'string' && id.trim().length > 0)) return null
    if (route === null && ['canvas', 'edit', 'result'].includes(stepId as string)) return null
    return { version, active, stepId: stepId as DemoStepId, route, revealedAssetIds: [...revealedAssetIds] }
  } catch {
    return null
  }
}
