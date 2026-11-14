import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Star,
  CheckCircle2,
  ShieldCheck,
  Heart,
  MessageSquare,
  ThumbsUp,
  Sparkles,
  Filter,
  User,
  Loader2,
  Clock,
  Sparkle,
} from 'lucide-react';

export const ReviewsSection = ({
  targetType = 'doctor', // 'doctor' | 'organization'
  targetId,
  targetName = '',
  initialRating = 4.8,
  initialTotalReviews = 0,
  compact = false,
}) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    averageRating: initialRating,
    totalReviews: initialTotalReviews,
    careQualityAvg: 0,
    waitTimeAvg: 0,
    staffBehaviorAvg: 0,
    cleanlinessAvg: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (targetId) {
      fetchReviews(1, true);
    } else {
      setLoading(false);
    }
  }, [targetId, targetType]);

  const fetchReviews = async (pageNum = 1, reset = false) => {
    if (!targetId) return;
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const endpoint =
        targetType === 'doctor'
          ? `/feedback/doctor/${targetId}`
          : `/feedback/organization/${targetId}`;

      const res = await api.get(endpoint, {
        params: { page: pageNum, limit: compact ? 4 : 8 },
      });

      if (res.data?.success) {
        const fetchedList = res.data.data || [];
        setReviews((prev) => (reset ? fetchedList : [...prev, ...fetchedList]));
        setPage(res.data.page || pageNum);
        setTotalPages(res.data.totalPages || 1);

        if (res.data.stats && (res.data.total > 0 || res.data.stats.totalReviews > 0)) {
          setStats(res.data.stats);
        } else if (res.data.total === 0) {
          setStats({
            averageRating: 0,
            totalReviews: 0,
            careQualityAvg: 0,
            waitTimeAvg: 0,
            staffBehaviorAvg: 0,
            cleanlinessAvg: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch reviews:', err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchReviews(page + 1, false);
    }
  };

  // Filter reviews client-side by star rating
  const displayedReviews =
    filterRating === 'all'
      ? reviews
      : reviews.filter((r) => Math.round(r.rating) === Number(filterRating));

  const totalReviewsCount = stats.totalReviews || reviews.length;
  const avgRatingDisplay =
    stats.averageRating > 0
      ? Number(stats.averageRating).toFixed(1)
      : totalReviewsCount > 0
      ? Number(initialRating || 5.0).toFixed(1)
      : '0.0';

  const renderStars = (rating = 5, sizeClass = 'w-4 h-4') => {
    const rounded = Math.round(rating);
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rounded
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-200 fill-slate-100'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent visit';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent visit';
    }
  };

  return (
    <div className={`space-y-4 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 leading-tight">
              Patient Reviews & Ratings
            </h3>
            <p className="text-[11px] text-slate-500">
              Verified clinical consultations and emergency treatment feedback
            </p>
          </div>
        </div>

        {totalReviewsCount > 0 && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Verified Visits</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs text-slate-500 font-medium">Loading patient feedback...</span>
        </div>
      ) : totalReviewsCount === 0 ? (
        /* Empty State */
        <div className="p-6 sm:p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-100">
            <Star className="w-6 h-6 fill-amber-300 text-amber-400" />
          </div>
          <div className="max-w-xs mx-auto space-y-1">
            <h4 className="text-xs sm:text-sm font-black text-slate-800">
              No Patient Reviews Yet
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Reviews and verified feedback for {targetName || 'this healthcare profile'} will appear here automatically after patients complete their appointments or emergency care.
            </p>
          </div>
        </div>
      ) : (
        /* Ratings Summary & Breakdown */
        <div className="space-y-4">
          <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/40 via-white to-blue-50/30 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Overall Score Box */}
              <div className="sm:col-span-4 text-center sm:text-left sm:border-r border-slate-200 sm:pr-4 space-y-1">
                <div className="flex items-baseline justify-center sm:justify-start space-x-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {avgRatingDisplay}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
                </div>
                <div className="flex justify-center sm:justify-start">
                  {renderStars(Number(avgRatingDisplay), 'w-4 h-4')}
                </div>
                <p className="text-[11px] font-semibold text-slate-600">
                  Based on {totalReviewsCount} verified {totalReviewsCount === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              {/* Sub-Metrics Breakdown */}
              <div className="sm:col-span-8 grid grid-cols-2 gap-2 text-xs">
                {stats.careQualityAvg > 0 && (
                  <div className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Care Quality</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {Number(stats.careQualityAvg).toFixed(1)}
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
                    </span>
                  </div>
                )}
                {stats.staffBehaviorAvg > 0 && (
                  <div className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Staff Behavior</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {Number(stats.staffBehaviorAvg).toFixed(1)}
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
                    </span>
                  </div>
                )}
                {stats.cleanlinessAvg > 0 && (
                  <div className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Cleanliness</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {Number(stats.cleanlinessAvg).toFixed(1)}
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
                    </span>
                  </div>
                )}
                {stats.waitTimeAvg > 0 && (
                  <div className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[11px]">Wait Time</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      {Number(stats.waitTimeAvg).toFixed(1)}
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Star Filter Pills */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setFilterRating('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  filterRating === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({totalReviewsCount})
              </button>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = stats.distribution?.[stars] || 0;
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setFilterRating(stars)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      filterRating === stars
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{stars}★</span>
                    {count > 0 && <span className="opacity-75">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Review Cards */}
          <div className="space-y-3">
            {displayedReviews.length === 0 ? (
              <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                No reviews found matching this filter.
              </div>
            ) : (
              displayedReviews.map((rev, idx) => (
                <div
                  key={rev._id || idx}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 hover:border-slate-300 transition"
                >
                  {/* Review Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {rev.patientAvatar ? (
                          <img
                            src={rev.patientAvatar}
                            alt=""
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span>
                            {(rev.patientName || 'VP')
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-xs">
                            {rev.patientName || 'Verified Patient'}
                          </h4>
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {rev.feedbackType === 'EMERGENCY'
                              ? 'Emergency Treatment'
                              : 'Outpatient Visit'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {renderStars(rev.rating, 'w-3.5 h-3.5')}
                      <span className="text-xs font-bold text-slate-800 ml-1">
                        {Number(rev.rating).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Review Comments */}
                  {rev.comments && (
                    <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                      "{rev.comments}"
                    </p>
                  )}

                  {/* Tags Badges */}
                  {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {rev.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 flex items-center gap-1"
                        >
                          <Sparkle className="w-2.5 h-2.5 text-amber-500" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Sub-ratings Breakdown pills */}
                  <div className="pt-2 border-t border-slate-50 flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
                    {rev.careQualityRating && (
                      <span>Care: <b className="text-slate-700">{rev.careQualityRating}★</b></span>
                    )}
                    {rev.waitTimeRating && (
                      <span>Wait: <b className="text-slate-700">{rev.waitTimeRating}★</b></span>
                    )}
                    {rev.staffBehaviorRating && (
                      <span>Staff: <b className="text-slate-700">{rev.staffBehaviorRating}★</b></span>
                    )}
                    {rev.cleanlinessRating && (
                      <span>Cleanliness: <b className="text-slate-700">{rev.cleanlinessRating}★</b></span>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Load More Button */}
            {page < totalPages && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading more reviews...</span>
                    </>
                  ) : (
                    <span>View More Reviews</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;