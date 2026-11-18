/**
 * YouTube Channel Link Extractor - Client App
 * Port: 3030
 */

// App State
const state = {
  items: [],
  channelInfo: null,
  contentType: 'videos',
  sortOrder: 'newest',
  shortsFormat: 'shorts',
  activeFormat: 'link-only',
  isStreaming: false,
  eventSource: null,
  startTime: null,
  timerInterval: null
};

// DOM Elements
const el = {
  form: document.getElementById('extractForm'),
  channelInput: document.getElementById('channelInput'),
  btnClearInput: document.getElementById('btnClearInput'),
  btnPasteInput: document.getElementById('btnPasteInput'),
  typeGroup: document.getElementById('typeGroup'),
  sortGroup: document.getElementById('sortGroup'),
  limitSelect: document.getElementById('limitSelect'),
  shortsFormatWrap: document.getElementById('shortsFormatWrap'),
  shortsFormatSelect: document.getElementById('shortsFormatSelect'),
  btnSubmit: document.getElementById('btnSubmit'),
  btnStop: document.getElementById('btnStop'),
  systemStatus: document.getElementById('systemStatus'),
  
  // Results
  resultsSection: document.getElementById('resultsSection'),
  channelTitle: document.getElementById('channelTitle'),
  channelAvatar: document.getElementById('channelAvatar'),
  channelTypeTag: document.getElementById('channelTypeTag'),
  elapsedTag: document.getElementById('elapsedTag'),
  channelUrlLink: document.getElementById('channelUrlLink'),
  totalCount: document.getElementById('totalCount'),
  progressWrap: document.getElementById('progressWrap'),
  progressBar: document.getElementById('progressBar'),
  
  // Excel & Export
  formatButtons: document.getElementById('formatButtons'),
  btnCopyExcel: document.getElementById('btnCopyExcel'),
  btnDownloadTxt: document.getElementById('btnDownloadTxt'),
  btnDownloadCsv: document.getElementById('btnDownloadCsv'),
  btnToggleSort: document.getElementById('btnToggleSort'),
  btnSelectAll: document.getElementById('btnSelectAll'),
  
  // Block & Table
  excelBlock: document.getElementById('excelBlock'),
  blockInfo: document.getElementById('blockInfo'),
  btnCopyMini: document.getElementById('btnCopyMini'),
  tableTabCount: document.getElementById('tableTabCount'),
  videoTableBody: document.getElementById('videoTableBody'),
  tableFilterInput: document.getElementById('tableFilterInput'),
  toast: document.getElementById('toast')
};

// Init Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initUIEventListeners();
});

function initUIEventListeners() {
  // Input Clear & Paste
  el.channelInput.addEventListener('input', () => {
    el.btnClearInput.style.display = el.channelInput.value.trim() ? 'block' : 'none';
  });

  el.btnClearInput.addEventListener('click', () => {
    el.channelInput.value = '';
    el.btnClearInput.style.display = 'none';
    el.channelInput.focus();
  });

  el.btnPasteInput.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        el.channelInput.value = text.trim();
        el.btnClearInput.style.display = 'block';
        showToast('Đã dán từ clipboard!');
      }
    } catch (e) {
      el.channelInput.focus();
      document.execCommand('paste');
    }
  });

  // Type Selector (Videos / Shorts)
  el.typeGroup.querySelectorAll('.radio-label').forEach(label => {
    label.addEventListener('click', () => {
      el.typeGroup.querySelectorAll('.radio-label').forEach(l => l.classList.remove('active'));
      label.classList.add('active');
      const radio = label.querySelector('input[type="radio"]');
      radio.checked = true;
      state.contentType = radio.value;
      el.shortsFormatWrap.style.display = state.contentType === 'shorts' ? 'block' : 'none';
    });
  });

  // Sort Selector (Newest / Oldest)
  el.sortGroup.querySelectorAll('.radio-label').forEach(label => {
    label.addEventListener('click', () => {
      el.sortGroup.querySelectorAll('.radio-label').forEach(l => l.classList.remove('active'));
      label.classList.add('active');
      const radio = label.querySelector('input[type="radio"]');
      radio.checked = true;
      const prevSort = state.sortOrder;
      state.sortOrder = radio.value;
      if (state.items.length > 0 && prevSort !== state.sortOrder) {
        updateOutput();
      }
    });
  });

  // Format Buttons for Excel
  el.formatButtons.querySelectorAll('.btn-format').forEach(btn => {
    btn.addEventListener('click', () => {
      el.formatButtons.querySelectorAll('.btn-format').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFormat = btn.dataset.format;
      updateExcelBlock();
    });
  });

  // Tab View Switching
  document.querySelectorAll('.tab-triggers .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-triggers .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Action Buttons
  el.btnStop.addEventListener('click', stopExtraction);
  el.btnCopyExcel.addEventListener('click', copyExcelBlock);
  el.btnCopyMini.addEventListener('click', copyExcelBlock);
  el.btnDownloadTxt.addEventListener('click', downloadAsTxt);
  el.btnDownloadCsv.addEventListener('click', downloadAsCsv);
  el.btnSelectAll.addEventListener('click', selectAllBlock);
  el.btnToggleSort.addEventListener('click', toggleSortOrder);

  // Table Filter
  el.tableFilterInput.addEventListener('input', () => {
    renderTable();
  });
}

