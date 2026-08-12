import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

/** Evita que Vite sirva index.html cuando falta un .pdb (rompe ComplexViewer). */
function pdbStrictStatic(): Plugin {
  return {
    name: 'pdb-strict-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.endsWith('.pdb')) return next()
        const rel = decodeURIComponent(url).replace(/^\/+/, '')
        const filePath = path.join(server.config.root, 'public', rel)
        if (fs.existsSync(filePath)) return next()
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(`PDB no encontrado: ${url}`)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pdbStrictStatic()],
  server: {
    watch: {
      // Los assets estáticos (PDBs, figuras) no necesitan HMR y son cientos de
      // archivos; vigilarlos agota el límite de file watchers de inotify (ENOSPC).
      ignored: [
        '**/public/pdbs/composite/**',
        '**/public/pdbs/ipsae_sc/**',
        '**/public/pdbs/operadores/**',
        '**/public/pdbs/reprediction/**',
        '**/public/pdbs/blind/**',
        '**/public/pdbs/evopro/**',
        '**/public/fronts/**',
        '**/public/figures/**',
        '**/public/evopro/**',
        '**/public/validation/**',
        '**/public/figs/**',
        '**/.agents/**',
      ],
    },
  },
})
