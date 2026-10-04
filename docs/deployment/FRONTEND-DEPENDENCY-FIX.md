# ATMOSYNC Frontend TypeScript Build Dependencies Fix

## Problem
During the Render production build of `atmosync-web`, the build failed with:

```text
It looks like you're trying to use TypeScript but do not have the required package(s) installed.

Please install:
typescript
@types/react
@types/node
```

## Root Cause
1. **Production Mode Dependency Pruning**:
   In `render.yaml`, the environment variable `NODE_ENV=production` is specified for the `atmosync-web` service.
2. **`npm install` / `npm ci` Behavior under `NODE_ENV=production`**:
   By design, npm omits packages listed under `devDependencies` when `NODE_ENV=production` is active during package installation.
3. **TypeScript as a Production Build Dependency**:
   In `apps/web/package.json`, `typescript`, `@types/react`, `@types/node`, and `@types/react-dom` were previously declared under `devDependencies`. Because `next build` compiles TypeScript files directly into optimized JavaScript bundles during production deployments, TypeScript and its type definitions are required at build time. Because npm pruned `devDependencies`, `node_modules/typescript` was absent, triggering Next.js's missing dependency check.

## Dependencies Added / Promoted
Moved from `devDependencies` to `dependencies` in `apps/web/package.json`:
- `typescript`: `^5.4.5`
- `@types/react`: `^18.3.3`
- `@types/node`: `^20.14.0`
- `@types/react-dom`: `^18.3.0`

## Versions
- `typescript`: `5.4.5`
- `@types/react`: `18.3.3`
- `@types/node`: `20.14.0`
- `@types/react-dom`: `18.3.0`
- `next`: `14.2.5`
- `react`: `18.3.1`
- `react-dom`: `18.3.1`

## Files Modified
- `apps/web/package.json`: Promoted TypeScript packages to `dependencies`.
- `apps/web/package-lock.json`: Synchronized package lockfile reflecting regular dependency declarations.

## Clean `npm ci` Test
```bash
cd apps/web && rm -rf node_modules .next && NODE_ENV=production npm ci
# Result: PASS (added 28 packages in 4s, node_modules/typescript verified present)
```

## TypeScript Check
```bash
cd apps/web && npx tsc --noEmit
# Result: PASS (Exit code 0, 0 errors)
```

## Production Build
```bash
cd apps/web && NODE_ENV=production npm run build
# Result: PASS (Exit code 0)
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages (12/12)
# ✓ Collecting build traces
# ✓ Finalizing page optimization
```

## Remaining Warnings
- `2 vulnerabilities (1 high, 1 critical)` from transitive npm dependencies. Handled per instructions — `npm audit fix --force` was intentionally avoided to ensure build stability and prevent breaking changes.
