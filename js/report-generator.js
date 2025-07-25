/**
 * 리포트 생성기 모듈 - PDF 및 QR 코드 생성 전담 (최적화된 버전)
 */
export class ReportGenerator extends EventTarget {
    constructor() {
        super();
        this.reportData = null;
    }

    /**
     * PDF 리포트 생성
     */
    generatePDFReport(measurements, fileName, sceneManager, activeCamera) {
        if (!measurements || Object.keys(measurements).length === 0) {
            this.dispatchEvent(new CustomEvent('reportError', {
                detail: { message: '측정 데이터가 없습니다. 먼저 3D 모델을 로드해주세요.' }
            }));
            return;
        }

        // jsPDF 라이브러리 확인
        if (typeof window.jspdf === 'undefined') {
            console.error('jsPDF 라이브러리가 로드되지 않았습니다.');
            this.dispatchEvent(new CustomEvent('reportError', {
                detail: { message: 'PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.' }
            }));
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // 제목
            doc.setFontSize(20);
            doc.text('3D Foot Analysis Report', 20, 30);

            // 파일 정보
            doc.setFontSize(12);
            doc.text(`File: ${fileName}`, 20, 50);
            doc.text(`Analysis Date: ${new Date().toLocaleDateString()}`, 20, 60);

            // 측정 데이터 섹션
            this.addMeasurementSection(doc, measurements, 80);

            // 비율 분석 섹션
            const ratiosYPos = this.addRatiosSection(doc, measurements, 160);

            // 발 유형 분석 섹션
            const analysisYPos = this.addAnalysisSection(doc, measurements, ratiosYPos + 40);

            // 추천 사항 섹션
            const recommendationsYPos = this.addRecommendationsSection(doc, measurements, analysisYPos + 40);

            // 3D 모델 이미지 추가
            this.add3DModelImage(doc, sceneManager, activeCamera, recommendationsYPos + 20);

            // PDF 저장
            const pdfFileName = `foot_analysis_${fileName.replace('.ply', '')}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(pdfFileName);

            console.log('📄 PDF 리포트 생성 완료:', pdfFileName);

            this.dispatchEvent(new CustomEvent('reportGenerated', {
                detail: { fileName: pdfFileName, type: 'pdf' }
            }));

        } catch (error) {
            console.error('❌ PDF 생성 오류:', error);
            this.dispatchEvent(new CustomEvent('reportError', {
                detail: { message: 'PDF 생성 중 오류가 발생했습니다.', error }
            }));
        }
    }

    /**
     * 측정 데이터 섹션 추가
     */
    addMeasurementSection(doc, measurements, yPos) {
        doc.setFontSize(16);
        doc.text('Measurement Data', 20, yPos);

        doc.setFontSize(12);
        const measurementTexts = [
            `Foot Length: ${measurements.length?.toFixed(1) || 'N/A'} ${measurements.unit || 'mm'}`,
            `Foot Width: ${measurements.width?.toFixed(1) || 'N/A'} ${measurements.unit || 'mm'}`,
            `Foot Height: ${measurements.height?.toFixed(1) || 'N/A'} ${measurements.unit || 'mm'}`,
            `Confidence: ${measurements.confidence || 'N/A'}`
        ];

        let currentY = yPos + 20;
        measurementTexts.forEach(text => {
            doc.text(text, 20, currentY);
            currentY += 15;
        });

        return currentY;
    }

    /**
     * 비율 분석 섹션 추가
     */
    addRatiosSection(doc, measurements, yPos) {
        doc.setFontSize(16);
        doc.text('Ratio Analysis', 20, yPos);

        doc.setFontSize(12);
        let currentY = yPos + 20;

        if (measurements.length && measurements.width) {
            const lwRatio = (measurements.length / measurements.width).toFixed(2);
            const hlRatio = (measurements.height / measurements.length * 100).toFixed(1);

            doc.text(`Length/Width Ratio: ${lwRatio}`, 20, currentY);
            doc.text(`Height/Length Ratio: ${hlRatio}%`, 20, currentY + 15);
            currentY += 30;
        }

        return currentY;
    }

    /**
     * 발 유형 분석 섹션 추가
     */
    addAnalysisSection(doc, measurements, yPos) {
        doc.setFontSize(16);
        doc.text('Foot Type Analysis', 20, yPos);

        doc.setFontSize(12);
        let currentY = yPos + 20;

        if (measurements.length && measurements.width) {
            const analysis = this.getFootTypeAnalysis(measurements);
            doc.text(`Foot Shape: ${analysis.footType}`, 20, currentY);
            doc.text(`Arch Type: ${analysis.archType}`, 20, currentY + 15);
            currentY += 30;
        }

        return currentY;
    }

    /**
     * 추천 사항 섹션 추가
     */
    addRecommendationsSection(doc, measurements, yPos) {
        doc.setFontSize(16);
        doc.text('Recommendations', 20, yPos);

        doc.setFontSize(10);
        let currentY = yPos + 20;

        const recommendations = this.getRecommendations(
            measurements.length / measurements.width || 2.4,
            measurements.height / measurements.length || 0.2
        );

        recommendations.forEach(rec => {
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }

            const englishRec = rec.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '').trim();
            if (englishRec.length > 0) {
                doc.text(`• ${englishRec}`, 20, currentY);
            } else {
                doc.text(`• Shoe recommendation based on foot analysis`, 20, currentY);
            }
            currentY += 12;
        });

        return currentY;
    }

    /**
     * 3D 모델 이미지 추가
     */
    add3DModelImage(doc, sceneManager, activeCamera, yPos) {
        try {
            const imageData = sceneManager.captureScreen(activeCamera);

            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(16);
            doc.text('3D Model View', 20, yPos);
            doc.addImage(imageData, 'JPEG', 20, yPos + 10, 160, 120);
        } catch (error) {
            console.warn('3D 모델 이미지 추가 실패:', error);
        }
    }

    /**
     * QR 코드 생성 (최적화된 버전)
     */
    generateQRCode(measurements, fileName) {
        // 측정 데이터 유효성 체크
        if (!measurements || Object.keys(measurements).length === 0) {
            this.dispatchEvent(new CustomEvent('qrError', {
                detail: { message: '측정 데이터가 없습니다. 먼저 3D 모델을 로드해주세요.' }
            }));
            return;
        }

        // QR 라이브러리 확인
        if (typeof window.QRCode === 'undefined') {
            console.error('QRCode 라이브러리가 로드되지 않았습니다.');
            this.dispatchEvent(new CustomEvent('qrError', {
                detail: { message: 'QR 코드 라이브러리를 로드하지 못했습니다. 스크립트 포함 여부를 확인하세요.' }
            }));
            return;
        }

        try {
            // 압축된 리포트 데이터 구성
            this.reportData = this.createCompactReportData(measurements, fileName);

            // 짧은 URL 생성 (압축)
            const shortURL = this.createShortMobileURL(this.reportData);
            console.log('🔗 QR용 압축 URL 생성:', shortURL);
            console.log('📏 URL 길이:', shortURL.length, '자');

            // QR 코드 생성 이벤트
            this.dispatchEvent(new CustomEvent('qrGenerated', {
                detail: {
                    url: shortURL,
                    reportData: this.reportData
                }
            }));

        } catch (error) {
            console.error('❌ QR 코드 생성 오류:', error);
            this.dispatchEvent(new CustomEvent('qrError', {
                detail: { message: 'QR 코드 생성 중 오류가 발생했습니다.', error }
            }));
        }
    }

    /**
     * 압축된 리포트 데이터 생성 (QR 코드 최적화)
     */
    createCompactReportData(measurements, fileName) {
        // 핵심 데이터만 압축하여 저장
        const compact = {
            f: fileName.substring(0, 30), // 파일명 20자로 제한
            d: new Date().toISOString().substring(0, 10), // 날짜만 (YYYY-MM-DD)
            m: {
                l: measurements.length ? Math.round(measurements.length * 10) / 10 : 0, // 소수점 1자리
                w: measurements.width ? Math.round(measurements.width * 10) / 10 : 0,
                h: measurements.height ? Math.round(measurements.height * 10) / 10 : 0,
                u: measurements.unit || 'mm'
            }
        };

        // 발 유형 간단히 인코딩
        if (measurements.length && measurements.width) {
            const lwRatio = measurements.length / measurements.width;
            if (lwRatio > 2.6) compact.t = 'L'; // Long
            else if (lwRatio < 2.2) compact.t = 'W'; // Wide
            else compact.t = 'N'; // Normal

            // 아치 타입
            const hlRatio = measurements.height / measurements.length;
            if (hlRatio > 0.25) compact.a = 'H'; // High
            else if (hlRatio < 0.18) compact.a = 'F'; // Flat
            else compact.a = 'N'; // Normal
        }

        return compact;
    }

    /**
     * 짧은 모바일 URL 생성 (최적화된 버전)
     */
    createShortMobileURL(compactData) {
        // 압축된 JSON을 base64로 인코딩 (더 짧게)
        const jsonString = JSON.stringify(compactData);
        const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

        const ipAddress = '192.000.00.00'; // 1단계에서 확인한 IP 주소를 여기에 입력하세요.
        const port = '5500'; // VS Code Live Server의 기본 포트입니다. 다른 경우 수정하세요.
        const shortURL = `http://${ipAddress}:${port}/mobile-report.html?data=${base64Data}`;

        console.log('📊 QR 데이터 압축 정보:', {
            original: JSON.stringify(this.createReportData(compactData, '')).length,
            compressed: jsonString.length,
            base64: base64Data.length,
            finalURL: shortURL.length
        });

        return shortURL;
    }

    /**
     * 기존 리포트 데이터 생성 (PDF용)
     */
    createReportData(measurements, fileName) {
        const len = measurements.length;
        const wid = measurements.width;
        const hei = measurements.height;

        return {
            fileName: fileName,
            analysisDate: new Date().toISOString(),
            measurements: {
                length: (typeof len === 'number') ? len.toFixed(1) : 'N/A',
                width: (typeof wid === 'number') ? wid.toFixed(1) : 'N/A',
                height: (typeof hei === 'number') ? hei.toFixed(1) : 'N/A',
                unit: measurements.unit || 'mm',
                confidence: measurements.confidence ?? 'N/A'
            },
            ratios: {
                lengthWidth: (len && wid) ? (len / wid).toFixed(2) : 'N/A',
                heightLength: (hei && len) ? ((hei / len) * 100).toFixed(1) + '%' : 'N/A'
            },
            analysis: this.getFootTypeAnalysis(measurements),
            recommendations: "standard"
        };
    }

    /**
     * 발 유형 분석 (영어)
     */
    getFootTypeAnalysis(measurements) {
        if (!measurements.length || !measurements.width || !measurements.height) {
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

    /**
     * 추천 사항 생성 (영어)
     */
    getRecommendations(lwRatio, hlRatio) {
        const recommendations = [];

        // 길이/너비 비율 기반 추천
        if (lwRatio > 2.6) {
            recommendations.push('Choose shoes with spacious toe box for comfort');
            recommendations.push('Consider regular or wide width fittings');
        } else if (lwRatio < 2.2) {
            recommendations.push('Look for wide-fitting shoes to accommodate broad forefoot');
            recommendations.push('Avoid shoes with narrow or pointed toe designs');
        } else {
            recommendations.push('Standard width shoes should fit comfortably');
            recommendations.push('Most regular shoe designs will work well');
        }

        // 아치 높이 기반 추천
        if (hlRatio > 0.25) {
            recommendations.push('Use insoles with strong arch support');
            recommendations.push('Choose shoes with excellent shock absorption');
            recommendations.push('Look for shoes with good lateral stability');
        } else if (hlRatio < 0.18) {
            recommendations.push('Consider motion control shoes for overpronation');
            recommendations.push('Look for shoes with firm heel counters');
            recommendations.push('Avoid shoes with excessive cushioning');
        } else {
            recommendations.push('Regular running or walking shoes are suitable');
            recommendations.push('Choose shoes with moderate cushioning and stability');
        }

        return recommendations;
    }

    /**
     * 현재 리포트 데이터 반환
     */
    getReportData() {
        return this.reportData;
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        this.reportData = null;
        console.log('🧹 Report Generator 정리 완료');
    }
}