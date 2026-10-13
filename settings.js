const OurBinSettings = (() => {
    const STORAGE_KEY = 'ourbin.settings';
    const DEFAULTS = {
        alertOnCopy: true,
        confirmOnVoid: true,
        themeColor: '#1A1A1A'
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

    applyTheme(load().themeColor);

    return { load, save, applyTheme, DEFAULTS };
})();
