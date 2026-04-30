// StudentStatus.tsx
import React, { useState, useEffect } from 'react';
import { StudentProgress } from './types';
import { api } from './api';

export const StudentStatus: React.FC = () => {
  const [student, setStudent] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getStudentProgress();
      if (response.success && response.data) {
        setStudent(response.data as StudentProgress);
      } else {
        setError('Unable to load your profile');
      }
    } catch (err) {
      setError('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">No Profile Found</h1>
            <p className="text-slate-600">{error || 'Contact your center for assistance'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = student.status === 'completed';
  const isPaidFee = student.fee_status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Your Profile
          </h1>
          <p className="text-slate-600">View your course and completion status</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Section with Gradient */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-12">
            <h2 className="text-3xl font-bold text-white mb-2">{student.student_name}</h2>
            <p className="text-violet-100">Student Profile</p>
          </div>

          {/* Content Section */}
          <div className="p-8">
            {/* Course Information */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-6">
                Course Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">📚</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">Course</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {student.course}
                    </p>
                  </div>
                </div>

                {student.branch && (
                  <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🏢</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600">Branch</p>
                      <p className="text-lg font-semibold text-slate-900 mt-1">
                        {student.branch}
                      </p>
                    </div>
                  </div>
                )}

                {student.batch && (
                  <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📅</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600">Batch</p>
                      <p className="text-lg font-semibold text-slate-900 mt-1">
                        {student.batch}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Information */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-6">
                Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Completion Status */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                  <p className="text-sm font-medium text-slate-600 mb-3">
                    Course Completion
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                        isCompleted
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}
                    >
                      {isCompleted ? '✓' : '⏳'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Status</p>
                      <p
                        className={`text-lg font-bold ${
                          isCompleted ? 'text-blue-600' : 'text-yellow-600'
                        }`}
                      >
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fee Status */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                  <p className="text-sm font-medium text-slate-600 mb-3">Fee Payment</p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                        isPaidFee
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {isPaidFee ? '✓' : '⚠'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Status</p>
                      <p
                        className={`text-lg font-bold ${
                          isPaidFee ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isPaidFee ? 'Paid' : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
              <h4 className="font-semibold text-slate-900 mb-3">Summary</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span>Your course is <strong>{student.course}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">
                    {isCompleted ? '✓' : '⏳'}
                  </span>
                  <span>
                    Completion status: <strong>{isCompleted ? 'Completed' : 'In Progress'}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">
                    {isPaidFee ? '✓' : '⚠'}
                  </span>
                  <span>
                    Fee status: <strong>{isPaidFee ? 'Paid' : 'Pending'}</strong>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-8 py-4">
            <p className="text-xs text-slate-600 text-center">
              Last updated: {new Date(student.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Contact Card */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Need Help?</h3>
          <p className="text-slate-600 text-sm mb-4">
            If you have any questions about your course or status, please contact your center manager.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentStatus;