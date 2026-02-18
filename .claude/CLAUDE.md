# MedAgg Project Instructions

## 1. Project Overview
MedAgg is a comprehensive Lead Management System designed for high-volume healthcare operations. It orchestrates the entire lead lifecycle from ingestion (Facebook, Manual) to assignment, processing, and closure.

- **Primary Goal**: Efficiently manage patient leads, optimize caller workflows, and provide real-time analytics for admins.
- **Key Architectures**: Monorepo-style structure (Backend API + React Frontend + Caller App).
- **Core Integrations**: Meta Graph API, Socket.IO (Real-time), MongoDB Atlas.

## 2. Environment Setup
- **Node Version**: v18+ Recommended.
- **Package Manager**: `npm` for backend, `npm`/`yarn` for frontend.

### Commands
- **Backend**:
  - `cd backend && npm start`: Production server.
  - `cd backend && npm run dev`: Development server (nodemon).
- **Frontend**:
  - `cd frontend && npm run dev`: Vite development server.
  - `cd frontend && npm run build`: Production build.

## 3. Architecture Guidelines
The project follows a standard MVC pattern in the backend and a Component-based architecture in the frontend.

### Backend Structure
- **Controllers (`/controllers`)**: Handle business logic. Return JSON responses.
- **Routes (`/routes`)**: Define endpoints and apply middleware.
- **Models (`/models`)**: Mongoose schemas with strict typing where possible.
- **Services (`/services`)**: Background jobs (e.g., Meta Sync) and complex integrations.

### Frontend Structure
- **Pages (`/pages`)**: Route-level components. Logic heavy.
- **Components (`/components`)**: Reusable UI elements. Presentational.
- **Utils (`/utils`)**: Stateless helper functions and API wrappers.
- **Contexts (`/contexts`)**: Global state (Auth, Sockets).

## 4. Documentation & Rules
Refer to the `rules/` directory for specific standards:
- [Code Style](./rules/code-style.md): Naming conventions, component patterns, and linting.
- [Testing](./rules/testing.md): Verification strategies, manual testing checklists, and script usage.
- [Security](./rules/security.md): Auth flows, RBAC, and data protection.
