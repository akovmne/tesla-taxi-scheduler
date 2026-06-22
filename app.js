function getData() {
  return JSON.parse(localStorage.getItem("schedule") || "[]");
}

function saveData(data) {
  localStorage.setItem("schedule", JSON.stringify(data));
}

function renderTable() {
  const data = getData();
  const body = document.getElementById("tableBody");

  body.innerHTML = "";

  data.forEach((item, index) => {
    body.innerHTML += `
      <tr>
        <td>${item.driver}</td>
        <td>${item.date}</td>
        <td>${item.shift}</td>
        <td>${item.chargeStart}</td>
        <td>${item.chargeEnd}</td>
        <td><button class="delete" onclick="deleteRow(${index})">X</button></td>
      </tr>
    `;
  });
}

function addRow() {
  const driver = document.getElementById("driver").value;
  const date = document.getElementById("date").value;
  const shift = document.getElementById("shift").value;
  const chargeStart = document.getElementById("chargeStart").value;
  const chargeEnd = document.getElementById("chargeEnd").value;

  if (!driver || !date) {
    alert("Driver and date required");
    return;
  }

  const data = getData();

  data.push({
    driver,
    date,
    shift,
    chargeStart,
    chargeEnd
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

renderTable();
