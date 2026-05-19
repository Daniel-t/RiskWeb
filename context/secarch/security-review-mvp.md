# MVP Security Review Report

**Reviewer**: @secarch
**Date**: 2026-05-16
**Scope**: All MVP implementation code (TASK-105 through TASK-113)
**Files reviewed**: 30 source files across backend/, frontend/, and shared/

---

## Summary

Overall the codebase is in reasonable shape for a local-only MVP. No critical vulnerabilities were found. The main concerns are:

- **1 HIGH** severity finding (path traversal in file storage)
- **3 MEDIUM** severity findings (missing input validation on backend, CORS hardening, unvalidated JSON deserialization)
- **4 LOW** severity findings (error message leakage, missing rate limiting, prototype pollution surface, iteration count DoS)
- **3 INFO** findings (no logging, no security headers, hardcoded base URL)

**Total: 0 CRITICAL, 1 HIGH, 3 MEDIUM, 4 LOW, 3 INFO**

---

## Findings

### [HIGH] Insufficient Path Traversal Prevention in File Storage

- **Task**: TASK-105
- **File**: `backend/src/scenarios/scenarios.service.ts:15-17`
- **Description**: The `filePath()` method constructs a file path by directly interpolating the `id` parameter into a `path.join()` call without validating that the resulting path stays within `DATA_DIR`. While the `create()` method generates UUIDs server-side (safe), the `get()`, `update()`, and `delete()` methods accept `id` directly from the URL parameter. An attacker could supply an `id` like `../../etc/passwd` or `..\\..\\windows\\system32\\config\\sam` to read or delete arbitrary files on the filesystem.

  The `filePath()` method:
  ```typescript
  private filePath(id: string): string {
    return path.join(DATA_DIR, `${id}.json`);
  }
  ```

  `path.join()` resolves `..` segments, so `path.join(DATA_DIR, '../../etc/passwd.json')` escapes the data directory.

- **Impact**: Arbitrary file read (via `get()`), arbitrary file write (via `update()`), and arbitrary file delete (via `delete()`) on the server filesystem. Severity is HIGH because exploitation is trivial and the impact is severe.
- **Recommendation**: Add path traversal validation in `filePath()`:
  ```typescript
  private filePath(id: string): string {
    // Reject any id containing path separators or traversal sequences
    if (!/^[a-f0-9\-]{36}$/i.test(id)) {
      throw new BadRequestException('Invalid scenario ID format');
    }
    const resolved = path.join(DATA_DIR, `${id}.json`);
    if (!resolved.startsWith(DATA_DIR)) {
      throw new BadRequestException('Invalid scenario ID');
    }
    return resolved;
  }
  ```
  Validate that the ID matches UUID format, AND verify the resolved path starts with `DATA_DIR` as a defense-in-depth measure.

---

### [MEDIUM] No Input Validation or DTO Enforcement on Backend API

- **Task**: TASK-106
- **File**: `backend/src/scenarios/scenarios.controller.ts:19-26`
- **Description**: The `create()` and `update()` endpoints accept a raw `@Body()` with no validation pipe, no DTO class, and no schema enforcement. The TypeScript `Omit<Scenario, 'id' | 'metadata'>` type annotation is erased at runtime and provides zero server-side validation. An attacker can send any JSON payload, including excessively large payloads, unexpected fields, or malformed data structures. This data is then written directly to disk via `JSON.stringify()`.
- **Impact**: Malformed data stored on disk could cause frontend crashes when loaded. Extremely large payloads could exhaust disk space. Unexpected fields could be persisted and later misinterpreted. This is a data integrity and availability concern.
- **Recommendation**: Implement NestJS validation using `class-validator` and `class-transformer`:
  1. Create a `CreateScenarioDto` class with validation decorators
  2. Enable `ValidationPipe` globally in `main.ts`
  3. Add payload size limits via Express body-parser configuration

  At minimum, add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` in `main.ts` and create proper DTO classes.

---

### [MEDIUM] CORS Configuration Allows Credentials Without Strict Origin Validation

- **Task**: TASK-105 / TASK-106
- **File**: `backend/src/main.ts:7-11`
- **Description**: The CORS configuration allows credentials (`credentials: true`) from `http://localhost:5173`. While the origin is hardcoded (good), `credentials: true` combined with broad allowed methods is more permissive than necessary for this API. The current API does not use cookies or authentication tokens, so `credentials: true` is unnecessary and widens the attack surface for future integration.
- **Impact**: Low immediate impact since the origin is restricted. However, if the origin configuration is later relaxed (e.g., for deployment), the `credentials: true` flag could enable credential-based CSRF attacks.
- **Recommendation**: Remove `credentials: true` since no authentication mechanism is in use. When authentication is added, re-evaluate with specific origin validation. For production, the origin should be configurable via environment variable rather than hardcoded.

