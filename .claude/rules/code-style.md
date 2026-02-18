# Code Style Guidelines

## 1. General Principles
- **Clarity over Cleverness**: Write code that is easy to read and debug.
- **DRY (Don't Repeat Yourself)**: Extract common logic into `utils` or custom hooks.
- **Early Returns**: Use guard clauses to reduce nesting depth.

## 2. JavaScript / Node.js
- **Variables**: Use `const` by default, `let` only when reassignment is necessary. Never use `var`.
- **Async/Await**: Prefer `async/await` over raw Promises (`.then`).
- **Error Handling**: 
  - Controllers **MUST** wrap logic in `try/catch` blocks.
  - API errors should return standardized JSON: `{ error: "Message", details: ... }`.
- **Module System**: use existing `require` (CommonJS) for backend. Do not mix `import` and `require` in backend unless migrating file-by-file.

## 3. React (Frontend)
- **Functional Components**: All new components must be Functional Components using Hooks.
- **Hooks Rules**:
  - Only call hooks at the top level.
  - Thoroughly check dependency arrays in `useEffect` and `useMemo`.
- **Naming**:
  - Components: `PascalCase` (e.g., `LeadFilters.jsx`).
  - Functions/Variables: `camelCase` (e.g., `fetchLeads`).
  - Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PAGE_SIZE`).
- **Props**: Use prop destructuring in the function signature.

## 4. CSS / Styling
- **Tailwind CSS**: 
  - Use utility classes primarily.
  - Avoid large `style={{}}` inline objects; use strict Tailwind classes.
  - **Ordering**: Layout → Box Model → Typography → Visuals → Misc (e.g., `flex justify-center p-4 text-sm bg-white`).
- **Modals**: Use Headless UI `Dialog` components for accessibility.

## 5. File Organization
- **Backend**:
  - Group controllers by resource (e.g., `leadController.js`).
  - Keep models singular (e.g., `Lead.js`).
- **Frontend**:
  - Page-specific sub-components should satisfy: `src/pages/[Feature]/components/`.
  - Shared components go in `src/components/`.
