/**
 * NBL-Ops Dynamic Nav Component
 * Builds the nav bar and detects the active page automatically.
 */
function renderNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const path = window.location.pathname;
  const pages = [
    { href: '/',              label: 'HOME',     match: p => p === '/' || p.endsWith('/index.html') || p.endsWith('/index') },
    { href: 'intake.html',   label: 'INTAKE',   match: p => p.includes('intake.html') },
    { href: 'projects.html',  label: 'BUDGET',  match: p => p.includes('projects.html') || p.includes('budget.html') },
    { href: 'advances.html',  label: 'ADVANCES', match: p => p.includes('advances.html') || p.includes('advance.html') },
    { href: 'reviews.html',   label: 'REVIEWS', match: p => p.includes('reviews.html') },
  ];

  const links = pages.map(pg => {
    const active = pg.match(path) ? ' class="active"' : '';
    // On intake.html page, the INTAKE link uses onclick to switch form tabs
    if (pg.label === 'INTAKE' && pg.match(path)) {
      return `<a href="intake.html"${active} onclick="event.preventDefault(); if(typeof showForm==='function') showForm('intake');">INTAKE</a>`;
    }
    return `<a href="${pg.href}"${active}>${pg.label}</a>`;
  }).join('');

  nav.innerHTML =
    '<a href="/" class="nav-logo">NBL</a>' +
    '<div class="nav-links">' + links + '</div>' +
    '<div id="save-indicator" class="save-indicator"></div>';
}

document.addEventListener('DOMContentLoaded', renderNav);
