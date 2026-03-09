/**
 * NBL-Ops Toast Notifications & Progress Bar
 */
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, type, duration) {
    type = type || 'info';
    duration = duration !== undefined ? duration : 3000;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    this._getContainer().appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('fadeout');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    return toast;
  },

  info(msg, dur)    { return this.show(msg, 'info', dur); },
  success(msg, dur) { return this.show(msg, 'success', dur); },
  error(msg, dur)   { return this.show(msg, 'error', dur); },

  dismiss(toast) {
    if (toast) {
      toast.classList.add('fadeout');
      setTimeout(() => toast.remove(), 300);
    }
  }
};

const TopProgress = {
  _el: null,

  show() {
    if (!this._el) {
      this._el = document.createElement('div');
      this._el.className = 'top-progress';
      document.body.prepend(this._el);
    }
    this._el.style.width = '0%';
    this._el.style.display = 'block';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { this._el.style.width = '90%'; });
    });
  },

  done() {
    if (this._el) {
      this._el.style.width = '100%';
      setTimeout(() => { this._el.style.display = 'none'; }, 300);
    }
  }
};
