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

// Inicijalizacija baze podataka preko punog Config-a
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const dbRef = firebase.database().ref("raspored");

let currentSort = "";
let sortDirection = "asc";
let fpInstances = [];
let globalData = []; 

// Bilježimo tačno vrijeme pokretanja aplikacije na uređaju (u milisekundama)
const appOpenTimestamp = Date.now();

window.onload = function() {
  initTimePickers();
  
  // 1. Sinhronizacija u realnom vremenu na svim uređajima istovremeno
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

  // 2. Slušaj kada neko DODA novi unos na bilo kom uređaju
  dbRef.on("child_added", function(snapshot) {
    const newEntry = snapshot.val();
    
    // Sigurnosna provjera: ako unos nema createdAt (stari podatak), ignorisemo notifikaciju ali aplikacija nastavlja da radi
    if (newEntry && newEntry.createdAt && newEntry.createdAt > appOpenTimestamp) {
      const driver = newEntry.driver || '—';
      const vehicle = newEntry.vehicle || '—';
      const start = format24(newEntry.chargeStart);
      const end = format24(newEntry.chargeEnd);
      
      showToast(`➕ Dodat raspored:\nVozač: ${driver}\nVozilo: ${vehicle}\nVrijeme: ${start} - ${end}`);
    }
  });

  // 3. Slušaj kada neko OBRIŠE unos na bilo kom uređaju
  dbRef.on("child_removed", function(snapshot) {
    const deletedEntry = snapshot.val();
    
    if (deletedEntry) {
      const driver = deletedEntry.driver || '—';
      const vehicle = deletedEntry.vehicle || '—';
      const start = format24(deletedEntry.chargeStart);
      const end = format24(deletedEntry.chargeEnd);
      
      showToast(`❌ Obrisan raspored:\nVozač: ${driver}\nVozilo: ${vehicle}\nVrijeme: ${start} - ${end}`, true);
    }
  });
};

// Inicijalizacija pop-up satova za sva 4 polja (2 u filteru, 2 u unosu)
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
      renderTable(); // Automatski filtrira tabelu čim se izabere sat u filteru
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
  const vehicle = document.getElementById("vehicle").value;
  const date = document.getElementById("date").value;
  const shift = document.getElementById("shift").value;
  const chargeStart = document.getElementById("chargeStart").value;
  const chargeEnd = document.getElementById("chargeEnd").value;

  if (!driver.trim() || !vehicle.trim() || !date.trim()) {
    alert("Unesite vozača, vozilo i datum");
    return;
  }

  // Slanje u bazu sa vremenskim pečatom kreiranja
  dbRef.push({
    driver: driver.trim(),
    vehicle: vehicle.trim(),
    date,
    shift: shift.trim(),
    chargeStart,
    chargeEnd,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  }).catch(function(error) {
    alert("Greška pri upisu u bazu: " + error.message);
  });

  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("date").value = "";
  document.getElementById("shift").value = "";
  
  if (document.getElementById("chargeStart") && document.getElementById("chargeStart")._flatpickr) {
    document.getElementById("chargeStart")._flatpickr.clear();
  }
  if (document.getElementById("chargeEnd") && document.getElementById("chargeEnd")._flatpickr) {
    document.getElementById("chargeEnd")._flatpickr.clear();
  }
}

function deleteRow(id) {
  if (confirm("Da li ste sigurni da želite da obrišete ovaj unos?")) {
    firebase.database().ref("raspored/" + id).remove().catch(function(error) {
      alert("Greška pri brisanju: " + error.message);
    });
  }
}

// Prikaz prozorčića
function showToast(message, isDelete = false) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = isDelete ? "toast toast-delete" : "toast";
  
  toast.style.whiteSpace = "pre-line";
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.5s ease-out forwards";
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 5000);
}
