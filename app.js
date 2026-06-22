const KEY = "raspored";

function getData() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function renderTable() {
  const body = document.getElementById("tableBody");
  const data = getData();

  body.innerHTML = "";

  data.forEach((item, index) => {
    body.innerHTML += `
      <tr>
        <td>${item.driver}</td>
        <td>${item.vehicle}</td>
        <td>${item.date}</td>
        <td>${item.shift}</td>
        <td>${item.chargeStart}</td>
        <td>${item.chargeEnd}</td>
        <td><button onclick="deleteRow(${index})">X</button></td>
      </tr>
    `;
  });
}

function addRow() {
  const driver = document.getElementById("driver").value;
  const vehicle = document.getElementById("vehicle").value;
  const date = document.getElementById("date").value;

  if (!driver || !vehicle || !date) {
    alert("Morate unijeti ime vozača, vozilo i datum");
    return;
  }

  const data = getData();

  data.push({
    driver,
    vehicle,
    date,
    shift: document.getElementById("shift").value,
    chargeStart: document.getElementById("chargeStart").value,
    chargeEnd: document.getElementById("chargeEnd").value
  });

  saveData(data);
  renderTable();
}

function deleteRow(index) {
  const data = getData();
  data.splice(index, 1);
  saveData(data);
  renderTable();
}

window.onload = renderTable;
