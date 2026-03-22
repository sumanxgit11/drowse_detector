/**
 * DrowseGuard — Main Frontend Controller (Client-Side Detection)
 */

import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

let faceLandmarker = null;
let isRunning = false;
let webcamStream = null;
let animationId = null;
let lastVideoTime = -1;

// Metrics State
let frameCounter = 0;
let marCounter = 0;
let headCounter = 0;
let totalAlerts = 0;

// Constants
const RIGHT_EYE_IDXS = [33, 160, 158, 133, 153, 144];
const LEFT_EYE_IDXS  = [362, 385, 387, 263, 373, 380];
const UPPER_LIP = 13, LOWER_LIP = 14, LEFT_MOUTH = 78, RIGHT_MOUTH = 308;

const EAR_THRESHOLD = 0.22;
const EAR_CONSEC_FRAMES = 20;
const MAR_THRESHOLD = 0.5;
const MAR_CONSEC_FRAMES = 15;
const HEAD_PITCH_THRESHOLD = 25;
const HEAD_YAW_THRESHOLD = 30;
const HEAD_CONSEC_FRAMES = 15;

const video = document.getElementById("webcamVideo");
const canvasElement = document.getElementById("outputCanvas");
const canvasCtx = canvasElement?.getContext("2d");

// Initialize MediaPipe
async function initMediaPipe() {
  const btnStart = document.getElementById("btnStart");
  btnStart.innerHTML = '<span class="btn-icon">⏳</span> Loading Model...';
  btnStart.disabled = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });
    btnStart.disabled = false;
    btnStart.innerHTML = '<span class="btn-icon">▶</span> Start Detection';
  } catch (err) {
    console.error("Error loading MediaPipe:", err);
    alert("Failed to load FaceLandmarker. Check console.");
  }
}

// Ensure init is called on load
window.addEventListener("DOMContentLoaded", initMediaPipe);

