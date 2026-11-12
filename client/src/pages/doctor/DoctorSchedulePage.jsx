import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Check, AlertCircle, Save, Building2, Coffee, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';

export const DoctorSchedulePage = () => {
  const [activeDay, setActiveDay] = useState(1); // Monday
  const [savedNotice, setSavedNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [affiliations, setAffiliations] = useState([]);
  const [selectedAffiliationId, setSelectedAffiliationId] = useState('');

  // Weekly schedule configuration
  const defaultDaySchedules = [
    { dayOfWeek: 0, dayName: 'Sunday', isActive: false, startTime: 'Closed', endTime: 'Closed' },
    { dayOfWeek: 1, dayName: 'Monday', isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, dayName: 'Tuesday', isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, dayName: 'Wednesday', isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, dayName: 'Thursday', isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, dayName: 'Friday', isActive: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 6, dayName: 'Saturday', isActive: false, startTime: '10:00', endTime: '14:00' },
  ];

  const [daySchedules, setDaySchedules] = useState(defaultDaySchedules);
  const [lunchBreakStart, setLunchBreakStart] = useState('13:00');
  const [lunchBreakEnd, setLunchBreakEnd] = useState('14:00');
  const [slotDuration, setSlotDuration] = useState(30);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch active affiliations
      const affRes = await api.get('/doctors/me/affiliations?status=active');
      const activeAffs = affRes.data?.data || [];
      setAffiliations(activeAffs);

      if (activeAffs.length > 0) {
        setSelectedAffiliationId(activeAffs[0]._id);
        fetchScheduleForAffiliation(activeAffs[0]._id);
      }
    } catch (err) {
      console.warn('Could not load affiliations', err);
    }
  };

  const fetchScheduleForAffiliation = async (affiliationId) => {
    try {
      const res = await api.get(`/doctors/me/schedules?affiliationId=${affiliationId}`);
      const schedules = res.data?.data || [];
      if (schedules.length > 0) {
        const active = schedules[0];
        if (active.scheduleDays?.length > 0) {
          const merged = defaultDaySchedules.map((def) => {
            const found = active.scheduleDays.find((d) => d.dayOfWeek === def.dayOfWeek);
            if (found) {
              return {
                ...def,
                isActive: found.isActive !== false,
                startTime: found.startTime || '09:00',
                endTime: found.endTime || '17:00',
              };
            }
            return def;
          });
          setDaySchedules(merged);
        }
        if (active.appointmentAvailability?.slotDuration) {
          setSlotDuration(active.appointmentAvailability.slotDuration);
        }
        if (active.breaks?.length > 0) {
          setLunchBreakStart(active.breaks[0].startTime || '13:00');
          setLunchBreakEnd(active.breaks[0].endTime || '14:00');
        }
      }
    } catch (err) {
      console.warn('Could not load existing schedule for affiliation', err);
    }
  };

  const handleAffiliationChange = (e) => {
    const newId = e.target.value;
    setSelectedAffiliationId(newId);
    setErrorNotice('');
    fetchScheduleForAffiliation(newId);
  };

  const updateDaySchedule = (dayIdx, field, val) => {
    setDaySchedules((prev) =>
      prev.map((d) => (d.dayOfWeek === dayIdx ? { ...d, [field]: val } : d))
    );
  };

  const handleSave = async () => {
    if (!selectedAffiliationId) {
      setErrorNotice('Please select an active healthcare facility affiliation to bind this schedule.');
      return;
    }

    try {
      setSaving(true);
      setErrorNotice('');
      setSavedNotice('');

      const activeWorkingDays = daySchedules
        .filter((d) => d.isActive)
        .map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          isActive: true,
        }));

      const payload = {
        affiliationId: selectedAffiliationId,
        scheduleType: 'WEEKLY_RECURRING',
        effectiveFrom: new Date(),
        timezone: 'UTC',
        scheduleDays: activeWorkingDays,
        appointmentAvailability: {
          slotDuration: Number(slotDuration),
          bufferDuration: 5,
          maxDailyAppointments: 25,
        },
        breaks: [
          {
            title: 'Lunch Break',
            startTime: lunchBreakStart,
            endTime: lunchBreakEnd,
          },
        ],
      };

      const res = await api.post('/doctors/me/schedules', payload);
      if (res.data?.success) {
        setSavedNotice('Weekly consultation schedule published successfully with conflict checks passed.');
        setTimeout(() => setSavedNotice(''), 5000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save schedule.';
      setErrorNotice(msg);
    } finally {
      setSaving(false);
    }
  };

  const currentDay = daySchedules.find((d) => d.dayOfWeek === activeDay) || daySchedules[1];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="xs">
              Institutional Outpatient Schedule
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Consultation Schedule & Slot Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure weekly recurring outpatient working hours, breaks, and slot intervals bound to your active hospital affiliations.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Save} disabled={saving} onClick={handleSave}>
          {saving ? 'Validating Conflicts...' : 'Save & Publish Schedule'}
        </Button>
      </div>

      {savedNotice && (
        <Toast type="success" message={savedNotice} onClose={() => setSavedNotice('')} />
      )}

      {errorNotice && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Schedule Overlap / Validation Conflict</p>
            <p className="text-rose-800">{errorNotice}</p>
          </div>
        </div>
      )}

      {/* Affiliation Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-900 block">Select Affiliated Healthcare Facility</label>
            <span className="text-[11px] text-slate-500">
              Schedules are bound per institutional affiliation. Overlaps across facilities are blocked.
            </span>
          </div>
        </div>

        <select
          value={selectedAffiliationId}
          onChange={handleAffiliationChange}
          className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs w-full"
        >
          {affiliations.length === 0 ? (
            <option value="">No Active Affiliations Found</option>
          ) : (
            affiliations.map((aff) => (
              <option key={aff._id} value={aff._id}>
                {aff.organizationId?.name || aff.organizationId?.legalName} ({aff.department})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Main Schedule Editor */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-6">
        {/* Days of week selector tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-slate-100">
          {daySchedules.map((d) => (
            <button
              key={d.dayOfWeek}
              onClick={() => setActiveDay(d.dayOfWeek)}
              className={`py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeDay === d.dayOfWeek
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>{d.dayName}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  d.isActive ? 'bg-emerald-400' : 'bg-slate-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Selected Day Configuration */}
        <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Working Period for {currentDay.dayName}</h3>
              <p className="text-[11px] text-slate-500">Toggle whether you accept patient consultation on this day.</p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentDay.isActive}
                onChange={(e) => updateDaySchedule(activeDay, 'isActive', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              <span className="ml-3 text-xs font-bold text-slate-700">
                {currentDay.isActive ? 'Active Working Day' : 'Day Off / Closed'}
              </span>
            </label>
          </div>

          {currentDay.isActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Shift Start Time</label>
                <input
                  type="time"
                  value={currentDay.startTime}
                  onChange={(e) => updateDaySchedule(activeDay, 'startTime', e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Shift End Time</label>
                <input
                  type="time"
                  value={currentDay.endTime}
                  onChange={(e) => updateDaySchedule(activeDay, 'endTime', e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Global Consultation Slot Settings & Break Windows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Break Window */}
          <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <Coffee className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daily Scheduled Break Window
              </h4>
            </div>
            <p className="text-[11px] text-slate-600">
              Candidate appointment slots falling into this period will be automatically excluded from patient booking.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Break Start</label>
                <input
                  type="time"
                  value={lunchBreakStart}
                  onChange={(e) => setLunchBreakStart(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Break End</label>
                <input
                  type="time"
                  value={lunchBreakEnd}
                  onChange={(e) => setLunchBreakEnd(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Slot Duration */}
          <div className="p-4 bg-blue-50/50 border border-blue-200/70 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Appointment Duration & Intervals
              </h4>
            </div>
            <p className="text-[11px] text-slate-600">
              Length of each outpatient patient booking slot plus 5-minute sanitization buffer.
            </p>
            <div className="flex items-center gap-2">
              {[15, 20, 30, 45, 60].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setSlotDuration(dur)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    slotDuration === dur
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dur}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSchedulePage;
