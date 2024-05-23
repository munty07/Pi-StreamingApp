$(document).ready(function () {
    var currentPage = 1;

    $('#dateFilter').val("");
    loadCaptures();

    // live captures
    if (localStorage.getItem('autoShowLiveCaptures') === 'true') {
        localStorage.setItem('autoShowLiveRecordings', 'false');
        localStorage.setItem('autoShowAutoLiveCaptures', 'false');
        localStorage.setItem('autoShowAutoLiveRecordings', 'false');
        currentState = 'captures';
        $('#dateFilter').val("");
        loadCaptures();
    }

    // auto live captures
    if (localStorage.getItem('autoShowAutoLiveCaptures') === 'true') {
        localStorage.setItem('autoShowLiveCaptures', 'false');
        localStorage.setItem('autoShowLiveRecordings', 'false');
        localStorage.setItem('autoShowAutoLiveRecordings', 'false');
        currentState = 'autoCaptures';
        $('#dateFilter').val("");
        loadAutoLiveCaptures();
    }

    // live recordings
    if (localStorage.getItem('autoShowLiveRecordings') === 'true') {
        localStorage.setItem('autoShowLiveCaptures', 'false');
        localStorage.setItem('autoShowAutoLiveCaptures', 'false');
        localStorage.setItem('autoShowAutoLiveRecordings', 'false');
        currentState = 'recordings';
        $('#dateFilter').val("");
        loadRecordings();
    }

    // auto live recordings
    if (localStorage.getItem('autoShowAutoLiveRecordings') === 'true') {
        localStorage.setItem('autoShowLiveRecordings', 'false');
        localStorage.setItem('autoShowLiveCaptures', 'false');
        localStorage.setItem('autoShowAutoLiveCaptures', 'false');
        currentState = 'autoRecordings';
        $('#dateFilter').val("");
        loadAutoLiveRecordings();
    }

    // Event listeners for pagination buttons
    $('#pagination').on('click', '.btn-pagination', function () {
        var page = parseInt($(this).data('page'));
        currentPage = page;
        if (currentState == 'captures') {
            loadCaptures($('#dateFilter').val(), currentPage);
        } else if (currentState == 'recordings') {
            loadRecordings($('#dateFilter').val(), currentPage);
        } else if (currentState == 'autoCaptures') {
            loadAutoLiveCaptures($('#dateFilter').val(), currentPage);
        } else {
            loadAutoLiveRecordings($('#dateFilter').val(), currentPage);
        }
    });

    // FILTER BY DATE
    $('#dateFilter').change(function () {
        if (currentState == 'captures') {
            loadCaptures($(this).val());
        } else if (currentState == 'recordings') {
            loadRecordings($(this).val());
        } else if (currentState == 'autoCaptures') {
            loadAutoLiveCaptures($(this).val());
        } else {
            loadAutoLiveRecordings($(this).val());
        }
    });
});

var currentState = 'captures';

//===============================================================================================//
//====================================== PAGINATION =============================================//
//===============================================================================================//

function renderPagination(totalPages, currentPage) {
    var paginationContainer = $('#pagination');
    paginationContainer.empty();

    if (totalPages < 1) {
        paginationContainer.hide();
        return;
    } else {
        paginationContainer.show();
    }

    paginationContainer.append(createPaginationButton('<<', 1, currentPage === 1, currentPage === 1));
    paginationContainer.append(createPaginationButton('<', currentPage > 1 ? currentPage - 1 : 1, currentPage === 1, currentPage === 1));

    for (var i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        paginationContainer.append(createPaginationButton(i.toString(), i, i === currentPage));
    }

    paginationContainer.append(createPaginationButton('>', currentPage < totalPages ? currentPage + 1 : totalPages, currentPage === totalPages, currentPage === totalPages));
    paginationContainer.append(createPaginationButton('>>', totalPages, currentPage === totalPages, currentPage === totalPages));

}

function createPaginationButton(label, page, isActive = false, isDisabled = false) {
    var button = $('<button>');
    button.text(label);
    button.addClass('btn-pagination');
    button.data('page', page);
    if (isActive) {
        button.prop('disabled', false);
        button.addClass('active');
        button.remove('disabled');
    }
    if (isDisabled) {
        button.prop('disabled', true);
        button.remove('active');
        button.addClass('disabled');
    }
    return button;
}

