from flask import Flask, render_template, Response, request, jsonify
import cv2
import threading
import time
import mediapipe as mp

app = Flask(__name__)

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

current_camera_index = 0
video_capture = None
lock = threading.Lock()

# ---------------------------------------
# Detectar cámaras con nombre real (Windows + Linux + Mac)
# ---------------------------------------
def get_camera_list():
    camera_list = []
    for index in range(10):  # Busca hasta 10 dispositivos
        cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        if cap.isOpened():
            # Obtener nombre del dispositivo
            name = cap.getBackendName()
            if name == "":
                name = f"Dispositivo {index}"
            camera_list.append({"id": index, "name": name})
        cap.release()
    return camera_list

# ---------------------------------------
# Detección de mano: abierta, cerrada, dedos
# ---------------------------------------
def analyze_hand(landmarks):
    finger_tips = [8, 12, 16, 20]      # dedos (sin pulgar)
    finger_mcp  = [5, 9, 13, 17]

    fingers = []

    # Detección de dedos (igual que tu código original)
    for tip, base in zip(finger_tips, finger_mcp):
        if landmarks[tip].y < landmarks[base].y:
            fingers.append(1)
        else:
            fingers.append(0)

    # -------------------------------
    # Detección del pulgar (nuevo)
    # Punta = 4, base = 2
    thumb_tip = landmarks[4]
    thumb_base = landmarks[1]

    # Lo consideramos extendido si se separa lo suficiente en X
    # (Abs se usa para que funcione izquierda o derecha sin invertir condiciones)
    if abs(thumb_tip.x - thumb_base.x) > 0.03:
        fingers.append(1)
    else:
        fingers.append(0)
    # -------------------------------

    is_open = sum(fingers) >= 3

    return {
        "open": is_open,
        "closed": not is_open,
        "fingers": sum(fingers)
    }

# ---------------------------------------
# Stream de video
# ---------------------------------------
def gen_frames():
    global video_capture

    with mp_hands.Hands(max_num_hands=2) as hands:
        while True:
            with lock:
                if video_capture is None:
                    continue
                success, frame = video_capture.read()

            if not success:
                break

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)

            right_info = None
            left_info = None

            if results.multi_hand_landmarks and results.multi_handedness:
                for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):

                    label = handedness.classification[0].label

                    hand_data = analyze_hand(hand_landmarks.landmark)

                    if label == "Right":
                        right_info = hand_data
                    else:
                        left_info = hand_data

                    mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            # Guardar resultados globales
            app.right_data = right_info
            app.left_data = left_info

            ret, buffer = cv2.imencode(".jpg", frame)
            if not ret:
                continue

            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

# ---------------------------------------
# Rutas
# ---------------------------------------
@app.route("/")
def index():
    cameras = get_camera_list()
    return render_template("index.html", cameras=cameras)

@app.route("/video_feed")
def video_feed():
    return Response(gen_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/select_camera", methods=["POST"])
def select_camera():
    global video_capture, current_camera_index

    data = request.get_json()
    cam_id = int(data["camera_id"])

    with lock:
        if video_capture is not None:
            video_capture.release()

        video_capture = cv2.VideoCapture(cam_id, cv2.CAP_DSHOW)
        current_camera_index = cam_id

    return jsonify({"status": "ok"})

@app.route("/hand_status")
def hand_status():
    return jsonify({
        "left": app.left_data,
        "right": app.right_data
    })

if __name__ == "__main__":
    app.right_data = None
    app.left_data = None
    app.run(host="0.0.0.0", port=5000, debug=True)
