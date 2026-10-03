'use strict';
/* Pulse: personal tracker for workouts, food and body weight.
   Everything is stored on this device (localStorage). Weights are stored in kg
   and distances in km; the unit setting only changes what is displayed. */

const STORE_KEY = 'pulse.v1';
const KG_PER_LB = 0.45359237;
const KM_PER_MI = 1.609344;
const DAY = 86400000;
const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']];
const GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

const DEFAULT_EXERCISES = [
  ['Chest', ['Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Chest Fly', 'Push-up', 'Dips']],
  ['Back', ['Deadlift', 'Pull-up', 'Chin-up', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row', 'Seated Cable Row', 'Face Pull']],
  ['Legs', ['Squat', 'Front Squat', 'Leg Press', 'Romanian Deadlift', 'Lunge', 'Bulgarian Split Squat', 'Leg Extension', 'Leg Curl', 'Hip Thrust', 'Calf Raise']],
  ['Shoulders', ['Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Rear Delt Fly', 'Shrug']],
  ['Arms', ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension']],
  ['Core', ['Hanging Leg Raise', 'Cable Crunch', 'Ab Wheel']],
  ['Cardio', ['Treadmill', 'Running', 'Cycling', 'Rowing Machine', 'Stair Climber', 'Elliptical', 'Walking']],
].flatMap(([group, names]) => names.map(name => ({ id: slug(name), name, group, type: group === 'Cardio' ? 'cardio' : 'strength' })));

// Generic foods, per 100 g (approximate USDA values). Used offline and ahead of database results.
const COMMON_FOODS = [
  ['Chicken breast, cooked', 165, 31, 0, 3.6, '1 breast (172 g)', 172],
  ['Egg, whole, large', 143, 12.6, 0.7, 9.5, '1 large egg (50 g)', 50],
  ['Egg white', 52, 10.9, 0.7, 0.2, '1 large white (33 g)', 33],
  ['White rice, cooked', 130, 2.7, 28.2, 0.3, '1 cup (158 g)', 158],
  ['Brown rice, cooked', 123, 2.7, 25.6, 1, '1 cup (195 g)', 195],
  ['Pasta, cooked', 158, 5.8, 30.9, 0.9, '1 cup (140 g)', 140],
  ['Oats, dry', 389, 16.9, 66.3, 6.9, '1/2 cup (40 g)', 40],
  ['Bread, whole wheat', 247, 13, 41, 3.4, '1 slice (32 g)', 32],
  ['Potato, baked', 93, 2.5, 21.2, 0.1, '1 medium (173 g)', 173],
  ['Sweet potato, baked', 90, 2, 20.7, 0.2, '1 medium (114 g)', 114],
  ['Banana', 89, 1.1, 22.8, 0.3, '1 medium (118 g)', 118],
  ['Apple', 52, 0.3, 13.8, 0.2, '1 medium (182 g)', 182],
  ['Orange', 47, 0.9, 11.8, 0.1, '1 medium (131 g)', 131],
  ['Blueberries', 57, 0.7, 14.5, 0.3, '1 cup (148 g)', 148],
  ['Strawberries', 32, 0.7, 7.7, 0.3, '1 cup (152 g)', 152],
  ['Broccoli', 34, 2.8, 6.6, 0.4, '1 cup (91 g)', 91],
  ['Spinach, raw', 23, 2.9, 3.6, 0.4, '1 cup (30 g)', 30],
  ['Salmon, cooked', 206, 22.1, 0, 12.4, '1 fillet (154 g)', 154],
  ['Tuna, canned in water', 116, 25.5, 0, 0.8, '1 can (165 g)', 165],
  ['Ground beef 90% lean, cooked', 217, 26.1, 0, 11.7, '4 oz (113 g)', 113],
  ['Shrimp, cooked', 99, 24, 0.2, 0.3, '3 oz (85 g)', 85],
  ['Tofu, firm', 144, 17.3, 2.8, 8.7, '1/2 cup (126 g)', 126],
  ['Greek yogurt, plain nonfat', 59, 10.2, 3.6, 0.4, '1 container (170 g)', 170],
  ['Cottage cheese, 2%', 81, 10.5, 4.8, 2.3, '1/2 cup (113 g)', 113],
  ['Milk, whole', 61, 3.2, 4.8, 3.3, '1 cup (244 g)', 244],
  ['Milk, skim', 34, 3.4, 5, 0.1, '1 cup (245 g)', 245],
  ['Cheddar cheese', 403, 24.9, 1.3, 33.1, '1 slice (28 g)', 28],
  ['Peanut butter', 588, 25, 20, 50, '2 tbsp (32 g)', 32],
  ['Almonds', 579, 21.2, 21.6, 49.9, '1 oz (28 g)', 28],
  ['Avocado', 160, 2, 8.5, 14.7, '1/2 avocado (100 g)', 100],
  ['Olive oil', 884, 0, 0, 100, '1 tbsp (13.5 g)', 13.5],
  ['Butter', 717, 0.9, 0.1, 81, '1 tbsp (14 g)', 14],
  ['Whey protein powder (typical)', 400, 80, 8, 6, '1 scoop (30 g)', 30],
  ['Black beans, cooked', 132, 8.9, 23.7, 0.5, '1/2 cup (86 g)', 86],
  ['Lentils, cooked', 116, 9, 20.1, 0.4, '1/2 cup (99 g)', 99],
  ['Hummus', 166, 7.9, 14.3, 9.6, '2 tbsp (30 g)', 30],
  ['Honey', 304, 0.3, 82.4, 0, '1 tbsp (21 g)', 21],
].map(([name, kcal, p, c, f, servingLabel, servingGrams]) =>
  ({ name, brand: '', per100: { kcal, p, c, f }, servingLabel, servingGrams, source: 'common' }));

/* ---------- utilities ---------- */

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoDate(d); };
const round = (n, p = 1) => { const f = 10 ** p; return Math.round(n * f) / f; };
const fmtNum = (n, p = 1) => (n == null || isNaN(n)) ? '-' : round(n, p).toLocaleString(undefined, { maximumFractionDigits: p });
const plain = (n, p = 2) => (n == null || isNaN(n)) ? '' : String(round(n, p));
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

const unitW = () => S.settings.unit;
const unitD = () => S.settings.unit === 'lb' ? 'mi' : 'km';
const toDispW = kg => unitW() === 'lb' ? kg / KG_PER_LB : kg;
const fromDispW = v => unitW() === 'lb' ? v * KG_PER_LB : v;
const toDispD = km => unitW() === 'lb' ? km / KM_PER_MI : km;
const fromDispD = v => unitW() === 'lb' ? v * KM_PER_MI : v;
const fmtW = (kg, p = 1) => kg == null ? '-' : fmtNum(toDispW(kg), p);

const fmtShortDate = ms => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtLongDate = iso => parseISO(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
function dayLabel(iso) {
  const t = isoDate();
  if (iso === t) return 'Today';
  if (iso === addDays(t, -1)) return 'Yesterday';
  if (iso === addDays(t, 1)) return 'Tomorrow';
  return parseISO(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

/* ---------- state ---------- */

function freshState() {
  return {
    version: 1,
    settings: { unit: 'kg', kcal: 2200, protein: 150, carbs: 220, fat: 70, goalKg: null, rest: 90, lastBackup: null },
    exercises: DEFAULT_EXERCISES.map(e => ({ ...e })),
    templates: [],
    workouts: [],
    active: null,
    foods: [],
    log: [],
    weights: [],
  };
}
function migrate(d) {
  const f = freshState();
  return { ...f, ...d, settings: { ...f.settings, ...(d.settings || {}) } };
}
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { /* fall through */ }
  return freshState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save. Storage may be full.'); }
}

let S = load();
const UI = { tab: 'today', foodDate: isoDate(), weightRange: '3M', restEnd: null };

/* ---------- nutrition ---------- */

const ZERO = () => ({ kcal: 0, p: 0, c: 0, f: 0 });
const scaleN = (n, k) => ({ kcal: n.kcal * k, p: n.p * k, c: n.c * k, f: n.f * k });
function nutr(food, qty, unit) {
  qty = +qty || 0;
  if (unit === 'g' && food.per100) return scaleN(food.per100, qty / 100);
  if (food.perServing) return scaleN(food.perServing, qty);
  if (food.per100 && food.servingGrams) return scaleN(food.per100, qty * food.servingGrams / 100);
  return ZERO();
}
const entryN = e => nutr(e.food, e.qty, e.unit);
function unitsFor(food) {
  const u = [];
  if (food.perServing || (food.per100 && food.servingGrams)) u.push(['serving', food.servingLabel || '1 serving']);
  if (food.per100) u.push(['g', 'grams']);
  return u;
}
function sumN(entries) {
  return entries.reduce((a, e) => { const n = entryN(e); a.kcal += n.kcal; a.p += n.p; a.c += n.c; a.f += n.f; return a; }, ZERO());
}
const dayTotals = date => sumN(S.log.filter(e => e.date === date));
function qtyLabel(e) {
  if (e.unit === 'g') return `${fmtNum(e.qty, 1)} g`;
  const lbl = e.food.servingLabel || 'serving';
  return +e.qty === 1 ? lbl : `${fmtNum(e.qty, 2)} × ${lbl}`;
}

async function searchOFF(q) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=30'
    + '&fields=code,product_name,brands,nutriments,serving_size,serving_quantity&search_terms=' + encodeURIComponent(q);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return (data.products || []).map(p => {
      const n = p.nutriments || {};
      let kcal = n['energy-kcal_100g'];
      if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184; // energy_100g is kJ
      if (kcal == null || !p.product_name) return null;
      const sq = parseFloat(p.serving_quantity);
      return {
        name: p.product_name.trim(), brand: (p.brands || '').split(',')[0].trim(), code: p.code,
        per100: { kcal: +kcal || 0, p: +n.proteins_100g || 0, c: +n.carbohydrates_100g || 0, f: +n.fat_100g || 0 },
        servingGrams: sq > 0 ? sq : null, servingLabel: sq > 0 ? (p.serving_size || `${sq} g`) : null, source: 'off',
      };
    }).filter(Boolean);
  } finally { clearTimeout(timer); }
}
function searchCommon(q) {
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  return COMMON_FOODS.filter(f => toks.every(t => f.name.toLowerCase().includes(t)));
}

/* ---------- workouts ---------- */

const exById = id => S.exercises.find(e => e.id === id) || { id, name: 'Unknown exercise', group: 'Other', type: 'strength' };
const isCardio = id => exById(id).type === 'cardio';
const newSet = id => isCardio(id) ? { min: null, km: null, done: false } : { w: null, r: null, done: false };
const hasVals = s => s.r != null || s.min != null || s.km != null;
const e1rm = s => (s.w > 0 && s.r > 0) ? (s.r === 1 ? s.w : s.w * (1 + s.r / 30)) : 0;
const sortedWorkouts = () => [...S.workouts].sort((a, b) => b.start - a.start);

function lastPerformance(exId) {
  for (const w of sortedWorkouts()) {
    const ex = w.exercises.find(e => e.exId === exId);
    if (ex) return ex;
  }
  return null;
}
function newExEntry(exId) {
  const prev = lastPerformance(exId);
  const n = prev ? Math.min(Math.max(prev.sets.length, 1), 8) : 3;
  return { exId, sets: Array.from({ length: n }, () => newSet(exId)) };
}
function workoutVolume(w) {
  return w.exercises.reduce((a, ex) => a + ex.sets.reduce((b, s) => b + (s.w || 0) * (s.r || 0), 0), 0);
}
const setCount = w => w.exercises.reduce((a, ex) => a + ex.sets.length, 0);
function fmtSet(s, exId) {
  if (isCardio(exId)) {
    const parts = [];
    if (s.min != null) parts.push(`${fmtNum(s.min, 1)} min`);
    if (s.km != null) parts.push(`${fmtNum(toDispD(s.km), 2)} ${unitD()}`);
    return parts.join(', ') || '-';
  }
  if (s.w > 0) return `${fmtW(s.w)} ${unitW()} × ${s.r ?? 0}`;
  return `${s.r ?? 0} reps`;
}
function exHistory(exId) {
  return S.workouts.filter(w => w.exercises.some(e => e.exId === exId))
    .sort((a, b) => a.start - b.start)
    .map(w => ({ w, sets: w.exercises.filter(e => e.exId === exId).flatMap(e => e.sets) }));
}
// The metric used for progress and PRs: estimated 1RM for weighted lifts, reps for bodyweight, distance or minutes for cardio.
function exMetric(exId) {
  const hist = exHistory(exId);
  const all = hist.flatMap(h => h.sets);
  if (isCardio(exId)) {
    const useKm = all.some(s => s.km > 0);
    return {
      label: useKm ? 'Distance' : 'Minutes', fmt: v => useKm ? `${fmtNum(toDispD(v), 2)} ${unitD()}` : `${fmtNum(v, 0)} min`,
      disp: v => useKm ? toDispD(v) : v, of: s => useKm ? (s.km || 0) : (s.min || 0), agg: 'sum', hist,
    };
  }
  if (all.some(s => s.w > 0)) {
    return { label: 'Estimated 1-rep max', fmt: v => `${fmtW(v)} ${unitW()}`, disp: toDispW, of: e1rm, agg: 'max', hist };
  }
  return { label: 'Most reps', fmt: v => `${fmtNum(v, 0)} reps`, disp: v => v, of: s => s.r || 0, agg: 'max', hist };
}
function sessionValue(m, sets) {
  const vals = sets.map(m.of);
  return m.agg === 'sum' ? vals.reduce((a, b) => a + b, 0) : Math.max(0, ...vals);
}

function startWorkout(exIds = [], name) {
  if (S.active) { UI.tab = 'train'; render(); return; }
  const h = new Date().getHours();
  S.active = {
    id: uid(), start: Date.now(),
    name: name || (h < 12 ? 'Morning workout' : h < 17 ? 'Afternoon workout' : 'Evening workout'),
    exercises: exIds.map(newExEntry),
  };
  save(); UI.tab = 'train'; closeSheet(); render(); scrollTo(0, 0);
}
function finishWorkout() {
  const a = S.active;
  let undone = 0;
  a.exercises.forEach(ex => ex.sets.forEach(s => { if (!s.done && hasVals(s)) undone++; }));
  if (undone && confirm(`${undone} set${undone > 1 ? 's have' : ' has'} values but ${undone > 1 ? 'are' : 'is'} not ticked. Count ${undone > 1 ? 'them' : 'it'} as done?`)) {
    a.exercises.forEach(ex => ex.sets.forEach(s => { if (hasVals(s)) s.done = true; }));
  }
  const exs = a.exercises
    .map(ex => ({ exId: ex.exId, sets: ex.sets.filter(s => s.done && hasVals(s)).map(({ done, ...rest }) => rest) }))
    .filter(ex => ex.sets.length);
  if (!exs.length) {
    if (!confirm('No completed sets. Discard this workout?')) return;
    S.active = null; UI.restEnd = null; save(); render(); return;
  }
  // count PRs against history before saving
  let prs = 0;
  exs.forEach(ex => {
    const m = exMetric(ex.exId);
    const best = Math.max(0, ...m.hist.map(h => sessionValue(m, h.sets)));
    if (m.hist.length && sessionValue(m, ex.sets) > best) prs++;
  });
  S.workouts.push({ id: a.id, name: a.name.trim() || 'Workout', date: isoDate(new Date(a.start)), start: a.start, end: Date.now(), exercises: exs });
  S.active = null; UI.restEnd = null; save(); render(); scrollTo(0, 0);
  toast(prs ? `Workout saved. ${prs} new personal record${prs > 1 ? 's' : ''}!` : 'Workout saved');
}

/* ---------- weight ---------- */

const weightsSorted = () => [...S.weights].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
function avgWindow(list, endIso, days = 7) {
  const start = addDays(endIso, -(days - 1));
  const xs = list.filter(w => w.date >= start && w.date <= endIso);
  return xs.length ? xs.reduce((a, w) => a + w.kg, 0) / xs.length : null;
}
function saveWeight(date, kg) {
  const i = S.weights.findIndex(w => w.date === date);
  if (i >= 0) S.weights[i].kg = kg; else S.weights.push({ id: uid(), date, kg });
  save();
}

/* ---------- charts ---------- */

let pendingCharts = [];
function chartSlot(draw, cls = 'chart') {
  const id = 'c' + uid();
  pendingCharts.push(() => { const el = document.getElementById(id); if (el) draw(el); });
  return `<div class="${cls}" id="${id}"></div>`;
}
function flushCharts() { const p = pendingCharts; pendingCharts = []; p.forEach(f => f()); }

function niceTicks(lo, hi, n = 4) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw)), norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step * 1e-6; v += step) out.push(round(v, 6));
  return out;
}

