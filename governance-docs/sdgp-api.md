# **API Governance**

### *Standards for Designing, Building, Securing, and Operating APIs Across All Applications*

**Issued:** Internal Engineering Governance
**Reference Document:** Software Development Governance Policy (SDGP)

---

# **1. Purpose of This Booklet**

The purpose of this API Governance Booklet is to define unified principles and rules for designing, implementing, documenting, securing, and evolving all API surfaces across the organization.

This booklet is a required extension of the **Software Development Governance Policy (SDGP)** and must be followed alongside it.
Where SDGP defines global engineering policies, this booklet focuses specifically on API behavior, reliability, consistency, and security.

This applies to all API types:

* REST
* GraphQL
* gRPC
* Webhooks
* Internal service-to-service APIs

---

# **2. Foundational Principles**

These principles complement and extend Section 2 of SDGP.

### **2.1 APIs Are Products**

* APIs must be designed with long term maintainability and client stability in mind.
* Treat API consumers as users with specific needs and expectations.

### **2.2 Stability Over Cleverness**

* Prefer predictable, boring patterns.
* Avoid over-engineering or unusual patterns that create onboarding friction.

### **2.3 Backward Compatibility**

* Breaking changes are rare, controlled, and versioned.
* Clients must not be forced to break unexpectedly after a deployment.

### **2.4 Security Always First**

* API security rules extend SDGP security principles to the API layer.
* All API endpoints must be secure by default: authenticated, authorized, validated.

---

# **3. API Design Standards**

---

## **3.1 Resource Modeling**

Consistent with SDGP data modeling rules.

**Rules:**

* Use resource oriented REST principles.
* Use nouns, not verbs:

  * `/users`, `/payments`, `/vendors/{id}`
* Represent relationships explicitly:

  * `/vendors/{id}/accounts`
  * `/orders/{id}/items`

**Outcome:** Clear and predictable API structure.

---

## **3.2 Naming and Conventions**

**Rules:**

* Use lowercase, hyphenated or underscored paths (no camelCase).
* Keep field names consistent across all APIs (`created_at`, `updated_at`, `status`).
* Pagination parameters must follow a standard convention across the org.

**Outcome:** A uniform API ecosystem.

---

# **4. Versioning and Change Management**

---

## **4.1 Versioning Policy**

**Rules:**

* Public APIs must include a version in the URL or header:

  * `/api/v1/...`
* Never introduce breaking changes inside an existing version.
* Introduce new fields in a backward compatible manner.
* For breaking changes:

  * Create a new version.
  * Support migration.
  * Announce deprecation timelines.

**Outcome:** Clients can evolve without disruption.

---

## **4.2 Deprecation Management**

**Rules:**

* Announce deprecations at least one version ahead.
* Add deprecation headers or logs when endpoints are used.
* Provide migration documentation and examples.

**Outcome:** Smooth transition for all API consumers.

---

# **5. API Contracts and Schemas**

---

## **5.1 Contract Definitions**

**Rules:**

* REST APIs must use OpenAPI or Swagger.
* GraphQL APIs must maintain schema SDL.
* Contracts must match implemented behavior.
* Contracts must be version controlled.

**Outcome:** APIs become self documenting and verifiable.

---

## **5.2 Request and Response Validation**

**Rules:**

* Validate all input rigorously.
* Reject unknown or unexpected fields unless explicitly allowed.
* Standardize enums for statuses and types.
* Include proper field level error messages.

**Outcome:** Predictable API behavior and reduced ambiguity.

---

# **6. Response Standards and Error Handling**

---

## **6.1 Response Envelope**

All APIs must follow a unified response structure:

Success:

