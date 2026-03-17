/**
 * AdvanceStore — Hybrid local + cloud storage for production advances.
 *
 * Uses localStorage for instant reads and offline fallback.
 * Syncs to Supabase via API when user is authenticated.
 */
const AdvanceStore = {

  _getIndex() {
    try { return JSON.parse(localStorage.getItem('nbl_advances_index') || '[]'); }
    catch { return []; }
  },

  _setIndex(index) {
    localStorage.setItem('nbl_advances_index', JSON.stringify(index));
  },

  /** Returns array of advance metadata objects, sorted by date desc then lastModified desc */
  list() {
    return this._getIndex().sort((a, b) =>
      new Date(b.lastModified) - new Date(a.lastModified)
    );
  },

  /** Async: fetch cloud advances and merge with local */
  async listCloud() {
    try {
      const res = (typeof isLoggedIn === 'function' && isLoggedIn())
        ? await authFetch('/api/advances?action=list')
        : await fetch('/api/advances?action=list');
      if (res.ok) {
        const cloud = await res.json();
        this._mergeCloudIndex(cloud);
      }
    } catch (e) { console.warn('Cloud advance list failed, using local:', e); }
    return this.list();
  },

  _mergeCloudIndex(cloudAdvances) {
    const index = this._getIndex();
    cloudAdvances.forEach(ca => {
      const existing = index.findIndex(a => a.id === ca.id);
      const entry = {
        id: ca.id,
        showName: ca.show_name || 'UNTITLED SHOW',
        venue: ca.venue || '',
        date: ca.show_date || '',
        status: ca.status || 'Not Started',
        linkedProjectId: ca.linked_project_id || '',
        lastModified: ca.updated_at || ca.created_at || new Date().toISOString(),
        createdAt: ca.created_at || new Date().toISOString(),
        _cloud: true,
      };
      if (existing >= 0) {
        if (new Date(entry.lastModified) >= new Date(index[existing].lastModified)) {
          index[existing] = { ...index[existing], ...entry };
        }
        index[existing]._cloud = true;
      } else {
        index.push(entry);
      }
    });
    this._setIndex(index);
  },

  /** Returns the full advance data blob, or null if not found */
  load(id) {
    try {
      const raw = localStorage.getItem('nbl_advance_' + id);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  /** Async: try loading from cloud, fall back to local */
  async loadCloud(id) {
    let data = this.load(id);
    try {
      const res = (typeof isLoggedIn === 'function' && isLoggedIn())
        ? await authFetch('/api/advances?action=get&id=' + encodeURIComponent(id))
        : await fetch('/api/advances?action=get&id=' + encodeURIComponent(id));
      if (res.ok) {
        const cloud = await res.json();
        if (cloud && cloud.data) {
          // Inject linked_project_id from the DB column into the data blob's meta
          if (cloud.linked_project_id && cloud.data.meta) {
            cloud.data.meta.linkedProjectId = cloud.linked_project_id;
          }
          localStorage.setItem('nbl_advance_' + id, JSON.stringify(cloud.data));
          data = cloud.data;
        }
      }
    } catch (e) { console.warn('Cloud advance load failed, using local:', e); }
    return data;
  },

  /** Saves full advance data blob AND updates the index entry. */
  save(id, fullData, meta) {
    localStorage.setItem('nbl_advance_' + id, JSON.stringify(fullData));

    const index = this._getIndex();
    const now = new Date().toISOString();
    const existingIdx = index.findIndex(a => a.id === id);
    const existing = existingIdx >= 0 ? index[existingIdx] : {};
    const entry = {
      id,
      showName:        meta.showName        || 'UNTITLED SHOW',
      venue:           meta.venue           || '',
      date:            meta.date            || '',
      status:          meta.status          || 'Not Started',
      linkedProjectId: meta.linkedProjectId || '',
      lastModified: now,
      createdAt:    existingIdx >= 0 ? existing.createdAt : now,
      _cloud:       existing._cloud || false,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }
    this._setIndex(index);
    this._syncToCloud(id, fullData, entry);
    return entry;
  },

  async _syncToCloud(id, fullData, meta) {
    try {
      // Use authFetch if logged in (includes token), plain fetch otherwise
      const doFetch = (typeof isLoggedIn === 'function' && isLoggedIn()) ? authFetch : fetch;
      await doFetch('/api/advances?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          show_name: meta.showName,
          venue: meta.venue,
          show_date: meta.date,
          status: meta.status,
          linked_project_id: meta.linkedProjectId,
          data: fullData,
        }),
      });
    } catch (e) {
      console.warn('Cloud advance save failed:', e);
      if (typeof SaveIndicator !== 'undefined') SaveIndicator.offline();
    }
  },

  create() {
    const id = 'adv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const index = this._getIndex();
    index.push({
      id,
      showName: 'UNTITLED SHOW',
      venue: '',
      date: '',
      status: 'Not Started',
      linkedProjectId: '',
      lastModified: now,
      createdAt: now,
    });
    this._setIndex(index);
    return id;
  },

  delete(id) {
    localStorage.removeItem('nbl_advance_' + id);
    const index = this._getIndex().filter(a => a.id !== id);
    this._setIndex(index);

    // Always sync delete to cloud
    const doFetch = (typeof isLoggedIn === 'function' && isLoggedIn()) ? authFetch : fetch;
    doFetch('/api/advances?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(e => console.warn('Cloud advance delete failed:', e));
  },

  duplicate(id) {
    const data = this.load(id);
    if (!data) return null;
    const newId = 'adv_' + Date.now();
    const index = this._getIndex();
    const original = index.find(a => a.id === id);
    const now = new Date().toISOString();
    const entry = {
      ...(original || {}),
      id: newId,
      showName: ((original?.showName) || 'UNTITLED') + ' (Copy)',
      lastModified: now,
      createdAt: now,
    };
    index.push(entry);
    this._setIndex(index);
    localStorage.setItem('nbl_advance_' + newId, JSON.stringify(data));
    this._syncToCloud(newId, data, entry);
    return newId;
  },

  async syncAllToCloud() {
    const index = this._getIndex();
    let synced = 0;
    for (const entry of index) {
      if (!entry._cloud) {
        const data = this.load(entry.id);
        if (data) {
          await this._syncToCloud(entry.id, data, entry);
          entry._cloud = true;
          synced++;
        }
      }
    }
    if (synced > 0) this._setIndex(index);
    return synced;
  },
};
