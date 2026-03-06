function fitWordmark(element) {
    if (!element || !element.parentElement) {
        return;
    }

    const parentWidth = element.parentElement.clientWidth;
    if (!parentWidth) {
        return;
    }

    element.style.fontSize = "100px";
    const measuredWidth = element.scrollWidth;
    if (!measuredWidth) {
        return;
    }

    const nextSize = Math.max(40, Math.min(900, Math.floor((parentWidth / measuredWidth) * 100 * 0.985)));
    element.style.fontSize = `${nextSize}px`;
}

function fitAllWordmarks() {
    document.querySelectorAll("[data-fit-text]").forEach(fitWordmark);
}

function setupRevealAnimations() {
    const revealItems = document.querySelectorAll(".reveal");
    if (!revealItems.length) {
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
    });

    revealItems.forEach((item) => observer.observe(item));
}

function setupParallax() {
    const layers = Array.from(document.querySelectorAll("[data-parallax]"));
    if (!layers.length) {
        return;
    }

    let ticking = false;

    const updateParallax = () => {
        const viewportMiddle = window.scrollY + window.innerHeight / 2;

        layers.forEach((layer) => {
            const speed = Number(layer.dataset.parallax) || 0;
            const rect = layer.getBoundingClientRect();
            const absoluteMiddle = rect.top + window.scrollY + rect.height / 2;
            const delta = (viewportMiddle - absoluteMiddle) * speed;
            layer.style.transform = `translate3d(0, ${delta.toFixed(2)}px, 0)`;
        });

        ticking = false;
    };

    const requestTick = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    };

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);
    requestTick();
}

function setupWorkspaceSearch() {
    const searchInput = document.getElementById("binSearch");
    const binsContainer = document.getElementById("bins");
    const emptyState = document.getElementById("filterEmptyState");

    if (!searchInput || !binsContainer || !emptyState) {
        return;
    }

    const applyFilter = () => {
        const query = searchInput.value.trim().toLowerCase();
        const bins = Array.from(binsContainer.querySelectorAll(".bin"));
        let visibleCount = 0;

        bins.forEach((bin) => {
            const text = bin.innerText.toLowerCase();
            const match = !query || text.includes(query);
            bin.hidden = !match;
            if (match) {
                visibleCount += 1;
            }
        });

        emptyState.hidden = !(query && bins.length > 0 && visibleCount === 0);
    };

    searchInput.addEventListener("input", applyFilter);

    const observer = new MutationObserver(applyFilter);
    observer.observe(binsContainer, { childList: true, subtree: true });
}

function setupRefreshButton() {
    const refreshButton = document.getElementById("refreshButton");
    if (!refreshButton) {
        return;
    }

    refreshButton.addEventListener("click", () => {
        if (typeof refresh === "function") {
            refresh();
        }

        refreshButton.classList.remove("is-spinning");
        window.requestAnimationFrame(() => {
            refreshButton.classList.add("is-spinning");
            window.setTimeout(() => refreshButton.classList.remove("is-spinning"), 850);
        });
    });
}

function setupAutoRefresh() {
    const autoRefreshLabel = document.getElementById("autoRefreshLabel");
    const refreshEveryMs = 30000;

    window.setInterval(() => {
        if (document.visibilityState === "visible" && typeof refresh === "function") {
            refresh();
            if (autoRefreshLabel) {
                autoRefreshLabel.textContent = "Auto refresh every 30s";
            }
        }
    }, refreshEveryMs);
}

function setupFooterYear() {
    const target = document.getElementById("footerYear");
    if (target) {
        target.textContent = String(new Date().getFullYear());
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fitAllWordmarks();
    setupRevealAnimations();
    setupParallax();
    setupWorkspaceSearch();
    setupRefreshButton();
    setupAutoRefresh();
    setupFooterYear();

    if (document.fonts && typeof document.fonts.ready?.then === "function") {
        document.fonts.ready.then(fitAllWordmarks);
    }
});

window.addEventListener("resize", fitAllWordmarks);
