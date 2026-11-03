// Entry for the Remotion bundler only. The Vite app must not import this file: registerRoot has side effects.
import { registerRoot } from 'remotion'
import { Root } from './Root.tsx'

registerRoot(Root)