// series: [{name, color (css var name), kind: 'line'|'dots', points: [{x: ms, y}]}]
function lineChart(el, { series, yFmt = v => fmtNum(v, 1), height = 200, ref = null, label = 'Chart' }) {
  const pts = series.flatMap(s => s.points);
  if (!pts.length) { el.innerHTML = '<p class="empty">No data yet</p>'; return; }
  const W = Math.max(260, Math.round(el.clientWidth)), H = height, m = { l: 42, r: 14, t: 14, b: 26 };
  let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
  if (x0 === x1) { x0 -= DAY * 3; x1 += DAY * 3; }
  const ys = pts.map(p => p.y); if (ref) ys.push(ref.y);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
  const Y = y => m.t + (hi - y) / (hi - lo) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">`;
  ticks.forEach(t => {
    s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/>`
      + `<text class="axis" x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end">${esc(yFmt(t))}</text>`;
  });
  const seenX = new Set();
  [[x0, 'start'], [(x0 + x1) / 2, 'middle'], [x1, 'end']].forEach(([x, a]) => {
    const t = fmtShortDate(x);
    if (!seenX.has(t)) { seenX.add(t); s += `<text class="axis" x="${X(x)}" y="${H - 6}" text-anchor="${a}">${t}</text>`; }
  });
  if (ref) {
    s += `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${Y(ref.y)}" y2="${Y(ref.y)}"/>`
      + `<text class="ref-label" x="${W - m.r}" y="${Y(ref.y) - 5}" text-anchor="end">${esc(ref.label)}</text>`;
  }
  series.forEach(se => {
    if (se.kind === 'dots') {
      se.points.forEach(p => { s += `<circle class="dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="4" style="fill:var(${se.color})"/>`; });
    } else if (se.points.length === 1) {
      const p = se.points[0];
      s += `<circle class="dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="4" style="fill:var(${se.color})"/>`;
    } else {
      const d = se.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
      s += `<path class="line" d="${d}" style="stroke:var(${se.color})"/>`;
    }
  });
  s += `<line class="xhair" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="display:none"/><g class="hl"></g>`
    + `<rect class="hit" x="0" y="0" width="${W}" height="${H}"/></svg><div class="tip" hidden></div>`;
  el.innerHTML = s;

  const xsU = [...new Set(pts.map(p => p.x))].sort((a, b) => a - b);
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = svg.querySelector('.xhair'), hl = svg.querySelector('.hl');
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const xv = x0 + ((ev.clientX - r.left) * (W / r.width) - m.l) / (W - m.l - m.r) * (x1 - x0);
    let best = xsU[0];
    for (const x of xsU) if (Math.abs(x - xv) < Math.abs(best - xv)) best = x;
    const cx = X(best);
    xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.style.display = '';
    const rows = series.map(se => ({ se, p: se.points.find(p => p.x === best) })).filter(o => o.p);
    hl.innerHTML = rows.map(({ se, p }) => `<circle class="hl-dot" cx="${cx}" cy="${Y(p.y)}" r="5.5" style="fill:var(${se.color})"/>`).join('');
    tip.innerHTML = `<div class="tip-title">${fmtShortDate(best)}</div>` + rows.map(({ se, p }) =>
      `<div class="tip-row"><span class="key" style="background:var(${se.color})"></span><span>${esc(se.name)}</span><b>${esc(yFmt(p.y))}</b></div>`).join('');
    tip.hidden = false;
    const px = cx * (r.width / W), tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(px - tw / 2, 0), r.width - tw) + 'px';
  };
  const hide = () => { tip.hidden = true; xh.style.display = 'none'; hl.innerHTML = ''; };
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hide(); });
}