// Euclidean Distance
function dist(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Get Euler Angles from column-major 4x4 matrix
function getEulerAngles(matrix) {
  const m00 = matrix[0], m10 = matrix[1], m20 = matrix[2];
  const m01 = matrix[4], m11 = matrix[5], m21 = matrix[6];
  const m02 = matrix[8], m12 = matrix[9], m22 = matrix[10];

  let pitch = Math.atan2(m21, m22) * (180 / Math.PI);
  let yaw = Math.atan2(-m20, Math.sqrt(m21 * m21 + m22 * m22)) * (180 / Math.PI);
  let roll = Math.atan2(m10, m00) * (180 / Math.PI);

  return { pitch, yaw, roll };
}

// Render loop
async function predictWebcam() {
  if (!isRunning) return;

  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    
    let results = faceLandmarker.detectForVideo(video, startTimeMs);

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    let currentEar = 0, currentMar = 0, currentPitch = 0, currentYaw = 0;
    let isDrowsy = false, isYawning = false, isHeadDropped = false;

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      const w = canvasElement.width;
      const h = canvasElement.height;

      // EAR Calculation
      const rightEyePts = RIGHT_EYE_IDXS.map(i => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));
      const leftEyePts = LEFT_EYE_IDXS.map(i => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));
      
      const earR = (dist(rightEyePts[1], rightEyePts[5]) + dist(rightEyePts[2], rightEyePts[4])) / (2.0 * dist(rightEyePts[0], rightEyePts[3]));
      const earL = (dist(leftEyePts[1], leftEyePts[5]) + dist(leftEyePts[2], leftEyePts[4])) / (2.0 * dist(leftEyePts[0], leftEyePts[3]));
      currentEar = (earR + earL) / 2.0;

      // MAR Calculation
      const uPt = { x: landmarks[UPPER_LIP].x * w, y: landmarks[UPPER_LIP].y * h };
      const lPt = { x: landmarks[LOWER_LIP].x * w, y: landmarks[LOWER_LIP].y * h };
      const lmPt = { x: landmarks[LEFT_MOUTH].x * w, y: landmarks[LEFT_MOUTH].y * h };
      const rmPt = { x: landmarks[RIGHT_MOUTH].x * w, y: landmarks[RIGHT_MOUTH].y * h };
      const A = dist(uPt, lPt);
      const B = dist(lmPt, rmPt);
      currentMar = B === 0 ? 0 : A / B;

      // Pose Calculation
      if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
        const matrix = results.facialTransformationMatrixes[0].data;
        const euler = getEulerAngles(matrix);
        currentPitch = euler.pitch;
        currentYaw = euler.yaw;
      }

      // Logic Updates
      if (currentEar < EAR_THRESHOLD) {
        frameCounter++;
        if (frameCounter >= EAR_CONSEC_FRAMES) {
          isDrowsy = true;
          if (frameCounter === EAR_CONSEC_FRAMES) totalAlerts++;
        }
      } else {
        frameCounter = 0;
      }

      if (currentMar > MAR_THRESHOLD) {
        marCounter++;
        if (marCounter >= MAR_CONSEC_FRAMES) {
          isYawning = true;
          if (marCounter === MAR_CONSEC_FRAMES) totalAlerts++;
        }
      } else {
        marCounter = 0;
      }

      if (Math.abs(currentPitch) > HEAD_PITCH_THRESHOLD || Math.abs(currentYaw) > HEAD_YAW_THRESHOLD) {
        headCounter++;
        if (headCounter >= HEAD_CONSEC_FRAMES) {
          isHeadDropped = true;
          if (headCounter === HEAD_CONSEC_FRAMES) totalAlerts++;
        }
      } else {
        headCounter = 0;
      }

      // Draw standard points
      canvasCtx.fillStyle = isDrowsy ? "#ff0000" : "#00ff00";
      for (let pt of [...rightEyePts, ...leftEyePts]) {
        canvasCtx.beginPath();
        canvasCtx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
        canvasCtx.fill();
      }

      canvasCtx.fillStyle = isYawning ? "#ff0000" : "#00ff00";
      for (let pt of [uPt, lPt, lmPt, rmPt]) {
        canvasCtx.beginPath();
        canvasCtx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
        canvasCtx.fill();
      }

      let yPos = 30;
      canvasCtx.font = "20px Consolas";
      canvasCtx.fillStyle = "#ffff00";
      canvasCtx.fillText(`EAR: ${currentEar.toFixed(3)}`, w - 140, yPos); yPos += 30;
      canvasCtx.fillText(`MAR: ${currentMar.toFixed(3)}`, w - 140, yPos); yPos += 30;
      canvasCtx.fillText(`Pch: ${currentPitch.toFixed(1)}`, w - 140, yPos); yPos += 30;
      canvasCtx.fillText(`Yaw: ${currentYaw.toFixed(1)}`, w - 140, yPos);
    }

    // Update UI
    const dataObj = {
      running: true,
      drowsy: isDrowsy,
      yawning: isYawning,
      head_dropped: isHeadDropped,
      ear: currentEar,
      mar: currentMar,
      pitch: currentPitch,
      yaw: currentYaw,
      frames: frameCounter,
      alerts: totalAlerts
    };
    updateMetricsUI({ ...dataObj });

    const isAlertActive = isDrowsy || isYawning || isHeadDropped;
    updateStatusBadge(isAlertActive ? 'drowsy' : 'running');
    
    if (typeof window.showDrowsinessAlert === 'function') {
       isAlertActive ? window.showDrowsinessAlert(dataObj) : window.hideDrowsinessAlert();
    }
    
    canvasCtx.restore();
  }

  if (isRunning) {
    animationId = window.requestAnimationFrame(predictWebcam);
  }
}

