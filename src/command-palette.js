import { getAccounts } from './accounts.js';
import { openModal, renderAccountList } from './ui.js';
import { addLog } from './activity-log.js';
import { notify } from './notifications.js';

let isOpen = false;
let selectedIndex = -1;
let currentResults = [];

export function initCommandPalette() {
  const overlay = document.getElementById('cmd-palette-overlay');
  const input = document.getElementById('cmd-input');
  const resultsContainer = document.getElementById('cmd-results');
  if (!overlay || !input || !resultsContainer) return;

  // Global keydown to launch
  document.addEventListener('keydown', (e) => {
    // Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      togglePalette(true);
    }
    
    // Esc to close
    if (e.key === 'Escape' && isOpen) {
      togglePalette(false);
    }
  });

  // Handle input changes
  input.addEventListener('input', (e) => {
    handleSearch(e.target.value, resultsContainer);
  });

  // Handle keyboard navigation inside palette
  input.addEventListener('keydown', (e) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
      renderResults(resultsContainer);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderResults(resultsContainer);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeAction();
    }
  });

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) togglePalette(false);
  });
}

function togglePalette(show) {
  isOpen = show;
  const overlay = document.getElementById('cmd-palette-overlay');
  const input = document.getElementById('cmd-input');
  const resultsContainer = document.getElementById('cmd-results');

  if (show) {
    overlay.classList.remove('hidden');
    input.value = '';
    handleSearch('', resultsContainer);
    setTimeout(() => input.focus(), 100);
  } else {
    overlay.classList.add('hidden');
    input.blur();
  }
}

function handleSearch(query, container) {
  const q = query.trim().toLowerCase();
  selectedIndex = 0;
  
  if (q.startsWith('>')) {
    // Command Mode
    const cmdStr = q.substring(1).trim();
    currentResults = getCommands(cmdStr);
  } else {
    // Search Mode
    currentResults = getAccountResults(q);
  }

  renderResults(container);
}

function getCommands(query) {
  const allCommands = [
    { type: 'command', id: 'add', title: 'Add New Account', subtitle: '> add', icon: '➕' },
    { type: 'command', id: 'clear', title: 'Clear Notifications', subtitle: '> clear', icon: '🗑️' }
  ];

  if (!query) return allCommands;
  return allCommands.filter(c => c.id.includes(query) || c.title.toLowerCase().includes(query));
}

function getAccountResults(query) {
  const accounts = getAccounts();
  
  // Custom accounts mapped to result items
  let mapped = accounts.map(a => ({
    type: 'account',
    id: a.id,
    title: a.name,
    subtitle: `Provider: ${Array.isArray(a.provider) ? a.provider.join(', ') : (a.provider || 'none')} — Status: ${a.status}`,
    icon: a.status === 'available' ? '🟢' : '🔴',
    accountRef: a
  }));

  if (query) {
    mapped = mapped.filter(r => r.title.toLowerCase().includes(query));
  }
  
  // Limit to 8 results for cleaner UI
  return mapped.slice(0, 8);
}

function renderResults(container) {
  if (currentResults.length === 0) {
    container.innerHTML = '<div class="cmd-item empty"><div class="cmd-item-info"><span>No results found</span></div></div>';
    return;
  }

  container.innerHTML = currentResults.map((res, index) => {
    const isSelected = index === selectedIndex ? 'selected' : '';
    return `
      <div class="cmd-item ${isSelected}" data-index="${index}">
        <span class="cmd-item-icon">${res.icon}</span>
        <div class="cmd-item-info">
          <span class="cmd-item-title">${res.title}</span>
          <span class="cmd-item-subtitle">${res.subtitle}</span>
        </div>
      </div>
    `;
  }).join('');

  // Auto-scroll selected item into view
  const selectedEl = container.querySelector('.cmd-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }

  // Bind click events
  const items = container.querySelectorAll('.cmd-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      if (!isNaN(idx)) {
        selectedIndex = idx;
        executeAction();
      }
    });
    
    // Mouse hover updates selected index
    item.addEventListener('mouseenter', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      if (!isNaN(idx) && selectedIndex !== idx) {
        selectedIndex = idx;
        renderResults(container);
      }
    });
  });
}

function executeAction() {
  if (selectedIndex < 0 || selectedIndex >= currentResults.length) return;
  const item = currentResults[selectedIndex];
  
  togglePalette(false);

  if (item.type === 'command') {
    if (item.id === 'add') {
      openModal();
    } else if (item.id === 'clear') {
      const logList = document.getElementById('log-list');
      const logBadge = document.getElementById('log-badge');
      if (logList) logList.innerHTML = '';
      if (logBadge) {
        logBadge.textContent = '0';
        logBadge.classList.add('hidden');
      }
      addLog('SYSTEM', 'logs cleared via terminal');
      notify('System Logs', 'All logs and notifications cleared.', 'success');
    }
  } else if (item.type === 'account') {
    // Open modal directly on edit
    openModal(item.id);
  }
}
