from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
import cv2
import threading
import time
import mysql.connector
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# ==================== KONFIGURASI ====================
PERSON_MODEL_PATH = "person.pt"      
TRASHCAN_MODEL_PATH = "trashcan.pt"  

SKIP_FRAMES = 3  
INFERENCE_SIZE = 640  
CONFIDENCE_PERSON = 0.60
CONFIDENCE_TRASH = 0.20

# ==================== GLOBAL STATE ====================
camera_active = False
detection_state = {
    "person_count": 0,
    "trash_bin_detected": False,
    "is_valid": False,
    "last_update": None
}

validation_status = {
    "valid": False,
    "person_detected": False,
    "trash_detected": False,
    "timestamp": None,
    "message": "Menunggu deteksi..."
}

state_lock = threading.Lock()

# ==================== DATABASE CONNECTION (MYSQL) ====================
def get_db_connection():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="cleanguard"
    )
    return conn

# ==================== YOLO DUAL MODEL ====================
try:
    model_person = YOLO(PERSON_MODEL_PATH)
    model_trash = YOLO(TRASHCAN_MODEL_PATH)
    print(f"Dual-Brain YOLO siap digunakan.")
except Exception as e:
    print(f"Error memuat model YOLO: {e}")
    model_person = None
    model_trash = None

