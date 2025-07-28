/**
 * 측정 엔진 모듈 - 발 측정 및 분석 전담 (개선된 버전)
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class MeasurementEngine extends EventTarget {
    constructor() {
        super();
        this.footMeasurements = {};
        this.measurementLines = [];
        this.debugMode = true; // 디버깅용
    }

    /**
     * 정밀 측정 수행 (개선된 버전)
     */
    async performPreciseMeasurements(geometry, currentModel) {
        if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.error('❌ 유효하지 않은 geometry:', geometry);
            this.dispatchEvent(new CustomEvent('measurementStarted', { 
                detail: { status: '오류: 유효하지 않은 3D 데이터' }
            }));
            return;
        }
        
        console.log('🔬 정밀 측정 시작...');
        console.log('📊 Geometry 정보:', {
            hasPosition: !!geometry.attributes.position,
            vertexCount: geometry.attributes.position.count,
            positionArray: geometry.attributes.position.array.length
        });
        
        this.dispatchEvent(new CustomEvent('measurementStarted', { 
            detail: { status: '발 구조 분석 중...' }
        }));
        
        try {
            const positions = geometry.attributes.position.array;
            const vertexCount = geometry.attributes.position.count;
            
            if (vertexCount === 0 || positions.length === 0) {
                throw new Error('빈 geometry 데이터');
            }
            
            console.log(`📐 정점 개수: ${vertexCount}, 위치 배열 길이: ${positions.length}`);
            
            const originalVertices = [];
            
            // 원본 geometry 정점 데이터 추출
            for (let i = 0; i < positions.length; i += 3) {
                const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
                originalVertices.push(vertex);
            }
            
            console.log(`✅ ${originalVertices.length}개 정점 추출 완료`);
            
            // 회전만 적용 (스케일 제외)
            if (currentModel) {
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeRotationFromEuler(currentModel.rotation);
                originalVertices.forEach(vertex => vertex.applyMatrix4(rotationMatrix));
                console.log('🔄 모델 회전 적용 완료');
            }
            
            // 바운딩 박스 및 크기 계산
            const bbox = new THREE.Box3().setFromPoints(originalVertices);
            const size = bbox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            console.log('📏 바운딩 박스:', {
                min: bbox.min,
                max: bbox.max,
                size: size,
                maxDim: maxDim
            });
            
            // 단위 자동 감지
            const unitData = this.detectUnit(maxDim);
            console.log('🎯 단위 감지 결과:', unitData);
            
            this.dispatchEvent(new CustomEvent('measurementProgress', { 
                detail: { status: '정밀 측정 수행 중...' }
            }));
            
            // 정밀 측정 수행
            const footLength = this.measureFootLength(originalVertices, bbox) * unitData.multiplier;
            const footWidth = this.measureFootWidth(originalVertices, bbox) * unitData.multiplier;
            const footHeight = this.measureFootHeight(originalVertices, bbox) * unitData.multiplier;
            
            console.log('📊 측정 결과 (원본 단위):', { 
                length: footLength / unitData.multiplier, 
                width: footWidth / unitData.multiplier, 
                height: footHeight / unitData.multiplier 
            });
            console.log('📊 측정 결과 (mm):', { footLength, footWidth, footHeight });
            
            // 측정값 검증
            if (!this.validateMeasurements(footLength, footWidth, footHeight)) {
                console.warn('⚠️ 측정값이 비정상적입니다. 기본값으로 대체...');
                throw new Error('측정값 검증 실패');
            }
            
            // 측정 결과 저장
            this.footMeasurements = {
                length: footLength,
                width: footWidth,
                height: footHeight,
                unit: unitData.unit,
                confidence: unitData.confidence,
                originalVertices: originalVertices,
                boundingBox: bbox,
                vertexCount: vertexCount
            };
            
            // 비율 계산
            const ratios = this.calculateRatios(footLength, footWidth, footHeight);
            
            // 발 유형 분석
            const analysis = this.analyzeFootType(footLength, footWidth, footHeight);
            
            this.dispatchEvent(new CustomEvent('measurementComplete', {
                detail: {
                    measurements: this.footMeasurements,
                    ratios: ratios,
                    analysis: analysis,
                    status: '측정 완료 - 정밀도 검증됨',
                    confidence: unitData.confidence
                }
            }));
            
            console.log('✅ 정밀 측정 완료');
            return this.footMeasurements;
            
        } catch (error) {
            console.error('❌ 측정 중 오류:', error);
            
            // 폴백: 기본 바운딩 박스 측정
            const fallbackResult = this.performFallbackMeasurement(geometry, currentModel);
            
            this.dispatchEvent(new CustomEvent('measurementComplete', {
                detail: {
                    measurements: fallbackResult.measurements,
                    ratios: fallbackResult.ratios,
                    analysis: fallbackResult.analysis,
                    status: '기본 측정 완료 (폴백 모드)',
                    confidence: '낮음 (폴백)'
                }
            }));
            
            return fallbackResult.measurements;
        }
    }

    /**
     * 폴백 측정 (기본 바운딩 박스 기반)
     */
    performFallbackMeasurement(geometry, currentModel) {
        console.log('🔄 폴백 측정 모드로 전환...');
        
        // 기본 바운딩 박스 계산
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        const size = bbox.getSize(new THREE.Vector3());
        
        // 간단한 단위 추정 (100~300mm 범위로 가정)
        const maxDim = Math.max(size.x, size.y, size.z);
        let unitMultiplier = 1;
        let unit = 'mm';
        
        if (maxDim < 1) {
            unitMultiplier = 1000; // 미터 → mm
            unit = 'mm';
        } else if (maxDim > 500) {
            unitMultiplier = 1; // 이미 mm
            unit = 'mm';
        } else {
            unitMultiplier = 1; // mm로 가정
            unit = 'mm';
        }
        
        // 기본 측정 (X=너비, Y=높이, Z=길이로 가정)
        const footLength = size.z * unitMultiplier;
        const footWidth = size.x * unitMultiplier;
        const footHeight = size.y * unitMultiplier;
        
        console.log('📊 폴백 측정 결과:', { footLength, footWidth, footHeight, unit });
        
        const measurements = {
            length: Math.max(footLength, 50), // 최소 50mm
            width: Math.max(footWidth, 30),   // 최소 30mm
            height: Math.max(footHeight, 20), // 최소 20mm
            unit: unit,
            confidence: '낮음 (폴백 모드)',
            originalVertices: [],
            boundingBox: bbox,
            vertexCount: geometry.attributes.position.count
        };
        
        const ratios = this.calculateRatios(measurements.length, measurements.width, measurements.height);
        const analysis = this.analyzeFootType(measurements.length, measurements.width, measurements.height);
        
        return { measurements, ratios, analysis };
    }

    /**
     * 측정값 검증
     */
    validateMeasurements(length, width, height) {
        // 일반적인 발 크기 범위 (mm 기준)
        const MIN_LENGTH = 50;   // 최소 5cm
        const MAX_LENGTH = 500;  // 최대 50cm
        const MIN_WIDTH = 20;    // 최소 2cm
        const MAX_WIDTH = 200;   // 최대 20cm
        const MIN_HEIGHT = 10;   // 최소 1cm
        const MAX_HEIGHT = 150;  // 최대 15cm
        
        const validLength = length >= MIN_LENGTH && length <= MAX_LENGTH;
        const validWidth = width >= MIN_WIDTH && width <= MAX_WIDTH;
        const validHeight = height >= MIN_HEIGHT && height <= MAX_HEIGHT;
        
        console.log('🔍 측정값 검증:', {
            length: { value: length, valid: validLength, range: `${MIN_LENGTH}-${MAX_LENGTH}` },
            width: { value: width, valid: validWidth, range: `${MIN_WIDTH}-${MAX_WIDTH}` },
            height: { value: height, valid: validHeight, range: `${MIN_HEIGHT}-${MAX_HEIGHT}` }
        });
        
        return validLength && validWidth && validHeight;
    }

    /**
     * 단위 자동 감지 (개선된 버전)
     */
    detectUnit(maxDim) {
        let unitMultiplier = 1;
        let unit = 'mm';
        let confidence = '높음';
        
        console.log('📏 원본 모델 최대 치수:', maxDim);
        
        if (maxDim < 0.5) {
            // 매우 작은 값 - 미터 단위로 추정
            unitMultiplier = 1000;
            unit = 'mm';
            confidence = '높음 (미터 단위 감지)';
        } else if (maxDim >= 0.5 && maxDim < 5) {
            // 중간 값 - 미터 단위일 가능성
            unitMultiplier = 1000;
            unit = 'mm';
            confidence = '중간 (미터 단위 추정)';
        } else if (maxDim >= 5 && maxDim < 50) {
            // cm 단위로 추정
            unitMultiplier = 10;
            unit = 'mm';
            confidence = '중간 (cm 단위 추정)';
        } else if (maxDim >= 50 && maxDim <= 500) {
            // mm 단위로 추정
            unitMultiplier = 1;
            unit = 'mm';
            confidence = '높음 (mm 단위 감지)';
        } else {
            // 매우 큰 값 - 스케일 조정 필요
            unitMultiplier = 0.1;
            unit = 'mm';
            confidence = '낮음 (비정상적 크기)';
        }
        
        return { multiplier: unitMultiplier, unit, confidence };
    }

    /**
     * 발 길이 측정 (개선된 버전)
     */
    measureFootLength(vertices, bbox) {
        if (!vertices || vertices.length === 0) {
            console.warn('⚠️ 빈 vertices 배열');
            return bbox ? bbox.getSize(new THREE.Vector3()).z : 0;
        }
        
        try {
            // 발바닥 높이 기준점 찾기 (Y축 최솟값 근처)
            const yValues = vertices.map(v => v.y).sort((a, b) => a - b);
            const minY = yValues[0];
            const maxY = yValues[yValues.length - 1];
            const footSoleThreshold = minY + (maxY - minY) * 0.15;
            
            // 발바닥 근처 점들만 필터링
            const footSoleVertices = vertices.filter(v => v.y <= footSoleThreshold);
            
            if (footSoleVertices.length === 0) {
                console.warn('⚠️ 발바닥 정점을 찾을 수 없음. 전체 Z축 범위 사용');
                const zValues = vertices.map(v => v.z).sort((a, b) => a - b);
                return zValues[zValues.length - 1] - zValues[0];
            }
            
            // 발뒤꿈치와 발가락 끝 찾기
            const zValues = footSoleVertices.map(v => v.z).sort((a, b) => a - b);
            const heelZ = zValues[0];
            const toeZ = zValues[zValues.length - 1];
            
            const length = toeZ - heelZ;
            console.log(`📏 발 길이 측정: 뒤꿈치(${heelZ.toFixed(2)}) ~ 발가락(${toeZ.toFixed(2)}) = ${length.toFixed(2)}`);
            
            return Math.abs(length);
            
        } catch (error) {
            console.error('❌ 발 길이 측정 오류:', error);
            return bbox ? bbox.getSize(new THREE.Vector3()).z : 0;
        }
    }

    /**
     * 발 너비 측정 (개선된 버전)
     */
    measureFootWidth(vertices, bbox) {
        if (!vertices || vertices.length === 0) {
            console.warn('⚠️ 빈 vertices 배열');
            return bbox ? bbox.getSize(new THREE.Vector3()).x : 0;
        }
        
        try {
            // 발볼 부위 찾기 (발 전체 길이의 60-75% 지점)
            const zValues = vertices.map(v => v.z).sort((a, b) => a - b);
            const minZ = zValues[0];
            const maxZ = zValues[zValues.length - 1];
            const footLength = maxZ - minZ;
            
            // 발볼 위치 정의
            const ballStartZ = minZ + footLength * 0.6;
            const ballEndZ = minZ + footLength * 0.75;
            
            // 발바닥 높이 기준
            const yValues = vertices.map(v => v.y).sort((a, b) => a - b);
            const minY = yValues[0];
            const maxY = yValues[yValues.length - 1];
            const footSoleThreshold = minY + (maxY - minY) * 0.2;
            
            // 발볼 부위 점들 필터링
            const ballVertices = vertices.filter(v => 
                v.z >= ballStartZ && v.z <= ballEndZ && v.y <= footSoleThreshold
            );
            
            if (ballVertices.length === 0) {
                console.warn('⚠️ 발볼 정점을 찾을 수 없음. 전체 X축 범위 사용');
                const xValues = vertices.map(v => v.x).sort((a, b) => a - b);
                return xValues[xValues.length - 1] - xValues[0];
            }
            
            // 발볼 너비 계산
            const xValues = ballVertices.map(v => v.x).sort((a, b) => a - b);
            const leftX = xValues[0];
            const rightX = xValues[xValues.length - 1];
            
            const width = rightX - leftX;
            console.log(`📏 발 너비 측정: 좌측(${leftX.toFixed(2)}) ~ 우측(${rightX.toFixed(2)}) = ${width.toFixed(2)}`);
            
            return Math.abs(width);
            
        } catch (error) {
            console.error('❌ 발 너비 측정 오류:', error);
            return bbox ? bbox.getSize(new THREE.Vector3()).x : 0;
        }
    }

    /**
     * 발 높이 측정 (개선된 버전)
     */
    measureFootHeight(vertices, bbox) {
        if (!vertices || vertices.length === 0) {
            console.warn('⚠️ 빈 vertices 배열');
            return bbox ? bbox.getSize(new THREE.Vector3()).y : 0;
        }
        
        try {
            // 발바닥 찾기
            const yValues = vertices.map(v => v.y).sort((a, b) => a - b);
            const soleY = yValues[0];
            
            // 발등 중앙 부위 찾기 (발 중앙 30-70% 지점)
            const zValues = vertices.map(v => v.z).sort((a, b) => a - b);
            const minZ = zValues[0];
            const maxZ = zValues[zValues.length - 1];
            const footLength = maxZ - minZ;
            
            const instepStartZ = minZ + footLength * 0.3;
            const instepEndZ = minZ + footLength * 0.7;
            
            const instepVertices = vertices.filter(v => 
                v.z >= instepStartZ && v.z <= instepEndZ
            );
            
            if (instepVertices.length === 0) {
                console.warn('⚠️ 발등 정점을 찾을 수 없음. 전체 Y축 범위 사용');
                return yValues[yValues.length - 1] - soleY;
            }
            
            // 발등 최고점 찾기
            const instepYValues = instepVertices.map(v => v.y).sort((a, b) => a - b);
            const instepTopY = instepYValues[instepYValues.length - 1];
            
            const height = instepTopY - soleY;
            console.log(`📏 발 높이 측정: 발바닥(${soleY.toFixed(2)}) ~ 발등(${instepTopY.toFixed(2)}) = ${height.toFixed(2)}`);
            
            return Math.abs(height);
            
        } catch (error) {
            console.error('❌ 발 높이 측정 오류:', error);
            return bbox ? bbox.getSize(new THREE.Vector3()).y : 0;
        }
    }

    /**
     * 비율 계산
     */
    calculateRatios(length, width, height) {
        const lwRatio = length && width ? (length / width).toFixed(2) : 'N/A';
        const hlRatio = height && length ? (height / length * 100).toFixed(1) + '%' : 'N/A';
        
        return {
            lengthWidth: lwRatio,
            heightLength: hlRatio
        };
    }

    /**
     * 발 유형 분석
     */
    analyzeFootType(length, width, height) {
        if (!length || !width || !height) {
            return { 
                footType: 'Analysis Pending', 
                archType: 'Analysis Pending', 
                description: 'Insufficient data for comprehensive analysis' 
            };
        }

        const lwRatio = length / width;
        const hlRatio = height / length;
        
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

    /**
     * 측정선 생성 (개선된 버전)
     */
    createMeasurementLines(vertices, scene) {
        // 기존 측정선 제거
        this.measurementLines.forEach(line => scene.remove(line));
        this.measurementLines = [];
        
        if (!vertices || vertices.length === 0) {
            console.warn('⚠️ 측정선 생성 실패: 빈 vertices');
            return this.measurementLines;
        }
        
        try {
            // 바운딩 박스 계산
            const bbox = new THREE.Box3().setFromPoints(vertices);
            const size = bbox.getSize(new THREE.Vector3());
            const center = bbox.getCenter(new THREE.Vector3());
            
            // 간단한 측정선 생성 (바운딩 박스 기반)
            const offset = Math.max(size.x, size.y, size.z) * 0.1;
            
            // 길이 측정선 (Z축, 빨간색)
            const lengthLine = this.createLine(
                new THREE.Vector3(center.x, bbox.min.y - offset, bbox.min.z),
                new THREE.Vector3(center.x, bbox.min.y - offset, bbox.max.z),
                0xff0000
            );
            lengthLine.userData.type = 'length';
            this.measurementLines.push(lengthLine);
            scene.add(lengthLine);
            
            // 너비 측정선 (X축, 노란색)
            const widthLine = this.createLine(
                new THREE.Vector3(bbox.min.x, bbox.min.y - offset/2, center.z),
                new THREE.Vector3(bbox.max.x, bbox.min.y - offset/2, center.z),
                0xffff00
            );
            widthLine.userData.type = 'width';
            this.measurementLines.push(widthLine);
            scene.add(widthLine);
            
            // 높이 측정선 (Y축, 보라색)
            const heightLine = this.createLine(
                new THREE.Vector3(center.x + offset, bbox.min.y, center.z),
                new THREE.Vector3(center.x + offset, bbox.max.y, center.z),
                0xff00ff
            );
            heightLine.userData.type = 'height';
            this.measurementLines.push(heightLine);
            scene.add(heightLine);
            
            console.log('✅ 측정선 생성 완료:', this.measurementLines.length, '개');
            
        } catch (error) {
            console.error('❌ 측정선 생성 오류:', error);
        }

        return this.measurementLines;
    }

    /**
     * 라인 생성 헬퍼
     */
    createLine(start, end, color) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(geometry, material);
        line.userData.className = 'measurement-line';
        return line;
    }

    /**
     * 측정선 표시/숨김 토글
     */
    toggleMeasurementLines() {
        if (this.measurementLines.length === 0) return false;
        
        const isVisible = this.measurementLines[0].visible;
        this.measurementLines.forEach(line => line.visible = !isVisible);
        return !isVisible;
    }

    /**
     * 특정 측정선 강조
     */
    highlightMeasurementLine(measureType) {
        const targetLine = this.measurementLines.find(line => line.userData.type === measureType);
        if (!targetLine) return;

        const originalOpacity = targetLine.material.opacity;
        let count = 0;
        const blink = () => {
            targetLine.material.opacity = targetLine.material.opacity === originalOpacity ? 1.0 : originalOpacity;
            count++;
            if (count < 6) {
                setTimeout(blink, 300);
            } else {
                targetLine.material.opacity = originalOpacity;
            }
        };
        blink();
    }

    /**
     * 측정 데이터 반환
     */
    getMeasurements() {
        return this.footMeasurements;
    }

    /**
     * 측정선 반환
     */
    getMeasurementLines() {
        return this.measurementLines;
    }

    /**
     * 화면용 스케일된 vertices 생성
     */
    getScaledVertices(originalVertices, currentModel) {
        if (!currentModel || !originalVertices) return originalVertices || [];
        
        const scaledVertices = originalVertices.map(v => v.clone());
        const modelMatrix = currentModel.matrixWorld.clone();
        
        scaledVertices.forEach(vertex => {
            vertex.applyMatrix4(modelMatrix);
        });
        
        return scaledVertices;
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        this.measurementLines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
        this.measurementLines = [];
        this.footMeasurements = {};
        console.log('🧹 Measurement Engine 정리 완료');
    }
}