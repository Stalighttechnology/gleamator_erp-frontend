import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, Send } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../hooks/use-toast';
import { raiseIssue } from '../../utils/hms_api';

interface RaiseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: number;
  roomName?: string;
  onSuccess?: () => void;
}

const RaiseIssueModal = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  onSuccess
}: RaiseIssueModalProps) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an issue title',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter issue description',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await raiseIssue({
        title: formData.title,
        description: formData.description,
        room: roomId
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Issue raised successfully. We will address it soon.',
          variant: 'default'
        });
        setFormData({ title: '', description: '' });
        onClose();
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to raise issue',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error raising issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to raise issue',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className={`relative w-full max-w-md rounded-xl shadow-2xl p-6 ${
          theme === 'dark' ? 'bg-slate-800' : 'bg-white'
        }`}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'hover:bg-slate-700 text-gray-400 hover:text-gray-200'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className={`text-2xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Raise an Issue
          </h2>
          {roomName && (
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Room: {roomName}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Issue Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Broken window, Water leakage"
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the issue in detail..."
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
            />
          </div>

          {/* Info Box */}
          <div className={`flex gap-2 p-3 rounded-lg ${
            theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`} />
            <p className={`text-sm ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
            }`}>
              Our hostel team will review your issue and work on resolving it within 2 days.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Raise Issue
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default RaiseIssueModal;
