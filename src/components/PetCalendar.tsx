import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { loadModuleData, saveModuleData } from '../storage';
import type { VaccineEntry, MedicationEntry, HealthEntry, DocumentEntry, CalendarEntry } from '../types/modules';

interface CalendarEvent {
  id: string;
  title: string;
  source: string;
  color: string;
}

type EventMap = Record<string, CalendarEvent[]>;

const SOURCE_COLORS: Record<string, string> = {
  vaccines: '#27ae60',
  medications: '#3498db',
  health: '#e74c3c',
  documents: '#f39c12',
  calendar: '#9b59b6',
};

const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

const DAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function addEvent(map: EventMap, date: string | undefined, event: CalendarEvent) {
  if (!date) return;
  const key = date.slice(0, 10);
  if (!map[key]) map[key] = [];
  map[key].push(event);
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export function PetCalendar({ petId }: { petId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<EventMap>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [manualEntries, setManualEntries] = useState<CalendarEntry[]>([]);

  const loadEvents = async () => {
    const map: EventMap = {};

    const vaccines = await loadModuleData<VaccineEntry>(petId, 'vaccines');
    for (const v of vaccines) {
      addEvent(map, v.date, { id: v.id + '_d', title: `💉 ${v.name}`, source: 'vaccines', color: SOURCE_COLORS.vaccines });
      if (v.nextDate) addEvent(map, v.nextDate, { id: v.id + '_n', title: `💉 Следующая: ${v.name}`, source: 'vaccines', color: SOURCE_COLORS.vaccines });
    }

    const meds = await loadModuleData<MedicationEntry>(petId, 'medications');
    for (const m of meds) {
      addEvent(map, m.startDate, { id: m.id + '_s', title: `💊 Начало: ${m.name}`, source: 'medications', color: SOURCE_COLORS.medications });
      if (m.endDate) addEvent(map, m.endDate, { id: m.id + '_e', title: `💊 Конец курса: ${m.name}`, source: 'medications', color: SOURCE_COLORS.medications });
    }

    const health = await loadModuleData<HealthEntry>(petId, 'health');
    for (const h of health) {
      addEvent(map, h.date, { id: h.id + '_d', title: `🏥 ${h.description}`, source: 'health', color: SOURCE_COLORS.health });
      if (h.nextVisitDate) addEvent(map, h.nextVisitDate, { id: h.id + '_n', title: `🏥 Следующий визит`, source: 'health', color: SOURCE_COLORS.health });
    }

    const docs = await loadModuleData<DocumentEntry>(petId, 'documents');
    for (const d of docs) {
      if (d.expiry) addEvent(map, d.expiry, { id: d.id + '_x', title: `📄 Истекает: ${d.title}`, source: 'documents', color: SOURCE_COLORS.documents });
    }

    const manual = await loadModuleData<CalendarEntry>(petId, 'calendar');
    setManualEntries(manual);
    for (const c of manual) {
      addEvent(map, c.date, { id: c.id, title: c.title, source: 'calendar', color: SOURCE_COLORS.calendar });
    }

    setEvents(map);
  };

  useEffect(() => { loadEvents(); }, [petId]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !selected) return;
    const entry: CalendarEntry = { id: crypto.randomUUID(), date: selected, title: newTitle.trim() };
    const updated = [entry, ...manualEntries];
    setManualEntries(updated);
    await saveModuleData(petId, 'calendar', updated);
    setNewTitle('');
    setShowAdd(false);
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    const updated = manualEntries.filter(e => e.id !== id);
    setManualEntries(updated);
    await saveModuleData(petId, 'calendar', updated);
    loadEvents();
  };

  const closeModal = () => {
    setSelected(null);
    setShowAdd(false);
    setNewTitle('');
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = selected ? (events[selected] || []) : [];

  return (
    <>
      <div className="pet-calendar">
        <div className="cal-header">
          <button className="cal-nav" onClick={prevMonth}><ChevronLeft size={14} /></button>
          <span className="cal-title font-typewriter">{MONTH_NAMES[month]} {year}</span>
          <button className="cal-nav" onClick={nextMonth}><ChevronRight size={14} /></button>
        </div>

        <div className="cal-weekdays">
          {DAY_NAMES.map(d => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="cal-cell cal-cell--empty" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className={`cal-cell${isToday ? ' cal-cell--today' : ''}${dayEvents.length > 0 ? ' cal-cell--has-events' : ''}`}
                onClick={() => setSelected(dateStr)}
              >
                <span className="cal-day">{day}</span>
                {dayEvents.length > 0 && (
                  <div className="cal-dots">
                    {dayEvents.slice(0, 3).map((ev, j) => (
                      <span key={j} className="cal-dot" style={{ background: ev.color }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div className="cal-modal-overlay" onClick={closeModal}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <span className="cal-modal-date font-typewriter">{formatDate(selected)}</span>
              <div className="cal-modal-actions">
                <button className="cal-modal-add" onClick={() => setShowAdd(v => !v)} title="Добавить событие">
                  <Plus size={15} />
                </button>
                <button className="cal-modal-close" onClick={closeModal}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {showAdd && (
              <div className="cal-modal-form">
                <input
                  className="cal-input"
                  placeholder="Название события"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <button className="cal-save-btn font-typewriter" onClick={handleAdd}>Добавить</button>
              </div>
            )}

            <div className="cal-modal-events">
              {selectedEvents.length === 0 && !showAdd && (
                <div className="cal-events-empty font-typewriter">Нет событий</div>
              )}
              {selectedEvents.map(ev => (
                <div key={ev.id} className="cal-event" style={{ borderLeftColor: ev.color }}>
                  <span className="cal-event-title">{ev.title}</span>
                  {ev.source === 'calendar' && (
                    <button className="cal-event-delete" onClick={() => handleDelete(ev.id)}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
