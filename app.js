const STORAGE_KEY = 'studyboard_state_v1';
const COLORS = ['yellow', 'pink', 'blue', 'green', 'orange'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Analytics (isolated Supabase project, insert-only) ----------
const ANALYTICS_URL = 'https://isdgjqazzmqalmqrahnd.supabase.co/rest/v1/analytics_events';
const ANALYTICS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZGdqcWF6em1xYWxtcXJhaG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTEyNjYsImV4cCI6MjEwNTE4NzI2Nn0.vG0zQEbYb6GTGBmOWmJqQbPlXwotVhiDKaD2xrNMtgM';

function getSessionId() {
  let id = localStorage.getItem('sb_session_id');
  if (!id) {
    id = uid();
    localStorage.setItem('sb_session_id', id);
  }
  return id;
}

function trackEvent(eventType) {
  try {
    fetch(ANALYTICS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANALYTICS_KEY,
        'Authorization': 'Bearer ' + ANALYTICS_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ session_id: getSessionId(), event_type: eventType, path: location.pathname }),
      keepalive: true
    }).catch(() => {});
  } catch (e) {}
}

trackEvent('page_view');
document.getElementById('prepex-banner').addEventListener('click', () => trackEvent('cta_click'));

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    exam: 'JEE',
    notes: [],
    questions: [],
    syllabusProgress: {}, // "EXAM|Subject|Chapter" -> { studied: bool, revised: bool }
    focusSessions: [], // { id, exam, subject, chapter, minutes, date, endedAt }
    timerSettings: { focus: 25, short: 5, long: 15, rounds: 4 }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
if (!state.focusSessions) state.focusSessions = [];
if (!state.timerSettings) state.timerSettings = { focus: 25, short: 5, long: 15, rounds: 4 };
let editingNoteId = null;
let pickedColor = 'yellow';

// ---------- Tabs & exam toggle ----------
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + tab).classList.add('active');
  if (tab === 'syllabus') renderSyllabus();
  if (tab === 'stats') renderStats();
  if (tab === 'qlog') renderQuestionLog();
  if (tab === 'timer') renderFocusTable();
});

document.querySelector('.exam-toggle').addEventListener('click', (e) => {
  const btn = e.target.closest('.exam-btn');
  if (!btn) return;
  document.querySelectorAll('.exam-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.exam = btn.dataset.exam;
  saveState();
  populateSubjectSelects();
  renderSyllabus();
  renderQuestionLog();
  renderStats();
  renderFocusTable();
});

// ---------- Board / Sticky notes ----------
function renderBoard() {
  ['todo', 'doing', 'done'].forEach(status => {
    const container = document.querySelector(`.notes-drop[data-status="${status}"]`);
    container.innerHTML = '';
    const notesInCol = state.notes.filter(n => n.status === status);
    document.getElementById('count-' + status).textContent = notesInCol.length;
    notesInCol.forEach(note => container.appendChild(renderNoteEl(note)));
  });
}

function renderNoteEl(note) {
  const el = document.createElement('div');
  el.className = `sticky-note ${note.color}`;
  el.style.setProperty('--tilt', note.tilt + 'deg');
  el.textContent = note.text;
  el.draggable = true;
  el.dataset.id = note.id;

  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', note.id);
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  el.addEventListener('click', () => openNoteModal(note.id));

  return el;
}

document.querySelectorAll('.notes-drop').forEach(drop => {
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('drag-over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const note = state.notes.find(n => n.id === id);
    if (note) {
      note.status = drop.dataset.status;
      saveState();
      renderBoard();
    }
  });
});

document.querySelectorAll('.add-note-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const note = {
      id: uid(),
      text: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: (Math.random() * 4 - 2).toFixed(1),
      status: btn.dataset.status
    };
    state.notes.push(note);
    saveState();
    renderBoard();
    openNoteModal(note.id);
  });
});

function openNoteModal(id) {
  editingNoteId = id;
  const note = state.notes.find(n => n.id === id);
  document.getElementById('note-text').value = note.text;
  pickedColor = note.color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === pickedColor));
  document.getElementById('note-modal').classList.remove('hidden');
  document.getElementById('note-text').focus();
}

document.getElementById('note-colors').addEventListener('click', (e) => {
  const sw = e.target.closest('.color-swatch');
  if (!sw) return;
  pickedColor = sw.dataset.color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('selected', s === sw));
});

document.getElementById('note-cancel-btn').addEventListener('click', closeNoteModal);
function closeNoteModal() {
  document.getElementById('note-modal').classList.add('hidden');
  editingNoteId = null;
}

