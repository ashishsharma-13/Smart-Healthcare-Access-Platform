import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Check, AlertCircle, Save } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';

export const DoctorSchedulePage = () => {
  const [activeDay, setActiveDay] = useState(1); // Monday
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingHours, setWorkingHours] = useState('Mon–Fri · 9:00 AM–4:00 PM');
  const [slots, setSlots] = useState([
    { id: 1, time: '09:00 AM - 09:30 AM', active: true },
    { id: 2, time: '09:30 AM - 10:00 AM', active: true },
    { id: 3, time: '10:00 AM - 10:30 AM', active: true },
    { id: 4, time: '10:30 AM - 11:00 AM', active: true },
    { id: 5, time: '11:00 AM - 11:30 AM', active: true },
    { id: 6, time: '02:00 PM - 02:30 PM', active: true },
    { id: 7, time: '02:30 PM - 03:00 PM', active: true },
    { id: 8, time: '03:00 PM - 03:30 PM', active: false },
    { id: 9, time: '03:30 PM - 04:00 PM', active: true },
  ]);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/doctors/me');
      if (res.data?.success && res.data?.data) {
        if (res.data.data.workingHours) {
          setWorkingHours(res.data.data.workingHours);
        }
      }
    } catch (err) {
      console.warn('Could not fetch doctor schedule:', err.message);
    }
  };

  const toggleSlot = (id) => {
    setSlots(slots.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/doctors/me', {
        workingHours,
        isAvailableForAppointments: true,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 4000);
    } catch (err) {
      console.error('Failed to save schedule roster', err);
    } finally {
      setSaving(false);
    }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="xs">
              Outpatient Calendar
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Consultation Schedule & Slot Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure weekly recurring availability and consultation slot timings for patient bookings.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>
          Save Weekly Roster
        </Button>
      </div>

      {savedNotice && (
        <Toast
          type="success"
          message="Weekly consultation schedule updated successfully."
          onClose={() => setSavedNotice(false)}
        />
      )}

      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-5">
        
        {/* Days of week selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-slate-100">
          {days.map((d, idx) => (
            <button
              key={d}
              onClick={() => setActiveDay(idx)}
              className={`py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeDay === idx
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Slot Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Consultation Slots for {days[activeDay]}
            </h3>
            <span className="text-xs text-slate-400">Click any slot to toggle availability</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => toggleSlot(slot.id)}
                className={`p-3 rounded-lg border text-left transition-colors flex items-center justify-between cursor-pointer ${
                  slot.active
                    ? 'bg-brand-50/70 border-brand-200 text-brand-900 font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs">{slot.time}</span>
                </div>
                <Badge variant={slot.active ? 'presence' : 'neutral'} size="xs">
                  {slot.active ? 'Open' : 'Blocked'}
                </Badge>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorSchedulePage;
