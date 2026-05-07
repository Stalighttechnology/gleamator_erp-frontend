// AdminOverview.tsx
import React, { useState, useEffect } from 'react';
import { StudentProgress } from './types';
import { api } from './api';

export const AdminOverview: React.FC = () => {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    course: '',
    branch: '',
    batch: '',
    status: '',
  });

  const courses = Array.from(
    new Set(students.map((s) => s.course).filter(Boolean))
  );
  const branches = Array.from(
    new Set(students.map((s) => s.branch).filter(Boolean))
  );
  const batches = Array.from(
    new Set(students.map((s) => s.batch).filter(Boolean))
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [students, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.getProgress();
      if (response.success) {
        setStudents(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = students;

    if (filters.course) {
      filtered = filtered.filter((s) => s.course === filters.course);
    }
    if (filters.branch) {
      filtered = filtered.filter((s) => s.branch === filters.branch);
    }
    if (filters.batch) {
      filtered = filtered.filter((s) => s.batch === filters.batch);
    }
    if (filters.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    setFilteredStudents(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const stats = {
    total: students.length,
    completed: students.filter((s) => s.status === 'completed').length,
    notCompleted: students.filter((s) => s.status === 'pending').length,
    feePending: students.filter((s) => s.fee_status === 'pending').length,
    feeHalfPaid: students.filter((s) => s.fee_status === 'half_paid').length,
  };

  const completionRate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Center Performance Dashboard
          </h1>
          <p className="text-slate-600">Monitor all student activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-600">Total Students</p>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-600">Completed</p>
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-600">Not Completed</p>
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.notCompleted}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-600">Fee Pending</p>
              <span className="text-2xl">⚠</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.feePending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-600">Half Paid</p>
              <span className="text-2xl">◐</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.feeHalfPaid}</p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Completion Rate</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 min-w-fit">
              {completionRate}%
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Course
              </label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">All Courses</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Branch
              </label>
              <select
                value={filters.branch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Batch
              </label>
              <select
                value={filters.batch}
                onChange={(e) => handleFilterChange('batch', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              Students {filteredStudents.length !== students.length && `(${filteredStudents.length})`}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No students match filters</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Fee Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {student.student_name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{student.course}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {student.branch || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {student.batch || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            student.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {student.status === 'completed'
                            ? '✓ Completed'
                            : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            student.fee_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : student.fee_status === 'half_paid'
                                ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {student.fee_status === 'paid'
                            ? '✓ Paid'
                            : student.fee_status === 'half_paid'
                              ? '◐ Half Paid'
                            : '⚠ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Read-only view • No edit permissions
        </p>
      </div>
    </div>
  );
};

export default AdminOverview;
