import React, { useState } from 'react';
import {
  Star,
  X,
  Heart,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Stethoscope,
  Siren,
  ThumbsUp,
} from 'lucide-react';
import api from '../../services/api';

const APPOINTMENT_TAGS = [
  'Attentive Doctor',
  'Clear Diagnosis',
  'Minimal Wait Time',
  'Clean & Modern Clinic',
  'Caring Support Staff',
  'Detailed Prescription',
  'Felt Listened To',
];

const EMERGENCY_TAGS = [
  'Rapid ER Admission',
  'Immediate Bed Allocation',
  'Life-Saving Response',
  'Empathetic ER Doctors',
  'Prompt ICU Triage',
  'Smooth Ambulance Coordination',
  'Transparent Communication',
];

export const FeedbackModal = ({ isOpen, onClose, onSuccess, target }) => {
  if (!isOpen || !target) return null;

  const isEmergency = target.type === 'EMERGENCY';
  const tagOptions = isEmergency ? EMERGENCY_TAGS : APPOINTMENT_TAGS;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  // Sub-criteria ratings
  const [careQualityRating, setCareQualityRating] = useState(5);
  const [waitTimeRating, setWaitTimeRating] = useState(5);
  const [staffBehaviorRating, setStaffBehaviorRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);

  const [comments, setComments] = useState('');
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const toggleTag = (tag) => {
    const next = new Set(selectedTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    setSelectedTags(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select an overall rating.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        rating,
        careQualityRating,
        waitTimeRating,
        staffBehaviorRating,
        cleanlinessRating,
        comments: comments.trim(),
        tags: Array.from(selectedTags),
        isAnonymous,
        ...(isEmergency
          ? { emergencyRequestId: target.id, organizationId: target.organizationId }
          : { appointmentId: target.id }),
      };

      const res = await api.post('/feedback', payload);

      if (res.data?.success) {
        setSubmittedSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.data);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to submit your feedback. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${isEmergency ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isEmergency ? <Siren className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                {isEmergency ? 'Rate Your Emergency Treatment' : 'Rate Your Consultation'}
              </h3>
              <p className="text-xs text-slate-400">
                {target.organizationName || 'Healthcare Provider'} {target.date ? `• ${target.date}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Splash */}
        {submittedSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-slate-900">Thank You For Your Feedback!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your genuine rating helps {target.organizationName || 'hospitals'} improve clinical quality and helps future patients find accredited care.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Overall Star Rating */}
            <div className="text-center py-2 bg-slate-50 border border-slate-100 rounded-xl">
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                Overall Experience
              </label>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const activeStar = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          activeStar
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-slate-800 mt-1 inline-block">
                {rating === 5 && 'Outstanding • 5.0'}
                {rating === 4 && 'Very Good • 4.0'}
                {rating === 3 && 'Average • 3.0'}
                {rating === 2 && 'Needs Improvement • 2.0'}
                {rating === 1 && 'Unsatisfactory • 1.0'}
              </span>
            </div>

            {/* Criteria Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Medical Care</span>
                  <span className="font-bold text-amber-600">{careQualityRating} ★</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={careQualityRating}
                  onChange={(e) => setCareQualityRating(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Wait Time & Speed</span>
                  <span className="font-bold text-amber-600">{waitTimeRating} ★</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={waitTimeRating}
                  onChange={(e) => setWaitTimeRating(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Staff Behavior</span>
                  <span className="font-bold text-amber-600">{staffBehaviorRating} ★</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={staffBehaviorRating}
                  onChange={(e) => setStaffBehaviorRating(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Cleanliness & Hygiene</span>
                  <span className="font-bold text-amber-600">{cleanlinessRating} ★</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={cleanlinessRating}
                  onChange={(e) => setCleanlinessRating(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Quick Experience Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                What went well? (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tagOptions.map((tag) => {
                  const isSelected = selectedTags.has(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Comments */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Comments (Optional)
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  isEmergency
                    ? 'Describe your emergency triage experience, bed readiness, or doctor responsiveness...'
                    : 'Share details about the diagnosis, follow-up advice, and visit quality...'
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden transition resize-none"
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span className="font-medium">Submit anonymously (hide my name from public review)</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