//===============================================================================================//
//===================================== LIVE CAPTURES ===========================================//
//===============================================================================================//

$('#liveCapturesBtn').click(function () {
    currentState = 'captures';
    $('#dateFilter').val("");
    loadCaptures();
});

function loadCaptures(selectedDate = '', currentPage = 1) {
    $.ajax({
        url: '/get_images',
        data: { date: selectedDate, page: currentPage },
        type: 'GET',
        success: function (response) {
            var imagesContainer = $('#imagesContainer');
            var messageContainer = $('#message');
            var paginationContainer = $('#pagination');
            var itemsPerPage = 6;
            // var currentPage = 1;
            var totalPages = Math.ceil(response.length / itemsPerPage);
            renderPagination(totalPages, currentPage);

            imagesContainer.empty();
            messageContainer.empty();

            if (response.length === 0) {
                paginationContainer.css("display", "none");
                messageContainer.css("display", "flex");
                messageContainer.append('<div class="text-center no-data"><i class="fas fa-images" aria-hidden="true"></i><p>No photos available.</p></div>');
            } else {
                paginationContainer.css("display", "block");
                messageContainer.css("display", "none");
                response.sort(function (a, b) {//order by date desc
                    var dateA = new Date(a.timestamp), dateB = new Date(b.timestamp);
                    return dateB - dateA;
                });
                var startIndex = (currentPage - 1) * itemsPerPage;
                var endIndex = Math.min(startIndex + itemsPerPage, response.length);

                for (var i = startIndex; i < endIndex; i++) {
                    var image = response[i];
                    var imgHtml = `
                        <div class="col-md-4 image-card">
                            <img src="${image.url}" class="img-fluid img-thumbnail clickable" data-imgsrc="${image.url}">
                            <div class="image-info">
                                <p>Size: ${image.size}</p>
                                <p>${image.timestamp}</p>
                            </div>
                            <div class="overlay-buttons">
                                <button class="btn btn-custom preview-btn clickable" data-imgsrc="${image.url}"><i class="fa fa-eye"></i></button>
                                <button class="btn btn-danger delete-btn" data-storage-path="${image.storage_path}" data-unique-id="${image.unique_id}"><i class="fa fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                    imagesContainer.append(imgHtml);
                }

                $('.clickable').on('click', function () {
                    var imageSrc = $(this).data('imgsrc');
                    showPreview(imageSrc);
                });

                $('.delete-btn').on('click', function () {

                    var uniqueId = $(this).data('unique-id');
                    var storagePath = $(this).data('storage-path');

                    Swal.fire({
                        title: 'Are you sure?',
                        text: 'You won\'t be able to revert this!',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: 'var(--color-button)',
                        cancelButtonColor: 'var(--color-menu-hover)',
                        confirmButtonText: 'Yes, delete it!',
                        customClass: {
                            popup: 'swal-custom-popup',
                            title: 'swal-custom-title',
                            content: 'swal-custom-content',
                            cancelButton: 'swal-custom-cancel-button',
                            confirmButton: 'swal-custom-confirm-button',
                        },
                        background: 'var(--color-modal)'

                    }).then((result) => {
                        if (result.isConfirmed) {
                            $.ajax({
                                url: '/delete_image',
                                type: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ 'unique_id': uniqueId, 'storage_path': storagePath }),
                                success: function (response) {
                                    Swal.fire({
                                        title: 'Deleted!',
                                        text: response.message,
                                        icon: 'success',
                                        customClass: {
                                            popup: 'swal-custom-popup',
                                            title: 'swal-custom-title',
                                            content: 'swal-custom-content'
                                        },
                                        confirmButtonColor: 'var(--color-button)'
                                    });

                                    if (response.status === 'success') {
                                        loadCaptures(selectedDate); // Reload images after deletion
                                    }
                                },
                                error: function (error) {
                                    console.log(error);

                                    Swal.fire(
                                        'Error!',
                                        'Failed to delete the image. ',
                                        'error'
                                    );
                                }
                            });
                        }
                    });

                });
            }
        },
        error: function () {
            alert('Error loading images.');
        }
    });
}

function showPreview(imageSrc) {
    $('#preview-overlay video').hide();
    $('#preview-overlay img').attr('src', imageSrc);
    $('#preview-overlay').show();
}

//===============================================================================================//
//==================================AUTO LIVE CAPTURES===========================================//
//===============================================================================================//

$('#autoLiveCapturesBtn').click(function () {
    currentState = 'autoCaptures';
    $('#dateFilter').val("");
    loadAutoLiveCaptures();
});

function loadAutoLiveCaptures(selectedDate = '', currentPage = 1) {
    $.ajax({
        url: '/get_autoimages',
        data: { date: selectedDate, page: currentPage },
        type: 'GET',
        success: function (response) {
            var imagesContainer = $('#imagesContainer');
            var messageContainer = $('#message');
            var paginationContainer = $('#pagination');
            var itemsPerPage = 6;
            // var currentPage = 1;
            var totalPages = Math.ceil(response.length / itemsPerPage);
            renderPagination(totalPages, currentPage);

            imagesContainer.empty();
            messageContainer.empty();

            if (response.length === 0) {
                paginationContainer.css("display", "none");
                messageContainer.css("display", "flex");
                messageContainer.append('<div class="text-center no-data"><i class="fas fa-images" aria-hidden="true"></i><p>No photos available.</p></div>');
            } else {
                paginationContainer.css("display", "block");
                messageContainer.css("display", "none");
                response.sort(function (a, b) {//order by date desc
                    var dateA = new Date(a.timestamp), dateB = new Date(b.timestamp);
                    return dateB - dateA;
                });
                var startIndex = (currentPage - 1) * itemsPerPage;
                var endIndex = Math.min(startIndex + itemsPerPage, response.length);

                for (var i = startIndex; i < endIndex; i++) {
                    var image = response[i];
                    var imgHtml = `
                        <div class="col-md-4 image-card">
                            <img src="${image.url}" class="img-fluid img-thumbnail clickable" data-imgsrc="${image.url}">
                            <div class="image-info">
                                <p>Size: ${image.size}</p>
                                <p>${image.timestamp}</p>
                            </div>
                            <div class="overlay-buttons">
                                <button class="btn btn-custom preview-btn clickable" data-imgsrc="${image.url}"><i class="fa fa-eye"></i></button>
                                <button class="btn btn-danger delete-btn" data-storage-path="${image.storage_path}" data-unique-id="${image.unique_id}"><i class="fa fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                    imagesContainer.append(imgHtml);
                }

                $('.clickable').on('click', function () {
                    var imageSrc = $(this).data('imgsrc');
                    showPreview(imageSrc);
                });

                $('.delete-btn').on('click', function () {

                    var uniqueId = $(this).data('unique-id');
                    var storagePath = $(this).data('storage-path');

                    Swal.fire({
                        title: 'Are you sure?',
                        text: 'You won\'t be able to revert this!',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: 'var(--color-button)',
                        cancelButtonColor: 'var(--color-menu-hover)',
                        confirmButtonText: 'Yes, delete it!',
                        customClass: {
                            popup: 'swal-custom-popup',
                            title: 'swal-custom-title',
                            content: 'swal-custom-content',
                            cancelButton: 'swal-custom-cancel-button',
                            confirmButton: 'swal-custom-confirm-button',
                        },
                        background: 'var(--color-modal)'

                    }).then((result) => {
                        if (result.isConfirmed) {
                            $.ajax({
                                url: '/delete_autoimage',
                                type: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ 'unique_id': uniqueId, 'storage_path': storagePath }),
                                success: function (response) {
                                    Swal.fire({
                                        title: 'Deleted!',
                                        text: response.message,
                                        icon: 'success',
                                        customClass: {
                                            popup: 'swal-custom-popup',
                                            title: 'swal-custom-title',
                                            content: 'swal-custom-content'
                                        },
                                        confirmButtonColor: 'var(--color-button)'
                                    });

                                    if (response.status === 'success') {
                                        loadAutoLiveCaptures(selectedDate); // Reload images after deletion
                                    }
                                },
                                error: function (error) {
                                    console.log(error);

                                    Swal.fire(
                                        'Error!',
                                        'Failed to delete the image. ',
                                        'error'
                                    );
                                }
                            });
                        }
                    });

                });
            }
        },
        error: function () {
            alert('Error loading images.');
        }
    });
}


