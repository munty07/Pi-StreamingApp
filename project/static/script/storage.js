$(document).ready(function () {
    $('#dateFilter').change(function () {
        // loadCaptures($(this).val());
        loadRecordings($(this).val()); //todo
    });
    // IMAGES
    if (localStorage.getItem('autoShowLiveCaptures') === 'true') {
        localStorage.setItem('autoShowLiveCaptures', 'false');
        loadCaptures();
    }

    $('#liveCapturesBtn').click(function () {
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
                                </div>
                            </div>
                        `;
                        imagesContainer.append(imgHtml);
                    });

                    $('.clickable').on('click', function () {
                        var imageSrc = $(this).data('imgsrc');
                        showPreview(imageSrc);
                    });
                }
            },
            error: function () {
                alert('Error loading images.');
            }
        });
    }

    // VIDEO
    if (localStorage.getItem('autoShowLiveRecordings') === 'true') {
        localStorage.setItem('autoShowLiveRecordings', 'false');
        loadRecordings();
    }

    $('#liveRecordingsBtn').click(function () {
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
        if (e.target !== this) return; // Asigură-te că evenimentul de click vine de la overlay sau butonul de închidere, nu din interior
        $('#preview-overlay').hide();
        var videoPreview = document.getElementById('videoPreview');
        if (videoPreview) {
            videoPreview.pause();
            videoPreview.currentTime = 0;
        }
    });


});

function showPreview(imageSrc) {
    $('#preview-overlay video').hide();
    $('#preview-overlay img').attr('src', imageSrc);
    $('#preview-overlay').show();
}

function showVideoPreview(videoSrc) {
    $('#preview-overlay img').hide();
    var videoPreview = $('#videoPreview');
    videoPreview.show();
    videoPreview.find('source').attr('src', videoSrc);
    videoPreview[0].load();
    $('#preview-overlay').show();
}