/**
 * UI 컨트롤러 모듈 - 양발 분석 UI/UX 제어 전담 (사용자 이름 문제 해결)
 */
export class UIController extends EventTarget {
    constructor() {
        super();
        this.elements = {};
        this.currentStep = 1;
        this.activeTab = 'measurement';
        this.selectedFoot = 'left'; // 측정값 탭에서 현재 선택된 발
        this.currentViewFoot = 'both'; // 뷰어에서 현재 보여지는 발
        this.footUploadStatus = {
            left: false,
            right: false
        };
        this.userName = ''; // 🔧 사용자 이름을 인스턴스 변수로 저장
        this.userGender = '';
        this.measurementData = null;
    }

    /**
     * DOM 요소 초기화 (양발 분석에 맞게 확장)
     */
    initializeElements() {
        this.elements = {
            // 화면
            welcomeScreen: document.getElementById('welcome-screen'),
            dashboardScreen: document.getElementById('dashboard-screen'),


            // 양발 파일 업로드
            leftFileInput: document.getElementById('left-file-input'),
            rightFileInput: document.getElementById('right-file-input'),
            leftFootUpload: document.getElementById('left-foot-upload'),
            rightFootUpload: document.getElementById('right-foot-upload'),
            leftFootStatus: document.getElementById('left-foot-status'),
            rightFootStatus: document.getElementById('right-foot-status'),
            startAnalysisBtn: document.getElementById('start-analysis-btn'),
            footUploadSection: document.getElementById('foot-upload-section'),

            // 헤더
            patientName: document.getElementById('patient-name'),
            progressBar: document.getElementById('progress-bar'),
            progressSteps: document.querySelectorAll('.progress-step'),
            prevStepBtn: document.getElementById('prev-step-btn'),
            nextStepBtn: document.getElementById('next-step-btn'),

            // 뷰어 툴바
            modelFilename: document.getElementById('model-filename'),
            viewButtons: document.querySelectorAll('.view-btn'),
            footButtons: document.querySelectorAll('.foot-btn'), // 양발 뷰 선택 버튼
            gridToggle: document.getElementById('grid-toggle'),
            resetViewBtn: document.getElementById('reset-view-btn'),

            // 오른쪽 패널 (탭)
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),

            // 측정값 탭
            measurementFootButtons: document.querySelectorAll('.measurement-foot-btn'),
            lengthValue: document.getElementById('length-value'),
            widthValue: document.getElementById('width-value'),
            heightValue: document.getElementById('height-value'),
            archRatioValue: document.getElementById('arch-ratio-value'),
            measurementSummary: document.getElementById('measurement-summary'),

            // 양발 비교 탭 (새로 추가)
            lengthDiff: document.getElementById('length-diff'),
            widthDiff: document.getElementById('width-diff'),
            heightDiff: document.getElementById('height-diff'),
            symmetryScore: document.getElementById('symmetry-score'),
            leftLengthCompare: document.getElementById('left-length-compare'),
            rightLengthCompare: document.getElementById('right-length-compare'),
            leftWidthCompare: document.getElementById('left-width-compare'),
            rightWidthCompare: document.getElementById('right-width-compare'),
            leftHeightCompare: document.getElementById('left-height-compare'),
            rightHeightCompare: document.getElementById('right-height-compare'),
            leftArchCompare: document.getElementById('left-arch-compare'),
            rightArchCompare: document.getElementById('right-arch-compare'),
            comparisonSummary: document.getElementById('comparison-summary'),

            // AI 분석 탭
            aiSummary: document.getElementById('ai-summary'),

            // 리포트 탭
            reportPatientInfo: document.getElementById('report-patient-info'),
            reportId: document.getElementById('report-id'),
            reportAnalysisType: document.getElementById('report-analysis-type'),
            reportObservations: document.getElementById('report-observations'),
            downloadReportBtn: document.getElementById('download-report-btn'),
            generateQrBtn: document.getElementById('generate-qr-btn'),
            qrModal: document.getElementById('qr-modal'),
            qrCodePlaceholder: document.getElementById('qr-code-placeholder'),
            closeQrModalBtn: document.getElementById('close-qr-modal-btn'),
        };
    }

    /**
     * 이벤트 리스너 설정 (양발 분석에 맞게 확장)
     */
    setupEventListeners() {
        // 양발 파일 업로드
        this.elements.leftFileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFootFileSelected('left', e.target.files[0]);
            }
        });

        this.elements.rightFileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFootFileSelected('right', e.target.files[0]);
            }
        });

        // 양발 드래그 앤 드롭
        this.setupFootDropZone('left', this.elements.leftFootUpload);
        this.setupFootDropZone('right', this.elements.rightFootUpload);

        // 분석 시작 버튼
        this.elements.startAnalysisBtn?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('dualFootAnalysisStarted'));
        });

        // 뷰어 툴바
        this.elements.viewButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { viewType: btn.dataset.view } }));
                this.updateActiveButton(this.elements.viewButtons, btn);
            });
        });

        // 발 선택 버튼 (뷰어에서)
        this.elements.footButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentViewFoot = btn.dataset.foot;
                this.updateActiveButton(this.elements.footButtons, btn);
                this.dispatchEvent(new CustomEvent('footViewChanged', {
                    detail: { foot: btn.dataset.foot }
                }));
            });
        });

        // 측정값 탭의 발 선택 버튼
        this.elements.measurementFootButtons?.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedFoot = btn.dataset.foot;
                this.updateActiveButton(this.elements.measurementFootButtons, btn);
                this.updateMeasurementDisplay();
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

        // QR 코드 모달 닫기 이벤트
        this.elements.closeQrModalBtn?.addEventListener('click', () => this.hideQRCode());
        this.elements.qrModal?.addEventListener('click', (e) => {
            // 모달의 어두운 배경을 클릭했을 때만 닫히도록 설정
            if (e.target === this.elements.qrModal) {
                this.hideQRCode();
            }
        });
    }

    /**
     * 발별 드롭존 설정
     */
    setupFootDropZone(foot, dropZone) {
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-blue-500');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500');
            if (e.dataTransfer.files.length > 0) {
                this.handleFootFileSelected(foot, e.dataTransfer.files[0]);
            }
        });
    }

    /**
     * 발별 파일 선택 처리
     */
    handleFootFileSelected(foot, file) {
        this.dispatchEvent(new CustomEvent('footFileSelected', {
            detail: { foot, file }
        }));
    }

    /**
     * 발 업로드 상태 업데이트
     */
    updateFootUploadStatus(foot, status, fileName = '') {
        this.footUploadStatus[foot] = status;
        const statusElement = this.elements[`${foot}FootStatus`];

        if (statusElement) {
            if (status) {
                statusElement.textContent = `✓ ${fileName}`;
                statusElement.className = 'text-xs text-green-400';
            } else {
                statusElement.textContent = '대기 중...';
                statusElement.className = 'text-xs text-gray-500';
            }
        }

        // 분석 시작 버튼 활성화 상태 업데이트
        const canStartAnalysis = this.footUploadStatus.left && this.footUploadStatus.right;
        if (this.elements.startAnalysisBtn) {
            this.elements.startAnalysisBtn.disabled = !canStartAnalysis;
            this.elements.startAnalysisBtn.className = canStartAnalysis
                ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition'
                : 'bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition disabled:cursor-not-allowed';
        }
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

    hideUploadSection() {
        if (this.elements.footUploadSection) {
            this.elements.footUploadSection.style.display = 'none';
        }
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
        if (targetStep === 2) this.switchTab('comparison'); // 양발 비교 탭으로 변경
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

    // --- 데이터 업데이트 (양발 지원) ---

    updateFileName(leftFileName, rightFileName) {
        if (this.elements.modelFilename) {
            if (leftFileName && rightFileName) {
                this.elements.modelFilename.textContent = `왼발: ${leftFileName}, 오른발: ${rightFileName}`;
            } else if (leftFileName) {
                this.elements.modelFilename.textContent = `왼발: ${leftFileName}`;
            } else if (rightFileName) {
                this.elements.modelFilename.textContent = `오른발: ${rightFileName}`;
            } else {
                this.elements.modelFilename.textContent = '파일을 업로드해주세요';
            }
        }
    }

    /**
      * [수정] 사용자 정보 업데이트 (이름과 성별 모두 처리)
      * @param {string} name 사용자 이름
      * @param {string} gender 사용자 성별
      */
    updatePatientInfo(name, gender) {
        // 인스턴스 변수에 사용자 이름 저장
        this.userName = name;
        this.userGender = gender;
        const userInfoText = `${this.userName} (${this.userGender}, ${new Date().toLocaleDateString()})`;

        if (this.elements.patientName) {
            this.elements.patientName.textContent = this.userName;
        }
        if (this.elements.reportPatientInfo) {
            this.elements.reportPatientInfo.textContent = userInfoText;
        }

        console.log('✅ 사용자 이름 업데이트 완료:', name);
    }

    /**
     * 양발 측정 데이터 저장 및 표시 (확장됨)
     */
    storeMeasurements(leftMeasurements, rightMeasurements, leftAnalysis, rightAnalysis) {
        this.measurementData = {
            left: { measurements: leftMeasurements, analysis: leftAnalysis },
            right: { measurements: rightMeasurements, analysis: rightAnalysis }
        };

        this.updateMeasurementDisplay();
        this.updateComparisonData();
    }

    /**
     * 현재 선택된 발의 측정 데이터 표시
     */
    updateMeasurementDisplay() {
        if (!this.measurementData || !this.measurementData[this.selectedFoot]) return;

        const { measurements, analysis } = this.measurementData[this.selectedFoot];
        // 숫자 포맷팅 함수
        const format = (value, decimals = 1) => (value ? `${value.toFixed(decimals)} mm` : '-');

        // 값의 범위에 따라 태그 정보(텍스트, 클래스)를 반환하는 함수
        const getTagInfo = (value, normalRange, optimalRange) => {
            if (optimalRange && value >= optimalRange[0] && value <= optimalRange[1]) {
                return { text: '최적', class: 'optimal' };
            }
            if (normalRange && value >= normalRange[0] && value <= normalRange[1]) {
                return { text: '정상', class: 'normal' };
            }
            // 범위 밖의 값에 대한 기본 처리
            if (value < normalRange[0]) return { text: '낮음', class: 'low' };
            if (value > normalRange[1]) return { text: '높음', class: 'high' };

            return { text: '확인필요', class: 'low' }; // 기본값
        };

        // DOM 요소에 측정값 업데이트
        if (this.elements.lengthValue) this.elements.lengthValue.textContent = format(measurements.length);
        if (this.elements.widthValue) this.elements.widthValue.textContent = format(measurements.width);
        if (this.elements.heightValue) this.elements.heightValue.textContent = format(measurements.height);

        const hlRatio = measurements.height / measurements.length;
        if (this.elements.archRatioValue) this.elements.archRatioValue.textContent = isNaN(hlRatio) ? '-' : hlRatio.toFixed(2);

        // 각 측정값에 대한 태그 정보 생성
        const tags = {
            length: getTagInfo(measurements.length, [220, 290]), // 예시: 발 길이 정상 범위 220-290mm
            width: getTagInfo(measurements.width, [85, 110]),     // 예시: 발 너비 정상 범위 85-110mm
            height: getTagInfo(measurements.height, [55, 75], [60, 70]), // 예시: 발 높이 정상 55-75mm, 최적 60-70mm
            archRatio: getTagInfo(hlRatio, [0.18, 0.25]) // 예시: 아치비율 정상 0.18-0.25
        };

        // 생성된 태그 정보를 실제 DOM에 적용 (ID를 정확히 타겟팅하도록 수정)
        Object.keys(tags).forEach(key => {
            const el = document.getElementById(`${key}-tag`); // ID로 직접 요소를 찾습니다.
            if (el) {
                el.textContent = tags[key].text;
                el.className = `tag-display ${tags[key].class}`; // 클래스를 완전히 교체
            }
        });

        // 분석 요약 업데이트
        if (this.elements.measurementSummary) {
            this.elements.measurementSummary.innerHTML = `
            <p><strong>${this.selectedFoot === 'left' ? '왼발' : '오른발'} 분석:</strong> <strong>${analysis.footType || 'N/A'}</strong> 경향을 보이며, 아치는 <strong>${analysis.archType || 'N/A'}</strong> 형태입니다.</p>
            <p class="text-gray-500 mt-1">${analysis.description || '분석이 완료되면 상세 설명이 표시됩니다.'}</p>
        `;
        }
    }

    /**
     * 양발 비교 데이터 업데이트
     */
    updateComparisonData() {
        if (!this.measurementData || !this.measurementData.left || !this.measurementData.right) return;

        const left = this.measurementData.left.measurements;
        const right = this.measurementData.right.measurements;

        // 차이 계산
        const lengthDiff = Math.abs(left.length - right.length);
        const widthDiff = Math.abs(left.width - right.width);
        const heightDiff = Math.abs(left.height - right.height);

        // 대칭성 점수 계산 (0-100%)
        const maxLength = Math.max(left.length, right.length);
        const maxWidth = Math.max(left.width, right.width);
        const maxHeight = Math.max(left.height, right.height);

        const lengthSymmetry = (1 - lengthDiff / maxLength) * 100;
        const widthSymmetry = (1 - widthDiff / maxWidth) * 100;
        const heightSymmetry = (1 - heightDiff / maxHeight) * 100;

        const overallSymmetry = Math.round((lengthSymmetry + widthSymmetry + heightSymmetry) / 3);

        // UI 업데이트
        if (this.elements.lengthDiff) this.elements.lengthDiff.textContent = `${lengthDiff.toFixed(1)} mm`;
        if (this.elements.widthDiff) this.elements.widthDiff.textContent = `${widthDiff.toFixed(1)} mm`;
        if (this.elements.heightDiff) this.elements.heightDiff.textContent = `${heightDiff.toFixed(1)} mm`;
        if (this.elements.symmetryScore) this.elements.symmetryScore.textContent = `${overallSymmetry}%`;

        // 상세 비교표
        if (this.elements.leftLengthCompare) this.elements.leftLengthCompare.textContent = `${left.length.toFixed(1)} mm`;
        if (this.elements.rightLengthCompare) this.elements.rightLengthCompare.textContent = `${right.length.toFixed(1)} mm`;
        if (this.elements.leftWidthCompare) this.elements.leftWidthCompare.textContent = `${left.width.toFixed(1)} mm`;
        if (this.elements.rightWidthCompare) this.elements.rightWidthCompare.textContent = `${right.width.toFixed(1)} mm`;
        if (this.elements.leftHeightCompare) this.elements.leftHeightCompare.textContent = `${left.height.toFixed(1)} mm`;
        if (this.elements.rightHeightCompare) this.elements.rightHeightCompare.textContent = `${right.height.toFixed(1)} mm`;

        const leftArch = (left.height / left.length).toFixed(2);
        const rightArch = (right.height / right.length).toFixed(2);
        if (this.elements.leftArchCompare) this.elements.leftArchCompare.textContent = leftArch;
        if (this.elements.rightArchCompare) this.elements.rightArchCompare.textContent = rightArch;

        // 비교 분석 요약
        if (this.elements.comparisonSummary) {
            let summaryText = '';
            if (overallSymmetry >= 90) {
                summaryText = '양발의 대칭성이 매우 우수합니다. 균형잡힌 발 구조를 가지고 있습니다.';
            } else if (overallSymmetry >= 80) {
                summaryText = '양발의 대칭성이 양호합니다. 약간의 차이는 있지만 정상 범위입니다.';
            } else if (overallSymmetry >= 70) {
                summaryText = '양발 간 약간의 차이가 관찰됩니다. 주의 깊은 관찰이 필요합니다.';
            } else {
                summaryText = '양발 간 상당한 차이가 관찰됩니다. 전문의 상담을 권장합니다.';
            }

            this.elements.comparisonSummary.innerHTML = `<p>${summaryText}</p>`;
        }
    }

    /**
     * AI 분석 데이터 업데이트 (양발 지원)
     */
    updateAIAnalysis(leftAnalysis, rightAnalysis) {
        // 종합 점수 계산 (양발 평균)
        const leftScore = this.calculateFootScore(leftAnalysis);
        const rightScore = this.calculateFootScore(rightAnalysis);
        const overallScore = Math.round((leftScore + rightScore) / 2);

        // 전체 점수 표시
        const overallScoreElement = document.querySelector('#tab-content-ai-analysis .text-5xl');
        if (overallScoreElement) {
            overallScoreElement.innerHTML = `${overallScore}<span class="text-2xl text-gray-400">/100</span>`;
        }

        // 발별 상세 분석 업데이트
        this.updateFootAIDetails('left', leftAnalysis, leftScore);
        this.updateFootAIDetails('right', rightAnalysis, rightScore);

        // AI 진단 요약
        if (this.elements.aiSummary) {
            let summaryText = '';
            if (overallScore >= 85) {
                summaryText = '양발 모두 전반적으로 균형이 잘 잡혀있고 건강한 상태입니다.';
            } else if (overallScore >= 70) {
                summaryText = '양발 상태가 양호하나 일부 개선이 필요한 부분이 있습니다.';
            } else {
                summaryText = '양발에 주의가 필요한 부분들이 관찰됩니다. 맞춤형 관리를 권장합니다.';
            }

            this.elements.aiSummary.innerHTML = `<p>${summaryText}</p>`;
        }
    }

    /**
     * 발별 AI 분석 상세 업데이트
     */
    updateFootAIDetails(foot, analysis, score) {
        const footSection = document.querySelector(`#tab-content-ai-analysis .bg-gray-800\\/30:${foot === 'left' ? 'first-child' : 'last-child'}`);
        if (!footSection) return;

        const balanceBar = footSection.querySelector('.bg-blue-500');
        const shapeBar = footSection.querySelectorAll('.bg-yellow-500')[0];

        // 대칭/균형 점수 (예시)
        const balanceScore = Math.min(score + Math.random() * 10 - 5, 100);
        const shapeScore = Math.min(score + Math.random() * 10 - 5, 100);

        if (balanceBar) {
            balanceBar.style.width = `${Math.max(0, balanceScore)}%`;
            const balanceScoreText = footSection.querySelector('.text-blue-400');
            if (balanceScoreText) balanceScoreText.innerHTML = `${Math.round(balanceScore)}<span class="text-xs">/100</span>`;
        }

        if (shapeBar) {
            shapeBar.style.width = `${Math.max(0, shapeScore)}%`;
            const shapeScoreText = footSection.querySelector('.text-yellow-400');
            if (shapeScoreText) shapeScoreText.innerHTML = `${Math.round(shapeScore)}<span class="text-xs">/100</span>`;
        }
    }

    /**
     * 발 점수 계산 헬퍼
     */
    calculateFootScore(analysis) {
        let score = 80; // 기본 점수

        // 발 유형에 따른 점수 조정
        if (analysis.footType.includes('Normal')) score += 10;
        else if (analysis.footType.includes('Wide')) score += 5;
        else if (analysis.footType.includes('Long')) score += 5;

        // 아치 유형에 따른 점수 조정
        if (analysis.archType.includes('Normal')) score += 10;
        else if (analysis.archType.includes('High')) score += 5;
        else if (analysis.archType.includes('Low')) score -= 5;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * 🔧 리포트 데이터 업데이트 (양발 지원) - 수정됨
     */
    updateReport(leftMeasurements, rightMeasurements, leftAnalysis, rightAnalysis, leftFileName, rightFileName) {
        // 🔧 저장된 사용자 이름 사용
        if (this.elements.reportPatientInfo) {
            this.elements.reportPatientInfo.textContent = `${this.userName} (${this.userGender}, ${new Date().toLocaleDateString()})`;
        }

        if (this.elements.reportId) {
            this.elements.reportId.textContent = `FB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;
        }

        if (this.elements.reportAnalysisType) {
            this.elements.reportAnalysisType.textContent = '양발 종합 분석';
        }

        if (this.elements.reportObservations) {
            const observations = [];

            // 왼발 관찰사항
            if (leftAnalysis.footType) observations.push(`왼발: ${leftAnalysis.footType} 경향`);
            if (leftAnalysis.archType) observations.push(`왼발: ${leftAnalysis.archType}`);

            // 오른발 관찰사항
            if (rightAnalysis.footType) observations.push(`오른발: ${rightAnalysis.footType} 경향`);
            if (rightAnalysis.archType) observations.push(`오른발: ${rightAnalysis.archType}`);

            // 대칭성 분석
            const lengthDiff = Math.abs(leftMeasurements.length - rightMeasurements.length);
            if (lengthDiff > 5) {
                observations.push(`양발 길이 차이: ${lengthDiff.toFixed(1)}mm (주의 필요)`);
            }

            observations.push('6개월 후 재검사를 권장합니다.');

            this.elements.reportObservations.innerHTML = observations.map(obs => `<li>${obs}</li>`).join('');
        }

        console.log('✅ 리포트 업데이트 완료 - 사용자 이름:', this.userName);
    }

    /**
     * QR 버튼 로딩 상태 설정
     */
    setQRButtonLoading(isLoading) {
        const btn = this.elements.generateQrBtn;
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin mr-2"></i> 생성 중...' : '<i class="fas fa-share-alt mr-2"></i> 공유하기';
    }

    /**
     * QR 코드 표시
     */

    displayQRCode(url) {
        this.setQRButtonLoading(false);
        const { qrModal, qrCodePlaceholder } = this.elements;
        if (!qrModal || !qrCodePlaceholder) return;

        qrCodePlaceholder.innerHTML = ''; // 이전 QR 코드 삭제
        new QRCode(qrCodePlaceholder, {
            text: url,
            width: 220,  // 모달에 맞게 크기 키움
            height: 220,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M,

            quietZone: 4,           // 여백 증가
            dotScale: 0.8
        });

        // 🔧 QR 코드 스타일 개선 - 명확한 경계선
        qrCodePlaceholder.style.border = '8px solid white';
        qrCodePlaceholder.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        qrCodePlaceholder.style.borderRadius = '16px'; // 테두리 두께를 고려해서 조금 더 둥글게

        qrModal.classList.remove('hidden');
        setTimeout(() => {
            qrModal.classList.remove('opacity-0');
            qrModal.querySelector('div').classList.remove('scale-95');
        }, 10); // 애니메이션을 위한 약간의 딜레이

        this.showSuccessMessage('QR 코드가 생성되었습니다.');
    }

    hideQRCode() {
        const { qrModal } = this.elements;
        if (!qrModal) return;

        qrModal.classList.add('opacity-0');
        qrModal.querySelector('div').classList.add('scale-95');

        // 애니메이션이 끝난 후 완전히 숨김
        setTimeout(() => {
            qrModal.classList.add('hidden');
        }, 300);
    }
    /**
     * 메시지 표시 헬퍼들
     */
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

    /**
     * 현재 상태 반환 메서드들
     */
    getCurrentViewFoot() {
        return this.currentViewFoot;
    }

    getSelectedMeasurementFoot() {
        return this.selectedFoot;
    }

    getBothFootsUploaded() {
        return this.footUploadStatus.left && this.footUploadStatus.right;
    }

    /**
     * 🔧 사용자 이름 반환 메서드 (새로 추가)
     */
    getUserName() {
        return this.userName;
    }

    getUserGender() {
        return this.userGender;
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        // 이벤트 리스너들이 자동으로 정리됨
        this.measurementData = null;
        this.footUploadStatus = { left: false, right: false };
        this.userName = ''; // 🔧 사용자 이름도 정리
        console.log('🧹 UI Controller 정리 완료');
    }
}