import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { StudentProgress } from './types';
import { api } from './api';

export const CompletionPage: React.FC = () => {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [selectedFeeStatus, setSelectedFeeStatus] = useState<'pending' | 'half_paid' | 'paid'>('pending');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [modalMode, setModalMode] = useState<'complete' | 'edit'>('complete');
  const [saving, setSaving] = useState(false);

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

  const openModal = (student: StudentProgress, mode: 'complete' | 'edit') => {
    setModalMode(mode);
    setSelectedStudent(student);
    setSelectedFeeStatus((student.fee_status as 'pending' | 'half_paid' | 'paid') || 'pending');
    setSelectedCourse(student.course || '');
    setSelectedBranch(student.branch || '');
    setSelectedBatch(student.batch || '');
  };

  const handleToggleCompletion = async (student: StudentProgress) => {
    if (student.status === 'completed') {
      try {
        setError('');
        setSuccess('');
        const response = await api.updateProgress(student.id, { status: 'pending' });
        if (response.success) {
          setSuccess('Status updated successfully');
          loadProgress();
        }
      } catch (err) {
        setError('Failed to update status');
      }
      return;
    }
    openModal(student, 'complete');
  };

  const handleConfirmComplete = async () => {
    if (!selectedStudent) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await api.updateProgress(selectedStudent.id, {
        status: 'completed',
        fee_status: selectedFeeStatus,
        course: selectedCourse,
        branch: selectedBranch || null,
        batch: selectedBatch || null,
      });
      if (response.success) {
        setSuccess('Completion and details updated successfully');
        setSelectedStudent(null);
        loadProgress();
      }
    } catch (err) {
      setError('Failed to update completion');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await api.updateProgress(selectedStudent.id, {
        fee_status: selectedFeeStatus,
        course: selectedCourse,
        branch: selectedBranch || null,
        batch: selectedBatch || null,
      });
      if (response.success) {
        setSuccess('Student details updated successfully');
        setSelectedStudent(null);
        loadProgress();
      }
    } catch (err) {
      setError('Failed to update student details');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'completed'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-yellow-100 text-yellow-700';
  };

  const getFeeColor = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700';
    if (status === 'half_paid') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Course Completion Tracking
          </h1>
          <p className="text-slate-600">Update and monitor student progress</p>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-600 mb-1">Total Students</p>
            <p className="text-3xl font-bold text-slate-900">{students.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-blue-600">{students.filter((s) => s.status === 'completed').length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-600 mb-1">Fee Pending</p>
            <p className="text-3xl font-bold text-red-600">{students.filter((s) => s.fee_status === 'pending').length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-600 mb-1">Half Paid</p>
            <p className="text-3xl font-bold text-amber-600">{students.filter((s) => s.fee_status === 'half_paid').length}</p>
          </div>
        </div>

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
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Student Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Course</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Branch</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Batch</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Fee Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">{student.student_name}</td>
                      <td className="px-6 py-4 text-slate-600">{student.course}</td>
                      <td className="px-6 py-4 text-slate-600">{student.branch || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{student.batch || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(student.status)}`}>
                          {student.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getFeeColor(student.fee_status)}`}>
                          {student.fee_status === 'paid' ? '✓ Paid' : student.fee_status === 'half_paid' ? '◐ Half Paid' : '⚠ Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleCompletion(student)}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                              student.status === 'completed'
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {student.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                          </button>
                          <button
                            onClick={() => openModal(student, 'edit')}
                            className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
                            title="Edit fee/course/branch/batch"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {modalMode === 'complete' ? 'Mark as Complete' : 'Edit Student Progress'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Update details for <span className="font-semibold">{selectedStudent.student_name}</span>.
            </p>

            <label className="block text-sm font-medium text-slate-700 mb-2">Course</label>
            <input value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 mb-3" />

            <label className="block text-sm font-medium text-slate-700 mb-2">Branch</label>
            <input value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 mb-3" />

            <label className="block text-sm font-medium text-slate-700 mb-2">Batch</label>
            <input value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 mb-3" />

            <label className="block text-sm font-medium text-slate-700 mb-2">Fee Status</label>
            <select value={selectedFeeStatus} onChange={(e) => setSelectedFeeStatus(e.target.value as 'pending' | 'half_paid' | 'paid')} className="w-full px-4 py-2 rounded-lg border border-slate-300">
              <option value="pending">Pending</option>
              <option value="half_paid">Half Paid</option>
              <option value="paid">Paid</option>
            </select>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setSelectedStudent(null)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700" disabled={saving}>Cancel</button>
              <button onClick={modalMode === 'complete' ? handleConfirmComplete : handleSaveEdit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white" disabled={saving}>
                {saving ? 'Saving...' : modalMode === 'complete' ? 'Save & Complete' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletionPage;
