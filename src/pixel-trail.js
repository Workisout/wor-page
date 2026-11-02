document.addEventListener("DOMContentLoaded", startPixelTrail);

function startPixelTrail() {
    const canvas = document.getElementById("pixel-trail");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const settings = {
        columns: 128,
        color: "#FFFFFF",
        gap: 0,
        radius: 0.5,
        fadeSeconds: 0.45
    };

    const fadePerFrame = 1 / (settings.fadeSeconds * 60);

    let cellSize = 0;
    let rows = 0;
    let brightness = new Float32Array(0);
    let lastPointer = null;

    function setupGrid() {
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = window.innerWidth * pixelRatio;
        canvas.height = window.innerHeight * pixelRatio;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        cellSize = window.innerWidth / settings.columns;
        rows = Math.ceil(window.innerHeight / cellSize);

        brightness = new Float32Array(settings.columns * rows);
    }

    function lightUpAround(x, y) {
        const centerCol = Math.floor(x / cellSize);
        const centerRow = Math.floor(y / cellSize);
        const reach = Math.ceil(settings.radius);

        for (let offsetY = -reach; offsetY <= reach; offsetY++) {
            for (let offsetX = -reach; offsetX <= reach; offsetX++) {
                const distance = Math.hypot(offsetX, offsetY);
                if (distance > settings.radius) continue;

                const col = centerCol + offsetX;
                const row = centerRow + offsetY;

                const isOutside =
                    col < 0 || col >= settings.columns ||
                    row < 0 || row >= rows;
                if (isOutside) continue;

                const cellIndex = row * settings.columns + col;
                const strength = 1 - distance / (settings.radius + 0.5);

                brightness[cellIndex] = Math.max(brightness[cellIndex], strength);
            }
        }
    }

    function lightUpLine(from, to) {
        const deltaX = to.x - from.x;
        const deltaY = to.y - from.y;
        const length = Math.hypot(deltaX, deltaY);
        const steps = Math.max(1, Math.ceil(length / (cellSize * 0.5)));

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

            if (lastPointer) {
                lightUpLine(lastPointer, current);
            } else {
                lightUpAround(current.x, current.y);
            }

            lastPointer = current;
        }
    }

    function drawFrame() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.fillStyle = settings.color;

        const size = cellSize - settings.gap * 2;

        for (let i = 0; i < brightness.length; i++) {
            if (brightness[i] <= 0) continue;

            const col = i % settings.columns;
            const row = Math.floor(i / settings.columns);

            ctx.globalAlpha = brightness[i];
            ctx.fillRect(
                col * cellSize + settings.gap,
                row * cellSize + settings.gap,
                size,
                size
            );

            brightness[i] = Math.max(0, brightness[i] - fadePerFrame);
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(drawFrame);
    }

    setupGrid();
    window.addEventListener("resize", setupGrid);
    window.addEventListener("pointermove", onPointerMove);
    drawFrame();
}