const OurBinSettings = (() => {
    const STORAGE_KEY = 'ourbin.settings';
    const DEFAULTS = {
        alertOnCopy: true,
        confirmOnVoid: true,
        autoPinNeverExpire: false,
        themeColor: '#1A1A1A',
        customCss: ''
    };

    function load() {
        try {
            return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
        } catch {
            return { ...DEFAULTS };
        }
    }

    function save(patch) {
        const next = { ...load(), ...patch };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        applyTheme(next.themeColor);
        applyCustomCss(next.customCss);
        return next;
    }

    function lighten(hex, ratio) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const mix = (c) => Math.round(c + (255 - c) * ratio);
        return '#' + [mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, '0')).join('');
    }

    function applyTheme(color) {
        const root = document.documentElement;
        if (!color || color.toLowerCase() === DEFAULTS.themeColor.toLowerCase()) {
            root.style.removeProperty('--primary-color');
            root.style.removeProperty('--primary-hover');
            return;
        }
        root.style.setProperty('--primary-color', color);
        root.style.setProperty('--primary-hover', lighten(color, 0.15));
    }

    // 自定义 CSS 通过 <style>.textContent 注入，不经过 HTML 解析，
    // 因此 "</style><script>" 之类的注入无法逃逸出样式上下文；CSS 本身在现代浏览器无法执行脚本
    function applyCustomCss(css) {
        let el = document.getElementById('ourbin-user-css');
        if (!el) {
            el = document.createElement('style');
            el.id = 'ourbin-user-css';
            document.head.appendChild(el);
        }
        el.textContent = css || '';
    }

    const initial = load();
    applyTheme(initial.themeColor);
    applyCustomCss(initial.customCss);

    return { load, save, applyTheme, applyCustomCss, DEFAULTS };
})();
