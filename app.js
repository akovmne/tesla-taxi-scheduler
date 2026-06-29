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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const dbRef = firebase.database().ref("raspored");

let currentSort = "";
let sortDirection = "asc";
let globalData = []; 
let pickerInstances = [];

let isInitialLoad = true;

window.onload = function() {
  initGooglePickers();
  
  dbRef.once("value", function(snapshot) {
    const dataObj = snapshot.val() || {};
    globalData = Object.keys(dataObj).map(key => ({
      id: key,
      ...dataObj[key]
    }));
    renderTable();
    isInitialLoad = false;
  });

  dbRef.on("value", function(snapshot) {
    const dataObj = snapshot.val() || {};
    globalData = Object.keys(dataObj).map(key => ({
      id: key,
      ...dataObj[key]
    }));
    renderTable();
  });

  dbRef.on("child_added", function(snapshot) {
    if (isInitialLoad) return;
    const newEntry = snapshot.val();
    if (newEntry) {
      showToast(`➕ Dodat raspored:\nVozač: ${newEntry.driver || '—'}\nVozilo: ${newEntry.vehicle || '—'}\nVrijeme: ${format24(newEntry.chargeStart)} - ${format24(newEntry.chargeEnd)}`);
    }
  });

  dbRef.on("child_removed", function(snapshot) {
    if (isInitialLoad) return;
    const deletedEntry = snapshot.val();
    if (deletedEntry) {
      showToast(`❌ Obrisan raspored:\nVozač: ${deletedEntry.driver || '—'}\nVozilo: ${deletedEntry.vehicle || '—'}\nVrijeme: ${format24(deletedEntry.chargeStart)} - ${format24(deletedEntry.chargeEnd)}`, true);
    }
  });
};

function initGooglePickers() {
  pickerInstances.forEach(ins => ins.destroy());
  pickerInstances = [];

  // Google Kalendar za datum
  const datePickers = flatpickr(".date-picker", {
    locale: "sr",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d. M Y.",
    disableMobile: true,
    allowInput: false
  });

  // Google Sat za vreme
  const timePickers = flatpickr(".time-picker", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
    time_24hr: true,
    minuteIncrement: 15,
    disableMobile: true,
    allowInput: false,
    onChange: function() {
      renderTable();
    }
  });

  pickerInstances = [].concat(datePickers, timePickers);
}

function clean(v) {
  return v && v.trim() !== "" ? v : "—";
}

function format24(time) {
  if (!time) return "—";
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  return `${String(match[1]).padStart(2, "0")}:${String(match[2]).padStart(2, "0")}`;
}

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function getFilters() {
  return {
    driver: document.getElementById("filterDriver") ? document.getElementById("filterDriver").value.toLowerCase().trim() : "",
    vehicle: document.getElementById("filterVehicle") ? document.getElementById("filterVehicle").value.toLowerCase().trim() : "",
    shift: document.getElementById("filterShift") ? document.getElementById("filterShift").value.toLowerCase().trim() : "",
    from: document.getElementById("filterTimeFrom") ? document.getElementById("filterTimeFrom").value : "",
    to: document.getElementById("filterTimeTo") ? document.getElementById("filterTimeTo").value : ""
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
  a = a || ""; b = b || "";
  if (isDate) {
    return sortDirection === "asc" ? new Date(a).getTime() - new Date(b).getTime() : new Date(b).getTime() - new Date(a).getTime();
  }
  a = String(a).toLowerCase(); b = String(b).toLowerCase();
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

    const times = [toMinutes(item.chargeStart), toMinutes(item.chargeEnd)].filter(t => t !== null);
    let matchTime = true;
    if (fromMin !== null) matchTime = times.some(t => t >= fromMin);
    if (toMin !== null) matchTime = matchTime && times.some(t => t <= toMin);

    return matchDriver && matchVehicle && matchShift && matchTime;
  });

  if (currentSort) {
    filtered.sort((a, b) => {
      if (currentSort === "date") return compareValues(a.date, b.date, true);
      return compareValues(a[currentSort], b[currentSort], false);
    });
  }

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center; background:#1e293b;">Nema rezultata</td></tr>`;
    return;
  }

  filtered.forEach(item => {
    let prikazDatuma = item.date || "—";
    if(item.date && item.date !== "—") {
      const d = new Date(item.date);
      if(!isNaN(d.getTime())) {
        prikazDatuma = d.toLocaleDateString('sr-RS', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }

    body.innerHTML += `
      <tr>
        <td>${clean(item.driver)}</td>
        <td>${clean(item.vehicle)}</td>
        <td>${prikazDatuma}</td>
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
  
  document.querySelectorAll(".time-picker, .date-picker").forEach(el => {
    if(el._flatpickr) el._flatpickr.clear();
  });

  renderTable();
}

function addRow() {
  const driver = document.getElementById("driver").value;
  const vehicle = document.getElementById("vehicle").value;
  
  // Flatpickr kreira alternativno skriveno polje, zato hvatamo vrednost bezbedno ovako:
  const dateEl = document.getElementById("date");
  const date = dateEl ? dateEl.value : "";
  
  const shift = document.getElementById("shift").value;
  const chargeStart = document.getElementById("chargeStart").value;
  const chargeEnd = document.getElementById("chargeEnd").value;

  if (!driver.trim() || !vehicle.trim() || !date.trim() || !chargeStart.trim()) {
    alert("Unesite vozača, vozilo, datum i početak punjenja.");
    return;
  }

  const istovremeniUnosi = globalData.filter(item => {
    return item.date === date && item.chargeStart === chargeStart;
  });

  if (istovremeniUnosi.length >= 2) {
    alert(`⚠️ Unos odbijen!\n\nNa dan ${formatDatum(date)} u ${chargeStart} h već su zakazana dva vozila na punjaču. Nije moguće dodati treće vozilo u istom terminu.`);
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
  document.getElementById("shift").value = "";
  
  document.querySelectorAll(".card:nth-of-type(2) input.time-picker, .card:nth-of-type(2) input.date-picker").forEach(el => {
    if(el._flatpickr) el._flatpickr.clear();
  });
}

function formatDatum(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('sr-RS', { day: '2-digit', month: 'short', year: 'numeric' });
}

function deleteRow(id) {
  if (confirm("Da li ste sigurni da želite da obrišete ovaj unos?")) {
    firebase.database().ref("raspored/" + id).remove().catch(function(error) {
      alert("Greška pri brisanju: " + error.message);
    });
  }
}

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
    setTimeout(() => { toast.remove(); }, 500);
  }, 5000);
}
