"use strict";

const TIME_OFFSET = -177;

async function loadContents(url) {
    const f = await fetch(url);

    if (!f.ok) {
        console.error("Fetch error", f);

        alert("Failed to load contents.");
        throw new Error("Failed to load contents");
    }

    return await f.json();
}

function findNearestPoint(route, time) {
    // okay. This should be more sophisticated
    for (const p of route) {
        if (p.time > time) {
            return p;
        }
    }
    return points[points.length - 1];
}

const pointObjects = {};

window.addEventListener("DOMContentLoaded", async (event) => {
    console.debug("DOM ready. Start initializing...");

    const contents = await loadContents("./contents.json");

    const container = document.getElementById("container");

    const icon = L.icon({
        iconUrl: "./pin-location.svg",
        iconSize: [23, 30],
        iconAnchor: [11, 30]
    });
    const iconActive = L.icon({
        iconUrl: "./pin-location-active.svg",
        iconSize: [23, 30],
        iconAnchor: [11, 30]
    });

    for (const i in contents) {
        const id = "section_" + i;
        const data = contents[i];

        const newSection = document.createElement("section");
        newSection.setAttribute("id", id);
        newSection.setAttribute("class", "section");
        newSection.setAttribute("style", `background-image: url('${data.image}')`);

        const title = document.createElement("h2");
        title.textContent = data.title;

        const description = document.createElement("p");
        description.setAttribute("class", "uk-text-emphasis");
        description.innerHTML = data.description;

        const adjustedTime = new Date((data.time + TIME_OFFSET) * 1000);
        const footer = document.createElement("footer");

        const toolbar = document.createElement("div");
        const linkToImage = document.createElement("a");
        linkToImage.setAttribute("uk-icon", "icon: image");
        linkToImage.setAttribute("href", data.image);
        linkToImage.setAttribute("target", "_blank");
        toolbar.appendChild(linkToImage);

        const timestamp = document.createElement("div");
        timestamp.setAttribute("class", "uk-text-right timestamp");
        timestamp.textContent = `(${adjustedTime.toLocaleString()} 撮影)`;

        footer.appendChild(toolbar);
        footer.appendChild(timestamp);

        const msg = document.createElement("div");
        msg.setAttribute("class", "description");
        msg.appendChild(title);
        msg.appendChild(description);
        msg.appendChild(footer);

        newSection.appendChild(msg);

        container.appendChild(newSection);
    }

    console.debug(`${contents.length} pages added.`);

    // Setup maps
    const map = L.map("map").setView([34.2405, 134.0141], 13);
    map.zoomControl.setPosition("topright");

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    tileLayer.addTo(map);

    const route = await loadContents("./route.json");

    const points = route.map((wp) => [wp.lat, wp.lon]);
    const polyline = L.polyline(points, { color: "red" }).addTo(map);

    map.fitBounds(polyline.getBounds());

    for (const i in contents) {
        const id = "section_" + i;
        const data = contents[i];

        if (data.time != null) {
            const p = findNearestPoint(route, (data.time + TIME_OFFSET) * 1000);

            const marker = L.marker([p.lat, p.lon], {
                title: data.title,
                opacity: 0.8,
                icon,
                zIndexOffset: p.lat
            }).addTo(map);

            marker.on("click", () => {
                const section = document.getElementById(id);

                section.scrollIntoView({ behavior: "smooth" });
            });

            pointObjects[id] = {
                marker,
                point: p
            };
        }
    }

    // Setup observer
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const id = entry.target.id;
            if (pointObjects[id] != null) {
                const p = pointObjects[id];
                const marker = p.marker;

                if (entry.isIntersecting) {
                    marker.setOpacity(1.0);
                    marker.setIcon(iconActive);
                    marker.setZIndexOffset(1000);
                } else {
                    marker.setOpacity(0.8);
                    marker.setIcon(icon);
                    marker.setZIndexOffset(p.point.lat);
                }
            }
        }
    }, {
        root: container,
        rootMargin: "-50% 0px",
        threshold: 0
    });
    
    const sections = document.querySelectorAll(".section");
    for (const s of sections) {
        observer.observe(s);
    }
});
