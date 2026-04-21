
// debut pop up
const myPopup = document.getElementById('customPopup');
const closeBtn = document.getElementById('closeBtn');

// Affiche le popup après 3 secondes
window.addEventListener('load', () => {
    setTimeout(() => {
        myPopup.style.display = 'flex';
    }, 3000);
});

// Fermeture
closeBtn.addEventListener('click', () => {
    myPopup.style.display = 'none';
});





// fin pop up