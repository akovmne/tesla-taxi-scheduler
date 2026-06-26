// Konfiguracija tvog Firebase projekta
const firebaseConfig = {
  apiKey: "AIzaSyA_wcdHfOVXJkS4Sm6ihjhaeGyrRjH9r1w",
  authDomain: "tesla-punjaci.firebaseapp.com",
  databaseURL: "https://tesla-punjaci-default-rtdb.firebaseio.com",
  projectId: "tesla-punjaci",
  storageBucket: "tesla-punjaci.firebasestorage.app",
  messagingSenderId: "140620994358",
  appId: "1:140620994358:web:9bd2cbeaee436edea00597"
};

// Inicijalizacija baze podataka
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const dbRef = firebase.database().ref("raspored");

let currentSort = "";
let sortDirection = "asc";
let fpInstances = [];
let globalData = []; 
let isInitialLoad = true; // Sprečava lažne notifikacije starih unosa pri osvežavanju stranice

// Niz koji čuva ID-eve unosa za koje je već prikazana notifikacija o brisanju (sprečava dupliranje)
let notifiedDeletions = [];

window.onload = function() {
  initTimePickers();
  
  // Sinhronizacija u realnom vremenu na svim uređajima istovremeno
  dbRef.on("value", function(snapshot) {
    const dataObj = snapshot.val() || {};
    
    globalData = Object.keys(dataObj).map(key => ({
      id: key,
      ...dataObj[key]
    }));
    
    renderTable();
    isInitialLoad = false; // Nakon prvog povlačenja podataka, aktiviramo "live" režim za obaveštenja
  }, function(error) {
    console.error("Greška pri čitanju iz Firebase baze: ", error);
  });

  // Prati kada bilo ko doda novi red u bazu podataka
  dbRef.on("child_added", function(snapshot) {
    if (isInitialLoad) return; 
    const newEntry = snapshot.val();
    showNotification(newEntry, "add");
  });

  // Prati kada je red uklonjen (reaguje na akcije sa svih uređaja)
  dbRef.on("child_removed", function(snapshot) {
    if (isInitialLoad) return;
    const deletedId = snapshot.key;
    const deletedEntry = snapshot.val();
    
    // Ako za ovaj ID već NISMO prikazali poruku (npr. obrisao je neko drugi na svom telefonu)
    if (!notifiedDeletions.includes(deletedId)) {
      if (deletedEntry && deletedEntry.driver) {
        notifiedDeletions.push(deletedId);
        showNotification(deletedEntry, "delete");
      }
    }
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
  const cleanTime = String(t).trim();
  const [h, m] = cleanTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function getFilters() {
  const driverEl = document.getElementById("filterDriver");
  const vehicleEl = document.getElementById("filterVehicle");
  const shiftEl = document.getElementById("filterShift");
  const fromEl = document.getElementById("filterTimeFrom");
  const toEl = document.getElementById("filterTimeTo");

  return {
    driver: driverEl ? driverEl.value.toLowerCase().trim() : "",
    vehicle: vehicleEl ? vehicleEl.value.toLowerCase().trim() : "",
    shift: shiftEl ? shiftEl.value.toLowerCase().trim() : "",
    from: fromEl ? fromEl.value : "",
    to: toEl ? toEl.value : ""
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

function compareValues(a, b, isDate = false) {
  a = a || "";
  b = b || "";

  if (isDate) {
    const timeA = a ? new Date(a).getTime() : 0;
    const timeB = b ? new Date(b).getTime() : 0;
    return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
  }

  a = String(a).toLowerCase();
  b = String(b).toLowerCase();

  if (a < b) return sortDirection === "asc" ? -1 : 1;
  if (a > b) return sortDirection === "asc" ? 1 : -1;
  return 0;
}

function renderTable() {
  const body = document.getElementById("tableBody");
  if (!body) return;

  const f = getFilters();
  body.innerHTML = "";

  const fromMin = toMinutes(f.from);
  const toMin = toMinutes(f.to);

  let filtered = globalData.filter(item => {
    const matchDriver = String(item.driver || "").toLowerCase().includes(f.driver);
    const matchVehicle = String(item.vehicle || "").toLowerCase().includes(f.vehicle);
    const matchShift = String(item.shift || "").toLowerCase().includes(f.shift);

    const startMin = toMinutes(item.chargeStart);
    const endMin = toMinutes(item.chargeEnd);

    let matchTime = true;

    if (fromMin !== null && toMin === null) {
      matchTime = (startMin !== null && startMin >= fromMin);
    }
    else if (fromMin === null && toMin !== null) {
      matchTime = (endMin !== null && endMin <= toMin);
    }
    else if (fromMin !== null && toMin !== null) {
      matchTime = (startMin !== null && startMin >= fromMin) && (endMin !== null && endMin <= toMin);
    }

    return matchDriver && matchVehicle && matchShift && matchTime;
  });

  if (currentSort) {
    filtered.sort((a, b) => {
      if (currentSort === "date") {
        return compareValues(a.date, b.date, true);
      }
      return compareValues(a[currentSort], b[currentSort], false);
    });
  }

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center; background:#1e293b;">Nema rezultata</td></tr>`;
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
          <button class="delete-btn" onclick="deleteRow('${item.id}')" style="padding: 4px 8px; margin: 0;">X</button>
        </td>
      </tr>
    `;
  });
}

function resetFilter() {
  if (document.getElementById("filterDriver")) document.getElementById("filterDriver").value = "";
  if (document.getElementById("filterVehicle")) document.getElementById("filterVehicle").value = "";
  if (document.getElementById("filterShift")) document.getElementById("filterShift").value = "";
  
  if (document.getElementById("filterTimeFrom") && document.getElementById("filterTimeFrom")._flatpickr) {
    document.getElementById("filterTimeFrom")._flatpickr.clear();
  }
  if (document.getElementById("filterTimeTo") && document.getElementById("filterTimeTo")._flatpickr) {
    document.getElementById("filterTimeTo")._flatpickr.clear();
  }

  renderTable();
}

function addRow() {
  const driver = document.getElementById("driver").value;
  const vehicle = document.getElementById("vehicle").value.trim().toUpperCase();
  const date = document.getElementById("date").value; 
  const shift = document.getElementById("shift").value;
  const chargeStart = document.getElementById("chargeStart").value; 
  const chargeEnd = document.getElementById("chargeEnd").value;     

  if (!driver.trim() || !vehicle.trim() || !date.trim() || !chargeStart || !chargeEnd) {
    alert("Unesite vozača, vozilo, datum, početak i kraj punjenja!");
    return;
  }

  const newStart = toMinutes(chargeStart);
  const newEnd = toMinutes(chargeEnd);

  if (
