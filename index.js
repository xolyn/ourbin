const API_BASE = '/api';

// 全局粘贴监听（原生 paste 事件，非 HTTPS 环境也可用）
document.addEventListener('paste', function(e) {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );
    if (isInputFocused) return;

    const text = e.clipboardData && e.clipboardData.getData('text/plain');
    if (text) {
        e.preventDefault();
        const textarea = document.querySelector('textarea#new');
        if (textarea) {
            textarea.value = text;
            textarea.focus();
        }
    }
});

// 获取版本号
async function loadVersion() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();
        document.getElementById('version').textContent = data.version;
    } catch (err) {
        console.error('Failed to load version:', err);
    }
}

// 转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 截断长URL用于下拉展示：前后各保留10个字符
function shortUrl(url) {
    return url.length <= 23 ? url : url.slice(0, 10) + '...' + url.slice(-10);
}

// 设置面板
function openSettings() {
    const s = OurBinSettings.load();
    document.getElementById('cfg_alert_on_copy').checked = s.alertOnCopy;
    document.getElementById('cfg_confirm_on_void').checked = s.confirmOnVoid;
    document.getElementById('cfg_auto_pin').checked = s.autoPinNeverExpire;
    document.getElementById('cfg_theme_color').value = s.themeColor;
    document.getElementById('cfg_custom_css').value = s.customCss || '';
    document.getElementById('settings_dialog').showModal();
}

function saveSettings() {
    OurBinSettings.save({
        alertOnCopy: document.getElementById('cfg_alert_on_copy').checked,
        confirmOnVoid: document.getElementById('cfg_confirm_on_void').checked,
        autoPinNeverExpire: document.getElementById('cfg_auto_pin').checked,
        themeColor: document.getElementById('cfg_theme_color').value,
        customCss: document.getElementById('cfg_custom_css').value
    });
}

// 多链接下拉菜单
function toggleGoMenu(caret) {
    const menu = caret.parentElement.querySelector('.go-menu');
    const willOpen = !menu.classList.contains('open');
    document.querySelectorAll('.go-menu.open').forEach(m => m.classList.remove('open'));
    menu.classList.toggle('open', willOpen);
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.go-group')) {
        document.querySelectorAll('.go-menu.open').forEach(m => m.classList.remove('open'));
    }
});

// 格式化时间剩余
function formatTimeLeft(expirationTime) {
    const now = Math.floor(Date.now() / 1000);
    const left = expirationTime - now;
    const hours = left / 3600;
    const days = left / (24 * 3600);
    // 如果大于1年（365天），显示 "--"
    if (days > 365) return '--';
    if (hours < 1) return '<1h';
    if (hours > 24) return '>24h';
    return `${Math.floor(hours)}h`;
}

// 刷新列表
let currentRefreshId = 0;
async function refresh() {
    const refreshId = ++currentRefreshId;
    try {
        const sortBy = document.getElementById('sort_by').value;
        const sortOrder = document.getElementById('sort_order').value;
        const res = await fetch(`${API_BASE}/bins?sort_by=${sortBy}&order=${sortOrder}`);
        
        // Check if a new refresh has started while we were fetching
        if (refreshId !== currentRefreshId) return;
        
        const bins = await res.json();
        
        // Double check after parsing JSON (unlikely to change, but safe)
        if (refreshId !== currentRefreshId) return;

        document.getElementById('total_bins_count').textContent = bins.length;
        const binsContainer = document.getElementById('bins');
        binsContainer.innerHTML = '';
        
        // 直接使用后端返回的 bins 数据
        bins.forEach(bin => {
            const binDiv = document.createElement('div');
            binDiv.className = 'bin';
            binDiv.dataset.id = bin.uuid;
            
            const timeLeft = formatTimeLeft(bin.expiration_time);
            
            // 后端已从完整内容中提取所有链接
            const urls = bin.urls || [];
            
            // 构建按钮组HTML
            let buttonsHtml = `<button data-icon="copy_all" onclick="copyBinContent('${bin.uuid}')">Copy all</button>`;
            if (urls.length === 1) {
                buttonsHtml += `<button data-icon="open_in_new" onclick="window.open(this.dataset.url, '_blank')" data-url="${escapeHtml(urls[0])}">Go</button>`;
            } else if (urls.length > 1) {
                const menuItems = urls.map(u =>
                    `<button data-url="${escapeHtml(u)}" onclick="window.open(this.dataset.url, '_blank'); this.closest('.go-menu').classList.remove('open')">${escapeHtml(shortUrl(u))}</button>`
                ).join('');
                buttonsHtml += `
                    <span class="go-group">
                        <button data-icon="open_in_new" onclick="window.open(this.dataset.url, '_blank')" data-url="${escapeHtml(urls[0])}">Go</button>
                        <button class="go-caret" data-icon="arrow_drop_down" title="Choose link" onclick="toggleGoMenu(this)"></button>
                        <div class="go-menu">${menuItems}</div>
                    </span>`;
            }
            buttonsHtml += `<button style="margin-left:auto" data-icon="keep" class="${bin.pinned ? 'pinned' : ''}" onclick="togglePin('${bin.uuid}', ${bin.pinned})">${bin.pinned ? 'Unpin' : 'Pin'}</button>`;
            buttonsHtml += `<button data-icon="delete" class="red" onclick="deleteBin('${bin.uuid}')">Void</button>`;
            
            // 处理内容显示
            let contentHtml = escapeHtml(bin.content);
            let previewClass = 'binPreview';
            if (bin.truncated) {
                previewClass += ' truncated'; // 添加 CSS 类用于显示省略号
            }

            const displayName = bin.alias ? escapeHtml(bin.alias) : bin.uuid;
            const titleAttr = bin.alias ? ` title="${escapeHtml(bin.uuid)}"` : '';

            binDiv.innerHTML = `
                <div style="display: flex;">
                    <input type="checkbox" onchange="toggleSelect('${bin.uuid}')">
                    <a class="binId" href="./bin.html?id=${bin.uuid}"${titleAttr}>${displayName}</a>
                    <span class="icon" style="font-size: small; margin-left: auto;" data-icon="search_activity">${timeLeft}</span>
                </div>
                <div class="${previewClass}" style="padding: .5rem 0">${contentHtml}</div>
                <div class="button_group" style="padding: display:flex; gap:.5rem">
                    ${buttonsHtml}
                </div>
            `;
            binsContainer.appendChild(binDiv);
        });
        
        // 刷新后重置选中数量为0
        updateButtonStates();
    } catch (err) {
        console.error('Refresh failed:', err);
    }
}

