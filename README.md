# 👁️ Drowse Detector — Driver Drowsiness Detector

A real-time driver drowsiness detection web application using a lightweight Python Flask backend and **client-side AI processing** powered by Google MediaPipe FaceLandmarker for the web.

## ✨ Features
1. **Drowsiness Detection (EAR)**: Monitors the Eye Aspect Ratio. Triggers an alert if eyes are closed for prolonged frames.
2. **Yawning Detection (MAR)**: Monitors the Mouth Aspect Ratio. Triggers an alert if the driver is yawning, indicating fatigue.
3. **Distraction & Head Drop Detection (Head Pose)**: Extracts Pitch and Yaw from the facial transformation matrix to detect if the driver's head drops or turns away from the road.
4. **Cloud-Ready Edge AI**: All processing happens securely and swiftly in the user's web browser using WebAssembly. The Python backend is solely used for serving static files, making this app perfect for free cloud hosting (Render, Heroku, etc.).

---

## 🚀 Quick Start

### 1. Install Dependencies
Since all AI algorithms run in the browser, the backend is incredibly lightweight.
```bash
pip install -r requirements.txt
```

### 2. Run the App Locally
```bash
python app.py
```
Open your browser at: **http://127.0.0.1:5000**

---

## 🧠 How It Works

### Eye Aspect Ratio (EAR)
Calculated based on 6 key landmarks around each eye.
- **Trigger**: EAR < 0.22 for 20+ consecutive frames → Drowsiness alert.

### Mouth Aspect Ratio (MAR)
Calculated based on 4 inner lip landmarks.
- **Trigger**: MAR > 0.50 for 15+ consecutive frames → Yawning alert.

### Head Pose (Pitch & Yaw)
The 3D facial transformation matrix is decomposed into Euler angles.
- **Trigger**: Pitch > 25° (Head Drop) OR Yaw > 30° (Looking away) for 15+ consecutive frames → Distraction alert.

## 📁 Project Structure

```
drowse_detector_webapp/
├── app.py                    # Lightweight Flask web server
├── requirements.txt          # Flask & Gunicorn
├── Procfile                  # Cloud deployment configuration
├── templates/
│   ├── home.html             # Live detection page (loads MediaPipe vision bundle)
│   ├── about.html            
│   └── contact.html          
└── static/
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js           # Client-side camera capture, AI detection loop, math
        └── alerts.js         # Web Audio API alarm system & conditional UI messages
```

## 🛠 Tech Stack

| Component       | Technology          |
|-----------------|---------------------|
| AI Engine       | MediaPipe Tasks Vision (Javascript / WebAssembly) |
| Web Server      | Python 3, Flask, Gunicorn |
| Frontend        | HTML5, CSS3, Vanilla JS |
| Audio Alerts    | Web Audio API       |

## ☁️ Deployment

Ready to host on platforms like **Render** or **Heroku**:
1. Connect this repository.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `gunicorn app:app`
