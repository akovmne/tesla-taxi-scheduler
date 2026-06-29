// Funkcije za Google Modal Pop-out prozorčić
function showModal(title, text) {
  const modal = document.getElementById("googleModal");
  const modalTitle = modal.querySelector(".modal-title");
  const modalBody = document.getElementById("modalMessage");
  
  if(modal && modalBody) {
    modalTitle.innerHTML = title;
    modalBody.innerHTML = text;
    modal.style.display = "flex"; // Eksplicitno prikazivanje
    setTimeout(() => {
      modal.classList.add("modal-open");
    }, 10);
  }
}

function closeModal() {
  const modal = document.getElementById("googleModal");
  if(modal) {
    modal.classList.remove("modal-open");
    setTimeout(() => {
      modal.style.display = "none"; // Eksplicitno sklanjanje nakon animacije
    }, 250);
  }
}

// Zatvori modal ako korisnik klikne bilo gdje van njega (na tamnu pozadinu)
window.onclick = function(event) {
  const modal = document.getElementById("googleModal");
  if (event.target == modal) {
    closeModal();
  }
}