// bars: [{label, value, tip: html}]
function columnChart(el, { bars, ref = null, height = 170, label = 'Chart' }) {
  const W = Math.max(260, Math.round(el.clientWidth)), H = height, m = { l: 8, r: 8, t: 22, b: 24 };
  const max = Math.max(1, ref ? ref.y : 0, ...bars.map(b => b.value)) * 1.08;
  const band = (W - m.l - m.r) / bars.length, bw = Math.min(24, band * 0.6);
  const Y = v => m.t + (1 - v / max) * (H - m.t - m.b), base = Y(0);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">`;
  s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${base}" y2="${base}"/>`;
  bars.forEach((b, i) => {
    const cx = m.l + band * (i + 0.5), x = cx - bw / 2, y = Y(b.value), h = base - y;
    if (h > 0.5) {
      const r = Math.min(4, h, bw / 2);
      s += `<path class="bar" d="M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${base}Z"/>`;
      s += `<text class="bar-val" x="${cx}" y="${y - 6}" text-anchor="middle">${fmtNum(b.value, 0)}</text>`;
    }
    s += `<text class="axis" x="${cx}" y="${H - 6}" text-anchor="middle">${esc(b.label)}</text>`;
    s += `<rect class="hit" data-i="${i}" x="${cx - band / 2}" y="0" width="${band}" height="${H}"/>`;
  });
  if (ref) {
    s += `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${Y(ref.y)}" y2="${Y(ref.y)}"/>`
      + `<text class="ref-label" x="${m.l}" y="${Y(ref.y) - 5}">${esc(ref.label)}</text>`;
  }
  el.innerHTML = s + '</svg><div class="tip" hidden></div>';
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip');
  svg.addEventListener('pointerdown', ev => {
    const hit = ev.target.closest('.hit'); if (!hit) return;
    const i = +hit.dataset.i, r = svg.getBoundingClientRect();
    tip.innerHTML = bars[i].tip; tip.hidden = false;
    const px = (m.l + band * (i + 0.5)) * (r.width / W), tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(px - tw / 2, 0), r.width - tw) + 'px';
  });
  svg.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') tip.hidden = true; });
  svg.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') svg.dispatchEvent(new PointerEvent('pointerdown', ev)); });
}

function sparkline(el, values) {
  if (values.length < 2) { el.innerHTML = ''; return; }
  const W = Math.max(80, Math.round(el.clientWidth)), H = 40, lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(2 + i / (values.length - 1) * (W - 4)).toFixed(1)},${(3 + (hi - v) / span * (H - 6)).toFixed(1)}`).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path class="line" d="${d}" style="stroke:var(--accent)"/></svg>`;
}

function ring(value, goal) {
  const r = 42, c = 2 * Math.PI * r, frac = goal > 0 ? Math.min(value / goal, 1) : 0, over = value > goal;
  return `<svg class="ring" viewBox="0 0 100 100" role="img" aria-label="${fmtNum(value, 0)} of ${fmtNum(goal, 0)} kcal">
    <circle cx="50" cy="50" r="${r}" class="ring-track"/>
    <circle cx="50" cy="50" r="${r}" class="ring-fill ${over ? 'over' : ''}" stroke-dasharray="${(frac * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>
    <text x="50" y="49" text-anchor="middle" class="ring-num">${Math.round(frac * 100)}%</text>
    <text x="50" y="64" text-anchor="middle" class="ring-sub">of goal</text></svg>`;
}
function macroBars(t) {
  const g = S.settings;
  return `<div class="macros">${[['Protein', t.p, g.protein], ['Carbs', t.c, g.carbs], ['Fat', t.f, g.fat]].map(([n, v, goal]) => `
    <div class="macro">
      <div class="macro-top"><span>${n}</span><span class="muted">${fmtNum(v, 0)} / ${fmtNum(goal, 0)} g</span></div>
      <div class="meter"><span style="width:${goal > 0 ? Math.min(100, v / goal * 100) : 0}%"></span></div>
    </div>`).join('')}</div>`;
}

/* ---------- views ---------- */

function viewToday() {
  const t = isoDate(), tot = dayTotals(t), g = S.settings, left = g.kcal - tot.kcal;
  const ws = weightsSorted(), last = ws[ws.length - 1];
  const avg7 = avgWindow(ws, t), avgPrev = avgWindow(ws, addDays(t, -7));
  const todays = S.workouts.filter(w => w.date === t);
  const week = S.workouts.filter(w => w.date > addDays(t, -7)).length;
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const hasData = S.workouts.length + S.log.length + S.weights.length > 0;
  const backupDue = hasData && (!g.lastBackup || Date.now() - g.lastBackup > 14 * DAY);
  const spark = [];
  for (let i = 29; i >= 0; i--) { const v = avgWindow(ws, addDays(t, -i)); if (v != null) spark.push(toDispW(v)); }

  return `
  <header class="page-head"><p class="eyebrow">${esc(fmtLongDate(t))}</p><h1>${greeting()}</h1></header>
  ${!standalone ? `<section class="card note"><b>Install on your iPhone:</b> in Safari tap the Share button, then <b>Add to Home Screen</b>. It will open full screen and work offline.</section>` : ''}
  ${S.active ? `<button class="card banner" data-act="goto" data-tab="train"><span><b>Workout in progress</b><br><span class="muted">${esc(S.active.name)}</span></span><span class="chev">Resume</span></button>` : ''}

  <section class="card">
    <div class="card-head"><h2>Calories</h2><button class="link" data-act="goto" data-tab="food">Log food</button></div>
    <div class="cal-row">
      ${ring(tot.kcal, g.kcal)}
      <div class="cal-stats">
        <div class="big">${fmtNum(Math.abs(left), 0)}</div>
        <div class="muted">${left >= 0 ? 'kcal remaining' : 'kcal over goal'}</div>
        <div class="muted small">${fmtNum(tot.kcal, 0)} eaten of ${fmtNum(g.kcal, 0)}</div>
      </div>
    </div>
    ${macroBars(tot)}
  </section>

  <section class="card">
    <div class="card-head"><h2>Body weight</h2><button class="link" data-act="logWeight">Log weight</button></div>
    ${last ? `
    <div class="weight-row">
      <div>
        <div class="big">${fmtW(last.kg)} <span class="unit">${unitW()}</span></div>
        <div class="muted small">${esc(dayLabel(last.date))}${avg7 != null ? ` · 7-day avg ${fmtW(avg7)}` : ''}</div>
        ${avg7 != null && avgPrev != null ? `<div class="small delta">${deltaText(avg7 - avgPrev)} vs last week</div>` : ''}
      </div>
      ${chartSlot(el => sparkline(el, spark), 'spark')}
    </div>` : `<p class="muted">No weigh-ins yet. Weigh yourself in the morning for the most consistent trend.</p>`}
  </section>

  <section class="card">
    <div class="card-head"><h2>Training</h2><span class="muted small">${week} workout${week === 1 ? '' : 's'} in the last 7 days</span></div>
    ${todays.length ? `<div class="list">${todays.map(workoutRow).join('')}</div>` : `<p class="muted">No workout logged today.</p>`}
    ${S.active ? '' : `<button class="btn primary block" data-act="startEmpty">Start workout</button>`}
  </section>

  ${backupDue ? `<section class="card note"><b>Back up your data.</b> Everything is stored on this phone only. <button class="link" data-act="exportData">Export a backup</button></section>` : ''}`;
}
function deltaText(d) {
  const v = toDispW(d);
  if (Math.abs(v) < 0.05) return 'No change';
  return `${v > 0 ? '▲' : '▼'} ${fmtNum(Math.abs(v), 1)} ${unitW()}`;
}
function workoutRow(w) {
  const vol = workoutVolume(w);
  return `<button class="list-item" data-act="viewWorkout" data-id="${w.id}">
    <span class="li-main"><b>${esc(w.name)}</b><span class="muted small">${esc(dayLabel(w.date))} · ${fmtDur(w.end - w.start)} · ${w.exercises.length} exercise${w.exercises.length === 1 ? '' : 's'}</span></span>
    <span class="li-side">${vol ? `${fmtNum(toDispW(vol), 0)} ${unitW()}` : `${setCount(w)} sets`}</span></button>`;
}

