/**
 * ProjectStore — localStorage abstraction for multi-project budget system.
 *
 * Wraps localStorage now, structured for a clean swap to fetch() API calls later.
 * When migrating to a backend, replace each method body with a fetch() call —
 * the external API (list, load, save, create, delete, duplicate) stays identical.
 */
const ProjectStore = {

  // ---- Private helpers (localStorage-specific, disappear on backend migration) ----

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

  /** Returns the full project data blob, or null if not found */
  load(id) {
    try {
      const raw = localStorage.getItem('nbl_project_' + id);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  /**
   * Saves full project data blob AND updates the index entry.
   * @param {string} id - Project ID
   * @param {object} fullData - The complete getAllData() blob
   * @param {object} meta - Dashboard-visible fields: { title, artist, dates, status, budgetTotal }
   * @returns {object} The updated index entry
   */
  save(id, fullData, meta) {
    localStorage.setItem('nbl_project_' + id, JSON.stringify(fullData));

    const index = this._getIndex();
    const now = new Date().toISOString();
    const existingIdx = index.findIndex(p => p.id === id);
    const entry = {
      id,
      title:       meta.title       || 'UNTITLED',
      artist:      meta.artist      || '',
      dates:       meta.dates       || 'TBD',
      status:      meta.status      || 'Draft',
      budgetTotal: meta.budgetTotal || 0,
      lastModified: now,
      createdAt:   existingIdx >= 0 ? index[existingIdx].createdAt : now,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }
    this._setIndex(index);
    return entry;
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
   * @param {string} id - Project ID to delete
   */
  delete(id) {
    localStorage.removeItem('nbl_project_' + id);
    const index = this._getIndex().filter(p => p.id !== id);
    this._setIndex(index);
  },

  /**
   * Duplicates an existing project with a new ID.
   * @param {string} id - Source project ID
   * @returns {string|null} The new project ID, or null if source not found
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
    return newId;
  },
};
