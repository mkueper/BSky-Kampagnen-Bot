#!/usr/bin/env node
/* global process, console */
import { spawn } from 'node:child_process'

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
}

const LINT_TASKS = [
  { name: 'root', args: ['npm', ['run', 'lint']] },
  { name: 'backend', args: ['npm', ['run', 'lint', '--workspace', 'backend']] },
  { name: 'dashboard', args: ['npm', ['run', 'lint', '--workspace', 'dashboard']] },
  { name: 'bsky-client', args: ['npm', ['run', 'lint', '--workspace', 'bsky-client']] },
  { name: 'packages/media-pickers', args: ['npm', ['run', 'lint', '--workspace', 'packages/media-pickers']] },
  { name: 'packages/shared-ui', args: ['npm', ['run', 'lint', '--workspace', 'packages/shared-ui']] }
]

const results = []

async function runTask ({ name, args }) {
  const [cmd, cmdArgs] = args
  return new Promise((resolve) => {
    const proc = spawn(cmd, cmdArgs, { stdio: 'inherit' })
    proc.on('close', (code) => {
      const success = code === 0
      results.push({ name, success })
      resolve({ success, code })
    })
  })
}

async function main () {
  for (const task of LINT_TASKS) {
    const { success, code } = await runTask(task)
    if (!success) {
      summarize()
      process.exit(code ?? 1)
    }
  }
  summarize()
}

function summarize () {
  const total = results.length
  const passed = results.filter(r => r.success).length
  const failed = total - passed

  console.log('\n================ Lint Summary ================')
  const summaryLine = `Workspaces: ${total}, passed: ${colorText(passed, COLORS.green)}, failed: ${colorText(failed, failed > 0 ? COLORS.red : COLORS.green)}`
  console.log(summaryLine)
  for (const entry of results) {
    const status = entry.success ? colorText('ok', COLORS.green) : colorText('FAILED', COLORS.red)
    console.log(`- ${entry.name}: ${status}`)
  }
  if (failed > 0) {
    console.log('================== Failures ==================')
    for (const entry of results.filter(r => !r.success)) {
      console.log(colorText(`> ${entry.name}`, COLORS.red))
    }
  }
  console.log('==============================================\n')
}

function colorText (text, color) {
  return `${color}${text}${COLORS.reset}`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
