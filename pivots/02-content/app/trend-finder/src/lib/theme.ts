export type ThemeChoice = 'light' | 'dark'

export const THEME_KEY = 'remake.theme'
export const THEME_CHOICES: ThemeChoice[] = ['light', 'dark']

// Missing, legacy system and invalid choices default to Light.
export function parseTheme(raw: unknown): ThemeChoice {
  return raw === 'light' || raw === 'dark' ? raw : 'light'
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): Store | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readTheme(store: Store | null = defaultStore()): ThemeChoice {
  try {
    return parseTheme(store?.getItem(THEME_KEY))
  } catch {
    return 'light'
  }
}

export function writeTheme(choice: ThemeChoice, store: Store | null = defaultStore()): void {
  try {
    store?.setItem(THEME_KEY, choice)
  } catch {
    /* private window or blocked storage: the choice just won't persist */
  }
}

// Always set an explicit theme so the OS cannot override the selected appearance.
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-theme', choice)
}
