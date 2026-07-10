import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
