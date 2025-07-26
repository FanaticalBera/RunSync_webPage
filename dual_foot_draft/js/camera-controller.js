/**
 * 카메라 컨트롤러 모듈 - 카메라 및 뷰 제어 전담 (개선된 버전)
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

export class CameraController extends EventTarget {
    constructor(sceneManager, canvasContainer) {
        super();
        this.sceneManager = sceneManager;
        this.canvasContainer = canvasContainer;
        this.perspectiveCamera = null;
        this.orthographicCamera = null;
        this.activeCamera = null;
        this.controls = null;
    }

    /**
     * 카메라 초기화
     */
    init() {
        console.log('📷 Camera Controller 초기화 시작...');
        
        const aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
        
        // Perspective 카메라 설정 (더 넓은 시야각)
        this.perspectiveCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
        
        // Orthographic 카메라 설정
        const frustumSize = 200;
        this.orthographicCamera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2, frustumSize * aspect / 2, 
            frustumSize / 2, frustumSize / -2, 
            0.1, 5000
        );
        
        // 기본 카메라를 perspective로 설정
        this.activeCamera = this.perspectiveCamera;

        // 컨트롤 설정
        this.controls = new OrbitControls(this.activeCamera, this.sceneManager.getRenderer().domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        
        // 초기 카메라 위치 설정 (더 가까이, 더 좋은 각도)
        this.setInitialCameraPosition();

        console.log('✅ Camera Controller 초기화 완료');
        console.log('📷 초기 카메라 위치:', this.activeCamera.position);
    }

    /**
     * 초기 카메라 위치 설정
     */
    setInitialCameraPosition() {
        // 더 나은 초기 뷰를 위한 위치 설정
        this.perspectiveCamera.position.set(100, 80, 200);
        this.perspectiveCamera.lookAt(0, 0, 0);
        
        this.orthographicCamera.position.set(0, 100, 200);
        this.orthographicCamera.lookAt(0, 0, 0);
        
        // 컨트롤 타겟 설정
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    /**
     * 뷰 리셋 (모델에 맞춰 자동 조정)
     */
    resetView() {
        const currentModel = this.sceneManager.getCurrentModel();
        
        if (currentModel) {
            // 모델이 있을 때 - 모델에 맞춰 카메라 위치 조정
            this.fitCameraToModel(currentModel);
        } else {
            // 모델이 없을 때 - 기본 위치
            this.setInitialCameraPosition();
        }
        
        this.dispatchEvent(new CustomEvent('viewReset'));
    }

    /**
     * 모델에 맞춰 카메라 조정 (더 확실한 버전)
     */
    fitCameraToModel(model) {
        if (!model) {
            console.warn('⚠️ 모델이 없어서 카메라를 조정할 수 없습니다.');
            return;
        }

        console.log('📷 모델에 맞춰 카메라 조정 시작...');
        
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📦 모델 정보:', { 
            center: center.clone(), 
            size: size.clone(),
            boundingBox: box 
        });
        
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // 더 안전한 거리 계산 (FOV가 없을 수도 있으므로)
        const fov = this.activeCamera.fov || 60;
        const distance = maxDim * 3; // 단순하지만 확실한 거리 계산
        
        // Perspective 카메라 위치 설정
        if (this.activeCamera.isPerspectiveCamera) {
            // 모델을 잘 볼 수 있는 각도로 카메라 배치
            this.activeCamera.position.set(
                center.x + distance * 0.7,
                center.y + distance * 0.5, 
                center.z + distance * 0.9
            );
            this.activeCamera.lookAt(center);
            
            console.log('📷 Perspective 카메라 위치 설정:', this.activeCamera.position);
        } else {
            // Orthographic 카메라
            this.activeCamera.position.set(center.x, center.y, center.z + distance);
            this.activeCamera.lookAt(center);
            
            // 줌 조정
            const margin = 1.5; // 여유 공간
            this.activeCamera.zoom = Math.min(
                this.canvasContainer.clientWidth / (size.x * margin),
                this.canvasContainer.clientHeight / (size.y * margin)
            );
            this.activeCamera.updateProjectionMatrix();
            
            console.log('📷 Orthographic 카메라 설정:', {
                position: this.activeCamera.position,
                zoom: this.activeCamera.zoom
            });
        }
        
        // 컨트롤 타겟을 모델 중심으로 설정
        this.controls.target.copy(center);
        this.controls.update();
        
        console.log('✅ 카메라 조정 완료');
        
        // 조정 완료 이벤트 발생
        this.dispatchEvent(new CustomEvent('cameraFitted', {
            detail: { center, size, distance }
        }));
    }

    /**
     * 카메라 전환
     */
    switchCamera(type) {
        const previousCamera = this.activeCamera;
        
        if (type === 'perspective') {
            this.activeCamera = this.perspectiveCamera;
            this.dispatchEvent(new CustomEvent('cameraChanged', { 
                detail: { type: 'perspective', showStandardViews: false }
            }));
        } else { 
            this.activeCamera = this.orthographicCamera;
            this.dispatchEvent(new CustomEvent('cameraChanged', { 
                detail: { type: 'orthographic', showStandardViews: true }
            }));
        }
        
        // 카메라 전환 시 이전 위치 유지
        if (previousCamera && this.activeCamera) {
            this.activeCamera.position.copy(previousCamera.position);
            this.activeCamera.lookAt(this.controls.target);
        }
        
        this.controls.object = this.activeCamera;
        this.onWindowResize();
        this.controls.update();
        
        console.log('📷 카메라 전환:', type);
    }

    /**
     * 표준 뷰 설정
     */
    setStandardView(direction) {
        const currentModel = this.sceneManager.getCurrentModel();
        if (!currentModel) {
            console.warn('⚠️ 모델이 없어서 표준 뷰를 설정할 수 없습니다.');
            return;
        }
        
        // 직교 카메라로 전환
        if (this.activeCamera !== this.orthographicCamera) {
            this.switchCamera('orthographic');
        }

        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const distance = Math.max(size.x, size.y, size.z) * 2;
        
        // 방향에 따른 카메라 위치 설정
        switch(direction) {
            case 'top': 
                this.activeCamera.position.set(center.x, center.y + distance, center.z);
                this.activeCamera.up.set(0, 0, -1); // 위쪽 방향 조정
                break;
            case 'side': 
                this.activeCamera.position.set(center.x + distance, center.y, center.z);
                this.activeCamera.up.set(0, 1, 0); // 위쪽 방향 리셋
                break;
            case 'front':
            default: 
                this.activeCamera.position.set(center.x, center.y, center.z + distance);
                this.activeCamera.up.set(0, 1, 0); // 위쪽 방향 리셋
                break;
        }
        
        // 줌 조정
        const fitOffset = 1.2;
        const aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
        
        let zoomSize;
        if (direction === 'top') {
            zoomSize = Math.max(size.x, size.z);
        } else if (direction === 'side') {
            zoomSize = Math.max(size.y, size.z);
        } else {
            zoomSize = Math.max(size.x, size.y);
        }

        if (aspect > 1) {
            this.orthographicCamera.zoom = (this.orthographicCamera.top - this.orthographicCamera.bottom) / (zoomSize * fitOffset);
        } else {
            this.orthographicCamera.zoom = (this.orthographicCamera.right - this.orthographicCamera.left) / (zoomSize * fitOffset * aspect);
        }
        
        this.controls.target.copy(center);
        this.activeCamera.lookAt(center);
        this.orthographicCamera.updateProjectionMatrix();
        this.controls.update();

        this.dispatchEvent(new CustomEvent('standardViewSet', { 
            detail: { direction }
        }));
        
        console.log(`📷 표준 뷰 설정: ${direction}`);
    }

    /**
     * 윈도우 리사이즈 처리
     */
    onWindowResize() {
        if (!this.activeCamera) return;
        
        const aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
        
        if (this.activeCamera.isPerspectiveCamera) {
            this.activeCamera.aspect = aspect;
        } else {
            const frustumSize = 200 / (this.activeCamera.zoom || 1);
            this.activeCamera.left = frustumSize * aspect / -2;
            this.activeCamera.right = frustumSize * aspect / 2;
            this.activeCamera.top = frustumSize / 2;
            this.activeCamera.bottom = frustumSize / -2;
        }
        
        this.activeCamera.updateProjectionMatrix();
    }

    /**
     * 컨트롤 업데이트 (애니메이션 루프에서 호출)
     */
    update() {
        if (this.controls) {
            this.controls.update();
        }
    }

    /**
     * 활성 카메라 반환
     */
    getActiveCamera() {
        return this.activeCamera;
    }

    /**
     * Perspective 카메라 반환
     */
    getPerspectiveCamera() {
        return this.perspectiveCamera;
    }

    /**
     * Orthographic 카메라 반환
     */
    getOrthographicCamera() {
        return this.orthographicCamera;
    }

    /**
     * 컨트롤 반환
     */
    getControls() {
        return this.controls;
    }

    /**
     * 카메라 타입 확인
     */
    isOrthographic() {
        return this.activeCamera === this.orthographicCamera;
    }

    /**
     * 카메라 타입 확인
     */
    isPerspective() {
        return this.activeCamera === this.perspectiveCamera;
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        if (this.controls) {
            this.controls.dispose();
        }
        
        console.log('🧹 Camera Controller 정리 완료');
    }
}