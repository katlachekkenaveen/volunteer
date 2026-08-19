/* ==========================================================================
   Volunteer Management System - API Client & Toast Utilities
   ========================================================================== */

const API_BASE_URL = window.location.origin.includes('8000') || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '/api'
  : 'http://127.0.0.1:8000/api';

class APIClient {
  static getAuthToken() {
    return localStorage.getItem('token');
  }

  static setAuthToken(token) {
    localStorage.setItem('token', token);
  }

  static removeAuthToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  static getCurrentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  static setCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  static async request(endpoint, options = {}) {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (response.status === 401) {
        // Unauthorized / Token expired
        this.removeAuthToken();
        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
          this.showToast('Session expired. Please log in again.', 'warning');
          setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        }
      }

      if (response.status === 204) {
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'An unexpected error occurred.');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  static get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  static put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  static showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    let iconClass = 'bi-info-circle-fill text-info';
    if (type === 'success') iconClass = 'bi-check-circle-fill text-success';
    if (type === 'error') iconClass = 'bi-exclamation-triangle-fill text-danger';
    if (type === 'warning') iconClass = 'bi-exclamation-circle-fill text-warning';

    toast.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi ${iconClass} fs-5"></i>
        <span class="fw-semibold small">${message}</span>
      </div>
      <button type="button" class="btn-close ms-3" onclick="this.parentElement.remove()"></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4500);
  }
}

window.APIClient = APIClient;