function viewTrain() {
  if (S.active) return viewActive();
  const t = isoDate(), week = S.workouts.filter(w => w.date > addDays(t, -7)).length;
  const hist = sortedWorkouts().slice(0, UI.histAll ? undefined : 15);
  return `
  <header class="page-head"><p class="eyebrow">${week} workout${week === 1 ? '' : 's'} in the last 7 days</p><h1>Train</h1></header>
  <button class="btn primary block lg" data-act="startEmpty">Start empty workout</button>
  <div class="section-head"><h2>Routines</h2><button class="link" data-act="editRoutine">New routine</button></div>
  ${S.templates.length ? S.templates.map(r => `
    <section class="card routine">
      <div class="card-head"><h3>${esc(r.name)}</h3><button class="link" data-act="editRoutine" data-id="${r.id}">Edit</button></div>
      <p class="muted small">${esc(r.exIds.map(id => exById(id).name).join(', ') || 'No exercises')}</p>
      <button class="btn secondary block" data-act="startRoutine" data-id="${r.id}">Start</button>
    </section>`).join('') : `<p class="muted pad">Save the workouts you repeat, like Push, Pull and Legs, so you can start them in one tap.</p>`}
  <div class="section-head"><h2>History</h2><button class="link" data-act="openLibrary">Exercises &amp; records</button></div>
  ${hist.length ? `<div class="card list flush">${hist.map(workoutRow).join('')}</div>` : `<p class="muted pad">Finished workouts appear here.</p>`}
  ${!UI.histAll && S.workouts.length > 15 ? `<button class="btn ghost block" data-act="histAll">Show all ${S.workouts.length}</button>` : ''}`;
}

function viewActive() {
  const a = S.active;
  return `
  <header class="page-head row">
    <div class="grow"><p class="eyebrow">Workout in progress</p><input class="title-input" data-input="wname" value="${esc(a.name)}" aria-label="Workout name"></div>
    <div class="timer" id="elapsed">${fmtDur(Date.now() - a.start)}</div>
  </header>
  ${a.exercises.map((ex, i) => exCard(ex, i)).join('')}
  ${a.exercises.length ? '' : `<p class="muted pad">Add your first exercise to get started.</p>`}
  <button class="btn secondary block" data-act="pickExercise">+ Add exercise</button>
  <div class="row gap mt">
    <button class="btn danger-ghost grow" data-act="discardWorkout">Discard</button>
    <button class="btn primary grow" data-act="finishWorkout">Finish workout</button>
  </div>`;
}
function exCard(ex, i) {
  const e = exById(ex.exId), cardio = e.type === 'cardio', prev = lastPerformance(ex.exId);
  const head = cardio ? `<th>Min</th><th>${unitD()}</th>` : `<th>${unitW()}</th><th>Reps</th>`;
  const rows = ex.sets.map((s, j) => {
    const p = prev && prev.sets[j];
    const ph1 = p ? (cardio ? plain(p.min, 1) : plain(p.w > 0 ? toDispW(p.w) : null, 1)) : '';
    const ph2 = p ? (cardio ? plain(p.km != null ? toDispD(p.km) : null, 2) : plain(p.r, 0)) : '';
    const v1 = cardio ? plain(s.min, 1) : plain(s.w != null ? toDispW(s.w) : null, 2);
    const v2 = cardio ? plain(s.km != null ? toDispD(s.km) : null, 2) : plain(s.r, 0);
    return `<tr class="${s.done ? 'done' : ''}">
      <td class="set-n">${j + 1}</td>
      <td class="prev">${p ? esc(fmtSet(p, ex.exId)) : '-'}</td>
      <td><input inputmode="decimal" data-input="set1" data-i="${i}" data-j="${j}" value="${v1}" placeholder="${ph1}" aria-label="${cardio ? 'Minutes' : 'Weight'} set ${j + 1}"></td>
      <td><input inputmode="${cardio ? 'decimal' : 'numeric'}" data-input="set2" data-i="${i}" data-j="${j}" value="${v2}" placeholder="${ph2}" aria-label="${cardio ? 'Distance' : 'Reps'} set ${j + 1}"></td>
      <td><button class="check ${s.done ? 'on' : ''}" data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Mark set ${j + 1} done">✓</button></td>
    </tr>`;
  }).join('');
  return `<section class="card ex-card">
    <div class="card-head"><h3>${esc(e.name)}</h3><button class="icon-btn" data-act="exMenu" data-i="${i}" aria-label="Exercise options">•••</button></div>
    <table class="sets"><thead><tr><th>Set</th><th>Previous</th>${head}<th></th></tr></thead><tbody>${rows}</tbody></table>
    <button class="btn ghost small block" data-act="addSet" data-i="${i}">+ Add set</button>
  </section>`;
}

function viewFood() {
  const d = UI.foodDate, tot = dayTotals(d), g = S.settings, left = g.kcal - tot.kcal;
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const day = addDays(d, -i), n = dayTotals(day);
    bars.push({
      label: parseISO(day).toLocaleDateString(undefined, { weekday: 'narrow' }), value: n.kcal,
      tip: `<div class="tip-title">${esc(dayLabel(day))}</div><div class="tip-row"><span>Calories</span><b>${fmtNum(n.kcal, 0)}</b></div>
        <div class="tip-row"><span>Protein</span><b>${fmtNum(n.p, 0)} g</b></div><div class="tip-row"><span>Carbs</span><b>${fmtNum(n.c, 0)} g</b></div><div class="tip-row"><span>Fat</span><b>${fmtNum(n.f, 0)} g</b></div>`,
    });
  }
  return `
  <header class="page-head"><h1>Food</h1></header>
  <div class="date-nav">
    <button class="icon-btn" data-act="foodDay" data-d="-1" aria-label="Previous day">‹</button>
    <button class="date-label" data-act="foodToday">${esc(dayLabel(d))}</button>
    <button class="icon-btn" data-act="foodDay" data-d="1" aria-label="Next day">›</button>
  </div>
  <section class="card">
    <div class="sum-row">
      <div><div class="big">${fmtNum(tot.kcal, 0)}</div><div class="muted small">eaten</div></div>
      <div class="op">/</div>
      <div><div class="big">${fmtNum(g.kcal, 0)}</div><div class="muted small">goal</div></div>
      <div class="op">=</div>
      <div><div class="big ${left < 0 ? 'over' : ''}">${fmtNum(Math.abs(left), 0)}</div><div class="muted small">${left >= 0 ? 'left' : 'over'}</div></div>
    </div>
    ${macroBars(tot)}
  </section>
  ${MEALS.map(([k, name]) => {
    const es = S.log.filter(e => e.date === d && e.meal === k).sort((a, b) => a.t - b.t), n = sumN(es);
    return `<section class="card meal">
      <div class="card-head"><h3>${name}</h3><span class="muted small">${fmtNum(n.kcal, 0)} kcal</span></div>
      ${es.length ? `<div class="list">${es.map(e => {
        const en = entryN(e);
        return `<button class="list-item" data-act="editEntry" data-id="${e.id}">
          <span class="li-main"><b>${esc(e.food.name)}</b><span class="muted small">${esc(qtyLabel(e))} · P ${fmtNum(en.p, 0)} · C ${fmtNum(en.c, 0)} · F ${fmtNum(en.f, 0)}</span></span>
          <span class="li-side">${fmtNum(en.kcal, 0)}</span></button>`;
      }).join('')}</div>` : ''}
      <button class="btn ghost small block" data-act="addFood" data-meal="${k}">+ Add food</button>
    </section>`;
  }).join('')}
  <section class="card">
    <div class="card-head"><h2>Calories, 7 days</h2><span class="muted small">Tap a day for details</span></div>
    ${chartSlot(el => columnChart(el, { bars, ref: { y: g.kcal, label: `Goal ${fmtNum(g.kcal, 0)}` }, label: 'Calories per day for the last 7 days' }))}
  </section>`;
}

