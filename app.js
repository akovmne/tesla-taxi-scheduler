const KEY = "raspored";

let currentSort = "";
let sortDirection = "asc";

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

function sortTable(column) {

  if (currentSort === column) {
    sortDirection =
      sortDirection === "asc" ? "desc" : "asc";
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

  if (a < b)
    return sortDirection === "asc" ? -1 : 1;

  if (a > b)
    return sortDirection === "asc" ? 1 : -1;

  return 0;
}

function renderTable() {

  const body =
    document.getElementById("tableBody");

  const data = getData();

  const f = getFilters();

  body.innerHTML = "";

  const fromMin = toMinutes(f.from);
  const toMin = toMinutes(f.to);

  let filtered = data.filter(item => {

    const matchDriver =
      item.driver.toLowerCase().includes(f.driver);

    const matchVehicle =
      item.vehicle.toLowerCase().includes(f.vehicle);

    const times = [
      toMinutes(item.chargeStart),
      toMinutes(item.chargeEnd)
    ].filter(t => t !== null);

    let matchTime = true;

    if (fromMin !== null) {
      matchTime =
        times.some(t => t >= fromMin);
    }

    if (toMin !== null) {
      matchTime =
        matchTime &&
        times.some(t => t <= toMin);
    }

    return (
      matchDriver &&
      matchVehicle &&
      matchTime
    );
  });

  if (currentSort) {

    filtered.sort((a, b) => {

      switch (currentSort) {

        case "driver":
          return compareValues(
            a.driver,
            b.driver
          );

        case "vehicle":
          return compareValues(
            a.vehicle,
            b.vehicle
          );

        case "date":
          return compareValues(
            a.date,
            b.date
          );

        case "shift":
          return compareValues(
            a.shift,
            b.shift
          );

        case "chargeStart":
          return compareValues(
            a.chargeStart,
            b.chargeStart
          );

        case "chargeEnd":
          return compareValues(
            a.chargeEnd,
            b.chargeEnd
          );

        default:
          return 0;
      }
    });
  }

  if (filtered.length === 0) {

    body.innerHTML =
      `<tr>
        <td colspan="7">
          Nema rezultata
        </td>
      </tr>`;

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
          <button onclick="deleteRow('${item.id}')">
            X
          </button>
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

  const driver =
    document.getElementById("driver").value;

  const vehicle =
    document.getElementById("vehicle").value;

  const date =
    document.getElementById("date").value;

  const shift =
    document.getElementById("shift").value;

  const chargeStart =
    document.getElementById("chargeStart").value;

  const chargeEnd =
    document.getElementById("chargeEnd").value;

  if (
    !driver.trim() ||
    !vehicle.trim() ||
    !date.trim()
  ) {
    alert(
      "Unesite vozača, vozilo i datum"
    );
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

  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("date").value = "";
  document.getElementById("shift").value = "";
  document.getElementById("chargeStart").value = "";
  document.getElementById("chargeEnd").value = "";
}

function deleteRow(id) {

  let data = getData();

  data = data.filter(
    item => item.id !== id
  );

  saveData(data);

  renderTable();
}

window.onload = renderTable;
