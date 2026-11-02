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
  const visit = (node) => {
    if (ts.isJsxText(node) && HAS_LETTER.test(node.text)) at(node, `JSX text "${node.text.trim()}"`)
    if (ts.isJsxAttribute(node) && COPY_ATTRS.has(node.name.getText(source)) && node.initializer) {
      const init = node.initializer
      if (isWords(init)) at(node, `${node.name.getText(source)}="${init.text}"`)
      if (ts.isJsxExpression(init) && init.expression && isWords(init.expression)) at(node, `${node.name.getText(source)}={'${init.expression.text}'}`)
    }
    if (ts.isJsxExpression(node) && node.expression && isWords(node.expression) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      at(node, `JSX string {'${node.expression.text}'}`)
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

test('export progress words are translated', () => {
  try {
    setActiveLang('zh-Hant')
    for (const word of ['Exporting', 'Waiting to start']) assert.match(serverText(word), /[一-鿿]/)
  } finally {
    setActiveLang('en')
  }
})
