const KEY = "raspored";

// 📦 Load data
function getData() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

// 💾 Save data
function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// 🧼 Clean empty values
function clean(value) {
  return value && value.trim() !== "" ? value : "—";
}

// 📊 Render table
function renderTable() {
  const body = document.getElementById("tableBody");
  const data = getData();

  body.innerHTML = "";

  if (data.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="7">Nema unosa</td>
      </tr>
    `;
    return;
  }

  data.forEach((item, index) => {
    body.innerHTML += `
      <tr>
        <td>${clean(item.driver)}</td>
        <td>${clean(item.vehicle)}</td>
        <td>${clean(item.date)}</td>
        <td>${clean(item.shift)}</td>
        <td>${clean(item.chargeStart)}</td>
        <td>${clean(item.chargeEnd)}</td>
        <td><button onclick="deleteRow(${index})">X</button></td>
      </tr>
    `;
  });
}

// ➕ Add row
function addRow() {
  const driver = document.getElementById("driver").value;
  const vehicle = document.getElementById("vehicle").value;
  const date = document.getElementById("date").value;
  const shift = document.getElementById("shift").value;
  const chargeStart = document.getElementById("chargeStart").value;
  const chargeEnd = document.getElementById("chargeEnd").value;

  // required fields
  if (!driver.trim() || !vehicle.trim() || !date.trim()) {
    alert("Unesite: vozača, vozilo i datum");
    return;
  }

  const data = getData();

  data.push({
    driver: driver.trim(),
    vehicle: vehicle.trim(),
    date,
    shift: shift.trim(),
    chargeStart: chargeStart.trim(),
    chargeEnd: chargeEnd.trim()
  });

  saveData(data);
  renderTable();

  // clear inputs
  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("date").value = "";
  document.getElementById("shift").value = "";
  document.getElementById("chargeStart").value = "";
  document.getElementById("chargeEnd").value = "";
}

// ❌ Delete row
function deleteRow(index) {
  const data = getData();
  data.splice(index, 1);
  saveData(data);
  renderTable();
}

// 🚀 init
window.onload = renderTable;
