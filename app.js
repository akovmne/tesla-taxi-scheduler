const KEY = "raspored";

// 📦 load
function getData() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

// 💾 save
function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// 🧼 clean
function clean(v) {
  return v && v.trim() !== "" ? v : "—";
}

// ⏰ convert HH:MM → minutes
function toMinutes(t) {
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length < 2) return null;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
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

    // time check
    let matchTime = true;

    if (fromMin !== null || toMin !== null) {

      const times = [
        toMinutes(item.chargeStart),
        toMinutes(item.chargeEnd),
        toMinutes(item.shift?.split(" - ")[0])
      ].filter(t => t !== null);

      matchTime = times.some(t => {
        if (fromMin !== null && t < fromMin) return false;
        if (toMin !== null && t > toMin) return false;
        return true;
      });
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
        <td>${clean(item.chargeStart)}</td>
        <td>${clean(item.chargeEnd)}</td>
        <td><button onclick="deleteRow('${item.id}')">X</button></td>
      </tr>
    `;
  });
}

// ♻️ reset filter
function resetFilter() {
  document.getElementById("filterDriver").value = "";
  document.getElementById("filterVehicle").value = "";
  document.getElementById("filterTimeFrom").value = "";
  document.getElementById("filterTimeTo").value = "";
  renderTable();
}

// ➕ add
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
