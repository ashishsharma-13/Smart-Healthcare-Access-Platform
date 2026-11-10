import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  BedDouble,
  HeartPulse,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const EmergencyResponsesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [emergency, setEmergency] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/emergency/${id}`);
      if (res.data.success) {
        setEmergency(res.data.data.emergency);
        setBroadcasts(res.data.data.broadcasts);
      }
    } catch (err) {
      console.error('Error fetching responses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = async (orgId) => {
    try {
      setSelectingId(orgId);
      const res = await api.post(`/emergency/${id}/select-destination`, {
        organizationId: orgId,
      });
      if (res.data.success) {
        navigate(`/emergency/reserved/${id}`);
      }
    } catch (err) {
      alert('Destination selection error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSelectingId(null);
    }
  };

  const accepted = broadcasts.filter((b) => b.responseStatus === 'ACCEPTED');
  const others = broadcasts.filter((b) => b.responseStatus !== 'ACCEPTED');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Nearest Suitable Facility Recommendation Engine</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Compare Participating Hospital Responses
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
          The platform evaluates facility suitability based on specific emergency capability, active physician presence, available critical care resources, and estimated travel time — not distance alone.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border">
          Retrieving live hospital responses...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Accepted Hospitals Grid */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Hospitals Ready to Receive You ({accepted.length})</span>
            </h2>

            {accepted.length === 0 ? (
              <div className="p-8 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
                <Clock className="w-8 h-8 text-amber-500 mx-auto animate-spin" />
                <h3 className="text-sm font-bold text-amber-900">Awaiting Hospital Acceptances</h3>
                <p className="text-xs text-amber-700">
                  Facilities have received your emergency beep and are confirming emergency bay readiness.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accepted.map((b, idx) => {
                  const isTopRecommended = idx === 0;
                  return (
                    <div
                      key={b._id}
                      className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between transition-all relative overflow-hidden ${
                        isTopRecommended
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      {isTopRecommended && (
                        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                          ⭐ Recommended Nearest Suitable
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-start space-x-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{b.organizationId?.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center mt-0.5">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {b.organizationId?.address?.street}, {b.organizationId?.address?.city}
                            </p>
                          </div>
                        </div>

                        {/* Suitability score & Travel metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Suitability</span>
                            <p className="text-sm font-black text-emerald-600">{b.suitabilityScore}/100</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Distance</span>
                            <p className="text-sm font-black text-slate-800">{b.distanceKm} km</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Est. ETA</span>
                            <p className="text-sm font-black text-slate-800">~{b.estimatedTravelMinutes} mins</p>
                          </div>
                        </div>

                        {/* Confirmed readiness resources */}
                        <div className="space-y-1.5 text-xs">
                          <span className="font-bold text-slate-700">Confirmed Emergency Resources:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {b.offeredResources?.erBay && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-semibold rounded-md border border-emerald-200 text-[11px]">
                                &bull; ER Bay Ready
                              </span>
                            )}
                            {b.offeredResources?.icuBed && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-semibold rounded-md border border-emerald-200 text-[11px]">
                                &bull; ICU Bed Available
                              </span>
                            )}
                            {b.offeredResources?.ventilator && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-semibold rounded-md border border-emerald-200 text-[11px]">
                                &bull; Ventilator Ready
                              </span>
                            )}
                          </div>
                          {b.offeredResources?.specialistOnDuty && (
                            <p className="text-[11px] text-slate-600 mt-1">
                              <strong>Specialist on duty:</strong> {b.offeredResources.specialistOnDuty}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Select Destination Button */}
                      <div className="pt-4 mt-4 border-t border-slate-100">
                        <button
                          onClick={() => handleSelectDestination(b.organizationId._id)}
                          disabled={selectingId === b.organizationId._id}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {selectingId === b.organizationId._id
                              ? 'Confirming Destination...'
                              : 'SELECT THIS DESTINATION & RESERVE'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending or Declined facilities */}
          {others.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Other Participating Facilities Contacted ({others.length})
              </h3>
              <div className="space-y-2">
                {others.map((b) => (
                  <div
                    key={b._id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between opacity-70 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{b.organizationId?.name}</span>
                      <span className="text-slate-400 ml-2">({b.distanceKm} km away)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {b.responseStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

