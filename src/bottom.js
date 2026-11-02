document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("bottom");

    if (!container) return;

    try {
        const response = await fetch("/wor-page/pages/bottom.html");

        if (!response.ok) {
            throw new Error("no bottom.html");
        }

        container.innerHTML = await response.text();

    } catch (error) {
        console.error(error);
    }
});