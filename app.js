const KEY = "raspored";

function getData() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// 🧼 fallback display
function clean(v) {
  return v && v.trim() !== "" ? v : "—";
}

// ⏰ FORCE 24H DISPLAY (no AM/PM possible)
function format24(t) {
  if (!t) return "—";

  // if already HH:MM just normalize
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return t;

  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);

  if (isNaN(h) || isNaN(m)) return t;

  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

// ⏰ convert time → minutes
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
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
    ].
