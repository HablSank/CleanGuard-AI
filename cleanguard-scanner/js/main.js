const { createApp, ref, computed, onMounted, onUnmounted, watch } = Vue;

const app = createApp({
    delimiters: ["[['", "']]"], 
    
    setup() {
        const student1 = ref(null);
        const student2 = ref(null);
        const student1ScanTime = ref('');
        const student2ScanTime = ref('');
        
        const rfidInput = ref('');
        const loading = ref(false);
        const message = ref('');
        const success = ref(false);
        
        const currentTime = ref('');
        const currentDate = ref('');
        const sessionId = ref('');
        const sessionStartTime = ref(null);
        const sessionDuration = ref('00:00');
        
        const detectionStatus = ref({ personCount: 0, trashBinDetected: false, isValid: false });
        
        const trashValidationStatus = ref({ valid: false, personDetected: false, trashDetected: false, message: 'Menunggu deteksi...' });
        
        let validationPollingInterval = null;
        const isPollingActive = ref(false);
        const showSuccessModal = ref(false);
        const systemStatus = ref('online');
        const statusText = ref('SYSTEM READY');

        const scanStep = computed(() => {
            if (student1.value && student2.value) return 2;
            if (student1.value) return 1;
            return 0;
        });
        
        const showCamera = computed(() => student1.value !== null && student2.value !== null);
        const validationComplete = computed(() => student1.value !== null && student2.value !== null);
        
        const inputPlaceholder = computed(() => {
            if (validationComplete.value) return 'VALIDASI SELESAI';
            if (student1.value) return 'SCAN KARTU PARTNER...';
            return 'SCAN KARTU RFID...';
        });
        
        const currentInstruction = computed(() => {
            if (validationComplete.value) return 'Validasi selesai! Kedua siswa telah terverifikasi. Silakan lakukan kegiatan kebersihan bersama partner Anda.';
            if (student1.value) return `${student1.value.name} telah tervalidasi. Silakan minta partner Anda untuk scan kartu RFID-nya.`;
            return 'Tempelkan kartu RFID Anda pada reader untuk memulai validasi. Diperlukan 2 siswa untuk mengaktifkan sistem.';
        });
        
        const statusBadgeClass = computed(() => {
            if (validationComplete.value) return 'border-neon-green bg-neon-green/20 text-neon-green';
            if (student1.value) return 'border-neon-yellow bg-neon-yellow/20 text-neon-yellow';
            return 'border-gray-600 bg-gray-800 text-gray-400';
        });
        
        const generateSessionId = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = 'CG-';
            for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
            return result;
        };
        
        const updateTime = () => {
            const now = new Date();
            currentTime.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            currentDate.value = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        };
        
        const updateSessionDuration = () => {
            if (!sessionStartTime.value) return;
            const now = new Date();
            const diff = Math.floor((now - sessionStartTime.value) / 1000);
            const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
            const seconds = (diff % 60).toString().padStart(2, '0');
            sessionDuration.value = `${minutes}:${seconds}`;
        };
        
        const speak = (text) => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'id-ID';
                window.speechSynthesis.speak(utterance);
            }
        };
        
        const playBeep = (type = 'success') => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (type === 'success') { oscillator.frequency.value = 880; oscillator.type = 'sine'; } 
            else if (type === 'error') { oscillator.frequency.value = 220; oscillator.type = 'square'; } 
            else if (type === 'complete') { oscillator.frequency.value = 1320; oscillator.type = 'sine'; }
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        };
        
        const handleScan = async () => {
            const uid = rfidInput.value.trim();
            if (!uid || loading.value || validationComplete.value) return;
            
            loading.value = true;
            message.value = '';
            
            try {
                const response = await axios.post('/api/validasi-rfid', { uid });
                
                if (response.data.success) {
                    const studentData = response.data.data;
                    const scanTime = new Date().toLocaleTimeString('id-ID');
                    
                    if (student1.value && student1.value.uid === studentData.uid) {
                        success.value = false;
                        message.value = 'Kartu ini sudah digunakan oleh Siswa 1!';
                        playBeep('error');
                        speak('Kartu ini sudah digunakan.');
                        return;
                    }
                    
                    if (!student1.value) {
                        student1.value = studentData;
                        student1ScanTime.value = scanTime;
                        success.value = true;
                        message.value = `Selamat datang, ${studentData.name}!`;
                        sessionStartTime.value = new Date();
                        
                        playBeep('success');
                        setTimeout(() => { speak(`Halo ${studentData.name}. Silakan scan kartu partner Anda.`); }, 300);
                        
                        systemStatus.value = 'waiting';
                        statusText.value = 'WAITING PARTNER';
                        
                    } else if (!student2.value) {
                        student2.value = studentData;
                        student2ScanTime.value = scanTime;
                        success.value = true;
                        message.value = 'Akses Diterima! Mengaktifkan Kamera...';
                        
                        playBeep('complete');
                        setTimeout(() => { speak(`Akses diterima.`); }, 300);
                        
                        systemStatus.value = 'online';
                        statusText.value = 'CAMERA ACTIVE';
                        
                        setTimeout(() => { startValidationPolling(); }, 2000);
                    }
                } else {
                    success.value = false; message.value = response.data.message; playBeep('error');
                }
            } catch (error) {
                success.value = false; message.value = error.response?.data?.message || 'Gagal terhubung'; playBeep('error');
            } finally {
                loading.value = false; rfidInput.value = '';
                setTimeout(() => { const inputEl = document.querySelector('input[type="text"]'); if (inputEl) inputEl.focus(); }, 100);
            }
        };
        
        const resetSession = async () => {
            stopValidationPolling();
            playBeep('error');
            student1.value = null; student2.value = null; student1ScanTime.value = ''; student2ScanTime.value = '';
            message.value = ''; success.value = false; sessionStartTime.value = null; sessionDuration.value = '00:00';
            sessionId.value = generateSessionId(); showSuccessModal.value = false;
            trashValidationStatus.value = { valid: false, personDetected: false, trashDetected: false, message: 'Menunggu deteksi...' };
            systemStatus.value = 'online'; statusText.value = 'SYSTEM READY';
            speak('Sesi direset.');
            setTimeout(() => { const inputEl = document.querySelector('input[type="text"]'); if (inputEl) inputEl.focus(); }, 100);
            try { await axios.post('/api/reset-session'); } catch (e) {}
        };
        
        const fetchDetectionStatus = async () => {
            if (!showCamera.value) return;
            try {
                const response = await axios.get('/api/detection-status');
                detectionStatus.value = { personCount: response.data.person_count || 0, trashBinDetected: response.data.trash_bin_detected || false, isValid: response.data.is_valid || false };
            } catch (error) {}
        };
        
        const startValidationPolling = () => {
            if (isPollingActive.value) return;
            isPollingActive.value = true;
            
            validationPollingInterval = setInterval(async () => {
                if (!showCamera.value) { stopValidationPolling(); return; }
                
                try {
                    const response = await axios.get('/api/check-validation');
                    const data = response.data;
                    
                    trashValidationStatus.value = { valid: data.valid, personDetected: data.person_detected, trashDetected: data.trash_detected, message: data.message };
                    detectionStatus.value.personCount = data.person_detected ? 1 : 0;
                    detectionStatus.value.trashBinDetected = data.trash_detected;
                    
                    if (data.valid) {
                        stopValidationPolling(); 
                        
                        try {
                            await axios.post('/api/simpan-log', { uid: student1.value.uid });
                            await axios.post('/api/simpan-log', { uid: student2.value.uid });
                            await axios.post('/api/cetak-struk', { 
                                siswa1: student1.value.name,
                                siswa2: student2.value.name
                            });
                            console.log(`[CleanGuard] Perintah cetak struk dikirim!`);
                        } catch (err) {}
                        
                        showSuccessModal.value = true;
                        message.value = '✓ SAMPAH BERHASIL DIBUANG & POIN DITAMBAHKAN!';
                        success.value = true;
                        
                        playBeep('complete');
                        speak('Validasi berhasil!');
                        
                        systemStatus.value = 'online';
                        statusText.value = 'VALIDATION SUCCESS';
                        
                        setTimeout(async () => {
                            showSuccessModal.value = false;
                            try { await axios.post('/api/reset-validation'); } catch (e) {}
                            await resetSession();
                        }, 5000);
                    }
                } catch (error) {}
            }, 1000);
        };
        
        const stopValidationPolling = () => {
            if (validationPollingInterval) { clearInterval(validationPollingInterval); validationPollingInterval = null; }
            isPollingActive.value = false;
        };
        
        let timeInterval = null; let durationInterval = null; let detectionInterval = null;
        
        onMounted(() => {
            sessionId.value = generateSessionId();
            updateTime();
            timeInterval = setInterval(updateTime, 1000);
            durationInterval = setInterval(updateSessionDuration, 1000);
            detectionInterval = setInterval(fetchDetectionStatus, 100); // Polling cepat Anti-delay
            
            setTimeout(() => { const inputEl = document.querySelector('input[type="text"]'); if (inputEl) inputEl.focus(); }, 500);
        });
        
        onUnmounted(() => {
            if (timeInterval) clearInterval(timeInterval);
            if (durationInterval) clearInterval(durationInterval);
            if (detectionInterval) clearInterval(detectionInterval);
            stopValidationPolling();
        });
        
        return {
            student1, student2, student1ScanTime, student2ScanTime, rfidInput, loading, message, success,
            currentTime, currentDate, sessionId, sessionDuration, detectionStatus, systemStatus, statusText,
            trashValidationStatus, showSuccessModal, isPollingActive, scanStep, showCamera, validationComplete,
            inputPlaceholder, currentInstruction, statusBadgeClass, handleScan, resetSession,
            startValidationPolling, stopValidationPolling
        };
    }
});

app.directive('autofocus', {
    mounted(el) {
        el.focus();
        el.addEventListener('blur', () => { setTimeout(() => { if (!el.disabled) el.focus(); }, 100); });
    }
});

app.mount('#app');