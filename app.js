const firebaseConfig = {
  apiKey: "AIzaSyA_wcdHfOVXJkS4Sm6ihjhaeGyrRjH9r1w",
  authDomain: "tesla-punjaci.firebaseapp.com",
  databaseURL: "https://tesla-punjaci-default-rtdb.firebaseio.com",
  projectId: "tesla-punjaci",
  storageBucket: "tesla-punjaci.firebasestorage.app",
  messagingSenderId: "140620994358",
  appId: "1:140620994358:web:9bd2cbeaee436edea00597"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const dbRef = firebase.database().ref("raspored");

let currentSort = "";
let sortDirection = "asc";
let fpInstances = [];
let globalData = []; 
let isInitialLoad = true; // Sprečava lažne notifikacije starih unosa pri osvežavanju

window.onload = function() {
  initTimePickers();
  
  // Sinhronizacija tabele u realnom vremenu
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

  // Slušač koji reaguje čim bilo ko unese novi red u bazu podataka
  dbRef.on("child_added", function(snapshot) {
    if (isInitialLoad) return; // Ignoriši stare zapise pri učitavanju
    const newEntry = snapshot.val();
    showNotification(newEntry);
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

    // Ako je upisan samo početak filtera, traži sve termine od tog vremena pa nadalje
    if (fromMin !== null && toMin === null) {
      matchTime = (startMin !== null && startMin >= fromMin);
    }
    // Ako je upisan samo kraj filtera
    else if (fromMin === null && toMin !== null) {
      matchTime = (endMin !== null && endMin <= toMin);
    }
    // Ako su upisana oba vremena, traži presek
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

  if (newStart >= newEnd) {
    alert("Kraj punjenja mora biti nakon početka punjenja!");
    return;
  }

  // --- LOGIKA PROVERE PREKLAPANJA TERMINA ZA ISTO VOZILO I ISTI DAN ---
  let occupiedBy = null;
  
  for (let i = 0; i < globalData.length; i++) {
    const existing = globalData[i];
    
    // Provera da li je isti datum i isto vozilo
    if (existing.date === date && existing.vehicle.trim().toUpperCase() === vehicle) {
      const extStart = toMinutes(existing.chargeStart);
      const extEnd = toMinutes(existing.chargeEnd);
      
      if (extStart !== null && extEnd !== null) {
        // Uslov za preklapanje vremenskih intervala
        if (newStart < extEnd && newEnd > extStart) {
          occupiedBy = existing;
          break;
        }
      }
    }
  }

  if (occupiedBy) {
    alert(`⚠️ TERMIN JE ZAUZET!\n\nVozač: ${occupiedBy.driver}\nVozilo: ${occupiedBy.vehicle}\nTermin: ${occupiedBy.chargeStart}h - ${occupiedBy.chargeEnd}h`);
    return;
  }
  // -----------------------------------------------------------------

  dbRef.push({
    driver: driver.trim(),
    vehicle: vehicle,
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

// Funkcija za generisanje popup prozorčića u uglu ekrana za nove unose
function showNotification(data) {
  const container = document.getElementById("notification-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "notification-toast";
  toast.innerHTML = `
    <strong>⚡ Dodat novi termin!</strong><br>
    👤 <b>Vozač:</b> ${data.driver}<br>
    🚖 <b>Vozilo:</b> ${data.vehicle}<br>
    🕒 <b>Punjenje:</b> ${data.chargeStart} - ${data.chargeEnd}
  `;

  container.appendChild(toast);

  // Automatski briše obaveštenje sa ekrana nakon 6 sekundi
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "scale(0.9)";
    toast.style.transition = "all 0.4s ease";
    setTimeout(() => toast.remove(), 400);
  }, 6000);
}