// Start Stream Extraction
function startExtraction() {
  const channelUrl = el.channelInput.value.trim();
  if (!channelUrl) {
    showToast('Vui lòng nhập link hoặc tên kênh YouTube!', 'error');
    el.channelInput.focus();
    return;
  }

  // Reset State
  stopExtraction();
  state.items = [];
  state.channelInfo = null;
  state.isStreaming = true;
  state.startTime = Date.now();

  // Reset UI
  el.resultsSection.style.display = 'block';
  el.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.totalCount.textContent = '0';
  el.tableTabCount.textContent = '0';
  el.channelTitle.textContent = 'Đang tải thông tin kênh...';
  el.channelAvatar.textContent = '...';
  el.channelTypeTag.textContent = state.contentType === 'shorts' ? 'Shorts' : 'Videos';
  el.elapsedTag.textContent = '0.0s';
  el.channelUrlLink.style.display = 'none';
  el.progressWrap.style.display = 'block';
  el.excelBlock.value = 'Đang kết nối tới YouTube InnerTube và lấy danh sách...';
  el.blockInfo.textContent = 'Đang tải dữ liệu...';
  el.videoTableBody.innerHTML = '';
  
  el.btnSubmit.style.display = 'none';
  el.btnStop.style.display = 'inline-flex';
  el.systemStatus.textContent = 'Đang lấy...';
  el.systemStatus.style.borderColor = 'rgba(255, 0, 51, 0.4)';
  el.systemStatus.style.color = '#ff4d4d';

  // Timer
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    if (state.startTime) {
      const sec = ((Date.now() - state.startTime) / 1000).toFixed(1);
      el.elapsedTag.textContent = `${sec}s`;
    }
  }, 200);

  // Params
  const limit = el.limitSelect.value;
  const shortsFormat = el.shortsFormatSelect.value;
  const url = `/api/stream?channel=${encodeURIComponent(channelUrl)}&type=${encodeURIComponent(state.contentType)}&shorts_format=${encodeURIComponent(shortsFormat)}&max=${encodeURIComponent(limit)}`;

  state.eventSource = new EventSource(url);

  state.eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleStreamMessage(data);
    } catch (e) {
      console.error('Error parsing SSE event:', e);
    }
  };

  state.eventSource.onerror = (err) => {
    console.error('SSE Error:', err);
    finishExtraction(false, 'Kết thúc luồng hoặc mất kết nối.');
  };
}

// Handle Each SSE Event
function handleStreamMessage(data) {
  const ev = data.event;

  if (ev === 'channel_info') {
    state.channelInfo = data;
    el.channelTitle.textContent = data.channel_title || 'YouTube Channel';
    el.channelUrlLink.href = data.target_url;
    el.channelUrlLink.style.display = 'inline';
    const initials = (data.channel_title || 'YT').substring(0, 2).toUpperCase();
    el.channelAvatar.textContent = initials;
  } 
  else if (ev === 'item') {
    state.items.push(data.item);
    el.totalCount.textContent = state.items.length;
    el.tableTabCount.textContent = state.items.length;

    // Throttle block updates for high performance
    if (state.items.length <= 20 || state.items.length % 10 === 0) {
      updateExcelBlock();
    }
  } 
  else if (ev === 'done') {
    finishExtraction(true);
  } 
  else if (ev === 'error') {
    finishExtraction(false, data.message || 'Lỗi không xác định từ máy chủ');
  }
}

