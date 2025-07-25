/**
 * 씬 매니저 모듈 - 3D Scene, 렌더러, 모델 관리 전담
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class SceneManager extends EventTarget {
    constructor(canvasContainer) {
        super();
        this.canvasContainer = canvasContainer;
        this.scene = null;
        this.renderer = null;
        this.currentModel = null;
        this.currentGeometry = null;
        this.gridHelper = null;
        this.boxHelper = null;
        this.animationId = null;
    }

    /**
     * 씬 초기화
     */
    init() {
        console.log('🎬 Scene Manager 초기화 시작...');
        
        // Scene 설정
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111827);

        // 렌더러 설정
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true, 
            preserveDrawingBuffer: true 
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
        this.canvasContainer.appendChild(this.renderer.domElement);

        // 조명 설정
        this.setupLighting();
        
        // 헬퍼 객체 설정
        this.setupHelpers();

        console.log('✅ Scene Manager 초기화 완료');
        return this.renderer.domElement;
    }

    /**
     * 조명 설정
     */
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(100, 100, 100);
        this.scene.add(directionalLight);
    }

    /**
     * 헬퍼 객체 설정
     */
    setupHelpers() {
        // 그리드 헬퍼
        this.gridHelper = new THREE.GridHelper(1000, 50, 0x888888, 0x444444);
        this.gridHelper.visible = false;
        this.scene.add(this.gridHelper);

        // 바운딩 박스 헬퍼
        this.boxHelper = new THREE.Box3Helper(new THREE.Box3(), 0xffff00);
        this.boxHelper.visible = false;
        this.scene.add(this.boxHelper);
    }

    /**
     * 모델 뷰 업데이트
     */
    updateModelView(viewType, color = '#3b82f6') {
        if (!this.currentGeometry) return;
        
        // 기존 모델 정리
        this.cleanupCurrentModel();

        const baseMaterialProps = {
            color: color,
            vertexColors: this.currentGeometry.hasAttribute('color'),
            side: THREE.DoubleSide,
        };

        let material;
        switch(viewType) {
            case 'points':
                material = new THREE.PointsMaterial({ ...baseMaterialProps, size: 0.1 });
                break;
            case 'wireframe':
                material = new THREE.MeshBasicMaterial({ ...baseMaterialProps, wireframe: true });
                break;
            case 'mesh':
            default:
                material = new THREE.MeshStandardMaterial({ ...baseMaterialProps, flatShading: true });
                break;
        }

        const mesh = (viewType === 'points') ? 
            new THREE.Points(this.currentGeometry, material) : 
            new THREE.Mesh(this.currentGeometry, material);
            
        this.currentModel = new THREE.Group();
        this.currentModel.add(mesh);
        this.scene.add(this.currentModel);

        // 모델 정렬 및 스케일링
        this.alignAndScaleModel();
        
        // 헬퍼 업데이트
        this.updateHelpers();

        this.dispatchEvent(new CustomEvent('modelUpdated', {
            detail: { 
                viewType, 
                model: this.currentModel,
                geometry: this.currentGeometry 
            }
        }));
    }

    /**
     * 모델 정렬 및 스케일링
     */
    alignAndScaleModel() {
        if (!this.currentModel) return;

        const mesh = this.currentModel.children[0];
        
        // 초기 바운딩 박스 계산
        const initialBox = new THREE.Box3().setFromObject(mesh);
        const initialSize = initialBox.getSize(new THREE.Vector3());

        // Y축이 가장 긴 경우 회전 (발이 세로로 서있는 경우)
        if (initialSize.y > initialSize.x && initialSize.y > initialSize.z) {
            this.currentModel.rotation.x = -Math.PI / 2;
        } else if (initialSize.x > initialSize.y && initialSize.x > initialSize.z) {
            this.currentModel.rotation.z = -Math.PI / 2;
        }

        // 회전 후 중앙 정렬
        const rotatedBox = new THREE.Box3().setFromObject(this.currentModel);
        const center = rotatedBox.getCenter(new THREE.Vector3());
        this.currentModel.position.sub(center);
        
        // 적절한 크기로 스케일링
        const realSize = rotatedBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(realSize.x, realSize.y, realSize.z);
        const desiredSize = 150;
        const scale = desiredSize / maxDim;
        this.currentModel.scale.set(scale, scale, scale);
    }

    /**
     * 헬퍼 업데이트
     */
    updateHelpers() {
        if (!this.currentModel) return;

        // 그리드 위치 조정
        const finalBox = new THREE.Box3().setFromObject(this.currentModel);
        this.gridHelper.position.y = finalBox.min.y;
        
        // 바운딩 박스 업데이트
        this.boxHelper.box.setFromObject(this.currentModel);
    }

    /**
     * 기존 모델 정리
     */
    cleanupCurrentModel() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel.traverse(child => {
                if (child.isMesh || child.isPoints) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        if (this.currentGeometry) {
            this.currentGeometry.dispose();
        }
    }

    /**
     * 새 geometry 설정
     */
    setGeometry(geometry) {
        this.currentGeometry = geometry;
    }

    /**
     * 모델 색상 변경
     */
    changeModelColor(color) {
        if (!this.currentModel) return;
        
        this.currentModel.traverse(child => {
            if (child.isMesh || child.isPoints) {
                child.material.color.set(color);
            }
        });
    }

    /**
     * 그리드 토글
     */
    toggleGrid(isVisible) { // isVisible 인자를 받도록 수정
        if (this.gridHelper) {
            this.gridHelper.visible = isVisible;
        }
        return isVisible;
    }

    /**
     * 바운딩 박스 토글
     */
    toggleBoundingBox() {
        if (!this.boxHelper) return false;
        
        this.boxHelper.visible = !this.boxHelper.visible;
        return this.boxHelper.visible;
    }

    /**
     * 화면 캡처
     */
    captureScreen(camera) {
        if (!this.renderer || !camera) return null;
        
        this.renderer.render(this.scene, camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    /**
     * 렌더링
     */
    render(camera) {
        if (this.renderer && camera) {
            this.renderer.render(this.scene, camera);
        }
    }

    /**
     * 윈도우 리사이즈 처리
     */
    onWindowResize() {
        if (!this.renderer) return;
        
        this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
        
        this.dispatchEvent(new CustomEvent('windowResized', {
            detail: {
                width: this.canvasContainer.clientWidth,
                height: this.canvasContainer.clientHeight
            }
        }));
    }

    /**
     * 씬에 객체 추가
     */
    addToScene(object) {
        if (this.scene) {
            this.scene.add(object);
        }
    }

    /**
     * 씬에서 객체 제거
     */
    removeFromScene(object) {
        if (this.scene) {
            this.scene.remove(object);
        }
    }

    /**
     * 현재 모델 반환
     */
    getCurrentModel() {
        return this.currentModel;
    }

    /**
     * 현재 geometry 반환
     */
    getCurrentGeometry() {
        return this.currentGeometry;
    }

    /**
     * 씬 반환
     */
    getScene() {
        return this.scene;
    }

    /**
     * 렌더러 반환
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        // 애니메이션 중지
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // 모델 정리
        this.cleanupCurrentModel();

        // 헬퍼 정리
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry.dispose();
            this.gridHelper.material.dispose();
        }

        if (this.boxHelper) {
            this.scene.remove(this.boxHelper);
            this.boxHelper.geometry.dispose();
            this.boxHelper.material.dispose();
        }

        // 렌더러 정리
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // 씬 정리
        if (this.scene) {
            this.scene.clear();
        }

        console.log('🧹 Scene Manager 정리 완료');
    }
}