// ── Exported Actions ──────────────────────────────────────
window.startDetection = async function() {
  if (!faceLandmarker) {
    alert("Model is still loading. Please wait.");
    return;
  }
  
  const btnStart = document.getElementById('btnStart');
  const btnStop  = document.getElementById('btnStop');

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    video.srcObject = webcamStream;
    
    video.addEventListener("loadeddata", () => {
      isRunning = true;
      document.getElementById('videoPlaceholder')?.classList.add('hidden');
      video.style.display = "block";
      
      btnStart.disabled = true;
      btnStop.disabled  = false;
      
      frameCounter = 0; marCounter = 0; headCounter = 0; 
      
      predictWebcam();
    });
  } catch (err) {
    console.error("Camera access denied:", err);
    alert("Camera access is required for detection.");
  }
}

window.stopDetection = function() {
  isRunning = false;
  if (animationId) cancelAnimationFrame(animationId);
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
  video.srcObject = null;
  video.style.display = "none";
  
  if (canvasCtx) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }

  document.getElementById('videoPlaceholder')?.classList.remove('hidden');
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnStop').disabled  = true;

  if (typeof window.hideDrowsinessAlert === 'function') window.hideDrowsinessAlert();
  updateStatusBadge('idle');
  updateMetricsUI({ drowsy: false, ear: 0, mar: 0, pitch: 0, yaw: 0, frames: 0, alerts: totalAlerts, running: false });
}

// ── UI Update ────────────────────────────────────────────
function updateStatusBadge(state) {
  const badge = document.getElementById('statusBadge');
  const text  = document.getElementById('statusText');
  if (!badge || !text) return;

  badge.className = 'status-badge';
  const labels = { idle: 'Idle', running: 'Active', drowsy: 'DROWSY ⚠️' };
  badge.classList.add(state);
  text.textContent = labels[state] || 'Idle';
}

function updateMetricsUI(data) {
  const ear     = typeof data.ear === 'number' ? data.ear : 0;
  const mar     = typeof data.mar === 'number' ? data.mar : 0;
  const pitch   = typeof data.pitch === 'number' ? data.pitch : 0;
  const yaw     = typeof data.yaw === 'number' ? data.yaw : 0;
  
  const frames  = data.frames  ?? 0;
  const alerts  = data.alerts  ?? 0;
  const running = data.running ?? false;
  
  const drowsy  = data.drowsy  ?? false;
  const yawning = data.yawning ?? false;
  const headDrop = data.head_dropped ?? false;

  const isAlertActive = drowsy || yawning || headDrop;

  setTextContent('statEar',    running ? ear.toFixed(3) : '—');
  setTextContent('statAlerts', alerts);
  setTextContent('statFrames', frames);

  setTextContent('earValue',        running ? ear.toFixed(3) : '—');
  setTextContent('marValue',        running ? mar.toFixed(3) : '—');
  setTextContent('pitchValue',      running ? pitch.toFixed(1) + '°' : '—');
  setTextContent('yawValue',        running ? yaw.toFixed(1) + '°' : '—');
  
  setTextContent('drowsyFrames',    frames);
  setTextContent('totalAlerts',     alerts);

  const earPct = Math.min(ear / 0.5, 1) * 100;
  const earBar = document.getElementById('earBar');
  if (earBar) {
    earBar.style.width = earPct + '%';
    earBar.style.background = ear < 0.22 ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                              ear < 0.35 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                           'linear-gradient(90deg, #3b82f6, #8b5cf6)';
  }
  
  const marPct = Math.min(mar / 1.0, 1) * 100;
  const marBar = document.getElementById('marBar');
  if (marBar) {
    marBar.style.width = marPct + '%';
    marBar.style.background = mar > 0.5 ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                              mar > 0.4 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                                          'linear-gradient(90deg, #3b82f6, #8b5cf6)';
  }

  const pill = document.getElementById('detectionStatus');
  if (pill) {
    let pillText = 'Running';
    if (drowsy) pillText = 'DROWSY';
    else if (yawning) pillText = 'YAWNING';
    else if (headDrop) pillText = 'DISTRACTED';
    
    pill.textContent = running ? pillText : 'Stopped';
    pill.className   = 'metric-pill' + (running ? (isAlertActive ? ' drowsy' : ' running') : '');
  }
}

function setTextContent(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
});

const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
  });
}
