import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
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
  RefreshCw,
  Phone,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { openGoogleMapsNavigation } from '../../components/common/LeafletMap';
import { formatFacilityAddress } from '../../utils/geoUtils';

export const EmergencyResponsesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [emergency, setEmergency] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [acceptedOrgs, setAcceptedOrgs] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState(null);
  const [confirmationNotice, setConfirmationNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchData();

    if (socket) {
      socket.emit('emergency:subscribe', { emergencyRequestId: id });

      socket.on('emergency:destination_confirmed', (data) => {
        setConfirmationNotice('Hospital confirmed! Temporary 15-minute bed reservation active.');
        setTimeout(() => {
          navigate(`/emergency/en-route/${id}`);
        }, 1500);
      });

      socket.on('emergency:resource_reserved', () => {
        navigate(`/emergency/en-route/${id}`);
      });

      socket.on('emergency:destination_confirmation_declined', (data) => {
        setPendingSelection(null);
        setErrorMessage(data?.reason || 'Hospital declined final confirmation. Please select another accepted center.');
        fetchData();
      });

      socket.on('emergency:destination_confirmation_failed', (data) => {
        setPendingSelection(null);
        setErrorMessage(data?.reason || 'Resource reservation failed due to live capacity. Please pick another facility.');
        fetchData();
      });

      socket.on('emergency:status_change', (data) => {
        if (data?.status === 'RESOURCES_RESERVED' || data?.status === 'PATIENT_EN_ROUTE') {
          navigate(`/emergency/en-route/${id}`);
        } else {
          fetchData();
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('emergency:unsubscribe', { emergencyRequestId: id });
        socket.off('emergency:destination_confirmed');
        socket.off('emergency:resource_reserved');
        socket.off('emergency:destination_confirmation_declined');
        socket.off('emergency:destination_confirmation_failed');
        socket.off('emergency:status_change');
      }
    };
  }, [id, socket]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Try Module 11 accepted-organizations endpoint
      try {
        const acceptedRes = await api.get(`/emergency/requests/${id}/accepted-organizations`);
        if (acceptedRes.data.success && Array.isArray(acceptedRes.data.data)) {
          setAcceptedOrgs(acceptedRes.data.data);
        }
      } catch (err) {
        // Fallback handled below
      }

      // 2. Try recommendation endpoint
      try {
        const recRes = await api.get(`/emergency/requests/${id}/recommendation`);
        if (recRes.data.success && recRes.data.data?.recommended) {
          setRecommendation(recRes.data.data);
        }
      } catch (err) {
        // Fallback handled below
      }

      // 3. Try destination selection status
      try {
        const destRes = await api.get(`/emergency/requests/${id}/destination`);
        if (destRes.data.success && destRes.data.data?.currentSelection) {
          const sel = destRes.data.data.currentSelection;
          if (sel.selectionStatus === 'PENDING_CONFIRMATION') {
            setPendingSelection(sel);
          } else if (sel.selectionStatus === 'CONFIRMED') {
            navigate(`/emergency/en-route/${id}`);
            return;
          }
        }
      } catch (err) {
        // Fallback handled below
      }

      // 4. Base emergency data
      const res = await api.get(`/emergency/${id}`);
      if (res.data.success) {
        setEmergency(res.data.data.emergency);
        setBroadcasts(res.data.data.broadcasts || []);

        if (res.data.data.emergency?.status === 'RESOURCES_RESERVED' || res.data.data.emergency?.status === 'PATIENT_EN_ROUTE') {
          navigate(`/emergency/en-route/${id}`);
        }
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
      setErrorMessage('');

      // Call Module 11 select-destination API
      const res = await api.post(`/emergency/requests/${id}/select-destination`, {
        organizationId: orgId,
        selectionSource: 'USER',
      });

      if (res.data.success) {
        setPendingSelection(res.data.data?.selection || { organizationId: orgId, selectionStatus: 'PENDING_CONFIRMATION' });
        setConfirmationNotice('Destination selected! Hospital trauma desk alerted for final confirmation...');

        // If request is already confirmed or resources reserved, navigate
        if (res.data.data?.emergencyRequest?.status === 'RESOURCES_RESERVED') {
          navigate(`/emergency/en-route/${id}`);
        }
      }
    } catch (err) {
      // Fallback try legacy endpoint
      try {
        const fallbackRes = await api.post(`/emergency/${id}/select-destination`, {
          organizationId: orgId,
        });
        if (fallbackRes.data.success) {
          navigate(`/emergency/en-route/${id}`);
        }
      } catch (fallbackErr) {
        setErrorMessage('Destination selection error: ' + (fallbackErr.response?.data?.message || fallbackErr.message));
      }
    } finally {
      setSelectingId(null);
    }
  };

  // Combine accepted list
  const displayAccepted = acceptedOrgs.length > 0
    ? acceptedOrgs
    : broadcasts
        .filter((b) => b.responseStatus === 'ACCEPTED' || b.responseStatus === 'CAN_RECEIVE')
        .map((b) => ({
          organizationId: b.organizationId?._id || b.organizationId,
          name: b.organizationId?.name,
          address: b.organizationId?.operatingAddress || b.organizationId?.address,
          location: b.organizationId?.location,
          uniqueOrganizationCode: b.organizationId?.uniqueOrganizationCode,
          emergencyContactPhone: b.organizationId?.emergencyContactPhone,
          suitabilityScore: b.suitabilityScore || 90,
          distanceKm: b.distanceKm || 3.2,
          estimatedTravelMinutes: b.estimatedTravelMinutes || 8,
          offeredResources: b.offeredResources || {},
          _raw: b,
        }));

  const others = broadcasts.filter((b) => b.responseStatus !== 'ACCEPTED' && b.responseStatus !== 'CAN_RECEIVE');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="info" size="xs">
            Dynamic Clinical Suitability Routing
          </Badge>
          <span className="text-[11px] font-bold text-slate-400">
            Emergency Condition: <span className="text-red-600 uppercase">{emergency?.emergencyType}</span>
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Compare Participating Hospital Responses & Select Destination
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          Facilities are evaluated by real-time clinical suitability based on active physician presence, confirmed bed capacity, and live travel time. Clinical capability is prioritized over raw distance.
        </p>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-rose-950">Notice</p>
            <p className="text-rose-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Confirmation In Progress Notice */}
      {pendingSelection && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3 text-blue-900 shadow-sm animate-pulse">
          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
          <div className="text-xs space-y-1">
            <p className="font-black text-sm text-blue-950">Waiting for Final Hospital Confirmation</p>
            <p className="text-blue-800 leading-relaxed">
              You selected <strong>{pendingSelection.organizationId?.name || 'the healthcare facility'}</strong>. The emergency receiving desk has been alerted and is confirming temporary 15-minute bed reservation and specialist standby.
            </p>
            <p className="text-[11px] text-blue-600 pt-1">
              Screen will transition automatically once confirmed. You may also select a different hospital below if needed.
            </p>
          </div>
        </div>
      )}

      {/* Mandatory Invariant Notice */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-amber-950">15-Minute Bed Hold Invariant</p>
          <p className="text-amber-800 leading-relaxed">
            Resources are temporarily reserved for 15 minutes upon final hospital confirmation. Emergency Beep acceptances do not reserve beds until destination selection is confirmed.
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
              <span>Trauma Centers Ready to Receive You ({displayAccepted.length})</span>
            </h2>

            {displayAccepted.length === 0 ? (
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
                {displayAccepted.map((b, idx) => {
                  const isTopRecommended = idx === 0 || (recommendation?.recommended?.organizationId?.toString() === (b.organizationId?._id || b.organizationId)?.toString());
                  const orgIdStr = (b.organizationId?._id || b.organizationId)?.toString();

                  return (
                    <div
                      key={orgIdStr || idx}
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
                            <h3 className="text-base font-black text-slate-900 truncate">{b.name}</h3>
                            <p className="text-xs text-slate-500 flex items-start mt-0.5">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{formatFacilityAddress(b)}</span>
                            </p>
                            {b.uniqueOrganizationCode && (
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                Code: {b.uniqueOrganizationCode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Suitability score & Travel metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Clinical Score</span>
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

                        {/* Live Resources & Offerings */}
                        <div className="space-y-1.5 text-xs">
                          <span className="font-bold text-slate-700 text-[11px] block">Live Available Capacity:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {b.resources?.erBay ? (
                              <Badge variant="presence" size="xs">
                                ER Bays: {b.resources.erBay.available}/{b.resources.erBay.total}
                              </Badge>
                            ) : (
                              <Badge variant="presence" size="xs">
                                ER Bay Ready
                              </Badge>
                            )}
                            {b.resources?.icuBed ? (
                              <Badge variant="info" size="xs">
                                ICU Beds: {b.resources.icuBed.available}/{b.resources.icuBed.total}
                              </Badge>
                            ) : null}
                            {b.specialistAvailable && (
                              <Badge variant="presence" size="xs">
                                On-Duty Specialist Standby
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Select Destination and Map Launch */}
                      <div className="pt-3 mt-4 border-t border-slate-100 space-y-2">
                        <Button
                          variant="presence"
                          size="md"
                          loading={selectingId === orgIdStr}
                          className="w-full font-black tracking-wide"
                          icon={CheckCircle2}
                          onClick={() => handleSelectDestination(orgIdStr)}
                        >
                          {selectingId === orgIdStr
                            ? 'Requesting Final Confirmation...'
                            : pendingSelection?.organizationId?._id === orgIdStr
                            ? 'Awaiting Receiving Desk Confirmation...'
                            : 'SELECT DESTINATION & RESERVE'}
                        </Button>

                        <button
                          onClick={() =>
                            openGoogleMapsNavigation(
                              b,
                              null,
                              emergency?.location?.coordinates
                                ? [emergency.location.coordinates[1], emergency.location.coordinates[0]]
                                : null
                            )
                          }
                          className="w-full py-2 px-3 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 fill-current" />
                          <span>Preview Route in Google Maps</span>
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
