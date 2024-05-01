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


    pauseButton.addEventListener('click', function () {
        const videoElement = document.querySelector("#videoContainer video");
        const icon = pauseButton.querySelector("i");

        // Verifică dacă videoElement există și are dimensiuni
        if (videoElement && videoElement.videoWidth > 0) {
            if (!isPaused) {
                const captureCanvas = document.createElement("canvas");
                captureCanvas.id = "capturedCanvas";
                captureCanvas.width = videoElement.videoWidth;
                captureCanvas.height = videoElement.videoHeight;
                const context = captureCanvas.getContext('2d');
                context.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);

                captureCanvas.setAttribute("data-video-width", videoElement.videoWidth);
                captureCanvas.setAttribute("data-video-height", videoElement.videoHeight);

                videoElement.style.display = 'none'; // Ascunde video
                videoElement.parentNode.insertBefore(captureCanvas, videoElement.nextSibling); // Afișează canvas-ul
                videoElement.muted = true; // Oprește sunetul

                isPaused = true;
                icon.className = "fas fa-play";
                pauseButton.innerHTML = pauseButton.innerHTML.replace("Pause", "Play");

            } else {
                // Logica pentru reluare: ascunde canvas-ul, afișează video-ul și pornește sunetul
                const captureCanvas = videoElement.nextElementSibling;
                if (captureCanvas) captureCanvas.remove();

                videoElement.style.display = 'flex'; // Afișează video
                videoElement.muted = false; // Porneste sunetul

                isPaused = false;
                icon.className = "fas fa-pause";
                pauseButton.innerHTML = pauseButton.innerHTML.replace("Play", "Pause");

            }
        } else {
            console.error("Elementul video nu este încă gata sau nu există.");
        }
    });

    captureButton.onclick = function () {
        resetZoomMode();
        spinner.style.display = 'block';

        var container = document.querySelector("#videoContainer");
        var videoElement = container.querySelector("video");
        capturedCanvas = document.getElementById('capturedCanvas');
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        if (isPaused) {
            var videoWidth = parseInt(capturedCanvas.getAttribute("data-video-width"));
            var videoHeight = parseInt(capturedCanvas.getAttribute("data-video-height"));
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            ctx.drawImage(capturedCanvas, 0, 0, videoWidth, videoHeight);
        } else {

            if (videoElement) {
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

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
            body: JSON.stringify({ image: dataURL }),
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

        var videoElement = document.querySelector("#videoContainer video");
        videoElement.style.transformOrigin = `${xPos}% ${yPos}%`;

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
        var video = document.querySelector("#videoContainer video");
        video.style.transform = "scale(" + zoomLevel + ")";

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


    // LIVE RECORDINGS
    var recordingButton = document.getElementById("recordingButton");
    var recording = false;
    var recordedBlobs;
    var mediaRecorder;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function (stream) {
            window.stream = stream;
            var videoElement = document.querySelector("#videoContainer img");
            if (videoElement) {
                videoElement.srcObject = stream;
            } else {
                var video = document.createElement("video");
                video.srcObject = stream;
                videoContainer.appendChild(video);
                video.play();
            }
        })
        .catch(function (err) {
            console.error("Error accessing media devices.", err);
        });

    recordingButton.onclick = function () {
        if (window.stream) {
            if (recording) {
                stopRecording();
                spinner.style.display = 'block';
                recordingButton.textContent = 'Start Recording';
                recording = false;
            } else {
                startRecording();
                spinner.style.display = 'none';
                recordingButton.textContent = 'Stop Recording';
                recording = true;
            }
        } else {
            console.error("Media stream not available.");
        }
    };

    function startRecording() {
        recordedBlobs = [];
        let options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error(`${options.mimeType} is not supported`);
            options = { mimeType: 'video/webm;codecs=vp8' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.error(`${options.mimeType} is not Supported`);
                options = { mimeType: 'video/webm' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.error(`${options.mimeType} is not Supported`);
                    options = { mimeType: '' };
                }
            }
        }

        try {
            mediaRecorder = new MediaRecorder(window.stream, options);
        } catch (e) {
            console.error('Exception while creating MediaRecorder:', e);
            return;
        }

        mediaRecorder.onstop = (event) => {
            console.log('Recorder stopped: ', event);
            console.log('Recorded Blobs: ', recordedBlobs);
            uploadVideo(new Blob(recordedBlobs, { type: 'video/webm' }));
        };
        mediaRecorder.ondataavailable = function (event) {
            if (event.data && event.data.size > 0) {
                recordedBlobs.push(event.data);
            }
        };
        mediaRecorder.start(10);
    }

    function stopRecording() {
        mediaRecorder.stop();
    }

    function uploadVideo(blob) {
        let formData = new FormData();
        formData.append('video', blob, 'myRecording.webm');

        fetch('/upload_video', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
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
                spinner.style.display = 'none';
            });
    }

    document.getElementById('viewRecordingsBtn').addEventListener('click', function () {
        localStorage.setItem('autoShowLiveRecordings', 'true');
        window.location.href = storageUrl;
    });

};