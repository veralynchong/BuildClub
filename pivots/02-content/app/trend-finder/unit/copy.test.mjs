import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { setActiveLang } from '../src/lib/i18n.ts'
import { serverText } from '../src/lib/serverText.ts'

const root = new URL('..', import.meta.url).pathname

function tsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return tsxFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

const HAS_LETTER = /[A-Za-z一-鿿]/
const COPY_ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label'])

// Every spot in the file's JSX that holds words the user reads but not through t().
function copyIn(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = []
  const at = (node, what) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
    found.push(`${relative(root, file)}:${line + 1} ${what}`)
  }
  const isWords = (n) => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && HAS_LETTER.test(n.text)
  // Words hiding in an expression: a template's fixed parts, or a string branch of ?: / && / || / ??.
  // Two or more letters in a row counts as a word, so a one-letter unit like `v${n}` is fine.
  const WORD = /[A-Za-z]{2}|[一-鿿]/
  const wordsIn = (n) => {
    if (ts.isParenthesizedExpression(n)) return wordsIn(n.expression)
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return WORD.test(n.text)
    if (ts.isTemplateExpression(n)) return WORD.test(n.head.text) || n.templateSpans.some((s) => WORD.test(s.literal.text))
    if (ts.isConditionalExpression(n)) return wordsIn(n.whenTrue) || wordsIn(n.whenFalse)
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) {
      return wordsIn(n.right) || (n.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken && wordsIn(n.left))
    }
    return false
  }
  const visit = (node) => {
    if (ts.isJsxText(node) && HAS_LETTER.test(node.text)) at(node, `JSX text "${node.text.trim()}"`)
    if (ts.isJsxAttribute(node) && COPY_ATTRS.has(node.name.getText(source)) && node.initializer) {
      const init = node.initializer
      if (isWords(init)) at(node, `${node.name.getText(source)}="${init.text}"`)
      if (ts.isJsxExpression(init) && init.expression && wordsIn(init.expression)) at(node, `${node.name.getText(source)}={${init.expression.getText(source)}}`)
    }
    if (ts.isJsxExpression(node) && node.expression && wordsIn(node.expression) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      at(node, `JSX expression {${node.expression.getText(source)}}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

const literalCopy = (file) => copyIn(file, readFileSync(file, 'utf8'))

test('canvas, editor and the plan cut panel have no literal copy', () => {
  const files = [
    ...tsxFiles(join(root, 'src/components/canvas')),
    ...tsxFiles(join(root, 'src/components/editor')),
    join(root, 'src/components/CutPanel.tsx'),
  ]
  assert.ok(files.length > 10, 'the scan should find the canvas and editor components')
  const found = files.flatMap(literalCopy)
  assert.deepEqual(found, [], `words in the JSX that skip t():\n${found.join('\n')}`)
})

test('the scan flags each kind of literal copy and passes t() calls', () => {
  const count = (jsx) => copyIn('probe.tsx', `const a = ${jsx}`).length
  assert.equal(count('<p>Hello</p>'), 1)
  assert.equal(count('<p>你好</p>'), 1)
  assert.equal(count('<button aria-label="Close" />'), 1)
  assert.equal(count("<input placeholder={'Name'} />"), 1)
  assert.equal(count("<p>{'Hello'}</p>"), 1)
  assert.equal(count('<p>{`Final ${x}`}</p>'), 1)
  assert.equal(count("<p>{c ? 'Yes' : t('no')}</p>"), 1)
  assert.equal(count("<p>{c && 'Done'}</p>"), 1)
  assert.equal(count('<b title={`Close ${n}`} />'), 1)
  assert.equal(count('<b>{`v${n}`}</b>'), 0)
  assert.equal(count("<p title={t('x')}>{t('y')} · {n}</p>"), 0)
  assert.equal(count('<img alt="" className="cv-x" />'), 0)
})

const editingSource = readFileSync(join(root, 'backend/editing.py'), 'utf8')
const missingSource = editingSource.match(/^MISSING_SOURCE = "(.*)"$/m)[1]

test('serverText translates known sentences and keeps unknown ones', () => {
  try {
    setActiveLang('zh-Hant')
    assert.match(serverText(missingSource), /[一-鿿]/)
    const longTake = serverText("This take is longer than 3 minutes, so it can't be cleaned.")
    assert.match(longTake, /3/)
    assert.match(longTake, /[一-鿿]/)
    assert.equal(serverText('Something new happened.'), 'Something new happened.')
    assert.equal(serverText(null), '')
    assert.equal(serverText(undefined), '')
    setActiveLang('en')
    assert.equal(serverText(missingSource), missingSource)
    assert.equal(serverText("This take is longer than 3 minutes, so it can't be cleaned."), "This take is longer than 3 minutes, so it can't be cleaned.")
  } finally {
    setActiveLang('en')
  }
})

test('serverText picks the most specific template', () => {
  try {
    setActiveLang('zh-Hant')
    assert.match(serverText('The export failed: out of memory'), /^出片失敗：out of memory$/)
    assert.match(serverText('Finding the words failed: bad model'), /^找逐字稿失敗：bad model$/)
    assert.match(serverText('ffmpeg failed: boom'), /^ffmpeg 失敗：boom$/)
  } finally {
    setActiveLang('en')
  }
})

test('serverText translates the fixed words inside templated sentences', () => {
  try {
    setActiveLang('zh-Hant')
    assert.equal(serverText('This model needs a start frame.'), '這個模型需要 起始畫面。')
    assert.equal(serverText("This model doesn't take a reference image."), '這個模型不接受 參考圖。')
    const wallet = serverText("Today's video generation budget has US$1.50 left, and this needs US$2.00. The budget resets at midnight; to allow more, raise DAILY_GEN_VIDEO_USD in .env and restart the API.")
    assert.match(wallet, /影片/)
    assert.match(wallet, /1\.50/)
    assert.match(wallet, /DAILY_GEN_VIDEO_USD/)
    assert.equal(serverText('The export failed: constructor'), '出片失敗：constructor')
  } finally {
    setActiveLang('en')
  }
})

test('export progress words are translated', () => {
  try {
    setActiveLang('zh-Hant')
    for (const word of ['Exporting', 'Waiting to start']) assert.match(serverText(word), /[一-鿿]/)
  } finally {
    setActiveLang('en')
  }
})
