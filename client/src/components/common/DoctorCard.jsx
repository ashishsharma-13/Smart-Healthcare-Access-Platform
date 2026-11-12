import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, Award, ChevronRight, User } from 'lucide-react';

export const DoctorCard = ({ doctor }) => {
  const isPresent = Boolean(doctor.currentPresence?.isPresent);
  const orgName = doctor.currentPresence?.organizationId?.name;

  // Resolve initial avatar URL (auto-correct known broken Unsplash ID if present)
  let rawAvatar = doctor.userId?.avatar;
  if (rawAvatar && rawAvatar.includes('1594824813572')) {
    rawAvatar = 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=300&auto=format&fit=crop&q=80';
  }

  const [imgError, setImgError] = useState(false);

  // Generate clean initials for fallback avatar
  const getInitials = (name) => {
    if (!name) return 'DR';
    const parts = name.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const doctorName = doctor.userId?.name || 'Practitioner';
  const qualificationsText = Array.isArray(doctor.qualifications)
    ? doctor.qualifications.join(', ')
    : doctor.qualifications || 'MBBS';

  return (
    <div className="group bg-white border border-slate-200/90 hover:border-brand-300 rounded-xl p-5 shadow-card hover:shadow-elevated transition-all flex flex-col justify-between h-full min-h-[340px]">
      <div>
        {/* Top Header: Avatar + Identity */}
        <div className="flex items-start gap-3.5 mb-3.5">
          {/* Avatar Container with rigid aspect ratio and fallback */}
          <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200/90 bg-slate-100 shadow-2xs">
            {!imgError && rawAvatar ? (
              <img
                src={rawAvatar}
                alt={doctorName}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-brand-50 text-brand-700 flex flex-col items-center justify-center font-bold text-sm tracking-tight border border-brand-200/60">
                <span>{getInitials(doctorName)}</span>
              </div>
            )}

            {/* NMC Validated Stamp */}
            {doctor.verificationStatus === 'verified' && (
              <div
                title="NMC Validated Practitioner"
                className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-xs border border-white"
              >
                <CheckCircle2 className="w-4 h-4 text-presence-600 fill-presence-100" />
              </div>
            )}
          </div>

          {/* Practitioner Core Meta (with strict min-w-0 to prevent text overflow) */}
          <div className="min-w-0 flex-1">
            <h3
              className="font-semibold text-slate-900 text-sm leading-snug truncate group-hover:text-brand-600 transition-colors"
              title={doctorName}
            >
              {doctorName}
            </h3>

            <p className="text-xs font-semibold text-brand-600 truncate mt-0.5">
              {doctor.specialization || 'General Physician'}
            </p>

            <p className="text-[11px] text-slate-500 truncate mt-0.5" title={qualificationsText}>
              {qualificationsText}
            </p>

            {/* Rating and Experience */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                <span>{doctor.rating ? doctor.rating.toFixed(1) : '4.9'}</span>
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="font-medium text-slate-500">{doctor.experienceYears || 5}y exp</span>
            </div>
          </div>
        </div>

        {/* Presence & Availability Status Pill */}
        <div className="mb-3">
          {isPresent ? (
            <div className="px-2.5 py-1.5 rounded-lg bg-presence-50 border border-presence-200/80 text-presence-800 text-[11px] font-medium flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-presence-600 animate-pulse shrink-0" />
              <span className="truncate">
                On-site at <strong className="font-semibold text-presence-900">{orgName || 'Medical Facility'}</strong>
              </span>
            </div>
          ) : (
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span>Available for Scheduled Outpatient</span>
            </div>
          )}
        </div>

        {/* Bio Clamped to 2 lines with consistent min-height for uniform card heights */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {doctor.bio || 'Senior medical consultant specializing in evidence-based clinical diagnostics, outpatient care, and dedicated patient follow-ups.'}
        </p>
      </div>

      {/* Footer / Booking Action - Aligned consistently at bottom */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-600 block font-medium">
            Consultation Fee
          </span>
          <span className="text-sm font-bold text-slate-900">
            ₹{doctor.consultationFee || 500}
          </span>
        </div>

        <Link
          to={`/doctors/${doctor._id}`}
          className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
        >
          <span>Book Slot</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default DoctorCard;
