const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const registerErrorMessage = document.getElementById('registerErrorMessage');

if (registerErrorMessage && registerErrorMessage.textContent.trim() !== "") {
    container.classList.add("right-panel-active");
}

signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
});

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