# ==================== FUNGSI VISUAL ====================
def draw_cyberpunk_box(frame, x1, y1, x2, y2, label, box_class):
    neon_green = (0, 255, 100)
    neon_cyan = (255, 255, 0)
    
    box_color = neon_green if box_class == "person" else neon_cyan
    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
    
    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
    cv2.rectangle(frame, (x1, y1 - 25), (x1 + label_size[0] + 10, y1), (0, 0, 0), -1)
    cv2.rectangle(frame, (x1, y1 - 25), (x1 + label_size[0] + 10, y1), box_color, 1)
    cv2.putText(frame, label, (x1 + 5, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 1, cv2.LINE_AA)
    
    return frame

# ==================== LOGIKA KAMERA ====================
def generate_frames():
    global camera_active, detection_state, validation_status
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    frame_count = 0
    last_boxes = []
    waktu_tahan_valid = 0
    
    waktu_tahan_orang = 0
    jumlah_orang_stabil = 0
    
    camera_active = True
    
    try:
        while camera_active:
            success, frame = cap.read()
            if not success: break
            
            frame_count += 1
            waktu_sekarang = time.time()
            
            if model_person and model_trash and frame_count % SKIP_FRAMES == 0:
                try:
                    results_person = model_person.predict(frame, imgsz=INFERENCE_SIZE, conf=CONFIDENCE_PERSON, classes=[0], device=0, verbose=False)
                    results_trash = model_trash.predict(frame, imgsz=INFERENCE_SIZE, conf=CONFIDENCE_TRASH, device=0, verbose=False)
                    
                    last_boxes = []
                    person_count = 0
                    trash_detected = False
                    
                    MIN_PERSON_AREA = 5000  
                    MIN_TRASH_AREA = 500    

                    if results_person and len(results_person) > 0:
                        for box in results_person[0].boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            if (x2 - x1) * (y2 - y1) >= MIN_PERSON_AREA:
                                person_count += 1
                                last_boxes.append({"coords": (x1, y1, x2, y2), "label": f"PERSON {float(box.conf[0]):.0%}", "class": "person"})

                    if results_trash and len(results_trash) > 0:
                        for box in results_trash[0].boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            if (x2 - x1) * (y2 - y1) >= MIN_TRASH_AREA:
                                trash_detected = True
                                last_boxes.append({"coords": (x1, y1, x2, y2), "label": f"TRASHCAN {float(box.conf[0]):.0%}", "class": "trashcan"})
                    
                    if person_count > 0:
                        waktu_tahan_orang = waktu_sekarang + 1.0
                        jumlah_orang_stabil = person_count
                        
                    if waktu_sekarang <= waktu_tahan_orang:
                        person_count = max(person_count, jumlah_orang_stabil)
                    else:
                        jumlah_orang_stabil = 0

                    if person_count >= 2 and trash_detected:
                        waktu_tahan_valid = waktu_sekarang + 3.0
                    
                    is_actually_valid = (waktu_sekarang <= waktu_tahan_valid)
                    
                    with state_lock:
                        tampilan_orang = max(2, person_count) if is_actually_valid else person_count
                        tampilan_sampah = True if is_actually_valid else trash_detected
                        
                        detection_state["person_count"] = tampilan_orang
                        detection_state["trash_bin_detected"] = tampilan_sampah
                        detection_state["is_valid"] = is_actually_valid
                        
                        if is_actually_valid:
                            validation_status["valid"] = True
                            validation_status["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
                            validation_status["message"] = f"Valid! Sistem mengunci deteksi {tampilan_orang} siswa."
                        else:
                            validation_status["valid"] = False
                            if tampilan_orang < 2:
                                validation_status["message"] = f"Menunggu {2 - tampilan_orang} orang lagi..."
                            elif not tampilan_sampah:
                                validation_status["message"] = "Siswa terdeteksi. Mana sampahnya?"
                                
                except Exception as e:
                    print(f"[!] ERROR YOLO: {e}")
            
            for b in last_boxes:
                frame = draw_cyberpunk_box(frame, *b["coords"], b["label"], b["class"])
            
            teks_orang = f"ORANG TERDETEKSI: {detection_state['person_count']}"
            cv2.rectangle(frame, (40, 650), (380, 700), (42, 23, 15), -1) 
            cv2.rectangle(frame, (40, 650), (380, 700), (233, 165, 14), 2)
            cv2.putText(frame, teks_orang, (55, 685), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (233, 165, 14), 2, cv2.LINE_AA)
            
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ret:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                       
    finally:
        cap.release()
        camera_active = False

# ==================== ROUTES API ====================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/validasi-rfid', methods=['POST'])
def validasi_rfid():
    uid = request.get_json().get('uid', '').strip()
    if not uid: return jsonify({"success": False, "message": "UID kosong"}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True) 
        
        cursor.execute('SELECT * FROM siswa WHERE uid = %s', (uid,))
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({"success": False, "message": "Kartu tidak terdaftar"}), 404

        cursor.execute('''
            SELECT COUNT(*) as total 
            FROM log_sampah 
            WHERE uid = %s 
            AND MONTH(waktu) = MONTH(CURRENT_DATE()) 
            AND YEAR(waktu) = YEAR(CURRENT_DATE())
        ''', (uid,))
        log_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if log_data['total'] > 0:
            return jsonify({
                "success": False, 
                "message": f"Maaf {student['nama']}, kamu sudah piket bulan ini!"
            }), 403
        
        data = {
            "uid": student["uid"],
            "name": student["nama"],
            "class": student["kelas"],
            "nis": student["nis"],
            "photo": f"https://ui-avatars.com/api/?name={student['nama'].replace(' ', '+')}&background=22c55e&color=000&bold=true"
        }
        return jsonify({"success": True, "message": f"Halo, {data['name']}!", "data": data})
        
    except Exception as e:
        print(f"DB Error: {e}")
        return jsonify({"success": False, "message": "Database Error"}), 500

@app.route('/api/detection-status')
def detection_status():
    with state_lock:
        return jsonify(detection_state)

@app.route('/api/simpan-log', methods=['POST'])
def simpan_log():
    uid = request.get_json().get('uid', '').strip()
    if not uid: return jsonify({"success": False, "message": "UID kosong"}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('INSERT INTO log_sampah (uid) VALUES (%s)', (uid,))
        cursor.execute('UPDATE siswa SET total_buang = total_buang + 1 WHERE uid = %s', (uid,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"success": True, "message": "Log dicatat, poin ditambahkan!"})
    except Exception as e:
        print(f"DB Error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/check-validation')
def check_validation():
    with state_lock:
        return jsonify(validation_status)

@app.route('/api/reset-validation', methods=['POST'])
def reset_validation():
    global validation_status
    with state_lock:
        validation_status = {"valid": False, "message": "Menunggu deteksi..."}
    return jsonify({"success": True})

if __name__ == '__main__':
    print("[!] Sistem CleanGuard AI siap.")
    app.run(debug=True, port=5000, threaded=True)