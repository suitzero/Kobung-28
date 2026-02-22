let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let imageBlob = null;
let taskId = null;
let pollInterval;

const cameraBtn = document.getElementById('cameraBtn');
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const submitBtn = document.getElementById('submitBtn');
const video = document.getElementById('cameraPreview');
const canvas = document.getElementById('canvas');
const photoPreview = document.getElementById('photoPreview');
const audioPreview = document.getElementById('audioPreview');
const statusDiv = document.getElementById('status');
const responseTextDiv = document.getElementById('responseText');

// Camera handling
cameraBtn.addEventListener('click', async () => {
    if (cameraBtn.textContent === 'Take Photo' || cameraBtn.textContent === 'Retake Photo') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.style.display = 'block';
            photoPreview.style.display = 'none';
            cameraBtn.textContent = 'Capture';
            // Don't disable submit yet, user might want to submit existing audio
        } catch (err) {
            console.error("Error accessing camera: ", err);
            statusDiv.textContent = 'Error accessing camera: ' + err.message;
        }
    } else {
        // Capture
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob(blob => {
            imageBlob = blob;
            photoPreview.src = URL.createObjectURL(blob);
            photoPreview.style.display = 'block';
            video.style.display = 'none';

            // Stop camera stream
            const stream = video.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            cameraBtn.textContent = 'Retake Photo';
            checkSubmitButton();
        }, 'image/jpeg');
    }
});

// Audio handling
recordBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioPreview.src = URL.createObjectURL(audioBlob);
            audioPreview.style.display = 'block';
            checkSubmitButton();
        };

        mediaRecorder.start();
        recordBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        statusDiv.textContent = 'Recording...';
        submitBtn.disabled = true;
    } catch (err) {
        console.error("Error accessing microphone: ", err);
        statusDiv.textContent = 'Error accessing microphone: ' + err.message;
    }
});

stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopBtn.style.display = 'none';
        recordBtn.style.display = 'inline-block';
        recordBtn.textContent = 'Record Again';
        statusDiv.textContent = 'Recording stopped.';
    }
});

function checkSubmitButton() {
    if (imageBlob || audioBlob) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

submitBtn.addEventListener('click', async () => {
    if (!imageBlob && !audioBlob) {
        statusDiv.textContent = 'Please capture a photo or record audio first.';
        return;
    }

    statusDiv.textContent = 'Uploading...';
    submitBtn.disabled = true;

    const formData = new FormData();
    if (imageBlob) formData.append('image', imageBlob, 'photo.jpg');
    if (audioBlob) formData.append('audio', audioBlob, 'audio.wav');

    try {
        const response = await fetch('/submit', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            taskId = data.id;
            statusDiv.textContent = 'Processing... (Task ID: ' + taskId + ')';

            // Reset UI for polling state
            imageBlob = null;
            audioBlob = null;
            photoPreview.style.display = 'none';
            audioPreview.style.display = 'none';
            cameraBtn.textContent = 'Take Photo';
            recordBtn.textContent = 'Record Audio';

            startPolling();
        } else {
            const errorText = await response.text();
            statusDiv.textContent = 'Upload failed: ' + errorText;
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error("Error uploading: ", err);
        statusDiv.textContent = 'Error uploading: ' + err.message;
        submitBtn.disabled = false;
    }
});

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        if (!taskId) return;

        try {
            const response = await fetch(`/status/${taskId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'completed') {
                    clearInterval(pollInterval);
                    statusDiv.textContent = 'Completed!';
                    responseTextDiv.textContent = data.response_text;
                    submitBtn.disabled = true; // Wait for user to start new input
                    taskId = null;
                } else {
                     statusDiv.textContent = 'Processing... (Status: ' + data.status + ')';
                }
            } else {
                 console.error("Polling error:", response.status);
            }
        } catch (err) {
            console.error("Error polling: ", err);
        }
    }, 2000);
}