function viewWeight() {
  const ws = weightsSorted(), t = isoDate(), g = S.settings;
  const last = ws[ws.length - 1];
  const avg7 = avgWindow(ws, t);
  const a30 = avgWindow(ws, addDays(t, -30));
  const ranges = { '1M': 30, '3M': 90, '6M': 182, '1Y': 365, All: null };
  const days = ranges[UI.weightRange];
  const from = days ? addDays(t, -days) : '0000';
  const inRange = ws.filter(w => w.date >= from);
  const dots = inRange.map(w => ({ x: parseISO(w.date).getTime(), y: toDispW(w.kg) }));
  const trend = inRange.map(w => ({ x: parseISO(w.date).getTime(), y: toDispW(avgWindow(ws, w.date)) }));
  let ref = null;
  if (g.goalKg && dots.length) {
    const ys = dots.map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys), span = Math.max(hi - lo, 2), gy = toDispW(g.goalKg);
    if (gy >= lo - span && gy <= hi + span) ref = { y: gy, label: `Goal ${fmtNum(gy, 1)}` };
  }
  return `
  <header class="page-head"><h1>Weight</h1></header>
  <form class="card log-form" data-form="weight">
    <label class="field grow"><span>Weight (${unitW()})</span><input name="v" inputmode="decimal" placeholder="${last ? plain(toDispW(last.kg), 1) : '0.0'}" required></label>
    <label class="field"><span>Date</span><input name="d" type="date" value="${t}" max="${t}"></label>
    <button class="btn primary" type="submit">Save</button>
  </form>
  <div class="tiles">
    <div class="tile"><span class="muted small">Latest</span><b>${last ? fmtW(last.kg) : '-'}</b></div>
    <div class="tile"><span class="muted small">7-day avg</span><b>${avg7 != null ? fmtW(avg7) : '-'}</b></div>
    <div class="tile"><span class="muted small">30 days</span><b>${avg7 != null && a30 != null ? deltaText(avg7 - a30).replace(` ${unitW()}`, '') : '-'}</b></div>
    <div class="tile"><span class="muted small">To goal</span><b>${g.goalKg && last ? fmtNum(Math.abs(toDispW(last.kg - g.goalKg)), 1) : '-'}</b></div>
  </div>
  <section class="card">
    <div class="seg">${Object.keys(ranges).map(k => `<button class="${k === UI.weightRange ? 'on' : ''}" data-act="wRange" data-r="${k}">${k}</button>`).join('')}</div>
    ${dots.length ? `<div class="legend"><span><i class="key dot-key" style="background:var(--s-muted)"></i>Weigh-in</span><span><i class="key line-key" style="background:var(--accent)"></i>7-day average</span></div>` : ''}
    ${chartSlot(el => lineChart(el, {
      series: [{ name: 'Weigh-in', color: '--s-muted', kind: 'dots', points: dots }, { name: '7-day avg', color: '--accent', kind: 'line', points: trend }],
      yFmt: v => fmtNum(v, 1), ref, label: `Body weight in ${unitW()}`,
    }))}
    <p class="muted small">Daily weight swings 1 to 2 ${unitW() === 'kg' ? 'kg' : 'lb'} with water and food. Watch the average line, not single days.</p>
  </section>
  <div class="section-head"><h2>History</h2></div>
  ${ws.length ? `<div class="card list flush">${ws.slice().reverse().slice(0, UI.wAll ? undefined : 30).map((w, i, arr) => {
    const prev = ws[ws.length - 2 - i];
    return `<div class="list-item static">
      <span class="li-main"><b>${fmtW(w.kg)} ${unitW()}</b><span class="muted small">${esc(dayLabel(w.date))}${prev ? ` · ${deltaText(w.kg - prev.kg)}` : ''}</span></span>
      <button class="icon-btn" data-act="delWeight" data-id="${w.id}" aria-label="Delete entry">✕</button></div>`;
  }).join('')}</div>` : `<p class="muted pad">Your weigh-ins appear here.</p>`}
  ${!UI.wAll && ws.length > 30 ? `<button class="btn ghost block" data-act="wAll">Show all ${ws.length}</button>` : ''}`;
}

function viewMore() {
  const g = S.settings, u = unitW();
  const macroK = g.protein * 4 + g.carbs * 4 + g.fat * 9;
  const field = (k, label, val, suffix) => `<label class="field"><span>${label}</span><span class="input-suffix"><input inputmode="decimal" data-change="setting" data-k="${k}" value="${val ?? ''}"><em>${suffix}</em></span></label>`;
  return `
  <header class="page-head"><h1>Settings</h1></header>
  <div class="section-head"><h2>Daily goals</h2></div>
  <section class="card form-grid">
    ${field('kcal', 'Calories', g.kcal, 'kcal')}
    ${field('protein', 'Protein', g.protein, 'g')}
    ${field('carbs', 'Carbs', g.carbs, 'g')}
    ${field('fat', 'Fat', g.fat, 'g')}
    <p class="muted small span2">Your macros add up to ${fmtNum(macroK, 0)} kcal${Math.abs(macroK - g.kcal) > 50 ? ` (${macroK > g.kcal ? 'above' : 'below'} your calorie goal)` : ''}. Protein and carbs have 4 kcal per gram, fat has 9.</p>
  </section>
  <div class="section-head"><h2>Body &amp; training</h2></div>
  <section class="card form-grid">
    <div class="field span2"><span>Units</span><div class="seg">
      <button class="${u === 'kg' ? 'on' : ''}" data-act="setUnit" data-u="kg">kg, km</button>
      <button class="${u === 'lb' ? 'on' : ''}" data-act="setUnit" data-u="lb">lb, mi</button></div></div>
    ${field('goalW', 'Goal weight', g.goalKg ? plain(toDispW(g.goalKg), 1) : '', u)}
    ${field('rest', 'Rest timer', g.rest, 'sec')}
  </section>
  <div class="section-head"><h2>Your data</h2></div>
  <section class="card">
    <p class="muted small">Your data is stored only on this phone. Export a backup now and then (save it to Files or iCloud Drive). Deleting the home screen app also deletes its data.</p>
    <p class="small">Last backup: <b>${g.lastBackup ? esc(dayLabel(isoDate(new Date(g.lastBackup)))) : 'never'}</b></p>
    <button class="btn secondary block" data-act="exportData">Export backup</button>
    <label class="btn secondary block file-btn">Restore from backup<input type="file" accept="application/json,.json" data-change="importData"></label>
    <button class="btn danger-ghost block" data-act="eraseAll">Erase all data</button>
  </section>
  <p class="muted small pad">Food search uses <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL). Common foods use approximate USDA values.<br>
  ${S.workouts.length} workouts · ${S.log.length} food entries · ${S.weights.length} weigh-ins</p>`;
}

/* ---------- sheets ---------- */

let sheetRender = null;
function openSheet(fn) {
  sheetRender = fn;
  const el = $('#sheet');
  el.hidden = false;
  document.body.classList.add('locked');
  refreshSheet();
  requestAnimationFrame(() => el.classList.add('open'));
}
function refreshSheet() {
  if (!sheetRender) return;
  $('#sheet-body').innerHTML = sheetRender();
  flushCharts();
}
function closeSheet() {
  const el = $('#sheet');
  if (el.hidden) return;
  sheetRender = null;
  el.classList.remove('open');
  document.body.classList.remove('locked');
  setTimeout(() => { if (!sheetRender) { el.hidden = true; $('#sheet-body').innerHTML = ''; } }, 260);
}
const sheetHead = (title, left = '<span></span>') =>
  `<div class="sheet-head">${left}<h2>${title}</h2><button class="link" data-act="closeSheet">Done</button></div>`;

// Weight quick log
function weightSheet() {
  const last = weightsSorted().pop();
  return `${sheetHead('Log weight')}
  <form class="stack" data-form="weight">
    <label class="field"><span>Weight (${unitW()})</span><input name="v" inputmode="decimal" placeholder="${last ? plain(toDispW(last.kg), 1) : '0.0'}" required autofocus></label>
    <label class="field"><span>Date</span><input name="d" type="date" value="${isoDate()}" max="${isoDate()}"></label>
    <button class="btn primary block" type="submit">Save</button>
  </form>`;
}

// Exercise picker (adds to the active workout)
function pickerList(filter) {
  const q = filter.trim().toLowerCase();
  const xs = S.exercises.filter(e => !q || e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q));
  if (!xs.length) return `<p class="muted pad">No match. Create it below.</p>`;
  return GROUPS.map(gr => {
    const items = xs.filter(e => e.group === gr).sort((a, b) => a.name.localeCompare(b.name));
    return items.length ? `<h4 class="group">${gr}</h4>` + items.map(e =>
      `<button class="list-item" data-act="${UI.pick.mode === 'library' ? 'viewExercise' : 'addExercise'}" data-id="${e.id}"><span class="li-main"><b>${esc(e.name)}</b></span><span class="chev">›</span></button>`).join('') : '';
  }).join('');
}
function pickerSheet() {
  const p = UI.pick;
  if (p.creating) {
    return `${sheetHead('New exercise', '<button class="link" data-act="pickBack">Back</button>')}
    <form class="stack" data-form="newExercise">
      <label class="field"><span>Name</span><input name="name" required autofocus value="${esc(p.filter)}"></label>
      <label class="field"><span>Muscle group</span><select name="group">${GROUPS.map(g => `<option>${g}</option>`).join('')}</select></label>
      <label class="field"><span>Type</span><select name="type"><option value="strength">Weight and reps</option><option value="cardio">Time and distance</option></select></label>
      <button class="btn primary block" type="submit">Create</button>
    </form>`;
  }
  return `${sheetHead(p.mode === 'library' ? 'Exercises' : 'Add exercise')}
  <input class="search" type="search" placeholder="Search exercises" data-input="pickFilter" value="${esc(p.filter)}">
  <div id="pick-list" class="list">${pickerList(p.filter)}</div>
  <button class="btn secondary block" data-act="pickCreate">+ Create new exercise</button>`;
}