//===============================================================================================//
//==================================== LIVE RECORDINGS ==========================================//
//===============================================================================================//

$('#liveRecordingsBtn').click(function () {
    currentState = 'recordings';
    $('#dateFilter').val("");
    loadRecordings();
});

function loadRecordings(selectedDate = '', currentPage = 1) {
    $.ajax({
        url: '/get_videos',
        data: { date: selectedDate, page: currentPage },
        type: 'GET',
        success: function (response) {
            var imagesContainer = $('#imagesContainer');
            var messageContainer = $('#message');
            var paginationContainer = $('#pagination');

            imagesContainer.empty();
            messageContainer.empty();

            var itemsPerPage = 6;
            var totalPages = Math.ceil(response.length / itemsPerPage);
            renderPagination(totalPages, currentPage);

            if (response.length === 0) {//there are no video recordings
                paginationContainer.css("display", "none");
                messageContainer.css("display", "flex");
                messageContainer.append('<div class="text-center no-data"><i class="fas fa-video-slash" aria-hidden="true"></i><p>No recordings available.</p></div>');
            } else {
                paginationContainer.css("display", "block");
                messageContainer.css("display", "none");

                response.sort(function (a, b) {//order by date desc
                    var dateA = new Date(a.timestamp), dateB = new Date(b.timestamp);
                    return dateB - dateA;
                });

                var startIndex = (currentPage - 1) * itemsPerPage;
                var endIndex = Math.min(startIndex + itemsPerPage, response.length);

                for (var i = startIndex; i < endIndex; i++) {
                    var video = response[i];

                    var videoHtml = `
                            <div class="col-md-4 video-card">
                                <video controls class="img-fluid img-thumbnail">
                                    <source src="${video.url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                                <div class="video-info">
                                    <p>Size: ${video.size}</p>
                                    <p>${video.timestamp}</p>
                                </div>
                                <div class="overlay-buttons">
                                    <button class="btn btn-custom preview-btn" data-videosrc="${video.url}"><i class="fa fa-eye"></i></button>
                                    <button class="btn btn-danger delete-btn" data-storage-path="${video.storage_path}" data-unique-id="${video.unique_id}"><i class="fa fa-trash"></i></button>
                                </div>
                            </div>
                        `;
                    imagesContainer.append(videoHtml);
                };

                $('.preview-btn').on('click', function () {
                    var videoSrc = $(this).data('videosrc');
                    showVideoPreview(videoSrc);
                });

                $('.delete-btn').on('click', function () {

                    var uniqueId = $(this).data('unique-id');
                    var storagePath = $(this).data('storage-path');

                    Swal.fire({
                        title: 'Are you sure?',
                        text: 'You won\'t be able to revert this!',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: 'var(--color-button)',
                        cancelButtonColor: 'var(--color-menu-hover)',
                        confirmButtonText: 'Yes, delete it!',
                        customClass: {
                            popup: 'swal-custom-popup',
                            title: 'swal-custom-title',
                            content: 'swal-custom-content',
                            cancelButton: 'swal-custom-cancel-button',
                            confirmButton: 'swal-custom-confirm-button',
                        },
                        background: 'var(--color-modal)'

                    }).then((result) => {
                        if (result.isConfirmed) {
                            $.ajax({
                                url: '/delete_video',
                                type: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ 'unique_id': uniqueId, 'storage_path': storagePath }),
                                success: function (response) {
                                    Swal.fire({
                                        title: 'Deleted!',
                                        text: response.message,
                                        icon: 'success',
                                        customClass: {
                                            popup: 'swal-custom-popup',
                                            title: 'swal-custom-title',
                                            content: 'swal-custom-content'
                                        },
                                        confirmButtonColor: 'var(--color-button)'
                                    });

                                    if (response.status === 'success') {
                                        loadRecordings(selectedDate); // Reload images after deletion
                                    }
                                },
                                error: function (error) {
                                    console.log(error);

                                    Swal.fire(
                                        'Error!',
                                        'Failed to delete the video.',
                                        'error'
                                    );
                                }
                            });
                        }
                    });

                });
            }
        },
        error: function () {
            alert('Error loading videos.');
        }
    });
}

