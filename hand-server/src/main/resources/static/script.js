const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

const leftStatusEl = document.getElementById('leftStatus');
const leftFingersEl = document.getElementById('leftFingers');
const rightStatusEl = document.getElementById('rightStatus');
const rightFingersEl = document.getElementById('rightFingers');

let camera = null;

// Poblado de lista de cámaras
async function listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === 'videoinput');
    const select = document.getElementById('camSelect');
    select.innerHTML = '';
    cams.forEach((c,i) => {
        const opt = document.createElement('option');
        opt.value = c.deviceId;
        opt.textContent = c.label || `Cámara ${i}`;
        select.appendChild(opt);
    });
}

document.getElementById('startBtn').addEventListener('click', async () => {
    const select = document.getElementById('camSelect');
    const deviceId = select.value;
    if (camera) {
        camera.stop();
        camera = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: 1280, height: 720 },
        audio: false
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    // Ajusta canvas al tamaño de video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Inicializa MediaPipe Hands
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

    hands.onResults(onResults);

    camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });
    camera.start();
});

// La función analyze_hand replicada en JS (incluye pulgar con punta 4 y base 2)
function analyze_hand_js(landmarks) {
    // landmarks: array de 21 puntos con .x, .y normalizados (0..1)
    const finger_tips = [8, 12, 16, 20];
    const finger_mcp  = [5, 9, 13, 17];

    const fingers = [];

    for (let i = 0; i < finger_tips.length; i++) {
        const tip = landmarks[finger_tips[i]];
        const base = landmarks[finger_mcp[i]];
        if (tip.y < base.y) {
            fingers.push(1);
        } else {
            fingers.push(0);
        }
    }

    // Pulgar: punta 4, base 2 (según tu petición)
    const thumb_tip = landmarks[4];
    const thumb_base = landmarks[2];

    // Usamos distancia en X (abs) para detectar pulgar abierto
    const thumbExtended = Math.abs(thumb_tip.x - thumb_base.x) > 0.03;
    fingers.push(thumbExtended ? 1 : 0);

    const fingersCount = fingers.reduce((a,b) => a + b, 0);
    const is_open = fingersCount >= 2; // mantenemos regla original (>=2)

    return {
        open: is_open,
        closed: !is_open,
        fingers: fingersCount
    };
}

// onResults: dibuja y actualiza estado
let lastSent = 0;
async function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    let leftInfo = null;
    let rightInfo = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].classification[0].label; // "Left" or "Right"

            // Dibuja landmarks
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});

            // Convierte landmarks en un array simple con x,y
            const simple = landmarks.map(p => ({x: p.x, y: p.y}));

            const handData = analyze_hand_js(simple);
            if (handedness === 'Right') {
                rightInfo = handData;
            } else {
                leftInfo = handData;
            }
        }
    }

    // Actualiza la UI
    if (leftInfo) {
        leftStatusEl.innerText = leftInfo.open ? "Abierta" : "Cerrada";
        leftFingersEl.innerText = leftInfo.fingers;
    } else {
        leftStatusEl.innerText = "-";
        leftFingersEl.innerText = "-";
    }

    if (rightInfo) {
        rightStatusEl.innerText = rightInfo.open ? "Abierta" : "Cerrada";
        rightFingersEl.innerText = rightInfo.fingers;
    } else {
        rightStatusEl.innerText = "-";
        rightFingersEl.innerText = "-";
    }

    // Enviar estado al backend cada 300 ms (o menos frecuente si quieres)
    const now = Date.now();
    if (now - lastSent > 300) {
        lastSent = now;
        fetch('/hand_status_update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ left: leftInfo, right: rightInfo })
        }).catch(e => {
            // No romper si backend no responde
        });
    }

    canvasCtx.restore();
}

// Inicializa lista de cámaras al cargar
listCameras().catch(console.error);
