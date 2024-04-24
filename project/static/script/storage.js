// $(document).ready(function () {
//     var currentPage = 1;
//     var itemsPerPage = 15;

//     $('#dateFilter').val("");
//     loadCaptures();
//     //loadCaptures('', currentPage, itemsPerPage);

//     if (localStorage.getItem('autoShowLiveCaptures') === 'true') {
//         localStorage.setItem('autoShowLiveCaptures', 'false');
//         currentState = 'captures';
//         $('#dateFilter').val("");
//         loadCaptures();
//         //loadCaptures('', currentPage, itemsPerPage);
//     }

//     if (localStorage.getItem('autoShowLiveRecordings') === 'true') {
//         localStorage.setItem('autoShowLiveRecordings', 'false');
//         currentState = 'recordings';
//         $('#dateFilter').val("");
//         loadRecordings();
//     }
// });
// var currentState = 'captures';

// // FILTER BY DATE
// $('#dateFilter').change(function () {
//     if (currentState == 'captures') {
//         loadCaptures($(this).val());
//     } else {
//         loadRecordings($(this).val());
//     }
// });

// // IMAGES
// $('#liveCapturesBtn').click(function () {
//     currentState = 'captures';
//     $('#dateFilter').val("");
//     currentPage = 1;
//     // loadCaptures('', currentPage, itemsPerPage);
//     loadCaptures();
// });


// function renderPagination(totalPages, currentPage) {
//     var paginationContainer = document.getElementById('pagination');
//     paginationContainer.innerHTML = '';

//     if (totalPages <= 1) {
//         return;
//     }

//     var prevPageBtn = createPaginationButton('<<', currentPage > 1 ? currentPage - 1 : 1);
//     paginationContainer.appendChild(prevPageBtn);

//     if (currentPage > 3) {
//         paginationContainer.appendChild(createPaginationButton('1', 1));
//         paginationContainer.appendChild(createPaginationButton('...', null));
//     }

//     for (var i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
//         paginationContainer.appendChild(createPaginationButton(i.toString(), i));
//     }

//     if (currentPage < totalPages - 2) {
//         paginationContainer.appendChild(createPaginationButton('...', null));
//         paginationContainer.appendChild(createPaginationButton(totalPages.toString(), totalPages));
//     }

//     var nextPageBtn = createPaginationButton('>>', currentPage < totalPages ? currentPage + 1 : totalPages);
//     paginationContainer.appendChild(nextPageBtn);
// }

// function createPaginationButton(label, page) {
//     var button = document.createElement('button');
//     button.textContent = label;
//     button.classList.add('btn-pagination');
//     button.dataset.page = page;
//     button.onclick = function () {
//         var page = parseInt(this.dataset.page);
//         loadPage(page);
//     };
//     return button;
// }



// function loadCaptures(selectedDate = '') {
//     $.ajax({
//         url: '/get_images',
//         data: { date: selectedDate },
//         type: 'GET',
//         success: function (response) {
//             var imagesContainer = $('#imagesContainer');
//             var messageContainer = $('#message');
//             var paginationContainer = $('#pagination');

//             imagesContainer.empty();
//             messageContainer.empty();
//             paginationContainer.empty();

//             if (response.length === 0) {
//                 messageContainer.append('<div class="text-center no-data"><i class="fas fa-images" aria-hidden="true"></i><p>No photos available.</p></div>');
//             } else {
//                 messageContainer.empty();
//                 var currentPage = 1;
//                 var itemsPerPage = 15;
//                 var totalPages = Math.ceil(response.length / itemsPerPage);
//                 renderPagination(totalPages, currentPage);

//                 var startIndex = (currentPage - 1) * itemsPerPage;
//                 var endIndex = Math.min(startIndex + itemsPerPage, response.length);
//                 for (var i = startIndex; i < endIndex; i++) {
//                     var image = response[i];
//                     var imgHtml = `
//                         <div class="col-md-4 image-card">
//                             <img src="${image.url}" class="img-fluid img-thumbnail clickable" data-imgsrc="${image.url}">
//                             <div class="image-info">
//                                 <p>Size: ${image.size}</p>
//                                 <p>${image.timestamp}</p>
//                             </div>
//                             <div class="overlay-buttons">
//                                 <button class="btn btn-custom preview-btn clickable" data-imgsrc="${image.url}"><i class="fa fa-eye"></i></button>
//                                 <button class="btn btn-danger delete-btn" data-storage-path="${image.storage_path}" data-unique-id="${image.unique_id}"><i class="fa fa-trash"></i></button>
//                             </div>
//                         </div>
//                     `;
//                     imagesContainer.append(imgHtml);
//                 }

//                 $('.clickable').on('click', function () {
//                     var imageSrc = $(this).data('imgsrc');
//                     showPreview(imageSrc);
//                 });

//                 $('.delete-btn').on('click', function () {
//                     if (!confirm('Are you sure you want to delete this image?')) {
//                         return;
//                     }

//                     var uniqueId = $(this).data('unique-id');
//                     var storagePath = $(this).data('storage-path');

//                     $.ajax({
//                         url: '/delete_image',
//                         type: 'POST',
//                         contentType: 'application/json',
//                         data: JSON.stringify({ 'unique_id': uniqueId, 'storage_path': storagePath }),
//                         success: function (response) {
//                             alert(response.message);
//                             if (response.status === 'success') {
//                                 loadCaptures(selectedDate, page, itemsPerPage); // Reîncărcați imaginile după ștergere
//                             }
//                         },
//                         error: function (error) {
//                             console.log(error);
//                             alert('Failed to delete the image.' + error);
//                         }
//                     });
//                 });
//             }
//         },
//         error: function () {
//             alert('Error loading images.');
//         }
//     });
// }



$(document).ready(function () {
    var currentPage = 1;
    var itemsPerPage = 15;

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

    // Event listeners for pagination buttons
    $('#pagination').on('click', '.btn-pagination', function () {
        var page = parseInt($(this).data('page'));
        currentPage = page;
        if (currentState == 'captures') {
            loadCaptures($('#dateFilter').val(), currentPage);
        } else {
            loadRecordings($('#dateFilter').val(), currentPage);
        }
    });
    // FILTER BY DATE
    $('#dateFilter').change(function () {
        if (currentState == 'captures') {
            loadCaptures($(this).val());
        } else {
            loadRecordings($(this).val());
        }
    });
});
var currentState = 'captures';


function renderPagination(totalPages, currentPage) {
    var paginationContainer = $('#pagination');
    paginationContainer.empty();

    if (totalPages <= 1) {
        return;
    }

    if (currentPage === 1) {
        paginationContainer.append(createPaginationButton('<<', 1, true, true));
        paginationContainer.append(createPaginationButton('<', 1, true, true));
    } else {
        paginationContainer.append(createPaginationButton('<<', 1));
        paginationContainer.append(createPaginationButton('<', currentPage > 1 ? currentPage - 1 : 1));
    }

    // Add current page and surrounding pages
    for (var i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        paginationContainer.append(createPaginationButton(i.toString(), i, i === currentPage));
    }

    // Add next page button
    if (currentPage === totalPages) {
        paginationContainer.append(createPaginationButton('>', totalPages, true, true));
        paginationContainer.append(createPaginationButton('>>', totalPages, true, true));
    } else {
        paginationContainer.append(createPaginationButton('>', currentPage < totalPages ? currentPage + 1 : totalPages));
        paginationContainer.append(createPaginationButton('>>', totalPages));
    }
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

// IMAGES
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
                                loadCaptures(selectedDate); // Reload images after deletion
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
                    // response.forEach(function (video) {
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
                };
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