function exerciseSheet(exId) {
  const e = exById(exId), m = exMetric(exId);
  const pts = m.hist.map(h => ({ x: h.w.start, y: m.disp(sessionValue(m, h.sets)) })).filter(p => p.y > 0);
  const best = m.hist.reduce((b, h) => Math.max(b, sessionValue(m, h.sets)), 0);
  let bestSet = null;
  if (e.type !== 'cardio') m.hist.forEach(h => h.sets.forEach(s => { if (!bestSet || (s.w || 0) > (bestSet.w || 0) || ((s.w || 0) === (bestSet.w || 0) && (s.r || 0) > (bestSet.r || 0))) bestSet = s; }));
  const back = UI.pick && UI.pick.mode === 'library' ? '<button class="link" data-act="libraryBack">Back</button>' : '<span></span>';
  return `${sheetHead(esc(e.name), back)}
  <div class="tiles">
    <div class="tile"><span class="muted small">Sessions</span><b>${m.hist.length}</b></div>
    <div class="tile"><span class="muted small">Best ${m.agg === 'sum' ? 'session' : ''}</span><b>${best ? esc(m.fmt(best)) : '-'}</b></div>
    ${bestSet ? `<div class="tile wide"><span class="muted small">Heaviest set</span><b>${esc(fmtSet(bestSet, exId))}</b></div>` : ''}
  </div>
  <section class="card">
    <div class="card-head"><h3>${esc(m.label)}</h3><span class="muted small">per session</span></div>
    ${chartSlot(el => lineChart(el, { series: [{ name: m.label, color: '--accent', kind: 'line', points: pts }], yFmt: v => fmtNum(v, 1), height: 180, label: `${e.name} progress` }))}
  </section>
  ${m.hist.length ? `<div class="list card flush">${m.hist.slice().reverse().slice(0, 12).map(h => `
    <div class="list-item static"><span class="li-main"><b>${esc(dayLabel(h.w.date))}</b><span class="muted small">${esc(h.sets.map(s => fmtSet(s, exId)).join('  ·  '))}</span></span></div>`).join('')}</div>` : '<p class="muted pad">No sessions logged yet.</p>'}
  ${!DEFAULT_EXERCISES.some(d => d.id === exId) && !(S.active && S.active.exercises.some(x => x.exId === exId)) && !S.workouts.some(w => w.exercises.some(x => x.exId === exId)) ? `<button class="btn danger-ghost block" data-act="delExercise" data-id="${exId}">Delete exercise</button>` : ''}`;
}

function workoutSheet(id) {
  const w = S.workouts.find(x => x.id === id);
  if (!w) return sheetHead('Workout') + '<p class="muted">Not found.</p>';
  const vol = workoutVolume(w);
  return `${sheetHead(esc(w.name))}
  <p class="muted">${esc(fmtLongDate(w.date))} · ${fmtDur(w.end - w.start)}${vol ? ` · ${fmtNum(toDispW(vol), 0)} ${unitW()} volume` : ''}</p>
  ${w.exercises.map(ex => `<section class="card">
    <div class="card-head"><h3>${esc(exById(ex.exId).name)}</h3><button class="link" data-act="viewExercise" data-id="${ex.exId}">Progress</button></div>
    <ol class="set-list">${ex.sets.map(s => `<li>${esc(fmtSet(s, ex.exId))}</li>`).join('')}</ol></section>`).join('')}
  <button class="btn secondary block" data-act="repeatWorkout" data-id="${w.id}">Repeat this workout</button>
  <button class="btn secondary block" data-act="saveAsRoutine" data-id="${w.id}">Save as routine</button>
  <button class="btn danger-ghost block" data-act="delWorkout" data-id="${w.id}">Delete workout</button>`;
}

function routineSheet() {
  const r = UI.routine;
  const listHtml = routineList(r);
  return `${sheetHead(r.id ? 'Edit routine' : 'New routine', '<button class="link" data-act="closeSheet">Cancel</button>')}
  <label class="field"><span>Name</span><input data-input="rName" value="${esc(r.name)}" placeholder="e.g. Push day"></label>
  <div class="chips">${r.exIds.length ? r.exIds.map((id, i) => `<span class="chip">${i + 1}. ${esc(exById(id).name)}</span>`).join('') : '<span class="muted small">Tick exercises below, in the order you do them.</span>'}</div>
  <input class="search" type="search" placeholder="Search exercises" data-input="rFilter" value="${esc(r.filter)}">
  <div id="r-list" class="list checklist">${listHtml}</div>
  <button class="btn primary block" data-act="saveRoutine">Save routine</button>
  ${r.id ? `<button class="btn danger-ghost block" data-act="delRoutine">Delete routine</button>` : ''}`;
}
function routineList(r) {
  const q = r.filter.trim().toLowerCase();
  return S.exercises.filter(e => !q || e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))
    .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.name.localeCompare(b.name))
    .map(e => `<button class="list-item ${r.exIds.includes(e.id) ? 'checked' : ''}" data-act="rToggle" data-id="${e.id}">
      <span class="tick">${r.exIds.includes(e.id) ? '✓' : ''}</span><span class="li-main"><b>${esc(e.name)}</b><span class="muted small">${e.group}</span></span></button>`).join('');
}

