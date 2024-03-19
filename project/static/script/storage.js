$(document).ready(function () {
    $('#liveCapturesBtn').click(function () {
        $.ajax({
            url: '/get_images',
            type: 'GET',
            success: function (response) {
                var imagesContainer = $('#imagesContainer');
                imagesContainer.empty();
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

                // $('.preview-btn').on('click', function() {
                //     var imageSrc = $(this).data('imgsrc');
                //     showPreview(imageSrc);
                // });

                $('.clickable').on('click', function () {
                    var imageSrc = $(this).data('imgsrc');
                    showPreview(imageSrc);
                });
            },
            error: function () {
                alert('Error loading images.');
            }
        });
    });

    $('#preview-overlay, .close-preview').click(function () {
        $('#preview-overlay').hide();
    });
});

function showPreview(imageSrc) {
    $('#preview-overlay img').attr('src', imageSrc);
    $('#preview-overlay').show();
}