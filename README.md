# Express.js Middleware — Complete Notes

## 1. Middleware Execution Order

Express stores middleware and route handlers in an **ordered stack**. They execute in the order they are registered, provided they match the incoming request.

For example, if Middleware 1, Middleware 2, and Middleware 3 are registered in that order, visiting `/` executes them in the same order if each calls `next()` and matches the request.

- `next()` → Passes control to the next matching middleware or route handler in the normal flow.
- `next(err)` → Passes control to error-handling middleware, skipping the remaining normal flow.
- `next("route")` → Skips the remaining handlers of the current route and moves to the next matching route.

You do not specify which middleware executes next; Express manages this automatically.

## 2. Built-in Middleware

Built-in middleware is provided by Express itself.

| Middleware | Purpose |
|---|---|
| `express.json()` | Parses incoming JSON request bodies and makes the data available in `req.body`. |
| `express.urlencoded({ extended: true })` | Parses URL-encoded form data and makes it available in `req.body`. `extended: true` allows rich, nested objects and arrays to be parsed. |
| `express.static("publicxx")` | Serves static files from the `publicxx` folder directly, without requiring separate routes for each file. |

**Example:** If `publicxx` contains `hello.txt`, you can access it at `/hello.txt`, provided the file exists and no earlier middleware or route handles the request first.

## 3. Third-party Middleware

Third-party middleware is installed separately using npm and added to an Express application.

### 3.1 Morgan

Morgan is an HTTP request-logging middleware that logs information about incoming requests and their responses.

| Format | Information logged |
|---|---|
| `morgan("dev")` | Method, URL, status code and response time in a concise development format. |
| `morgan("combined")` | Detailed access logs, including client IP, date/time, method, URL, status, response size and user-agent. |

Both formats can be used for logging, but using both simultaneously produces two log entries for each applicable request.

### 3.2 CORS

CORS (Cross-Origin Resource Sharing) is a browser security mechanism that controls whether frontend JavaScript running on one origin can access responses from another origin.

- `app.use(cors())` enables CORS with the middleware's default configuration.
- CORS is not authentication or authorization.
- CORS does not prevent requests from tools such as Postman or `curl`.

## 4. Application-level Middleware

Application-level middleware is registered using `app.use()` or HTTP route methods such as `app.get()` and `app.post()`.

It can perform tasks such as logging IP addresses, tracking HTTP methods and URLs, validating requests, checking authentication and processing data.

**Example from the code:**

- Middleware 1 logs `req.ip`.
- Middleware 2 logs `req.method` and `req.originalUrl`.
- Both call `next()` to allow the request to continue.

`req.ip` provides the client IP as observed by Express. When the application is behind a proxy, correct IP detection may require configuring `trust proxy` appropriately.

**Important:** Middleware registered using `app.use()` without a path generally applies to all incoming requests that reach it, subject to its position in the stack.

## 5. Validation Middleware

Validation middleware checks incoming request data before allowing a request to continue.

In the example, the middleware reads the age from `req.query.age` and converts it into a number.

- If `age < 18`, it sends the response `become adult to visit` and stops the request flow.
- Otherwise, it calls `next()` to continue processing the request.

Because this middleware is registered globally, it applies to all requests that reach it, not just `/adult`.

**Important:** If `age` is missing or is not a valid number, `Number()` may produce `NaN`. Since `NaN < 18` is false, the current middleware allows that request to continue. Production validation should explicitly reject missing or invalid ages.

## 6. Application-level Middleware on a Specific Path

Middleware can be registered for a particular path using `app.use("/user", ...)`.

In the example:

1. `userMiddleware1` executes first.
2. `userMiddleware2` executes second.
3. Express then continues to the matching route handler if both call `next()`.

The middleware applies to paths beginning with `/user`, such as:

- `/user`
- `/user/123`
- `/user/profile`
- `/user?age=89`

Query strings do not form part of the path match. For example, `/user?age=89` still matches `/user`.

## 7. Route-specific Middleware

Route-specific middleware runs only when a request matches a particular route's HTTP method and path.

Example:

`app.get("/private", checkMiddleware1, checkMiddleware2, handler)`

Execution order:

1. `checkMiddleware1` runs.
2. `checkMiddleware2` runs.
3. The final route handler sends the response.