$('#preview-overlay, .close-preview').click(function (e) {
    if (e.target !== this) return;
    $('#preview-overlay').hide();
    var videoPreview = document.getElementById('videoPreview');
    if (videoPreview) {
        videoPreview.pause();
        videoPreview.currentTime = 0;
    }
});

function showVideoPreview(videoSrc) {
    $('#preview-overlay img').hide();
    var videoPreview = $('#videoPreview');
    videoPreview.show();
    videoPreview.find('source').attr('src', videoSrc);
    videoPreview[0].load();
    $('#preview-overlay').show();
}


//===============================================================================================//
//================================== AUTO LIVE RECORDINGS =======================================//
//===============================================================================================//

$('#autoLiveRecordingsBtn').click(function () {
    currentState = 'autoRecordings';
    $('#dateFilter').val("");
    loadAutoLiveRecordings();
});

function loadAutoLiveRecordings(selectedDate = '', currentPage = 1) {
    $.ajax({
        url: '/get_autovideos',
        data: { date: selectedDate, page: currentPage },
        type: 'GET',
        success: function (response) {
            var imagesContainer = $('#imagesContainer');
            var messageContainer = $('#message');
            var paginationContainer = $('#pagination');

            imagesContainer.empty();
            messageContainer.empty();

            var itemsPerPage = 6;
            var totalPages = Math.ceil(response.length / itemsPerPage);
            renderPagination(totalPages, currentPage);

            if (response.length === 0) {//there are no video recordings
                paginationContainer.css("display", "none");
                messageContainer.css("display", "flex");
                messageContainer.append('<div class="text-center no-data"><i class="fas fa-video-slash" aria-hidden="true"></i><p>No recordings available.</p></div>');
            } else {
                paginationContainer.css("display", "block");
                messageContainer.css("display", "none");

                response.sort(function (a, b) {//order by date desc
                    var dateA = new Date(a.timestamp), dateB = new Date(b.timestamp);
                    return dateB - dateA;
                });

                var startIndex = (currentPage - 1) * itemsPerPage;
                var endIndex = Math.min(startIndex + itemsPerPage, response.length);

                for (var i = startIndex; i < endIndex; i++) {
                    var video = response[i];

                    var videoHtml = `
                            <div class="col-md-4 video-card">
                                <video controls class="img-fluid img-thumbnail">
                                    <source src="${video.url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                                <div class="video-info">
                                    <p>Size: ${video.size}</p>
                                    <p>${video.timestamp}</p>
                                </div>
                                <div class="overlay-buttons">
                                    <button class="btn btn-custom preview-btn" data-videosrc="${video.url}"><i class="fa fa-eye"></i></button>
                                    <button class="btn btn-danger delete-btn" data-storage-path="${video.storage_path}" data-unique-id="${video.unique_id}"><i class="fa fa-trash"></i></button>
                                </div>
                            </div>
                        `;
                    imagesContainer.append(videoHtml);
                };

                $('.preview-btn').on('click', function () {
                    var videoSrc = $(this).data('videosrc');
                    showVideoPreview(videoSrc);
                });

                $('.delete-btn').on('click', function () {

                    var uniqueId = $(this).data('unique-id');
                    var storagePath = $(this).data('storage-path');

                    Swal.fire({
                        title: 'Are you sure?',
                        text: 'You won\'t be able to revert this!',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: 'var(--color-button)',
                        cancelButtonColor: 'var(--color-menu-hover)',
                        confirmButtonText: 'Yes, delete it!',
                        customClass: {
                            popup: 'swal-custom-popup',
                            title: 'swal-custom-title',
                            content: 'swal-custom-content',
                            cancelButton: 'swal-custom-cancel-button',
                            confirmButton: 'swal-custom-confirm-button',
                        },
                        background: 'var(--color-modal)'

                    }).then((result) => {
                        if (result.isConfirmed) {
                            $.ajax({
                                url: '/delete_autovideo',
                                type: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ 'unique_id': uniqueId, 'storage_path': storagePath }),
                                success: function (response) {
                                    Swal.fire({
                                        title: 'Deleted!',
                                        text: response.message,
                                        icon: 'success',
                                        customClass: {
                                            popup: 'swal-custom-popup',
                                            title: 'swal-custom-title',
                                            content: 'swal-custom-content'
                                        },
                                        confirmButtonColor: 'var(--color-button)'
                                    });

                                    if (response.status === 'success') {
                                        loadAutoLiveRecordings(selectedDate); // Reload images after deletion
                                    }
                                },
                                error: function (error) {
                                    console.log(error);

                                    Swal.fire(
                                        'Error!',
                                        'Failed to delete the video.',
                                        'error'
                                    );
                                }
                            });
                        }
                    });

                });
            }
        },
        error: function () {
            alert('Error loading videos.');
        }
    });
}

