const SUPABASE_URL = 'https://isdgjqazzmqalmqrahnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZGdqcWF6em1xYWxtcXJhaG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTEyNjYsImV4cCI6MjEwNTE4NzI2Nn0.vG0zQEbYb6GTGBmOWmJqQbPlXwotVhiDKaD2xrNMtgM';

async function fetchStats(passphrase) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_admin_stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({ passphrase })
  });
  if (!res.ok) throw new Error('invalid passphrase');
  return res.json();
}

function renderStats(stats) {
  document.getElementById('admin-stat-cards').innerHTML = `
    <div class="stat-card"><div class="value">${stats.total_views}</div><div class="label">Total Page Views</div></div>
    <div class="stat-card"><div class="value">${stats.total_visitors}</div><div class="label">Total Visitors</div></div>
    <div class="stat-card"><div class="value">${stats.active_users_15m}</div><div class="label">Active Now (15 min)</div></div>
    <div class="stat-card"><div class="value">${stats.active_users_today}</div><div class="label">Active Today</div></div>
    <div class="stat-card"><div class="value">${stats.total_users}</div><div class="label">Total Users</div></div>
    <div class="stat-card"><div class="value">${stats.cta_clicks}</div><div class="label">Prepex CTA Clicks</div></div>
  `;

  const days = stats.views_last_7_days || [];
  const max = Math.max(1, ...days.map(d => d.count));
  document.getElementById('views-chart').innerHTML = days.map(d => {
    const pct = Math.max(4, Math.round((d.count / max) * 100));
    const label = new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
    return `
      <div class="bar-chart-col">
        <div class="bar-chart-count">${d.count}</div>
        <div class="bar-chart-bar" style="height:${pct}%"></div>
        <div class="bar-chart-label">${label}</div>
      </div>`;
  }).join('');
}

async function unlock() {
  const pass = document.getElementById('passphrase').value;
  const errEl = document.getElementById('gate-error');
  errEl.textContent = '';
  try {
    const stats = await fetchStats(pass);
    sessionStorage.setItem('admin_pass', pass);
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    renderStats(stats);
  } catch (e) {
    errEl.textContent = 'Incorrect passphrase.';
  }
}

document.getElementById('unlock-btn').addEventListener('click', unlock);
document.getElementById('passphrase').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') unlock();
});

document.getElementById('refresh-btn').addEventListener('click', async () => {
  const pass = sessionStorage.getItem('admin_pass');
  if (!pass) return;
  try {
    renderStats(await fetchStats(pass));
  } catch (e) {}
});

// Auto-unlock if this browser tab already unlocked this session
const savedPass = sessionStorage.getItem('admin_pass');
if (savedPass) {
  fetchStats(savedPass).then(stats => {
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    renderStats(stats);
  }).catch(() => sessionStorage.removeItem('admin_pass'));
}
