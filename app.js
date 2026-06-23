const KEY = "raspored";

let currentSort = "";
let sortDirection = "asc";

// Time picker variables
let currentTimeInput = null;
let selectedHour = 0;
let selectedMinute = 0;
let isDragging = false;
let clockCanvas, ctx;

function getData() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function clean(v) {
  return v && v.trim() !== "" ? v : "—";
}

function format24(time) {
  if (!time) return "—";
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function getFilters() {
  return {
    driver: document.getElementById("filterDriver").value.toLowerCase(),
    vehicle: document.getElementById("filterVehicle").value.toLowerCase(),
    from: document.getElementById("filterTimeFrom").value,
    to: document.getElementById("filterTimeTo").value
  };
}

// ==================== ANALOG 24H CLOCK ====================

function initClock() {
  clockCanvas = document.getElementById("clockCanvas");
  ctx = clockCanvas.getContext("2d");
  
  clockCanvas.addEventListener("mousedown", handleClockMouseDown);
  clockCanvas.addEventListener("mousemove", handleClockMouseMove);
  clockCanvas.addEventListener("mouseup", handleClockMouseUp);
  clockCanvas.addEventListener("mouseleave", handleClockMouseUp);
  
  // Touch support
  clockCanvas.addEventListener("touchstart", handleClockTouch);
  clockCanvas.addEventListener("touchmove", handleClockTouch);
  clockCanvas.addEventListener("touchend", handleClockMouseUp);
}

function drawClock() {
  const centerX = clockCanvas.width / 2;
  const centerY = clockCanvas.height / 2;
  const radius = 120;

  ctx.clearRect(0, 0, clockCanvas.width, clockCanvas.height);

  // Background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 8;
  ctx.stroke();

  // Hour markers (24h)
  for (let i = 0; i < 24; i++) {
    const angle = (i * 15) * (Math.PI / 180) - Math.PI / 2; // 15 degrees per hour
    const x1 = centerX + Math.cos(angle) * (radius - 20);
    const y1 = centerY + Math.sin(angle) * (radius - 20);
    const x2 = centerX + Math.cos(angle) * (radius - 5);
    const y2 = centerY + Math.sin(angle) * (radius - 5);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = i % 6 === 0 ? "#38bdf8" : "#475569";
    ctx.lineWidth = i % 6 === 0 ? 4 : 2;
    ctx.stroke();

    // Hour labels
    if (i % 2 === 0) {
      const labelX = centerX + Math.cos(angle) * (radius - 38);
      const labelY = centerY + Math.sin(angle) * (radius - 38) + 5;
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i).padStart(2, '0'), labelX, labelY);
    }
  }

  // Minute marks
  for (let i = 0; i < 60; i++) {
    if (i % 5 !== 0) {
      const angle = (i * 6) * (Math.PI / 180) - Math.PI / 2;
      const x1 = centerX + Math.cos(angle) * (radius - 12);
      const y1 = centerY + Math.sin(angle) * (radius - 12);
      const x2 = centerX + Math.cos(angle) * (radius - 5);
      const y2 = centerY + Math.sin(angle) * (radius - 5);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Hour hand (thicker, shorter)
  const hourAngle = ((selectedHour % 12) * 30 + selectedMinute * 0.5) * (Math.PI / 180) - Math.PI / 2;
  drawHand(centerX, centerY, radius * 0.55, hourAngle, 9, "#38bdf8");

  // Minute hand
  const minuteAngle = (selectedMinute * 6) * (Math.PI / 180) - Math.PI / 2;
  drawHand(centerX, centerY, radius * 0.85, minuteAngle, 5, "#e2e8f0");

  // Center dot
  ctx.beginPath();
  ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawHand(x, y, length, angle, width, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x + Math.cos(angle) * length,
    y + Math.sin(angle) * length
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
}

function getTimeFromPosition(x, y) {
  const rect = clockCanvas.getBoundingClientRect();
  const centerX = rect.left + clockCanvas.width / 2;
  const centerY = rect.top + clockCanvas.height / 2;
  
  const dx = x - centerX;
  const dy = y - centerY;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // offset for 12 o'clock
  
  if (angle < 0) angle += 360;

  // Determine if we're selecting hour or minute based on distance
  const distance = Math.sqrt(dx*dx + dy*dy);
  const radius = 120;

  if (distance < radius * 0.65) {
    // Hour selection (inner area)
    selectedHour = Math.round(angle / 15) % 24;
  } else {
    // Minute selection (outer area)
    selectedMinute = Math.round(angle / 6) % 60;
  }

  updateTimeDisplay();
  drawClock();
}

function updateTimeDisplay() {
  const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  document.getElementById("selectedTime").textContent = timeStr;
}

function handleClockMouseDown(e) {
  isDragging = true;
  getTimeFromPosition(e.clientX, e.clientY);
}

function handleClockMouseMove(e) {
  if (isDragging) {
    getTimeFromPosition(e.clientX, e.clientY);
  }
}

function handleClockMouseUp() {
  isDragging = false;
}

function handleClockTouch(e) {
  e.preventDefault();
  if (e.touches.length > 0) {
    isDragging = true;
    getTimeFromPosition(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function showTimePicker(inputElement) {
  currentTimeInput = inputElement;
  
  // Parse existing time if any
  const currentVal = inputElement.value;
  if (currentVal && currentVal.includes(":")) {
    const [h, m] = currentVal.split(":").map(Number);
    selectedHour = isNaN(h) ? 0 : h;
    selectedMinute = isNaN(m) ? 0 : m;
  } else {
    selectedHour = 8;
    selectedMinute = 0;
  }

  document.getElementById("timePickerModal").style.display = "flex";
  
  if (!clockCanvas) initClock();
  updateTimeDisplay();
  drawClock();
}

function confirmTimePicker() {
  if (currentTimeInput) {
    const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    currentTimeInput.value = timeStr;
  }
  closeTimePicker();
  // Auto refresh table if filter was changed
  if (currentTimeInput && (currentTimeInput.id === "filterTimeFrom" || currentTimeInput.id === "filterTimeTo")) {
    renderTable();
  }
}

function cancelTimePicker() {
  closeTimePicker();
}

function closeTimePicker() {
  document.getElementById("timePickerModal").style.display = "none";
  currentTimeInput = null;
}

// ==================== REST OF APP ====================

function sortTable(column) {
  if (currentSort === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    currentSort = column;
    sortDirection = "asc";
  }
  renderTable();
}

function compareValues(a, b) {
  a = a || "";
  b = b || "";
  a = String(a).toLowerCase();
  b = String(b).toLowerCase();
  if (a < b) return sortDirection === "asc" ? -1 : 1;
  if (a > b) return sortDirection === "asc" ? 1 : -1;
  return 0;
}

function renderTable() {
  const body = document.getElementById("tableBody");
  const data = getData();
  const f = getFilters();

  body.innerHTML = "";

  const fromMin = toMinutes(f.from);
  const toMin = toMinutes(f.to);

  let filtered = data.filter(item => {
    const matchDriver = item.driver.toLowerCase().includes(f.driver);
    const matchVehicle = item.vehicle.toLowerCase().includes(f.vehicle);

    const times = [
      toMinutes(item.chargeStart),
      toMinutes(item.chargeEnd)
    ].filter(t => t !== null);

    let matchTime = true;

    if (fromMin !== null) {
      matchTime = times.some(t => t >= fromMin);
    }
    if (toMin !== null) {
      matchTime = matchTime && times.some(t => t <= toMin);
    }

    return matchDriver && matchVehicle && matchTime;
  });

  if (currentSort) {
    filtered.sort((a, b) => {
      switch (currentSort) {
        case "driver": return compareValues(a.driver, b.driver);
        case "vehicle": return compareValues(a.vehicle, b.vehicle);
        case "date": return compareValues(a.date, b.date);
        case "shift": return compareValues(a.shift, b.shift);
        case "chargeStart": return compareValues(a.chargeStart, b.chargeStart);
        case "chargeEnd": return compareValues(a.chargeEnd, b.chargeEnd);
        default: return 0;
      }
    });
  }

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7">Nema rezultata</td></tr>`;
    return;
  }

  filtered.forEach(item => {
    body.innerHTML += `
      <tr>
        <td>${clean(item.driver)}</td>
        <td>${clean(item.vehicle)}</td>
        <td>${clean(item.date)}</td>
        <td>${clean(item.shift)}</td>
        <td>${format24(item.chargeStart)}</td>
        <td>${format24(item.chargeEnd)}</td>
        <td>
          <button onclick="deleteRow('${item.id}')">X</button>
        </td>
      </tr>
    `;
  });
}

function resetFilter() {
  document.getElementById("filterDriver").value = "";
  document.getElementById("filterVehicle").value = "";
  document.getElementById("filterTimeFrom").value = "";
  document.getElementById("filterTimeTo").value = "";
  renderTable();
}

function addRow() {
  const driver = document.getElementById("driver").value;
  const vehicle = document.getElementById("vehicle").value;
  const date = document.getElementById("date").value;
  const shift = document.getElementById("shift").value;
  const chargeStart = document.getElementById("chargeStart").value;
  const chargeEnd = document.getElementById("chargeEnd").value;

  if (!driver.trim() || !vehicle.trim() || !date.trim()) {
    alert("Unesite vozača, vozilo i datum");
    return;
  }

  const data = getData();
  data.push({
    id: Date.now().toString(),
    driver: driver.trim(),
    vehicle: vehicle.trim(),
    date,
    shift: shift.trim(),
    chargeStart,
    chargeEnd
  });

  saveData(data);
  renderTable();

  // Clear inputs
  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("date").value = "";
  document.getElementById("shift").value = "";
  document.getElementById("chargeStart").value = "";
  document.getElementById("chargeEnd").value = "";
}

function deleteRow(id) {
  let data = getData();
  data = data.filter(item => item.id !== id);
  saveData(data);
  renderTable();
}

window.onload = () => {
  renderTable();
  // Clock will be initialized on first use
};
