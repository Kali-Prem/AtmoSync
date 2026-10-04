# ATMOSYNC Frontend Missing Modules Audit

## Original Render Error:
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
Compilation failed during `next build` on Node.js 24 / Next.js 14.2.35.

## Missing Modules:
1. `@/lib/api` (`apps/web/src/lib/api.ts`)
2. `@/components/ThemeToggle` (`apps/web/src/components/ThemeToggle.tsx`)

## Root Cause:
1. **`.gitignore` Broad Pattern Matching (`lib/`)**:
   In `.gitignore`, line 26 previously contained `lib/` without root anchoring (`/lib/`). In Git pattern matching syntax, an unanchored pattern `lib/` matches any directory named `lib` anywhere in the tree, including `apps/web/src/lib/`. Consequently, `apps/web/src/lib/api.ts` was marked ignored by Git and was never committed or pushed to the remote repository. When Render performed a clean clone of the commit, `apps/web/src/lib/` was absent, triggering `Module not found: Can't resolve '@/lib/api'`.
2. **Missing `baseUrl` & Index Barrel Resolvers for `@/components/ThemeToggle`**:
   `apps/web/tsconfig.json` contained `"paths": { "@/*": ["./src/*"] }` without specifying `"baseUrl": "."`. While local incremental caches or certain environments resolve this relative to the working directory, clean containerized environments benefit from explicit `"baseUrl": "."`. Furthermore, `apps/web/src/components/index.ts` was not present, making resolution strictly dependent on file-extension probing. Additionally, a stale `apps/web/tsconfig.tsbuildinfo` file had been checked into git in an earlier commit, potentially poisoning incremental compiler metadata.

## @ alias configuration:
In `apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
All paths prefixed with `@/` map directly to `./src/*` relative to `apps/web`.

## Git tracking status:
- `.gitignore`: Updated lines 26-29 to anchor Python build directories (`/lib/`, `/lib64/`) to the repository root and added explicit unignore rules:
  ```gitignore
  /lib/
  /lib64/
  !apps/web/src/lib/
  !apps/web/src/lib/**
  ```
- `apps/web/src/lib/api.ts`: Now tracked and staged for commit.
- `apps/web/src/lib/index.ts`: Created and tracked.
- `apps/web/src/components/index.ts`: Created and tracked.
- `apps/web/tsconfig.tsbuildinfo`: Untracked from Git via `git rm --cached` and added `*.tsbuildinfo` to `.gitignore`.

## Case-sensitivity findings:
- Linux filesystems are strictly case-sensitive.
- Audit of imports in `apps/web/src/`:
  - `apps/web/src/app/layout.tsx` imports `@/components/ThemeToggle` -> matches exact file `apps/web/src/components/ThemeToggle.tsx`.
  - All page routes (`atmosphere`, `forecast`, `inversion`, `page`, `plume`, `stations`, `status`) import `@/lib/api` -> matches exact file `apps/web/src/lib/api.ts`.
- No casing mismatches found.

## Files restored/created:
- `apps/web/src/components/index.ts`: Created barrel export exporting `ThemeToggle`.
- `apps/web/src/lib/index.ts`: Created barrel export exporting all API utilities.
- `apps/web/src/lib/api.ts`: Verified complete API client implementation un-ignored.

## Files modified:
- `.gitignore`: Fixed `/lib/` anchoring, un-ignored `apps/web/src/lib/**`, and ignored `*.tsbuildinfo`.
- `apps/web/tsconfig.json`: Added `"baseUrl": "."`.
- `apps/web/src/components/ThemeToggle.tsx`: Added named export `export { ThemeToggle }`.
- `apps/web/tsconfig.tsbuildinfo`: Deleted and removed from Git index.

## Local TypeScript result:
```bash
cd apps/web && npx tsc --noEmit
# Exit Code: 0 (0 errors)
```

## Local production build result:
```bash
cd apps/web && rm -rf .next && npm ci && npm run build
# Exit Code: 0
# ✓ Compiled successfully
# ✓ Generating static pages (12/12)
# ✓ Finalizing page optimization
```
Simulated clean clone test in fresh isolated directory passed with exit code 0.

## Remaining warnings:
```text
2 vulnerabilities (1 high, 1 critical)
```
These are npm package audit advisory notices on existing transitive dependencies. `npm audit fix --force` was intentionally not executed to preserve package stability and prevent breaking changes.
