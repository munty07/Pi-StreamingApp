$(document).ready(function () {

    //  EDIT PROFILE DATA
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

            switch (field) {
                case 'username':
                    if (!/^\S*$/.test(newValue)) {
                        errorIcon.show();
                        errorIcon.attr('title', 'Username cannot contain spaces.');
                        $(this).addClass('error');
                    } else {
                        errorIcon.hide();
                        errorIcon.removeAttr('title');
                        $(this).removeClass('error');
                    }
                    break;
                case 'name':
                    if (!/^[a-zA-Z -]*$/.test(newValue)) {
                        errorIcon.show();
                        errorIcon.attr('title', 'Name must contain only letters, hyphens, and spaces.');
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

    //  SAVE YOUR UPDATED PROFILE DATA
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
                    var showName = $('#menu-username');
                    showName.text(newValue);
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

    //  CANCEL EDITING
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

    //  UPLOAD PROFILE PICTURE
    document.getElementById('imageUpload').addEventListener('change', function (event) {
        var file = event.target.files[0];
        var reader = new FileReader();

        reader.onload = function (e) {
            var imageData = e.target.result;
            uploadImage(imageData);
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    });

    var videoPreview = document.createElement('video');
    videoPreview.autoplay = true;
    videoPreview.muted = true;
    var takePhoto = false;

    //  OPEN CAMERA TO TAKE A PHOTO
    $('#btnPhoto').click(function () {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function (stream) {
                    takePhoto = true;
                    videoPreview.srcObject = stream;

                    $('#imagePreview').empty().append(videoPreview);
                    $('#previewOverlay').fadeIn();

                    $('#btnSavePhoto').show();

                    //  SAVE PHOTO IN DB
                    $('#btnSavePhoto').click(function () {
                        var canvas = document.createElement('canvas');
                        canvas.width = videoPreview.videoWidth;
                        canvas.height = videoPreview.videoHeight;
                        var context = canvas.getContext('2d');
                        context.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);

                        var imageData = canvas.toDataURL('image/png');

                        stream.getTracks().forEach(function (track) {
                            track.stop();
                        });

                        uploadImage(imageData);

                        $('#previewOverlay').fadeOut();
                    });
                })
                .catch(function (error) {
                    console.error('Error accessing camera: ', error);
                });
        } else {
            console.error('Camera not supported');
        }
    });

    //  UPLOAD IMAGE FUNCTION
    function uploadImage(imageData) {
        $.ajax({
            url: '/upload_profile_picture',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ image: imageData }),
            success: function (response) {
                console.log(response.message);
                $(".user-img").attr("src", imageData);
            },
            error: function (xhr, status, error) {
                console.error(error);
            }
        });
    }

    //  PREVIEW PROFILE PICTURE
    $('#btnPreview').click(function () {
        var imageUrl = $('.user-img').attr('src');
        $('#imagePreview').html(`<img src="${imageUrl}" alt="User Avatar">`);
        $('#previewOverlay').fadeIn();
        $('#btnSavePhoto').hide();
    });

    //  CLOSE PREVIEW IMAGE/VIDEO
    $('#closePreview').click(function () {
        if (takePhoto) { // for take a photo
            videoPreview.srcObject.getTracks().forEach(function (track) {
                track.stop();
            });
        }

        $('#previewOverlay').fadeOut();
    });

    // CHANGE PASSWORD - RESET PASSWORD
    $('#changePasswordLink').click(function () {
        var email = $('#emailAddress').text();

        $.ajax({
            url: '/change_password',
            type: 'POST',
            data: { email: email },
            success: function (response) {
                var $messageDiv = $('#changePasswordMessage');
                if ($messageDiv.length == 0) {
                    $messageDiv = $('<div id="changePasswordMessage" class="alert mt-3" role="alert"></div>');

                    $('.col').append($messageDiv);
                }
                console.log(response.message);
                console.log(response.alert_class);
                $messageDiv.css("display", "block");

                $messageDiv.text(response.message).removeClass().addClass('alert alert-' + response.alert_class);
            },
            error: function (xhr, status, error) {
                console.error(error);
            }
        });
    });

});

window.onload = function () {
    setTimeout(function () {
        const alertBox = document.querySelector('.alert');
        if (alertBox) {
            alertBox.style.display = 'none';
        }
    }, 5000);
};