document.getElementById('note-save-btn').addEventListener('click', () => {
  const note = state.notes.find(n => n.id === editingNoteId);
  const text = document.getElementById('note-text').value.trim();
  if (!text) {
    state.notes = state.notes.filter(n => n.id !== editingNoteId);
  } else {
    note.text = text;
    note.color = pickedColor;
  }
  saveState();
  renderBoard();
  closeNoteModal();
});

document.getElementById('note-delete-btn').addEventListener('click', () => {
  state.notes = state.notes.filter(n => n.id !== editingNoteId);
  saveState();
  renderBoard();
  closeNoteModal();
});

// ---------- Question Log ----------
function populateSubjectSelects() {
  const subjects = Object.keys(SYLLABUS[state.exam]);
  const qSubject = document.getElementById('q-subject');
  const filterSubject = document.getElementById('filter-subject');
  qSubject.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  filterSubject.innerHTML = '<option value="all">All subjects</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  updateChapterList();

  const timerSubject = document.getElementById('timer-subject');
  if (timerSubject) {
    timerSubject.innerHTML = '<option value="">No subject</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  }
}

document.getElementById('q-subject').addEventListener('change', updateChapterList);
function updateChapterList() {
  const subject = document.getElementById('q-subject').value;
  const chapters = (SYLLABUS[state.exam][subject] || []);
  document.getElementById('chapter-list').innerHTML = chapters.map(c => `<option value="${c}"></option>`).join('');
}

document.getElementById('q-date').valueAsDate = new Date();

document.getElementById('qform').addEventListener('submit', (e) => {
  e.preventDefault();
  const entry = {
    id: uid(),
    exam: state.exam,
    subject: document.getElementById('q-subject').value,
    chapter: document.getElementById('q-chapter').value.trim(),
    result: document.getElementById('q-result').value,
    difficulty: document.getElementById('q-difficulty').value,
    source: document.getElementById('q-source').value.trim(),
    time: document.getElementById('q-time').value,
    date: document.getElementById('q-date').value,
    notes: document.getElementById('q-notes').value.trim()
  };
  state.questions.unshift(entry);
  saveState();
  e.target.reset();
  document.getElementById('q-date').valueAsDate = new Date();
  document.getElementById('q-difficulty').value = 'medium';
  updateChapterList();
  renderQuestionLog();
});

document.getElementById('filter-subject').addEventListener('change', renderQuestionLog);
document.getElementById('filter-result').addEventListener('change', renderQuestionLog);
document.getElementById('clear-log-btn').addEventListener('click', () => {
  if (confirm('Clear the entire question log? This cannot be undone.')) {
    state.questions = state.questions.filter(q => q.exam !== state.exam);
    saveState();
    renderQuestionLog();
  }
});

function renderQuestionLog() {
  const subjectFilter = document.getElementById('filter-subject').value;
  const resultFilter = document.getElementById('filter-result').value;
  const rows = state.questions.filter(q => {
    if (q.exam !== state.exam) return false;
    if (subjectFilter !== 'all' && q.subject !== subjectFilter) return false;
    if (resultFilter !== 'all' && q.result !== resultFilter) return false;
    return true;
  });

  const tbody = document.getElementById('qtable-body');
  tbody.innerHTML = '';
  document.getElementById('qtable-empty').style.display = rows.length ? 'none' : 'block';

  rows.forEach(q => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${q.date || ''}</td>
      <td>${q.subject}</td>
      <td>${escapeHtml(q.chapter)}</td>
      <td><span class="badge ${q.result}">${q.result}</span></td>
      <td>${q.difficulty}</td>
      <td>${q.time ? q.time + ' min' : '—'}</td>
      <td>${escapeHtml(q.source) || '—'}</td>
      <td class="notes-cell">${escapeHtml(q.notes) || ''}</td>
      <td><button class="row-delete" data-id="${q.id}" title="Delete">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.row-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      state.questions = state.questions.filter(q => q.id !== btn.dataset.id);
      saveState();
      renderQuestionLog();
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Syllabus tracker ----------
function progressKey(subject, chapter) {
  return `${state.exam}|${subject}|${chapter}`;
}

function renderSyllabus() {
  const wrap = document.getElementById('syllabus-subjects');
  wrap.innerHTML = '';
  const subjects = SYLLABUS[state.exam];

  Object.entries(subjects).forEach(([subject, chapters]) => {
    const studiedCount = chapters.filter(c => (state.syllabusProgress[progressKey(subject, c)] || {}).studied).length;
    const pct = Math.round((studiedCount / chapters.length) * 100);

    const block = document.createElement('div');
    block.className = 'subject-block';
    block.innerHTML = `
      <div class="subject-head">
        <h3>${subject}</h3>
        <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${pct}%"></div></div>
        <div class="progress-pct">${pct}%</div>
      </div>
      <div class="chapter-list"></div>
    `;
    const list = block.querySelector('.chapter-list');
    chapters.forEach(chapter => {
      const key = progressKey(subject, chapter);
      const prog = state.syllabusProgress[key] || { studied: false, revised: false };
      const row = document.createElement('div');
      row.className = 'chapter-row';
      row.innerHTML = `
        <span class="chapter-name">${chapter}</span>
        <div class="chapter-toggle">
          <label><input type="checkbox" data-key="${key}" data-field="studied" ${prog.studied ? 'checked' : ''}> Studied</label>
          <label><input type="checkbox" data-key="${key}" data-field="revised" ${prog.revised ? 'checked' : ''}> Revised</label>
        </div>
      `;
      list.appendChild(row);
    });
    wrap.appendChild(block);
  });

  wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.key;
      const field = cb.dataset.field;
      if (!state.syllabusProgress[key]) state.syllabusProgress[key] = { studied: false, revised: false };
      state.syllabusProgress[key][field] = cb.checked;
      saveState();
      renderSyllabus();
      renderStats();
    });
  });
}

