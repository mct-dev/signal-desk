import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { writePrivateDataBundle } from './private-data.js'

const root = new URL('../', import.meta.url)
const dist = new URL('../dist/', import.meta.url)
const publicDir = new URL('../public/', import.meta.url)
const basePath = process.env.BASE_PATH ?? '/'
const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`

await rm(dist, { recursive: true, force: true })
await mkdir(new URL('assets/', dist), { recursive: true })

const result = spawnSync(
  'bun',
  [
    'build',
    'src/main.jsx',
    '--outdir=dist/assets',
    '--target=browser',
    '--minify',
  ],
  {
    cwd: root,
    stdio: 'inherit',
  },
)

if (result.status !== 0) {
  process.exitCode = result.status ?? 1
  throw new Error('Bun build failed')
}

await cp(publicDir, dist, { recursive: true })
const privateData = await writePrivateDataBundle({
  dist,
  password: process.env.SIGNAL_DESK_PASSWORD,
  requirePassword: process.env.REQUIRE_SIGNAL_DESK_PASSWORD === 'true',
})

await writeFile(
  new URL('index.html', dist),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Weekly opportunity briefs from public market, pain, spend, adoption, and macro signals."
    />
    <base href="${normalizedBase}" />
    <title>Signal Desk</title>
    <link rel="icon" href="favicon.svg" />
    <link rel="stylesheet" href="assets/main.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="assets/main.js"></script>
  </body>
</html>
`,
)

console.log(`Built Signal Desk with base path ${normalizedBase}${privateData.protected ? ' and encrypted data' : ''}`)