// Finish / Stop Extraction
function finishExtraction(success = true, message = '') {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.isStreaming = false;

  el.btnSubmit.style.display = 'inline-flex';
  el.btnStop.style.display = 'none';
  el.progressWrap.style.display = 'none';

  if (success) {
    el.systemStatus.textContent = 'Hoàn tất';
    el.systemStatus.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    el.systemStatus.style.color = '#10b981';
    showToast(`Đã lấy xong toàn bộ ${state.items.length} link video!`);
  } else {
    el.systemStatus.textContent = 'Dừng / Lỗi';
    el.systemStatus.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    el.systemStatus.style.color = '#ef4444';
    if (message) showToast(message, 'error');
  }

  updateOutput();
}

function stopExtraction() {
  if (state.isStreaming) {
    finishExtraction(false, 'Người dùng đã bấm Dừng Lại.');
  }
}

// Get Ordered Items based on sortOrder
function getSortedItems() {
  // YouTube natively returns items sorted by Public Date Descending (Newest first)
  if (state.sortOrder === 'oldest') {
    return [...state.items].reverse();
  }
  return [...state.items];
}

// Toggle Sort Order Button
function toggleSortOrder() {
  state.sortOrder = state.sortOrder === 'newest' ? 'oldest' : 'newest';
  
  // Update radio in form
  el.sortGroup.querySelectorAll('.radio-label').forEach(label => {
    const radio = label.querySelector('input[type="radio"]');
    if (radio.value === state.sortOrder) {
      label.classList.add('active');
      radio.checked = true;
    } else {
      label.classList.remove('active');
    }
  });

  showToast(`Đã đổi sắp xếp sang: ${state.sortOrder === 'newest' ? 'Mới nhất trước' : 'Cũ nhất trước'}`);
  updateOutput();
}

// Full Output Update
function updateOutput() {
  updateExcelBlock();
  renderTable();
}

// Update the Text Block formatted for Excel
function updateExcelBlock() {
  const sorted = getSortedItems();
  const format = state.activeFormat;

  if (sorted.length === 0) {
    el.excelBlock.value = state.isStreaming ? 'Đang tải dữ liệu...' : 'Không có video nào.';
    el.blockInfo.textContent = '0 dòng';
    return;
  }

  let textLines = [];

  switch (format) {
    case 'link-only':
      // Just URLs, 1 per line
      textLines = sorted.map(item => item.url);
      el.blockInfo.textContent = `${sorted.length} dòng links (Mỗi dòng 1 URL)`;
      break;

    case 'title-link':
      // Title [TAB] URL (Excel pastes into Column A: Title, Column B: URL)
      textLines = sorted.map(item => `${cleanForTsv(item.title)}\t${item.url}`);
      el.blockInfo.textContent = `${sorted.length} dòng (Cột A: Tiêu đề, Cột B: Link)`;
      break;

    case 'link-title':
      // URL [TAB] Title (Excel pastes into Column A: URL, Column B: Title)
      textLines = sorted.map(item => `${item.url}\t${cleanForTsv(item.title)}`);
      el.blockInfo.textContent = `${sorted.length} dòng (Cột A: Link, Cột B: Tiêu đề)`;
      break;

    case 'full-tsv':
      // Full details with header
      textLines.push("STT\tTiêu đề\tLink Video\tThời lượng\tLượt xem");
      sorted.forEach((item, idx) => {
        textLines.push(`${idx + 1}\t${cleanForTsv(item.title)}\t${item.url}\t${item.duration_formatted}\t${item.view_count_formatted}`);
      });
      el.blockInfo.textContent = `${sorted.length} video (Đầy đủ 5 cột có tiêu đề)`;
      break;

    default:
      textLines = sorted.map(item => item.url);
  }

  el.excelBlock.value = textLines.join('\n');
}

function cleanForTsv(text) {
  if (!text) return '';
  return text.replace(/[\t\r\n]+/g, ' ').trim();
}

