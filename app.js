const KEY = "raspored";

let currentSort = "";
let sortDirection = "asc";

// Time picker variables
let currentTimeInput = null;

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

// ==================== DIGITAL TIME PICKER ====================

function populateTimeSelects() {
  const hourSelect = document.getElementById("hourSelect");
  const minuteSelect = document.getElementById("minuteSelect");
  
  hourSelect.innerHTML = "";
  minuteSelect.innerHTML = "";

  for (let h = 0; h < 24; h++) {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = String(h).padStart(2, '0');
    hourSelect.appendChild(option);
  }

  for (let m = 0; m < 60; m++) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = String(m).padStart(2, '0');
    minuteSelect.appendChild(option);
  }
}

function showTimePicker(inputElement) {
  currentTimeInput = inputElement;
  populateTimeSelects();

  // Load existing time if any
  const currentVal = inputElement.value;
  if (currentVal && currentVal.includes(":")) {
    const [h, m] = currentVal.split(":").map(Number);
    document.getElementById("hourSelect").value = h;
    document.getElementById("minuteSelect").value = m;
  } else {
    document.getElementById("hourSelect").value = 8;
    document.getElementById("minuteSelect").value = 0;
  }

  document.getElementById("timePickerModal").style.display = "flex";
}

function setNowTime() {
  const now = new Date();
  document.getElementById("hourSelect").value = now.getHours();
  document.getElementById("minuteSelect").value = now.getMinutes();
}

function confirmTimePicker() {
  if (currentTimeInput) {
    const hour = document.getElementById("hourSelect").value.padStart(2, '0');
    const minute = document.getElementById("minuteSelect").value.padStart(2, '0');
    currentTimeInput.value = `${hour}:${minute}`;
    
    // Auto refresh table if it's a filter field
    if (currentTimeInput.id === "filterTimeFrom" || currentTimeInput.id === "filterTimeTo") {
      renderTable();
    }
  }
  closeTimePicker();
}

function cancelTimePicker() {
  closeTimePicker();
}

function closeTimePicker() {
  document.getElementById("timePickerModal").style.display = "none";
  currentTimeInput = null;
}

// ==================== REST OF APP ====================

function sortTable(column) { ... }   // (same as before)

function compareValues(a, b) { ... } // (same as before)

function renderTable() { ... }       // (same as before)

function resetFilter() { ... }       // (same as before)

function addRow() { ... }            // (same as before)

function deleteRow(id) { ... }       // (same as before)

window.onload = () => {
  renderTable();
};
