import type { Key } from './i18n.ts'

// What the viewer feels in the first two seconds of a hook. One list of eight (design review:
// docs/design-review/hook-emotion-options/option-c-refined.html). Each has its own colour token pair in
// theme-remake.css (--emo-<key>-bg / --emo-<key>-fg) and its own name in strings/plan.ts.
export const HOOK_EMOTIONS = ['curiosity', 'surprise', 'relief', 'insider', 'humour', 'desire', 'recognition', 'alarm'] as const
export type HookEmotion = (typeof HOOK_EMOTIONS)[number]

export const isHookEmotion = (x: unknown): x is HookEmotion =>
  typeof x === 'string' && (HOOK_EMOTIONS as readonly string[]).includes(x)

export const emotionKey = (e: HookEmotion): Key => `plan.hooks.emotion.${e}`

// Hook-pattern rules, checked in order: the first match wins. Specific phrases come before the broad ones
// ("you won't believe" is Surprise, not Alarm; "no press needed" is Relief, not Curiosity). English and
// Traditional Chinese, since the sample hooks are written in the screen's language.
const APOS = "['’]"
const RULES: [HookEmotion, RegExp][] = [
  ['surprise', new RegExp(`wait for it|you won${APOS}?t believe|plot twist|never guess|didn${APOS}?t expect|no way|等等|沒想到|你不會相信|結局`, 'i')],
  ['insider', new RegExp(`no ?(one|body) tells you|nobody talks about|secret|won${APOS}?t tell|don${APOS}?t want you to know|insider|only .{1,20} know|沒人告訴你|沒有人告訴你|秘密|祕密|內行|不會告訴你`, 'i')],
  ['relief', new RegExp(`\\bno \\S+( \\S+)? needed|don${APOS}?t need|\\bwithout\\b|\\bfinally\\b|\\bfix(es|ed)?\\b|start to finish|step[- ]by[- ]step|\\bthe whole\\b|不用|不需要|終於|從頭到尾|一步步|一步一步|搞定`, 'i')],
  ['alarm', new RegExp(`\\bstop\\b|\\bnever\\b|mistake|\\bdon${APOS}?t\\b|\\bwrong\\b|\\bavoid\\b|warning|別再|不要|千萬|做錯|錯誤|小心`, 'i')],
  ['recognition', new RegExp(`\\bpov\\b|\\bwhen you\\b|\\b(us|me) when\\b|tell me you|that feeling when|當你|我們.{0,12}的時候`, 'i')],
  ['desire', new RegExp(`\\bdream|\\bwant\\b|crav(e|ing)|obsessed|好想|想要|夢想|嘴饞|著迷`, 'i')],
  ['humour', new RegExp(`\\blol\\b|\\bjoke|\\bfunny\\b|哈哈|笑死|好笑`, 'i')],
  ['curiosity', new RegExp(`did you know|^how\\b|\\bhow (to|i|we|they|this)\\b|\\bwhy\\b|what if|\\?|？|你知道|怎麼|為什麼|嗎`, 'i')],
]

// Classify a hook's words into one of the eight. Nothing matched: Curiosity, the usual job of a hook.
export function classifyHookEmotion(text: string): HookEmotion {
  const x = (text ?? '').trim()
  for (const [emotion, re] of RULES) if (re.test(x)) return emotion
  return 'curiosity'
}

// The emotion a hook shows: its own `emotion` when it carries a valid one (the backend can send it later),
// else the rules above.
export function hookEmotion(hook: { text: string; emotion?: string }): HookEmotion {
  return isHookEmotion(hook.emotion) ? hook.emotion : classifyHookEmotion(hook.text)
}
