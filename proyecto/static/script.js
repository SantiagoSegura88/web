async function loadCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === "videoinput");

    const select = document.getElementById("camera-select");
    select.innerHTML = "";

    cams.forEach((cam, index) => {
        let option = document.createElement("option");
        option.value = index;
        option.textContent = cam.label || `Cámara ${index}`;
        select.appendChild(option);
    });
}

function startStream() {
    const index = document.getElementById("camera-select").value;
    const video = document.getElementById("video-feed");

    video.src = `/video?camera=${index}`;
}

loadCameras();
