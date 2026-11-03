export const DRAWER_KEY = 'remake.canvas.drawer'

const MIN = 280
const PHONE = 860 // at or below this the drawer stacks under the canvas and takes the full width

export function clampDrawerWidth(px: number, viewport: number): number {
  if (viewport <= PHONE) return viewport
  return Math.round(Math.min(Math.max(px, MIN), viewport * 0.7))
}

export const defaultDrawerWidth = (viewport: number): number => clampDrawerWidth(viewport * 0.4, viewport)

type Store = Pick<Storage, 'getItem' | 'setItem'>
export interface DrawerState {
  open: boolean
  width: number | null // null: never resized, use the default
}

function defaultStore(): Store | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readDrawer(store: Partial<Store> | null = defaultStore()): DrawerState {
  try {
    const v = JSON.parse(store?.getItem?.(DRAWER_KEY) ?? 'null')
    return { open: v?.open === true, width: typeof v?.width === 'number' && Number.isFinite(v.width) ? v.width : null }
  } catch {
    return { open: false, width: null }
  }
}

export function writeDrawer(state: { open: boolean; width: number }, store: Partial<Store> | null = defaultStore()): void {
  try {
    store?.setItem?.(DRAWER_KEY, JSON.stringify(state))
  } catch {
    /* private window or blocked storage: the drawer just won't be remembered */
  }
}