// 选择/取消选择
function toggleSelect(uuid) {
    const bin = document.querySelector(`.bin[data-id="${uuid}"]`);
    const checkbox = bin.querySelector('input[type="checkbox"]');
    if (checkbox.checked) {
        bin.classList.add('selected');
    } else {
        bin.classList.remove('selected');
    }
    updateButtonStates();
}

// 更新按钮状态和选中数量
function updateButtonStates() {
    const selected = document.querySelectorAll('.bin.selected');
    const renewBtn = document.getElementById('renew');
    const deleteBtn = document.getElementById('delete');
    const selectBtn = document.getElementById('select');
    const selectedNum = document.getElementById('selected_bins_num');
    const binsContainer = document.getElementById('bins');
    
    // 检查#bins是否为空
    const isEmpty = binsContainer.children.length === 0;
    
    // 更新Select all按钮状态
    if (isEmpty) {
        selectBtn.classList.add('disabled');
    } else {
        selectBtn.classList.remove('disabled');
    }
    
    // 更新选中数量
    selectedNum.textContent = selected.length;
    
    // 根据是否有选中来控制显示/隐藏
    if (selected.length > 0) {
        selectedNum.toggleAttribute('hidden', false);
        renewBtn.classList.remove('disabled');
        deleteBtn.classList.remove('disabled');
    } else {
        selectedNum.toggleAttribute('hidden', true);
        renewBtn.classList.add('disabled');
        deleteBtn.classList.add('disabled');
    }
}

// 全选/取消全选
document.getElementById('select').onclick = function() {
    // 如果按钮被禁用，直接返回
    if (this.classList.contains('disabled')) {
        return;
    }
    
    const isSelectAll = this.textContent.includes('Select all');
    const checkboxes = document.querySelectorAll('.bin input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = isSelectAll;
        const bin = cb.closest('.bin');
        if (isSelectAll) {
            bin.classList.add('selected');
        } else {
            bin.classList.remove('selected');
        }
    });
    this.textContent = isSelectAll ? 'Deselect' : 'Select all';
    updateButtonStates();
};

