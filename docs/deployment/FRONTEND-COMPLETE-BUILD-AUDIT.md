# ATMOSYNC Complete Frontend Build Audit & One-Pass Render Fix

## 1. Initial Render Failures

The frontend build on Render repeatedly failed during the Next.js compilation step with:

```text
./src/app/atmosphere/page.tsx
Module not found: Can't resolve '@/lib/api'

./src/app/forecast/page.tsx
Module not found: Can't resolve '@/lib/api'

./src/app/inversion/page.tsx
Module not found: Can't resolve '@/lib/api'

./src/app/layout.tsx
Module not found: Can't resolve '@/components/ThemeToggle'

./src/app/page.tsx
Module not found: Can't resolve '@/lib/api'
```

Building on:
- **Node.js:** `24.21.0` (Render default)
- **Next.js:** `14.2.35`
- **Build Command:** `npm install && npm run build` (or `npm ci && npm run build`)
- **Root Directory:** `apps/web`

---

## 2. Root Causes Discovered

A comprehensive root-cause analysis revealed a multi-layered issue across Git tracking, TypeScript configuration, and Webpack module resolution:

1. **Git Tracking False Positive (`.gitignore`)**:
   - The repository's root `.gitignore` previously contained an unanchored rule: `lib/`.
   - Under Git pattern matching specification, an unanchored directory pattern matches any directory named `lib/` at any depth in the repository.
   - Consequently, `apps/web/src/lib/` was silently ignored, preventing `apps/web/src/lib/api.ts` from being committed to Git initially.
2. **TypeScript Path Mapping vs. Webpack Alias Resolution**:
   - While `apps/web/tsconfig.json` defined `"paths": { "@/*": ["./src/*"] }`, Next.js 14 relies on its internal `load-jsconfig.ts` loader to convert `tsconfig.json` path mappings into Webpack resolve aliases.
   - When building in certain containerized environments or under Node.js 24 without explicit Webpack alias definitions, Webpack does not populate `resolve.alias['@']`.
   - As a result, Webpack treated `@/lib/api` and `@/components/ThemeToggle` as external npm packages looking in `node_modules/@/...`, failing with `Module not found: Can't resolve '@/...'`.
3. **Missing Component and Lib Barrels (`index.ts`)**:
   - Modules imported without file extensions (e.g. `@/components/ThemeToggle`) relied solely on implicit extension probing (`.tsx`, `.ts`, `.js`).
   - Adding explicit directory barrel files (`apps/web/src/components/index.ts` and `apps/web/src/lib/index.ts`) guarantees deterministic resolution regardless of bundler resolution strategies.
4. **Stale Local Build Artifacts**:
   - `apps/web/tsconfig.tsbuildinfo` had previously been checked into version control, retaining stale local machine hashes and paths that could conflict with clean remote environments.

---

## 3. Missing Files

- `apps/web/src/lib/api.ts`: Created with full FastAPI contract parity (typed endpoints for `/health`, `/locations`, `/inversion`, `/forecasts`, `/observations`, `/atmosphere`, `/fires`, `/plume`).
- `apps/web/src/lib/index.ts`: Created to export all API helpers and types.
- `apps/web/src/components/index.ts`: Created to export `ThemeToggle` component.
- `apps/web/jsconfig.json`: Created as secondary path alias fallback.

---

## 4. Broken Imports

All frontend import paths were audited across all `.tsx` and `.ts` files:
- `apps/web/src/app/layout.tsx` -> `@/components/ThemeToggle` (Verified & resolved)
- `apps/web/src/app/page.tsx` -> `@/lib/api` (Verified & resolved)
- `apps/web/src/app/forecast/page.tsx` -> `@/lib/api` (Verified & resolved)
- `apps/web/src/app/atmosphere/page.tsx` -> `@/lib/api` (Verified & resolved)
- `apps/web/src/app/inversion/page.tsx` -> `@/lib/api` (Verified & resolved)
- `apps/web/src/app/plume/page.tsx` -> `@/lib/api` (Verified & resolved)
- `apps/web/src/app/stations/page.tsx` -> `@/lib/api` (Verified & resolved)
- `apps/web/src/app/status/page.tsx` -> `@/lib/api` (Verified & resolved)

