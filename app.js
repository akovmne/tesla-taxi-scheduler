<FILE file_path="/home/workdir/attachments/app.js">
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
let isInitialLoad = true;
let lastToastTime = 0;

window.onload = function() {
  initTimePickers();
  
  // Sinhronizacija u realnom vremenu
  dbRef.on("value", function(snapshot) {
    const dataObj = snapshot.val() || {};
    
    globalData = Object.keys(dataObj).map(key => ({
      id: key,
      ...dataObj[key]
    }));
    
    renderTable();
    
    if (isInitialLoad) {
      isInitialLoad = false;
    }
  }, function(error) {
    console.error("Greška pri čitanju iz Firebase baze: ", error);
  });

  // Novi unos
  dbRef.on("child_added", function(snapshot) {
    if (!isInitialLoad) {
      const entry = snapshot.val();
      showToast(entry, "add");
    }
  });

  // Brisanje unosa
  dbRef.on("child_removed", function(snapshot) {
    if (!isInitialLoad) {
      const entry = snapshot.val();
      showToast(entry, "delete");
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
