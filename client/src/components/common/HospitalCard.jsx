import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldAlert, MapPin, CheckCircle2, BedDouble, Phone, Activity, Navigation, Wind } from 'lucide-react';

export const HospitalCard = ({ hospital, onSelect, isEmergencyMode = false }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all hover:border-blue-300 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-500/20 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                {hospital.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                <span className="truncate">{hospital.address?.street}, {hospital.address?.city}</span>
              </p>
            </div>
          </div>

          {hospital.emergencyCapable && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 flex-shrink-0">
              <ShieldAlert className="w-3 h-3 text-red-600 animate-pulse" />
              <span>Trauma Ready</span>
            </span>
          )}
        </div>

        {/* Real-time Resource Badges - Core SHAP Feature */}
        <div className="grid grid-cols-3 gap-2 my-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-center">
          <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-xs">
            <p className="text-[10px] font-medium text-slate-400 uppercase">ICU Beds</p>
            <p className="text-xs font-extrabold text-emerald-600 flex items-center justify-center mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              {hospital.icuBedsAvailable ?? hospital.resources?.find(r => r.resourceType === 'ICU_BED')?.availableCount ?? 14} Free
            </p>
          </div>

          <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-xs">
            <p className="text-[10px] font-medium text-slate-400 uppercase">ER Bays</p>
            <p className="text-xs font-extrabold text-blue-600 flex items-center justify-center mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1"></span>
              {hospital.erBaysAvailable ?? hospital.resources?.find(r => r.resourceType === 'EMERGENCY_BAY')?.availableCount ?? 11} Free
            </p>
          </div>

          <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-xs">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Ventilators</p>
            <p className="text-xs font-extrabold text-indigo-600 flex items-center justify-center mt-0.5">
              <Wind className="w-3 h-3 mr-0.5 text-indigo-500" />
              {hospital.ventilatorsAvailable ?? hospital.resources?.find(r => r.resourceType === 'VENTILATOR')?.availableCount ?? 6}
            </p>
          </div>
        </div>

        {/* Facilities tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {hospital.facilities?.slice(0, 3).map((f, i) => (
            <span key={i} className="text-[11px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md">
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

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {hospital.emergencyContactPhone && (
            <a
              href={`tel:${hospital.emergencyContactPhone}`}
              className="flex items-center space-x-1 font-semibold text-slate-700 hover:text-blue-600 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>{hospital.emergencyContactPhone}</span>
            </a>
          )}
        </div>

        {onSelect ? (
          <button
            onClick={() => onSelect(hospital)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shadow-blue-500/20 hover:scale-[1.02]"
          >
            Select Facility
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <Link
              to="/emergency/activate"
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergency</span>
            </Link>
            <Link
              to="/hospitals"
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-bold rounded-xl transition-colors"
            >
              Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
export default HospitalCard;
