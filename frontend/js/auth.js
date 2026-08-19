/* ==========================================================================
   Volunteer Management System - Auth Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtns = document.querySelectorAll('.logout-btn');

  // Guard page permissions
  const currentUser = APIClient.getCurrentUser();
  const currentPath = window.location.pathname;

  const isAdminRegisterPage = currentPath.includes('admin_register') || currentPath.endsWith('/admin/register');

  if (!isAdminRegisterPage) {
    const isAdminDashboard = currentPath.includes('admin_dashboard.html') || currentPath === '/admin' || currentPath === '/admin/' || currentPath.endsWith('/admin.html');
    const isVolunteerDashboard = currentPath.includes('volunteer_dashboard.html') || currentPath === '/volunteer' || currentPath === '/volunteer/' || currentPath.endsWith('/volunteer.html');

    if (isAdminDashboard) {
      if (!currentUser || currentUser.role !== 'admin') {
        APIClient.showToast('Admin access required.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
      }
    } else if (isVolunteerDashboard) {
      if (!currentUser) {
        APIClient.showToast('Please log in to access volunteer portal.', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
      }
    }
  }

  // Login Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        APIClient.showToast('Please provide both email and password.', 'warning');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Logging in...`;

      try {
        const response = await APIClient.post('/auth/login', { email, password });
        APIClient.setAuthToken(response.access_token);
        APIClient.setCurrentUser(response.user);

        APIClient.showToast(`Welcome back, ${response.user.name}!`, 'success');

        setTimeout(() => {
          if (response.user.role === 'admin') {
            window.location.href = 'admin_dashboard.html';
          } else {
            window.location.href = 'volunteer_dashboard.html';
          }
        }, 800);
      } catch (err) {
        APIClient.showToast(err.message || 'Login failed.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  // Registration Handler
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const skills = document.getElementById('reg-skills').value.trim();
      const availability = document.getElementById('reg-availability').value;
      const bio = document.getElementById('reg-bio').value.trim();

      if (password !== confirmPassword) {
        APIClient.showToast('Passwords do not match.', 'error');
        return;
      }

      if (password.length < 6) {
        APIClient.showToast('Password must be at least 6 characters.', 'warning');
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Creating account...`;

      try {
        const payload = { name, email, phone, password, skills, availability, bio };
        const user = await APIClient.post('/auth/register', payload);

        if (user.status === 'approved') {
          APIClient.showToast('Registration successful! Admin account created. You can now log in.', 'success');
        } else {
          APIClient.showToast('Registration submitted! Your application is pending admin verification.', 'info');
        }

        registerForm.reset();
        
        // Switch tab to login if on auth page
        const loginTab = document.getElementById('login-tab');
        if (loginTab) {
          const bsTab = new bootstrap.Tab(loginTab);
          bsTab.show();
        }
      } catch (err) {
        APIClient.showToast(err.message || 'Registration failed.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  // Admin Registration Handler
  const adminRegisterForm = document.getElementById('admin-register-form');
  if (adminRegisterForm) {
    adminRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('admin-reg-name').value.trim();
      const email = document.getElementById('admin-reg-email').value.trim();
      const password = document.getElementById('admin-reg-password').value;
      const confirmPassword = document.getElementById('admin-reg-confirm-password').value;
      const admin_key = document.getElementById('admin-reg-key').value;

      if (password !== confirmPassword) {
        APIClient.showToast('Passwords do not match.', 'error');
        return;
      }

      if (password.length < 6) {
        APIClient.showToast('Password must be at least 6 characters.', 'warning');
        return;
      }

      const submitBtn = adminRegisterForm.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Creating admin account...`;

      try {
        const payload = { name, email, password, admin_key };
        const user = await APIClient.post('/auth/admin/register', payload);

        APIClient.showToast(`Admin registration successful! Welcome, ${user.name}. Please sign in.`, 'success');
        adminRegisterForm.reset();

        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      } catch (err) {
        APIClient.showToast(err.message || 'Admin registration failed.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  // Logout Handlers
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      APIClient.removeAuthToken();
      APIClient.showToast('Logged out successfully.', 'info');
      setTimeout(() => { window.location.href = 'index.html'; }, 600);
    });
  });
});