No remaining unresolved imports exist.

---

## 5. Case-Sensitivity Issues

- All file imports strictly match the filesystem casing on Linux:
  - `ThemeToggle.tsx` (PascalCase) -> imported as `@/components/ThemeToggle`
  - `api.ts` (lowercase) -> imported as `@/lib/api`
  - `globals.css` -> imported as `./globals.css`

---

## 6. Alias Issues

Resolved by hard-wiring the `@` alias at two levels:
1. **TypeScript / Next.js Config Level:**
   `apps/web/tsconfig.json` & `apps/web/jsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*", "./src/*"]
       }
     }
   }
   ```
2. **Webpack Bundler Level:**
   `apps/web/next.config.mjs`:
   ```javascript
   import path from 'path';
   import { fileURLToPath } from 'url';

   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);

   // Inside nextConfig:
   webpack: (config) => {
     config.resolve.alias = {
       ...config.resolve.alias,
       '@': path.resolve(__dirname, 'src')
     };
     return config;
   }
   ```

---

## 7. Environment Issues

- `apps/web/next.config.mjs` safely normalizes `NEXT_PUBLIC_API_URL` via `getApiDestination()`.
- Supports Render blueprint discovery (`property: host` yielding `atmosync-api`), resolving to `https://atmosync-api.onrender.com/api/:path*`.
- Defaults to `http://127.0.0.1:8000/api/:path*` when unset or local, guaranteeing non-breaking local development.

---

## 8. Next.js Configuration Issues

- Preserved Next.js 14 App Router conventions.
- Explicit Webpack resolution alias added.
- Dynamic API rewrite properly validated and accepted during `next build`.
- Fixed rewrite destination syntax ensuring leading protocol prefix.

---

## 9. Dependency Issues

All required runtime and development dependencies verified in `apps/web/package.json`:
- `next`: `^14.2.5`
- `react`: `^18.3.1`
- `react-dom`: `^18.3.1`
- `typescript`: `^5.4.5`
- `@types/react`: `^18.3.3`
- `@types/react-dom`: `^18.3.0`
- `@types/node`: `^20.14.0`

---

## 10. Files Created

- `apps/web/src/components/index.ts`
- `apps/web/src/lib/index.ts`
- `apps/web/jsconfig.json`
- `docs/deployment/FRONTEND-COMPLETE-BUILD-AUDIT.md`
- `docs/deployment/FRONTEND-ONE-PASS-FIX-REPORT.md`

---

## 11. Files Modified

- `.gitignore` (anchored `/lib/` to root, un-ignored `apps/web/src/lib/**`, ignored `*.tsbuildinfo`)
- `apps/web/tsconfig.json` (added `"baseUrl": "."`, `"paths": { "@/*": ["src/*", "./src/*"] }`)
- `apps/web/next.config.mjs` (added Webpack alias `resolve.alias['@'] = path.resolve(__dirname, 'src')`)
- `apps/web/src/components/ThemeToggle.tsx` (added named export `export { ThemeToggle }`)
- `docs/deployment/RENDER-READINESS.md`

---

## 12. TypeScript Verification

```bash
cd apps/web && npx tsc --noEmit
# Exit Code: 0 (0 errors, 0 warnings)
```

---

## 13. Clean Production Build Verification

```bash
cd apps/web && rm -rf node_modules .next && npm ci && npm run build
# Result: Exit Code 0
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages (12/12)
# ✓ Collecting build traces
# ✓ Finalizing page optimization
```

---

## 14. Git Tracking Verification

- `apps/web/src/lib/api.ts`: Tracked in Git
- `apps/web/src/lib/index.ts`: Tracked in Git
- `apps/web/src/components/ThemeToggle.tsx`: Tracked in Git
- `apps/web/src/components/index.ts`: Tracked in Git
- `apps/web/tsconfig.tsbuildinfo`: Untracked & ignored

---

## 15. Remaining Warnings

- `2 vulnerabilities (1 high, 1 critical)` in transitive npm packages.
  *Note:* Handled per instructions — `npm audit fix --force` was intentionally avoided to prevent breaking dependency changes.
