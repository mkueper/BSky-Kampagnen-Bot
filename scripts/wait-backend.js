#!/usr/bin/env node
const waitOn = require('wait-on')
const path = require('path')
const fs = require('fs')
const dotenvPath = path.join(process.cwd(), '.env')
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath })
}
const port = process.env.BACKEND_PORT || process.env.APP_PORT || process.env.BACKEND_INTERNAL_PORT || 35123
const host = process.env.BACKEND_HOST || '127.0.0.1'
const target = `http://${host}:${port}`
waitOn({ resources: [target] })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backend wait failed', err)
    process.exit(1)
  })
