$(document).ready(function () {

    $('.edit-icon').click(function () {
        var field = $(this).data('field');
        var $valueSpan = $('#profile-' + field);
        var $editIcon = $(this);
        var $saveIcon = $(this).siblings('.save-icon');
        var $cancelIcon = $(this).siblings('.cancel-icon');

        var currentValue = $valueSpan.text().trim();
        var $inputField = $('<input type="text" id="profile-' + field + '" class="editable-input" value="' + currentValue + '">');
        $inputField.data('initial', currentValue);

        $valueSpan.replaceWith($inputField);
        $inputField.focus();

        $editIcon.hide();
        $saveIcon.show();
        $cancelIcon.show();

        //VALIDATIONS
        $inputField.on('input', function () {
            var newValue = $(this).val().trim();
            var errorIcon = $(this).closest('.info-item').find('.error-icon');

            // Validare în funcție de câmpul specific
            switch (field) {
                case 'username':
                    if (!/^[a-zA-Z -]*$/.test(newValue)) {
                        errorIcon.show();
                        errorIcon.attr('title', 'Username must contain only letters, hyphens, and spaces.');
                        $(this).addClass('error');
                    } else {
                        errorIcon.hide();
                        errorIcon.removeAttr('title');
                        $(this).removeClass('error');
                    }
                    break;
                case 'email':
                    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(newValue)) {
                        errorIcon.show();
                        errorIcon.attr('title', 'Invalid email address.');
                        $(this).addClass('error');
                    } else {
                        errorIcon.hide();
                        errorIcon.removeAttr('title');
                        $(this).removeClass('error');
                    }
                    break;
                case 'phone':
                    if (!/^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(newValue)) {
                        errorIcon.show();
                        errorIcon.attr('title', 'Invalid phone number format.');
                        $(this).addClass('error');
                    } else {
                        errorIcon.hide();
                        errorIcon.removeAttr('title');
                        $(this).removeClass('error');
                    }
                    break;
                default:
                    break;
            }

            // Verificare pentru activarea/dezactivarea butonului de salvare
            var anyErrorVisible = false;
            $(this).closest('.user-details').find('.error-icon').each(function () {
                if ($(this).css('display') === 'block') {
                    anyErrorVisible = true;
                    return false;
                }
            });

            if (anyErrorVisible) {
                $saveIcon.prop('disabled', true);
                $saveIcon.css('cursor', 'not-allowed');
                $saveIcon.attr('title', 'Please fill in the form with valid data.');
            } else {
                $saveIcon.prop('disabled', false);
                $saveIcon.css('cursor', 'pointer');
                $saveIcon.attr('title', 'Save');
            }
        });
    });

    $(document).on('click', '.save-icon', function () {
        var field = $(this).data('field');
        var $inputField = $('#profile-' + field);
        var $editIcon = $(this).siblings('.edit-icon');
        var $cancelIcon = $(this).siblings('.cancel-icon');
        var $saveIcon = $(this);
        var newValue = $inputField.val().trim();

        $.ajax({
            url: '/update_profile',
            type: 'POST',
            data: {
                field: field,
                value: newValue
            },
            success: function (response) {
                $inputField.replaceWith('<span id="profile-' + field + '" class="editable">' + newValue + '</span>');
                if (field == 'username') {
                    var showUsername = $('.show-username');
                    showUsername.text(newValue);
                }

                $editIcon.show();
                $cancelIcon.hide();
                $saveIcon.hide();
            },
            error: function (xhr, status, error) {
                console.error(error);
            }
        });
    });

    $(document).on('click', '.cancel-icon', function () {
        var field = $(this).data('field');
        var $inputField = $('#profile-' + field);
        var $editIcon = $(this).siblings('.edit-icon');
        var $saveIcon = $(this).siblings('.save-icon');
        var currentValue = $inputField.data('initial');

        $inputField.replaceWith('<span id="profile-' + field + '" class="editable">' + currentValue + '</span>');

        $saveIcon.prop('disabled', false);
        $saveIcon.css('cursor', 'pointer');
        $saveIcon.attr('title', 'Save');

        var errorIcon = $('#profile-' + field).closest('.info-item').find('.error-icon');
        errorIcon.hide();
        errorIcon.removeAttr('title');
        $('#profile-' + field).removeClass('error');

        $editIcon.show();
        $saveIcon.hide();
        $(this).hide();
    });
});