// Add / edit food
function addFoodSheet() {
  const af = UI.af;
  if (af.sel) return amountView(af);
  const tabs = [['search', 'Search'], ['mine', 'My foods'], ['quick', 'Quick add']];
  let body = '';
  if (af.tab === 'search') {
    const r = af.results;
    body = `<form class="search-row" data-form="foodSearch"><input class="search" type="search" name="q" placeholder="e.g. chicken breast, Greek yogurt" value="${esc(af.q)}" autofocus enterkeyhint="search"><button class="btn primary" type="submit">Search</button></form>
    ${r ? `
      ${r.common.length ? `<h4 class="group">Common foods</h4><div class="list">${r.common.map((f, i) => foodRow(f, 'common', i)).join('')}</div>` : ''}
      <h4 class="group">Food database</h4>
      ${af.loading ? '<p class="muted pad">Searching…</p>' : af.error ? `<p class="muted pad">${esc(af.error)}</p>` :
        r.off.length ? `<div class="list">${r.off.map((f, i) => foodRow(f, 'off', i)).join('')}</div>` : '<p class="muted pad">No results. Try fewer or different words, or use Quick add.</p>'}`
      : '<p class="muted pad">Search over 3 million products, or pick from common foods. Values are per 100 g unless a serving is shown.</p>'}`;
  } else if (af.tab === 'mine') {
    af.mine = myFoods(af.filter);
    body = `<input class="search" type="search" placeholder="Filter" data-input="afFilter" value="${esc(af.filter)}">
    <div id="mine-list">${mineList(af)}</div>`;
  } else {
    body = `<form class="stack" data-form="quickAdd">
      <label class="field"><span>Name</span><input name="name" placeholder="e.g. Homemade chili" required></label>
      <div class="form-grid">
        <label class="field"><span>Calories</span><input name="kcal" inputmode="decimal" required></label>
        <label class="field"><span>Protein (g)</span><input name="p" inputmode="decimal"></label>
        <label class="field"><span>Carbs (g)</span><input name="c" inputmode="decimal"></label>
        <label class="field"><span>Fat (g)</span><input name="f" inputmode="decimal"></label>
      </div>
      <label class="check-row"><input type="checkbox" name="save" checked> Save to My foods (as 1 serving)</label>
      <button class="btn primary block" type="submit">Add to ${mealName(af.meal)}</button>
    </form>`;
  }
  return `${sheetHead(`Add to ${mealName(af.meal)}`)}
  <div class="seg">${tabs.map(([k, n]) => `<button class="${af.tab === k ? 'on' : ''}" data-act="afTab" data-t="${k}">${n}</button>`).join('')}</div>
  ${body}`;
}
const mealName = k => (MEALS.find(m => m[0] === k) || MEALS[3])[1];
function foodRow(f, src, i) {
  const basis = f.perServing ? `${fmtNum(f.perServing.kcal, 0)} kcal / ${esc(f.servingLabel || 'serving')}` :
    `${fmtNum(f.per100.kcal, 0)} kcal / 100 g${f.servingLabel ? ` · ${esc(f.servingLabel)}` : ''}`;
  return `<button class="list-item" data-act="pickFood" data-src="${src}" data-i="${i}">
    <span class="li-main"><b>${esc(f.name)}</b><span class="muted small">${f.brand ? esc(f.brand) + ' · ' : ''}${basis}</span></span><span class="chev">›</span></button>`;
}
function myFoods(filter) {
  const q = (filter || '').trim().toLowerCase();
  const seen = new Set(), out = [];
  const key = f => (f.name + '|' + (f.brand || '')).toLowerCase();
  S.foods.forEach(f => { seen.add(key(f)); out.push({ ...f, saved: true }); });
  [...S.log].sort((a, b) => b.t - a.t).forEach(e => {
    const k = key(e.food);
    if (!seen.has(k) && out.length < 80) { seen.add(k); out.push({ ...e.food, recent: true, lastQty: e.qty, lastUnit: e.unit }); }
  });
  return out.filter(f => !q || f.name.toLowerCase().includes(q) || (f.brand || '').toLowerCase().includes(q));
}
function mineList(af) {
  const saved = af.mine.map((f, i) => [f, i]).filter(([f]) => f.saved), recent = af.mine.map((f, i) => [f, i]).filter(([f]) => f.recent);
  if (!af.mine.length) return '<p class="muted pad">Foods you save or log show up here for one-tap logging.</p>';
  return (saved.length ? `<h4 class="group">Saved</h4><div class="list">${saved.map(([f, i]) => foodRow(f, 'mine', i)).join('')}</div>` : '')
    + (recent.length ? `<h4 class="group">Recent</h4><div class="list">${recent.map(([f, i]) => foodRow(f, 'mine', i)).join('')}</div>` : '');
}
function isSaved(food) {
  const k = (food.name + '|' + (food.brand || '')).toLowerCase();
  return S.foods.some(f => (f.name + '|' + (f.brand || '')).toLowerCase() === k);
}
function amountView(af) {
  const f = af.sel, units = unitsFor(f), n = nutr(f, af.qty, af.unit), saved = isSaved(f);
  const back = af.editId ? '<span></span>' : '<button class="link" data-act="afBack">Back</button>';
  return `${sheetHead(af.editId ? 'Edit entry' : 'Add food', back)}
  <h3 class="food-title">${esc(f.name)}</h3>${f.brand ? `<p class="muted">${esc(f.brand)}</p>` : ''}
  <div class="row gap">
    <label class="field grow"><span>Amount</span><input id="af-qty" inputmode="decimal" data-input="afQty" value="${plain(af.qty, 2)}"></label>
    <label class="field grow"><span>Unit</span><select data-change="afUnit">${units.map(([k, l]) => `<option value="${k}" ${k === af.unit ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
  </div>
  <label class="field"><span>Meal</span><select data-change="afMeal">${MEALS.map(([k, l]) => `<option value="${k}" ${k === af.meal ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <div id="af-preview" class="nutri">${nutriHtml(n)}</div>
  ${saved ? '<p class="muted small">Saved in My foods.</p>' : `<label class="check-row"><input type="checkbox" data-change="afSave" ${af.save ? 'checked' : ''}> Save to My foods</label>`}
  <button class="btn primary block" data-act="afCommit">${af.editId ? 'Save changes' : `Add to ${mealName(af.meal)}`}</button>
  ${af.editId ? `<button class="btn danger-ghost block" data-act="delEntry">Delete entry</button>` : ''}
  ${f.saved ? `<button class="btn ghost block" data-act="unsaveFood">Remove from My foods</button>` : ''}`;
}
function nutriHtml(n) {
  return [['Calories', n.kcal, ''], ['Protein', n.p, ' g'], ['Carbs', n.c, ' g'], ['Fat', n.f, ' g']]
    .map(([l, v, u]) => `<div><b>${fmtNum(v, l === 'Calories' ? 0 : 1)}${u}</b><span class="muted small">${l}</span></div>`).join('');
}
function selectFood(food, qty, unit) {
  const units = unitsFor(food);
  const af = UI.af;
  af.sel = food;
  af.unit = unit && units.some(u => u[0] === unit) ? unit : units[0][0];
  af.qty = qty != null ? qty : (af.unit === 'g' ? 100 : 1);
  af.save = false;
  refreshSheet();
}

/* ---------- actions ---------- */

const ACT = {
  goto(el) { UI.tab = el.dataset.tab; closeSheet(); render(); scrollTo(0, 0); },
  closeSheet() { closeSheet(); },

  // weight
  logWeight() { openSheet(weightSheet); },
  wRange(el) { UI.weightRange = el.dataset.r; render(); },
  wAll() { UI.wAll = true; render(); },
  delWeight(el) {
    const w = S.weights.find(x => x.id === el.dataset.id);
    if (w && confirm(`Delete ${fmtW(w.kg)} ${unitW()} on ${dayLabel(w.date)}?`)) { S.weights = S.weights.filter(x => x !== w); save(); render(); }
  },

  // training
  startEmpty() { startWorkout([]); },
  startRoutine(el) { const r = S.templates.find(x => x.id === el.dataset.id); if (r) startWorkout(r.exIds.filter(id => S.exercises.some(e => e.id === id)), r.name); },
  repeatWorkout(el) { const w = S.workouts.find(x => x.id === el.dataset.id); if (w) startWorkout(w.exercises.map(e => e.exId), w.name); },
  histAll() { UI.histAll = true; render(); },
  pickExercise() { UI.pick = { mode: 'active', filter: '', creating: false }; openSheet(pickerSheet); },
  openLibrary() { UI.pick = { mode: 'library', filter: '', creating: false }; openSheet(pickerSheet); },
  libraryBack() { sheetRender = pickerSheet; refreshSheet(); },
  pickCreate() { UI.pick.creating = true; refreshSheet(); },
  pickBack() { UI.pick.creating = false; refreshSheet(); },
  addExercise(el) {
    if (!S.active) return;
    S.active.exercises.push(newExEntry(el.dataset.id)); save(); closeSheet(); render();
    setTimeout(() => { const cards = document.querySelectorAll('.ex-card'); cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
  },
  viewExercise(el) { const id = el.dataset.id; if (!sheetRender) openSheet(() => exerciseSheet(id)); else { sheetRender = () => exerciseSheet(id); refreshSheet(); $('#sheet .panel').scrollTop = 0; } },
  delExercise(el) {
    if (!confirm('Delete this exercise?')) return;
    S.exercises = S.exercises.filter(e => e.id !== el.dataset.id);
    S.templates.forEach(t => { t.exIds = t.exIds.filter(id => id !== el.dataset.id); });
    save();
    if (UI.pick && UI.pick.mode === 'library') ACT.libraryBack(); else closeSheet();
  },
  addSet(el) {
    const ex = S.active.exercises[+el.dataset.i], last = ex.sets[ex.sets.length - 1];
    const s = newSet(ex.exId);
    if (last) Object.keys(s).forEach(k => { if (k !== 'done') s[k] = last[k]; });
    ex.sets.push(s); save(); render();
  },
  toggleSet(el) {
    const i = +el.dataset.i, j = +el.dataset.j, ex = S.active.exercises[i], s = ex.sets[j];
    if (!s.done && !hasVals(s)) {
      // fill from the previous set in this workout, or from last session
      const src = ex.sets[j - 1] && hasVals(ex.sets[j - 1]) ? ex.sets[j - 1] : lastPerformance(ex.exId)?.sets[j];
      if (!src) { toast(isCardio(ex.exId) ? 'Enter minutes or distance first' : 'Enter reps first'); return; }
      Object.keys(s).forEach(k => { if (k !== 'done' && src[k] !== undefined) s[k] = src[k]; });
    }
    s.done = !s.done;
    if (s.done && S.settings.rest > 0 && !isCardio(ex.exId)) UI.restEnd = Date.now() + S.settings.rest * 1000;
    save(); render(); tick();
  },
  exMenu(el) {
    UI.pick = null;
    const i = +el.dataset.i, ex = S.active.exercises[i];
    openSheet(() => `${sheetHead(esc(exById(ex.exId).name))}
      <div class="stack">
        <button class="btn secondary block" data-act="viewExercise" data-id="${ex.exId}">View progress</button>
        ${i > 0 ? `<button class="btn secondary block" data-act="exMove" data-i="${i}" data-d="-1">Move up</button>` : ''}
        ${i < S.active.exercises.length - 1 ? `<button class="btn secondary block" data-act="exMove" data-i="${i}" data-d="1">Move down</button>` : ''}
        ${ex.sets.length > 1 ? `<button class="btn secondary block" data-act="exPopSet" data-i="${i}">Remove last set</button>` : ''}
        <button class="btn danger-ghost block" data-act="exRemove" data-i="${i}">Remove exercise</button>
      </div>`);
  },
  exMove(el) {
    const i = +el.dataset.i, j = i + +el.dataset.d, a = S.active.exercises;
    [a[i], a[j]] = [a[j], a[i]]; save(); closeSheet(); render();
  },
  exPopSet(el) { S.active.exercises[+el.dataset.i].sets.pop(); save(); closeSheet(); render(); },
  exRemove(el) { S.active.exercises.splice(+el.dataset.i, 1); save(); closeSheet(); render(); },
  finishWorkout() { finishWorkout(); },
  discardWorkout() { if (confirm('Discard this workout? Nothing will be saved.')) { S.active = null; UI.restEnd = null; save(); render(); } },
  restAdd(el) { if (UI.restEnd) { UI.restEnd += +el.dataset.s * 1000; tick(); } },
  restSkip() { UI.restEnd = null; tick(); },
  viewWorkout(el) { const id = el.dataset.id; UI.pick = null; openSheet(() => workoutSheet(id)); },
  delWorkout(el) {
    if (!confirm('Delete this workout permanently?')) return;
    S.workouts = S.workouts.filter(w => w.id !== el.dataset.id); save(); closeSheet(); render();
  },
  saveAsRoutine(el) {
    const w = S.workouts.find(x => x.id === el.dataset.id);
    UI.routine = { id: null, name: w.name, exIds: w.exercises.map(e => e.exId), filter: '' };
    sheetRender = routineSheet; refreshSheet();
  },
  editRoutine(el) {
    const r = S.templates.find(x => x.id === el.dataset.id);
    UI.routine = r ? { id: r.id, name: r.name, exIds: [...r.exIds], filter: '' } : { id: null, name: '', exIds: [], filter: '' };
    openSheet(routineSheet);
  },
  rToggle(el) {
    const r = UI.routine, id = el.dataset.id;
    r.exIds = r.exIds.includes(id) ? r.exIds.filter(x => x !== id) : [...r.exIds, id];
    const scroll = $('#sheet .panel').scrollTop;
    refreshSheet(); $('#sheet .panel').scrollTop = scroll;
  },
  saveRoutine() {
    const r = UI.routine;
    if (!r.name.trim()) { toast('Give the routine a name'); return; }
    if (!r.exIds.length) { toast('Pick at least one exercise'); return; }
    const existing = S.templates.find(t => t.id === r.id);
    if (existing) Object.assign(existing, { name: r.name.trim(), exIds: r.exIds });
    else S.templates.push({ id: uid(), name: r.name.trim(), exIds: r.exIds });
    save(); closeSheet(); UI.tab = 'train'; render(); toast('Routine saved');
  },
  delRoutine() {
    if (!confirm('Delete this routine? Past workouts are kept.')) return;
    S.templates = S.templates.filter(t => t.id !== UI.routine.id); save(); closeSheet(); render();
  },

  // food
  foodDay(el) { UI.foodDate = addDays(UI.foodDate, +el.dataset.d); render(); },
  foodToday() { UI.foodDate = isoDate(); render(); },
  addFood(el) {
    UI.af = { meal: el.dataset.meal, date: UI.foodDate, tab: S.log.length || S.foods.length ? 'mine' : 'search', q: '', results: null, filter: '', sel: null };
    openSheet(addFoodSheet);
  },
  afTab(el) { UI.af.tab = el.dataset.t; refreshSheet(); },
  afBack() { UI.af.sel = null; UI.af.editId = null; refreshSheet(); },
  pickFood(el) {
    const af = UI.af, i = +el.dataset.i, src = el.dataset.src;
    if (src === 'common') selectFood(af.results.common[i]);
    else if (src === 'off') selectFood(af.results.off[i]);
    else { const f = af.mine[i]; selectFood(f, f.lastQty, f.lastUnit); }
  },
  afCommit() {
    const af = UI.af, qty = num($('#af-qty').value);
    if (!qty || qty <= 0) { toast('Enter an amount'); return; }
    const { saved, recent, lastQty, lastUnit, ...food } = af.sel;
    if (af.save && !isSaved(food)) S.foods.push({ ...food, id: uid(), source: undefined });
    if (af.editId) {
      const e = S.log.find(x => x.id === af.editId);
      Object.assign(e, { qty, unit: af.unit, meal: af.meal });
    } else {
      S.log.push({ id: uid(), date: af.date, meal: af.meal, food, qty, unit: af.unit, t: Date.now() });
    }
    save(); closeSheet(); render(); toast(af.editId ? 'Updated' : `Added to ${mealName(af.meal)}`);
  },
  editEntry(el) {
    const e = S.log.find(x => x.id === el.dataset.id);
    UI.af = { meal: e.meal, date: e.date, tab: 'mine', q: '', results: null, filter: '', sel: e.food, qty: e.qty, unit: e.unit, editId: e.id, save: false };
    openSheet(addFoodSheet);
  },
  delEntry() { S.log = S.log.filter(e => e.id !== UI.af.editId); save(); closeSheet(); render(); toast('Entry deleted'); },
  unsaveFood() {
    const k = (UI.af.sel.name + '|' + (UI.af.sel.brand || '')).toLowerCase();
    S.foods = S.foods.filter(f => (f.name + '|' + (f.brand || '')).toLowerCase() !== k);
    save(); UI.af.sel = null; refreshSheet(); toast('Removed from My foods');
  },

  // settings
  setUnit(el) { S.settings.unit = el.dataset.u; save(); render(); },
  exportData() { exportData(); },
  eraseAll() {
    if (!confirm('Erase ALL workouts, food and weight data from this phone? This cannot be undone.')) return;
    if (!confirm('Are you sure? Export a backup first if you might want this data.')) return;
    S = freshState(); save(); UI.tab = 'today'; render(); toast('All data erased');
  },
};

const INPUT = {
  wname(el) { S.active.name = el.value; save(); },
  set1(el) {
    const s = S.active.exercises[+el.dataset.i].sets[+el.dataset.j], v = num(el.value), exId = S.active.exercises[+el.dataset.i].exId;
    if (isCardio(exId)) s.min = v; else s.w = v == null ? null : fromDispW(v);
    save();
  },
  set2(el) {
    const s = S.active.exercises[+el.dataset.i].sets[+el.dataset.j], v = num(el.value), exId = S.active.exercises[+el.dataset.i].exId;
    if (isCardio(exId)) s.km = v == null ? null : fromDispD(v); else s.r = v == null ? null : Math.round(v);
    save();
  },
  pickFilter(el) { UI.pick.filter = el.value; $('#pick-list').innerHTML = pickerList(el.value); },
  rName(el) { UI.routine.name = el.value; },
  rFilter(el) { UI.routine.filter = el.value; $('#r-list').innerHTML = routineList(UI.routine); },
  afFilter(el) { UI.af.filter = el.value; UI.af.mine = myFoods(el.value); $('#mine-list').innerHTML = mineList(UI.af); },
  afQty(el) { UI.af.qty = num(el.value) || 0; $('#af-preview').innerHTML = nutriHtml(nutr(UI.af.sel, UI.af.qty, UI.af.unit)); },
};

const CHANGE = {
  setting(el) {
    const k = el.dataset.k, v = num(el.value);
    if (k === 'goalW') S.settings.goalKg = v ? fromDispW(v) : null;
    else if (v != null && v >= 0) S.settings[k] = v;
    save(); render(); toast('Saved');
  },
  afUnit(el) {
    const af = UI.af, f = af.sel, prev = af.unit;
    af.unit = el.value;
    if (prev === 'serving' && af.unit === 'g') af.qty = f.servingGrams ? round(af.qty * f.servingGrams, 1) : 100;
    if (prev === 'g' && af.unit === 'serving') af.qty = f.servingGrams ? round(af.qty / f.servingGrams, 2) : 1;
    refreshSheet();
  },
  afMeal(el) { UI.af.meal = el.value; refreshSheet(); },
  afSave(el) { UI.af.save = el.checked; },
  importData(el) {
    const file = el.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d || !Array.isArray(d.workouts) || !Array.isArray(d.log) || !Array.isArray(d.weights)) throw new Error('bad');
        if (!confirm(`Replace all current data with this backup? (${d.workouts.length} workouts, ${d.log.length} food entries, ${d.weights.length} weigh-ins)`)) return;
        S = migrate(d); save(); render(); toast('Backup restored');
      } catch (e) { toast('That file is not a Pulse backup'); }
      el.value = '';
    };
    reader.readAsText(file);
  },
};

const FORMS = {
  weight(form) {
    const v = num(form.v.value), d = form.d.value || isoDate();
    if (!v || v <= 0) { toast('Enter your weight'); return; }
    saveWeight(d, fromDispW(v)); closeSheet(); render(); toast('Weight saved');
  },
  newExercise(form) {
    const name = form.name.value.trim(); if (!name) return;
    if (S.exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) { toast('That exercise already exists'); return; }
    const ex = { id: slug(name) + '-' + uid().slice(-4), name, group: form.group.value, type: form.type.value };
    S.exercises.push(ex); save();
    if (UI.pick.mode === 'active' && S.active) { S.active.exercises.push(newExEntry(ex.id)); save(); closeSheet(); render(); }
    else { UI.pick.creating = false; UI.pick.filter = ''; refreshSheet(); }
    toast('Exercise created');
  },
  async foodSearch(form) {
    const q = form.q.value.trim(); if (!q) return;
    const af = UI.af;
    af.q = q; af.loading = true; af.error = null; af.results = { common: searchCommon(q), off: [] };
    form.q.blur(); refreshSheet();
    try { af.results.off = await searchOFF(q); }
    catch (e) { af.error = navigator.onLine ? 'The food database did not respond. Try again in a moment, or use Quick add.' : 'You are offline. Common foods, My foods and Quick add still work.'; }
    af.loading = false;
    if (UI.af === af && sheetRender === addFoodSheet && !af.sel && af.tab === 'search') refreshSheet();
  },
  quickAdd(form) {
    const af = UI.af, kcal = num(form.kcal.value);
    if (kcal == null) { toast('Enter calories'); return; }
    const food = { name: form.name.value.trim() || 'Quick add', brand: '', perServing: { kcal, p: num(form.p.value) || 0, c: num(form.c.value) || 0, f: num(form.f.value) || 0 }, servingLabel: '1 serving' };
    if (form.save.checked && !isSaved(food)) S.foods.push({ ...food, id: uid() });
    S.log.push({ id: uid(), date: af.date, meal: af.meal, food, qty: 1, unit: 'serving', t: Date.now() });
    save(); closeSheet(); render(); toast(`Added to ${mealName(af.meal)}`);
  },
};

async function exportData() {
  const name = `pulse-backup-${isoDate()}.json`;
  const file = new File([JSON.stringify(S)], name, { type: 'application/json' });
  const done = () => { S.settings.lastBackup = Date.now(); save(); render(); toast('Backup exported'); };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Pulse backup' }); done(); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  done();
}

/* ---------- shell ---------- */

const VIEWS = { today: viewToday, train: viewTrain, food: viewFood, weight: viewWeight, more: viewMore };
function render() {
  // keep focus-free re-render cheap; charts mount after the HTML is in place
  $('#view').innerHTML = VIEWS[UI.tab]();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
  document.body.classList.toggle('has-active', !!S.active);
  flushCharts();
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 250); }, 2200);
}
function tick() {
  const e = $('#elapsed');
  if (e && S.active) e.textContent = fmtDur(Date.now() - S.active.start);
  const bar = $('#restbar');
  if (!UI.restEnd) { bar.hidden = true; return; }
  const left = Math.ceil((UI.restEnd - Date.now()) / 1000);
  if (left <= 0) { UI.restEnd = null; bar.hidden = true; toast('Rest is over. Next set!'); if (navigator.vibrate) navigator.vibrate(400); return; }
  bar.hidden = false;
  $('#rest-time').textContent = fmtDur(left * 1000);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el, e); }
});
document.addEventListener('input', e => { const k = e.target.dataset.input; if (k && INPUT[k]) INPUT[k](e.target, e); });
document.addEventListener('change', e => { const k = e.target.dataset.change; if (k && CHANGE[k]) CHANGE[k](e.target, e); });
document.addEventListener('submit', e => { const k = e.target.dataset.form; if (k && FORMS[k]) { e.preventDefault(); FORMS[k](e.target); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
// date can roll over while the app sits open in the background
document.addEventListener('visibilitychange', () => { if (!document.hidden && !sheetRender) render(); });
let lastW = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; if (!sheetRender) render(); } });

setInterval(tick, 1000);
render();
if (S.active) { UI.tab = 'train'; render(); }
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
