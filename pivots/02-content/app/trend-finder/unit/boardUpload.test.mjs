import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { areas } from '../src/lib/i18n.ts'

const board = readFileSync(fileURLToPath(new URL('../src/components/board/ShotBoard.tsx', import.meta.url)), 'utf8')

test('the board has no upload of its own: clips there never reached the editor', () => {
  assert.doesNotMatch(board, /type="file"/)
  assert.doesNotMatch(board, /footageFromFile/)
})

test('the board points to Add take on the shot list instead', () => {
  for (const lang of ['en', 'zhHant']) assert.ok(areas.board[lang]['board.upload.moved']?.trim(), lang)
  assert.match(areas.board.en['board.upload.moved'], /Add take/)
  assert.match(board, /board\.upload\.moved/)
})