// ---------- Dashboard ----------
function renderStats() {
  const qs = state.questions.filter(q => q.exam === state.exam);
  const total = qs.length;
  const correct = qs.filter(q => q.result === 'correct').length;
  const incorrect = qs.filter(q => q.result === 'incorrect').length;
  const accuracy = total ? Math.round((correct / (correct + incorrect || 1)) * 100) : 0;

  const dates = new Set(qs.map(q => q.date));
  const streak = computeStreak(dates);

  const subjects = SYLLABUS[state.exam];
  let totalChapters = 0, studiedChapters = 0;
  Object.entries(subjects).forEach(([subject, chapters]) => {
    totalChapters += chapters.length;
    studiedChapters += chapters.filter(c => (state.syllabusProgress[progressKey(subject, c)] || {}).studied).length;
  });
  const syllabusPct = totalChapters ? Math.round((studiedChapters / totalChapters) * 100) : 0;

  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card"><div class="value">${total}</div><div class="label">Questions Logged</div></div>
    <div class="stat-card"><div class="value">${accuracy}%</div><div class="label">Accuracy</div></div>
    <div class="stat-card"><div class="value">${syllabusPct}%</div><div class="label">Syllabus Done</div></div>
    <div class="stat-card"><div class="value">${streak}🔥</div><div class="label">Day Streak</div></div>
  `;

  const accWrap = document.getElementById('subject-accuracy');
  accWrap.innerHTML = '';
  Object.keys(subjects).forEach(subject => {
    const sqs = qs.filter(q => q.subject === subject);
    const c = sqs.filter(q => q.result === 'correct').length;
    const ic = sqs.filter(q => q.result === 'incorrect').length;
    const pct = (c + ic) ? Math.round((c / (c + ic)) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'subject-acc-row';
    row.innerHTML = `
      <div class="name">${subject}</div>
      <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${pct}%"></div></div>
      <div class="progress-pct">${pct}%</div>
      <div style="font-size:12px;color:#8a7c63;min-width:90px;">${sqs.length} attempted</div>
    `;
    accWrap.appendChild(row);
  });

  const sylSummary = document.getElementById('syllabus-progress-summary');
  sylSummary.innerHTML = '';
  Object.entries(subjects).forEach(([subject, chapters]) => {
    const studied = chapters.filter(c => (state.syllabusProgress[progressKey(subject, c)] || {}).studied).length;
    const revised = chapters.filter(c => (state.syllabusProgress[progressKey(subject, c)] || {}).revised).length;
    const row = document.createElement('div');
    row.className = 'subject-acc-row';
    row.innerHTML = `
      <div class="name">${subject}</div>
      <div style="font-size:13px;">${studied}/${chapters.length} studied · ${revised}/${chapters.length} revised</div>
    `;
    sylSummary.appendChild(row);
  });
}

function computeStreak(dateSet) {
  let streak = 0;
  let d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (dateSet.has(iso)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ---------- Pomodoro Timer ----------
const RING_CIRCUMFERENCE = 2 * Math.PI * 90;
let timerMode = 'focus';
let timerRound = 1;
let timerRemaining = state.timerSettings.focus * 60;
let timerTotal = timerRemaining;
let timerInterval = null;
let timerRunning = false;

function modeDurationMinutes(mode) {
  if (mode === 'short') return state.timerSettings.short;
  if (mode === 'long') return state.timerSettings.long;
  return state.timerSettings.focus;
}

function formatClock(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimerDisplay() {
  document.getElementById('timer-display').textContent = formatClock(timerRemaining);
  const ring = document.getElementById('ring-progress');
  const fraction = timerTotal > 0 ? timerRemaining / timerTotal : 0;
  ring.style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - fraction)).toFixed(2);
  ring.classList.toggle('mode-short', timerMode === 'short');
  ring.classList.toggle('mode-long', timerMode === 'long');
  document.getElementById('timer-round').textContent = timerRound;
  document.getElementById('timer-round-total').textContent = state.timerSettings.rounds;
}

function setTimerMode(mode, resetRunning = true) {
  timerMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  timerTotal = modeDurationMinutes(mode) * 60;
  timerRemaining = timerTotal;
  if (resetRunning) stopTimerInterval();
  renderTimerDisplay();
}

document.getElementById('timer-mode-row').addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  setTimerMode(btn.dataset.mode);
});

function stopTimerInterval() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  document.getElementById('timer-start-btn').textContent = 'Start';
}

function startTimer() {
  if (timerRunning) {
    stopTimerInterval();
    return;
  }
  timerRunning = true;
  document.getElementById('timer-start-btn').textContent = 'Pause';
  timerInterval = setInterval(() => {
    timerRemaining -= 1;
    if (timerRemaining <= 0) {
      handleTimerComplete();
      return;
    }
    renderTimerDisplay();
  }, 1000);
}

function handleTimerComplete() {
  stopTimerInterval();
  timerRemaining = 0;
  renderTimerDisplay();
  playChime();
  notifyDone();

  if (timerMode === 'focus') {
    const minutes = modeDurationMinutes('focus');
    state.focusSessions.unshift({
      id: uid(),
      exam: state.exam,
      subject: document.getElementById('timer-subject').value,
      chapter: document.getElementById('timer-chapter').value.trim(),
      minutes,
      date: new Date().toISOString().slice(0, 10),
      endedAt: new Date().toISOString()
    });
    saveState();
    renderFocusTable();

    const nextMode = timerRound >= state.timerSettings.rounds ? 'long' : 'short';
    if (timerRound >= state.timerSettings.rounds) timerRound = 1; else timerRound += 1;
    setTimerMode(nextMode, false);
  } else {
    setTimerMode('focus', false);
  }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.28 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.28 + 0.25);
      osc.start(ctx.currentTime + i * 0.28);
      osc.stop(ctx.currentTime + i * 0.28 + 0.26);
    });
  } catch (e) {}
}

function notifyDone() {
  const label = timerMode === 'focus' ? 'Focus session done — take a break!' : 'Break over — back to focus!';
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification('StudyBoard', { body: label });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}

document.getElementById('timer-start-btn').addEventListener('click', startTimer);
document.getElementById('timer-reset-btn').addEventListener('click', () => {
  setTimerMode(timerMode);
});

['setting-focus', 'setting-short', 'setting-long', 'setting-rounds'].forEach(id => {
  document.getElementById(id).addEventListener('change', (e) => {
    const map = { 'setting-focus': 'focus', 'setting-short': 'short', 'setting-long': 'long', 'setting-rounds': 'rounds' };
    const key = map[id];
    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
    state.timerSettings[key] = val;
    saveState();
    if (key !== 'rounds' && timerMode === key) {
      setTimerMode(timerMode);
    } else {
      renderTimerDisplay();
    }
  });
});

function renderFocusTable() {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = state.focusSessions.filter(f => f.exam === state.exam && f.date === today);
  const tbody = document.getElementById('focus-table-body');
  tbody.innerHTML = '';
  document.getElementById('focus-table-empty').style.display = sessions.length ? 'none' : 'block';
  sessions.forEach(f => {
    const tr = document.createElement('tr');
    const time = new Date(f.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    tr.innerHTML = `<td>${time}</td><td>${f.subject || '—'}</td><td>${escapeHtml(f.chapter) || '—'}</td><td>${f.minutes} min</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('timer-cycle-count').textContent = sessions.length;
}

// Apply saved timer settings to the settings inputs and init display
document.getElementById('setting-focus').value = state.timerSettings.focus;
document.getElementById('setting-short').value = state.timerSettings.short;
document.getElementById('setting-long').value = state.timerSettings.long;
document.getElementById('setting-rounds').value = state.timerSettings.rounds;
setTimerMode('focus', false);

// ---------- Init ----------
document.querySelectorAll(`.exam-btn[data-exam="${state.exam}"]`).forEach(b => {
  document.querySelectorAll('.exam-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
});
populateSubjectSelects();
renderBoard();
renderQuestionLog();
renderFocusTable();
