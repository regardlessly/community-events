'use strict';

const AppState = {
  filters:    { region: '', source: '', category: '' },
  modalEvent: null,
};

async function init() {
  await Promise.all([
    populateFilter('region-filter',   API.getRegions),
    populateFilter('source-filter',   API.getSources),
    populateFilter('category-filter', API.getCategories),
  ]);
  bindFilters();
  bindModalClose();
  bindKeyboard();
  await loadMonth();
}

async function populateFilter(selectId, fetchFn) {
  const select = document.getElementById(selectId);
  try {
    const items = await fetchFn();
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn(`[app] Could not load ${selectId}:`, err.message);
  }
}

async function loadMonth() {
  showLoader(true);
  showError('');
  try {
    const { year, month } = CalendarEvents.CalendarState;
    const events = await API.getEvents({
      month:    String(month),
      year:     String(year),
      region:   AppState.filters.region   || undefined,
      source:   AppState.filters.source   || undefined,
      category: AppState.filters.category || undefined,
    });

    CalendarEvents.CalendarState.events = events;
    CalendarEvents.renderCalendar();

    const sel = CalendarEvents.CalendarState.selectedDay;
    if (sel) {
      CalendarEvents.renderDayPanel(sel);
    } else {
      // Auto-select today if it has events
      const today = new Date().toLocaleDateString('en-CA');
      if (events.some(e => e.date === today)) {
        CalendarEvents.selectDay(today);
      } else {
        // Show first day with events
        const firstWithEvents = events[0]?.date;
        if (firstWithEvents) CalendarEvents.selectDay(firstWithEvents);
      }
    }
  } catch (err) {
    showError('Could not load events. Is the backend running? (' + err.message + ')');
    CalendarEvents.CalendarState.events = [];
    CalendarEvents.renderCalendar();
  } finally {
    showLoader(false);
  }
}

function bindFilters() {
  ['region-filter', 'source-filter', 'category-filter'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const key = id.replace('-filter', '');
      AppState.filters[key] = e.target.value;
      CalendarEvents.CalendarState.selectedDay = null;
      loadMonth();
    });
  });
}

// ── Modal ───────────────────────────────────────────────────────────────────
async function openModal(eventId) {
  try {
    const event = await API.getEvent(eventId);
    AppState.modalEvent = event;
    renderModal(event);
    document.getElementById('event-modal').classList.add('modal--open');
    document.getElementById('modal-overlay').classList.add('overlay--open');
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-close').focus();
  } catch (err) {
    showError('Could not load event details.');
  }
}

function closeModal() {
  document.getElementById('event-modal').classList.remove('modal--open');
  document.getElementById('modal-overlay').classList.remove('overlay--open');
  document.body.style.overflow = '';
  AppState.modalEvent = null;
}

function renderModal(event) {
  const timeStr = event.time
    ? event.time + (event.end_time ? ' \u2013 ' + event.end_time : '')
    : 'Time TBC';

  const dateDisplay = new Date(event.date + 'T00:00:00').toLocaleDateString('en-SG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  document.getElementById('modal-title').textContent       = event.title;
  document.getElementById('modal-date').textContent        = dateDisplay;
  document.getElementById('modal-time').textContent        = timeStr;
  document.getElementById('modal-location').textContent    = event.location  || 'Location TBC';
  document.getElementById('modal-region').textContent      = event.region;
  document.getElementById('modal-organizer').textContent   = event.organizer || '\u2014';
  document.getElementById('modal-description').textContent = event.description || '';
  document.getElementById('modal-category').textContent    = event.category || '';

  const badge = document.getElementById('modal-source-badge');
  badge.textContent = event.source;
  badge.className   = 'event-source-badge ' + CalendarEvents.sourceClass(event.source);

  const link = document.getElementById('modal-source-link');
  if (event.source_url) {
    link.href          = event.source_url;
    link.style.display = 'inline-flex';
    link.target        = '_blank';
    link.rel           = 'noopener noreferrer';
  } else {
    link.style.display = 'none';
  }
}

function bindModalClose() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (AppState.modalEvent) return;
    if (e.key === 'ArrowLeft')  CalendarEvents.prevMonth();
    if (e.key === 'ArrowRight') CalendarEvents.nextMonth();
  });
}

// ── UI Utilities ────────────────────────────────────────────────────────────
function showLoader(show) {
  document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent    = msg;
  el.style.display  = msg ? 'block' : 'none';
}

const AppEvents = { loadMonth, openModal, closeModal, init };

document.addEventListener('DOMContentLoaded', init);
