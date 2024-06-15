
document.addEventListener('DOMContentLoaded', function () {
    var videoContainer = document.getElementById('videoContainer');
    videoContainer.classList.add('loading');
    spinner.style.display = 'block';
    var videoImage = document.querySelector('#videoContainer img');

    videoImage.addEventListener('load', function () {
        videoContainer.classList.remove('loading');
        spinner.style.display = 'none';
    });

    var videoFeed = document.getElementById('videoFeed');
    var errorMessage = document.getElementById('errorMessage');

    videoFeed.onerror = function () {
        errorMessage.style.display = 'block';
        videoFeed.style.display = 'none';
        spinner.style.display = 'none';
    };

    videoFeed.onload = function () {
        errorMessage.style.display = 'none';
        videoFeed.style.display = 'block';
        spinner.style.display = 'block';
    };

    function updateVideoState() {
        if (videoFeed.complete && videoFeed.naturalHeight !== 0) {
            errorMessage.style.display = 'none';
            videoFeed.style.display = 'block';
            spinner.style.display = 'none';
        } else {
            errorMessage.style.display = 'block';
            videoFeed.style.display = 'none';
            spinner.style.display = 'none';
        }
    }

    videoFeed.onerror = function () {
        errorMessage.style.display = 'block';
        videoFeed.style.display = 'none';
        spinner.style.display = 'none';
    };

    videoFeed.onload = function () {
        errorMessage.style.display = 'none';
        videoFeed.style.display = 'block';
        spinner.style.display = 'none';
    };

    // Verifică starea la inițializare
    updateVideoState();
});

