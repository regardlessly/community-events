'use strict';

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23e8edf2'/%3E%3Crect x='330' y='120' width='140' height='130' rx='12' fill='%23c5cfd8'/%3E%3Crect x='350' y='100' width='30' height='20' rx='4' fill='%23c5cfd8'/%3E%3Crect x='420' y='100' width='30' height='20' rx='4' fill='%23c5cfd8'/%3E%3Crect x='340' y='165' width='120' height='10' rx='3' fill='%23f0f4f8'/%3E%3Crect x='340' y='183' width='120' height='10' rx='3' fill='%23f0f4f8'/%3E%3Crect x='340' y='201' width='80' height='10' rx='3' fill='%23f0f4f8'/%3E%3C/svg%3E";

const CalendarState = {
  year:        new Date().getFullYear(),
  month:       new Date().getMonth() + 1,  // 1-based
  selectedDay: null,
  events:      [],
};

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year, month) {
  // Returns Mon=0 ... Sun=6
  const d = new Date(year, month - 1, 1).getDay();
  return (d + 6) % 7;
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function eventsForDay(dateStr) {
  return CalendarState.events.filter(e => e.date === dateStr);
}

function sourceClass(source) {
  if (!source) return 'source-cc';
  const s = source.toLowerCase();
  if (s.includes("people's") || s === 'pa') return 'source-pa';
  if (s.includes('aic'))                    return 'source-aic';
  if (s.includes('silver'))                 return 'source-sgo';
  return 'source-cc';
}

function renderCalendar() {
  const { year, month, selectedDay } = CalendarState;
  const container = document.getElementById('calendar-grid');
  const titleEl   = document.getElementById('calendar-title');

  titleEl.textContent = new Date(year, month - 1, 1)
    .toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });

  const days        = daysInMonth(year, month);
  const startOffset = firstDayOfMonth(year, month);
  // Use en-CA locale for YYYY-MM-DD format in local time
  const today = new Date().toLocaleDateString('en-CA');

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = DOW.map(d => `<div class="cal-header-cell">${d}</div>`).join('');

  for (let i = 0; i < startOffset; i++) {
    html += '<div class="cal-cell cal-cell--empty"></div>';
  }

  for (let d = 1; d <= days; d++) {
    const dateStr   = isoDate(year, month, d);
    const dayEvents = eventsForDay(dateStr);
    const isToday   = dateStr === today;
    const isSelected = dateStr === selectedDay;

    const dots = dayEvents.slice(0, 3).map(e =>
      `<span class="event-dot ${sourceClass(e.source)}" title="${e.title.replace(/"/g, '&quot;')}"></span>`
    ).join('');
    const overflow = dayEvents.length > 3
      ? `<span class="event-overflow">+${dayEvents.length - 3}</span>`
      : '';

    html += `
      <div class="cal-cell${isToday ? ' cal-cell--today' : ''}${isSelected ? ' cal-cell--selected' : ''}"
           data-date="${dateStr}"
           onclick="CalendarEvents.selectDay('${dateStr}')"
           role="button"
           tabindex="0"
           aria-label="${d} ${new Date(year, month-1, d).toLocaleDateString('en-SG', {month:'long'})}, ${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}">
        <span class="cal-day-number">${d}</span>
        <div class="cal-dots">${dots}${overflow}</div>
      </div>`;
  }

  container.innerHTML = html;

  // Keyboard accessibility for day cells
  container.querySelectorAll('.cal-cell:not(.cal-cell--empty)').forEach(cell => {
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        CalendarEvents.selectDay(cell.dataset.date);
      }
    });
  });
}

function selectDay(dateStr) {
  CalendarState.selectedDay = dateStr;
  renderCalendar();
  renderDayPanel(dateStr);
}

function renderDayPanel(dateStr) {
  const panel     = document.getElementById('day-panel');
  const titleEl   = document.getElementById('day-panel-title');
  const dayEvents = eventsForDay(dateStr);

  const d = new Date(dateStr + 'T00:00:00');
  titleEl.textContent = d.toLocaleDateString('en-SG', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  if (dayEvents.length === 0) {
    panel.innerHTML = '<p class="day-panel-empty">No events on this day.</p>';
    return;
  }

  panel.innerHTML = dayEvents.map(renderEventCard).join('');
  panel.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', () => AppEvents.openModal(Number(card.dataset.id)));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        AppEvents.openModal(Number(card.dataset.id));
      }
    });
  });
}

function renderEventCard(event) {
  const timeStr = event.time
    ? event.time + (event.end_time ? ' \u2013 ' + event.end_time : '')
    : 'Time TBC';
  const thumbSrc = event.image_url || PLACEHOLDER_IMG;
  const thumb = `<img class="event-card__thumb" src="${thumbSrc}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}';this.onerror=null;" />`;
  return `
    <div class="event-card" data-id="${event.id}" tabindex="0" role="button"
         aria-label="${event.title}">
      ${thumb}
      <div class="event-card__header">
        <span class="event-source-badge ${sourceClass(event.source)}">${event.source}</span>
        <span class="event-category">${event.category || ''}</span>
      </div>
      <div class="event-card__title">${event.title}</div>
      <div class="event-card__meta">
        <span class="event-card__time">&#128337; ${timeStr}</span>
        ${event.location ? `<span class="event-card__location">&#128205; ${event.location}</span>` : ''}
      </div>
    </div>`;
}

function prevMonth() {
  if (CalendarState.month === 1) { CalendarState.month = 12; CalendarState.year--; }
  else { CalendarState.month--; }
  CalendarState.selectedDay = null;
  AppEvents.loadMonth();
}

function nextMonth() {
  if (CalendarState.month === 12) { CalendarState.month = 1; CalendarState.year++; }
  else { CalendarState.month++; }
  CalendarState.selectedDay = null;
  AppEvents.loadMonth();
}

const CalendarEvents = { selectDay, renderCalendar, renderDayPanel, prevMonth, nextMonth, CalendarState, sourceClass };
