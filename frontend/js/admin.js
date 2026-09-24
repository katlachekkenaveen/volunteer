/* ==========================================================================
   Volunteer Management System - Admin Dashboard Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('admin_dashboard.html') && !window.location.pathname.endsWith('/admin')) return;

  // Global State
  let volunteersList = [];
  let eventsList = [];
  let assignmentsList = [];

  // DOM Elements
  const statsTotalVols = document.getElementById('stat-total-vols');
  const statsActiveVols = document.getElementById('stat-active-vols');
  const statsTotalEvents = document.getElementById('stat-total-events');
  const statsTotalHours = document.getElementById('stat-total-hours');

  const pendingTableBody = document.getElementById('pending-volunteers-table');
  const volunteersTableBody = document.getElementById('volunteers-directory-table');
  const eventsTableBody = document.getElementById('events-table');
  const attendanceTableBody = document.getElementById('attendance-table');

  const createEventForm = document.getElementById('create-event-form');
  const assignForm = document.getElementById('assign-form');

  // Filters & Search
  const volSearchInput = document.getElementById('vol-search');
  const volStatusSelect = document.getElementById('vol-status-filter');
  const eventStatusSelect = document.getElementById('event-status-filter');

  // Initialize Admin Data
  initAdminDashboard();

  async function initAdminDashboard() {
    await loadMetrics();
    await loadPendingVolunteers();
    await loadVolunteersDirectory();
    await loadEvents();
    await loadAssignments();
    await loadAttendanceLogs();
  }

  // --- Metrics ---
  async function loadMetrics() {
    try {
      const stats = await APIClient.get('/reports/dashboard');
      if (statsTotalVols) statsTotalVols.textContent = stats.total_volunteers;
      if (statsActiveVols) statsActiveVols.textContent = stats.active_volunteers;
      if (statsTotalEvents) statsTotalEvents.textContent = stats.total_events;
      if (statsTotalHours) statsTotalHours.textContent = `${stats.total_hours} hrs`;

      // Update badge counts
      const pendingBadge = document.getElementById('pending-count-badge');
      if (pendingBadge) pendingBadge.textContent = stats.pending_volunteers;
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }

  // --- Pending Verification Queue ---
  async function loadPendingVolunteers() {
    const pendingTables = document.querySelectorAll('.pending-volunteers-tbody');
    if (!pendingTables.length) return;
    try {
      const pending = await APIClient.get('/admin/volunteers?status=pending');
      
      pendingTables.forEach(tbody => {
        tbody.innerHTML = '';
        if (pending.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" class="text-center py-4 text-muted">
                <i class="bi bi-check-circle fs-3 d-block mb-2 text-success"></i>
                No pending registration requests!
              </td>
            </tr>
          `;
          return;
        }

        pending.forEach(vol => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <div class="fw-bold">${escapeHtml(vol.name)}</div>
              <div class="small text-muted">${escapeHtml(vol.email)}</div>
            </td>
            <td>${escapeHtml(vol.phone)}</td>
            <td><span class="badge bg-light text-dark border">${escapeHtml(vol.skills || 'N/A')}</span></td>
            <td>${escapeHtml(vol.availability || 'Flexible')}</td>
            <td><span class="badge-status badge-pending">Pending Approval</span></td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-success px-3" onclick="updateVolunteerStatus(${vol.id}, 'approved')">
                  <i class="bi bi-check-lg me-1"></i>Approve
                </button>
                <button class="btn btn-outline-danger px-3" onclick="updateVolunteerStatus(${vol.id}, 'rejected')">
                  <i class="bi bi-x-lg me-1"></i>Reject
                </button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
      });
    } catch (err) {
      APIClient.showToast('Error loading verification queue.', 'error');
    }
  }

  // --- Volunteers Directory ---
  async function loadVolunteersDirectory() {
    if (!volunteersTableBody) return;
    try {
      const search = volSearchInput ? volSearchInput.value : '';
      const status = volStatusSelect ? volStatusSelect.value : 'all';
      
      let url = `/admin/volunteers?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (status) url += `status=${encodeURIComponent(status)}`;

      volunteersList = await APIClient.get(url);
      volunteersTableBody.innerHTML = '';

      if (volunteersList.length === 0) {
        volunteersTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4 text-muted">No volunteers found matching search criteria.</td>
          </tr>
        `;
        return;
      }

      volunteersList.forEach(vol => {
        let badgeClass = 'badge-pending';
        if (vol.status === 'approved') badgeClass = 'badge-approved';
        if (vol.status === 'rejected') badgeClass = 'badge-rejected';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold">${vol.id}</td>
          <td>
            <div class="fw-bold">${escapeHtml(vol.name)}</div>
            <div class="small text-muted">${escapeHtml(vol.email)}</div>
          </td>
          <td>${escapeHtml(vol.phone)}</td>
          <td><span class="badge bg-light text-dark border">${escapeHtml(vol.skills || 'None')}</span></td>
          <td><span class="badge-status ${badgeClass}">${vol.status}</span></td>
          <td class="fw-bold text-primary">${vol.total_hours} hrs</td>
          <td>
            <div class="dropdown">
              <button class="btn btn-sm btn-light border dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li><a class="dropdown-item text-success" href="#" onclick="updateVolunteerStatus(${vol.id}, 'approved'); return false;"><i class="bi bi-check-circle me-2"></i>Approve</a></li>
                <li><a class="dropdown-item text-warning" href="#" onclick="updateVolunteerStatus(${vol.id}, 'rejected'); return false;"><i class="bi bi-x-circle me-2"></i>Reject</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="deleteVolunteer(${vol.id}); return false;"><i class="bi bi-trash me-2"></i>Delete</a></li>
              </ul>
            </div>
          </td>
        `;
        volunteersTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Volunteer Status Update
  window.updateVolunteerStatus = async (id, status) => {
    try {
      await APIClient.put(`/admin/volunteers/${id}/status`, { status });
      APIClient.showToast(`Volunteer status updated to ${status}.`, 'success');
      loadMetrics();
      loadPendingVolunteers();
      loadVolunteersDirectory();
    } catch (err) {
      APIClient.showToast(err.message, 'error');
    }
  };

  // Handle Volunteer Delete
  window.deleteVolunteer = async (id) => {
    if (!confirm('Are you sure you want to delete this volunteer profile?')) return;
    try {
      await APIClient.delete(`/admin/volunteers/${id}`);
      APIClient.showToast('Volunteer deleted successfully.', 'info');
      loadMetrics();
      loadPendingVolunteers();
      loadVolunteersDirectory();
    } catch (err) {
      APIClient.showToast(err.message, 'error');
    }
  };

  // --- Events Management ---
  async function loadEvents() {
    if (!eventsTableBody) return;
    try {
      const status = eventStatusSelect ? eventStatusSelect.value : 'all';
      eventsList = await APIClient.get(`/admin/events?status=${status}`);
      eventsTableBody.innerHTML = '';

      // Populate assignment modal select options
      const assignEventSelect = document.getElementById('assign-event-select');
      if (assignEventSelect) {
        assignEventSelect.innerHTML = '<option value="">Select Event...</option>';
        eventsList.forEach(ev => {
          assignEventSelect.innerHTML += `<option value="${ev.id}">${escapeHtml(ev.name)} (${ev.event_date})</option>`;
        });
      }

      if (eventsList.length === 0) {
        eventsTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4 text-muted">No events created yet.</td>
          </tr>
        `;
        return;
      }

      eventsList.forEach(ev => {
        let badgeClass = 'badge-upcoming';
        if (ev.status === 'ongoing') badgeClass = 'badge-ongoing';
        if (ev.status === 'completed') badgeClass = 'badge-completed';
        if (ev.status === 'cancelled') badgeClass = 'badge-cancelled';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold">${ev.id}</td>
          <td>
            <div class="fw-bold text-dark">${escapeHtml(ev.name)}</div>
            <div class="small text-muted">${escapeHtml(ev.description || '')}</div>
          </td>
          <td><i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(ev.location)}</td>
          <td>
            <div><i class="bi bi-calendar-event me-1"></i>${ev.event_date}</div>
            <div class="small text-muted"><i class="bi bi-clock me-1"></i>${ev.start_time} - ${ev.end_time}</div>
          </td>
          <td>
            <span class="fw-bold text-primary">${ev.assigned_count}</span> / ${ev.max_volunteers}
          </td>
          <td><span class="badge-status ${badgeClass}">${ev.status}</span></td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="openAssignModal(${ev.id})">
                <i class="bi bi-person-plus me-1"></i>Assign
              </button>
              <button class="btn btn-outline-danger" onclick="deleteEvent(${ev.id})">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        `;
        eventsTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error('Error loading events:', err);
    }
  }

  // Create Event Form Handler
  if (createEventForm) {
    createEventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('event-name').value.trim(),
        description: document.getElementById('event-description').value.trim(),
        location: document.getElementById('event-location').value.trim(),
        event_date: document.getElementById('event-date').value,
        start_time: document.getElementById('event-start-time').value,
        end_time: document.getElementById('event-end-time').value,
        max_volunteers: parseInt(document.getElementById('event-max-volunteers').value) || 10
      };

      try {
        await APIClient.post('/admin/events', payload);
        APIClient.showToast('Event created successfully!', 'success');
        createEventForm.reset();
        
        // Hide modal
        const modalEl = document.getElementById('createEventModal');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }

        loadEvents();
        loadMetrics();
      } catch (err) {
        APIClient.showToast(err.message, 'error');
      }
    });
  }

  // Delete Event
  window.deleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await APIClient.delete(`/admin/events/${id}`);
      APIClient.showToast('Event deleted.', 'info');
      loadEvents();
      loadMetrics();
    } catch (err) {
      APIClient.showToast(err.message, 'error');
    }
  };

  // --- Assignments ---
  async function populateApprovedVolunteersDropdown() {
    const assignVolSelect = document.getElementById('assign-volunteer-select');
    if (!assignVolSelect) return;
    try {
      const approvedVols = await APIClient.get('/admin/volunteers?status=approved');
      assignVolSelect.innerHTML = '<option value="">Select Volunteer...</option>';
      approvedVols.forEach(v => {
        assignVolSelect.innerHTML += `<option value="${v.id}">${escapeHtml(v.name)} (${escapeHtml(v.skills || 'General')})</option>`;
      });
    } catch (err) {
      console.error('Error fetching approved volunteers:', err);
    }
  }

  async function loadAssignments() {
    try {
      assignmentsList = await APIClient.get('/admin/assignments');
      await populateApprovedVolunteersDropdown();
    } catch (err) {
      console.error(err);
    }
  }

  window.openAssignModal = async (eventId) => {
    const assignEventSelect = document.getElementById('assign-event-select');
    if (assignEventSelect) assignEventSelect.value = eventId;
    
    await populateApprovedVolunteersDropdown();

    const modalEl = document.getElementById('assignVolunteerModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  };

  if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const event_id = parseInt(document.getElementById('assign-event-select').value);
      const volunteer_id = parseInt(document.getElementById('assign-volunteer-select').value);

      if (!event_id || !volunteer_id) {
        APIClient.showToast('Please select both an event and a volunteer.', 'warning');
        return;
      }

      try {
        await APIClient.post('/admin/assignments', { event_id, volunteer_id });
        APIClient.showToast('Volunteer assigned to event successfully!', 'success');
        assignForm.reset();

        const modalEl = document.getElementById('assignVolunteerModal');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }

        loadEvents();
        loadAssignments();
      } catch (err) {
        APIClient.showToast(err.message, 'error');
      }
    });
  }

  // --- Attendance Logs ---
  async function loadAttendanceLogs() {
    if (!attendanceTableBody) return;
    try {
      const logs = await APIClient.get('/attendance/history');
      attendanceTableBody.innerHTML = '';

      if (logs.length === 0) {
        attendanceTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4 text-muted">No attendance logs recorded yet.</td>
          </tr>
        `;
        return;
      }

      logs.forEach(log => {
        const inTime = new Date(log.check_in_time).toLocaleString();
        const outTime = log.check_out_time ? new Date(log.check_out_time).toLocaleString() : 'In Progress...';
        
        let badge = log.status === 'completed' ? '<span class="badge-status badge-completed">Completed</span>' : '<span class="badge-status badge-ongoing">Active Shift</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold">${log.id}</td>
          <td class="fw-bold text-dark">${escapeHtml(log.event_name)}</td>
          <td>${escapeHtml(log.volunteer_name)}</td>
          <td class="small">${inTime}</td>
          <td class="small">${outTime}</td>
          <td class="fw-bold text-primary">${log.hours_worked} hrs</td>
          <td>${badge}</td>
        `;
        attendanceTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Event Listeners for Filters
  if (volSearchInput) volSearchInput.addEventListener('input', debounce(loadVolunteersDirectory, 300));
  if (volStatusSelect) volStatusSelect.addEventListener('change', loadVolunteersDirectory);
  if (eventStatusSelect) eventStatusSelect.addEventListener('change', loadEvents);

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
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});
