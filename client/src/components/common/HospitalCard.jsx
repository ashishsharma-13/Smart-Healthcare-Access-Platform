import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldAlert, MapPin, BedDouble, Phone, Wind, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const HospitalCard = ({ hospital, onSelect, isEmergencyMode = false }) => {
  const icuBeds = hospital.icuBedsAvailable ?? hospital.resources?.find(r => r.resourceType === 'ICU_BED')?.availableCount ?? 14;
  const erBays = hospital.erBaysAvailable ?? hospital.resources?.find(r => r.resourceType === 'EMERGENCY_BAY')?.availableCount ?? 11;
  const vents = hospital.ventilatorsAvailable ?? hospital.resources?.find(r => r.resourceType === 'VENTILATOR')?.availableCount ?? 6;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-card hover:shadow-elevated hover:border-brand-300 transition-all flex flex-col justify-between group">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-950 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 text-brand-300 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 group-hover:text-brand-700 transition-colors leading-snug">
                {hospital.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                <span className="truncate">
                  {hospital.operatingAddress?.streetName
                    ? `${hospital.operatingAddress.buildingNumber ? hospital.operatingAddress.buildingNumber + ', ' : ''}${hospital.operatingAddress.streetName}, ${hospital.operatingAddress.city}`
                    : `${hospital.address?.street || ''}, ${hospital.address?.city || ''}`}
                </span>
              </p>
            </div>
          </div>

          {hospital.emergencyCapable && (
            <Badge variant="emergency" size="xs" dot pulseDot>
              Trauma Ready
            </Badge>
          )}
        </div>

        {/* Real-Time Live Resource Meters */}
        <div className="grid grid-cols-3 gap-2 my-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-center">
          <div className="p-1.5 bg-white rounded-md border border-slate-100 shadow-xs">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">ICU Beds</p>
            <p className="text-xs font-bold text-presence-700 flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-presence-500 animate-pulse" />
              <span>{icuBeds} Free</span>
            </p>
          </div>

          <div className="p-1.5 bg-white rounded-md border border-slate-100 shadow-xs">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">ER Bays</p>
            <p className="text-xs font-bold text-brand-700 flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              <span>{erBays} Free</span>
            </p>
          </div>

          <div className="p-1.5 bg-white rounded-md border border-slate-100 shadow-xs">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Ventilators</p>
            <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
              <Wind className="w-3 h-3 text-brand-500" />
              <span>{vents} Ready</span>
            </p>
          </div>
        </div>

        {/* Facilities Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {hospital.facilities?.slice(0, 3).map((f, i) => (
            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
              {f}
            </span>
          ))}
          {hospital.facilities?.length > 3 && (
            <span className="text-[10px] text-slate-400 px-1 py-0.5">
              +{hospital.facilities.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {hospital.emergencyContactPhone && (
            <a
              href={`tel:${hospital.emergencyContactPhone}`}
              className="flex items-center gap-1 font-semibold text-slate-700 hover:text-brand-600 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-brand-600" />
              <span>{hospital.emergencyContactPhone}</span>
            </a>
          )}
        </div>

        {onSelect ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onSelect(hospital)}
          >
            Select Facility
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              to="/emergency/activate"
              className="px-2.5 py-1.5 bg-urgent-50 hover:bg-urgent-100 text-urgent-700 border border-urgent-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergency</span>
            </Link>
            <Link
              to="/hospitals"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
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
