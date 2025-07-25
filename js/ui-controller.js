/**
 * UI 컨트롤러 모듈 - 새로운 UI/UX 제어 전담
 */
export class UIController extends EventTarget {
    constructor() {
        super();
        this.elements = {};
        this.currentStep = 1;
        this.activeTab = 'measurement';
    }

    /**
     * DOM 요소 초기화 (새로운 구조에 맞게 재작성)
     */
    initializeElements() {
        this.elements = {
            // 화면
            welcomeScreen: document.getElementById('welcome-screen'),
            dashboardScreen: document.getElementById('dashboard-screen'),
            
            // 파일 로딩
            fileSelectButton: document.getElementById('file-select-button'),
            fileInput: document.getElementById('file-input'),
            dropZone: document.getElementById('drop-zone'),
            
            // 헤더
            patientName: document.getElementById('patient-name'),
            progressBar: document.getElementById('progress-bar'),
            progressSteps: document.querySelectorAll('.progress-step'),
            prevStepBtn: document.getElementById('prev-step-btn'),
            nextStepBtn: document.getElementById('next-step-btn'),

            // 뷰어 툴바
            modelFilename: document.getElementById('model-filename'),
            viewButtons: document.querySelectorAll('.view-btn'),
            gridToggle: document.getElementById('grid-toggle'),
            resetViewBtn: document.getElementById('reset-view-btn'),
            
            // 오른쪽 패널 (탭)
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // 측정값 탭
            lengthValue: document.getElementById('length-value'),
            widthValue: document.getElementById('width-value'),
            heightValue: document.getElementById('height-value'),
            archRatioValue: document.getElementById('arch-ratio-value'),
            measurementSummary: document.getElementById('measurement-summary'),

            // AI 분석 탭
            aiSummary: document.getElementById('ai-summary'),

            // 리포트 탭
            reportPatientInfo: document.getElementById('report-patient-info'),
            reportId: document.getElementById('report-id'),
            reportObservations: document.getElementById('report-observations'),
            downloadReportBtn: document.getElementById('download-report-btn'),
            generateQrBtn: document.getElementById('generate-qr-btn'),
            qrCodeContainer: document.getElementById('qr-code-container'),
            qrCode: document.getElementById('qr-code'),
        };
    }

