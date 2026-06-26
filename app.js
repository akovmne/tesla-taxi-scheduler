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
let myDeletedId = null;   // Pamti ID koji je ovaj korisnik ručno obrisao da spreči duplu notifikaciju

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

  // Prati kada je red uklonjen (bilo sa ovog, bilo sa tuđeg uređaja)
  dbRef.on("child_removed", function(snapshot) {
    if (isInitialLoad) return;
    const deletedId = snapshot.key;
    const deletedEntry = snapshot.val();
    
    // AKO JE OVO OBRIŠU NA DRUGOM TELEFONU: Prikazuje se notifikacija
    // Ako smo obrisali mi sami, preskačemo jer je deleteRow() već izbacio poruku
    if (deletedId !== myDeletedId) {
      if (deletedEntry && deletedEntry.driver) {
        showNotification(deletedEntry, "delete");
      }
    } else {
      // Resetujemo marker čim prođe provera, spremno za sledeće brisanje
      myDeletedId = null;
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

  if (newStart === null || newEnd === null) {
    alert("Greška u formatu vremena!");
    return;
  }

  if (newStart >= newEnd) {
    alert("Kraj punjenja mora biti nakon početka punjenja!");
    return;
  }

  const targetDate = String(date).trim();
  let maxSimultaneous = 0; 
  let conflicts = new Set();

  for (let minute = newStart; minute < newEnd; minute++) {
    let activeVehiclesAtThisMinute = 0;

    for (let i = 0; i < globalData.length; i++) {
      const existing = globalData[i];

      if (String(existing.date).trim() === targetDate) {
        const extStart = toMinutes(existing.chargeStart);
        const extEnd = toMinutes(existing.chargeEnd);

        if (extStart !== null && extEnd !== null) {
          if (minute >= extStart && minute < extEnd) {
            activeVehiclesAtThisMinute++;
            conflicts.add(`• Vozač: ${existing.driver} (${existing.vehicle}) [${existing.chargeStart} - ${existing.chargeEnd}]`);
          }
        }
      }
    }

    if (activeVehiclesAtThisMinute > maxSimultaneous) {
      maxSimultaneous = activeVehiclesAtThisMinute;
    }
  }

  if (maxSimultaneous >= 2) {
    const conflictList = Array.from(conflicts).join("\n");
    alert(`⚠️ SVA MESTA NA PUNJAČIMA SU ZAUZETA!\n\nU traženom periodu već postoje unosi koji popunjavaju oba mesta:\n${conflictList}\n\nNemoguće je dodati treći unos.`);
    return;
  }

  dbRef.push({
    driver: driver.trim(),
    vehicle: vehicle,
    date: targetDate,
    shift: shift.trim(),
    chargeStart: String(chargeStart).trim(),
    chargeEnd: String(chargeEnd).trim()
  }).then(() => {
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
  }).catch(function(error) {
    alert("Greška pri upisu u bazu: " + error.message);
  });
}

function deleteRow(id) {
  const matchEntry = globalData.find(item => item.id === id);

  if (!matchEntry) {
    alert("Greška: Unos nije pronađen u tabeli.");
    return;
  }

  if (confirm(`Da li ste sigurni da želite da obrišete termin za vozača ${matchEntry.driver}?`)) {
    // Pamti se ID koji smo obrisali kako bi sprečili dupliranje poruke preko child_removed slušača
    myDeletedId = id;

    // Odmah aktiviramo lokalnu notifikaciju na ekranu
    showNotification(matchEntry, "delete");

    // Šaljemo naredbu za brisanje u Firebase bazu
    firebase.database().ref("raspored/" + id).remove().catch(function(error) {
      alert("Greška pri brisanju sa servera: " + error.message);
      myDeletedId = null; // Resetujemo u slučaju neuspeha na mreži
    });
  }
}

function showNotification(data, type = "add") {
  const container = document.getElementById("notification-container");
  if (!container) return; 

  const toast = document.createElement("div");
  toast.className = "notification-toast";

  if (type === "delete") {
    toast.style.borderLeft = "5px solid #ef4444"; 
    toast.innerHTML = `
      <strong style="color: #ef4444;">❌ Izbrisan termin!</strong><br>
      👤 <b>Vozač:</b> ${data.driver || "—"}<br>
      🚖 <b>Vozilo:</b> ${data.vehicle || "—"}<br>
      📅 <b>Datum:</b> ${data.date || "—"}