// 置顶/取消置顶
async function togglePin(uuid, currentState) {
    try {
        const res = await fetch(`${API_BASE}/bins/${uuid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned: !currentState })
        });
        if (res.ok) {
            refresh();
        } else {
            alert('Pin toggle failed');
        }
    } catch (err) {
        console.error('Pin toggle failed:', err);
        alert('Pin toggle failed: ' + err.message);
    }
}

// 删除bin
async function deleteBin(uuid) {
    if (OurBinSettings.load().confirmOnVoid && !confirm('Delete this bin?')) return;
    try {
        const res = await fetch(`${API_BASE}/bins/${uuid}`, { method: 'DELETE' });
        if (res.ok) {
            refresh();
        } else {
            alert('Delete failed');
        }
    } catch (err) {
        console.error('Delete failed:', err);
        alert('Delete failed: ' + err.message);
    }
}

// 批量删除
document.getElementById('delete').onclick = async function() {
    const selected = document.querySelectorAll('.bin.selected');
    if (selected.length === 0) return;
    if (OurBinSettings.load().confirmOnVoid && !confirm(`Delete ${selected.length} bin(s)?`)) return;
    
    const uuids = Array.from(selected).map(bin => bin.dataset.id);
    try {
        const res = await fetch(`${API_BASE}/bins/${uuids.join(',')}`, { method: 'DELETE' });
        if (res.ok) {
            refresh();
        } else {
            alert('Delete failed');
        }
    } catch (err) {
        console.error('Delete failed:', err);
        alert('Delete failed: ' + err.message);
    }
};

// 复制bin内容
async function copyBinContent(uuid) {
    try {
        const res = await fetch(`${API_BASE}/bins/${uuid}`);
        const bin = await res.json();
        await OurBinClipboard.copy(bin.content);
        if (OurBinSettings.load().alertOnCopy) alert('Copied to clipboard');
    } catch (err) {
        console.error('Copy failed:', err);
        alert('Copy failed: ' + err.message);
    }
}

// 提交新bin
document.querySelector('button[data-icon="order_approve"]').onclick = async function() {
    const textarea = document.querySelector('textarea#new');
    const content = textarea.value.trim();
    if (!content) {
        alert('Please enter content');
        return;
    }
    
    const expiration = document.getElementById('expiration').value;
    // 选项值都是分钟，需要转换为小时
    const expirationHours = expiration === '-1' ? 999999 : parseInt(expiration) / 60;
    const alias = document.getElementById('new_alias').value.trim();
    const neverExpires = expiration === '-1';
    const autoPin = neverExpires && OurBinSettings.load().autoPinNeverExpire;
    const pinned = document.getElementById('new_pin').checked || autoPin;
    
    try {
        const res = await fetch(`${API_BASE}/bins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, expiration_hours: expirationHours, alias: alias || null, pinned })
        });
        if (res.ok) {
            textarea.value = '';
            document.getElementById('new_alias').value = '';
            document.getElementById('new_pin').checked = false;
            refresh();
        } else {
            alert('Create failed');
        }
    } catch (err) {
        console.error('Create failed:', err);
        alert('Create failed: ' + err.message);
    }
};

// 续期功能（+1h）
document.getElementById('renew').onclick = async function() {
    const selected = document.querySelectorAll('.bin.selected');
    if (selected.length === 0) return;
    
    const uuids = Array.from(selected).map(bin => bin.dataset.id);
    try {
        const res = await fetch(`${API_BASE}/bins/renew`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uuids })
        });
        if (res.ok) {
            const data = await res.json();
            alert(`Renewed ${data.updated_count} bin(s)`);
            refresh();
        } else {
            const error = await res.json();
            alert('Renew failed: ' + (error.detail || 'Unknown error'));
        }
    } catch (err) {
        console.error('Renew failed:', err);
        alert('Renew failed: ' + err.message);
    }
};

// 清理已过期的bin
async function clearBins() {
    if (!confirm('Delete all expired bins from the database?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/bins/cleanup`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            alert(`Cleanup done, ${data.deleted_count} expired bin(s) deleted`);
            refresh();
        } else {
            alert('Cleanup failed');
        }
    } catch (err) {
        console.error('Cleanup failed:', err);
        alert('Cleanup failed: ' + err.message);
    }
}

// 重置数据库
async function resetDB() {
    // 生成6位确认ID
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789';
    let confirmId = '';
    for (let i = 0; i < 6; i++) {
        confirmId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const userInput = prompt(`WARNING: This will delete ALL data!\nEnter the 6-character confirmation ID: ${confirmId}`);
    
    if (userInput === null) {
        return; // 用户取消
    }
    
    if (userInput !== confirmId) {
        alert('Confirmation ID mismatch, operation cancelled');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/bins/reset`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            alert(`Database reset, ${data.deleted_count} record(s) deleted`);
            refresh();
        } else {
            alert('Reset failed');
        }
    } catch (err) {
        console.error('Reset failed:', err);
        alert('Reset failed: ' + err.message);
    }
}

// 排序选择变化时刷新
document.getElementById('sort_by').addEventListener('change', refresh);
document.getElementById('sort_order').addEventListener('change', refresh);

// init page to refresh
let initTimer = null;
function initPage() {
    if (initTimer) {
        clearTimeout(initTimer);
    }
    initTimer = setTimeout(function() {
        loadVersion();
        refresh();
        initTimer = null;
    }, 100);
}
// 仅在 DOMContentLoaded 或非 persisted 的 pageshow 时初始化一次
// 通常情况下 DOMContentLoaded 足够了，但为了兼容性保留两者并依赖防抖
window.addEventListener('pageshow', (event) => {
    // 如果是 BFCache 恢复，则刷新；否则如果是首次加载，DOMContentLoaded 也会触发
    // 如果两个都触发，上面的 debounce (100ms) 会处理
    if (event.persisted) {
        initPage();
    }
});
window.addEventListener('DOMContentLoaded', initPage);