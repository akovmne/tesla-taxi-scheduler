const firebaseConfig = {
  apiKey: "AIzaSyA_wcdHfOVXJkS4Sm6ihjhaeGyrRjH9r1w",
  authDomain: "tesla-punjaci.firebaseapp.com",
  databaseURL: "https://tesla-punjaci-default-rtdb.firebaseio.com",
  projectId: "tesla-punjaci",
  storageBucket: "tesla-punjaci.firebasestorage.app",
  messagingSenderId: "140620994358",
  appId: "1:140620994358:web:9bd2cbeaee436edea00597"
};
// Inicijalizacija baze podataka preko punog Config-a
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const dbRef = firebase.database().ref("raspored");

let currentSort = "";
let sortDirection = "asc";
let fpInstances = [];
let globalData = []; 

window.onload = function() {
  initTimePickers();
  
  // Sinhronizacija u realnom vremenu na SVI uređajima istovremeno
  dbRef.on("value", function(snapshot) {
    const dataObj = snapshot.val() || {};
    
    globalData = Object.keys(dataObj).map(key => ({
      id: key,
      ...dataObj[key]
    }));
    
    renderTable();
  }, function(error) {
    console.error("Greška pri čitanju iz Firebase baze: ", error);
  });
};

function initTimePickers() {
  fpInstances.forEach(instance => instance.destroy());
  fpInstances = [];

  const instances = flatpickr(".time-picker", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
    time_24hr: true,
    minuteIncrement: 5, 
    disableMobile: "true",
    onChange: function() {
      renderTable();
    }
  });
  
  fpInstances = Array.isArray(instances) ? instances : [instances];
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
    driver: document.getElementById("filterDriver").value.toLowerCase().trim(),
    vehicle: document.getElementById("filterVehicle").value.toLowerCase().trim(),
    shift: document.getElementById("filterShift").value.toLowerCase().trim(),
    from: document.getElementById("filterTimeFrom").value,
    to: document.getElementById("filterTimeTo").value
  };
}

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
  const f = getFilters();

  body.innerHTML = "";

  const fromMin = toMinutes(f.from);
  const toMin = toMinutes(f.to);

  let filtered = globalData.filter(item => {
    const matchDriver = String(item.driver || "").toLowerCase().includes(f.driver);
    const matchVehicle = String(item.vehicle || "").toLowerCase().includes(f.vehicle);
    const matchShift = String(item.shift || "").toLowerCase().includes(f.shift);

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

    return matchDriver && matchVehicle && matchShift && matchTime;
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
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nema rezultata</td></tr>`;
    return;
  }

  filtered.forEach(item => {
    body.innerHTML += `
      <tr>
        <td data-label="Vozač">${clean(item.driver)}</td>
        <td data-label="Vozilo">${clean(item.vehicle)}</td>
        <td data-label="Datum">${clean(item.date)}</td>
        <td data-label="Smjena">${clean(item.shift)}</td>
        <td data-label="Početak">${format24(item.chargeStart)}</td>
        <td data-label="Kraj">${format24(item.chargeEnd)}</td>
        <td data-label="Akcija">
          <button class="delete-btn" onclick="deleteRow('${item.id}')">X</button>
        </td>
      </tr>
    `;
  });
}

function resetFilter() {
  document.getElementById("filterDriver").value = "";
  document.getElementById("filterVehicle").value = "";
  document.getElementById("filterShift").value = "";
  
  if (document.getElementById("filterTimeFrom")._flatpickr) {
    document.getElementById("filterTimeFrom")._flatpickr.clear();
  }
  if (document.getElementById("filterTimeTo")._flatpickr) {
    document.getElementById("filterTimeTo")._flatpickr.clear();
  }

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

  dbRef.push({
    driver: driver.trim(),
    vehicle: vehicle.trim(),
    date,
    shift: shift.trim(),
    chargeStart,
    chargeEnd
  }).catch(function(error) {
    alert("Greška pri upisu u bazu: " + error.message);
  });

  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("date").value = "";
  document.getElementById("shift").value = "";
  
  if (document.getElementById("chargeStart")._flatpickr) {
    document.getElementById("chargeStart")._flatpickr.clear();
  }
  if (document.getElementById("chargeEnd")._flatpickr) {
    document.getElementById("chargeEnd")._flatpickr.clear();
  }
}

function deleteRow(id) {
  firebase.database().ref("raspored/" + id).remove().catch(function(error) {
    alert("Greška pri brisanju: " + error.message);
  });
}
