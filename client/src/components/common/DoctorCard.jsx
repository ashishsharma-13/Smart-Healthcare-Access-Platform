import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, MapPin, Calendar, Clock, Award } from 'lucide-react';

export const DoctorCard = ({ doctor }) => {
  const isPresent = doctor.currentPresence?.isPresent;
  const orgName = doctor.currentPresence?.organizationId?.name;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all hover:border-blue-200 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <img
                src={
                  doctor.userId?.avatar ||
                  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                }
                alt={doctor.userId?.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-xs"
              />
              {doctor.verificationStatus === 'verified' && (
                <div
                  title="Verified Healthcare Practitioner"
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-bold text-slate-900 text-sm">{doctor.userId?.name}</h3>
              </div>
              <p className="text-xs font-semibold text-blue-600">{doctor.specialization}</p>
              <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
                <span className="flex items-center text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                  {doctor.rating || 4.8}
                </span>
                <span>&bull;</span>
                <span>{doctor.experienceYears} yrs exp</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-900">₹{doctor.consultationFee || 500}</span>
            <span className="block text-[10px] text-slate-400">Consultation</span>
          </div>
        </div>

        {/* Presence Indicator */}
        <div className="mb-4">
          {isPresent ? (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Present at {orgName || 'Facility'}</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Available via Schedule</span>
            </div>
          )}
        </div>

        {doctor.bio && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
            {doctor.bio}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500 flex items-center">
          <Award className="w-3.5 h-3.5 mr-1 text-slate-400" />
          {doctor.qualifications?.join(', ') || 'MBBS'}
        </span>
        <Link
          to={`/doctors/${doctor._id}`}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
        >
          Book Slot
        </Link>
      </div>
    </div>
  );
};