```json
{
  "data": { },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

Error:

```json
{
  "error": {
    "code": "string",
    "message": "Human readable message",
    "fields": {
      "field_name": "error detail"
    }
  },
  "request_id": "uuid"
}
```

---

## **6.2 HTTP Status Codes**

**Rules:**

* 2xx: success
* 4xx: client errors
* 5xx: server or internal errors

Use them correctly. Do not overload 200 for failures.

---

# **7. Pagination, Filtering, and Sorting**

---

## **7.1 Pagination**

**Rules:**

* Always paginate list endpoints.
* Use either:

  * `page` and `per_page`, or
  * cursor based pagination
* Never return unbounded lists.

---

## **7.2 Filtering and Sorting**

**Rules:**

* Provide documented filter parameters.
* Validate filter fields.
* Allow only documented sort fields.

---

# **8. Idempotency and Safety**

---

## **8.1 Idempotent Methods**

**Rules:**

* GET must be safe and have no side effects.
* PUT and PATCH should be idempotent whenever possible.
* POST operations that may be retried (payments, external calls, job submission) must:

  * Support idempotency keys.
  * Detect and handle repeat requests.

**Outcome:** API behaves correctly under retries and network failures.

---

# **9. API Security Governance**

This section extends the SDGP "Security First" rules specifically to APIs.

---

## **9.1 Authentication and Authorization**

**Rules:**

* Every API must enforce authentication (OAuth, tokens, JWT, API keys, etc.).
* Authorization must reflect roles and capabilities defined in SDGP.
* Never rely on clients to enforce access rules.

---

## **9.2 Input Validation and OWASP Alignment**

**Rules:**

* Validate query params, headers, bodies.
* Prevent injection (SQL, NoSQL, LDAP, command execution).
* Never expose stack traces or debug metadata to clients.
* Enforce rate limiting for sensitive endpoints.

**Outcome:** APIs do not introduce security weaknesses.

---

## **9.3 Data Exposure Rules**

**Rules:**

* Never expose sensitive internal fields.
* Follow SDGP privacy rules when returning user data.
* Enforce market or country restrictions on fields as needed.

---

# **10. Performance and Reliability**

---

## **10.1 Timeouts and Limits**

**Rules:**

* Apply timeout policies to inbound and outbound API calls.
* Enforce maximum payload sizes.
* Limit concurrency or rate as required.

---

## **10.2 Efficiency**

**Rules:**

* Avoid N+1 database patterns.
* Use caching where appropriate.
* Use asynchronous processing for long running actions.

---

## **10.3 Retries and Circuit Breakers**

**Rules:**

* Internal service calls must use:

  * Retry strategies
  * Circuit breakers
  * Fail fast policies
* External API failures must degrade gracefully.

---

# **11. Logging, Monitoring, and Observability**

This section reinforces SDGP Section 3.3 and 7.3.

---

## **11.1 Request and Response Logging**

Log for audit and debugging:

* Method, path, status code
* Latency
* Actor ID (if authenticated)
* Request ID or correlation ID
* Market or country context

**Rules:**

* Do not log sensitive data (OTP, card numbers, passwords, tokens).
* Use structured logs, typically JSON.

---

## **11.2 Metrics**

Expose per endpoint metrics:

* Request counts
* Success and error rates
* Latency distribution
* Throttling or rate limiting events

---

## **11.3 Tracing**

Where possible:

* Propagate request IDs between services.
* Support distributed tracing tools.

---

# **12. Testing and Contract Validation**

---

## **12.1 Automated Testing Requirements**

**Rules:**

* Unit tests for handlers and core logic.
* Integration tests for end to end flows.
* Negative tests for error handling.
* Security tests for permission enforcement.

---

## **12.2 Contract Tests**

**Rules:**

* Validate API responses against declared contract schemas.
* Prevent unintentional breaking changes.
* Include regression tests for deprecated behavior while still supported.

---

# **13. Documentation and Developer Experience**

---

## **13.1 Documentation Standards**

Every API version must include:

* Endpoint descriptions
* Request schemas
* Response schemas
* Error codes
* Example payloads
* Pagination and filtering rules
* Version history and change logs

---

## **13.2 Developer Experience (DX)**

Provide:

* Quick start guides
* Usage examples per language where relevant
* Sandbox or test environments
* Clear process for obtaining and managing API credentials

---

# **14. Alignment With Main Engineering Governance**

This API Governance Booklet is not standalone.
It must be applied together with:

### **Software Development Governance Handbook (SDGP)**

Referenced sections:

* Security First (SDGP 2.1)
* Permissions and Roles (SDGP 2.2)
* Clean Architecture (SDGP 2.3 to 2.6)
* Data Governance (SDGP 3.x)
* Multi Market Governance (SDGP 4.x)
* Logging and Audit (SDGP 3.3, 7.3)
* Feature Specification Requirements (SDGP 7.1)
* Documentation Discipline (SDGP 8.x)

API decisions must remain fully aligned with SDGP.
When there is ambiguity, SDGP overrides this booklet, except for API specific behaviors defined here.

---

# **15. API Governance Review Checklist**

Use this for API design reviews, code reviews, and release approvals:

* API follows predictable naming and structure
* Proper versioning in place
* No breaking changes introduced without a new version
* Contract or schema documented and validated
* Authentication and authorization enforced
* OWASP risks mitigated
* No sensitive info exposed
* Pagination, filtering, sorting implemented correctly
* Idempotency handled for retry sensitive endpoints
* Logging includes method, status, actor, latency, request ID
* No sensitive data logged
* Metrics and monitoring integrated
* Performance optimized (no N+1, limits enforced)
* Documentation updated for every change
* Product specs updated
* Multi market restrictions enforced where applicable

---

# **16. Sample API Implementation Templates**

These templates provide concrete examples that follow the governance rules. Adjust naming and details to your stack, but keep the structure and ideas.

The examples below use a Laravel style PHP backend. The patterns can be replicated in other frameworks.

---

## **16.1 Response Wrapper Helper**

Centralize success and error responses so all APIs look the same.

**`app/Http/Responses/ApiResponse.php`**

```php
<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ApiResponse
{
    public static function success($data = null, array $meta = [], int $status = 200): JsonResponse
    {
        $requestId = request()->header('X-Request-Id') ?? (string) Str::uuid();

        $defaultMeta = [
            'request_id' => $requestId,
            'timestamp'  => now()->toIso8601String(),
        ];

        return response()->json([
            'data' => $data,
            'meta' => array_merge($defaultMeta, $meta),
        ], $status)->header('X-Request-Id', $requestId);
    }

    public static function error(
        string $code,
        string $message,
        array $fieldErrors = [],
        int $status = 400
    ): JsonResponse {
        $requestId = request()->header('X-Request-Id') ?? (string) Str::uuid();

        return response()->json([
            'error' => [
                'code'    => $code,
                'message' => $message,
                'fields'  => $fieldErrors,
            ],
            'request_id' => $requestId,
        ], $status)->header('X-Request-Id', $requestId);
    }
}
```

Key points:

* Enforces consistent shape for every response.
* Adds `request_id` and `timestamp`.
* Ensures `X-Request-Id` is always present.

---

## **16.2 Validator Pattern (Form Request or Service Validator)**

Use dedicated validator classes instead of inline validation in controllers.

**`app/Http/Requests/Api/CreateUserRequest.php`**

```php
<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization handled by policies or middleware
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'max:255', 'unique:users,email'],
            'country'    => ['required', 'string', 'size:2'],
            'language'   => ['nullable', 'string', 'max:5'],
            'phone'      => ['nullable', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'A user with this email already exists.',
        ];
    }
}
```

This:

* Keeps validation logic in one place.
* Supports field level error messages.
* Outputs validation errors in a predictable structure, which the response wrapper can further standardize via exception handling.

---

## **16.3 Controller Template Using Response Wrapper and Form Request**

Example create endpoint that follows the governance rules.

**`app/Http/Controllers/Api/V1/UserController.php`**

```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CreateUserRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) $request->get('per_page', 20), 100);

        $query = User::query()
            ->when($request->filled('country'), function ($q) use ($request) {
                $q->where('country', $request->get('country'));
            });

        $paginator = $query->paginate($perPage);

        $data = $paginator->items();
        $meta = [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ];

        return ApiResponse::success($data, $meta);
    }

    public function store(CreateUserRequest $request)
    {
        $payload = $request->validated();

        $user = User::create([
            'name'     => $payload['name'],
            'email'    => $payload['email'],
            'country'  => $payload['country'],
            'language' => $payload['language'] ?? 'en',
            'phone'    => $payload['phone'] ?? null,
        ]);

        // Example of logging user action for audit
        activity()
            ->performedOn($user)
            ->causedBy(auth()->user())
            ->withProperties(['country' => $user->country])
            ->log('user.created');

        return ApiResponse::success($user, [], 201);
    }

    public function show(string $id)
    {
        $user = User::find($id);

        if (! $user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found', [], 404);
        }

        return ApiResponse::success($user);
    }
}
```

Key governance points:

* Pagination implemented and bounded.
* Filters are explicit and validated.
* Uniform response structure via `ApiResponse`.
* 404 maps to a proper error payload.
* Audit logging of important actions is present.

---

## **16.4 Global Exception Handler Integration**

Wire validation and domain errors into the standard error wrapper.

In Laravel, update `app/Exceptions/Handler.php`:

```php
public function render($request, Throwable $e)
{
    if ($request->expectsJson()) {
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            $fieldErrors = $e->errors();

            return \App\Http\Responses\ApiResponse::error(
                'VALIDATION_ERROR',
                'The given data was invalid.',
                $fieldErrors,
                422
            );
        }

        if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
            return \App\Http\Responses\ApiResponse::error(
                'ROUTE_NOT_FOUND',
                'The requested endpoint does not exist.',
                [],
                404
            );
        }

        // Generic 500 response
        return \App\Http\Responses\ApiResponse::error(
            'INTERNAL_SERVER_ERROR',
            config('app.debug') ? $e->getMessage() : 'An unexpected error occurred.',
            [],
            500
        );
    }

    return parent::render($request, $e);
}
```

This ensures:

* Validation errors follow the API error structure.
* Unknown routes produce a clean JSON error.
* Internal errors do not leak stack traces in production.

---

## **16.5 Idempotent POST Endpoint Template (Example: Payment)**

Example pattern to implement idempotency.

**`app/Http/Controllers/Api/V1/PaymentController.php`**

```php
public function charge(PaymentRequest $request)
{
    $payload = $request->validated();
    $idempotencyKey = $request->header('Idempotency-Key');

    if (! $idempotencyKey) {
        return ApiResponse::error(
            'IDEMPOTENCY_KEY_REQUIRED',
            'Idempotency-Key header is required for this endpoint.',
            [],
            400
        );
    }

    $existing = \App\Models\IdempotentRequest::where('key', $idempotencyKey)->first();

    if ($existing) {
        // Return previously stored response
        return ApiResponse::success($existing->response_body, [], $existing->status_code);
    }

    // Wrap in transaction or domain service
    try {
        $result = $this->paymentService->chargeUser(
            $payload['user_id'],
            $payload['amount'],
            $payload['currency'],
            $payload['gateway']
        );

        \App\Models\IdempotentRequest::create([
            'key'          => $idempotencyKey,
            'response_body'=> $result,
            'status_code'  => 201,
        ]);

        return ApiResponse::success($result, [], 201);
    } catch (\Throwable $e) {
        // Optionally store failure as well, depending on policy
        return ApiResponse::error(
            'PAYMENT_FAILED',
            'Payment could not be processed.',
            [],
            502
        );
    }
}
```

Governance alignment:

* Explicit requirement and handling of an idempotency key.
* Safe handling of retries.
* Clear error codes.

---

## **16.6 Standard Request Logging Middleware**

Middleware that logs structured API requests without exposing sensitive data.

**`app/Http/Middleware/LogApiRequest.php`**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class LogApiRequest
{
    public function handle(Request $request, Closure $next)
    {
        $requestId = $request->header('X-Request-Id') ?? (string) Str::uuid();
        $request->headers->set('X-Request-Id', $requestId);

        $start = microtime(true);

        /** @var \Symfony\Component\HttpFoundation\Response $response */
        $response = $next($request);

        $durationMs = (int) ((microtime(true) - $start) * 1000);

        // Do not log sensitive bodies. Log high level info only.
        Log::info('api.request', [
            'request_id' => $requestId,
            'method'     => $request->getMethod(),
            'path'       => $request->path(),
            'status'     => $response->getStatusCode(),
            'duration_ms'=> $durationMs,
            'ip'         => $request->ip(),
            'user_id'    => optional($request->user())->id,
            'market'     => $request->header('X-Market') ?? null,
        ]);

        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
```

Key points:

* Ties into audit and observability governance.
* Logs are structured.
* Request ID is consistent across logs and responses.
* No sensitive payload logging.

---

# **End of API Governance Booklet**

These templates are examples. Any implementation must still follow the higher level rules in this booklet and in the Software Development Governance Handbook.
