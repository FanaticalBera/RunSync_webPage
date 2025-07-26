/**
 * 파일 로더 모듈 - PLY 파일 로딩 및 처리 전담
 */
import { PLYLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/PLYLoader.js';

export class FileLoader extends EventTarget {
    constructor(sceneManager) {
        super();
        this.sceneManager = sceneManager;
        this.currentFileName = '';
        this.loader = new PLYLoader();
    }

    /**
     * 파일 로딩
     */
    async loadFile(file) {
        if (!file) {
            this.dispatchEvent(new CustomEvent('loadError', {
                detail: { message: '파일이 선택되지 않았습니다.' }
            }));
            return;
        }

        if (!this.isValidFile(file)) {
            this.dispatchEvent(new CustomEvent('loadError', {
                detail: { message: 'PLY 파일만 지원됩니다.' }
            }));
            return;
        }

        console.log('📁 파일 로딩 시작:', file.name);
        this.currentFileName = file.name;
        
        // 로딩 시작 이벤트
        this.dispatchEvent(new CustomEvent('loadStarted', {
            detail: { 
                fileName: file.name,
                status: '모델 로딩 중...'
            }
        }));

        try {
            const geometry = await this.loadPLYFile(file);
            
            // 로딩 완료 이벤트
            this.dispatchEvent(new CustomEvent('loadCompleted', {
                detail: { 
                    fileName: file.name,
                    geometry: geometry,
                    status: '로딩 완료'
                }
            }));

            console.log('✅ PLY 파일 로딩 완료');
            
        } catch (error) {
            console.error('❌ PLY 로드 에러:', error);
            this.dispatchEvent(new CustomEvent('loadError', {
                detail: { 
                    message: `파일 로드 실패: ${error.message || '알 수 없는 오류'}`,
                    error: error
                }
            }));
        }
    }

    /**
     * PLY 파일 로딩 (Promise 기반)
     */
    loadPLYFile(file) {
        return new Promise((resolve, reject) => {
            const objectURL = URL.createObjectURL(file);

            this.loader.load(
                objectURL,
                (geometry) => {
                    URL.revokeObjectURL(objectURL);
                    
                    // Scene Manager에 geometry 설정
                    this.sceneManager.setGeometry(geometry);
                    
                    resolve(geometry);
                },
                (progress) => {
                    // 진행률 이벤트
                    const percentage = progress.loaded / progress.total * 100;
                    this.dispatchEvent(new CustomEvent('loadProgress', {
                        detail: { 
                            percentage: percentage,
                            loaded: progress.loaded,
                            total: progress.total
                        }
                    }));
                },
                (error) => {
                    URL.revokeObjectURL(objectURL);
                    reject(error);
                }
            );
        });
    }

    /**
     * 파일 유효성 검사
     */
    isValidFile(file) {
        const validExtensions = ['.ply'];
        const fileName = file.name.toLowerCase();
        return validExtensions.some(ext => fileName.endsWith(ext));
    }

    /**
     * 드래그 앤 드롭 처리
     */
    handleDrop(event) {
        event.preventDefault();
        
        const files = Array.from(event.dataTransfer.files);
        const plyFile = files.find(file => this.isValidFile(file));
        
        if (plyFile) {
            this.loadFile(plyFile);
        } else {
            this.dispatchEvent(new CustomEvent('loadError', {
                detail: { message: '지원되는 PLY 파일이 없습니다.' }
            }));
        }
    }

    /**
     * 드래그 오버 처리
     */
    handleDragOver(event) {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('dragOver'));
    }

    /**
     * 드래그 리브 처리
     */
    handleDragLeave(event) {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('dragLeave'));
    }

    /**
     * 파일 입력 처리
     */
    handleFileInput(event) {
        const file = event.target.files[0];
        if (file) {
            this.loadFile(file);
        }
    }

    /**
     * 현재 파일명 반환
     */
    getCurrentFileName() {
        return this.currentFileName;
    }

    /**
     * 파일 크기 포맷팅
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 지원되는 파일 형식 목록
     */
    getSupportedFormats() {
        return [
            {
                extension: '.ply',
                description: 'Stanford PLY Format',
                mimeType: 'application/octet-stream'
            }
        ];
    }

    /**
     * 파일 정보 추출
     */
    getFileInfo(file) {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type || 'application/octet-stream',
            lastModified: new Date(file.lastModified),
            extension: file.name.split('.').pop().toLowerCase()
        };
    }

    /**
     * 다중 파일 처리 (향후 확장용)
     */
    async loadMultipleFiles(files) {
        const results = [];
        
        for (const file of files) {
            if (this.isValidFile(file)) {
                try {
                    const geometry = await this.loadPLYFile(file);
                    results.push({
                        file: file,
                        geometry: geometry,
                        success: true
                    });
                } catch (error) {
                    results.push({
                        file: file,
                        error: error,
                        success: false
                    });
                }
            }
        }
        
        return results;
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        // PLYLoader는 별도 정리가 필요하지 않음
        this.currentFileName = '';
        console.log('🧹 File Loader 정리 완료');
    }
}