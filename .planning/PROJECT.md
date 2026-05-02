
# Project: Gleamator ERP Faculty Dashboard Refactor

## High-Level Objective
Decouple Faculty from Branch-specific dependencies and remove Proctor connectivity to allow for a more flexible, independent assignment model.

## Key Requirements
1. **Faculty Independence**: Remove the strict dependency on 'Branch' in Faculty assignments and dashboard data fetching.
2. **Proctor Decoupling**: Make the 'proctor' field null and remove connectivity between faculty and proctor roles in student management.
3. **Dashboard Recovery**: Fix the Faculty Dashboard to ensure data (assignments, attendance) is visible under the new model.
4. **Attendance UI**: Update the 'Take Attendance' feature to show Batch, Course, and Section assigned without requiring a specific Branch context.

## Stack
- **Frontend**: React (Vite)
- **Backend**: Django (DRF)

