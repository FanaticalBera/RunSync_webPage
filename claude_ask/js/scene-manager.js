/**
 * 씬 매니저 모듈 - 양발 3D Scene, 렌더러, 모델 관리 전담 (최종 수정)
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class SceneManager extends EventTarget {
    constructor(canvasContainer) {
        super();
        this.canvasContainer = canvasContainer;
        this.scene = null;
        this.renderer = null;
        
        // 양발 모델 관리
        this.dualFootModel = null; // 양발을 포함하는 그룹
        this.leftFootModel = null;
        this.rightFootModel = null;
        
        // Geometry 저장
        this.leftGeometry = null;
        this.rightGeometry = null;
        
        // 헬퍼 객체들
        this.gridHelper = null;
        this.boxHelper = null;
        this.animationId = null;
        
        // 현재 뷰 상태
        this.currentViewMode = 'mesh';
        this.footVisibility = 'both'; // 'both', 'left', 'right'
    }

    /**
     * 씬 초기화
     */
    init() {
        console.log('🎬 Scene Manager (양발 지원) 초기화 시작...');
        
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

        console.log('✅ Scene Manager (양발 지원) 초기화 완료');
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

        // 추가 조명 (양발을 더 잘 보이게)
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight2.position.set(-100, 100, -100);
        this.scene.add(directionalLight2);
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
     * 양발 geometry 설정
     */
    setDualGeometry(leftGeometry, rightGeometry) {
        console.log('👣 양발 geometry 설정...');
        
        this.leftGeometry = leftGeometry;
        this.rightGeometry = rightGeometry;
        
        // 기존 모델 정리
        this.cleanupCurrentModels();
        
        console.log('✅ 양발 geometry 설정 완료');
    }

    /**
     * 양발 모델 뷰 업데이트
     */
    updateDualModelView(viewType, leftColor = '#3b82f6', rightColor = '#10b981') {
        if (!this.leftGeometry || !this.rightGeometry) {
            console.warn('⚠️ 양발 geometry가 설정되지 않음');
            return;
        }
        
        console.log(`🎨 양발 모델 뷰 업데이트: ${viewType}`);
        
        this.currentViewMode = viewType;
        this.cleanupCurrentModels();

        this.dualFootModel = new THREE.Group();
        this.dualFootModel.name = 'DualFootModel';

        // 1. 왼발, 오른발 모델 생성
        this.leftFootModel = this.createFootModel(this.leftGeometry, leftColor, viewType, 'left');
        this.leftFootModel.name = 'LeftFoot';
        
        this.rightFootModel = this.createFootModel(this.rightGeometry, rightColor, viewType, 'right');
        this.rightFootModel.name = 'RightFoot';

        // 2. 각 발 모델을 먼저 중앙 정렬
        this.alignSingleFoot(this.leftFootModel);
        this.alignSingleFoot(this.rightFootModel);

        // 3. 중앙 정렬된 모델들을 기준으로 좌우 배치
        this.positionDualFeet();
        
        this.dualFootModel.add(this.leftFootModel);
        this.dualFootModel.add(this.rightFootModel);
        
        this.scene.add(this.dualFootModel);

        // 4. 전체 그룹을 중앙 정렬 및 스케일링
        this.alignAndScaleDualModel();
        
        this.updateHelpers();
        this.applyFootVisibility();

        this.dispatchEvent(new CustomEvent('dualModelUpdated', {
            detail: { 
                viewType, 
                dualModel: this.dualFootModel,
                leftModel: this.leftFootModel,
                rightModel: this.rightFootModel
            }
        }));
        
        console.log('✅ 양발 모델 뷰 업데이트 완료');
    }

    /**
     * 개별 발 모델 생성 (Matrix 미러링 방식 적용)
     */
    createFootModel(geometry, color, viewType, footType) {
        const baseMaterialProps = {
            color: color,
            vertexColors: geometry.hasAttribute('color'),
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
            new THREE.Points(geometry, material) : 
            new THREE.Mesh(geometry, material);
            
        const footModel = new THREE.Group();
        footModel.add(mesh);
        footModel.userData.footType = footType;

        // (핵심 수정) 오른발일 경우, Matrix를 이용해 미러링
        if (footType === 'right') {
            const mirrorMatrix = new THREE.Matrix4().makeScale(-1, 1, 1);
            footModel.applyMatrix4(mirrorMatrix);
        }
        
        return footModel;
    }

    /**
     * 양발 배치 (간격 수정)
     */
    positionDualFeet() {
        if (!this.leftFootModel || !this.rightFootModel) return;

        const leftBox = new THREE.Box3().setFromObject(this.leftFootModel);
        const leftSize = leftBox.getSize(new THREE.Vector3());
        
        const spacing = leftSize.x * 0.6;
        
        const leftPosition = -(leftSize.x / 2) - (spacing / 2);
        const rightPosition = (leftSize.x / 2) + (spacing / 2);
        
        this.leftFootModel.position.x = leftPosition;
        this.rightFootModel.position.x = rightPosition;
        
        console.log(`📐 양발 배치 완료: 왼발(${leftPosition.toFixed(1)}), 오른발(${rightPosition.toFixed(1)}), 간격(${spacing.toFixed(1)})`);
    }

    /**
     * 양발 모델 정렬 및 스케일링
     */
    alignAndScaleDualModel() {
        if (!this.dualFootModel) return;

        const dualBox = new THREE.Box3().setFromObject(this.dualFootModel);
        const dualCenter = dualBox.getCenter(new THREE.Vector3());
        this.dualFootModel.position.sub(dualCenter);
        
        const dualSize = dualBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(dualSize.x, dualSize.y, dualSize.z);
        const desiredSize = 180;
        const scale = desiredSize / maxDim;
        
        this.dualFootModel.scale.set(scale, scale, scale);
        
        console.log(`📏 양발 스케일링 완료: ${scale.toFixed(3)}배`);
    }

    /**
     * 개별 발 정렬
     */
    alignSingleFoot(footModel) {
        if (!footModel || footModel.children.length === 0) return;

        const mesh = footModel.children[0];
        
        const initialBox = new THREE.Box3().setFromObject(mesh);
        const initialSize = initialBox.getSize(new THREE.Vector3());

        if (initialSize.y > initialSize.x && initialSize.y > initialSize.z) {
            footModel.rotation.x = -Math.PI / 2;
        } else if (initialSize.x > initialSize.y && initialSize.x > initialSize.z) {
            footModel.rotation.z = -Math.PI / 2;
        }

        const rotatedBox = new THREE.Box3().setFromObject(footModel);
        const center = rotatedBox.getCenter(new THREE.Vector3());
        footModel.position.sub(center);
    }

    /**
     * 발 가시성 설정
     */
    setFootVisibility(visibilityMode) {
        this.footVisibility = visibilityMode;
        this.applyFootVisibility();
        
        console.log(`👁️ 발 가시성 변경: ${visibilityMode}`);
    }

    /**
     * 발 가시성 적용
     */
    applyFootVisibility() {
        if (!this.leftFootModel || !this.rightFootModel) return;

        switch(this.footVisibility) {
            case 'left':
                this.leftFootModel.visible = true;
                this.rightFootModel.visible = false;
                break;
            case 'right':
                this.leftFootModel.visible = false;
                this.rightFootModel.visible = true;
                break;
            case 'both':
            default:
                this.leftFootModel.visible = true;
                this.rightFootModel.visible = true;
                break;
        }
    }

    /**
     * 기존 모델들 정리
     */
    cleanupCurrentModels() {
        if (this.dualFootModel) {
            this.scene.remove(this.dualFootModel);
            this.dualFootModel.traverse(child => {
                if (child.isMesh || child.isPoints) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        
        this.dualFootModel = null;
        this.leftFootModel = null;
        this.rightFootModel = null;
    }

    /**
     * 헬퍼 업데이트
     */
    updateHelpers() {
        if (!this.dualFootModel) return;

        const finalBox = new THREE.Box3().setFromObject(this.dualFootModel);
        this.gridHelper.position.y = finalBox.min.y;
        
        this.boxHelper.box.setFromObject(this.dualFootModel);
    }

    /**
     * 그리드 토글
     */
    toggleGrid(isVisible) {
        if (this.gridHelper) {
            this.gridHelper.visible = isVisible !== undefined ? isVisible : !this.gridHelper.visible;
        }
        return this.gridHelper ? this.gridHelper.visible : false;
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
     * 현재 모델 반환 (양발 그룹)
     */
    getCurrentModel() {
        return this.dualFootModel;
    }
    
    getLeftFootModel() {
        return this.leftFootModel;
    }

    getRightFootModel() {
        return this.rightFootModel;
    }

    getLeftGeometry() {
        return this.leftGeometry;
    }

    getRightGeometry() {
        return this.rightGeometry;
    }

    getScene() {
        return this.scene;
    }

    getRenderer() {
        return this.renderer;
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.cleanupCurrentModels();

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

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        if (this.scene) {
            this.scene.clear();
        }

        console.log('🧹 Scene Manager (양발 지원) 정리 완료');
    }
}
