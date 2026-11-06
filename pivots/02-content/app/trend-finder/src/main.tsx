import { applyTheme, readTheme } from './lib/theme'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { installGuidedRuntime } from './lib/guided/runtime'
import { MethodPage } from './components/MethodPage'
import { SharedReviewPage } from './components/SharedReviewPage'
import { reviewTokenFromPath } from './lib/share'

// The static "how we calculate" note opens at /method, outside the app shell.
const isMethod = window.location.pathname === '/method'
// The approver's link, /review/<token>, opens a page of its own: no sign-in, no sidebar.
const reviewToken = reviewTokenFromPath(window.location.pathname)

async function mount() {
  if (new URLSearchParams(window.location.search).has('guided')) {
    const { createFreshSixData } = await import('./lib/guided/freshSix')
    const full = new URLSearchParams(window.location.search).get('cut') === 'full21'
    installGuidedRuntime(full ? (local, session) => createFreshSixData(local, session, Date.now, true) : createFreshSixData, window, full ? 'full-ai-six-v1:' : 'fresh-six-v1:')
  }
  applyTheme(readTheme())
  // App modules may cache storage, so load them after guided isolation is installed.
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isMethod ? <MethodPage /> : reviewToken ? <SharedReviewPage token={reviewToken} /> : <App />}
    </StrictMode>,
  )
}
void mount().catch(() => {
  const root = document.getElementById('root')!
  root.textContent = 'The prepared demo could not start. Reload to retry, or return to the homepage.'
  const home = document.createElement('a')
  home.href = '/'
  home.textContent = 'Return home'
  root.append(document.createElement('br'), home)
})
