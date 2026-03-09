/**
 * NBL-Ops Save Indicator
 * Shows save status (unsaved / saving / saved / offline) in the nav bar.
 */
const SaveIndicator = {
  _el: null,
  _hideTimer: null,

  _getEl() {
    if (!this._el) this._el = document.getElementById('save-indicator');
    return this._el;
  },

  show(state, message) {
    const el = this._getEl();
    if (!el) return;
    clearTimeout(this._hideTimer);
    el.className = 'save-indicator visible ' + state;
    el.innerHTML = '<span class="dot"></span><span>' + (message || '') + '</span>';
    if (state === 'saved') {
      this._hideTimer = setTimeout(() => { el.classList.remove('visible'); }, 2500);
    }
  },

  saving()  { this.show('saving',  'Saving\u2026'); },
  saved()   { this.show('saved',   'Saved'); },
  unsaved() { this.show('unsaved', 'Unsaved'); },
  offline() { this.show('offline', 'Offline'); },
  syncing() { this.show('saving',  'Syncing\u2026'); },
  hide() {
    const el = this._getEl();
    if (el) el.classList.remove('visible');
  }
};
