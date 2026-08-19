/* ==========================================================================
   Volunteer Management System - Volunteer Portal Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('volunteer_dashboard.html') && !window.location.pathname.endsWith('/volunteer')) return;

  let activeShift = null;
  let timerInterval = null;
  const currentUser = APIClient.getCurrentUser();

  // DOM Elements
  const volNameSpan = document.getElementById('volunteer-name');
  const volStatusBadge = document.getElementById('volunteer-status-badge');
  const totalHoursSpan = document.getElementById('volunteer-total-hours');
  const eventsCountSpan = document.getElementById('volunteer-events-count');

  const pendingAlertBanner = document.getElementById('pending-approval-alert');
  const activeShiftCard = document.getElementById('active-shift-card');
  const checkInSelect = document.getElementById('checkin-event-select');

  const assignedEventsContainer = document.getElementById('assigned-events-container');
  const historyTableBody = document.getElementById('my-history-table');

  const profileForm = document.getElementById('volunteer-profile-form');

  initVolunteerPortal();

  async function initVolunteerPortal() {
    if (currentUser && volNameSpan) {
      volNameSpan.textContent = currentUser.name;
    }
    
    await refreshProfile();
    await checkActiveShift();
    await loadVolunteerEvents();
    await loadAttendanceHistory();
  }

  // --- User Profile & Status ---
  async function refreshProfile() {
    try {
      const updatedUser = await APIClient.get('/auth/me');
      APIClient.setCurrentUser(updatedUser);

      if (volStatusBadge) {
        let badgeClass = 'badge-pending';
        if (updatedUser.status === 'approved') badgeClass = 'badge-approved';
        if (updatedUser.status === 'rejected') badgeClass = 'badge-rejected';
        volStatusBadge.className = `badge-status ${badgeClass}`;
        volStatusBadge.textContent = updatedUser.status;
      }

      if (totalHoursSpan) totalHoursSpan.textContent = `${updatedUser.total_hours} hrs`;

      if (pendingAlertBanner) {
        if (updatedUser.status === 'pending') {
          pendingAlertBanner.classList.remove('d-none');
        } else {
          pendingAlertBanner.classList.add('d-none');
        }
      }

      // Fill profile form
      if (profileForm) {
        document.getElementById('profile-name').value = updatedUser.name || '';
        document.getElementById('profile-phone').value = updatedUser.phone || '';
        document.getElementById('profile-skills').value = updatedUser.skills || '';
        document.getElementById('profile-availability').value = updatedUser.availability || 'Weekends';
        document.getElementById('profile-bio').value = updatedUser.bio || '';
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  // Profile Form Submit
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('profile-name').value.trim(),
        phone: document.getElementById('profile-phone').value.trim(),
        skills: document.getElementById('profile-skills').value.trim(),
        availability: document.getElementById('profile-availability').value,
        bio: document.getElementById('profile-bio').value.trim()
      };

      try {
        await APIClient.put('/auth/profile', payload);
        APIClient.showToast('Profile updated successfully!', 'success');
        refreshProfile();
      } catch (err) {
        APIClient.showToast(err.message, 'error');
      }
    });
  }

  // --- Active Shift Check-in & Timer ---
  async function checkActiveShift() {
    try {
      activeShift = await APIClient.get('/attendance/active');
      const timerDisplay = document.getElementById('active-shift-timer');
      const shiftEventTitle = document.getElementById('active-shift-event');
      const checkInWidget = document.getElementById('checkin-widget');
      const activeShiftWidget = document.getElementById('active-shift-widget');

      if (activeShift) {
        if (checkInWidget) checkInWidget.classList.add('d-none');
        if (activeShiftWidget) activeShiftWidget.classList.remove('d-none');
        if (shiftEventTitle) shiftEventTitle.textContent = activeShift.event_name;

        startTimer(new Date(activeShift.check_in_time));
      } else {
        if (checkInWidget) checkInWidget.classList.remove('d-none');
        if (activeShiftWidget) activeShiftWidget.classList.add('d-none');
        if (timerInterval) clearInterval(timerInterval);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function startTimer(startTime) {
    if (timerInterval) clearInterval(timerInterval);
    const timerDisplay = document.getElementById('active-shift-timer');

    function updateDisplay() {
      const now = new Date();
      const diffMs = now - startTime;
      const seconds = Math.floor((diffMs / 1000) % 60);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));

      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      if (timerDisplay) timerDisplay.textContent = formatted;
    }

    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
  }

  // Check In Button Handler
  const checkInBtn = document.getElementById('btn-check-in');
  if (checkInBtn) {
    checkInBtn.addEventListener('click', async () => {
      const event_id = parseInt(checkInSelect.value);
      const notes = document.getElementById('checkin-notes').value.trim();

      if (!event_id) {
        APIClient.showToast('Please select an event to check in.', 'warning');
        return;
      }

      checkInBtn.disabled = true;
      try {
        await APIClient.post('/attendance/check-in', { event_id, notes });
        APIClient.showToast('Successfully checked in! Shift timer started.', 'success');
        await checkActiveShift();
        await loadAttendanceHistory();
      } catch (err) {
        APIClient.showToast(err.message, 'error');
      } finally {
        checkInBtn.disabled = false;
      }
    });
  }

  // Check Out Button Handler
  const checkOutBtn = document.getElementById('btn-check-out');
  if (checkOutBtn) {
    checkOutBtn.addEventListener('click', async () => {
      if (!activeShift) return;
      const notes = prompt('Enter any shift summary notes (optional):') || '';

      checkOutBtn.disabled = true;
      try {
        const result = await APIClient.post('/attendance/check-out', {
          attendance_id: activeShift.id,
          notes
        });

        APIClient.showToast(`Checked out! Working hours recorded: ${result.hours_worked} hrs.`, 'success');
        await checkActiveShift();
        await refreshProfile();
        await loadAttendanceHistory();
      } catch (err) {
        APIClient.showToast(err.message, 'error');
      } finally {
        checkOutBtn.disabled = false;
      }
    });
  }

  // --- Assigned & Available Events ---
  async function loadVolunteerEvents() {
    if (!assignedEventsContainer) return;
    try {
      const events = await APIClient.get('/volunteer/events');
      assignedEventsContainer.innerHTML = '';
      if (checkInSelect) checkInSelect.innerHTML = '<option value="">Select Event to Check-In...</option>';

      let assignedCount = 0;

      if (events.length === 0) {
        assignedEventsContainer.innerHTML = `
          <div class="col-12 text-center py-4 text-muted">No upcoming volunteer events scheduled.</div>
        `;
        return;
      }

      events.forEach(ev => {
        if (ev.is_assigned) {
          assignedCount++;
          if (checkInSelect) {
            checkInSelect.innerHTML += `<option value="${ev.id}">${escapeHtml(ev.name)} (${ev.event_date})</option>`;
          }
        }

        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';

        const joinBtn = ev.is_assigned
          ? `<span class="badge bg-success-subtle text-success border border-success fw-bold px-3 py-2"><i class="bi bi-check-circle me-1"></i>Assigned / Confirmed</span>`
          : `<button class="btn btn-sm btn-primary px-3" onclick="joinEvent(${ev.id})"><i class="bi bi-plus-lg me-1"></i>Join Event</button>`;

        col.innerHTML = `
          <div class="card glass-card h-100 border-0">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="badge-status badge-upcoming">${ev.status}</span>
                <small class="text-muted"><i class="bi bi-people me-1"></i>${ev.assigned_count}/${ev.max_volunteers}</small>
              </div>
              <h5 class="fw-bold card-title text-dark">${escapeHtml(ev.name)}</h5>
              <p class="card-text small text-muted flex-grow-1">${escapeHtml(ev.description || 'No description provided.')}</p>
              
              <div class="border-top pt-3 mt-2 text-muted small">
                <div class="mb-1"><i class="bi bi-geo-alt-fill text-danger me-2"></i>${escapeHtml(ev.location)}</div>
                <div class="mb-1"><i class="bi bi-calendar-event text-primary me-2"></i>${ev.event_date}</div>
                <div><i class="bi bi-clock text-warning me-2"></i>${ev.start_time} - ${ev.end_time}</div>
              </div>

              <div class="mt-3 pt-2 text-end">
                ${joinBtn}
              </div>
            </div>
          </div>
        `;
        assignedEventsContainer.appendChild(col);
      });

      if (eventsCountSpan) eventsCountSpan.textContent = assignedCount;
    } catch (err) {
      console.error(err);
    }
  }

  // Self Join Event
  window.joinEvent = async (eventId) => {
    try {
      await APIClient.post(`/volunteer/events/${eventId}/join`, {});
      APIClient.showToast('You have registered for this event!', 'success');
      loadVolunteerEvents();
    } catch (err) {
      APIClient.showToast(err.message, 'error');
    }
  };

  // --- Attendance History ---
  async function loadAttendanceHistory() {
    if (!historyTableBody) return;
    try {
      const logs = await APIClient.get('/attendance/history');
      historyTableBody.innerHTML = '';

      if (logs.length === 0) {
        historyTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-muted">You have no attendance records yet.</td>
          </tr>
        `;
        return;
      }

      logs.forEach(log => {
        const inTime = new Date(log.check_in_time).toLocaleString();
        const outTime = log.check_out_time ? new Date(log.check_out_time).toLocaleString() : 'In Progress...';
        let statusBadge = log.status === 'completed' 
          ? '<span class="badge-status badge-completed">Completed</span>' 
          : '<span class="badge-status badge-ongoing">Active</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold">${log.id}</td>
          <td class="fw-bold text-dark">${escapeHtml(log.event_name)}</td>
          <td class="small">${inTime}</td>
          <td class="small">${outTime}</td>
          <td class="fw-bold text-primary">${log.hours_worked} hrs</td>
          <td>${statusBadge}</td>
        `;
        historyTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
});
