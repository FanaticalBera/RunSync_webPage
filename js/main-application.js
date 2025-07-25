/**
 * 메인 애플리케이션 - 모든 모듈을 조합하는 진입점 (새로운 UI/UX 적용)
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { PLYLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

import { SceneManager } from './scene-manager.js';
import { CameraController } from './camera-controller.js';
import { FileLoader } from './file-loader.js';
import { MeasurementEngine } from './measurement.js';
import { UIController } from './ui-controller.js'; // 수정된 UI 컨트롤러 임포트
import { ReportGenerator } from './report-generator.js';
import { Utils } from './utils.js';

class FootAnalyzer {
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
        
        // 상태 관리
        this.currentFileName = '';
        this.measurements = {};
        this.analysis = {};
        this.animationId = null;
    }

    /**
     * 애플리케이션 초기화
     */
    async init() {
        try {
            console.log('🚀 3D 발 분석기 초기화 시작 (v2)...');
            
            // 모듈 초기화
            await this.initializeModules();

            // 이벤트 바인딩
            this.setupEventListeners();

            // 윈도우 리사이즈 이벤트
            this.setupWindowEvents();

            // 애니메이션 시작
            this.startAnimation();

            this.isInitialized = true;
            console.log('✅ 3D 발 분석기 초기화 완료 (v2)');

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
        this.uiController.initializeElements(); // DOM 요소 먼저 찾기
        
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
     * 이벤트 리스너 설정 (새로운 UI 컨트롤러에 맞게 수정)
     */
    setupEventListeners() {
        // UI Controller에서 발생하는 이벤트를 수신
        this.uiController.setupEventListeners(); // UI 내부 이벤트 리스너 설정
        this.uiController.addEventListener('fileSelected', this.handleFileSelected.bind(this));
        this.uiController.addEventListener('fileDropped', this.handleFileDropped.bind(this));
        this.uiController.addEventListener('viewModeChanged', this.handleViewModeChanged.bind(this));
        this.uiController.addEventListener('gridToggleRequested', this.handleGridToggle.bind(this));
        this.uiController.addEventListener('viewResetRequested', this.handleViewResetRequested.bind(this));
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

    // ==================== 이벤트 핸들러 (새로운 UI 흐름에 맞게 수정) ====================

    handleFileSelected(event) {
        const { file } = event.detail;
        if (file) {
            this.fileLoader.loadFile(file);
        }
    }

    handleFileDropped(event) {
        const files = Array.from(event.detail.files);
        const plyFile = files.find(file => file.name.toLowerCase().endsWith('.ply'));
        if (plyFile) {
            this.fileLoader.loadFile(plyFile);
        } else {
            this.uiController.showErrorMessage('PLY 파일만 지원됩니다.');
        }
    }

    handleFileLoadStarted(event) {
        this.currentFileName = event.detail.fileName;
        this.uiController.showDashboard();
        this.uiController.updateFileName(this.currentFileName);
        console.log('📁 파일 로딩 시작:', this.currentFileName);
    }

    async handleFileLoadCompleted(event) {
        const { geometry } = event.detail;
        
        console.log('✅ PLY 파일 로딩 완료 - 모델 표시 시작');
        
        // 1. 모델 뷰 업데이트
        this.sceneManager.updateModelView('mesh');
        
        // 2. 모델이 생성된 후 카메라를 자동으로 조정
        setTimeout(() => {
            const currentModel = this.sceneManager.getCurrentModel();
            if (currentModel) {
                console.log('📷 모델에 맞춰 카메라 자동 조정...');
                this.cameraController.fitCameraToModel(currentModel);
                
                // UI 상으로 1단계로 전환
                this.uiController.changeStep(1);
                
                // 3. 카메라 조정 완료 후 측정 시작
                setTimeout(() => {
                    console.log('🔬 정밀 측정 시작...');
                    this.measurementEngine.performPreciseMeasurements(
                        geometry, 
                        currentModel
                    );
                }, 300);
            } else {
                console.warn('⚠️ 모델 생성 실패 - 기본 뷰 리셋');
                this.cameraController.resetView();
            }
        }, 200); // 모델 생성 완료 대기
    }

    handleFileLoadError(event) {
        this.uiController.showErrorMessage(`파일 로드 실패: ${event.detail.message}`);
        console.error('❌ 파일 로드 실패:', event.detail);
    }

    handleMeasurementStarted(event) {
        console.log('🔬 측정 시작:', event.detail.status);
        // 필요시 UI에 "분석 중..." 상태 표시
    }

    handleMeasurementComplete(event) {
        const { measurements, ratios, analysis } = event.detail;
        
        console.log('✅ 측정 완료:', { measurements, analysis });
        
        // 데이터 저장
        this.measurements = measurements;
        this.analysis = analysis;
        
        // UI 업데이트
        this.uiController.updateMeasurements(measurements, analysis);
        this.uiController.updateReport(measurements, analysis, this.currentFileName);
        
        // 측정선 생성
        if (measurements.originalVertices && measurements.originalVertices.length > 0) {
            const scaledVertices = this.measurementEngine.getScaledVertices(
                measurements.originalVertices,
                this.sceneManager.getCurrentModel()
            );
            this.measurementEngine.createMeasurementLines(
                scaledVertices,
                this.sceneManager.getScene()
            );
        }
        
        // UI를 다음 단계로 전환
        this.uiController.changeStep(2);
        this.uiController.showSuccessMessage('분석이 완료되었습니다.');
    }

    handleViewModeChanged(event) {
        this.sceneManager.updateModelView(event.detail.viewType);
    }

    handleGridToggle(event) {
        // SceneManager의 toggleGrid 호출
        const isVisible = this.sceneManager.toggleGrid();
        console.log('🎛️ 그리드 토글:', isVisible ? '표시' : '숨김');
    }

    handleViewResetRequested() {
        console.log('🔄 뷰 리셋 요청');
        this.cameraController.resetView();
    }

    handleReportDownloadRequested() {
        if (!this.measurements || Object.keys(this.measurements).length === 0) {
            this.uiController.showErrorMessage('분석 데이터가 없습니다.');
            return;
        }
        console.log('📄 PDF 리포트 생성 요청');
        this.reportGenerator.generatePDFReport(
            this.measurements,
            this.currentFileName,
            this.sceneManager,
            this.cameraController.getActiveCamera()
        );
    }

    handleQrGenerationRequested() {
        if (!this.measurements || Object.keys(this.measurements).length === 0) {
            this.uiController.showErrorMessage('분석 데이터가 없습니다.');
            return;
        }
        console.log('📱 QR 코드 생성 요청');
        this.uiController.setQRButtonLoading?.(true);
        this.reportGenerator.generateQRCode(this.measurements, this.currentFileName);
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
            // QR 코드 생성 (최적화된 설정)
            const qrCodeContainer = document.getElementById('qr-code');
            if (qrCodeContainer) {
                qrCodeContainer.innerHTML = ''; // 기존 QR 코드 제거
                
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

    // ==================== 정리 ====================

    dispose() {
        if (!this.isInitialized) return;

        console.log('🧹 애플리케이션 정리 시작...');

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

        // 인스턴스 초기화
        this.sceneManager = null;
        this.cameraController = null;
        this.fileLoader = null;
        this.measurementEngine = null;
        this.uiController = null;
        this.reportGenerator = null;

        this.isInitialized = false;
        console.log('✅ 애플리케이션 정리 완료');
    }
}

// ==================== 애플리케이션 시작 ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new FootAnalyzer();
        await app.init();
        window.footAnalyzer = app; // 개발용 접근
    } catch (error) {
        console.error('❌ 애플리케이션 시작 실패:', error);
        // DOM에 직접 에러 메시지 표시
        document.body.innerHTML = `<div class="bg-red-800 text-white p-8 text-center h-screen flex items-center justify-center">
            <h2 class="text-2xl">애플리케이션 실행에 실패했습니다.</h2>
            <p>${error.message}</p>
        </div>`;
    }
});