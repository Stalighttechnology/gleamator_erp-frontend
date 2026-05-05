export const normalizeStudents = (res: any): any[] => {
  try {
    if (!res) return [];
    // Handle paginated DRF-like wrapper: { count, results: { success:true, data: [...] } }
    if (res.results && res.results.data && Array.isArray(res.results.data)) return res.results.data;
    // Case 1: direct array
    if (Array.isArray(res)) return res;
    // Case 2: res.data is array
    if (res.data && Array.isArray(res.data)) return res.data;
    // Case 3: res.data.students
    if (res.data && Array.isArray(res.data.students)) return res.data.students;
    // Case 4: top-level students
    if (Array.isArray((res as any).students)) return (res as any).students;
    return [];
  } catch (e) {
    console.error('normalizeStudents error', e, res);
    return [];
  }
};

export default normalizeStudents;
