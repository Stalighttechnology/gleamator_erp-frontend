
# Requirements: Faculty Dashboard Refactor

## 1. Backend Refactor (Django)
- **Model: FacultyAssignment**:
  - Make \ranch\ field optional or remove strict validation that faculty must belong to the branch of the subject.
- **Model: Student**:
  - Set \proctor\ field to \
ull\ for all students (migration needed).
  - Remove proctor-faculty dependency in assignment logic.
- **API: Dashboard Bootstrap**:
  - Update \aculty_dashboard_bootstrap\ to fetch assignments independent of branch.
  - Update \proctor_students\ count to handle the null proctor state (or remove if proctoring is being phased out).

## 2. Frontend Refactor (React)
- **Faculty Dashboard**:
  - Fix data fetching hooks to handle potential nulls and the new assignment structure.
  - Ensure 'Faculty Stats' and 'Recent Activities' load correctly.
- **Take Attendance**:
  - Update the selection flow: Select Batch -> Select Course/Subject -> Select Section.
  - Remove mandatory 'Branch' selection if present.

## 3. UI/UX Improvements
- Ensure the Faculty Dashboard clearly shows assigned courses and batches.
- Visual confirmation of the 'independent' assignment model.

