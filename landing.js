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

function setupMenuToggle() {
    const toggle = document.getElementById("menuToggle");
    const menu = document.getElementById("siteMenu");

    if (!toggle || !menu) {
        return;
    }

    const closeMenu = () => {
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        menu.classList.remove("is-open");
    };

    toggle.addEventListener("click", () => {
        const isOpen = toggle.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        menu.classList.toggle("is-open", isOpen);
    });

    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 780) {
            closeMenu();
        }
    });
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

document.addEventListener("DOMContentLoaded", () => {
    setupMenuToggle();
    fitAllWordmarks();
    setupRevealAnimations();
    setupParallax();

    if (document.fonts && typeof document.fonts.ready?.then === "function") {
        document.fonts.ready.then(fitAllWordmarks);
    }
});

window.addEventListener("resize", fitAllWordmarks);
