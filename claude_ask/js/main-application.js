/**
 * 메인 애플리케이션 - 양발 분석 시스템 (개선된 버전)
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { PLYLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

import { SceneManager } from './scene-manager.js';
import { CameraController } from './camera-controller.js';
import { FileLoader } from './file-loader.js';
import { MeasurementEngine } from './measurement.js';
import { UIController } from './ui-controller.js';
import { ReportGenerator } from './report-generator.js';
import { Utils } from './utils.js';

class DualFootAnalyzer {
    constructor() {
        this.canvasContainer = document.getElementById('canvas-container');
        this.isInitialized = false;

        // 모듈 인스턴스
        this.sceneManager = null;
        this.cameraController = null;
        this.fileLoader = null;
        this.measurementEngine = null;
        this.uiController = null;
        this.reportGenerator = null;

        // 양발 상태 관리
        this.footData = {
            left: {
                fileName: '',
                geometry: null,
                measurements: null,
                analysis: null,
                isLoaded: false
            },
            right: {
                fileName: '',
                geometry: null,
                measurements: null,
                analysis: null,
                isLoaded: false
            }
        };

        this.analysisComplete = false;
        this.animationId = null;
    }

    /**
     * 애플리케이션 초기화
     */
    async init() {
        try {
            console.log('🚀 3D 양발 분석기 초기화 시작...');

            // 모듈 초기화
            await this.initializeModules();

            // 이벤트 바인딩
            this.setupEventListeners();

            // 윈도우 리사이즈 이벤트
            this.setupWindowEvents();

            // 애니메이션 시작
            this.startAnimation();

            this.isInitialized = true;
            console.log('✅ 3D 양발 분석기 초기화 완료');

        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            this.uiController?.showErrorMessage(`초기화 실패: ${error.message}`);
        }
    }

    /**
     * 모듈 초기화
     */
    async initializeModules() {
        // UI Controller가 가장 먼저 초기화되어야 함
        this.uiController = new UIController();
        this.uiController.initializeElements();

        this.sceneManager = new SceneManager(this.canvasContainer);
        this.sceneManager.init();

        this.cameraController = new CameraController(this.sceneManager, this.canvasContainer);
        this.cameraController.init();

        this.fileLoader = new FileLoader(this.sceneManager);
        this.measurementEngine = new MeasurementEngine();
        this.reportGenerator = new ReportGenerator();

        console.log('✅ 모든 모듈 초기화 완료');
    }


    /**
     * 이벤트 리스너 설정 (양발 분석에 맞게 수정)
     */
    setupEventListeners() {
        // UI Controller 이벤트 설정
        this.uiController.setupEventListeners();

        // 양발 파일 선택 이벤트
        this.uiController.addEventListener('footFileSelected', this.handleFootFileSelected.bind(this));
        this.uiController.addEventListener('dualFootAnalysisStarted', this.handleDualFootAnalysisStarted.bind(this));

        // 뷰어 제어 이벤트
        this.uiController.addEventListener('viewModeChanged', this.handleViewModeChanged.bind(this));
        this.uiController.addEventListener('footViewChanged', this.handleFootViewChanged.bind(this));
        this.uiController.addEventListener('gridToggleRequested', this.handleGridToggle.bind(this));
        this.uiController.addEventListener('viewResetRequested', this.handleViewResetRequested.bind(this));

        // 리포트 관련 이벤트
        this.uiController.addEventListener('reportDownloadRequested', this.handleReportDownloadRequested.bind(this));
        this.uiController.addEventListener('qrGenerationRequested', this.handleQrGenerationRequested.bind(this));

        // File Loader 이벤트
        this.fileLoader.addEventListener('loadStarted', this.handleFileLoadStarted.bind(this));
        this.fileLoader.addEventListener('loadCompleted', this.handleFileLoadCompleted.bind(this));
        this.fileLoader.addEventListener('loadError', this.handleFileLoadError.bind(this));

        // Measurement Engine 이벤트
        this.measurementEngine.addEventListener('measurementStarted', this.handleMeasurementStarted.bind(this));
        this.measurementEngine.addEventListener('measurementComplete', this.handleMeasurementComplete.bind(this));

        // Report Generator 이벤트
        this.reportGenerator.addEventListener('qrGenerated', this.handleQrGenerated.bind(this));
        this.reportGenerator.addEventListener('qrError', (e) => this.uiController.showErrorMessage(e.detail.message));
    }

    /**
     * 윈도우 이벤트 설정
     */
    setupWindowEvents() {
        const debouncedResize = Utils.debounce(() => {
            this.sceneManager.onWindowResize();
            this.cameraController.onWindowResize();
        }, 150);
        window.addEventListener('resize', debouncedResize);
    }

    /**
     * 애니메이션 시작
     */
    startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this.cameraController.update();
            this.sceneManager.render(this.cameraController.getActiveCamera());
        };
        animate();
    }

    // ==================== 양발 파일 처리 이벤트 핸들러 ====================

    /**
     * 발별 파일 선택 처리
     */
    handleFootFileSelected(event) {
        const { foot, file } = event.detail;

        console.log(`📁 ${foot === 'left' ? '왼발' : '오른발'} 파일 선택:`, file.name);

        // 파일 유효성 검사
        if (!this.isValidPLYFile(file)) {
            this.uiController.showErrorMessage('PLY 파일만 지원됩니다.');
            return;
        }

        // 상태 업데이트
        this.footData[foot].fileName = file.name;
        this.uiController.updateFootUploadStatus(foot, false, '로딩 중...');

        // 파일 로드
        this.loadFootFile(foot, file);
    }

    /**
     * PLY 파일 유효성 검사
     */
    isValidPLYFile(file) {
        return file.name.toLowerCase().endsWith('.ply');
    }

    /**
     * 발별 파일 로드
     */
    async loadFootFile(foot, file) {
        try {
            const geometry = await this.loadPLYFile(file);

            // 발 데이터 저장
            this.footData[foot].geometry = geometry;
            this.footData[foot].isLoaded = true;

            // UI 상태 업데이트
            this.uiController.updateFootUploadStatus(foot, true, file.name);
            this.updateFileNameDisplay();

            // 대시보드 표시 (첫 번째 파일이 로드될 때)
            if (!this.isDashboardVisible()) {
                this.uiController.showDashboard();
            }

            console.log(`✅ ${foot === 'left' ? '왼발' : '오른발'} 파일 로드 완료`);

        } catch (error) {
            console.error(`❌ ${foot === 'left' ? '왼발' : '오른발'} 파일 로드 실패:`, error);
            this.footData[foot].isLoaded = false;
            this.uiController.updateFootUploadStatus(foot, false, '로드 실패');
            this.uiController.showErrorMessage(`${foot === 'left' ? '왼발' : '오른발'} 파일 로드에 실패했습니다.`);
        }
    }

    /**
     * PLY 파일 로딩 (Promise 기반)
     */
    loadPLYFile(file) {
        return new Promise((resolve, reject) => {
            const loader = new PLYLoader();
            const objectURL = URL.createObjectURL(file);

            loader.load(
                objectURL,
                (geometry) => {
                    URL.revokeObjectURL(objectURL);
                    resolve(geometry);
                },
                undefined,
                (error) => {
                    URL.revokeObjectURL(objectURL);
                    reject(error);
                }
            );
        });
    }

    /**
     * 대시보드 표시 여부 확인
     */
    isDashboardVisible() {
        return !this.uiController.elements.dashboardScreen.classList.contains('hidden');
    }

    /**
     * 파일명 표시 업데이트
     */
    updateFileNameDisplay() {
        this.uiController.updateFileName(
            this.footData.left.fileName,
            this.footData.right.fileName
        );
    }

    /**
     * 양발 분석 시작
     */
    async handleDualFootAnalysisStarted() {
        if (!this.footData.left.isLoaded || !this.footData.right.isLoaded) {
            this.uiController.showErrorMessage('양발 파일을 모두 업로드해주세요.');
            return;
        }

        console.log('🔬 양발 분석 시작...');

        try {
            // 업로드 섹션 숨기기
            this.uiController.hideUploadSection();

            // 양발 모델 표시
            await this.displayBothFeet();

            // 양발 측정 수행
            await this.performDualFootMeasurement();

            this.analysisComplete = true;
            this.uiController.changeStep(2);
            this.uiController.showSuccessMessage('양발 분석이 완료되었습니다!');

        } catch (error) {
            console.error('❌ 양발 분석 실패:', error);
            this.uiController.showErrorMessage('양발 분석 중 오류가 발생했습니다.');
        }
    }

    /**
     * 양발 모델 표시
     */
    async displayBothFeet() {
        console.log('👣 양발 모델 표시 중...');

        // Scene Manager에 양발 geometry 설정
        this.sceneManager.setDualGeometry(
            this.footData.left.geometry,
            this.footData.right.geometry
        );

        // (핵심 수정) 모델 뷰 업데이트 함수 이름 변경
        this.sceneManager.updateDualModelView('mesh');

        // 카메라 자동 조정
        setTimeout(() => {
            const currentModel = this.sceneManager.getCurrentModel();
            if (currentModel) {
                this.cameraController.fitCameraToModel(currentModel);
            }
        }, 200);
    }

    /**
     * 양발 측정 수행
     */
    async performDualFootMeasurement() {
        console.log('📏 양발 측정 수행 중...');

        // 왼발 측정
        const leftMeasurements = await this.measurementEngine.performPreciseMeasurements(
            this.footData.left.geometry,
            this.sceneManager.getLeftFootModel()
        );

        // 오른발 측정
        const rightMeasurements = await this.measurementEngine.performPreciseMeasurements(
            this.footData.right.geometry,
            this.sceneManager.getRightFootModel()
        );

        // 발별 분석
        const leftAnalysis = this.analyzeFootType(leftMeasurements);
        const rightAnalysis = this.analyzeFootType(rightMeasurements);

        // 데이터 저장
        this.footData.left.measurements = leftMeasurements;
        this.footData.left.analysis = leftAnalysis;
        this.footData.right.measurements = rightMeasurements;
        this.footData.right.analysis = rightAnalysis;

        // UI 업데이트
        this.uiController.storeMeasurements(
            leftMeasurements, rightMeasurements,
            leftAnalysis, rightAnalysis
        );

        this.uiController.updateAIAnalysis(leftAnalysis, rightAnalysis);

        // 🔧 리포트 업데이트 시 사용자 이름 확인
        const currentUserName = this.uiController.getUserName();
        console.log('📋 리포트 업데이트 - 현재 사용자 이름:', currentUserName);
        this.uiController.updateReport(
            leftMeasurements, rightMeasurements,
            leftAnalysis, rightAnalysis,
            this.footData.left.fileName, this.footData.right.fileName
        );
    }

    /**
     * 발 유형 분석
     */
    analyzeFootType(measurements) {
        if (!measurements || !measurements.length || !measurements.width || !measurements.height) {
            return {
                footType: 'Analysis Pending',
                archType: 'Analysis Pending',
                description: 'Insufficient data for comprehensive analysis'
            };
        }

        const lwRatio = measurements.length / measurements.width;
        const hlRatio = measurements.height / measurements.length;

        let footType = '';
        let description = '';

        if (lwRatio > 2.6) {
            footType = 'Long Foot Type';
            description = 'Elongated foot shape with longer toes and narrow profile';
        } else if (lwRatio < 2.2) {
            footType = 'Wide Foot Type';
            description = 'Broader foot shape with wider forefoot area';
        } else {
            footType = 'Normal Foot Type';
            description = 'Well-balanced foot proportions with standard dimensions';
        }

        let archType = '';
        if (hlRatio > 0.25) {
            archType = 'High Arch';
        } else if (hlRatio < 0.18) {
            archType = 'Low Arch / Flat Foot';
        } else {
            archType = 'Normal Arch';
        }

        return { footType, archType, description };
    }

    // ==================== 뷰어 제어 이벤트 핸들러 ====================

    handleViewModeChanged(event) {
        // (핵심 수정) 모델 뷰 업데이트 함수 이름 변경
        this.sceneManager.updateDualModelView(event.detail.viewType);
    }

    handleFootViewChanged(event) {
        const { foot } = event.detail;
        console.log(`👁️ 발 뷰 변경: ${foot}`);
        this.sceneManager.setFootVisibility(foot);
    }

    handleGridToggle(event) {
        const isVisible = this.sceneManager.toggleGrid(event.detail.visible);
        console.log('🎛️ 그리드 토글:', isVisible ? '표시' : '숨김');
    }

    handleViewResetRequested() {
        console.log('🔄 뷰 리셋 요청');
        this.cameraController.resetView();
    }

    // ==================== 기존 이벤트 핸들러 (호환성 유지) ====================

    handleFileLoadStarted(event) {
        console.log('📁 파일 로딩 시작:', event.detail.fileName);
    }

    handleFileLoadCompleted(event) {
        console.log('✅ 파일 로딩 완료:', event.detail.fileName);
    }

    handleFileLoadError(event) {
        console.error('❌ 파일 로드 실패:', event.detail);
        this.uiController.showErrorMessage(`파일 로드 실패: ${event.detail.message}`);
    }

    handleMeasurementStarted(event) {
        console.log('🔬 측정 시작:', event.detail.status);
    }

    handleMeasurementComplete(event) {
        console.log('✅ 측정 완료:', event.detail);
    }

    // ==================== 리포트 관련 이벤트 핸들러 ====================

    handleReportDownloadRequested() {
        if (!this.analysisComplete) {
            this.uiController.showErrorMessage('분석을 완료한 후 리포트를 생성할 수 있습니다.');
            return;
        }

        console.log('📄 양발 PDF 리포트 생성 요청');
        this.reportGenerator.generateDualFootPDFReport(
            this.footData.left.measurements,
            this.footData.right.measurements,
            this.footData.left.fileName,
            this.footData.right.fileName,
            this.sceneManager,
            this.cameraController.getActiveCamera()
        );
    }

    handleQrGenerationRequested() {
        if (!this.analysisComplete) {
            this.uiController.showErrorMessage('분석을 완료한 후 QR 코드를 생성할 수 있습니다.');
            return;
        }

        console.log('📱 양발 QR 코드 생성 요청');
        this.uiController.setQRButtonLoading?.(true);

        // 양발 데이터를 하나로 합친 데이터 생성
        const combinedData = this.createCombinedFootData();
        this.reportGenerator.generateQRCode(combinedData, 'dual_foot_analysis');
    }

    /**
     * 양발 데이터 결합 (QR 코드용)
     */
    createCombinedFootData() {
        const leftMeasurements = this.footData.left.measurements;
        const rightMeasurements = this.footData.right.measurements;

        // 평균값 계산
        const avgLength = (leftMeasurements.length + rightMeasurements.length) / 2;
        const avgWidth = (leftMeasurements.width + rightMeasurements.width) / 2;
        const avgHeight = (leftMeasurements.height + rightMeasurements.height) / 2;

        return {
            length: avgLength,
            width: avgWidth,
            height: avgHeight,
            unit: leftMeasurements.unit,
            confidence: 'Dual Foot Analysis',
            // 추가 정보
            leftFoot: {
                length: leftMeasurements.length,
                width: leftMeasurements.width,
                height: leftMeasurements.height
            },
            rightFoot: {
                length: rightMeasurements.length,
                width: rightMeasurements.width,
                height: rightMeasurements.height
            }
        };
    }

    /**
     * QR 코드 생성 완료 핸들러
     */
    handleQrGenerated(event) {
        const { url } = event.detail;

        console.log('📱 QR 코드 생성 완료:', url);

        // UI Controller의 QR 표시 메서드 호출
        if (this.uiController.displayQRCode) {
            this.uiController.displayQRCode(url);
        } else if (this.uiController.setQRButtonLoading) {
            // 폴백: 기존 방식
            this.uiController.setQRButtonLoading(false);
            // QR 코드 생성
            const qrCodeContainer = document.getElementById('qr-code');
            if (qrCodeContainer) {
                qrCodeContainer.innerHTML = '';

                try {
                    const qr = new window.QRCode(qrCodeContainer, {
                        text: url,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: window.QRCode.CorrectLevel.L
                    });

                    this.uiController.showSuccessMessage('QR 코드 생성 완료!');
                } catch (error) {
                    console.error('❌ QR 코드 생성 실패:', error);
                    this.uiController.showErrorMessage('QR 코드 생성에 실패했습니다.');
                }
            }
        }
    }

    // ==================== 상태 조회 메서드 ====================

    /**
     * 양발 로드 상태 확인
     */
    isBothFeetLoaded() {
        return this.footData.left.isLoaded && this.footData.right.isLoaded;
    }

    /**
     * 분석 완료 상태 확인
     */
    isAnalysisComplete() {
        return this.analysisComplete;
    }

    /**
     * 특정 발 데이터 반환
     */
    getFootData(foot) {
        return this.footData[foot];
    }

    /**
     * 양발 데이터 반환
     */
    getBothFeetData() {
        return {
            left: this.footData.left,
            right: this.footData.right
        };
    }

    // ==================== 개발용 헬퍼 메서드 ====================

    /**
     * 테스트용 샘플 데이터 로드
     */
    loadSampleData() {
        console.log('🧪 테스트용 샘플 데이터 로드');

        // 샘플 측정 데이터
        const sampleLeft = {
            length: 254.3,
            width: 98.7,
            height: 67.2,
            unit: 'mm',
            confidence: '높음 (샘플)'
        };

        const sampleRight = {
            length: 256.1,
            width: 99.2,
            height: 68.1,
            unit: 'mm',
            confidence: '높음 (샘플)'
        };

        const sampleAnalysisLeft = this.analyzeFootType(sampleLeft);
        const sampleAnalysisRight = this.analyzeFootType(sampleRight);

        // 데이터 저장
        this.footData.left.measurements = sampleLeft;
        this.footData.left.analysis = sampleAnalysisLeft;
        this.footData.left.fileName = 'sample_left_foot.ply';
        this.footData.left.isLoaded = true;

        this.footData.right.measurements = sampleRight;
        this.footData.right.analysis = sampleAnalysisRight;
        this.footData.right.fileName = 'sample_right_foot.ply';
        this.footData.right.isLoaded = true;

        this.analysisComplete = true;

        // UI 업데이트
        this.uiController.updateFootUploadStatus('left', true, 'sample_left_foot.ply');
        this.uiController.updateFootUploadStatus('right', true, 'sample_right_foot.ply');
        this.updateFileNameDisplay();

        this.uiController.storeMeasurements(
            sampleLeft, sampleRight,
            sampleAnalysisLeft, sampleAnalysisRight
        );

        this.uiController.updateAIAnalysis(sampleAnalysisLeft, sampleAnalysisRight);

        this.uiController.updateReport(
            sampleLeft, sampleRight,
            sampleAnalysisLeft, sampleAnalysisRight,
            'sample_left_foot.ply', 'sample_right_foot.ply'
        );

        this.uiController.showDashboard();
        this.uiController.hideUploadSection();
        this.uiController.changeStep(2);
        this.uiController.showSuccessMessage('샘플 데이터 로드 완료!');
    }

    /**
     * 디버그 정보 출력
     */
    debugInfo() {
        console.log('🔍 Debug Info:');
        console.log('- Initialization:', this.isInitialized);
        console.log('- Both feet loaded:', this.isBothFeetLoaded());
        console.log('- Analysis complete:', this.isAnalysisComplete());
        console.log('- Left foot data:', this.footData.left);
        console.log('- Right foot data:', this.footData.right);
        console.log('- Current UI step:', this.uiController.currentStep);
        console.log('- Active tab:', this.uiController.activeTab);
    }

    // ==================== 정리 ====================

    /**
     * 애플리케이션 정리
     */
    dispose() {
        if (!this.isInitialized) return;

        console.log('🧹 양발 분석기 정리 시작...');

        // 애니메이션 중지
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // 각 모듈 정리
        this.sceneManager?.dispose();
        this.cameraController?.dispose();
        this.fileLoader?.dispose();
        this.measurementEngine?.dispose?.();
        this.uiController?.dispose();
        this.reportGenerator?.dispose();

        // 양발 데이터 정리
        this.footData = {
            left: { fileName: '', geometry: null, measurements: null, analysis: null, isLoaded: false },
            right: { fileName: '', geometry: null, measurements: null, analysis: null, isLoaded: false }
        };

        // 인스턴스 초기화
        this.sceneManager = null;
        this.cameraController = null;
        this.fileLoader = null;
        this.measurementEngine = null;
        this.uiController = null;
        this.reportGenerator = null;

        this.analysisComplete = false;
        this.isInitialized = false;
        console.log('✅ 양발 분석기 정리 완료');
    }
}

// ==================== 애플리케이션 시작 ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new DualFootAnalyzer();
        await app.init();

        // 개발용 접근 (전역 변수로 설정)
        window.footAnalyzer = app;

        // 개발용 단축키 설정
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168')) {
            window.addEventListener('keydown', (e) => {
                // Ctrl + Shift + S: 샘플 데이터 로드
                if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                    e.preventDefault();
                    app.loadSampleData();
                }
                // Ctrl + Shift + D: 디버그 정보 출력
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    app.debugInfo();
                }
            });

            console.log('🔧 개발 모드 활성화:');
            console.log('- Ctrl + Shift + S: 샘플 데이터 로드');
            console.log('- Ctrl + Shift + D: 디버그 정보 출력');
        }

    } catch (error) {
        console.error('❌ 양발 분석기 시작 실패:', error);
        // DOM에 직접 에러 메시지 표시
        document.body.innerHTML = `<div class="bg-red-800 text-white p-8 text-center h-screen flex items-center justify-center">
            <div>
                <h2 class="text-2xl mb-4">양발 분석기 실행에 실패했습니다.</h2>
                <p class="mb-4">${error.message}</p>
                <button onclick="location.reload()" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
                    다시 시도
                </button>
            </div>
        </div>`;
    }
});
