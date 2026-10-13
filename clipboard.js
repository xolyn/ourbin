// 剪贴板工具：HTTPS 环境用 navigator.clipboard，否则回退到 execCommand('copy')
// 读取剪贴板在非 HTTPS 环境下无法回退，会 reject，由调用方提示用户手动粘贴
const OurBinClipboard = (() => {
    function legacyCopy(text) {
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, text.length);
            let ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (err) {
                // ignore
            }
            ta.remove();
            if (ok) resolve();
            else reject(new Error('Copy failed'));
        });
    }

    function copy(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
        }
        return legacyCopy(text);
    }

    function read() {
        if (navigator.clipboard && window.isSecureContext && navigator.clipboard.readText) {
            return navigator.clipboard.readText();
        }
        return Promise.reject(new Error('Clipboard read unavailable'));
    }

    return { copy, read };
})();
