
document.addEventListener("DOMContentLoaded", function () {
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');

    signUpButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });

    signInButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });

    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');

    const tempRegEmail = localStorage.getItem('tempRegEmail');
    const tempRegPassword = localStorage.getItem('tempRegPassword');

    if (tempRegEmail && tempRegPassword) {
        emailField.value = tempRegEmail;
        passwordField.value = tempRegPassword;

        localStorage.removeItem('tempRegEmail');
        localStorage.removeItem('tempRegPassword');
    }
    const inputBoxes = document.querySelectorAll('.input-box input');

    inputBoxes.forEach(function (input) {
        const label = input.nextElementSibling;

        input.addEventListener('input', function () {
            if (input.value !== '') {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });

        if (input.value !== '') {
            label.classList.add('active');
        }
    });

    const passwordFields = document.querySelectorAll('input[type="password"]');

    passwordFields.forEach(function (field) {
        field.addEventListener('input', function () {
            const toggle = document.querySelector('.password-toggle[data-target="' + this.id + '"]');
            if (this.value.trim() !== '') {
                toggle.style.display = 'inline-block';
            } else {
                toggle.style.display = 'none';
            }
        });
    });

    const passwordToggles = document.querySelectorAll('.password-toggle');

    passwordToggles.forEach(function (toggle) {
        toggle.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const passwordField = document.getElementById(targetId);

            const fieldType = passwordField.getAttribute('type');
            if (fieldType === 'password') {
                passwordField.setAttribute('type', 'text');
                this.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                passwordField.setAttribute('type', 'password');
                this.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
    });
});

$(document).ready(function () {
    let usernameRegex = /^\S*$/
    let lettersRegex = /^[a-zA-Z -]*$/;//letter, line and space 
    let mailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    let phoneRegex = /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    let passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{6,}$/;

    $('#regUsername').on('input', function () {
        let regUsername = $(this).val().trim();
        let errorIcon = $(this).closest('.input-box').find('.error-icon');

        if (!usernameRegex.test(regUsername)) {
            errorIcon.show();
            errorIcon.attr('title', 'Username cannot contain spaces.');
            $(this).addClass('error');
        } else {
            errorIcon.hide();
            errorIcon.removeAttr('title');
            $(this).removeClass('error');
        }
    });

    $('#regName').on('input', function () {
        let regName = $(this).val().trim();
        let errorIcon = $(this).closest('.input-box').find('.error-icon');

        if (!lettersRegex.test(regName)) {
            errorIcon.show();
            errorIcon.attr('title', 'Name must contain only letters, hyphens, and spaces.');
            $(this).addClass('error');
        } else {
            errorIcon.hide();
            errorIcon.removeAttr('title');
            $(this).removeClass('error');
        }
    });

    $('#regEmail').on('input', function () {
        let regEmail = $(this).val().trim();
        let errorIcon = $(this).closest('.input-box').find('.error-icon');

        if (!mailRegex.test(regEmail)) {
            errorIcon.show();
            errorIcon.attr('title', 'Invalid email address.');
            $(this).addClass('error');
        } else {
            errorIcon.hide();
            errorIcon.removeAttr('title');
            $(this).removeClass('error');
        }
    });

    $('#regPassword').on('input', function () {
        let regPassword = $(this).val().trim();
        let errorIcon = $(this).closest('.input-box').find('.error-icon');

        if (!passRegex.test(regPassword)) {
            errorIcon.show();
            errorIcon.attr('title', 'Password must be at least 6 characters long, containing at least one letter, one number, and one special character.');
            $(this).addClass('error');
        } else {
            errorIcon.hide();
            errorIcon.removeAttr('title');
            $(this).removeClass('error');
        }
    });

    $('#regConfirmPassword').on('input', function () {
        let regConfirmPassword = $(this).val().trim();
        let regPassword = $('#regPassword').val().trim();
        let errorIcon = $(this).closest('.input-box').find('.error-icon');

        if (regPassword !== regConfirmPassword) {
            errorIcon.show();
            errorIcon.attr('title', 'Password does not match.');
            $(this).addClass('error');
        } else {
            errorIcon.hide();
            errorIcon.removeAttr('title');
            $(this).removeClass('error');
        }
    });

    $('#regPhone').on('input', function () {
        let regPhone = $(this).val().trim();
        let errorIcon = $(this).closest('.input-box').find('.error-icon');

        if (!phoneRegex.test(regPhone)) {
            errorIcon.show();
            errorIcon.attr('title', 'Invalid phone number format.');
            $(this).addClass('error');
        } else {
            errorIcon.hide();
            errorIcon.removeAttr('title');
            $(this).removeClass('error');
        }
    });

    $('#registerForm input').on('input', function () {
        let anyErrorVisible = false;

        $('.error-icon').each(function () {
            if ($(this).css('display') === 'block') {
                anyErrorVisible = true;
                return false;
            }
        });

        console.log("Error: " + anyErrorVisible);

        if (anyErrorVisible) {
            $('#btnRegister').prop('disabled', true);
            $('#btnRegister').css('cursor', 'not-allowed');
            $('#btnRegister').attr('title', 'Please fill in the form with valid data.');
        } else {
            $('#btnRegister').prop('disabled', false);
            $('#btnRegister').css('cursor', 'pointer');
            $('#btnRegister').removeAttr('title');
        }
    });


    $('#registerForm').submit(function (e) {
        e.preventDefault();
        console.log("Camera: " + $('#regCamera').val());

        $.ajax({
            url: '/register',
            type: 'POST',
            data: $(this).serialize(),
            success: function (response) {
                if (response.success) {
                    localStorage.setItem('tempRegEmail', $('#regEmail').val());
                    localStorage.setItem('tempRegPassword', $('#regPassword').val());

                    window.location.href = response.redirect;
                    const registerErrorMessage = $('#registerErrors');
                    const container = $('#container');

                    if (registerErrorMessage && registerErrorMessage.text.trim() !== "") {
                        container.addClass("right-panel-active");
                    }
                } else {
                    let errorMessage = response.message;
                    let errorHtml = '<div class="alert alert-danger">' + errorMessage + '</div>';
                    $('#registerErrors').html(errorHtml);
                }
            },
            error: function (xhr, status, error) {
                console.error(error);
            }
        });
    });
});
