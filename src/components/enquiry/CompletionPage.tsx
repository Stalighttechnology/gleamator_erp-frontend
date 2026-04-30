// CompletionPage.tsx
import React, { useState, useEffect } from 'react';
import { StudentProgress } from './types';
import { api } from './api';

export const CompletionPage: React.FC = () => {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await api.getProgress();
      if (response.success) {
        setStudents(response.data || []);
      }
    } catch (err) {
      setError('Failed to load student progress');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (id: number) => {
    try {
      setError('');
      setSuccess('');
      const response = await api.toggleCompletion(id);
      if (response.success) {
        setSuccess('Status updated successfully');
        loadProgress();
      }
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'completed'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-yellow-100 text-yellow-700';
  };

  const getFeeColor = (status: string) => {
    return status === 'paid'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Course Completion Tracking
          </h1>
          <p className="text-slate-600">Update and monitor student progress</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
            <p className="text-green-700 font-medium">{success}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-slate-900">{students.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-blue-600">
                  {students.filter((s) => s.status === 'completed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Fee Pending</p>
                <p className="text-3xl font-bold text-red-600">
                  {students.filter((s) => s.fee_status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚠</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Student Progress</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No students yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Student Name
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
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student) => (
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
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            student.status
                          )}`}
                        >
                          {student.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getFeeColor(
                            student.fee_status
                          )}`}
                        >
                          {student.fee_status === 'paid' ? '✓ Paid' : '⚠ Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleCompletion(student.id)}
                          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                            student.status === 'completed'
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {student.status === 'completed'
                            ? 'Mark Pending'
                            : 'Mark Complete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompletionPage;