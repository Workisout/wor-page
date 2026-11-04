document.addEventListener("DOMContentLoaded", startPixelTrail);

function startPixelTrail() {
    const canvas = document.getElementById("pixel-trail");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

    const settings = {
        columns: 90,
        color: "#FFFFFF",
        gap: 0,
        radius: 0.5,
        fadeSeconds: 0.45,
        maxPixelRatio: 1
    };

    let width = 0;
    let height = 0;
    let cellSize = 0;
    let rows = 0;

    let brightness = new Float32Array(0);
    let inList = new Uint8Array(0);
    let activeList = new Int32Array(0);
    let activeCount = 0;

    let lastPointer = null;
    let running = false;
    let lastTime = 0;
    let resizeQueued = false;

    const reach = Math.ceil(settings.radius);
    const kernel = [];
    for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
            const distance = Math.hypot(dx, dy);
            if (distance > settings.radius) continue;
            kernel.push({ dx, dy, strength: 1 - distance / (settings.radius + 0.5) });
        }
    }

    function setupGrid() {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio);

        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.fillStyle = settings.color;

        cellSize = width / settings.columns;
        rows = Math.ceil(height / cellSize);

        const total = settings.columns * rows;
        brightness = new Float32Array(total);
        inList = new Uint8Array(total);
        activeList = new Int32Array(total);
        activeCount = 0;
    }

    function lightUpAround(x, y) {
        const centerCol = Math.floor(x / cellSize);
        const centerRow = Math.floor(y / cellSize);

        for (let k = 0; k < kernel.length; k++) {
            const { dx, dy, strength } = kernel[k];
            const col = centerCol + dx;
            const row = centerRow + dy;

            if (col < 0 || col >= settings.columns || row < 0 || row >= rows) continue;

            const index = row * settings.columns + col;
            if (strength > brightness[index]) brightness[index] = strength;

            if (!inList[index]) {
                inList[index] = 1;
                activeList[activeCount++] = index;
            }
        }
    }

    function lightUpLine(from, to) {
        const deltaX = to.x - from.x;
        const deltaY = to.y - from.y;
        const steps = Math.max(1, Math.ceil(Math.hypot(deltaX, deltaY) / cellSize));

        for (let step = 0; step <= steps; step++) {
            const progress = step / steps;
            lightUpAround(from.x + deltaX * progress, from.y + deltaY * progress);
        }
    }

    function onPointerMove(event) {
        const movements = event.getCoalescedEvents
            ? event.getCoalescedEvents()
            : [event];

        for (const movement of movements) {
            const current = { x: movement.clientX, y: movement.clientY };

            if (lastPointer) lightUpLine(lastPointer, current);
            else lightUpAround(current.x, current.y);

            lastPointer = current;
        }

        startLoop();
    }

    function drawFrame(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const fade = dt / settings.fadeSeconds;

        ctx.clearRect(0, 0, width, height);

        const gap = settings.gap;
        const columns = settings.columns;

        let i = 0;
        while (i < activeCount) {
            const index = activeList[i];
            const value = brightness[index];

            const col = index % columns;
            const row = (index / columns) | 0;

            const x0 = Math.round(col * cellSize);
            const x1 = Math.round((col + 1) * cellSize);
            const y0 = Math.round(row * cellSize);
            const y1 = Math.round((row + 1) * cellSize);

            ctx.globalAlpha = value;
            ctx.fillRect(x0 + gap, y0 + gap, x1 - x0 - gap * 2, y1 - y0 - gap * 2);

            const next = value - fade;
            if (next <= 0) {
                brightness[index] = 0;
                inList[index] = 0;
                activeList[i] = activeList[--activeCount];
            } else {
                brightness[index] = next;
                i++;
            }
        }

        ctx.globalAlpha = 1;

        if (activeCount > 0) {
            requestAnimationFrame(drawFrame);
        } else {
            running = false;
        }
    }

    function startLoop() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(drawFrame);
    }

    function onResize() {
        if (resizeQueued) return;
        resizeQueued = true;
        requestAnimationFrame(() => {
            resizeQueued = false;
            setupGrid();
        });
    }

    setupGrid();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { lastPointer = null; });
}