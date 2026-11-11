import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Info,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { openGoogleMapsNavigation } from '../../components/common/LeafletMap';
import { formatFacilityAddress } from '../../utils/geoUtils';

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
      setLoading(true);
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
        navigate(`/emergency/en-route/${id}`);
      }
    } catch (err) {
      alert('Destination selection error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSelectingId(null);
    }
  };

  const accepted = broadcasts.filter((b) => b.responseStatus === 'ACCEPTED' || b.responseStatus === 'CAN_RECEIVE');
  const others = broadcasts.filter((b) => b.responseStatus !== 'ACCEPTED' && b.responseStatus !== 'CAN_RECEIVE');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="info" size="xs">
            Dynamic Suitability Routing
          </Badge>
          <span className="text-[11px] font-bold text-slate-400">
            Emergency Condition: <span className="text-red-600 uppercase">{emergency?.emergencyType}</span>
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Compare Participating Hospital Responses
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          Facilities are evaluated by real-time clinical suitability based on active physician presence, confirmed bed capacity, and live travel time.
        </p>
      </div>

      {/* Mandatory Invariant Notice */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-amber-950">15-Minute Bed Hold Invariant</p>
          <p className="text-amber-800 leading-relaxed">
            Selecting a destination locks your trauma reservation for 15 minutes, alerts the hospital receiving desk, and immediately launches Google Maps GPS turn-by-turn routing.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Clock className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p>Retrieving live hospital acceptances and capacity updates...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Accepted Facilities Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Trauma Centers Ready to Receive You ({accepted.length})</span>
            </h2>

            {accepted.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <Clock className="w-8 h-8 text-amber-600 mx-auto animate-spin" />
                <h3 className="text-sm font-bold text-slate-900">Awaiting Hospital Responses</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Alerted trauma centers are verifying emergency bay and physician availability.
                </p>
                <div className="pt-2">
                  <Link to="/emergency/fallback">
                    <Button variant="danger" size="sm" icon={ShieldAlert}>
                      Open Public Emergency Centers & Dial 108/112
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accepted.map((b, idx) => {
                  const isTopRecommended = idx === 0;
                  const org = b.organizationId;
                  const operatingAddr = org?.operatingAddress || org?.address;
                  const coords = operatingAddr?.coordinates || org?.location?.coordinates;
                  const lat = coords ? coords[1] : null;
                  const lng = coords ? coords[0] : null;

                  return (
                    <div
                      key={b._id}
                      className={`bg-white rounded-2xl p-5 border shadow-card flex flex-col justify-between transition-all relative overflow-hidden ${
                        isTopRecommended
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {isTopRecommended && (
                        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                          ⭐ Recommended Optimal Match
                        </div>
                      )}

                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 pr-8">
                            <h3 className="text-base font-black text-slate-900 truncate">{org?.name}</h3>
                            <p className="text-xs text-slate-500 flex items-start mt-0.5">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-1">
                                {formatFacilityAddress(org)}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Suitability score & Travel metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                            <p className="text-xs font-black text-emerald-700">{b.suitabilityScore || 95}/100</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Distance</span>
                            <p className="text-xs font-bold text-slate-800">{b.distanceKm || 3.2} km</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Est. Travel</span>
                            <p className="text-xs font-bold text-slate-800">~{b.estimatedTravelMinutes || 8} mins</p>
                          </div>
                        </div>

                        {/* Confirmed readiness resources */}
                        <div className="space-y-1.5 text-xs">
                          <span className="font-bold text-slate-700 text-[11px] block">Confirmed Live Resources:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {b.offeredResources?.erBay && (
                              <Badge variant="presence" size="xs">
                                ER Bay Reserved
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
                            <Badge variant="presence" size="xs">
                              Emergency Triage On Standby
                            </Badge>
                          </div>
                          {b.offeredResources?.specialistOnDuty && (
                            <p className="text-[11px] text-slate-500 pt-0.5">
                              <strong>Specialist on duty:</strong> {b.offeredResources.specialistOnDuty}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Select Destination and Map Launch */}
                      <div className="pt-3 mt-4 border-t border-slate-100 space-y-2">
                        <Button
                          variant="presence"
                          size="md"
                          loading={selectingId === org?._id}
                          className="w-full font-black tracking-wide"
                          icon={CheckCircle2}
                          onClick={() => handleSelectDestination(org?._id)}
                        >
                          {selectingId === org?._id
                            ? 'Locking Bed Hold & Initiating Routing...'
                            : 'SELECT & LOCK 15-MIN RESERVATION'}
                        </Button>

                        {org && (
                          <button
                            onClick={() => openGoogleMapsNavigation(org, null, emergency?.location?.coordinates ? [emergency.location.coordinates[1], emergency.location.coordinates[0]] : null)}
                            className="w-full py-2 px-3 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 fill-current" />
                            <span>Preview Navigation in Google Maps</span>
                          </button>
                        )}
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Other Alerted Facilities ({others.length})
              </h3>
              <div className="space-y-1.5">
                {others.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{b.organizationId?.name}</span>
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

          {/* Fallback Directory CTA */}
          <div className="p-4 bg-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span className="font-bold text-slate-700">Looking for government trauma centers or public ambulances?</span>
            </div>
            <Link to="/emergency/fallback">
              <button className="px-3.5 py-1.5 bg-white text-red-600 font-bold border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1 shadow-xs cursor-pointer">
                <span>View Emergency Fallback (108 / 112)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

        </div>
      )}

    </div>
  );
};

export default EmergencyResponsesPage;
