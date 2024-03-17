function downloadImage(dataUrl, filename) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

window.onload = function () {
    var cameraStarted = false;
    var zoomLevel = 1;
    var minZoomLevel = 1;
    var maxZoomLevel = 5;
    var zoomFactor = 1.1;
    var videoContainer = document.getElementById('videoContainer');
    var captureButton = document.getElementById("captureButton");
    var playButton = document.getElementById("playButton");
    var zoomInButton = document.getElementById("zoomInButton");
    var zoomOutButton = document.getElementById("zoomOutButton");

    if (!cameraStarted) {
        playButton.classList.add("playButtonPulse");
        captureButton.disabled = true;
        zoomInButton.disabled = true;
        zoomOutButton.disabled = true;
    }

    // Load and display video
    playButton.onclick = function () {
        playButton.classList.remove("playButtonPulse");
        var spinner = document.getElementById("spinner");
        spinner.style.display = 'block';


        // Check if an img already exists in the videoContainer
        if (videoContainer.getElementsByTagName('img').length === 0) {
            var img = document.createElement('img');
            img.src = "{{ url_for('video_feed') }}";
            img.alt = "Live Stream";
            img.onload = function () {
                spinner.style.display = 'none';
            };
            videoContainer.appendChild(img);
            cameraStarted = true;
            captureButton.disabled = false;
            zoomInButton.disabled = false;
            zoomOutButton.disabled = false;
        } else {
            spinner.style.display = 'none';
        }
    };

    // Capture the video image
    captureButton.onclick = function () {
        resetZoomMode();
        var videoElement = document.querySelector("#videoContainer img");
        var canvas = document.createElement("canvas");
        canvas.width = videoElement.width;
        canvas.height = videoElement.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        var dataURL = canvas.toDataURL("image/png");
        downloadImage(dataURL, 'capture.png');
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

    videoContainer.addEventListener('mousemove', function (e) {
        if (!window.isZoomInMode && !window.isZoomOutMode) return;

        var rect = videoContainer.getBoundingClientRect();
        var xPos = (e.clientX - rect.left) / rect.width * 100;
        var yPos = (e.clientY - rect.top) / rect.height * 100;

        var videoElement = document.querySelector("#videoContainer img");
        videoElement.style.transformOrigin = `${xPos}% ${yPos}%`;
    });

    videoContainer.addEventListener('click', function (e) {
        if (!window.isZoomInMode && !window.isZoomOutMode) return;

        if (window.isZoomInMode && zoomLevel < maxZoomLevel) {
            zoomLevel *= zoomFactor;
        } else if (window.isZoomOutMode && zoomLevel > minZoomLevel) {
            zoomLevel /= zoomFactor;
            if (zoomLevel < minZoomLevel) zoomLevel = minZoomLevel;
        }
        updateZoom();
    });

    function resetZoomMode() {
        window.isZoomInMode = false;
        window.isZoomOutMode = false;
        updateCursor();
    }

    function updateCursor() {
        if (window.isZoomInMode) {
            videoContainer.className = 'zoom-in-cursor';
        } else if (window.isZoomOutMode) {
            videoContainer.className = 'zoom-out-cursor';
        } else {
            videoContainer.className = '';
        }
    }

    function updateZoom() {
        var video = document.querySelector("#videoContainer img");
        video.style.transform = "scale(" + zoomLevel + ")";
    }

    function downloadImage(dataUrl, filename) {
        var a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};