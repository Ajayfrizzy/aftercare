import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../apps/api/app.ts'
import { openDatabase } from '../packages/db/index.ts'
import { overview } from '../packages/contracts/index.ts'

test('database reopens with persisted data, WAL and foreign keys', t => {
  const dir = mkdtempSync(join(tmpdir(), 'aftercare-'))
  t.after(() => rmSync(dir, { recursive: true }))
  const path = join(dir, 'db')
  const first = openDatabase(path)
  first.exec("UPDATE workspace SET title='Persisted'")
  first.close()
  const db = openDatabase(path)
  t.after(() => db.close())
  assert.equal(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys, 1)
  assert.equal(db.prepare('PRAGMA journal_mode').get()?.journal_mode, 'wal')
  assert.equal(db.prepare('SELECT title FROM workspace').get()?.title, 'Persisted')
})

test('private overview requires the demo identity and validates the response', async t => {
  const secret = 'a'.repeat(32)
  const app = createApp(':memory:', secret)
  t.after(() => app.close())
  for (const [user,status] of [['',401],['other',401],['demo',200]] as const) {
    const response = await app.inject({url:'/api/v1/overview',headers:{
      authorization:'Basic ' + Buffer.from(user + ':' + secret).toString('base64')
    }})
    assert.equal(response.statusCode,status)
    if (status === 200) assert.equal(overview.parse(response.json()).lastCheckedAt,null)
  }
})
