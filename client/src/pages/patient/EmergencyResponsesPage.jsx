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
  Navigation,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

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
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="info" size="xs">
            Dynamic Suitability Routing
          </Badge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Compare Participating Hospital Responses
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          Facilities are ranked by real-time clinical suitability based on active physician presence, confirmed bed capacity, and live travel time.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Retrieving live hospital acceptances...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Accepted Facilities Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-presence-500 animate-pulse" />
              <span>Trauma Centers Ready to Receive You ({accepted.length})</span>
            </h2>

            {accepted.length === 0 ? (
              <div className="p-8 bg-hold-50 rounded-xl border border-hold-100 text-center space-y-2">
                <Clock className="w-8 h-8 text-hold-600 mx-auto animate-spin" />
                <h3 className="text-sm font-bold text-hold-900">Awaiting Hospital Confirmation</h3>
                <p className="text-xs text-hold-700 max-w-sm mx-auto">
                  Nearby trauma centers are verifying emergency bay and team availability right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accepted.map((b, idx) => {
                  const isTopRecommended = idx === 0;
                  return (
                    <div
                      key={b._id}
                      className={`bg-white rounded-xl p-5 border shadow-card flex flex-col justify-between transition-all relative overflow-hidden ${
                        isTopRecommended
                          ? 'border-presence-500 ring-1 ring-presence-500'
                          : 'border-slate-200 hover:border-brand-300'
                      }`}
                    >
                      {isTopRecommended && (
                        <div className="absolute top-0 right-0 bg-presence-700 text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-bl shadow-xs">
                          ⭐ Recommended Suitable
                        </div>
                      )}

                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-presence-50 text-presence-700 border border-presence-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">
                              {b.organizationId?.name}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{b.organizationId?.address?.street}, {b.organizationId?.address?.city}</span>
                            </p>
                          </div>
                        </div>

                        {/* Suitability score & Travel metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 text-center">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Score</span>
                            <p className="text-xs font-bold text-presence-700">{b.suitabilityScore || 95}/100</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Distance</span>
                            <p className="text-xs font-bold text-slate-800">{b.distanceKm || 3.2} km</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Est. Travel</span>
                            <p className="text-xs font-bold text-slate-800">~{b.estimatedTravelMinutes || 8} mins</p>
                          </div>
                        </div>

                        {/* Confirmed readiness resources */}
                        <div className="space-y-1 text-xs">
                          <span className="font-semibold text-slate-700 text-[11px]">Confirmed Resources:</span>
                          <div className="flex flex-wrap gap-1">
                            {b.offeredResources?.erBay && (
                              <Badge variant="presence" size="xs">
                                ER Bay Ready
                              </Badge>
                            )}
                            {b.offeredResources?.icuBed && (
                              <Badge variant="presence" size="xs">
                                ICU Bed Ready
                              </Badge>
                            )}
                            {b.offeredResources?.ventilator && (
                              <Badge variant="info" size="xs">
                                Ventilator Ready
                              </Badge>
                            )}
                          </div>
                          {b.offeredResources?.specialistOnDuty && (
                            <p className="text-[11px] text-slate-500 pt-0.5">
                              <strong>Specialist on duty:</strong> {b.offeredResources.specialistOnDuty}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Select Destination Button */}
                      <div className="pt-3 mt-3 border-t border-slate-100">
                        <Button
                          variant="presence"
                          size="md"
                          loading={selectingId === b.organizationId._id}
                          className="w-full"
                          icon={CheckCircle2}
                          onClick={() => handleSelectDestination(b.organizationId._id)}
                        >
                          {selectingId === b.organizationId._id
                            ? 'Locking Bed Hold...'
                            : 'SELECT & LOCK 15-MIN RESERVATION'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending or Declined facilities */}
          {others.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Other Participating Facilities Contacted ({others.length})
              </h3>
              <div className="space-y-1.5">
                {others.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{b.organizationId?.name}</span>
                      <span className="text-slate-400 ml-2">({b.distanceKm || 5} km)</span>
                    </div>
                    <Badge variant={b.responseStatus === 'DECLINED' ? 'neutral' : 'hold'} size="xs">
                      {b.responseStatus}
                    </Badge>
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

export default EmergencyResponsesPage;
