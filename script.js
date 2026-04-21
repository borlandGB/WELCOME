// ELEMENTS
const manualControl = document.getElementById('manual_control');
const pumpBtn = document.getElementById('pump_btn');
const espSleepBtn = document.getElementById('esp_sleep_btn');

const solBtns = [
  document.getElementById('sol1_btn'),
  document.getElementById('sol2_btn'),
  document.getElementById('sol3_btn'),
  document.getElementById('sol4_btn')
];

// STATUS DISPLAY
const statusPump = document.getElementById('status_pump');
const statusSol = [
  document.getElementById('status_sol1'),
  document.getElementById('status_sol2'),
  document.getElementById('status_sol3'),
  document.getElementById('status_sol4')
];

const statusEsp = document.getElementById('status_esp');
const statusRadio = document.getElementById('status_radio');

// STATES
let pumpState = false;
let solState = [false, false, false, false];
let espAwake = true;
let shutdownTimer = null;

// ==========================
// 🔒 ENABLE / DISABLE CONTROL
// ==========================
manualControl.addEventListener('change', () => {

  // If manual control is turned OFF → force everything OFF
  if (!manualControl.checked) {
    
    // Turn OFF pump immediately
    pumpState = false;
    updatePump();

    // Turn OFF all solenoids immediately
    turnOffAllSolenoids();

    console.log("Manual control OFF → system shutdown");
  }

  updateControlAccess();
});

function updateControlAccess() {
  const enabled = manualControl.checked && espAwake;

  pumpBtn.disabled = !enabled;
  solBtns.forEach(btn => btn.disabled = !enabled);
}

// ==========================
// 💧 PUMP CONTROL
// ==========================
pumpBtn.addEventListener('click', () => {
  pumpState = !pumpState;
  updatePump();

  if (!pumpState) {
    shutdownTimer = setTimeout(turnOffAllSolenoids, 4000);
  } else {
    if (shutdownTimer) clearTimeout(shutdownTimer);
  }
});

// ==========================
// 🚿 SOLENOIDS (ONLY ONE)
// ==========================
solBtns.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    solState = solState.map((v, j) => j === i ? !v : false);
    updateSolenoids();
  });
});

// ==========================
// 🔴 ESP CONTROL BUTTON (SMART)
// ==========================
espSleepBtn.addEventListener('click', () => {

  // ======================
  // CASE 1 → GO TO SLEEP
  // ======================
  if (espAwake) {

    statusRadio.textContent = "SHUTTING DOWN...";

    // STEP 1 → Pump OFF
    pumpState = false;
    updatePump();

    // STEP 2 → Solenoids OFF
    setTimeout(() => {

      turnOffAllSolenoids();

      // STEP 3 → ESP SLEEP
      setTimeout(() => {

        espAwake = false;
        updateEspStatus();

        console.log("ESP32 → SLEEP COMMAND SENT");

        // FUTURE:
        // fetch('/esp_sleep', { method: 'POST' });

      }, 1000);

    }, 4000);

  }

  // ======================
  // CASE 2 → WAKE UP
  // ======================
  else {

    espAwake = true;
    updateEspStatus();

    statusRadio.textContent = "OK";

    console.log("ESP32 → WAKE COMMAND SENT");

    // FUTURE:
    // fetch('/esp_wake', { method: 'POST' });
  }
});

// ==========================
// 🔄 UPDATE FUNCTIONS
// ==========================
function updatePump() {
  pumpBtn.textContent = pumpState ? "ON" : "OFF";
  statusPump.textContent = pumpState ? "ON" : "OFF";
}

function updateSolenoids() {
  solBtns.forEach((btn, i) => {
    btn.textContent = solState[i] ? "ON" : "OFF";
    statusSol[i].textContent = solState[i] ? "ON" : "OFF";
  });
}

function turnOffAllSolenoids() {
  solState = [false, false, false, false];
  updateSolenoids();
}

// ==========================
// 🧠 ESP STATUS HANDLER
// ==========================
function updateEspStatus() {

  if (espAwake) {
    statusEsp.textContent = "AWAKE";
    espSleepBtn.textContent = "SEND TO SLEEP";

    manualControl.disabled = false;

  } else {
    statusEsp.textContent = "SLEEP";
    statusRadio.textContent = "NO SIGNAL";
    espSleepBtn.textContent = "WAKE UP";

    // 🔒 FORCE MANUAL CONTROL OFF
    manualControl.checked = false;
    manualControl.disabled = true;

    // Disable all controls
    updateControlAccess();
  }
}

// ==========================
// 🚀 INITIAL STATE
// ==========================
updatePump();
updateSolenoids();
updateEspStatus();