---

### [MEDIUM] Unvalidated JSON Deserialization from File System

- **Task**: TASK-105
- **File**: `backend/src/scenarios/scenarios.service.ts:26-27, 41-42`
- **Description**: In the `list()` and `get()` methods, JSON files are read from disk and parsed with `JSON.parse()` without any schema validation. If a file has been manually edited, corrupted, or maliciously modified, the parsed object is returned directly to the client without verifying it conforms to the `Scenario` interface. The TypeScript cast (`const scenario: Scenario = JSON.parse(raw)`) provides no runtime validation.
- **Impact**: A corrupted or tampered file could return unexpected data structures to the frontend, potentially causing client-side errors or unexpected behavior.
- **Recommendation**: Add runtime validation when reading files from disk. At minimum, verify that required fields (`id`, `name`, `nodes`, `edges`, `metadata`) exist and have expected types before returning the object. Consider using a validation library like `zod` or `class-validator` for schema validation on read.

---

### [LOW] Error Messages May Leak Internal Paths and Stack Traces

- **Task**: TASK-106
- **File**: `backend/src/scenarios/scenarios.service.ts:43-45`
- **Description**: While `NotFoundException` is used correctly for missing scenarios, the catch block in `get()` catches all errors (including unexpected filesystem errors) and wraps them in a `NotFoundException`. This masks real errors but also means the error message `Scenario ${id} not found` includes the user-supplied `id`, which could be used for information gathering if the ID contains special characters. More importantly, unhandled exceptions elsewhere in NestJS will generate default 500 responses that may include stack traces in development mode.
- **Impact**: Information disclosure to attackers. Stack traces could reveal file paths, library versions, and internal structure.
- **Recommendation**:
  1. Add a global exception filter that sanitizes error responses in production
  2. In `get()`, distinguish between "file not found" errors and other filesystem errors
  3. Sanitize user input (`id`) before including it in error messages

---

### [LOW] No Rate Limiting on API Endpoints

- **Task**: TASK-106
- **File**: `backend/src/scenarios/scenarios.controller.ts` (all endpoints)
- **Description**: No rate limiting is configured on any endpoint. The create, update, and delete endpoints perform filesystem I/O and could be abused to exhaust disk space (via create) or cause excessive I/O (via rapid read/write cycles).
- **Impact**: Denial of service through resource exhaustion. Low severity for a local-only MVP.
- **Recommendation**: Add `@nestjs/throttler` for rate limiting before any production deployment. A reasonable default would be 100 requests per minute per IP.

---

### [LOW] Prototype Pollution Surface in Spread Operator Usage

- **Task**: TASK-105
- **File**: `backend/src/scenarios/scenarios.service.ts:51-52, 62-63`
- **Description**: The `create()` and `update()` methods use the spread operator (`...data`) to merge user-supplied data into the scenario object. If the `data` object contains `__proto__` or `constructor` properties, these could pollute the prototype chain of the resulting object. While JavaScript's `JSON.parse()` does not create `__proto__` properties from JSON input, direct API calls could still include them if validation is absent.
- **Impact**: Prototype pollution could lead to unexpected behavior. Low severity because `JSON.stringify()` on write and `JSON.parse()` on read effectively sanitize prototype chains in this specific flow.
- **Recommendation**: Use the DTO whitelist approach recommended in the input validation finding. Additionally, consider using `Object.create(null)` or explicit property picking rather than spread for user-supplied data.

---

### [LOW] No Upper Bound Enforcement on Simulation Iterations (Client-Side DoS)

- **Task**: TASK-107
- **File**: `frontend/src/workers/fairEngine.ts:213`
- **Description**: The simulation worker validates iterations between 1 and 1,000,000. While there is an upper bound check, 1,000,000 iterations of a complex tree could consume significant memory (storing all per-node LEF values in arrays) and CPU time in the browser tab. The `rawALEValues` array is also sent back to the main thread via `postMessage`, which involves serialization overhead for large arrays.
- **Impact**: Browser tab could become unresponsive or crash with very large iteration counts combined with many nodes. This is a self-inflicted DoS (the user controls the input), so severity is low.
- **Recommendation**: Consider a lower default maximum (e.g., 100,000) with a warning for higher values. For the histogram, consider sending a fixed-size sample rather than all raw values.

