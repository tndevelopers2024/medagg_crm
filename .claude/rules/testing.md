# Testing & Verification Standards

## 1. Testing Strategy
Given the current stage of the project, we rely heavily on **Integration Testing** and **Manual Verification** rather than granular Unit Tests.

## 2. Automated Scripts
The `backend/scripts/` directory contains vital tools for verification.
- **Data Integrity**: `verify_rating_assignee_filter.js` checks if queries match data.
- **Cleanup**: `delete_leads_by_campaign_id.js` helps reset state.
- **Mock Data**: Use scripts to generate test leads before implementing features.

## 3. Manual Verification Checklist
Before marking a task as "Verified", perform the following:

### Frontend
- [ ] **Responsiveness**: Check UI on Desktop (1440px) and Mobile (375px).
- [ ] **Console Errors**: Open DevTools and ensure no red errors appear during interaction.
- [ ] **Network**: Verify API requests return `200 OK` and payloads match expectations.
- [ ] **State**: Refresh the page to ensure state persists (or resets) correctly.

### Backend
- [ ] **Crash Test**: Ensure the server does not crash on invalid input (`try/catch` usage).
- [ ] **Performance**: Ensure database queries allow for indexing (avoid pure regex on large datasets).
- [ ] **Logs**: Check server logs (PM2 or console) for unhandled warnings.

## 4. Definition of Done
1. Code Implementation Complete.
2. `try/catch` blocks verified.
3. Relevant `task.md` items checked off.
4. User notified with a clear summary of changes.
