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
  // Google Kalendar za datum
  flatpickr(".date-picker", {
    locale: "sr",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d. M Y.",
    disableMobile: true,
    allowInput: false
  });

  // Google Sat za vrijeme
  flatpickr(".time-picker", {
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
  const fDriver = document.getElementById("filterDriver") ? document.getElementById("filterDriver").value.toLowerCase().trim() : "";
  const fVehicle = document.getElementById("filterVehicle") ? document.getElementById("filterVehicle").value.toLowerCase().trim() : "";
  const fShift = document.getElementById("filterShift") ? document.getElementById("filterShift").value.toLowerCase().trim() : "";
  
  const fromEl = document.getElementById("filterTimeFrom");
  const toEl = document.getElementById("filterTimeTo");
  
  const fFrom = (fromEl && fromEl.value) ? fromEl.value : "";
  const fTo = (toEl && toEl.value) ? toEl.value : "";

  return { driver: fDriver, vehicle: fVehicle, shift: fShift, from: fFrom, to: fTo };
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
  const shift = document.getElementById("shift").value;
  
  const dateEl = document.getElementById("date");
  const cStartEl = document.getElementById("chargeStart");
  const cEndEl = document.getElementById("chargeEnd");

  // Najsigurniji način čitanja Flatpickr vrijednosti na bilo kom uređaju:
  const date = (dateEl && dateEl._flatpickr) ? dateEl._flatpickr.input.value : dateEl.value;
  const chargeStart = (cStartEl && cStartEl._flatpickr) ? cStartEl._flatpickr.input.value : cStartEl.value;
  const chargeEnd = (cEndEl && cEndEl._flatpickr) ? cEndEl._flatpickr.input.value : cEndEl.value;

  // 1. Validacija obaveznih polja
  if (!driver.trim() || !vehicle.trim() || !date || !chargeStart) {
    showModal("⚠️ Greška pri unosu", "Molimo vas da popunite sva obavezna polja:\n• Ime vozača\n• Vozilo\n• Datum\n• Početak punjenja");
    return;
  }

  // 2. STROGA PROVJERA DUPLIKATA
  const istovremeniUnosi = globalData.filter(item => {
    return item.date === date && item.chargeStart === chargeStart;
  });

  if (istovremeniUnosi.length >= 2) {
    showModal(
      "⚠️ Unos odbijen", 
      `Na dan <strong>${formatDatum(date)}</strong> u <strong>${chargeStart} h</strong> već su zakazana maksimalno dva vozila na punjaču.<br><br>Nije moguće dodati treće vozilo u istom terminu.`
    );
    return; // Blokira i prekida izvršavanje
  }

  // 3. Upis u Firebase
  dbRef.push({
    driver: driver.trim(),
    vehicle: vehicle.trim(),
    date,
    shift: shift.trim(),
    chargeStart,
    chargeEnd
  }).catch(function(error) {
    showModal("Greška", "Greška pri upisu u bazu: " + error.message);
  });

  // Čišćenje standardnih polja
  document.getElementById("driver").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("shift").value = "";
  
  // Čišćenje kalendara i satova
  if(dateEl && dateEl._flatpickr) dateEl._flatpickr.clear();
  if(cStartEl && cStartEl._flatpickr) cStartEl._flatpickr.clear();
  if(cEndEl && cEndEl._flatpickr) cEndEl._flatpickr.clear();
}

// Funkcije za Google Modal Pop-out prozorčić
function showModal(title, text) {
  const modal = document.getElementById("googleModal");
  const modalTitle = modal.querySelector(".modal-title");
  const modalBody = document.getElementById("modalMessage");
  
  if(modal && modalBody) {
    modalTitle.innerHTML = title;
    modalBody.innerHTML = text;
    modal.classList.add("modal-open");
  }
}

function closeModal() {
  const modal = document.getElementById("googleModal");
  if(modal) {
    modal.classList.remove("modal-open");
  }
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
