const API_BASE = 'http://localhost:8000/api';
const binId = new URLSearchParams(window.location.search).get('id');
let originalContent = '';
let binData = null;

document.getElementById('binId').textContent = binId;
document.title=`Bin #${binId}`;

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
                window.open(`http://localhost:8000/raw/${binId}`, '_blank');
            }
        }

    } catch (err) {
        console.error('Loading failed：', err);
        alert('Loading failed：' + err.message);
    }
}

// 复制URL
document.querySelector('a[title="Copy bin URL"]').onclick = async function() {
    const url = window.location.href;
    try {
        await navigator.clipboard.writeText(url);
        alert('URL copied to clipboard');
    } catch (err) {
        console.error('Copy failed：', err);
        alert('Copy failed');
    }
};

// 复制所有内容
document.querySelector('button[data-icon="copy_all"]').onclick = async function() {
    const textarea = document.querySelector('textarea#new');
    try {
        await navigator.clipboard.writeText(textarea.value);
        alert('Content copied to clipboard');
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
    if (!confirm('Confirm deleting this bin?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/bins/${binId}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Delete successful');
            window.location.href = 'index.html#workspace';
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