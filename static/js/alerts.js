/**
 * DrowseGuard — Drowsiness Alert System
 * Web Audio API beep + visual effects
 */

let audioCtx = null;
let alertActive = false;
let beepInterval = null;

// Create audio context on first user gesture (browser autoplay policy)
function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playBeep(freq = 900, duration = 0.25, volume = 0.55) {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gainNode   = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

function startAlertBeeping() {
  if (beepInterval) return;
  playBeep(900, 0.2, 0.6);
  beepInterval = setInterval(() => {
    playBeep(900, 0.2, 0.6);
    setTimeout(() => playBeep(700, 0.2, 0.5), 280);
  }, 700);
}

function stopAlertBeeping() {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
}

function showDrowsinessAlert(data) {
  if (alertActive) return;
  alertActive = true;

  const overlay    = document.getElementById('alertOverlay');
  const videoFlash = document.getElementById('videoAlertFlash');

  // Update text based on alert type
  if (data) {
    const titleEl = document.querySelector('.alert-title');
    const msgEl   = document.querySelector('.alert-msg');
    if (titleEl && msgEl) {
      if (data.drowsy) {
        titleEl.textContent = "DROWSINESS DETECTED!";
        msgEl.textContent   = "Please pull over and rest immediately.";
      } else if (data.head_dropped) {
        titleEl.textContent = "DISTRACTION / HEAD DROP!";
        msgEl.textContent   = "Please keep your focus on the road.";
      } else if (data.yawning) {
        titleEl.textContent = "YAWNING DETECTED!";
        msgEl.textContent   = "You appear fatigued. Consider taking a break.";
      }
    }
  }

  if (overlay)    overlay.classList.add('visible');
  if (videoFlash) videoFlash.classList.add('active');

  startAlertBeeping();

  // Auto-dismiss after 5s if user doesn't click
  // (poll will re-trigger if still drowsy)
  setTimeout(() => hideDrowsinessAlert(), 5000);
}

function hideDrowsinessAlert() {
  if (!alertActive) return;
  alertActive = false;

  const overlay    = document.getElementById('alertOverlay');
  const videoFlash = document.getElementById('videoAlertFlash');

  if (overlay)    overlay.classList.remove('visible');
  if (videoFlash) videoFlash.classList.remove('active');

  stopAlertBeeping();
}

// Prime audio context on first click anywhere (required by browsers)
document.addEventListener('click', ensureAudioContext, { once: true });
document.addEventListener('touchstart', ensureAudioContext, { once: true });
