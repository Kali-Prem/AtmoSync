# ATMOSYNC Frontend Render Build Fix Report

**Date:** 2026-10-04  
**Component:** `apps/web` (`atmosync-web`)  
**Deployment Target:** Render (Free Tier Blueprint)  

---

### Original Error:
```text
`destination` does not start with `/`, `http://`, or `https://`
for route {"source":"/api/:path*", ...}

Error: Invalid rewrite found
```

### Root Cause:
Next.js enforces strict build-time validation on all rewrite routes defined in `next.config.*`: the `destination` property must strictly begin with `/`, `http://`, or `https://`. In `render.yaml`, `NEXT_PUBLIC_API_URL` is populated dynamically using Render Blueprint's `fromService` discovery targeting `atmosync-api` with `property: host`. This yields the bare hostname `"atmosync-api"` without a protocol scheme. When `apps/web/next.config.mjs` performed string interpolation `${rawApiUrl}/api/:path*`, it resulted in `"atmosync-api/api/:path*"`, which fails Next.js build-time rewrite validation. If the environment variable was unset or empty, it could result in `undefined/api/:path*`.

### Next.js Config File:
`apps/web/next.config.mjs`

### Rewrite Source:
`/api/:path*`

### Rewrite Destination:
- **Production (Render Cloud):** `https://atmosync-api.onrender.com/api/:path*` (derived dynamically when `NEXT_PUBLIC_API_URL="atmosync-api"` or when set to `https://atmosync-api.onrender.com`)
- **Local Development Fallback:** `http://127.0.0.1:8000/api/:path*` (when `NEXT_PUBLIC_API_URL` is unset, empty, or points to localhost/loopback)

### Environment Variable:
`NEXT_PUBLIC_API_URL` (with fallback to `API_URL`)

### Files Modified:
- `apps/web/next.config.mjs`: Implemented `getApiDestination()` normalization function ensuring valid URL scheme prefixing (`http://` for local loopbacks, `https://` for cloud/Render hostnames, safe fallback to `http://127.0.0.1:8000`).
- `apps/web/src/lib/api.ts`: Implemented `resolveApiBaseUrl()` matching the normalization logic for client and server runtime fetches.
- `apps/web/package.json`: Added test script `"test:rewrite": "node test-rewrite.mjs"`.
- `apps/web/test-rewrite.mjs`: Test suite covering 9 distinct URL formats, protocols, and environment variable scenarios.
- `docs/deployment/RENDER-DEPLOYMENT.md`: Documented frontend Next.js rewrite architecture, routing flow, and build requirements.
- `docs/deployment/RENDER-ENVIRONMENT-MATRIX.md`: Documented Next.js rewrite environment variables, destination resolution rules, and validation specs.
- `docs/deployment/RENDER-READINESS.md`: Updated frontend service readiness, audit matrix, and cleared blockers.
- `docs/deployment/FRONTEND-RENDER-BUILD-FIX.md`: Detailed audit, root cause, fix, and reproduction report.
- `docs/deployment/FRONTEND-RENDER-FIX-REPORT.md`: Final fix verification report.

### Local Build:
- `npx tsc --noEmit`: Completed with 0 errors (Exit Code 0).
- `NEXT_PUBLIC_API_URL="atmosync-api" npm run build`: Completed successfully (Exit Code 0). Manifest `.next/routes-manifest.json` generated with destination `"https://atmosync-api.onrender.com/api/:path*"`.
- `env -u NEXT_PUBLIC_API_URL npm run build`: Completed successfully (Exit Code 0). Manifest `.next/routes-manifest.json` generated with destination `"http://127.0.0.1:8000/api/:path*"`.

### Tests:
- `npm run test:rewrite`: 9/9 test cases passed (100% pass rate).
- Backend test suite (`pytest -v`): 62/62 tests passed (100% pass rate).

### Render Configuration:
`render.yaml` frontend service block:
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

### Remaining Blockers:
None.

---

FRONTEND BUILD FIX VERIFIED LOCALLY
