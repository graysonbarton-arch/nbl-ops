/**
 * LinkStore — Hybrid local + cloud storage for NBL Live Link List.
 *
 * Uses localStorage for instant reads and offline fallback.
 * Syncs to Supabase via /api/links when user is authenticated.
 */
const LinkStore = {

  // ---- Private helpers (localStorage) ----

  _getIndex() {
    try { return JSON.parse(localStorage.getItem('nbl_links_index') || '[]'); }
    catch { return []; }
  },

  _setIndex(index) {
    localStorage.setItem('nbl_links_index', JSON.stringify(index));
  },

  // ---- Public API ----

  /** Returns array of link objects, sorted by updated desc */
  list() {
    return this._getIndex()
      .filter(l => !l.is_archived)
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  },

  /** Async: fetch cloud links and merge with local */
  async listCloud() {
    try {
      const res = (typeof isLoggedIn === 'function' && isLoggedIn())
        ? await authFetch('/api/links?action=list')
        : await fetch('/api/links?action=list');
      if (res.ok) {
        const cloud = await res.json();
        this._mergeCloudIndex(cloud);
      }
    } catch (e) { console.warn('Cloud link list failed, using local:', e); }
    return this.list();
  },

  /** Merge cloud links into local index */
  _mergeCloudIndex(cloudLinks) {
    const index = this._getIndex();
    cloudLinks.forEach(cl => {
      const existing = index.findIndex(l => l.id === cl.id);
      if (existing >= 0) {
        if (new Date(cl.updated_at) >= new Date(index[existing].updated_at || 0)) {
          index[existing] = { ...cl, _cloud: true };
        } else {
          index[existing]._cloud = true;
        }
      } else {
        index.push({ ...cl, _cloud: true });
      }
    });
    this._setIndex(index);
  },

  /** Save/update a link locally + sync to cloud */
  save(id, fields) {
    const index = this._getIndex();
    const now = new Date().toISOString();
    const existingIdx = index.findIndex(l => l.id === id);
    const existing = existingIdx >= 0 ? index[existingIdx] : {};

    const entry = {
      ...existing,
      ...fields,
      id,
      updated_at: now,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      entry.created_at = now;
      index.push(entry);
    }
    this._setIndex(index);

    // Background cloud sync
    this._syncToCloud(entry);

    return entry;
  },

  /** Create a new link */
  create(fields) {
    const id = 'link_' + Date.now();
    const now = new Date().toISOString();
    const entry = {
      id,
      item: fields.item || 'New Link',
      category: fields.category || null,
      purchase_status: fields.purchase_status || 'To Research',
      review_status: fields.review_status || 'Not Started',
      priority: fields.priority || 'Medium',
      link: fields.link || null,
      notes: fields.notes || null,
      source: fields.source || null,
      estimated_cost: fields.estimated_cost || null,
      use_case: fields.use_case || null,
      is_archived: false,
      created_at: now,
      updated_at: now,
    };
    const index = this._getIndex();
    index.push(entry);
    this._setIndex(index);
    this._syncToCloud(entry);
    return id;
  },

  /** Soft-delete a link */
  delete(id) {
    const index = this._getIndex();
    const idx = index.findIndex(l => l.id === id);
    if (idx >= 0) {
      index[idx].is_archived = true;
      index[idx].updated_at = new Date().toISOString();
      this._setIndex(index);
    }

    const doFetch = (typeof isLoggedIn === 'function' && isLoggedIn()) ? authFetch : fetch;
    doFetch('/api/links?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(e => console.warn('Cloud link delete failed:', e));
  },

  /** Sync a single link to cloud */
  async _syncToCloud(entry, _retries) {
    const attempt = _retries || 0;
    try {
      const doFetch = (typeof isLoggedIn === 'function' && isLoggedIn()) ? authFetch : fetch;
      const res = await doFetch('/api/links?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) return true;
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        return this._syncToCloud(entry, attempt + 1);
      }
      console.warn('Cloud link save failed: HTTP', res.status);
      return false;
    } catch (e) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        return this._syncToCloud(entry, attempt + 1);
      }
      console.warn('Cloud link save failed after retries:', e);
      return false;
    }
  },

  /** Seed from cloud API (one-time) */
  async seed() {
    try {
      const doFetch = (typeof isLoggedIn === 'function' && isLoggedIn()) ? authFetch : fetch;
      const res = await doFetch('/api/links?action=seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Seed result:', result);
        // Refresh from cloud
        await this.listCloud();
        return result;
      }
    } catch (e) { console.warn('Seed failed:', e); }
    return null;
  },

  /** Push all local-only links to cloud */
  async syncAllToCloud() {
    const index = this._getIndex();
    let synced = 0;
    for (const entry of index) {
      if (!entry._cloud && !entry.is_archived) {
        await this._syncToCloud(entry);
        entry._cloud = true;
        synced++;
      }
    }
    if (synced > 0) this._setIndex(index);
    return synced;
  },
};