---

### [INFO] No Application Logging or Audit Trail

- **Task**: TASK-105, TASK-106
- **File**: `backend/src/scenarios/scenarios.service.ts` (entire file)
- **Description**: No logging is implemented for any operations. Create, update, and delete operations leave no audit trail. Errors are caught and re-thrown without logging.
- **Impact**: No visibility into application behavior, errors, or potential security events. Informational for MVP.
- **Recommendation**: Add structured logging using NestJS's built-in `Logger` service. Log all CRUD operations with scenario IDs and timestamps. Log errors with sufficient context for debugging.

---

### [INFO] No Security Headers

- **Task**: TASK-105
- **File**: `backend/src/main.ts`
- **Description**: The backend does not set security headers such as `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, or `Content-Security-Policy`. The NestJS default Express configuration does not include these headers.
- **Impact**: No immediate impact for local development. These headers would be important for production deployment.
- **Recommendation**: Add the `helmet` middleware package before production deployment: `app.use(helmet())`.

---

### [INFO] Hardcoded Backend URL in Frontend

- **Task**: TASK-112
- **File**: `frontend/src/services/api.ts:3`
- **Description**: The backend base URL is hardcoded as `http://localhost:3000/api`. This is appropriate for local development but will need to be configurable for deployment.
- **Impact**: No security impact currently. The frontend correctly uses `encodeURIComponent()` for path parameters in API calls (line 24, 39, 46), which is good practice.
- **Recommendation**: Use an environment variable via Vite's `import.meta.env` for the base URL.

---

## Positive Findings

The following security practices were done well:

1. **Frontend API client uses `encodeURIComponent()`** for all dynamic URL path segments (`frontend/src/services/api.ts:24,39,46`). This prevents URL injection.

2. **React's default JSX escaping** is used throughout -- no `dangerouslySetInnerHTML` or `innerHTML` usage was found anywhere. Node labels and scenario names are rendered as text content, which React automatically escapes. **No XSS vulnerabilities were identified.**

3. **D3 histogram** uses `.text()` method for label rendering (not `.html()`), which is safe against XSS (`frontend/src/components/Simulation/ALEHistogram.tsx`).

4. **Web Worker lifecycle management** is well-implemented with proper cleanup on unmount and cancel support (`frontend/src/hooks/useSimulation.ts`).

5. **UUIDs generated server-side** via `uuid.v4()` for scenario IDs, preventing client-controlled ID injection for new scenarios.

6. **Cycle detection** is implemented in both the frontend (`treeStore.ts:canConnect`) and simulation engine (`fairEngine.ts:topologicalSort`), preventing infinite loops.

7. **Numeric input validation** exists at multiple layers: frontend form validation (`DistributionInput.tsx`), tree store validation (`treeStore.ts`), and worker-side validation (`fairEngine.ts`).

8. **NaN/Infinity clamping** in the simulation engine (`fairEngine.ts:136`, `simulation.worker.ts:91`) prevents mathematical edge cases from corrupting results.

---

## Dependency Audit

### Backend (`backend/`)
```
npm audit: found 0 vulnerabilities
```

Dependencies are current and use recent major versions (NestJS 11, uuid 14).

### Frontend (`frontend/`)
```
npm audit: found 0 vulnerabilities
```

Dependencies are current (React 19, Vite 8, @xyflow/react 12).

No known vulnerabilities in either package tree.

---

## Verdict

**Approved with conditions.**

The codebase is acceptable for continued MVP development and local use. However, the following conditions must be addressed before any non-local deployment:

1. ~~**[MUST FIX before deployment]** HIGH: Path traversal in `scenarios.service.ts`~~ **CLOSED** (2026-05-16) — UUID regex + path containment check in `validateId()`, called from `filePath()`.

2. ~~**[MUST FIX before deployment]** MEDIUM: Add input validation (DTOs + ValidationPipe)~~ **CLOSED** (2026-05-16) — `CreateScenarioDto` with full nested validation, global `ValidationPipe`, 1MB body limit.

3. ~~**[SHOULD FIX]** MEDIUM: Remove unnecessary `credentials: true` from CORS config~~ **CLOSED** (2026-05-16) — Removed, along with unused PATCH method.

4. ~~**[SHOULD FIX]** MEDIUM: Add schema validation when reading JSON files from disk~~ **CLOSED** (2026-05-16) — `validateScenarioShape()` type guard; `list()` skips bad files, `get()` throws specific error.

The LOW and INFO findings are acceptable technical debt for an MVP phase and should be tracked for resolution before production readiness.
