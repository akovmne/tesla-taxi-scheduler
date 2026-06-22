const KEY = "raspored";

// 📦 load
function getData() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

// 💾 save
function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// 🧼 clean values
function clean(v) {
  return v && v.trim() !== "" ? v : "—";
}

// 🔎 filters
function getFilters() {
  return {
    driver: document.getElementById("filterDriver")?.value.toLowerCase() || "",
    vehicle: document.getElementById("filterVehicle")?.value.toLowerCase() || ""
  };
}

// 📊 render table
function renderTable() {
  const body = document.getElementById("tableBody");
  const data = getData();
  const filters = getFilters();

  body.innerHTML = "";

  const filtered = data.filter(item => {
    return (
      item.driver.toLowerCase().includes(filters.driver) &&
      item.vehicle.toLowerCase().includes(filters.vehicle)
    );
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
    id: Date.now().toString(), // 🔥 FIX: unique ID
    driver: driver.trim(),
    vehicle: vehicle.trim(),
    date,
    shift: shift.trim(),
    chargeStart: chargeStart.trim(),
    chargeEnd: chargeEnd.trim()
  });

  saveData(data);
  renderTable();

  // clear
  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("date").value = "";
  document.getElementById("shift").value = "";
  document.getElementById("chargeStart").value = "";
  document.getElementById("chargeEnd").value = "";
}

// ❌ delete (FIXED)
function deleteRow(id) {
  let data = getData();
  data = data.filter(item => item.id !== id);
  saveData(data);
  renderTable();
}

// 🚀 start
window.onload = renderTable;