    /**
     * 이벤트 리스너 설정 (새로운 구조에 맞게 재작성)
     */
    setupEventListeners() {
        // 파일 로딩
        this.elements.fileSelectButton?.addEventListener('click', () => this.elements.fileInput?.click());
        this.elements.fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.dispatchEvent(new CustomEvent('fileSelected', { detail: { file: e.target.files[0] } }));
            }
        });

        // 드래그 앤 드롭
        this.elements.dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.add('drag-over');
        });
        this.elements.dropZone?.addEventListener('dragleave', () => this.elements.dropZone.classList.remove('drag-over'));
        this.elements.dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.dispatchEvent(new CustomEvent('fileDropped', { detail: { files: e.dataTransfer.files } }));
            }
        });

        // 뷰어 툴바
        this.elements.viewButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { viewType: btn.dataset.view } }));
                this.updateActiveButton(this.elements.viewButtons, btn);
            });
        });
        this.elements.gridToggle?.addEventListener('change', (e) => {
            this.dispatchEvent(new CustomEvent('gridToggleRequested', { detail: { visible: e.target.checked } }));
        });
        this.elements.resetViewBtn?.addEventListener('click', () => this.dispatchEvent(new CustomEvent('viewResetRequested')));

        // 탭 전환
        this.elements.tabButtons?.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // 단계 전환 버튼
        this.elements.nextStepBtn?.addEventListener('click', () => this.changeStep(this.currentStep + 1));
        this.elements.prevStepBtn?.addEventListener('click', () => this.changeStep(this.currentStep - 1));
        
        // 리포트 액션
        this.elements.downloadReportBtn?.addEventListener('click', () => this.dispatchEvent(new CustomEvent('reportDownloadRequested')));
        this.elements.generateQrBtn?.addEventListener('click', () => this.dispatchEvent(new CustomEvent('qrGenerationRequested')));
    }
    
    // --- 화면 및 상태 관리 ---

    showDashboard() {
        this.elements.welcomeScreen.classList.add('opacity-0');
        setTimeout(() => {
            this.elements.welcomeScreen.classList.add('hidden');
            this.elements.dashboardScreen.classList.remove('hidden');
            this.elements.dashboardScreen.classList.remove('opacity-0');
            // 캔버스 리사이즈 이벤트 트리거
            window.dispatchEvent(new Event('resize'));
        }, 500);
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('hidden', content.id !== `tab-content-${tabId}`);
            content.classList.toggle('active', content.id === `tab-content-${tabId}`);
        });
    }
    
    changeStep(targetStep) {
        if (targetStep < 1 || targetStep > 3) return;
        this.currentStep = targetStep;
        this.updateProgressBar(targetStep);

        // 단계별 탭 자동 전환
        if (targetStep === 1) this.switchTab('measurement');
        if (targetStep === 2) this.switchTab('ai-analysis');
        if (targetStep === 3) this.switchTab('report');
    }

    updateProgressBar(step) {
        this.elements.progressSteps.forEach(pStep => {
            const stepNum = parseInt(pStep.dataset.step);
            pStep.classList.remove('active', 'completed');
            if (stepNum < step) {
                pStep.classList.add('completed');
            } else if (stepNum === step) {
                pStep.classList.add('active');
            }
        });
        
        this.elements.prevStepBtn.classList.toggle('hidden', step === 1);
        this.elements.nextStepBtn.classList.toggle('hidden', step === 3);
    }

    updateActiveButton(buttonGroup, activeButton) {
        buttonGroup.forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }

    // --- 데이터 업데이트 ---

    updateFileName(fileName) {
        if (this.elements.modelFilename) {
            this.elements.modelFilename.textContent = fileName;
        }
    }

    updateMeasurements(measurements, analysis) {
        const format = (value) => value ? `${value.toFixed(1)} mm` : '-';
        
        if (this.elements.lengthValue) this.elements.lengthValue.textContent = format(measurements.length);
        if (this.elements.widthValue) this.elements.widthValue.textContent = format(measurements.width);
        if (this.elements.heightValue) this.elements.heightValue.textContent = format(measurements.height);
        
        const hlRatio = (measurements.height / measurements.length);
        if (this.elements.archRatioValue) this.elements.archRatioValue.textContent = isNaN(hlRatio) ? '-' : hlRatio.toFixed(2);

        if (this.elements.measurementSummary) {
            this.elements.measurementSummary.innerHTML = `
                <p>${analysis.footType || ''} 경향을 보이며, 아치는 ${analysis.archType || ''} 형태입니다.</p>
                <p>${analysis.description || ''}</p>
            `;
        }
    }
    
    updateReport(measurements, analysis, fileName) {
        if(this.elements.reportPatientInfo) this.elements.reportPatientInfo.textContent = `김철수 (남성, ${new Date().toLocaleDateString()})`;
        if(this.elements.reportId) this.elements.reportId.textContent = `FB-${new Date().getFullYear()}-${String(Math.floor(Math.random()*100000)).padStart(6, '0')}`;
        
        if(this.elements.reportObservations) {
            // 예시 데이터. 실제로는 분석 결과 기반으로 생성해야 함
            this.elements.reportObservations.innerHTML = `
                <li>${analysis.footType} 경향</li>
                <li>${analysis.archType}</li>
                <li>6개월 후 재검사를 권장합니다.</li>
            `;
        }
    }

    setQRButtonLoading(isLoading) {
        const btn = this.elements.generateQrBtn;
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin mr-2"></i> 생성 중...' : '<i class="fas fa-share-alt mr-2"></i> 공유하기';
    }

    displayQRCode(url) {
        this.setQRButtonLoading(false);
        const container = this.elements.qrCodeContainer;
        const qrEl = this.elements.qrCode;
        if (!container || !qrEl) return;

        qrEl.innerHTML = '';
        new QRCode(qrEl, {
            text: url,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
        container.classList.remove('hidden');
        this.showSuccessMessage('QR 코드가 생성되었습니다.');
    }

    showSuccessMessage(message, duration = 3000) {
        this.showMessage(message, 'bg-green-500');
    }

    showErrorMessage(message, duration = 5000) {
        this.showMessage(message, 'bg-red-500');
    }

    showMessage(message, bgColor) {
        const msgElement = document.createElement('div');
        msgElement.className = `fixed bottom-5 right-5 text-white text-sm py-2 px-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-10 opacity-0 ${bgColor}`;
        msgElement.textContent = message;
        document.body.appendChild(msgElement);

        setTimeout(() => {
            msgElement.classList.remove('translate-y-10', 'opacity-0');
        }, 10);

        setTimeout(() => {
            msgElement.classList.add('opacity-0');
            msgElement.addEventListener('transitionend', () => msgElement.remove());
        }, 3000);
    }
}