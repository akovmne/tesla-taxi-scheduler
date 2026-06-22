const KEY = "raspored";

function getData() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// 🧼 display helper
function clean(v) {
  return v && v.trim() !== "" ? v : "—";
}

// ⏰ FORCE 24h formatting (important fix)
function formatTime24(t) {
  if (!t) return "—";

  // already 24h like "14:30"
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return t; // fallback

  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);

  if (isNaN(h) || isNaN(m)) return t;

  // normalize
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ⏰ convert for filtering
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// 🔎 filters
function getFilters() {
  return {
    driver: document.getElementById("filterDriver").value.toLowerCase(),
    vehicle: document.getElementById("filterVehicle").value.toLowerCase(),
    from: document.getElementById("filterTimeFrom").value,
    to: document.getElementById("filterTimeTo").value
  };
}

// 📊 render table
function renderTable() {
  const body = document.getElementById("tableBody");
  const data = getData();
  const f = getFilters();

  body.innerHTML = "";

  const fromMin = toMinutes(f.from);
  const toMin = toMinutes(f.to);

  const filtered = data.filter(item => {

    const matchDriver = item.driver.toLowerCase().includes(f.driver);
    const matchVehicle = item.vehicle.toLowerCase().includes(f.vehicle);

    const times = [
      toMinutes(item.chargeStart),
      toMinutes(item.chargeEnd),
      toMinutes(item.shift?.split(" - ")[0])
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

        <!-- 🔥 FORCE 24H DISPLAY HERE -->
        <td>${formatTime24(item.chargeStart)}</td>
        <td>${formatTime24(item.chargeEnd)}</td>

        <td><button onclick="deleteRow('${item.id}')">X</button></td>
      </tr>
    `;
  });
}

// ♻️ reset filters
function resetFilter() {
  document.getElementById("filterDriver").value = "";
  document.getElementById("filterVehicle").value = "";
  document.getElementById("filterTimeFrom").value = "";
  document.getElementById("filterTimeTo").value = "";
  renderTable();
}

// ➕ add row
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
    chargeStart: chargeStart.trim(),
    chargeEnd: chargeEnd.trim()
  });

  saveData(data);
  renderTable();

  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("date").value = "";
  document.getElementById("shift").value = "";
  document.getElementById("chargeStart").value = "";
  document.getElementById("chargeEnd").value = "";
}

// ❌ delete
function deleteRow(id) {
  let data = getData();
  data = data.filter(item => item.id !== id);
  saveData(data);
  renderTable();
}

window.onload = renderTable;
