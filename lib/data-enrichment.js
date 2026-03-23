/**
 * Data Enrichment Module
 * Shared functions for roster lookup, section merging, and format conversion
 * between advances and budgets.
 */
const DataEnrichment = (() => {

  // --- 0. Name Normalization ---
  function nameKey(n) { return (n || '').trim().toLowerCase().replace(/\s+/g, ' '); }

  // --- 1. Roster Lookup ---

  function enrichFromRoster(crewList, rosterData) {
    if (!rosterData || !crewList) return crewList || [];
    const rosterMap = new Map();
    rosterData.forEach(r => {
      const key = nameKey(r.name);
      if (key) rosterMap.set(key, r);
    });
    return crewList.map(c => {
      const key = nameKey(c.name);
      const match = rosterMap.get(key);
      if (!match) return c;
      return {
        ...c,
        phone: c.phone || match.phone || '',
        email: c.email || match.email || '',
        _rosterData: {
          dob: match.dob || '',
          skyMiles: match.sky_miles || match.skyMiles || '',
          ktn: match.ktn || '',
          hilton: match.hilton || '',
          marriott: match.marriott || '',
          shirtSize: match.shirt_size || match.shirtSize || '',
          payType: match.pay_type || match.payType || 'day',
          rate: match.rate || '',
        }
      };
    });
  }

  // --- 2. Section Mergers ---

  function mergeCrew(target, source) {
    if (!source) return target || [];
    const result = (target || []).map(c => ({ ...c }));
    // Index by _id (stable) and name (fallback) for dedup
    const existingById = new Map();
    const existingByName = new Set();
    result.forEach((c, i) => {
      if (c._id) existingById.set(c._id, i);
      existingByName.add(nameKey(c.name));
    });
    source.forEach(s => {
      const key = nameKey(s.name);
      if (!key) return;
      // Prefer _id match over name match to avoid cross-tour collisions
      let idx = -1;
      if (s._id && existingById.has(s._id)) {
        idx = existingById.get(s._id);
      } else if (existingByName.has(key)) {
        idx = result.findIndex(c => nameKey(c.name) === key);
      }
      if (idx >= 0) {
        // Fill blank fields on match
        Object.keys(s).forEach(k => {
          if (!result[idx][k] && s[k]) result[idx][k] = s[k];
        });
      } else {
        result.push({ ...s });
        if (s._id) existingById.set(s._id, result.length - 1);
        existingByName.add(key);
      }
    });
    return result;
  }

  function mergeHotel(target, source) {
    if (!source) return target || [];
    const result = (target || []).map(h => ({ ...h }));
    source.forEach(s => {
      const gKey = nameKey(s.guest);
      const dKey = (s.checkin || '').trim();
      if (!gKey && !s.hotel) return;
      const exists = result.some(h =>
        nameKey(h.guest) === gKey && (h.checkin || '').trim() === dKey
      );
      if (!exists) {
        result.push({ ...s });
      } else {
        const idx = result.findIndex(h =>
          nameKey(h.guest) === gKey && (h.checkin || '').trim() === dKey
        );
        if (idx >= 0) {
          Object.keys(s).forEach(k => {
            if (!result[idx][k] && s[k]) result[idx][k] = s[k];
          });
        }
      }
    });
    return result;
  }

  function mergeContacts(target, source) {
    if (!source) return target || [];
    const result = (target || []).map(c => ({ ...c }));
    const existing = new Set(result.map(c => nameKey(c.name)));
    source.forEach(s => {
      const key = nameKey(s.name);
      if (!key) return;
      if (existing.has(key)) {
        const idx = result.findIndex(c => nameKey(c.name) === key);
        if (idx >= 0) {
          Object.keys(s).forEach(k => {
            if (!result[idx][k] && s[k]) result[idx][k] = s[k];
          });
        }
      } else {
        result.push({ ...s });
        existing.add(key);
      }
    });
    return result;
  }

  function mergeLinks(target, source) {
    if (!source) return target || [];
    const result = (target || []).map(l => ({ ...l }));
    const existing = new Set(result.map(l => (l.url || '').trim().toLowerCase()));
    source.forEach(s => {
      const key = (s.url || '').trim().toLowerCase();
      if (!key) return;
      if (!existing.has(key)) {
        result.push({ ...s });
        existing.add(key);
      }
    });
    return result;
  }

  function mergeNotes(targetText, sourceText, marker) {
    if (!sourceText || !sourceText.trim()) return targetText || '';
    const t = targetText || '';
    if (t.includes(marker)) return t;
    return t + (t ? '\n\n' : '') + marker + '\n' + sourceText;
  }

  // --- 3. Format Converters ---

  // Advance crew: {role, name, phone, email, _rosterData}
  // Budget crew row: [position, name, phone, email, status]
  function advanceCrewToBudget(advanceCrew) {
    return (advanceCrew || []).filter(c => c.name).map(c => [
      c.role || '', c.name || '', c.phone || '', c.email || '', ''
    ]);
  }

  function budgetCrewToAdvance(budgetCrewRows) {
    return (budgetCrewRows || []).filter(r => r[1]).map(r => ({
      role: r[0] || '', name: r[1] || '', phone: r[2] || '', email: r[3] || ''
    }));
  }

  // Advance hotel: {guest, hotel, checkin, checkout, confirmation, notes}
  // Budget hotel row (NEW 11-field): [checkin, checkout, city, hotelName, guestName, dob, loyalty, notes, rooms, nights, rate]
  function advanceHotelToBudget(advanceHotel) {
    return (advanceHotel || []).filter(h => h.guest || h.hotel).map(h => {
      const ci = h.checkin || '';
      const co = h.checkout || '';
      let nights = 0;
      if (ci && co) {
        nights = Math.round((new Date(co + 'T12:00:00') - new Date(ci + 'T12:00:00')) / 86400000);
        if (nights < 0) nights = 0;
      }
      return [ci, co, '', h.hotel || '', h.guest || '', '', '', h.notes || '', '1', String(nights), '0'];
    });
  }

  function budgetHotelToAdvance(budgetHotelRows) {
    return (budgetHotelRows || []).filter(r => r[4] || r[3]).map(r => {
      // Detect old 10-field vs new 11-field format
      if (r.length <= 10) {
        // Old format: [checkin, checkout, city, guest, dob, loyalty, notes, rooms, nights, rate]
        return {
          guest: r[3] || '', hotel: '', checkin: r[0] || '', checkout: r[1] || '',
          confirmation: '', notes: r[6] || ''
        };
      }
      // New format: [checkin, checkout, city, hotelName, guest, dob, loyalty, notes, rooms, nights, rate]
      return {
        guest: r[4] || '', hotel: r[3] || '', checkin: r[0] || '', checkout: r[1] || '',
        confirmation: '', notes: r[7] || ''
      };
    });
  }

  // Advance contacts: {role, name, email, phone}
  // Budget contacts row: [role, name, phone, email]
  function advanceContactsToBudget(advanceContacts) {
    return (advanceContacts || []).filter(c => c.name).map(c => [
      c.role || '', c.name || '', c.phone || '', c.email || ''
    ]);
  }

  function budgetContactsToAdvance(budgetContactRows) {
    return (budgetContactRows || []).filter(r => r[1]).map(r => ({
      role: r[0] || '', name: r[1] || '', phone: r[2] || '', email: r[3] || ''
    }));
  }

  // Advance links: {label, url}
  // Budget links: {date, label, vendor, url}
  function advanceLinksToBudget(advanceLinks) {
    return (advanceLinks || []).filter(l => l.url).map(l => ({
      date: '', label: l.label || '', vendor: '', url: l.url || ''
    }));
  }

  function budgetLinksToAdvance(budgetLinks) {
    return (budgetLinks || []).filter(l => l.url).map(l => ({
      label: l.label || '', url: l.url || ''
    }));
  }

  // --- 4. Payroll/Per Diem helpers ---

  function addCrewToPayroll(crewList, payrollBlocks, tables, rosterData) {
    if (!crewList || !payrollBlocks || !payrollBlocks.length) return 0;
    const firstBlockId = payrollBlocks[0].id + '_body';

    // Collect all existing names across all payroll blocks
    const existingNames = new Set();
    payrollBlocks.forEach(b => {
      const rows = tables[b.id + '_body'] || [];
      rows.forEach(r => {
        if (r[1]) existingNames.add(nameKey(r[1]));
      });
    });

    if (!tables[firstBlockId]) tables[firstBlockId] = [];
    let added = 0;
    crewList.forEach(c => {
      const name = (c.name || '').trim();
      const key = nameKey(name);
      if (!key || existingNames.has(key)) return;
      const rate = c._rosterData?.rate || '';
      tables[firstBlockId].push([c.role || '', name, '', rate]);
      existingNames.add(key);
      added++;
    });
    return added;
  }

  function addCrewToPerDiems(crewList, pdBody, defaultRate) {
    if (!crewList) return 0;
    const existing = new Set((pdBody || []).map(r => nameKey(r[1])));
    let added = 0;
    crewList.forEach(c => {
      const name = (c.name || '').trim();
      const key = nameKey(name);
      if (!key || existing.has(key)) return;
      pdBody.push([c.role || '', name, '', defaultRate || '']);
      existing.add(key);
      added++;
    });
    return added;
  }

  return {
    enrichFromRoster,
    mergeCrew, mergeHotel, mergeContacts, mergeLinks, mergeNotes,
    advanceCrewToBudget, budgetCrewToAdvance,
    advanceHotelToBudget, budgetHotelToAdvance,
    advanceContactsToBudget, budgetContactsToAdvance,
    advanceLinksToBudget, budgetLinksToAdvance,
    addCrewToPayroll, addCrewToPerDiems,
  };
})();
