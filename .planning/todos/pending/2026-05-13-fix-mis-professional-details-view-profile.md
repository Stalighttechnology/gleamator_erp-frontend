---
created: 2026-05-13T07:49:46+05:30
title: Fix MIS professional details missing in User Management View Profile popup
area: api
files:
  - gleamator_erp-backend/django_backend/api/views/safe/admin_views.py:900-971
  - gleamator_erp-backend/django_backend/api/views/safe/admin_views.py:1183-1307
  - gleamator_erp-backend/django_backend/api/views/profile_views.py:36-434
  - src/components/admin/UsersManagement.tsx:700-729
  - src/utils/admin_api.ts:602-650
---

## Problem

When clicking the "View" (👁️) button on a MIS user in User Management → the View Profile popup opens, but the **Professional Details tab** shows all fields as `—` (empty) for MIS users.

Counselor (HOD) and other roles (Faculty, Student) work correctly.

### Root Cause (identified via code audit)

The `handleViewUser` function in `UsersManagement.tsx` (line 700–729) calls:

```ts
const response = await manageAdminProfile({ user_id: user.id.toString() }, "GET");
// → GET /admin/profile/{user_id}/
```

This hits `manageAdminProfile` view in `admin_views.py` (line 1183–1307).

**The `manageAdminProfile` view only returns basic User fields:**
```python
return Response({
    'success': True,
    'profile': {
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'mobile_number': ...,
        'address': ...,
        'bio': ...,
        # ← NO hod_profile fields! No blood_group, joining_date, employment_type, access_level, etc.
    }
})
```

There is **no role-based HODProfile lookup** in this admin view — unlike `manage_profile` in `profile_views.py` (lines 109–130) which correctly handles `user.role in ['hod', 'mis']` and fetches `user.hod_profile`.

### Why HOD "appears to work"

Both HOD and MIS users share `HODProfile`. However, the popup likely shows the same empty result for HOD as well — the bug was just noticed for MIS because the `Professional Details` section is only validated for MIS in the UI.

### Additional gap: `extra` field not mapped

The frontend (`UsersManagement.tsx` line 717) reads `extra: p.extra` — but `manageAdminProfile` backend response has no `extra` field at all. The popup reads `user.extra?.blood_group`, `user.extra?.joining_date` etc., all of which are `undefined`.

Compare: the `user_directory` API (admin_views.py line 900–971) populates `extra` **only for students and teachers (and HOD managed_branch)** — but not HODProfile professional fields for HOD/MIS.

## Solution

**Option A (Recommended — minimal and clean fix):**

In `admin_views.py` → `manageAdminProfile` GET handler, add role-based profile lookup **before building the response**:

```python
elif request.method == 'GET':
    profile = {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'mobile_number': user.mobile_number or '',
        'address': user.address or '',
        'bio': user.bio or '',
        'role': user.role,
        'username': user.username,
        'is_active': user.is_active,
        'profile_picture': user.profile_picture.url if user.profile_picture else None,
    }
    # Inject role-specific professional fields into 'extra'
    extra = {}
    if user.role in ['hod', 'mis']:
        try:
            hod = user.hod_profile
            extra = {
                'department': hod.department,
                'designation': hod.designation,
                'qualification': hod.qualification,
                'experience_years': hod.experience_years,
                'office_location': hod.office_location,
                'office_hours': hod.office_hours,
                'joining_date': str(hod.joining_date) if hod.joining_date else None,
                'employment_type': hod.employment_type,
                'staff_status': hod.staff_status,
                'blood_group': hod.blood_group,
                'access_level': hod.access_level,
                'work_shift': hod.work_shift,
                'managed_departments': hod.managed_departments,
                'assigned_batches': hod.assigned_batches,
                'reporting_faculty_count': hod.reporting_faculty_count,
            }
            if hod.profile_picture:
                profile['profile_picture'] = hod.profile_picture.url
        except HODProfile.DoesNotExist:
            pass  # No profile yet
    elif user.role == 'teacher':
        try:
            faculty = user.faculty_profile
            extra = {
                'department': faculty.department,
                'designation': faculty.designation,
                'qualification': faculty.qualification,
                'branch': faculty.branch.name if faculty.branch else None,
                'branch_id': faculty.branch.id if faculty.branch else None,
                'experience_years': faculty.experience_years,
                'office_location': faculty.office_location,
                'office_hours': faculty.office_hours,
                'joining_date': str(faculty.joining_date) if faculty.joining_date else None,
                'employment_type': faculty.employment_type,
                'faculty_status': faculty.faculty_status,
                'blood_group': faculty.blood_group,
            }
        except Exception:
            pass
    elif user.role == 'student':
        try:
            student = user.student_profile
            extra = {
                'usn': student.usn,
                'branch': student.branch.name if student.branch else None,
                'blood_group': student.blood_group,
                'parent_name': student.parent_name,
                'parent_contact': student.parent_contact,
                'emergency_contact': student.emergency_contact,
            }
        except Exception:
            pass
    profile['extra'] = extra
    return Response({'success': True, 'profile': profile})
```

Also import `HODProfile`, `FacultyProfile`, `Student` at the top of `admin_views.py` (if not already).

**Option B (Alternative — reuse `manage_profile` endpoint):**
Change `handleViewUser` in frontend to call `manage_profile` API (which already handles MIS correctly via `profile_views.py`) instead of `manageAdminProfile`. But this requires admin impersonation/auth token swap which is more complex.

**Option A is the right fix.** No UI changes needed.

## Verification Steps

1. After fix: open User Management → click View on a MIS user
2. Go to Professional Details tab
3. Confirm Blood Group, Joining Date, Employment Type, Access Level, Work Shift are populated
4. Confirm HOD users still work correctly
5. Confirm Faculty/Student views still work
6. Test with MIS users who have never saved profile → should gracefully return empty `extra: {}`
```
