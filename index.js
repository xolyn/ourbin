const API_BASE = 'http://localhost:8000/api';

const importFromClipboard = async function (selector='textarea#new') {
try {
    const text = await navigator.clipboard.readText();
    document.querySelector(selector).value = text;
} catch (err) {
    console.error('读取剪贴板失败：', err);
    alert('无法读取剪贴板内容，请确保在 HTTPS 页面上，并允许访问剪贴板。');
}
};

// 全局Ctrl+V监听
document.addEventListener('keydown', async function(e) {
    // 检查是否是Ctrl+V（Mac上是Cmd+V）
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // 检查当前焦点是否在输入框或文本框中
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
        
        // 如果不在输入框中，粘贴到textarea#new
        if (!isInputFocused) {
            e.preventDefault();
            try {
                const text = await navigator.clipboard.readText();
                const textarea = document.querySelector('textarea#new');
                if (textarea) {
                    textarea.value = text;
                    textarea.focus();
                }
            } catch (err) {
                console.error('读取剪贴板失败：', err);
                // 不显示alert，避免干扰用户体验
            }
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
        console.error('获取版本号失败：', err);
    }
}

// 转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 检测内容是否为单个URL
function isSingleUrl(content) {
    const trimmed = content.trim();
    if (!trimmed) return null;
    
    // 检查是否只包含一个"词"（没有空格、换行等）
    if (trimmed.includes(' ') || trimmed.includes('\n') || trimmed.includes('\r')) {
        return null; // 包含空格或换行，不是单个URL
    }
    
    // URL正则：支持http://、https://或直接域名
    // 匹配：http://example.com, https://example.com, example.com, www.example.com/path
    const urlWithProtocol = /^https?:\/\/[\w\.-]+(\.[\w\.-]+)+([\/\w \.\-]*)*\/?$/i;
    const urlWithoutProtocol = /^[\w\.-]+(\.[\w\.-]+)+([\/\w \.\-]*)*\/?$/i;
    
    // 检查是否符合URL格式
    if (urlWithProtocol.test(trimmed)) {
        return trimmed; // 已有协议前缀
    } else if (urlWithoutProtocol.test(trimmed)) {
        return 'http://' + trimmed; 
    }
    
    return null; // 不符合URL格式
}

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
            
            // 如果 truncated=0，尝试检测是否为URL (后端已经处理了如果是URL则不截断且返回完整)
            // 但前端仍需 isSingleUrl 来决定是否显示 "Go" 按钮
            // 只有当 truncated=false 时，才可能是完整的URL
            const url = (!bin.truncated) ? isSingleUrl(bin.content) : null;
            
            // 构建按钮组HTML
            let buttonsHtml = `<button data-icon="copy_all" onclick="copyBinContent('${bin.uuid}')">Copy all</button>`;
            if (url) {
                buttonsHtml += `<button data-icon="open_in_new" onclick="window.open('${escapeHtml(url)}', '_blank')">Go</button>`;
            }
            buttonsHtml += `<button style="margin-left:auto" data-icon="delete" class="red" onclick="deleteBin('${bin.uuid}')">Void</button>`;
            
            // 处理内容显示
            let contentHtml = escapeHtml(bin.content);
            let previewClass = 'binPreview';
            if (bin.truncated) {
                previewClass += ' truncated'; // 添加 CSS 类用于显示省略号
            }

            binDiv.innerHTML = `
                <div style="display: flex;">
                    <input type="checkbox" onchange="toggleSelect('${bin.uuid}')">
                    <a class="binId" href="./bin.html?id=${bin.uuid}">${bin.uuid}</a>
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
        console.error('刷新失败：', err);
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

// 删除bin
async function deleteBin(uuid) {
    if (!confirm('确定要删除这个bin吗？')) return;
    try {
        const res = await fetch(`${API_BASE}/bins/${uuid}`, { method: 'DELETE' });
        if (res.ok) {
            refresh();
        } else {
            alert('删除失败');
        }
    } catch (err) {
        console.error('删除失败：', err);
        alert('删除失败：' + err.message);
    }
}

// 批量删除
document.getElementById('delete').onclick = async function() {
    const selected = document.querySelectorAll('.bin.selected');
    if (selected.length === 0) return;
    if (!confirm(`确定要删除 ${selected.length} 个bin吗？`)) return;
    
    const uuids = Array.from(selected).map(bin => bin.dataset.id);
    try {
        const res = await fetch(`${API_BASE}/bins/${uuids.join(',')}`, { method: 'DELETE' });
        if (res.ok) {
            refresh();
        } else {
            alert('删除失败');
        }
    } catch (err) {
        console.error('删除失败：', err);
        alert('删除失败：' + err.message);
    }
};

// 复制bin内容
async function copyBinContent(uuid) {
    try {
        const res = await fetch(`${API_BASE}/bins/${uuid}`);
        const bin = await res.json();
        await navigator.clipboard.writeText(bin.content);
        alert('已复制到剪贴板');
    } catch (err) {
        console.error('复制失败：', err);
        alert('复制失败：' + err.message);
    }
}

// 提交新bin
document.querySelector('button[data-icon="order_approve"]').onclick = async function() {
    const textarea = document.querySelector('textarea#new');
    const content = textarea.value.trim();
    if (!content) {
        alert('请输入内容');
        return;
    }
    
    const expiration = document.getElementById('expiration').value;
    // 选项值都是分钟，需要转换为小时
    const expirationHours = expiration === '-1' ? 999999 : parseInt(expiration) / 60;
    
    try {
        const res = await fetch(`${API_BASE}/bins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, expiration_hours: expirationHours })
        });
        if (res.ok) {
            textarea.value = '';
            refresh();
        } else {
            alert('创建失败');
        }
    } catch (err) {
        console.error('创建失败：', err);
        alert('创建失败：' + err.message);
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
            alert(`成功续期 ${data.updated_count} 个bin`);
            refresh();
        } else {
            const error = await res.json();
            alert('续期失败：' + (error.detail || '未知错误'));
        }
    } catch (err) {
        console.error('续期失败：', err);
        alert('续期失败：' + err.message);
    }
};

// 清理已过期的bin
async function clearBins() {
    if (!confirm('确定要清理所有已过期的bin吗？此操作不影响前端显示，但会删除数据库中的记录。')) return;
    
    try {
        const res = await fetch(`${API_BASE}/bins/cleanup`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            alert(`清理完成，删除了 ${data.deleted_count} 个已过期的bin`);
            refresh();
        } else {
            alert('清理失败');
        }
    } catch (err) {
        console.error('清理失败：', err);
        alert('清理失败：' + err.message);
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
    
    const userInput = prompt(`警告：此操作将删除所有数据！\n请输入6位确认ID: ${confirmId}`);
    
    if (userInput === null) {
        return; // 用户取消
    }
    
    if (userInput !== confirmId) {
        alert('确认ID不匹配，操作已取消');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/bins/reset`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            alert(`数据库已重置，删除了 ${data.deleted_count} 条记录`);
            refresh();
        } else {
            alert('重置失败');
        }
    } catch (err) {
        console.error('重置失败：', err);
        alert('重置失败：' + err.message);
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