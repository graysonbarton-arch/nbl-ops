/**
 * ProjectStore — Hybrid local + cloud storage for multi-project budget system.
 *
 * Uses localStorage for instant reads and offline fallback.
 * Syncs to Supabase via API when user is authenticated.
 * The external API (list, load, save, create, delete, duplicate) stays identical.
 */
const ProjectStore = {

  // ---- Private helpers (localStorage) ----

  _getIndex() {
    try { return JSON.parse(localStorage.getItem('nbl_projects_index') || '[]'); }
    catch { return []; }
  },

  _setIndex(index) {
    localStorage.setItem('nbl_projects_index', JSON.stringify(index));
  },

  // ---- Public API ----

  /** Returns array of project metadata objects, sorted by lastModified desc */
  list() {
    return this._getIndex().sort((a, b) =>
      new Date(b.lastModified) - new Date(a.lastModified)
    );
  },

  /** Async: fetch cloud projects and merge with local */
  async listCloud() {
    try {
      // Use authFetch if logged in (includes token), plain fetch otherwise
      const res = (typeof isLoggedIn === 'function' && isLoggedIn())
        ? await authFetch('/api/budgets/list')
        : await fetch('/api/budgets/list');
      if (res.ok) {
        const cloud = await res.json();
        this._mergeCloudIndex(cloud);
      }
    } catch (e) { console.warn('Cloud list failed, using local:', e); }
    return this.list();
  },

  /** Merge cloud projects into local index */
  _mergeCloudIndex(cloudProjects) {
    const index = this._getIndex();
    cloudProjects.forEach(cp => {
      const existing = index.findIndex(p => p.id === cp.id);
      const entry = {
        id: cp.id,
        title: cp.title || 'UNTITLED',
        artist: cp.subtitle || '',
        dates: 'TBD',
        status: cp.status || 'Draft',
        budgetTotal: 0,
        source: cp.source || '',
        lastModified: cp.updated_at || cp.created_at || new Date().toISOString(),
        createdAt: cp.created_at || new Date().toISOString(),
        _cloud: true,
      };
      if (existing >= 0) {
        // Cloud is newer? Update local
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

  /** Returns the full project data blob, or null if not found */
  load(id) {
    try {
      const raw = localStorage.getItem('nbl_project_' + id);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  /** Async: try loading from cloud, fall back to local */
  async loadCloud(id) {
    // Try local first for speed
    let data = this.load(id);
    try {
      // Use authFetch if logged in, plain fetch otherwise
      const res = (typeof isLoggedIn === 'function' && isLoggedIn())
        ? await authFetch('/api/budgets/get?id=' + encodeURIComponent(id))
        : await fetch('/api/budgets/get?id=' + encodeURIComponent(id));
      if (res.ok) {
        const cloud = await res.json();
        if (cloud && cloud.data) {
          // Save cloud data locally for caching
          localStorage.setItem('nbl_project_' + id, JSON.stringify(cloud.data));
          data = cloud.data;
        }
      }
    } catch (e) { console.warn('Cloud load failed, using local:', e); }
    return data;
  },

  /**
   * Saves full project data blob AND updates the index entry.
   * Also syncs to cloud in background if authenticated.
   */
  save(id, fullData, meta) {
    // Always write locally first (instant)
    localStorage.setItem('nbl_project_' + id, JSON.stringify(fullData));

    const index = this._getIndex();
    const now = new Date().toISOString();
    const existingIdx = index.findIndex(p => p.id === id);
    const existing = existingIdx >= 0 ? index[existingIdx] : {};
    const entry = {
      id,
      title:       meta.title       || 'UNTITLED',
      artist:      meta.artist      || '',
      dates:       meta.dates       || 'TBD',
      status:      meta.status      || 'Draft',
      budgetTotal: meta.budgetTotal || 0,
      source:      meta.source      || existing.source || '',
      lastModified: now,
      createdAt:   existingIdx >= 0 ? existing.createdAt : now,
      _cloud:      existing._cloud  || false,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }
    this._setIndex(index);

    // Background cloud sync
    this._syncToCloud(id, fullData, entry);

    return entry;
  },

  /** Background sync to cloud (fire and forget) */
  async _syncToCloud(id, fullData, meta) {
    if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;
    try {
      await authFetch('/api/budgets/save', {
        method: 'POST',
        body: JSON.stringify({
          id,
          title: meta.title,
          subtitle: meta.artist,
          status: meta.status,
          data: fullData,
        }),
      });
    } catch (e) {
      console.warn('Cloud save failed:', e);
      if (typeof SaveIndicator !== 'undefined') SaveIndicator.offline();
    }
  },

  /**
   * Creates a new empty project and adds it to the index.
   * @returns {string} The new project ID
   */
  create() {
    const id = 'proj_' + Date.now();
    const now = new Date().toISOString();
    const index = this._getIndex();
    index.push({
      id,
      title: 'UNTITLED PROJECT',
      artist: '',
      dates: 'TBD',
      status: 'Draft',
      budgetTotal: 0,
      lastModified: now,
      createdAt: now,
    });
    this._setIndex(index);
    return id;
  },

  /**
   * Deletes a project: removes both the data blob and the index entry.
   * Also deletes from cloud if authenticated.
   */
  delete(id) {
    localStorage.removeItem('nbl_project_' + id);
    const index = this._getIndex().filter(p => p.id !== id);
    this._setIndex(index);

    // Cloud delete
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
      authFetch('/api/budgets/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      }).catch(e => console.warn('Cloud delete failed:', e));
    }
  },

  /**
   * Duplicates an existing project with a new ID.
   */
  duplicate(id) {
    const data = this.load(id);
    if (!data) return null;
    const newId = 'proj_' + Date.now();
    const index = this._getIndex();
    const original = index.find(p => p.id === id);
    const now = new Date().toISOString();
    const entry = {
      ...(original || {}),
      id: newId,
      title: ((original?.title) || 'UNTITLED') + ' (Copy)',
      lastModified: now,
      createdAt: now,
    };
    index.push(entry);
    this._setIndex(index);
    localStorage.setItem('nbl_project_' + newId, JSON.stringify(data));

    // Sync duplicate to cloud
    this._syncToCloud(newId, data, entry);

    return newId;
  },

  /**
   * Push all local-only projects to cloud.
   * Call after login to sync existing local data up.
   */
  async syncAllToCloud() {
    if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;
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
