// Tourism Cold Calling Command Center Application Logic

(function() {
  'use strict';

  // Storage Keys
  const STORAGE_KEY_LEADS = 'tourism_crm_leads_data_v1';
  const STORAGE_KEY_GOAL = 'tourism_crm_daily_goal_v1';

  // State
  let leads = [];
  let currentOpportunityFilter = 'all';
  let currentStatusFilter = 'all';
  let searchQuery = '';
  let currentSort = 'priority';
  let currentView = 'cards'; // 'cards' | 'table'

  let dailyGoal = {
    target: 30,
    date: new Date().toISOString().split('T')[0]
  };

  // Pre-crafted WhatsApp pitch templates
  function getWhatsAppMessage(lead) {
    const company = lead.name || 'شركتكم الموقرة';
    if (!lead.website) {
      return `السلام عليكم ورحمة الله وبركاته، أهلاً بحضرتك يا فندم. بكلم حضرتك بخصوص شركة (${company}). بنقدم حلول وتصميم مواقع إلكترونية متخصصة لشركات السياحة في مصر لحجز الرحلات وعرض البرامج مباشرة على جوجل. حابين نشارك مع حضرتك نماذج من أعمالنا السابقة وعروضنا الخاصة. هل يناسب حضرتك نرسل التفاصيل هنا على الواتساب؟`;
    } else if (lead.website.startsWith('http://')) {
      return `السلام عليكم ورحمة الله وبركاته، أهلاً بحضرتك يا فندم بخصوص موقع شركة (${company}). لاحظنا إن الموقع غير مؤمن بشهادة SSL (يظهر تحذير Not Secure للزوار في جوجل كروم) وغير متجاوب مع الموبايلات الحديثة. بنقدم خدمة ترقية وتأمين وتطوير المواقع السياحية لجذب السياح وزيادة الحجوزات. يسعدنا نرسل لحضرتك تقرير فحص مجاني للموقع هنا على الواتساب.`;
    } else {
      return `السلام عليكم ورحمة الله وبركاته، أهلاً بحضرتك يا فندم بخصوص شركة (${company}). بنقدم خدمات تطوير وتوسيع مواقع شركات السياحة (ربط أنظمة الحجز والدفع الإلكتروني، تحسين السيو في جوجل وزيادة المبيعات المباشرة). يشرفنا نبعت لحضرتك سابقة أعمالنا في قطاع السياحة والسفر.`;
    }
  }

  // Initialize Data
  function initData() {
    // Check if initial dataset is loaded
    if (typeof INITIAL_LEADS === 'undefined' || !Array.isArray(INITIAL_LEADS)) {
      console.error('INITIAL_LEADS not found in data.js');
      return;
    }

    const savedData = localStorage.getItem(STORAGE_KEY_LEADS);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Merge with initial leads to keep fresh schema
        const savedMap = new Map(parsed.map(item => [item.id, item]));
        leads = INITIAL_LEADS.map(baseLead => {
          const saved = savedMap.get(baseLead.id);
          if (saved) {
            return {
              ...baseLead,
              status: saved.status || baseLead.status || 'New',
              notes: saved.notes || '',
              callCount: typeof saved.callCount === 'number' ? saved.callCount : (baseLead.callCount || 0),
              lastContactDate: saved.lastContactDate || null
            };
          }
          return { ...baseLead };
        });
      } catch (e) {
        console.error('Error loading saved leads', e);
        leads = INITIAL_LEADS.map(l => ({ ...l }));
      }
    } else {
      leads = INITIAL_LEADS.map(l => ({ ...l }));
    }

    // Daily Goal
    const savedGoal = localStorage.getItem(STORAGE_KEY_GOAL);
    if (savedGoal) {
      try {
        const parsedGoal = JSON.parse(savedGoal);
        const today = new Date().toISOString().split('T')[0];
        if (parsedGoal.date === today) {
          dailyGoal = parsedGoal;
        } else {
          dailyGoal = { target: parsedGoal.target || 30, date: today };
          saveGoal();
        }
      } catch (e) {
        // use default
      }
    }
  }

  function saveLeads() {
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
    } catch (e) {
      console.error('Could not save leads to localStorage', e);
    }
  }

  function saveGoal() {
    try {
      localStorage.setItem(STORAGE_KEY_GOAL, JSON.stringify(dailyGoal));
    } catch (e) {
      console.error('Could not save goal to localStorage', e);
    }
  }

  // Toast System
  function showToast(message, type = 'default') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'gold' ? 'toast-gold' : type === 'success' ? 'toast-success' : ''}`;
    toast.innerHTML = `<span>🔔</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Update KPI Dashboard
  function updateKPIs() {
    const total = leads.length;
    const readyPhone = leads.filter(l => !!l.phone).length;
    const noWebsite = leads.filter(l => !l.website).length;
    const outdatedHttp = leads.filter(l => l.website && l.website.startsWith('http://')).length;
    const modern = leads.filter(l => l.website && !l.website.startsWith('http://')).length;
    const missingPhone = leads.filter(l => !l.phone).length;

    const interested = leads.filter(l => l.status === 'Interested').length;
    const totalCalls = leads.reduce((sum, l) => sum + (l.callCount || 0), 0);

    // Elements
    document.getElementById('kpiTotal').textContent = total;
    document.getElementById('kpiReadyPhone').textContent = readyPhone;
    document.getElementById('kpiNoWebsite').textContent = noWebsite;
    document.getElementById('kpiOutdatedHttp').textContent = outdatedHttp;
    document.getElementById('kpiInterested').textContent = interested;
    document.getElementById('kpiCallsMade').textContent = totalCalls;

    // Filter Pill Counts
    document.getElementById('countAll').textContent = total;
    document.getElementById('countNoWeb').textContent = noWebsite;
    document.getElementById('countHttp').textContent = outdatedHttp;
    document.getElementById('countModern').textContent = modern;
    document.getElementById('countPhone').textContent = readyPhone;
    document.getElementById('countNoPhone').textContent = missingPhone;

    // Daily Goal
    const target = dailyGoal.target || 30;
    // Count leads contacted today or total calls
    const completedCalls = totalCalls;
    document.getElementById('dailyCallsCount').textContent = completedCalls;
    document.getElementById('dailyCallsTarget').textContent = target;

    const percent = Math.min(100, Math.round((completedCalls / target) * 100));
    document.getElementById('goalProgressFill').style.width = `${percent}%`;
    document.getElementById('goalPercentText').textContent = `${percent}%`;
  }

  // Filter and Sort leads
  function getFilteredLeads() {
    return leads.filter(lead => {
      // Opportunity Filter
      if (currentOpportunityFilter === 'no-website' && lead.website) return false;
      if (currentOpportunityFilter === 'http' && (!lead.website || !lead.website.startsWith('http://'))) return false;
      if (currentOpportunityFilter === 'modern' && (!lead.website || lead.website.startsWith('http://'))) return false;
      if (currentOpportunityFilter === 'has-phone' && !lead.phone) return false;
      if (currentOpportunityFilter === 'missing-phone' && lead.phone) return false;

      // Status Filter
      if (currentStatusFilter !== 'all' && lead.status !== currentStatusFilter) return false;

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = lead.name.toLowerCase().includes(q);
        const matchPhone = (lead.phone || '').toLowerCase().includes(q);
        const matchCategory = (lead.category || '').toLowerCase().includes(q);
        const matchLocation = (lead.location || '').toLowerCase().includes(q);
        const matchNotes = (lead.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCategory && !matchLocation && !matchNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (currentSort === 'priority') {
        // Priority: No website first, then outdated http, then has website
        const getPri = (item) => {
          if (!item.website) return 1;
          if (item.website.startsWith('http://')) return 2;
          return 3;
        };
        const priDiff = getPri(a) - getPri(b);
        if (priDiff !== 0) return priDiff;
        return a.id - b.id;
      } else if (currentSort === 'id-asc') {
        return a.id - b.id;
      } else if (currentSort === 'calls-asc') {
        return (a.callCount || 0) - (b.callCount || 0);
      } else if (currentSort === 'calls-desc') {
        return (b.callCount || 0) - (a.callCount || 0);
      } else if (currentSort === 'name-asc') {
        return a.name.localeCompare(b.name, 'ar');
      }
      return 0;
    });
  }

  // Render View (Cards or Table)
  function render() {
    const filtered = getFilteredLeads();
    document.getElementById('visibleCount').textContent = filtered.length;

    // Filter indicator tag
    let filterText = `Showing: ${currentOpportunityFilter.toUpperCase()} • Status: ${currentStatusFilter}`;
    if (searchQuery) filterText += ` • Query: "${searchQuery}"`;
    document.getElementById('filterTagActive').textContent = filterText;

    if (currentView === 'cards') {
      document.getElementById('cardsContainer').style.display = 'grid';
      document.getElementById('tableContainer').style.display = 'none';
      renderCards(filtered);
    } else {
      document.getElementById('cardsContainer').style.display = 'none';
      document.getElementById('tableContainer').style.display = 'block';
      renderTable(filtered);
    }

    updateKPIs();
  }

  // Render Cards
  function renderCards(list) {
    const container = document.getElementById('cardsContainer');
    if (list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(17, 24, 39, 0.5); border-radius: 16px; border: 1px dashed rgba(255, 255, 255, 0.1);">
          <div style="font-size: 36px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 18px; color: #fff; margin-bottom: 6px;">No leads matched your search or filters</h3>
          <p style="color: #94a3b8; font-size: 13px;">Try clearing search keywords or selecting "All Leads" filter pills above.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(lead => {
      // Opportunity styling
      let oppClass = 'opp-modern';
      let oppTitle = '🌐 Has Modern Website';
      let oppAngle = 'Pitch: SEO ranking, booking engine, responsive revamp & speed optimization.';
      if (!lead.website) {
        oppClass = 'opp-no-website';
        oppTitle = '🔴 HIGH CONVERSION: No Website';
        oppAngle = 'Golden Lead! Has zero official site. Google Maps searchers book with competitors who have websites.';
      } else if (lead.website.startsWith('http://')) {
        oppClass = 'opp-http';
        oppTitle = '🟡 OUTDATED: Insecure HTTP Protocol';
        oppAngle = 'Pitch: Chrome shows "Not Secure" warning to tourists! Needs modern SSL & mobile booking overhaul.';
      }

      // Status card class
      let statusCardClass = '';
      if (lead.status === 'Interested') statusCardClass = 'status-interested';
      else if (lead.status === 'Follow Up') statusCardClass = 'status-callback';
      else if (lead.status === 'Closed Won') statusCardClass = 'status-won';

      // WhatsApp URL
      const waMsg = encodeURIComponent(getWhatsAppMessage(lead));
      const waUrl = lead.waPhone ? `https://wa.me/${lead.waPhone}?text=${waMsg}` : '#';

      // Maps Search
      const mapsQuery = encodeURIComponent(`${lead.name} ${lead.location}`);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

      const calledText = (lead.callCount && lead.callCount > 0) ? `Called ${lead.callCount}x` : 'Untouched';
      const calledClass = (lead.callCount && lead.callCount > 0) ? 'called' : '';

      return `
        <article class="lead-card ${statusCardClass}" data-lead-id="${lead.id}">
          <!-- Card Header -->
          <div class="card-top">
            <div style="flex: 1;">
              <div class="lead-meta-top">
                <span class="lead-id-badge">#${lead.id}</span>
                <span class="lead-category-badge">${escapeHtml(lead.category)}</span>
              </div>
              <h2 class="lead-title" title="Click to view details">${escapeHtml(lead.name)}</h2>
            </div>
            <div class="call-counter-badge ${calledClass}" title="Total call attempts made">
              📞 ${calledText}
            </div>
          </div>

          <!-- Location Info -->
          <div class="lead-location">
            <span>📍</span>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" title="View on Google Maps">
              ${escapeHtml(lead.location || 'Egypt')}
            </a>
          </div>

          <!-- Opportunity Banner -->
          <div class="opportunity-box ${oppClass}">
            <div class="opp-title">${oppTitle}</div>
            <div class="opp-angle">${oppAngle}</div>
          </div>

          <!-- Website Status Link -->
          <div class="website-link-box">
            <span style="color: var(--text-dim); font-size: 11px;">Website:</span>
            ${lead.website ? `
              <a href="${lead.website}" target="_blank" rel="noopener noreferrer" title="Visit website">
                🌐 ${escapeHtml(lead.website)}
              </a>
            ` : `
              <span style="color: #f59e0b; font-weight: 700; font-size: 11px;">⚠️ None Found on Maps</span>
            `}
          </div>

          <!-- Primary Actions (Call & WhatsApp) -->
          <div class="action-buttons-row">
            ${lead.phone ? `
              <a href="tel:${lead.cleanPhone}" class="btn btn-dial dial-action-btn" data-lead-id="${lead.id}" title="Click to dial on phone or VoIP">
                📞 Call: ${lead.phone}
              </a>
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp wa-action-btn" data-lead-id="${lead.id}" title="Open WhatsApp with pre-filled sales pitch">
                💬 WhatsApp
              </a>
              <button class="btn btn-copy copy-phone-btn" data-phone="${lead.phone}" title="Copy phone number">
                📋
              </button>
            ` : `
              <div style="grid-column: 1 / -1; padding: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; color: #fca5a5; font-size: 12px; text-align: center;">
                ⚠️ No Phone Listed in Maps (Needs Research or In-Person Visit)
              </div>
            `}
          </div>

          <!-- Outcome Buttons -->
          <div class="outcome-section">
            <span class="outcome-label">Call Outcome / Status:</span>
            <div class="outcome-buttons">
              <button class="btn-outcome ${lead.status === 'New' ? 'active-new' : ''}" data-lead-id="${lead.id}" data-status="New">
                🆕 New
              </button>
              <button class="btn-outcome ${lead.status === 'Interested' ? 'active-interested' : ''}" data-lead-id="${lead.id}" data-status="Interested">
                🔥 Interested
              </button>
              <button class="btn-outcome ${lead.status === 'Follow Up' ? 'active-callback' : ''}" data-lead-id="${lead.id}" data-status="Follow Up">
                📅 Callback
              </button>
              <button class="btn-outcome ${lead.status === 'No Answer' ? 'active-noanswer' : ''}" data-lead-id="${lead.id}" data-status="No Answer">
                📵 No Answer
              </button>
              <button class="btn-outcome ${lead.status === 'Not Interested' ? 'active-notinterested' : ''}" data-lead-id="${lead.id}" data-status="Not Interested">
                ❌ Not Interested
              </button>
              <button class="btn-outcome ${lead.status === 'Closed Won' ? 'active-won' : ''}" data-lead-id="${lead.id}" data-status="Closed Won">
                🎉 Won
              </button>
            </div>
          </div>

          <!-- Notes & Metadata Footer -->
          <div class="card-footer">
            <textarea class="lead-note-input" data-lead-id="${lead.id}" placeholder="Add caller notes (Decision maker, meeting date, price discussed)..." rows="1">${escapeHtml(lead.notes || '')}</textarea>
            <div class="footer-meta-row">
              <span>Last contact: ${lead.lastContactDate ? escapeHtml(lead.lastContactDate) : 'Not contacted yet'}</span>
              <span>Calls made: <strong>${lead.callCount || 0}</strong></span>
            </div>
          </div>

        </article>
      `;
    }).join('');

    bindCardEvents();
  }

  // Render Table
  function renderTable(list) {
    const tbody = document.getElementById('tableBody');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">No matching leads found</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(lead => {
      const waMsg = encodeURIComponent(getWhatsAppMessage(lead));
      const waUrl = lead.waPhone ? `https://wa.me/${lead.waPhone}?text=${waMsg}` : '#';

      let oppBadge = `<span style="color:#60a5fa;">🌐 Modern</span>`;
      if (!lead.website) oppBadge = `<span style="color:#f59e0b; font-weight:700;">🔴 No Website</span>`;
      else if (lead.website.startsWith('http://')) oppBadge = `<span style="color:#fbbf24; font-weight:700;">🟡 HTTP</span>`;

      return `
        <tr data-lead-id="${lead.id}">
          <td style="font-weight: 700; color: var(--text-dim);">#${lead.id}</td>
          <td style="font-weight: 700;">${escapeHtml(lead.name)}</td>
          <td><span class="lead-category-badge">${escapeHtml(lead.category)}</span></td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(lead.location)}">${escapeHtml(lead.location)}</td>
          <td style="white-space: nowrap;">${lead.phone ? `<strong>${lead.phone}</strong>` : '<span style="color:#f43f5e;">Missing</span>'}</td>
          <td>${oppBadge}</td>
          <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${lead.website ? `<a href="${lead.website}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8;">${escapeHtml(lead.website)}</a>` : '<span style="color:var(--text-dim);">-</span>'}
          </td>
          <td>
            <select class="table-status-select sort-select" data-lead-id="${lead.id}" style="padding: 4px 8px; font-size: 11px;">
              <option value="New" ${lead.status === 'New' ? 'selected' : ''}>🆕 New</option>
              <option value="Interested" ${lead.status === 'Interested' ? 'selected' : ''}>🔥 Interested</option>
              <option value="Follow Up" ${lead.status === 'Follow Up' ? 'selected' : ''}>📅 Callback</option>
              <option value="No Answer" ${lead.status === 'No Answer' ? 'selected' : ''}>📵 No Answer</option>
              <option value="Not Interested" ${lead.status === 'Not Interested' ? 'selected' : ''}>❌ Not Interested</option>
              <option value="Closed Won" ${lead.status === 'Closed Won' ? 'selected' : ''}>🎉 Deal Won</option>
            </select>
          </td>
          <td style="white-space: nowrap;">
            ${lead.phone ? `
              <a href="tel:${lead.cleanPhone}" class="btn btn-dial btn-mini dial-action-btn" data-lead-id="${lead.id}" title="Call">📞 Call</a>
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-mini wa-action-btn" data-lead-id="${lead.id}" title="WhatsApp">💬 WA</a>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    // Bind table events
    document.querySelectorAll('.table-status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.leadId, 10);
        updateLeadStatus(id, e.target.value);
      });
    });

    document.querySelectorAll('.dial-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.dataset.leadId, 10);
        registerCallAttempt(id);
      });
    });
  }

  // Update Lead Status
  function updateLeadStatus(id, newStatus) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    lead.status = newStatus;
    lead.lastContactDate = formatDateTime(new Date());

    saveLeads();
    render();

    if (newStatus === 'Interested') {
      showToast(`🔥 Marked "${lead.name}" as INTERESTED!`, 'gold');
    } else if (newStatus === 'Closed Won') {
      showToast(`🎉 DEAL WON! Congratulations on closing "${lead.name}"!`, 'success');
    } else {
      showToast(`Updated status to ${newStatus}`);
    }
  }

  // Register Call Attempt
  function registerCallAttempt(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    lead.callCount = (lead.callCount || 0) + 1;
    lead.lastContactDate = formatDateTime(new Date());
    if (lead.status === 'New') {
      lead.status = 'No Answer'; // default after dialing until specified
    }

    saveLeads();
    render();
    showToast(`Logged call attempt #${lead.callCount} for "${lead.name}"`);
  }

  // Bind Events on Cards
  function bindCardEvents() {
    // Dial Button
    document.querySelectorAll('.dial-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.dataset.leadId, 10);
        registerCallAttempt(id);
      });
    });

    // Copy Phone
    document.querySelectorAll('.copy-phone-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const phone = btn.dataset.phone;
        navigator.clipboard.writeText(phone).then(() => {
          showToast(`Copied phone: ${phone}`, 'success');
        }).catch(() => {
          showToast(`Phone: ${phone}`);
        });
      });
    });

    // Outcome Buttons
    document.querySelectorAll('.btn-outcome').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.dataset.leadId, 10);
        const status = btn.dataset.status;
        updateLeadStatus(id, status);
      });
    });

    // Note input auto-save
    document.querySelectorAll('.lead-note-input').forEach(textarea => {
      textarea.addEventListener('change', (e) => {
        const id = parseInt(textarea.dataset.leadId, 10);
        const lead = leads.find(l => l.id === id);
        if (lead) {
          lead.notes = textarea.value.trim();
          lead.lastContactDate = formatDateTime(new Date());
          saveLeads();
          showToast(`Saved note for ${lead.name}`);
        }
      });
    });
  }

  // Helper Date Formatter
  function formatDateTime(d) {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Setup Global Listeners
  function setupListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClearBtn');

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      searchClear.style.display = searchQuery ? 'block' : 'none';
      render();
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchClear.style.display = 'none';
      render();
    });

    // Sort
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      currentSort = e.target.value;
      render();
    });

    // View toggle
    const viewCardsBtn = document.getElementById('viewCardsBtn');
    const viewTableBtn = document.getElementById('viewTableBtn');

    viewCardsBtn.addEventListener('click', () => {
      currentView = 'cards';
      viewCardsBtn.classList.add('active');
      viewTableBtn.classList.remove('active');
      render();
    });

    viewTableBtn.addEventListener('click', () => {
      currentView = 'table';
      viewTableBtn.classList.add('active');
      viewCardsBtn.classList.remove('active');
      render();
    });

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const type = pill.dataset.filterType;
        const val = pill.dataset.val;

        if (type === 'opportunity') {
          currentOpportunityFilter = val;
          document.querySelectorAll('.filter-pill[data-filter-type="opportunity"]').forEach(p => p.classList.remove('active', 'active-gold'));
          pill.classList.add(val === 'no-website' ? 'active-gold' : 'active');
        } else if (type === 'status') {
          currentStatusFilter = val;
          document.querySelectorAll('.filter-pill[data-filter-type="status"]').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }

        render();
      });
    });

    // Sales Script Drawer Open/Close
    const scriptDrawer = document.getElementById('scriptDrawerBackdrop');
    const openScriptBtn = document.getElementById('openScriptBtn');
    const closeScriptBtn = document.getElementById('closeScriptBtn');

    openScriptBtn.addEventListener('click', () => {
      scriptDrawer.classList.add('open');
    });

    closeScriptBtn.addEventListener('click', () => {
      scriptDrawer.classList.remove('open');
    });

    scriptDrawer.addEventListener('click', (e) => {
      if (e.target === scriptDrawer) {
        scriptDrawer.classList.remove('open');
      }
    });

    // Drawer Tabs
    document.querySelectorAll('.drawer-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;
        document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');

        tab.classList.add('active');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.style.display = 'block';
      });
    });

    // Copy script button
    document.querySelectorAll('.copy-text-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const text = targetEl.innerText || targetEl.textContent;
          navigator.clipboard.writeText(text).then(() => {
            showToast('Sales pitch copied to clipboard!', 'success');
          });
        }
      });
    });

    // Goal Target Increase
    document.getElementById('increaseGoalBtn').addEventListener('click', () => {
      const current = dailyGoal.target || 30;
      const next = current >= 60 ? 20 : current + 10;
      dailyGoal.target = next;
      saveGoal();
      updateKPIs();
      showToast(`Daily goal updated to ${next} calls`);
    });

    // Export to Excel (.xlsx)
    document.getElementById('exportExcelBtn').addEventListener('click', exportExcel);

    // Export to CSV
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

    // Reset Data
    document.getElementById('resetDataBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all call logs and statuses back to original?')) {
        localStorage.removeItem(STORAGE_KEY_LEADS);
        initData();
        render();
        showToast('All progress reset to clean baseline.');
      }
    });
  }

  // Export to Excel using SheetJS
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      showToast('SheetJS library still loading, downloading CSV instead...');
      exportCsv();
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      const formatForExport = (item) => ({
        'Lead ID': item.id,
        'Company Name': item.name,
        'Category': item.category,
        'Location': item.location,
        'Phone': item.phone,
        'Dial Link': item.cleanPhone ? `tel:${item.cleanPhone}` : '',
        'WhatsApp Link': item.waPhone ? `https://wa.me/${item.waPhone}` : '',
        'Website': item.website || 'NONE (Golden Lead)',
        'Opportunity Angle': item.opportunity,
        'Call Status': item.status,
        'Call Attempts': item.callCount || 0,
        'Caller Notes': item.notes || '',
        'Last Contact Date': item.lastContactDate || ''
      });

      // Sheet 1: Current Filtered View
      const currentViewData = getFilteredLeads().map(formatForExport);
      const wsFiltered = XLSX.utils.json_to_sheet(currentViewData);
      XLSX.utils.book_append_sheet(wb, wsFiltered, 'Current View Leads');

      // Sheet 2: All Leads with Updates
      const allData = leads.map(formatForExport);
      const wsAll = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, wsAll, 'All 120 Leads Progress');

      // Sheet 3: Interested Leads
      const interestedData = leads.filter(l => l.status === 'Interested').map(formatForExport);
      if (interestedData.length > 0) {
        const wsInterested = XLSX.utils.json_to_sheet(interestedData);
        XLSX.utils.book_append_sheet(wb, wsInterested, '🔥 Interested Leads');
      }

      // Sheet 4: No Website Opportunities
      const noWebData = leads.filter(l => !l.website).map(formatForExport);
      const wsNoWeb = XLSX.utils.json_to_sheet(noWebData);
      XLSX.utils.book_append_sheet(wb, wsNoWeb, '🎯 No Website Leads (68)');

      const filename = `Tourism_Companies_Cold_Calling_Progress_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast('Excel workbook exported successfully!', 'success');
    } catch (e) {
      console.error('Export error', e);
      exportCsv();
    }
  }

  // Export to CSV fallback
  function exportCsv() {
    const list = getFilteredLeads();
    const headers = ['ID', 'Company Name', 'Category', 'Location', 'Phone', 'Website', 'Opportunity', 'Status', 'Call Attempts', 'Notes', 'Last Contact'];

    const rows = list.map(l => [
      l.id,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.website || '').replace(/"/g, '""')}"`,
      `"${(l.opportunity || '').replace(/"/g, '""')}"`,
      `"${(l.status || '').replace(/"/g, '""')}"`,
      l.callCount || 0,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      `"${(l.lastContactDate || '').replace(/"/g, '""')}"`
    ]);

    // Include UTF-8 BOM so Arabic displays properly in Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tourism_Cold_Calling_Leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully with Arabic support!', 'success');
  }

  // Init App on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initData();
    setupListeners();
    render();
  });

})();
