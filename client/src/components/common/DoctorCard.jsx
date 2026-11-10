import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, MapPin, Award, Calendar, Stethoscope } from 'lucide-react';
import { DoctorAvatar } from '../graphics/DoctorAvatar';

export const DoctorCard = ({ doctor }) => {
  const isPresent = doctor.currentPresence?.isPresent;
  const orgName = doctor.currentPresence?.organizationId?.name;
  const doctorName = doctor.userId?.name || doctor.name || 'Dr. Specialist';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all hover:border-blue-300 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              {doctor.userId?.avatar ? (
                <img
                  src={doctor.userId.avatar}
                  alt={doctorName}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-xs"
                />
              ) : (
                <DoctorAvatar name={doctorName} specialization={doctor.specialization} className="w-14 h-14" />
              )}

              {doctor.verificationStatus === 'verified' && (
                <div
                  title="Verified Healthcare Practitioner (NMC Approved)"
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                {doctorName}
              </h3>
              <p className="text-xs font-semibold text-blue-600 flex items-center mt-0.5">
                <Stethoscope className="w-3 h-3 mr-1" />
                {doctor.specialization || 'General Physician'}
              </p>

              <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
                <span className="flex items-center text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                  <Star className="w-3 h-3 fill-amber-400 mr-1 text-amber-500" />
                  {doctor.rating ? doctor.rating.toFixed(1) : '4.9'}
                </span>
                <span>&bull;</span>
                <span className="font-medium text-slate-600">{doctor.experienceYears || 10}+ yrs exp</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-extrabold text-slate-900">₹{doctor.consultationFee || 600}</span>
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wide">Per Visit</span>
          </div>
        </div>

        {/* Physical Presence vs. Schedule Indicator - Core SHAP Business Rule */}
        <div className="mb-3">
          {isPresent ? (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Present On-Site at {orgName || 'Medical Facility'}</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Available via Slot Schedule</span>
            </div>
          )}
        </div>

        {doctor.bio && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
            {doctor.bio}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500 flex items-center truncate">
          <Award className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
          <span className="truncate">{doctor.qualifications?.join(', ') || 'MBBS, MD'}</span>
        </span>
        
        <Link
          to={`/doctors/${doctor._id}`}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
        >
          Book Slot
        </Link>
      </div>
    </div>
  );
};
export default DoctorCard;
