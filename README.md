# 👁️ Drowse Detector — Driver Drowsiness Detector

Real-time driver drowsiness detection web application using Python Flask, OpenCV, and Google MediaPipe Face Mesh.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

> **Note:** MediaPipe handles facial landmarks out of the box without needing external C++ build tools or separate model downloads!

### 2. Run the App

```bash
python app.py
```

Open your browser at: **http://127.0.0.1:5000**

---

## 🧠 How It Works

The detection uses the **Eye Aspect Ratio (EAR)** algorithm based on 6 key landmarks around each eye out of the 468 points provided by MediaPipe Face Mesh:

```
EAR = (||P2-P6|| + ||P3-P5||) / (2 × ||P1-P4||)
```

- **EAR < 0.22** for **20+ consecutive frames** → Drowsiness alert triggered
- Alert fires with a flashing red overlay + audio double-beep alarm

## 📁 Project Structure

```
drowse_detector_webapp/
├── app.py                    # Flask server + ML detection engine
├── requirements.txt
├── templates/
│   ├── home.html             # Live detection page
│   ├── about.html            # EAR explanation & tech stack
│   └── contact.html          # Contact form
└── static/
    ├── css/
    │   ├── style.css
    │   ├── about.css
    │   └── contact.css
    └── js/
        ├── main.js           # Start/stop, status polling, UI
        └── alerts.js         # Web Audio API alarm system
```

## 🔗 API Endpoints

| Method | Endpoint         | Description                        |
|--------|------------------|------------------------------------|
| GET    | `/`              | Home page (detection UI)           |
| GET    | `/about`         | About page                         |
| GET    | `/contact`       | Contact page                       |
| GET    | `/video_feed`    | MJPEG video stream                 |
| POST   | `/start`         | Start detection                    |
| POST   | `/stop`          | Stop detection                     |
| GET    | `/status`        | JSON: `{ running, drowsy, ear, frames, alerts }` |

## 🛠 Tech Stack

| Component       | Technology          |
|-----------------|---------------------|
| Backend         | Python 3, Flask     |
| Computer Vision | OpenCV              |
| ML Model        | MediaPipe Face Mesh |
| Math            | SciPy, NumPy        |
| Frontend        | HTML5, CSS3, Vanilla JS |
| Design          | Dark Glassmorphism  |
| Audio Alerts    | Web Audio API       |
