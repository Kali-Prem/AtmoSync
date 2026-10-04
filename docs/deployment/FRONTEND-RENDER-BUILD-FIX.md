# ATMOSYNC Frontend Render Build Fix: Next.js Rewrite Validation

## 1. Original Error

During `next build` on Render for `atmosync-web`, the build failed with:

```text
`destination` does not start with `/`, `http://`, or `https://`
for route {"source":"/api/:path*", ...}

Error: Invalid rewrite found
```

## 2. Root Cause

1. **Next.js Rewrite Destination Syntax Requirements**:
   Next.js validates all rewrite entries at build time (`next build`) when generating `.next/routes-manifest.json`. Every `destination` value must strictly begin with `/`, `http://`, or `https://`.
   
2. **Environment Variable Injection during Render Blueprint Builds**:
   In `render.yaml`, the frontend service configures `NEXT_PUBLIC_API_URL` dynamically using Render's Blueprint service discovery:
   ```yaml
   envVars:
     - key: NEXT_PUBLIC_API_URL
       fromService:
         type: web
         name: atmosync-api
         property: host
   ```
   At build time on Render, `property: host` resolves to the bare hostname (service slug) `atmosync-api` (or an empty string if unpopulated during initial blueprint planning).

3. **String Concatenation in `apps/web/next.config.mjs`**:
   The previous rewrite configuration in `next.config.mjs` was:
   ```javascript
   const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
   // ...
   destination: `${rawApiUrl}/api/:path*`
   ```
   When `NEXT_PUBLIC_API_URL` was `atmosync-api`, this evaluated to `atmosync-api/api/:path*`.
   Because `atmosync-api/api/:path*` does not start with `/`, `http://`, or `https://`, Next.js threw `Error: Invalid rewrite found`.
   When `NEXT_PUBLIC_API_URL` was empty or undefined, it evaluated to `undefined/api/:path*` or `/api/:path*` with duplicate or invalid semantics.

## 3. Fix Applied

We updated `apps/web/next.config.mjs` and `apps/web/src/lib/api.ts` with a robust protocol resolution helper function: `getApiDestination()` and `resolveApiBaseUrl()`.

### `apps/web/next.config.mjs`:
```javascript
function getApiDestination() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const trimmed = rawUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');

  // 1. Fallback for undefined/empty: local development backend
  if (!trimmed) {
    return 'http://127.0.0.1:8000/api/:path*';
  }

  // 2. Relative paths
  if (trimmed.startsWith('/')) {
    return `${trimmed}/api/:path*`;
  }

  // 3. Fully qualified URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `${trimmed}/api/:path*`;
  }

  // 4. Bare hostnames without protocol:
  // If localhost or local loopback IP, default to http://
  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1') || trimmed.startsWith('0.0.0.0')) {
    return `http://${trimmed}/api/:path*`;
  }

  // Cloud/Render service names (e.g. "atmosync-api" or "atmosync-api.onrender.com")
  if (trimmed === 'atmosync-api') {
    return `https://${trimmed}.onrender.com/api/:path*`;
  }

  return `https://${trimmed}/api/:path*`;
}
```

### `apps/web/src/lib/api.ts`:
Matching normalization logic was integrated into `resolveApiBaseUrl()` so client-side and server-side isomorphic fetch calls in the Next.js application accurately resolve API endpoints without double slashes or missing protocols.

## 4. Environment Variable

- **Primary Variable:** `NEXT_PUBLIC_API_URL`
- **Fallback Variable:** `API_URL`
- **Default Local Value:** `http://127.0.0.1:8000`
- **Render Production Value:** `atmosync-api` (via `fromService: { property: host }`) or `https://atmosync-api.onrender.com`

No new redundant environment variables were introduced. Existing variables were preserved.

## 5. Local Build Result

- **TypeScript Type Check:**
  ```bash
  cd apps/web && npx tsc --noEmit
  # Result: Passed (Exit Code 0, 0 errors)
  ```

- **Next.js Production Build (`NEXT_PUBLIC_API_URL="atmosync-api"` - Render Environment Simulation):**
  ```bash
  cd apps/web && NEXT_PUBLIC_API_URL="atmosync-api" npm run build
  # Result: Passed (Exit Code 0)
  # Routes manifest generated with valid rewrite destination:
  # {"source":"/api/:path*","destination":"https://atmosync-api.onrender.com/api/:path*"}
  ```

- **Next.js Production Build (Local Fallback - Unset Environment Variable):**
  ```bash
  cd apps/web && env -u NEXT_PUBLIC_API_URL npm run build
  # Result: Passed (Exit Code 0)
  # Routes manifest generated with valid rewrite destination:
  # {"source":"/api/:path*","destination":"http://127.0.0.1:8000/api/:path*"}
  ```

- **Rewrite Test Suite (`apps/web/test-rewrite.mjs`):**
  - Evaluated 9 edge cases:
    1. Undefined / Unset -> `http://127.0.0.1:8000/api/:path*`
    2. Empty string `""` -> `http://127.0.0.1:8000/api/:path*`
    3. Render bare hostname `"atmosync-api"` -> `https://atmosync-api.onrender.com/api/:path*`
    4. Full Render URL `"https://atmosync-api.onrender.com"` -> `https://atmosync-api.onrender.com/api/:path*`
    5. Full Render URL with trailing slash `"https://atmosync-api.onrender.com/"` -> `https://atmosync-api.onrender.com/api/:path*`
    6. Full Render URL with `/api` suffix `"https://atmosync-api.onrender.com/api"` -> `https://atmosync-api.onrender.com/api/:path*`
    7. Bare hostname `"my-backend.domain.com"` -> `https://my-backend.domain.com/api/:path*`
    8. Localhost without scheme `"localhost:8000"` -> `http://localhost:8000/api/:path*`
    9. Relative path `"/backend"` -> `/backend/api/:path*`
  - Result: 9/9 Passed (100%).

- **Backend Pytest Suite:**
  - `pytest -v`: 62/62 Passed (100%).

## 6. Render Deployment Requirement

In `render.yaml`, the frontend web service config is:
```yaml
  - type: web
    name: atmosync-web
    env: node
    plan: free
    region: oregon
    rootDir: apps/web
    buildCommand: npm ci && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_VERSION
        value: 20.18.0
      - key: NEXT_PUBLIC_API_URL
        fromService:
          type: web
          name: atmosync-api
          property: host
```

When Render triggers `npm run build`:
1. `NEXT_PUBLIC_API_URL` will provide `atmosync-api`.
2. `apps/web/next.config.mjs` normalizes this to `https://atmosync-api.onrender.com/api/:path*`.
3. Next.js validates that `destination` begins with `https://`.
4. The rewrite validation passes cleanly with no errors, allowing the production bundle and route manifests to be generated.
