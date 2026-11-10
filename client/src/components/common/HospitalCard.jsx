import React from 'react';
import { Building2, ShieldAlert, MapPin, CheckCircle2, BedDouble, Phone } from 'lucide-react';

export const HospitalCard = ({ hospital, onSelect }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{hospital.name}</h3>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {hospital.address?.street}, {hospital.address?.city}
              </p>
            </div>
          </div>

          {hospital.emergencyCapable && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-3 h-3 text-red-600" />
              <span>Emergency 24/7</span>
            </span>
          )}
        </div>

        {/* Facilities tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {hospital.facilities?.slice(0, 3).map((f, i) => (
            <span key={i} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {f}
            </span>
          ))}
          {hospital.facilities?.length > 3 && (
            <span className="text-[11px] text-slate-400 px-1 py-0.5">
              +{hospital.facilities.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {hospital.emergencyContactPhone && (
            <div className="flex items-center space-x-1 font-medium text-slate-700">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>{hospital.emergencyContactPhone}</span>
            </div>
          )}
        </div>

        {onSelect ? (
          <button
            onClick={() => onSelect(hospital)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            Select Facility
          </button>
        ) : (
          <span className="text-xs font-semibold text-emerald-600 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Verified Facility
          </span>
        )}
      </div>
    </div>
  );
};

