'use strict';

// Empty string = same origin (works locally via Express and on Render)
const API_BASE = '';

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function getEvents({ region, source, category, month, year } = {}) {
  const params = new URLSearchParams();
  if (region)   params.set('region',   region);
  if (source)   params.set('source',   source);
  if (category) params.set('category', category);
  if (month)    params.set('month',    month);
  if (year)     params.set('year',     year);
  const qs = params.toString();
  const data = await apiFetch('/api/events' + (qs ? '?' + qs : ''));
  return data.events;
}

async function getEvent(id) {
  const data = await apiFetch('/api/events/' + id);
  return data.event;
}

async function createEvent(payload) {
  const data = await apiFetch('/api/events', { method: 'POST', body: JSON.stringify(payload) });
  return data.event;
}

async function updateEvent(id, payload) {
  const data = await apiFetch('/api/events/' + id, { method: 'PUT', body: JSON.stringify(payload) });
  return data.event;
}

async function deleteEvent(id) {
  return apiFetch('/api/events/' + id, { method: 'DELETE' });
}

async function getRegions()    { return (await apiFetch('/api/events/meta/regions')).regions; }
async function getSources()    { return (await apiFetch('/api/events/meta/sources')).sources; }
async function getCategories() { return (await apiFetch('/api/events/meta/categories')).categories; }

const API = { getEvents, getEvent, createEvent, updateEvent, deleteEvent, getRegions, getSources, getCategories };
