window.onload = function () {
    setTimeout(function () {
        const alertBox = document.querySelector('.alert');
        if (alertBox) {
            alertBox.style.display = 'none';
        }
    }, 5000);
};