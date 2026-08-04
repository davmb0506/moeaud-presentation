# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Flujo Goudy (shortlist tesis) — mono + multi

Protocolo canónico de cierre: `select → Rosetta → paper_filter` (Ω soft).

| Panel | Experimento | Shortlist |
|-------|-------------|-----------|
| MOEA VEGF-A | `moea_pool1208` | n=11 (listo) |
| HA-PD1 mono | `hapd1_mono60` | regenerando con réplicas 01–10 |

```bash
# Tras terminar Goudy HA-PD1:
python3 scripts/build_shortlist_goudy.py
```

Salida: `src/data/shortlistGoudy.json` (paneles `moea_pool1208` + `hapd1_mono60`).
Slides: `ValidacionSintesis`, `ValidacionShortlist`.

## HA-PD1 mono-60 vs AiDs SPR

Slide comparativa (`src/pages/hapd1-mono60-vs-paper.tsx`) entre Top diseños del panel
`outputs_hapd1_mono_60` (10 réplicas × brazo, 01–10, iteración 60) y los 5 AiDs SPR de Goudy et al. 2023
re-predichos con AF2 sobre HA-PD1.

Regenerar datos + PDBs públicos:

```bash
python3 scripts/build_hapd1_mono60_vs_paper.py
```

Salidas: `src/data/hapd1Mono60VsPaper.json`, `public/pdbs/hapd1/{mono,aids}/`.

Selección: Top-1 por `overall_score` (↓ mejor) por cada uno de los 10 runs de cada
brazo (1 diseño/run, hasta 10 por brazo). Matching PDB por secuencia exacta de cadena A.
Se excluyen secuencias degeneradas (A+L > 80%) y con QC estructural débil
(`pLDDT_A < 75`, `ipTM < 0.10` ≈ scrambled paper, o `PAE iface > 25`); un run sin
ningún candidato elegible queda sin representar.
**KD experimental solo para AiDs; no confundir con overall_score.**
Incluye propiedades ProtParam del binder (GRAVY, carga pH 7, pI, II,
aromaticidad, MW) para diseños y AiDs.

### Cobertura PDB (resumen)

| brazo | diseños seleccionados (Top-1/run) | con PDB |
|-------|----------------------:|--------:|
| both (base) | 9 | 9 |
| temp | 9 | 9 |
| mutation | 8 | 8 |
| **total** | **26** | **26** |

AiDs SPR copiados: 4, 5, 7, 15, 19. Panel: 10 réplicas × brazo (01–10).

