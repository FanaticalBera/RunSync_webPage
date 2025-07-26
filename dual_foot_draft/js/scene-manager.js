/**
 * 씬 매니저 모듈 - 양발 3D Scene, 렌더러, 모델 관리 전담
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
        
        // 현재 뷰 모드 저장
        this.currentViewMode = viewType;
        
        // 기존 모델 정리
        this.cleanupCurrentModels();

        // 양발 그룹 생성
        this.dualFootModel = new THREE.Group();
        this.dualFootModel.name = 'DualFootModel';

        // 왼발 모델 생성
        this.leftFootModel = this.createFootModel(this.leftGeometry, leftColor, viewType, 'left');
        this.leftFootModel.name = 'LeftFoot';
        
        // 오른발 모델 생성
        this.rightFootModel = this.createFootModel(this.rightGeometry, rightColor, viewType, 'right');
        this.rightFootModel.name = 'RightFoot';

        // 양발 배치
        this.positionDualFeet();
        
        // 그룹에 추가
        this.dualFootModel.add(this.leftFootModel);
        this.dualFootModel.add(this.rightFootModel);
        
        // 씬에 추가
        this.scene.add(this.dualFootModel);

        // 모델 정렬 및 스케일링
        this.alignAndScaleDualModel();
        
        // 헬퍼 업데이트
        this.updateHelpers();

        // 발 가시성 적용
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
     * 개별 발 모델 생성
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
        
        return footModel;
    }

    /**
     * 양발 배치 (나란히 배치)
     */
    positionDualFeet() {
        if (!this.leftFootModel || !this.rightFootModel) return;

        // 각 발의 바운딩 박스 계산
        const leftBox = new THREE.Box3().setFromObject(this.leftFootModel);
        const rightBox = new THREE.Box3().setFromObject(this.rightFootModel);
        
        const leftSize = leftBox.getSize(new THREE.Vector3());
        const rightSize = rightBox.getSize(new THREE.Vector3());
        
        // 적절한 간격 계산 (발 너비의 20%)
        const spacing = Math.max(leftSize.x, rightSize.x) * 0.2;
        
        // 왼발을 왼쪽으로, 오른발을 오른쪽으로 배치
        const leftPosition = -(leftSize.x / 2 + spacing / 2);
        const rightPosition = rightSize.x / 2 + spacing / 2;
        
        this.leftFootModel.position.x = leftPosition;
        this.rightFootModel.position.x = rightPosition;
        
        console.log(`📐 양발 배치 완료: 왼발(${leftPosition.toFixed(1)}), 오른발(${rightPosition.toFixed(1)}), 간격(${spacing.toFixed(1)})`);
    }

    /**
     * 양발 모델 정렬 및 스케일링
     */
    alignAndScaleDualModel() {
        if (!this.dualFootModel) return;

        // 각 발을 개별적으로 정렬
        this.alignSingleFoot(this.leftFootModel);
        this.alignSingleFoot(this.rightFootModel);

        // 전체 그룹 중앙 정렬
        const dualBox = new THREE.Box3().setFromObject(this.dualFootModel);
        const dualCenter = dualBox.getCenter(new THREE.Vector3());
        this.dualFootModel.position.sub(dualCenter);
        
        // 전체 크기에 맞춰 스케일링
        const dualSize = dualBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(dualSize.x, dualSize.y, dualSize.z);
        const desiredSize = 180; // 양발이므로 조금 더 크게
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
        
        // 초기 바운딩 박스 계산
        const initialBox = new THREE.Box3().setFromObject(mesh);
        const initialSize = initialBox.getSize(new THREE.Vector3());

        // Y축이 가장 긴 경우 회전 (발이 세로로 서있는 경우)
        if (initialSize.y > initialSize.x && initialSize.y > initialSize.z) {
            footModel.rotation.x = -Math.PI / 2;
        } else if (initialSize.x > initialSize.y && initialSize.x > initialSize.z) {
            footModel.rotation.z = -Math.PI / 2;
        }

        // 회전 후 중앙 정렬 (발별로 개별 적용)
        const rotatedBox = new THREE.Box3().setFromObject(footModel);
        const center = rotatedBox.getCenter(new THREE.Vector3());
        
        // X 위치는 유지하고 Y, Z만 중앙 정렬
        const originalX = footModel.position.x;
        footModel.position.sub(center);
        footModel.position.x = originalX;
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

        // 그리드 위치 조정 (양발 모델 기준)
        const finalBox = new THREE.Box3().setFromObject(this.dualFootModel);
        this.gridHelper.position.y = finalBox.min.y;
        
        // 바운딩 박스 업데이트
        this.boxHelper.box.setFromObject(this.dualFootModel);
    }

    /**
     * 양발 모델 색상 변경
     */
    changeDualModelColor(leftColor, rightColor) {
        if (this.leftFootModel) {
            this.leftFootModel.traverse(child => {
                if (child.isMesh || child.isPoints) {
                    child.material.color.set(leftColor);
                }
            });
        }
        
        if (this.rightFootModel) {
            this.rightFootModel.traverse(child => {
                if (child.isMesh || child.isPoints) {
                    child.material.color.set(rightColor);
                }
            });
        }
    }

    /**
     * 단일 발 색상 변경
     */
    changeFootColor(foot, color) {
        const footModel = foot === 'left' ? this.leftFootModel : this.rightFootModel;
        if (!footModel) return;
        
        footModel.traverse(child => {
            if (child.isMesh || child.isPoints) {
                child.material.color.set(color);
            }
        });
    }

    /**
     * 그리드 토글 (기존 API 유지)
     */
    toggleGrid(isVisible) {
        if (this.gridHelper) {
            this.gridHelper.visible = isVisible !== undefined ? isVisible : !this.gridHelper.visible;
        }
        return this.gridHelper ? this.gridHelper.visible : false;
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

    // ==================== 접근자 메서드 (기존 API 호환성 유지) ====================

    /**
     * 현재 모델 반환 (양발 그룹)
     */
    getCurrentModel() {
        return this.dualFootModel;
    }

    /**
     * 왼발 모델 반환
     */
    getLeftFootModel() {
        return this.leftFootModel;
    }

    /**
     * 오른발 모델 반환
     */
    getRightFootModel() {
        return this.rightFootModel;
    }

    /**
     * 현재 geometry 반환 (왼발 geometry 반환 - 호환성)
     */
    getCurrentGeometry() {
        return this.leftGeometry;
    }

    /**
     * 왼발 geometry 반환
     */
    getLeftGeometry() {
        return this.leftGeometry;
    }

    /**
     * 오른발 geometry 반환
     */
    getRightGeometry() {
        return this.rightGeometry;
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
     * 현재 뷰 모드 반환
     */
    getCurrentViewMode() {
        return this.currentViewMode;
    }

    /**
     * 현재 발 가시성 모드 반환
     */
    getFootVisibility() {
        return this.footVisibility;
    }

    // ==================== 기존 API 호환성 메서드들 ====================

    /**
     * 단일 geometry 설정 (호환성 - 왼발로 처리)
     */
    setGeometry(geometry) {
        console.log('⚠️ 단일 geometry 설정은 왼발로 처리됩니다. setDualGeometry() 사용을 권장합니다.');
        this.leftGeometry = geometry;
    }

    /**
     * 모델 뷰 업데이트 (호환성 - 수정됨)
     */
    updateModelView(viewType, color = '#3b82f6') {
        if (this.leftGeometry && this.rightGeometry) {
            // 양발이 모두 있으면 양발 뷰 업데이트
            this.updateDualModelView(viewType, color, '#10b981');
        } else if (this.leftGeometry) {
            // 왼발만 있으면 단일 발 처리
            this.updateSingleFootView(this.leftGeometry, viewType, color, 'left');
        }
    }

    /**
     * 단일 발 뷰 업데이트 (내부용)
     */
    updateSingleFootView(geometry, viewType, color, footType) {
        this.cleanupCurrentModels();
        
        const footModel = this.createFootModel(geometry, color, viewType, footType);
        this.alignSingleFoot(footModel);
        
        if (footType === 'left') {
            this.leftFootModel = footModel;
        } else {
            this.rightFootModel = footModel;
        }
        
        this.scene.add(footModel);
        this.updateHelpers();
    }

    /**
     * 모델 색상 변경 (호환성)
     */
    changeModelColor(color) {
        if (this.dualFootModel) {
            // 양발 모델이 있으면 둘 다 같은 색으로
            this.changeDualModelColor(color, color);
        } else if (this.leftFootModel) {
            this.changeFootColor('left', color);
        } else if (this.rightFootModel) {
            this.changeFootColor('right', color);
        }
    }

    

    // ==================== 고급 기능 ====================

    /**
     * 양발 애니메이션 (회전)
     */
    startDualFootRotation(speed = 0.01) {
        if (!this.dualFootModel) return;
        
        const animate = () => {
            if (this.dualFootModel) {
                this.dualFootModel.rotation.y += speed;
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    /**
     * 발별 하이라이트
     */
    highlightFoot(foot, duration = 2000) {
        const footModel = foot === 'left' ? this.leftFootModel : this.rightFootModel;
        if (!footModel) return;

        const originalColor = new THREE.Color();
        footModel.traverse(child => {
            if (child.isMesh || child.isPoints) {
                originalColor.copy(child.material.color);
                child.material.color.set(0xffff00); // 노란색으로 하이라이트
            }
        });

        // 원래 색으로 복원
        setTimeout(() => {
            footModel.traverse(child => {
                if (child.isMesh || child.isPoints) {
                    child.material.color.copy(originalColor);
                }
            });
        }, duration);
    }

    /**
     * 양발 간 거리 측정
     */
    measureFootDistance() {
        if (!this.leftFootModel || !this.rightFootModel) return null;

        const leftBox = new THREE.Box3().setFromObject(this.leftFootModel);
        const rightBox = new THREE.Box3().setFromObject(this.rightFootModel);
        
        const leftCenter = leftBox.getCenter(new THREE.Vector3());
        const rightCenter = rightBox.getCenter(new THREE.Vector3());
        
        return leftCenter.distanceTo(rightCenter);
    }

    /**
     * 발 교체 (왼발과 오른발 위치 바꾸기)
     */
    swapFootPositions() {
        if (!this.leftFootModel || !this.rightFootModel) return;

        const leftX = this.leftFootModel.position.x;
        const rightX = this.rightFootModel.position.x;
        
        this.leftFootModel.position.x = rightX;
        this.rightFootModel.position.x = leftX;
        
        console.log('🔄 양발 위치 교체 완료');
    }

    /**
     * 발별 투명도 설정
     */
    setFootOpacity(foot, opacity) {
        const footModel = foot === 'left' ? this.leftFootModel : this.rightFootModel;
        if (!footModel) return;

        footModel.traverse(child => {
            if (child.isMesh || child.isPoints) {
                child.material.transparent = opacity < 1;
                child.material.opacity = opacity;
                child.material.needsUpdate = true;
            }
        });
    }

    /**
     * 양발 비교 모드 (나란히 정렬)
     */
    enableComparisonMode() {
        if (!this.leftFootModel || !this.rightFootModel) return;

        // 둘 다 같은 방향으로 정렬
        this.leftFootModel.rotation.copy(this.rightFootModel.rotation);
        
        // 수평으로 나란히 배치
        const spacing = 100;
        this.leftFootModel.position.set(-spacing/2, 0, 0);
        this.rightFootModel.position.set(spacing/2, 0, 0);
        
        console.log('📐 양발 비교 모드 활성화');
    }

    /**
     * 오버레이 모드 (양발 겹쳐서 표시)
     */
    enableOverlayMode() {
        if (!this.leftFootModel || !this.rightFootModel) return;

        // 같은 위치에 배치
        this.leftFootModel.position.set(0, 0, 0);
        this.rightFootModel.position.set(0, 0, 0);
        
        // 투명도 적용으로 겹침 효과
        this.setFootOpacity('left', 0.7);
        this.setFootOpacity('right', 0.7);
        
        console.log('👥 오버레이 모드 활성화');
    }

    /**
     * 측정선 추가 (양발용)
     */
    addDualFootMeasurementLines(leftVertices, rightVertices) {
        // 기존 측정선 제거
        this.removeMeasurementLines();
        
        if (leftVertices && leftVertices.length > 0) {
            this.addFootMeasurementLines(leftVertices, 'left', 0xff0000); // 빨간색
        }
        
        if (rightVertices && rightVertices.length > 0) {
            this.addFootMeasurementLines(rightVertices, 'right', 0x00ff00); // 초록색
        }
    }

    /**
     * 개별 발 측정선 추가
     */
    addFootMeasurementLines(vertices, foot, color) {
        const bbox = new THREE.Box3().setFromPoints(vertices);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        
        const offset = Math.max(size.x, size.y, size.z) * 0.1;
        
        // 길이 측정선
        const lengthLine = this.createMeasurementLine(
            new THREE.Vector3(center.x, bbox.min.y - offset, bbox.min.z),
            new THREE.Vector3(center.x, bbox.min.y - offset, bbox.max.z),
            color
        );
        lengthLine.userData = { type: 'length', foot: foot };
        this.scene.add(lengthLine);
        
        // 너비 측정선
        const widthLine = this.createMeasurementLine(
            new THREE.Vector3(bbox.min.x, bbox.min.y - offset/2, center.z),
            new THREE.Vector3(bbox.max.x, bbox.min.y - offset/2, center.z),
            color
        );
        widthLine.userData = { type: 'width', foot: foot };
        this.scene.add(widthLine);
    }

    /**
     * 측정선 생성 헬퍼
     */
    createMeasurementLine(start, end, color) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(geometry, material);
        line.userData.isMeasurementLine = true;
        return line;
    }

    /**
     * 측정선 제거
     */
    removeMeasurementLines() {
        const linesToRemove = [];
        this.scene.traverse(child => {
            if (child.userData.isMeasurementLine) {
                linesToRemove.push(child);
            }
        });
        
        linesToRemove.forEach(line => {
            this.scene.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
    }

    // ==================== 정리 ====================

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        // 애니메이션 중지
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // 측정선 제거
        this.removeMeasurementLines();

        // 모델 정리
        this.cleanupCurrentModels();

        // Geometry 정리
        if (this.leftGeometry) this.leftGeometry.dispose();
        if (this.rightGeometry) this.rightGeometry.dispose();

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

        // 상태 초기화
        this.leftGeometry = null;
        this.rightGeometry = null;
        this.dualFootModel = null;
        this.leftFootModel = null;
        this.rightFootModel = null;
        this.currentViewMode = 'mesh';
        this.footVisibility = 'both';

        console.log('🧹 Scene Manager (양발 지원) 정리 완료');
    }
}