/* ==========================================================================
   Volunteer Management System - Reports & Analytics Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('admin_dashboard.html') && !window.location.pathname.endsWith('/admin')) return;

  const exportVolsBtn = document.getElementById('btn-export-volunteers');
  const exportAttBtn = document.getElementById('btn-export-attendance');

  let hoursChart = null;
  let skillsChart = null;

  initReports();

  async function initReports() {
    await renderAnalyticsCharts();
    setupCSVExport();
  }

  async function renderAnalyticsCharts() {
    const hoursCanvas = document.getElementById('hoursChart');
    const skillsCanvas = document.getElementById('skillsChart');

    if (!hoursCanvas || !skillsCanvas) return;

    try {
      const data = await APIClient.get('/reports/charts');

      // 1. Event Hours Bar Chart
      const eventNames = Object.keys(data.event_hours || {});
      const eventHours = Object.values(data.event_hours || {});

      if (hoursChart) hoursChart.destroy();
      hoursChart = new Chart(hoursCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: eventNames.length ? eventNames : ['No Data'],
          datasets: [{
            label: 'Volunteer Hours',
            data: eventHours.length ? eventHours : [0],
            backgroundColor: 'rgba(79, 70, 229, 0.85)',
            borderColor: '#4f46e5',
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: value => `${value} hrs` }
            }
          }
        }
      });

      // 2. Skills Doughnut Chart
      const skillNames = Object.keys(data.skills_distribution || {});
      const skillCounts = Object.values(data.skills_distribution || {});

      if (skillsChart) skillsChart.destroy();
      skillsChart = new Chart(skillsCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: skillNames.length ? skillNames : ['General Support'],
          datasets: [{
            data: skillCounts.length ? skillCounts : [1],
            backgroundColor: [
              '#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' }
          }
        }
      });
    } catch (err) {
      console.error('Failed to load chart data:', err);
    }
  }

  function setupCSVExport() {
    if (exportVolsBtn) {
      exportVolsBtn.addEventListener('click', () => {
        window.open('/api/reports/export/volunteers/csv', '_blank');
      });
    }

    if (exportAttBtn) {
      exportAttBtn.addEventListener('click', () => {
        window.open('/api/reports/export/attendance/csv', '_blank');
      });
    }
  }
});
