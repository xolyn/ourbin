const API_BASE = '/api';
const binId = new URLSearchParams(window.location.search).get('id');
let originalContent = '';
let binData = null;

document.getElementById('binId').textContent = binId;
document.title=`Bin #${binId}`;

// 渲染标题：有别名显示 <alias> (<uuid>)，否则显示 #<uuid>
function renderTitle() {
    const el = document.getElementById('binTitle');
    el.textContent = '';
    if (binData && binData.alias) {
        el.append(document.createTextNode(binData.alias + ' '));
        const ghost = document.createElement('span');
        ghost.className = 'uuid-ghost';
        ghost.textContent = `(${binId})`;
        el.append(ghost);
    } else {
        const mono = document.createElement('span');
        mono.style.fontFamily = 'monospace';
        mono.textContent = '#' + binId;
        el.append(mono);
    }
    document.title = (binData && binData.alias) ? `${binData.alias} (#${binId})` : `Bin #${binId}`;
}

// 别名编辑
function editAlias() {
    const titleEl = document.getElementById('binTitle');
    const input = document.getElementById('aliasInput');
    input.value = (binData && binData.alias) || '';
    titleEl.hidden = true;
    input.hidden = false;
    input.focus();
    input.select();
}

function closeAliasEdit() {
    document.getElementById('aliasInput').hidden = true;
    document.getElementById('binTitle').hidden = false;
}

async function saveAlias() {
    const input = document.getElementById('aliasInput');
    try {
        const res = await fetch(`${API_BASE}/bins/${binId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias: input.value.trim() })
        });
        if (res.ok) {
            binData = await res.json();
            closeAliasEdit();
            renderTitle();
        } else {
            alert('Alias save failed');
        }
    } catch (err) {
        console.error('Alias save failed：', err);
        alert('Alias save failed：' + err.message);
    }
}

document.getElementById('aliasInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        saveAlias();
    } else if (e.key === 'Escape') {
        closeAliasEdit();
    }
});
document.getElementById('aliasInput').addEventListener('blur', closeAliasEdit);

// 置顶/取消置顶
function updatePinButton() {
    const btn = document.getElementById('pin_btn');
    const pinned = binData ? binData.pinned : false;
    btn.textContent = pinned ? 'Unpin' : 'Pin';
    btn.classList.toggle('pinned', pinned);
}

document.getElementById('pin_btn').onclick = async function() {
    const pinned = binData ? binData.pinned : false;
    try {
        const res = await fetch(`${API_BASE}/bins/${binId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned: !pinned })
        });
        if (res.ok) {
            binData = await res.json();
            updatePinButton();
        } else {
            alert('Pin failed');
        }
    } catch (err) {
        console.error('Pin failed：', err);
        alert('Pin failed：' + err.message);
    }
};

// 格式化时间戳
function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/\//g, '-');
}

// 加载bin详情
async function loadBin() {
    if (!binId) {
        alert('Invalid bin ID');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/bins/${binId}`);
        if (!res.ok) {
            if (res.status === 404) {
                alert('Bin not found or expired');
                return;
            }
            throw new Error('Loading failed');
        }
        
        binData = await res.json();
        originalContent = binData.content;
        
        document.getElementById('creationTime').textContent = formatTimestamp(binData.creation_time);
        // 如果过期时间大于1年，显示 "--"
        const now = Math.floor(Date.now() / 1000);
        const daysLeft = (binData.expiration_time - now) / (24 * 3600);
        if (daysLeft > 365) {
            document.getElementById('expirationTime').textContent = 'Never';
        } else {
            document.getElementById('expirationTime').textContent = formatTimestamp(binData.expiration_time);
        }
        document.querySelector('textarea#new').value = binData.content;
        
        // Update Raw Link
        const rawLink = document.getElementById('viewRawBtn');
        if (rawLink) {
            rawLink.onclick = function() {
                window.open(`/raw/${binId}`, '_blank');
            }
        }

        renderTitle();
        updatePinButton();

    } catch (err) {
        console.error('Loading failed：', err);
        alert('Loading failed：' + err.message);
    }
}

// 复制URL
document.querySelector('a[title="Copy bin URL"]').onclick = async function() {
    const url = window.location.href;
    try {
        await OurBinClipboard.copy(url);
        if (OurBinSettings.load().alertOnCopy) alert('URL copied to clipboard');
    } catch (err) {
        console.error('Copy failed：', err);
        alert('Copy failed');
    }
};

// 复制所有内容
document.querySelector('button[data-icon="copy_all"]').onclick = async function() {
    const textarea = document.querySelector('textarea#new');
    try {
        await OurBinClipboard.copy(textarea.value);
        if (OurBinSettings.load().alertOnCopy) alert('Content copied to clipboard');
    } catch (err) {
        console.error('Copy failed：', err);
        alert('Copy failed');
    }
};

// 检测textarea变化
document.querySelector('textarea#new').addEventListener('input', function() {
    const saveBtn = document.querySelector('button[data-icon="save_as"]');
    if (this.value !== originalContent) {
        saveBtn.classList.remove('disabled');
    } else {
        saveBtn.classList.add('disabled');
    }
});

// 保存编辑
document.querySelector('button[data-icon="save_as"]').onclick = async function() {
    if (this.classList.contains('disabled')) return;
    
    const textarea = document.querySelector('textarea#new');
    const content = textarea.value;
    
    try {
        const res = await fetch(`${API_BASE}/bins/${binId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (res.ok) {
            originalContent = content;
            this.classList.add('disabled');
            alert('Save successful');
        } else {
            alert('Save failed');
        }
    } catch (err) {
            console.error('Save failed：', err);
        alert('Save failed：' + err.message);
    }
};

// 删除bin
document.querySelector('button[data-icon="delete"]').onclick = async function() {
    if (OurBinSettings.load().confirmOnVoid && !confirm('Confirm deleting this bin?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/bins/${binId}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Delete successful');
            window.location.href = 'index.html';
        } else {
            alert('Delete failed');
        }
    } catch (err) {
        console.error('Delete failed：', err);
        alert('Delete failed：' + err.message);
    }
};

// 页面加载时加载bin
window.onload = loadBin;