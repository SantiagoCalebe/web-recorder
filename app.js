class WebRecorder {
    constructor() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.preview = document.getElementById('preview');
        this.audioSource = document.getElementById('audioSource');
        this.recordingsList = document.getElementById('recordingsList');
        this.timerDisplay = document.getElementById('timer');
        this.audioWarning = document.getElementById('audioWarning');

        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.timerInterval = null;
        this.startTime = null;
        this.recordings = [];

        this.initializeEventListeners();
        this.initializeDevices();
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.downloadBtn.addEventListener('click', () => this.downloadRecording());
    }

    async initializeDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.audioSource.innerHTML = '';
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.text = 'None';
            this.audioSource.appendChild(noneOption);

            devices.filter(d => d.kind === 'audioinput').forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${index + 1}`;
                this.audioSource.appendChild(option);
            });
        } catch (error) {
            console.error('Error initializing devices:', error);
        }
    }

    async startRecording() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: true
            });

            let audioStream = null;
            if (this.audioSource.value) {
                audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: { deviceId: { exact: this.audioSource.value } }
                });
            }

            if (screenStream.getVideoTracks()[0].kind === 'video') {
                if (screenStream.getVideoTracks()[0].label.includes('window')) {
                    this.audioWarning.style.display = 'block';
                    audioStream = null;
                } else {
                    this.audioWarning.style.display = 'none';
                }
            }

            const tracks = [...screenStream.getTracks(), ...(audioStream ? audioStream.getTracks() : [])];
            this.stream = new MediaStream(tracks);
            this.preview.srcObject = this.stream;
            this.preview.controls = false;
            this.preview.muted = true;
            this.preview.play();

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm; codecs=vp8',
                videoBitsPerSecond: 24 * 1000000  // 24 Mbps
            });

            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = event => this.recordedChunks.push(event.data);
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.downloadBtn.disabled = true;
            this.startTimer();

            screenStream.getTracks().forEach(track => {
                track.onended = () => {
                    console.log("Compartilhamento de tela interrompido.");
                    this.stopRecording();
                };
            });

        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }

    async stopRecording() {
        if (!this.isRecording) return;
        this.mediaRecorder.stop();
        this.isRecording = false;
        clearInterval(this.timerInterval);
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        this.mediaRecorder.onstop = async () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            if (blob.size > 0) {
                const url = URL.createObjectURL(blob);
                this.preview.srcObject = null;
                this.preview.src = url;
                this.preview.controls = true;
                this.preview.muted = false;
                this.preview.play();
                this.recordings.push({ blob, url });
                this.downloadBtn.disabled = false;
            }
        };
    }

    downloadRecording() {
        if (this.recordings.length === 0) return;
        const lastRecording = this.recordings[this.recordings.length - 1];
        const a = document.createElement('a');
        a.href = lastRecording.url;
        a.download = `recording_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            this.timerDisplay.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }
}

new WebRecorder();