Route-specific middleware is useful for validating input, checking authentication, verifying permissions and performing other checks required by a particular route.

## 8. `next()` vs `next("route")`

### 8.1 `next()`

Passes control to the next matching middleware or route handler in the normal flow.

For example, two `GET /hero` route handlers are registered in sequence. The first logs `Route 1` and calls `next()`. Express continues to the second matching route handler, which sends `Route 2 response`.

### 8.2 `next("route")`

Skips the remaining callback handlers of the current route and continues searching for the next matching route.

In the `/party` example, `checkMiddleware1` and `checkMiddleware2` are skipped because the first route handler calls `next("route")`.

In the `/user99` example, `Handler 2` is skipped, and the next matching `GET /user99` route sends `Second route`.

**Remember:** `next("route")` is used in route callback handlers, not as the mechanism for skipping routes from middleware registered through `app.use()`.

## 9. Route Handler Chaining

Route handlers can also pass control to other matching route handlers using `next()`.

In the example, the first `GET /hero` route logs `Route 1` and calls `next()`. The second `GET /hero` route then sends the response.

However, if a handler sends a response without calling `next()`, the normal request flow stops. A response should generally be sent only once for a request.

## 10. Error-handling Middleware

Error-handling middleware handles errors passed to Express through `next(err)`.

Its required signature is:

`(err, req, res, next)`

The four parameters must appear in this order so Express can identify it as error-handling middleware.

### Error-handling flow

1. The `/pepsi` route creates an error.
2. `next(err)` passes the error to error-handling middleware.
3. Error middleware 1 logs `Error middleware 1` and calls `next(err)`.
4. Error middleware 2 logs `Error middleware 2` and sends the error message with HTTP status `500`.

### Important correction to the `/pepsi` route

The original route contains both a `try/catch` that calls `next(err)` and a separate `next(new Error(...))` afterward. These are two error-forwarding attempts, not two alternative ways that should both run.

Use just one approach:

```js
app.get("/pepsi", (req, res, next) => {
    next(new Error("Something went wrong"));
});
```

Once an error is forwarded, do not continue executing another error-forwarding statement unnecessarily.

### Centralized error handling

A centralized error-handling middleware is usually registered after all routes. It provides one place to log errors and send consistent error responses.

If an error handler calls `next(err)`, Express searches for the next error-handling middleware. If it sends a response without calling `next(err)`, the error-handling chain stops.

## 11. Asynchronous Middleware and Routes

Asynchronous middleware and route handlers are used when an operation involves `await`, such as a database query or an external API request.

### 11.1 Async middleware

The example awaits `Promise.resolve()` and then calls `next()`.

In real applications, asynchronous middleware may retrieve user information, verify permissions or perform database checks before allowing a request to continue.

### 11.2 Async route handlers

The async `/` route awaits a promise and sends `Hello`.

For asynchronous operations that may fail, errors must be forwarded to error-handling middleware. The `try/catch` pattern with `next(error)` is a suitable approach and works across Express versions.

**Important:** The code also registers another `GET /` route later. Because the earlier `GET /` route sends `Hello` without calling `next()`, the later `GET /` route will not execute for that request.

For Express 4, rejected promises in async middleware and routes generally need explicit error forwarding. Express 5 automatically forwards rejected promises returned by route handlers and middleware to error-handling middleware.

## 12. Important Rules to Remember

| Rule | Explanation |
|---|---|
| Registration order matters | Express processes the applicable stack from top to bottom. |
| `next()` | Continues the normal request flow. |
| `next(err)` | Transfers control to error handling. |
| `next("route")` | Skips remaining callbacks of the current route. |
| `res.send()` / `res.json()` | Sends a response; do not send another response for the same request. |
| `app.use()` | Registers middleware, optionally for a specific path. |
| `app.get()` / `app.post()` | Registers route handlers for specific HTTP methods and paths. |
| Error-handler signature | Must use `(err, req, res, next)`. |
| Middleware order | Middleware must be registered before the routes that need it. |
| Static middleware | Serves existing files; it does not automatically create files or routes for arbitrary data. |
| Validation | Must handle missing, invalid and unexpected input explicitly. |
| Async errors | Ensure rejected promises reach error-handling middleware. |