// Render Detailed Table
function renderTable() {
  const sorted = getSortedItems();
  const filter = (el.tableFilterInput.value || '').toLowerCase().trim();

  const filtered = filter 
    ? sorted.filter(it => it.title.toLowerCase().includes(filter))
    : sorted;

  if (filtered.length === 0) {
    el.videoTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Không có video nào phù hợp.</td></tr>`;
    return;
  }

  const rowsHtml = filtered.map((item, idx) => {
    const thumb = item.thumbnail || 'https://via.placeholder.com/64x36?text=YT';
    return `
      <tr>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">${idx + 1}</td>
        <td>
          <img src="${escapeHtml(thumb)}" alt="thumb" class="table-thumb" loading="lazy" onerror="this.src='https://via.placeholder.com/64x36?text=No+Img'">
        </td>
        <td>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="table-video-title" title="${escapeHtml(item.title)}">
            ${escapeHtml(item.title)}
          </a>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-cyan);">${escapeHtml(item.duration_formatted)}</td>
        <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(item.view_count_formatted)}</td>
        <td>
          <button type="button" class="btn-row-copy" onclick="copySingleLink('${escapeHtml(item.url)}')">Copy Link</button>
        </td>
      </tr>
    `;
  }).join('');

  el.videoTableBody.innerHTML = rowsHtml;
}

// Copy Action for Excel
async function copyExcelBlock() {
  const content = el.excelBlock.value;
  if (!content || state.items.length === 0) {
    showToast('Chưa có dữ liệu để sao chép!', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    showToast(`Đã sao chép ${state.items.length} link vào Clipboard! Nhấn Ctrl+V để dán trực tiếp vào Excel.`);
  } catch (err) {
    // Fallback
    el.excelBlock.select();
    document.execCommand('copy');
    showToast(`Đã sao chép vào Clipboard!`);
  }
}

// Copy single link
function copySingleLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast(`Đã sao chép link video!`);
  });
}

// Select All Textarea
function selectAllBlock() {
  el.excelBlock.focus();
  el.excelBlock.select();
  showToast('Đã chọn toàn bộ văn bản trong khối!');
}

// Download as .TXT
function downloadAsTxt() {
  const sorted = getSortedItems();
  if (sorted.length === 0) {
    showToast('Chưa có dữ liệu để tải về!', 'error');
    return;
  }

  const content = el.excelBlock.value;
  const channelName = (state.channelInfo?.channel_title || 'youtube').replace(/[^a-zA-Z0-9_-]/g, '_');
  const type = state.contentType;
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${channelName}_${type}_links_${dateStr}.txt`;

  downloadBlob(content, filename, 'text/plain;charset=utf-8');
  showToast(`Đã tải về file: ${filename}`);
}

// Download as .CSV for Excel
function downloadAsCsv() {
  const sorted = getSortedItems();
  if (sorted.length === 0) {
    showToast('Chưa có dữ liệu để tải về!', 'error');
    return;
  }

  const csvRows = [];
  // UTF-8 BOM so Excel opens Vietnamese characters correctly
  const BOM = '\uFEFF';
  csvRows.push("STT,Tiêu đề,Link Video,Thời lượng,Lượt xem");

  sorted.forEach((item, idx) => {
    const titleEscaped = `"${(item.title || '').replace(/"/g, '""')}"`;
    const urlEscaped = `"${(item.url || '').replace(/"/g, '""')}"`;
    const durEscaped = `"${(item.duration_formatted || '').replace(/"/g, '""')}"`;
    const viewsEscaped = `"${(item.view_count_formatted || '').replace(/"/g, '""')}"`;
    csvRows.push(`${idx + 1},${titleEscaped},${urlEscaped},${durEscaped},${viewsEscaped}`);
  });

  const content = BOM + csvRows.join('\r\n');
  const channelName = (state.channelInfo?.channel_title || 'youtube').replace(/[^a-zA-Z0-9_-]/g, '_');
  const type = state.contentType;
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${channelName}_${type}_excel_${dateStr}.csv`;

  downloadBlob(content, filename, 'text/csv;charset=utf-8');
  showToast(`Đã tải về file CSV: ${filename}`);
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Toast Alert
let toastTimer = null;
function showToast(message, type = 'success') {
  el.toast.textContent = message;
  el.toast.style.borderColor = type === 'error' ? 'var(--yt-red)' : 'var(--accent-green)';
  el.toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.classList.remove('show');
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