window.onload = function () {
    let isPaused = false;
    var zoomLevel = 1;
    var minZoomLevel = 1;
    var maxZoomLevel = 5;
    var zoomFactor = 1.1;
    var videoContainer = document.getElementById('videoContainer');
    var pauseButton = document.getElementById("pauseButton");
    var captureButton = document.getElementById("captureButton");
    var zoomInButton = document.getElementById("zoomInButton");
    var zoomOutButton = document.getElementById("zoomOutButton");
    var capturedCanvas;
    var recordingButton = document.getElementById("recordingButton");
    var isRecording = false;
    var mediaRecorder;
    var recordedBlobs;

    var videoFeed = document.getElementById("videoFeed");

    // PAUSE
    pauseButton.addEventListener('click', function () {
        const videoElement = document.querySelector("#videoContainer img");
        const icon = pauseButton.querySelector("i");

        if (videoElement && videoElement.width > 0) {
            if (!isPaused) {
                const captureCanvas = document.createElement("canvas");
                captureCanvas.id = "capturedCanvas";
                captureCanvas.width = videoElement.width;
                captureCanvas.height = videoElement.height;
                const context = captureCanvas.getContext('2d');
                context.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);

                captureCanvas.setAttribute("data-video-width", videoElement.width);
                captureCanvas.setAttribute("data-video-height", videoElement.height);

                videoElement.style.display = 'none';
                videoElement.parentNode.insertBefore(captureCanvas, videoElement.nextSibling);

                isPaused = true;
                icon.className = "fas fa-play";
                pauseButton.innerHTML = pauseButton.innerHTML.replace("Pause", "Play");

            } else {
                const captureCanvas = videoElement.nextElementSibling;
                if (captureCanvas) captureCanvas.remove();

                videoElement.style.display = 'block';

                isPaused = false;
                icon.className = "fas fa-pause";
                pauseButton.innerHTML = pauseButton.innerHTML.replace("Play", "Pause");
            }
        } else {
            console.error("Elementul video nu este încă gata sau nu există.");
        }
    });

    // CAPTURE
    captureButton.onclick = function () {
        resetZoomMode();
        spinner.style.display = 'block';

        var container = document.querySelector("#videoContainer");
        var videoElement = container.querySelector("img");
        capturedCanvas = document.getElementById('capturedCanvas');
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var selectedCamera = document.getElementById('regCamera').value;

        if (isPaused) {
            var videoWidth = parseInt(capturedCanvas.getAttribute("data-video-width"));
            var videoHeight = parseInt(capturedCanvas.getAttribute("data-video-height"));
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            ctx.drawImage(capturedCanvas, 0, 0, videoWidth, videoHeight);
        } else {
            if (videoElement) {
                canvas.width = videoElement.width;
                canvas.height = videoElement.height;
                ctx.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
            } else {
                console.error("No media element found for capture.");
                return;
            }
        }

        var dataURL = canvas.toDataURL("image/png");

        fetch('/upload_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: dataURL, camera: selectedCamera }),
        })
            .then(response => response.json())
            .then(data => {
                spinner.style.display = 'none';
                document.getElementById("successMessageCapture").innerText = data.message;
                var successModal = document.getElementById("successModalCapture");
                successModal.style.display = "block";

                var closeSuccess = document.getElementsByClassName("close-success-captures")[0];
                closeSuccess.onclick = function () {
                    successModal.style.display = "none";
                };

                window.onclick = function (event) {
                    if (event.target == successModal) {
                        successModal.style.display = "none";
                    }
                };
            })
            .catch((error) => {
                console.error('Error:', error);
                spinner.style.display = 'none';
            });
    };

    // RECORDING
    recordingButton.onclick = function () {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    function startRecording() {
        var canvas = document.getElementById("videoCanvas");
        var selectedCamera = document.getElementById('regCamera').value;

        if (!canvas) {
            console.error("Canvas element not found");
            return;
        }

        if (canvas.width === 0 || canvas.height === 0) {
            console.error("Canvas dimensions are not set");
            return;
        }

        var ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("Failed to get 2D context for canvas");
            return;
        }

        recordedBlobs = [];
        var options = { mimeType: 'video/webm;codecs=vp9' };

        try {
            var stream = canvas.captureStream(30); // 30 FPS
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error('Exception while creating MediaRecorder:', e);
            return;
        }

        recordingButton.textContent = 'Stop Recording';
        mediaRecorder.onstop = (event) => {
            console.log('Recorder stopped:', event);
            console.log('Recorded Blobs:', recordedBlobs);

            var blob = new Blob(recordedBlobs, { type: 'video/webm' });
            var formData = new FormData();
            formData.append('video', blob, 'manual_recording.webm');
            formData.append('camera', selectedCamera);

            fetch('/upload_manual_video', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Video successfully uploaded:', data.message);
                    spinner.style.display = 'none';
                    document.getElementById("successMessageRecording").innerText = data.message;
                    var successModal = document.getElementById("successModalRecording");
                    successModal.style.display = "block";

                    var closeSuccess = document.getElementsByClassName("close-success-recordings")[0];
                    closeSuccess.onclick = function () {
                        successModal.style.display = "none";
                    };

                    window.onclick = function (event) {
                        if (event.target == successModal) {
                            successModal.style.display = "none";
                        }
                    };
                })
                .catch((error) => {
                    console.error('Error uploading video:', error);
                });
        };

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedBlobs.push(event.data);
            }
        };

        mediaRecorder.start(10); // Collect 10ms of data
        console.log('MediaRecorder started', mediaRecorder);
        isRecording = true;

        // Start drawing frames from the video feed to the canvas
        drawFrame();
    }

    function stopRecording() {
        mediaRecorder.stop();
        recordingButton.textContent = 'Start Recording';
        isRecording = false;
        spinner.style.display = 'block';
    }

    function drawFrame() {
        var canvas = document.getElementById("videoCanvas");
        var ctx = canvas.getContext("2d");
        if (!isRecording) return;

        canvas.width = videoFeed.width;
        canvas.height = videoFeed.height;
        ctx.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);

        requestAnimationFrame(drawFrame);
    }

    // Zoom in
    zoomInButton.addEventListener('click', function () {
        resetZoomMode();
        window.isZoomInMode = true;
        updateCursor();
    });

    // Zoom out
    zoomOutButton.addEventListener('click', function () {
        resetZoomMode();
        window.isZoomOutMode = true;
        updateCursor();
    });

    // Funcția pentru gestionarea zoom-ului și actualizarea canvas-ului de captură
    function handleZoomAndCapture(e) {
        var rect = videoContainer.getBoundingClientRect();
        var xPos = (e.clientX - rect.left) / rect.width * 100;
        var yPos = (e.clientY - rect.top) / rect.height * 100;

        var imgElement = document.querySelector("#videoContainer img");
        imgElement.style.transformOrigin = `${xPos}% ${yPos}%`;

        if (window.isZoomInMode && zoomLevel < maxZoomLevel) {
            zoomLevel *= zoomFactor;
        } else if (window.isZoomOutMode && zoomLevel > minZoomLevel) {
            zoomLevel /= zoomFactor;
            if (zoomLevel < minZoomLevel) zoomLevel = minZoomLevel;
        }
        updateZoom();
    }

    // Actualizați evenimentul de click pentru a apela handleZoomAndCapture
    videoContainer.addEventListener('click', handleZoomAndCapture);

    // Actualizați funcția de zoom pentru a afecta și canvas-ul de captură
    function updateZoom() {
        var imgElement = document.querySelector("#videoContainer img");
        imgElement.style.transform = "scale(" + zoomLevel + ")";

        var capturedCanvas = document.getElementById('capturedCanvas');
        if (capturedCanvas) {
            capturedCanvas.style.transform = "scale(" + zoomLevel + ")";
        }
    }

    // Resetarea modului de zoom
    function resetZoomMode() {
        window.isZoomInMode = false;
        window.isZoomOutMode = false;
        updateCursor();
    }

    // Actualizarea cursorului în funcție de modul de zoom
    function updateCursor() {
        if (window.isZoomInMode) {
            videoContainer.className = 'zoom-in-cursor';
        } else if (window.isZoomOutMode) {
            videoContainer.className = 'zoom-out-cursor';
        } else {
            videoContainer.className = '';
        }
    }

    // function downloadImage(dataUrl, filename) {
    //     var a = document.createElement('a');
    //     a.href = dataUrl;
    //     a.download = filename;
    //     document.body.appendChild(a);
    //     a.click();
    //     document.body.removeChild(a);
    // }

    document.getElementById('viewCapturesBtn').addEventListener('click', function () {
        localStorage.setItem('autoShowLiveCaptures', 'true');
        window.location.href = storageUrl;
    });


    document.getElementById('viewRecordingsBtn').addEventListener('click', function () {
        localStorage.setItem('autoShowLiveRecordings', 'true');
        window.location.href = storageUrl;
    });

};


$(document).ready(function () {
    $.ajax({
        url: '/get_user_cameras',
        type: 'GET',
        success: function (response) {
            if (response.error) {
                console.error(response.error);
                return;
            }

            if (Array.isArray(response)) {
                var select = $('#regCamera');
                select.empty(); // Curăță opțiunile existente

                response.forEach(function (camera) {
                    select.append('<option value="' + camera + '">' + camera + '</option>');
                });

                if (response.length > 0) {
                    select.val(response[0]).trigger('change');
                }
            } else {
                console.error('Expected an array but got:', response);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
        }
    });


    $('#regCamera').change(function () {
        var selectedCamera = $(this).val();

        var $spinner = $('#spinner');
        $spinner.show();
        $.ajax({
            url: '/get_camera_ip',
            type: 'GET',
            data: { camera: selectedCamera },
            success: function (response) {
                if (response.error) {
                    console.error(response.error);
                    $('#videoFeed').hide();
                    $('#errorMessage').show();
                } else {
                    $('#videoFeed').attr('src', response.ip_address);
                    $('#videoFeed').show();
                    $('#errorMessage').hide();
                }
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);
                $('#videoFeed').hide();
                $('#errorMessage').show();
                $spinner.hide();
            }
        });
    });

});