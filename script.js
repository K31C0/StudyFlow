document.addEventListener('DOMContentLoaded', () => {
    let sessions = [], currentSession = null, timerInterval = null, calendarDate = new Date(), elapsedTime = 0, sessionStartTime = 0, isPaused = false;
    let pieChart, barChart;
    const D = (id) => document.getElementById(id);
    
    const elements = {
      navLinks: document.querySelectorAll('.nav-link'), themeBtns: document.querySelectorAll('.theme-btn'),
      subjectInput: D('subjectInput'), goalSlider: D('goal-slider'), goalDisplay: D('goal-display'), startBtn: D('startBtn'),
      sessionList: D('sessionList'), liveSubject: D('live-subject'), liveTimer: D('live-timer'),
      goalProgressBar: D('goal-progress-bar'), pauseBtn: D('pauseBtn'), resumeBtn: D('resumeBtn'), finishBtn: D('finishBtn'),
      monthYearEl: D('month-year'), calendarGrid: D('calendar-grid'), prevMonthBtn: D('prev-month-btn'), nextMonthBtn: D('next-month-btn'),
      totalTimeStat: D('total-time-stat'), totalSessionsStat: D('total-sessions-stat'), avgSessionStat: D('avg-session-stat'),
      mostStudiedStat: D('most-studied-stat'), pieChartCanvas: D('subjectPieChart'), barChartCanvas: D('weeklyBarChart'),
      chartTitle: D('chart-title'), chartMessage: D('chart-message')
    };

    function init() { loadTheme(); loadSessions(); setupEventListeners(); showView('tracker-view'); updateSliderFill(); }
    function applyTheme(theme) { document.body.className = theme; localStorage.setItem('studyTheme', theme); renderAllCharts(); updateSliderFill(); }
    function loadTheme() { applyTheme(localStorage.getItem('studyTheme') || 'theme-purple-haze'); }
    function showView(viewId) {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      D(viewId).classList.add('active');
      elements.navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === viewId));
      if (viewId === 'tracker-view') { renderDashboardStats(); renderCalendar(); renderBarChart(); }
      if (viewId === 'charts-view') renderPieChart();
    }
    function setupEventListeners() {
      elements.navLinks.forEach(l => l.addEventListener('click', (e) => { e.preventDefault(); showView(e.target.dataset.view); }));
      elements.themeBtns.forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
      elements.startBtn.addEventListener('click', startSession);
      elements.finishBtn.addEventListener('click', finishSession);
      elements.pauseBtn.addEventListener('click', pauseTimer);
      elements.resumeBtn.addEventListener('click', resumeTimer);
      elements.goalSlider.addEventListener('input', () => { elements.goalDisplay.textContent = `${elements.goalSlider.value} min`; updateSliderFill(); });
      elements.prevMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
      elements.nextMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
    }
    function loadSessions() { sessions = JSON.parse(localStorage.getItem('studySessions')) || []; }
    function saveSessions() { localStorage.setItem('studySessions', JSON.stringify(sessions)); }
    function startSession() {
      const subject = elements.subjectInput.value.trim();
      if (!subject) { alert("Please enter a subject."); return; }
      currentSession = { id: Date.now(), subject, startTime: new Date(), endTime: null, duration: 0, goal: parseInt(elements.goalSlider.value, 10) * 60000 };
      elapsedTime = 0; isPaused = false;
      elements.liveSubject.textContent = subject;
      elements.resumeBtn.style.display = 'none'; elements.pauseBtn.style.display = 'inline-block';
      startTimer(); showView('live-session-view');
    }
    function finishSession() {
      if (!currentSession) return;
      clearInterval(timerInterval);
      if (!isPaused) elapsedTime += Date.now() - sessionStartTime;
      currentSession.endTime = new Date(); currentSession.duration = elapsedTime;
      sessions.push(currentSession); saveSessions();
      currentSession = null; elements.subjectInput.value = '';
      updateRecentSessions(); showView('tracker-view');
    }
    function deleteSession(id) { sessions = sessions.filter(s => s.id !== id); saveSessions(); updateRecentSessions(); renderDashboardStats(); }
    function startTimer() { sessionStartTime = Date.now(); timerInterval = setInterval(updateTimer, 1000); }
    function pauseTimer() { isPaused = true; elapsedTime += Date.now() - sessionStartTime; clearInterval(timerInterval); elements.pauseBtn.style.display = 'none'; elements.resumeBtn.style.display = 'inline-block'; }
    function resumeTimer() { isPaused = false; sessionStartTime = Date.now(); timerInterval = setInterval(updateTimer, 1000); elements.resumeBtn.style.display = 'none'; elements.pauseBtn.style.display = 'inline-block'; }
    function updateTimer() {
      const currentTotalElapsed = elapsedTime + (Date.now() - sessionStartTime);
      const seconds = Math.floor(currentTotalElapsed / 1000);
      elements.liveTimer.textContent = new Date(seconds * 1000).toISOString().substr(11, 8);
      if (currentSession.goal > 0) elements.goalProgressBar.style.width = `${Math.min(currentTotalElapsed / currentSession.goal, 1) * 100}%`;
    }
    function updateRecentSessions() {
      elements.sessionList.innerHTML = '';
      const recent = [...sessions].reverse().slice(0, 3);
      if (recent.length === 0) { elements.sessionList.innerHTML = '<li>No recent sessions.</li>'; return; }
      recent.forEach(s => {
          const li = document.createElement('li');
          li.innerHTML = `<span>${s.subject} - ${Math.round(s.duration / 60000)} min</span><button class="delete-btn" data-id="${s.id}">✖</button>`;
          elements.sessionList.appendChild(li);
      });
      elements.sessionList.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => { if (confirm('Are you sure?')) deleteSession(parseInt(e.target.dataset.id)); }));
    }
    function renderCalendar() {
      elements.calendarGrid.innerHTML = '';
      const month = calendarDate.getMonth(), year = calendarDate.getFullYear();
      elements.monthYearEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
      const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
      D('calendar-day-names').innerHTML = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="calendar-day-name">${d}</div>`).join('');
      for (let i = 0; i < firstDay; i++) elements.calendarGrid.innerHTML += `<div class="calendar-day other-month"></div>`;
      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daySessions = sessions.filter(s => { const d = new Date(s.startTime); return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day; });
          const dots = daySessions.length > 0 ? `<span class="session-dot"></span>` : '';
          elements.calendarGrid.innerHTML += `<div class="calendar-day" data-date="${dateStr}"><span class="day-number">${day}</span><div>${dots}</div></div>`;
      }
      elements.calendarGrid.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayEl => {
          dayEl.addEventListener('click', e => renderDayChart(e.currentTarget.dataset.date));
      });
    }
    function renderDashboardStats() {
      const totalMins = sessions.reduce((sum, s) => sum + s.duration, 0) / 60000;
      elements.totalTimeStat.textContent = `${Math.floor(totalMins / 60)}h ${Math.round(totalMins % 60)}m`;
      elements.totalSessionsStat.textContent = sessions.length;
      elements.avgSessionStat.textContent = `${sessions.length > 0 ? Math.round(totalMins / sessions.length) : 0}m`;
      const subjectCounts = sessions.reduce((acc, s) => { acc[s.subject] = (acc[s.subject] || 0) + s.duration; return acc; }, {});
      elements.mostStudiedStat.textContent = Object.keys(subjectCounts).reduce((a, b) => subjectCounts[a] > subjectCounts[b] ? a : b, '-').substring(0, 10);
      updateRecentSessions();
    }
    function renderAllCharts() { renderPieChart(); renderBarChart(); }
    function renderPieChart() {
      if (!D('charts-view').classList.contains('active')) return;
      const style = getComputedStyle(document.body);
      const subjectData = sessions.reduce((acc, s) => { acc[s.subject] = (acc[s.subject] || 0) + Math.round(s.duration / 60000); return acc; }, {});
      if (pieChart) pieChart.destroy();
      pieChart = new Chart(elements.pieChartCanvas, { type: 'doughnut', data: { labels: Object.keys(subjectData), datasets: [{ data: Object.values(subjectData), backgroundColor: [style.getPropertyValue('--primary-accent'), style.getPropertyValue('--secondary-accent'), '#a8c0ff', '#4e54c8'], borderColor: style.getPropertyValue('--bg-gradient').split(',')[1], borderWidth: 3 }] }, options: { responsive: true, plugins: { legend: { labels: { color: style.getPropertyValue('--text-color') } } } } });
    }

    function renderDayChart(dateString) {
        const style = getComputedStyle(document.body);
        const selectedDate = new Date(dateString);
        // Adjust for timezone to get the correct day
        selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());
        elements.chartTitle.textContent = `Data for ${selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}`;
        
        const daySessions = sessions.filter(s => new Date(s.startTime).toDateString() === selectedDate.toDateString());

        if (barChart) barChart.destroy();

        if (daySessions.length === 0) {
            elements.barChartCanvas.style.display = 'none';
            elements.chartMessage.textContent = 'No study sessions recorded for this day.';
            elements.chartMessage.style.display = 'block';
            return;
        }

        elements.barChartCanvas.style.display = 'block';
        elements.chartMessage.style.display = 'none';
        
        const subjectData = daySessions.reduce((acc, s) => {
            acc[s.subject] = (acc[s.subject] || 0) + s.duration;
            return acc;
        }, {});

        const labels = Object.keys(subjectData);
        const dataInMinutes = labels.map(label => Math.round(subjectData[label] / 60000));

        barChart = new Chart(elements.barChartCanvas, {
          type: 'bar',
          data: { labels: labels, datasets: [{ label: 'Minutes Studied', data: dataInMinutes, backgroundColor: style.getPropertyValue('--chart-color'), hoverBackgroundColor: style.getPropertyValue('--hover-accent'), borderRadius: 4, borderSkipped: false }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: true, beginAtZero: true, ticks: { color: style.getPropertyValue('--text-color') }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: style.getPropertyValue('--text-color') }, grid: { display: false } } } }
        });
    }

    function renderBarChart() {
      if (!D('tracker-view').classList.contains('active')) return;
      elements.chartTitle.textContent = "Last 7 Days";
      elements.barChartCanvas.style.display = 'block';
      elements.chartMessage.style.display = 'none';
      
      const style = getComputedStyle(document.body);
      const weeklyData = Array(7).fill(0), weeklyLabels = [];
      for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          weeklyLabels.push(d.toLocaleString('default', { weekday: 'short' }));
          sessions.forEach(s => { if (new Date(s.startTime).toDateString() === d.toDateString()) weeklyData[6 - i] += s.duration; });
      }
      if (barChart) barChart.destroy();
      barChart = new Chart(elements.barChartCanvas, {
          type: 'bar',
          data: { labels: weeklyLabels, datasets: [{ data: weeklyData.map(d => Math.round(d / 60000)), backgroundColor: style.getPropertyValue('--chart-color'), hoverBackgroundColor: style.getPropertyValue('--hover-accent'), borderRadius: 4, borderSkipped: false }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.7)', titleColor: '#fff', bodyColor: '#fff', callbacks: { label: function (context) { return `${context.raw} minutes`; } } } }, scales: { y: { display: false, beginAtZero: true }, x: { ticks: { color: style.getPropertyValue('--text-color') }, grid: { display: false } } } }
      });
    }

    function updateSliderFill() {
      const min = elements.goalSlider.min, max = elements.goalSlider.max, val = elements.goalSlider.value;
      const percentage = (val - min) * 100 / (max - min);
      elements.goalSlider.style.setProperty('--slider-percentage', `${percentage}%`);
    }
    init();
});