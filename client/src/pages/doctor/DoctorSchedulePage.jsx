import React, { useState } from 'react';
import { Calendar, Clock, Plus, Check, AlertCircle } from 'lucide-react';

export const DoctorSchedulePage = () => {
  const [activeDay, setActiveDay] = useState(1); // Monday
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

  const toggleSlot = (id) => {
    setSlots(slots.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Schedule & Slot Availability</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure weekly recurring availability and consultation slot timings.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        
        {/* Days of week selector matching Screen 13 */}
        <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-slate-100">
          {days.map((d, idx) => (
            <button
              key={d}
              onClick={() => setActiveDay(idx)}
              className={`py-2 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeDay === idx
                  ? 'bg-blue-600 text-white shadow-sm'
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
            <span className="text-xs text-slate-400">Click a slot to toggle availability</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => toggleSlot(slot.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  slot.active
                    ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs">{slot.time}</span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    slot.active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {slot.active ? 'Active' : 'Blocked'}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => alert('Custom slot addition saved.')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
          >
            Save Weekly Schedule
          </button>
        </div>

      </div>
    </div>
  );
};

