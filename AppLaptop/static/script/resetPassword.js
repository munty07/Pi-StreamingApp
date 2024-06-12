window.onload = function () {
    setTimeout(function () {
        const alertBox = document.querySelector('.alert');
        if (alertBox) {
            alertBox.style.display = 'none';
        }
    }, 5000);
};

// Obținem toate input-urile și label-urile
const inputFields = document.querySelectorAll('.input-box input');

// Pentru fiecare input, adăugăm un eveniment pentru a urmări schimbările
inputFields.forEach(inputField => {
    inputField.addEventListener('input', function () {
        if (this.value.trim() !== '') {
            this.parentNode.querySelector('label').classList.add('active');
        } else {
            this.parentNode.querySelector('label').classList.remove('active');
        }
    });
});
