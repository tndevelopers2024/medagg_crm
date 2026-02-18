# Security Requirements

## 1. Authentication & Authorization
- **JWT**: All protected routes must verify the JSON Web Token.
- **Middleware**:
  - `protect`: Verifies the token existence and validity.
  - `authorize(...roles)`: Enforces Role-Based Access Control (RBAC).

## 2. Access Control Levels
- **Admin**: Full access to all endpoints, including deletion and configuration.
- **SuperAdmin / Owner**: Can perform dangerous system-wide actions (e.g., bulk wipes).
- **Caller**:
  - Read: Only assigned leads.
  - Write: Only status updates/notes on assigned leads.
  - **No Delete**: Callers must NEVER have delete permissions.

## 3. Data Protection
- **Sanitization**: All inputs in controllers must be validated.
- **Mongo Injection**: Use Mongoose object queries instead of raw raw objects where keys are user-controlled.
- **Sensitive Data**: Passwords must be hashed (bcrypt) before storage. Never return passwords in API responses.

## 4. Environment Security
- **Config**: Secrets (API Keys, DB URIs) must stay in `.env`.
- **Git**: Ensure `.env` is in `.gitignore`.
- **Logs**: Do not log PII (Personal Identifiable Information) or Auth Tokens in production logs.

## 5. Deployment
- **CORS**: Restrict CORS to specific frontend domains in production.
- **Rate Limiting**: Apply `express-rate-limit` to public endpoints (like `/intake` or `/login`) to prevent brute force.
