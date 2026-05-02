
# Roadmap: Faculty Dashboard Refactor

## Milestone 1: Architectural Decoupling
### Phase 1: Context & Data Model Audit
- [ ] Audit all \FacultyAssignment\ and \Student\ usages in the backend.
- [ ] Research frontend impact of removing \ranch\ from dashboard queries.

### Phase 2: Backend Structural Changes
- [ ] Create Django migration to make \ranch\ optional in \FacultyAssignment\.
- [ ] Create Django migration to nullify \proctor\ in \Student\.
- [ ] Update \FacultyAssignment.clean()\ and validation logic.

### Phase 3: API & Dashboard Update
- [ ] Refactor \aculty_dashboard_bootstrap\ view.
- [ ] Update frontend \aculty_api.ts\ and \FacultyDashboard.tsx\.
- [ ] Fix 'Take Attendance' selection flow.

### Phase 4: Verification & UI Polish
- [ ] Verify attendance marking works under the new model.
- [ ] Ensure all proctor-related UI elements are removed or updated.


### Phase 5: Faculty Leave Persistence & Status Fix

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 4
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 5 to break down)
