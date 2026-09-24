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
      const timerDisplays = document.querySelectorAll('.active-shift-timer-text');
      const shiftEventTitles = document.querySelectorAll('.active-shift-title-text');
      const checkInWidget = document.getElementById('checkin-widget');
      const activeShiftWidget = document.getElementById('active-shift-widget');
      const liveBadge = document.getElementById('main-tracker-status-live');
      const btnQuickCheckin = document.getElementById('btn-quick-checkin-main');
      const btnQuickCheckout = document.getElementById('btn-quick-checkout-main');
      const activeShiftDescMain = document.getElementById('active-shift-desc-main');

      if (activeShift) {
        if (checkInWidget) checkInWidget.classList.add('d-none');
        if (activeShiftWidget) activeShiftWidget.classList.remove('d-none');
        if (liveBadge) liveBadge.classList.remove('d-none');
        if (btnQuickCheckin) btnQuickCheckin.classList.add('d-none');
        if (btnQuickCheckout) btnQuickCheckout.classList.remove('d-none');
        if (activeShiftDescMain) activeShiftDescMain.textContent = 'Shift currently in progress. Working hours are accumulating live.';

        shiftEventTitles.forEach(el => { el.textContent = activeShift.event_name; });

        // Update modal event name
        const modalEventName = document.getElementById('modal-checkout-event-name');
        if (modalEventName) modalEventName.textContent = activeShift.event_name;

        startTimer(parseUTCDate(activeShift.check_in_time));
      } else {
        if (checkInWidget) checkInWidget.classList.remove('d-none');
        if (activeShiftWidget) activeShiftWidget.classList.add('d-none');
        if (liveBadge) liveBadge.classList.add('d-none');
        if (btnQuickCheckin) btnQuickCheckin.classList.remove('d-none');
        if (btnQuickCheckout) btnQuickCheckout.classList.add('d-none');
        if (activeShiftDescMain) activeShiftDescMain.textContent = 'Check in to record your working hours for scheduled volunteer events.';

        shiftEventTitles.forEach(el => { el.textContent = 'No Active Shift'; });
        timerDisplays.forEach(el => { el.textContent = '00:00:00'; });
        if (timerInterval) clearInterval(timerInterval);
      }

      // Re-render event cards if loaded to reflect current shift status
      renderAssignedCardsActionButtons();
    } catch (err) {
      console.error(err);
    }
  }

  function parseUTCDate(dateStr) {
    if (!dateStr) return new Date();
    // If date string doesn't end with Z or timezone offset (+XX:XX), append Z to ensure UTC parsing
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'Z');
    }
    return new Date(dateStr);
  }

  function startTimer(startTime) {
    if (timerInterval) clearInterval(timerInterval);
    const timerDisplays = document.querySelectorAll('.active-shift-timer-text');
    const modalTimer = document.getElementById('modal-checkout-timer');

    function updateDisplay() {
      const now = new Date();
      const diffMs = Math.max(0, now - startTime);
      const seconds = Math.floor((diffMs / 1000) % 60);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));

      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      timerDisplays.forEach(el => { el.textContent = formatted; });
      if (modalTimer) modalTimer.textContent = formatted;
    }

    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
  }

  // Quick Check-In Main Banner Trigger
  const btnQuickCheckinMain = document.getElementById('btn-quick-checkin-main');
  if (btnQuickCheckinMain) {
    btnQuickCheckinMain.addEventListener('click', () => {
      const quickModal = new bootstrap.Modal(document.getElementById('quickCheckInModal'));
      quickModal.show();
    });
  }

  // Quick Check-In Confirm Button
  const btnConfirmQuickCheckin = document.getElementById('btn-confirm-quick-checkin');
  if (btnConfirmQuickCheckin) {
    btnConfirmQuickCheckin.addEventListener('click', async () => {
      const select = document.getElementById('quick-checkin-event-select');
      const event_id = parseInt(select.value);
      const notes = document.getElementById('quick-checkin-notes').value.trim();

      if (!event_id) {
        APIClient.showToast('Please select an event to check in.', 'warning');
        return;
      }

      btnConfirmQuickCheckin.disabled = true;
      try {
        await APIClient.post('/attendance/check-in', { event_id, notes });
        APIClient.showToast('Shift started! Time is tracking live.', 'success');

        const modalEl = document.getElementById('quickCheckInModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        // Reset quick checkin notes
        document.getElementById('quick-checkin-notes').value = '';

        await checkActiveShift();
        await loadAttendanceHistory();
      } catch (err) {
        APIClient.showToast(err.message, 'error');
      } finally {
        btnConfirmQuickCheckin.disabled = false;
      }
    });
  }

  // Dedicated Check-In Tab Button Handler
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

  // Quick Check Out Button Triggers Modal
  function openCheckoutModal() {
    if (!activeShift) return;
    const modalCheckoutTimer = document.getElementById('modal-checkout-timer');
    const modalEventName = document.getElementById('modal-checkout-event-name');
    if (modalEventName) modalEventName.textContent = activeShift.event_name;
    const checkoutNotesInput = document.getElementById('checkout-notes-input');
    if (checkoutNotesInput) checkoutNotesInput.value = '';

    const checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
    checkoutModal.show();
  }

  const btnQuickCheckoutMain = document.getElementById('btn-quick-checkout-main');
  if (btnQuickCheckoutMain) {
    btnQuickCheckoutMain.addEventListener('click', openCheckoutModal);
  }

  const checkOutBtn = document.getElementById('btn-check-out');
  if (checkOutBtn) {
    checkOutBtn.addEventListener('click', openCheckoutModal);
  }

  // Modal Confirm Check-Out Button
  const btnConfirmCheckout = document.getElementById('btn-confirm-checkout');
  if (btnConfirmCheckout) {
    btnConfirmCheckout.addEventListener('click', async () => {
      if (!activeShift) return;
      const notes = document.getElementById('checkout-notes-input').value.trim();

      btnConfirmCheckout.disabled = true;
      try {
        const result = await APIClient.post('/attendance/check-out', {
          attendance_id: activeShift.id,
          notes
        });

        const checkoutModalEl = document.getElementById('checkoutModal');
        const modal = bootstrap.Modal.getInstance(checkoutModalEl);
        if (modal) modal.hide();

        APIClient.showToast(`Checked out successfully! Logged ${result.hours_worked} hrs.`, 'success');
        await checkActiveShift();
        await refreshProfile();
        await loadAttendanceHistory();
      } catch (err) {
        APIClient.showToast(err.message, 'error');
      } finally {
        btnConfirmCheckout.disabled = false;
      }
    });
  }

  // Direct check in to a specific event from an event card
  window.checkInToEvent = (eventId) => {
    const quickSelect = document.getElementById('quick-checkin-event-select');
    if (quickSelect) {
      quickSelect.value = eventId;
    }
    const quickModal = new bootstrap.Modal(document.getElementById('quickCheckInModal'));
    quickModal.show();
  };

  function renderAssignedCardsActionButtons() {
    document.querySelectorAll('.card-assigned-action').forEach(el => {
      const eventId = parseInt(el.dataset.eventId);
      if (activeShift && activeShift.event_id === eventId) {
        el.innerHTML = `<button class="btn btn-sm btn-danger px-3 fw-bold" onclick="openCheckoutModal()"><i class="bi bi-stop-circle me-1"></i>Check Out</button>`;
      } else if (activeShift) {
        el.innerHTML = `<span class="badge bg-success-subtle text-success border border-success fw-bold px-3 py-2"><i class="bi bi-check-circle me-1"></i>Assigned</span>`;
      } else {
        el.innerHTML = `
          <div class="d-flex gap-2 justify-content-end">
            <span class="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1"><i class="bi bi-check-circle me-1"></i>Assigned</span>
            <button class="btn btn-sm btn-primary px-3 fw-bold" onclick="checkInToEvent(${eventId})"><i class="bi bi-play-fill me-1"></i>Check-In</button>
          </div>
        `;
      }
    });
  }
  window.openCheckoutModal = openCheckoutModal;

  // --- Assigned & Available Events ---
  async function loadVolunteerEvents() {
    const assignedContainer = document.getElementById('my-assigned-events-container');
    const allEventsContainer = document.getElementById('all-available-events-container');
    const quickCheckinSelect = document.getElementById('quick-checkin-event-select');

    try {
      const events = await APIClient.get('/volunteer/events');
      if (assignedContainer) assignedContainer.innerHTML = '';
      if (allEventsContainer) allEventsContainer.innerHTML = '';
      if (checkInSelect) checkInSelect.innerHTML = '<option value="">Select Event to Check-In...</option>';
      if (quickCheckinSelect) quickCheckinSelect.innerHTML = '<option value="">Select Event to Check-In...</option>';

      let assignedCount = 0;

      if (events.length === 0) {
        const emptyMsg = `<div class="col-12 text-center py-4 text-muted">No upcoming volunteer events scheduled.</div>`;
        if (assignedContainer) assignedContainer.innerHTML = emptyMsg;
        if (allEventsContainer) allEventsContainer.innerHTML = emptyMsg;
        return;
      }

      events.forEach(ev => {
        if (ev.is_assigned) {
          assignedCount++;
          const optHtml = `<option value="${ev.id}">${escapeHtml(ev.name)} (${ev.event_date})</option>`;
          if (checkInSelect) checkInSelect.innerHTML += optHtml;
          if (quickCheckinSelect) quickCheckinSelect.innerHTML += optHtml;
        }

        const createCardCol = (isAssignedView) => {
          const col = document.createElement('div');
          col.className = 'col-md-6 col-lg-6 mb-4';

          let actionContent = '';
          const currentU = APIClient.getCurrentUser();
          if (ev.is_assigned) {
            actionContent = `<div class="card-assigned-action" data-event-id="${ev.id}"></div>`;
          } else if (currentU && currentU.status !== 'approved' && currentU.role !== 'admin') {
            actionContent = `<button class="btn btn-sm btn-outline-secondary px-3" disabled title="Application pending admin verification"><i class="bi bi-hourglass-split me-1"></i>Pending Approval</button>`;
          } else {
            actionContent = `<button class="btn btn-sm btn-primary px-3" onclick="joinEvent(${ev.id})"><i class="bi bi-plus-lg me-1"></i>Join Event</button>`;
          }

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
                  ${actionContent}
                </div>
              </div>
            </div>
          `;
          return col;
        };

        if (allEventsContainer) {
          allEventsContainer.appendChild(createCardCol(false));
        }

        if (assignedContainer && ev.is_assigned) {
          assignedContainer.appendChild(createCardCol(true));
        }
      });

      if (assignedContainer && assignedContainer.children.length === 0) {
        assignedContainer.innerHTML = `<div class="col-12 text-center py-4 text-muted">You are not currently assigned to any scheduled events. Browse openings in the Events tab!</div>`;
      }

      if (eventsCountSpan) eventsCountSpan.textContent = assignedCount;
      renderAssignedCardsActionButtons();
    } catch (err) {
      console.error(err);
    }
  }

  // Self Join Event
  window.joinEvent = async (eventId) => {
    try {
      await APIClient.post(`/volunteer/events/${eventId}/join`, {});
      APIClient.showToast('You have registered for this event!', 'success');
      await loadVolunteerEvents();
      await refreshProfile();
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
        const inTime = parseUTCDate(log.check_in_time).toLocaleString();
        const outTime = log.check_out_time ? parseUTCDate(log.check_out_time).toLocaleString() : 'In Progress...';
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

  // Explicit Sidebar Tab Switcher to guarantee instant switching
  const sidebarLinks = document.querySelectorAll('.sidebar-menu .sidebar-link');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSelector = link.getAttribute('data-bs-target');
      if (!targetSelector) return;

      const targetPane = document.querySelector(targetSelector);
      if (!targetPane) return;

      // Update active sidebar link
      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update tab pane visibility
      const tabPanes = document.querySelectorAll('.tab-content .tab-pane');
      tabPanes.forEach(pane => {
        pane.classList.remove('show', 'active');
      });

      targetPane.classList.add('show', 'active');

      // If switching to Events or History tab, trigger refresh
      if (targetSelector === '#vtab-events') {
        loadVolunteerEvents();
      } else if (targetSelector === '#vtab-history') {
        loadAttendanceHistory();
      } else if (targetSelector === '#vtab-checkin') {
        checkActiveShift();
      }
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
});
