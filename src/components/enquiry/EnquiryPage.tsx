// EnquiryPage.tsx
import React, { useState, useEffect } from 'react';
import { Enquiry } from './types';
import { api } from './api';

export const EnquiryPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    course: '',
    branch: '',
    batch: '',
    fee_status: 'pending' as const,
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadEnquiries();
  }, []);

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      const response = await api.getEnquiries();
      if (response.success) {
        setEnquiries(response.data || []);
      }
    } catch (err) {
      setError('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const response = await api.createEnquiry(form);
      if (response.success) {
        setSuccess('Enquiry created successfully');
        setForm({
          name: '',
          phone: '',
          course: '',
          branch: '',
          batch: '',
          fee_status: 'pending',
          notes: '',
        });
        loadEnquiries();
      }
    } catch (err) {
      setError('Failed to create enquiry');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.deleteEnquiry(id);
      loadEnquiries();
    } catch (err) {
      setError('Failed to delete enquiry');
    }
  };

  const handleConvert = async (id: number) => {
    try {
      setError('');
      const response = await api.convertEnquiry(id);
      if (response.success) {
        setSuccess('Enquiry converted to student');
        loadEnquiries();
      }
    } catch (err) {
      setError('Failed to convert enquiry');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Enquiry Management
          </h1>
          <p className="text-slate-600">Create and manage student enquiries</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">New Enquiry</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Student name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="10-digit number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Course *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="e.g., AWS, Python"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Batch
                  </label>
                  <input
                    type="text"
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fee Status
                  </label>
                  <select
                    value={form.fee_status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fee_status: e.target.value as 'paid' | 'pending',
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg transition transform hover:scale-105"
                >
                  Create Enquiry
                </button>
              </form>
            </div>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">Recent Enquiries</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : enquiries.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No enquiries yet</div>
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
                          Fee
                        </th>
                        <th className="px-6 py-3 text-left font-semibold text-slate-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {enquiries.map((enq) => (
                        <tr
                          key={enq.id}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {enq.name}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{enq.course}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {enq.branch || '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {enq.batch || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                enq.fee_status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {enq.fee_status === 'paid' ? '✓ Paid' : '⚠ Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleConvert(enq.id)}
                                disabled={enq.is_converted}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                                  enq.is_converted
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                {enq.is_converted ? 'Converted' : 'Convert'}
                              </button>
                              <button
                                onClick={() => handleDelete(enq.id)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
                              >
                                Delete
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
        </div>
      </div>
    </div>
  );
};

export default EnquiryPage;