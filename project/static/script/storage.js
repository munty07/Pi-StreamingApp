$(document).ready(function () {
    $('#dateFilter').val("");
    loadCaptures();

    if (localStorage.getItem('autoShowLiveCaptures') === 'true') {
        localStorage.setItem('autoShowLiveCaptures', 'false');
        currentState = 'captures';
        $('#dateFilter').val("");
        loadCaptures();
    }

    if (localStorage.getItem('autoShowLiveRecordings') === 'true') {
        localStorage.setItem('autoShowLiveRecordings', 'false');
        currentState = 'recordings';
        $('#dateFilter').val("");
        loadRecordings();
    }
});
var currentState = 'captures';

// FILTER BY DATE
$('#dateFilter').change(function () {
    if (currentState == 'captures') {
        loadCaptures($(this).val());
    } else {
        loadRecordings($(this).val());
    }
});

// IMAGES
$('#liveCapturesBtn').click(function () {
    currentState = 'captures';
    $('#dateFilter').val("");
    loadCaptures();
});

function loadCaptures(selectedDate = '') {
    $.ajax({
        url: '/get_images',
        data: { date: selectedDate },
        type: 'GET',
        success: function (response) {
            var imagesContainer = $('#imagesContainer');
            var messageContainer = $('#message');
            imagesContainer.empty();
            messageContainer.empty();
            if (response.length === 0) {//there are no video recordings
                messageContainer.append('<div class="text-center no-data"><i class="fas fa-images" aria-hidden="true"></i><p>No photos available.</p></div>');
            } else {
                messageContainer.empty();
                response.sort(function (a, b) {//order by date desc
                    var dateA = new Date(a.timestamp), dateB = new Date(b.timestamp);
                    return dateB - dateA;
                });

                response.forEach(function (image) {
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
                });

                $('.clickable').on('click', function () {
                    var imageSrc = $(this).data('imgsrc');
                    showPreview(imageSrc);
                });

                $('.delete-btn').on('click', function () {
                    if (!confirm('Are you sure you want to delete this image?')) {
                        return;
                    }

                    var uniqueId = $(this).data('unique-id');
                    var storagePath = $(this).data('storage-path');

                    $.ajax({
                        url: '/delete_image',
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({ 'unique_id': uniqueId, 'storage_path': storagePath }),
                        success: function (response) {
                            alert(response.message);
                            if (response.status === 'success') {
                                loadCaptures();
                            }
                        },
                        error: function (error) {
                            console.log(error);
                            alert('Failed to delete the image.' + error);
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

// VIDEO
$('#liveRecordingsBtn').click(function () {
    currentState = 'recordings';
    $('#dateFilter').val("");
    loadRecordings();
});

function loadRecordings(selectedDate = '') {
    $.ajax({
        url: '/get_videos',
        data: { date: selectedDate },
        type: 'GET',
        success: function (response) {
            var imagesContainer = $('#imagesContainer');
            var messageContainer = $('#message');
            imagesContainer.empty();
            messageContainer.empty();
            if (response.length === 0) {//there are no video recordings
                messageContainer.append('<div class="text-center no-data"><i class="fas fa-video-slash" aria-hidden="true"></i><p>No recordings available.</p></div>');
            } else {
                messageContainer.empty();
                response.sort(function (a, b) {//order by date desc
                    var dateA = new Date(a.timestamp), dateB = new Date(b.timestamp);
                    return dateB - dateA;
                });
                response.forEach(function (video) {
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
                                </div>
                            </div>
                        `;
                    imagesContainer.append(videoHtml);
                });
                $('.preview-btn').on('click', function () {
                    var videoSrc = $(this).data('videosrc');
                    showVideoPreview(videoSrc);
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

