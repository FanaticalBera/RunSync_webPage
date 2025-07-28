/**
 * 유틸리티 모듈 - 공통 헬퍼 함수들
 */
export class Utils {
    /**
     * 디바운스 함수
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * 스로틀 함수
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 측정값 포맷팅
     */
    static formatMeasurement(value, unit = 'mm', decimals = 1) {
        if (typeof value !== 'number' || isNaN(value)) {
            return 'N/A';
        }
        return `${value.toFixed(decimals)} ${unit}`;
    }

    /**
     * 파일 크기 포맷팅
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 날짜 포맷팅
     */
    static formatDate(date, format = 'YYYY-MM-DD') {
        if (!(date instanceof Date)) date = new Date(date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * 딥 클론
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => Utils.deepClone(item));
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = Utils.deepClone(obj[key]);
            }
        }
        return clonedObj;
    }

    /**
     * 객체 병합
     */
    static mergeObjects(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        if (Utils.isObject(target) && Utils.isObject(source)) {
            for (const key in source) {
                if (Utils.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    Utils.mergeObjects(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        return Utils.mergeObjects(target, ...sources);
    }

    /**
     * 객체 타입 체크
     */
    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * 범위 내 값으로 제한
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 선형 보간
     */
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /**
     * 값을 다른 범위로 매핑
     */
    static mapRange(value, fromMin, fromMax, toMin, toMax) {
        return toMin + (toMax - toMin) * ((value - fromMin) / (fromMax - fromMin));
    }

    /**
     * 라디안을 각도로 변환
     */
    static radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * 각도를 라디안으로 변환
     */
    static degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * 랜덤 ID 생성
     */
    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 색상 헥스 코드 검증
     */
    static isValidHexColor(hex) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }

    /**
     * 헥스 색상을 RGB로 변환
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * RGB를 헥스 색상으로 변환
     */
    static rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /**
     * 에러 핸들링 헬퍼
     */
    static handleError(error, context = '') {
        const errorMessage = error.message || '알 수 없는 오류';
        const errorDetails = {
            message: errorMessage,
            context: context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        console.error(`❌ ${context} 오류:`, errorDetails);
        return errorDetails;
    }

    /**
     * 비동기 지연
     */
    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 재시도 로직
     */
    static async retry(fn, maxAttempts = 3, delayMs = 1000) {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                console.warn(`시도 ${attempt}/${maxAttempts} 실패:`, error.message);
                if (attempt < maxAttempts) {
                    await Utils.delay(delayMs * attempt);
                }
            }
        }
        throw lastError;
    }

    /**
     * URL 파라미터 파싱
     */
    static parseUrlParams(url = window.location.href) {
        const params = new URLSearchParams(new URL(url).search);
        const result = {};
        for (const [key, value] of params.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * 성능 헬퍼 접근자
     */
    static getPerformance() { 
        return Utils.performance; 
    }

    /**
     * 기능 감지 헬퍼 접근자
     */
    static getFeatures() { 
        return Utils.features; 
    }
}

// 로컬 스토리지 헬퍼
Utils.storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('로컬 저장 실패:', error);
        }
    },
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('파싱 실패:', error);
            return defaultValue;
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('삭제 실패:', error);
        }
    },
    clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.warn('전체 삭제 실패:', error);
        }
    }
};

// 성능 측정 헬퍼
Utils.performance = {
    start(label) {
        performance.mark(`${label}-start`);
    },
    end(label) {
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);
        const measure = performance.getEntriesByName(label)[0];
        console.log(`⚡ ${label}: ${measure.duration.toFixed(2)}ms`);
        return measure.duration;
    },
    clear(label) {
        performance.clearMarks(`${label}-start`);
        performance.clearMarks(`${label}-end`);
        performance.clearMeasures(label);
    }
};

// 데이터 검증 헬퍼
Utils.validate = {
    email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    number(value, min = -Infinity, max = Infinity) {
        const num = Number(value);
        return !isNaN(num) && num >= min && num <= max;
    },
    required(value) {
        return value !== null && value !== undefined && value !== '';
    },
    minLength(value, length) {
        return String(value).length >= length;
    }
};

// 브라우저 기능 감지
Utils.features = {
    webgl: (() => {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
        } catch (e) {
            return false;
        }
    })(),
    fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
    localStorage: (() => {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    })(),
    touchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
};