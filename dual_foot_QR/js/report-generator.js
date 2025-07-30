/**
 * 리포트 생성기 모듈 - 양발 PDF 및 QR 코드 생성 전담
 */
export class ReportGenerator extends EventTarget {
    constructor() {
        super();
        this.reportData = null;
    }

    /**
     * 양발 PDF 리포트 생성
     */
    generateDualFootPDFReport(leftMeasurements, rightMeasurements, leftFileName, rightFileName, sceneManager, activeCamera) {
        if (!leftMeasurements || !rightMeasurements || Object.keys(leftMeasurements).length === 0 || Object.keys(rightMeasurements).length === 0) {
            this.dispatchEvent(new CustomEvent('reportError', {
                detail: { message: '양발 측정 데이터가 없습니다. 먼저 양발 3D 모델을 로드해주세요.' }
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
            doc.text('Dual Foot 3D Analysis Report', 20, 30);

            // 파일 정보
            doc.setFontSize(12);
            doc.text(`Left Foot: ${leftFileName}`, 20, 50);
            doc.text(`Right Foot: ${rightFileName}`, 20, 60);
            doc.text(`Analysis Date: ${new Date().toLocaleDateString()}`, 20, 70);

            // 양발 측정 데이터 섹션
            this.addDualMeasurementSection(doc, leftMeasurements, rightMeasurements, 90);

            // 양발 비교 분석 섹션
            const comparisonYPos = this.addComparisonSection(doc, leftMeasurements, rightMeasurements, 160);

            // 양발 비율 분석 섹션
            const ratiosYPos = this.addDualRatiosSection(doc, leftMeasurements, rightMeasurements, comparisonYPos + 30);

            // 발 유형 분석 섹션
            const analysisYPos = this.addDualAnalysisSection(doc, leftMeasurements, rightMeasurements, ratiosYPos + 30);

            // 추천 사항 섹션
            const recommendationsYPos = this.addDualRecommendationsSection(doc, leftMeasurements, rightMeasurements, analysisYPos + 30);

            // 새 페이지 추가
            doc.addPage();

            // 3D 모델 이미지 추가
            this.addDual3DModelImage(doc, sceneManager, activeCamera, 20);

            // PDF 저장
            const pdfFileName = `dual_foot_analysis_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(pdfFileName);

            console.log('📄 양발 PDF 리포트 생성 완료:', pdfFileName);

            this.dispatchEvent(new CustomEvent('reportGenerated', {
                detail: { fileName: pdfFileName, type: 'dual-foot-pdf' }
            }));

        } catch (error) {
            console.error('❌ 양발 PDF 생성 오류:', error);
            this.dispatchEvent(new CustomEvent('reportError', {
                detail: { message: '양발 PDF 생성 중 오류가 발생했습니다.', error }
            }));
        }
    }

    /**
     * 발 유형 분석 (핵심 메서드)
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
     * 양발 측정 데이터 섹션 추가
     */
    addDualMeasurementSection(doc, leftMeasurements, rightMeasurements, yPos) {
        doc.setFontSize(16);
        doc.text('Dual Foot Measurement Data', 20, yPos);

        doc.setFontSize(10);
        let currentY = yPos + 15;

        // 왼발 데이터
        doc.setFontSize(12);
        doc.text('Left Foot Measurements:', 20, currentY);
        currentY += 10;
        doc.setFontSize(10);
        
        const leftTexts = [
            `Length: ${leftMeasurements.length?.toFixed(1) || 'N/A'} ${leftMeasurements.unit || 'mm'}`,
            `Width: ${leftMeasurements.width?.toFixed(1) || 'N/A'} ${leftMeasurements.unit || 'mm'}`,
            `Height: ${leftMeasurements.height?.toFixed(1) || 'N/A'} ${leftMeasurements.unit || 'mm'}`
        ];

        leftTexts.forEach(text => {
            doc.text(text, 25, currentY);
            currentY += 8;
        });

        currentY += 5;

        // 오른발 데이터
        doc.setFontSize(12);
        doc.text('Right Foot Measurements:', 20, currentY);
        currentY += 10;
        doc.setFontSize(10);
        
        const rightTexts = [
            `Length: ${rightMeasurements.length?.toFixed(1) || 'N/A'} ${rightMeasurements.unit || 'mm'}`,
            `Width: ${rightMeasurements.width?.toFixed(1) || 'N/A'} ${rightMeasurements.unit || 'mm'}`,
            `Height: ${rightMeasurements.height?.toFixed(1) || 'N/A'} ${rightMeasurements.unit || 'mm'}`
        ];

        rightTexts.forEach(text => {
            doc.text(text, 25, currentY);
            currentY += 8;
        });

        return currentY;
    }

    /**
     * 양발 비교 분석 섹션 추가
     */
    addComparisonSection(doc, leftMeasurements, rightMeasurements, yPos) {
        doc.setFontSize(16);
        doc.text('Bilateral Comparison Analysis', 20, yPos);

        doc.setFontSize(10);
        let currentY = yPos + 15;

        // 차이 계산
        const lengthDiff = Math.abs(leftMeasurements.length - rightMeasurements.length);
        const widthDiff = Math.abs(leftMeasurements.width - rightMeasurements.width);
        const heightDiff = Math.abs(leftMeasurements.height - rightMeasurements.height);

        // 대칭성 점수 계산
        const maxLength = Math.max(leftMeasurements.length, rightMeasurements.length);
        const maxWidth = Math.max(leftMeasurements.width, rightMeasurements.width);
        const maxHeight = Math.max(leftMeasurements.height, rightMeasurements.height);
        
        const lengthSymmetry = (1 - lengthDiff / maxLength) * 100;
        const widthSymmetry = (1 - widthDiff / maxWidth) * 100;
        const heightSymmetry = (1 - heightDiff / maxHeight) * 100;
        const overallSymmetry = Math.round((lengthSymmetry + widthSymmetry + heightSymmetry) / 3);

        const comparisonTexts = [
            `Length Difference: ${lengthDiff.toFixed(1)} mm`,
            `Width Difference: ${widthDiff.toFixed(1)} mm`,
            `Height Difference: ${heightDiff.toFixed(1)} mm`,
            `Overall Symmetry Score: ${overallSymmetry}%`
        ];

        comparisonTexts.forEach(text => {
            doc.text(text, 20, currentY);
            currentY += 10;
        });

        // 대칭성 평가
        let symmetryEvaluation = '';
        if (overallSymmetry >= 90) {
            symmetryEvaluation = 'Excellent bilateral symmetry';
        } else if (overallSymmetry >= 80) {
            symmetryEvaluation = 'Good bilateral symmetry with minor differences';
        } else if (overallSymmetry >= 70) {
            symmetryEvaluation = 'Moderate asymmetry observed';
        } else {
            symmetryEvaluation = 'Significant asymmetry - professional consultation recommended';
        }

        currentY += 5;
        doc.setFontSize(12);
        doc.text('Symmetry Assessment:', 20, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.text(symmetryEvaluation, 20, currentY);
        currentY += 15;

        return currentY;
    }

    /**
     * 양발 비율 분석 섹션 추가
     */
    addDualRatiosSection(doc, leftMeasurements, rightMeasurements, yPos) {
        doc.setFontSize(16);
        doc.text('Bilateral Ratio Analysis', 20, yPos);

        doc.setFontSize(10);
        let currentY = yPos + 15;

        // 왼발 비율
        const leftLWRatio = (leftMeasurements.length / leftMeasurements.width).toFixed(2);
        const leftHLRatio = (leftMeasurements.height / leftMeasurements.length * 100).toFixed(1);

        // 오른발 비율
        const rightLWRatio = (rightMeasurements.length / rightMeasurements.width).toFixed(2);
        const rightHLRatio = (rightMeasurements.height / rightMeasurements.length * 100).toFixed(1);

        const ratioTexts = [
            `Left Foot L/W Ratio: ${leftLWRatio}`,
            `Left Foot H/L Ratio: ${leftHLRatio}%`,
            `Right Foot L/W Ratio: ${rightLWRatio}`,
            `Right Foot H/L Ratio: ${rightHLRatio}%`
        ];

        ratioTexts.forEach(text => {
            doc.text(text, 20, currentY);
            currentY += 10;
        });

        return currentY;
    }

    /**
     * 양발 발 유형 분석 섹션 추가
     */
    addDualAnalysisSection(doc, leftMeasurements, rightMeasurements, yPos) {
        doc.setFontSize(16);
        doc.text('Bilateral Foot Type Analysis', 20, yPos);

        doc.setFontSize(10);
        let currentY = yPos + 15;

        // 왼발 분석
        const leftAnalysis = this.getFootTypeAnalysis(leftMeasurements);
        // 오른발 분석
        const rightAnalysis = this.getFootTypeAnalysis(rightMeasurements);

        doc.setFontSize(12);
        doc.text('Left Foot Analysis:', 20, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.text(`Foot Shape: ${leftAnalysis.footType}`, 25, currentY);
        currentY += 8;
        doc.text(`Arch Type: ${leftAnalysis.archType}`, 25, currentY);
        currentY += 15;

        doc.setFontSize(12);
        doc.text('Right Foot Analysis:', 20, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.text(`Foot Shape: ${rightAnalysis.footType}`, 25, currentY);
        currentY += 8;
        doc.text(`Arch Type: ${rightAnalysis.archType}`, 25, currentY);
        currentY += 15;

        return currentY;
    }

    /**
     * 양발 추천 사항 섹션 추가
     */
    addDualRecommendationsSection(doc, leftMeasurements, rightMeasurements, yPos) {
        doc.setFontSize(16);
        doc.text('Bilateral Recommendations', 20, yPos);

        doc.setFontSize(10);
        let currentY = yPos + 15;

        const recommendations = this.getDualFootRecommendations(leftMeasurements, rightMeasurements);

        recommendations.forEach(rec => {
            if (currentY > 260) {
                doc.addPage();
                currentY = 20;
            }
            doc.text(`• ${rec}`, 20, currentY);
            currentY += 10;
        });

        return currentY;
    }

    /**
     * 양발 3D 모델 이미지 추가
     */
    addDual3DModelImage(doc, sceneManager, activeCamera, yPos) {
        try {
            // 양발 뷰로 설정
            sceneManager.setFootVisibility('both');
            
            const imageData = sceneManager.captureScreen(activeCamera);

            doc.setFontSize(16);
            doc.text('3D Dual Foot Model View', 20, yPos);
            doc.addImage(imageData, 'JPEG', 20, yPos + 10, 160, 120);
            
            // 개별 발 이미지도 추가
            yPos += 140;
            
            // 왼발만 표시
            sceneManager.setFootVisibility('left');
            const leftImageData = sceneManager.captureScreen(activeCamera);
            
            doc.setFontSize(12);
            doc.text('Left Foot', 20, yPos);
            doc.addImage(leftImageData, 'JPEG', 20, yPos + 5, 75, 60);
            
            // 오른발만 표시
            sceneManager.setFootVisibility('right');
            const rightImageData = sceneManager.captureScreen(activeCamera);
            
            doc.text('Right Foot', 110, yPos);
            doc.addImage(rightImageData, 'JPEG', 110, yPos + 5, 75, 60);
            
            // 다시 양발 표시로 복원
            sceneManager.setFootVisibility('both');
            
        } catch (error) {
            console.warn('양발 3D 모델 이미지 추가 실패:', error);
        }
    }

    /**
     * 양발 추천 사항 생성
     */
    getDualFootRecommendations(leftMeasurements, rightMeasurements) {
        const recommendations = [];

        // 왼발 분석
        const leftLWRatio = leftMeasurements.length / leftMeasurements.width;
        const leftHLRatio = leftMeasurements.height / leftMeasurements.length;

        // 오른발 분석
        const rightLWRatio = rightMeasurements.length / rightMeasurements.width;
        const rightHLRatio = rightMeasurements.height / rightMeasurements.length;

        // 평균 비율
        const avgLWRatio = (leftLWRatio + rightLWRatio) / 2;
        const avgHLRatio = (leftHLRatio + rightHLRatio) / 2;

        // 대칭성 분석
        const lengthDiff = Math.abs(leftMeasurements.length - rightMeasurements.length);
        const widthDiff = Math.abs(leftMeasurements.width - rightMeasurements.width);
        const heightDiff = Math.abs(leftMeasurements.height - rightMeasurements.height);

        // 대칭성 기반 추천
        if (lengthDiff > 5) {
            recommendations.push('Significant length difference detected - consider custom insoles for length compensation');
        }
        if (widthDiff > 3) {
            recommendations.push('Width asymmetry observed - wide-fitting shoes recommended for comfort');
        }
        if (heightDiff > 4) {
            recommendations.push('Height difference noted - arch support may help balance foot function');
        }

        // 평균 발 형태 기반 추천
        if (avgLWRatio > 2.6) {
            recommendations.push('Both feet show elongated shape - choose shoes with spacious toe boxes');
            recommendations.push('Regular or wide width fittings recommended for optimal comfort');
        } else if (avgLWRatio < 2.2) {
            recommendations.push('Both feet exhibit wider shape - wide-fitting shoes essential');
            recommendations.push('Avoid shoes with narrow or pointed toe designs');
        } else {
            recommendations.push('Both feet show normal proportions - standard width shoes suitable');
            recommendations.push('Most regular shoe designs should accommodate both feet well');
        }

        // 평균 아치 높이 기반 추천
        if (avgHLRatio > 0.25) {
            recommendations.push('High arch structure detected in both feet - strong arch support recommended');
            recommendations.push('Choose shoes with excellent shock absorption capabilities');
            recommendations.push('Look for shoes with good lateral stability features');
        } else if (avgHLRatio < 0.18) {
            recommendations.push('Lower arch profile observed - motion control shoes may benefit both feet');
            recommendations.push('Firm heel counters recommended for enhanced stability');
            recommendations.push('Avoid excessive cushioning that may compromise support');
        } else {
            recommendations.push('Normal arch height in both feet - regular athletic shoes appropriate');
            recommendations.push('Moderate cushioning and stability features recommended');
        }

        // 양발 특화 추천
        const maxLengthDiff = Math.max(lengthDiff, widthDiff, heightDiff);
        if (maxLengthDiff < 2) {
            recommendations.push('Excellent bilateral symmetry - standard shoe fitting approach suitable');
        } else if (maxLengthDiff > 5) {
            recommendations.push('Consider professional fitting consultation due to bilateral differences');
            recommendations.push('Custom orthotics may provide optimal support for both feet');
        }

        // 전반적인 발 건강 추천
        recommendations.push('Regular foot exercises recommended to maintain flexibility and strength');
        recommendations.push('Monitor both feet for any changes during regular self-examinations');

        return recommendations;
    }

    /**
     * QR 코드 생성 (양발 지원)
     */
    generateQRCode(combinedMeasurements, fileName) {
        // 측정 데이터 유효성 체크
        if (!combinedMeasurements || Object.keys(combinedMeasurements).length === 0) {
            this.dispatchEvent(new CustomEvent('qrError', {
                detail: { message: '측정 데이터가 없습니다. 먼저 양발 3D 모델을 로드해주세요.' }
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
            // 압축된 리포트 데이터 구성 (양발 평균 사용)
            this.reportData = this.createCompactReportData(combinedMeasurements, fileName);

            // 짧은 URL 생성 (압축)
            const shortURL = this.createShortMobileURL(this.reportData);
            console.log('🔗 양발 QR용 압축 URL 생성:', shortURL);
            console.log('📏 URL 길이:', shortURL.length, '자');

            // QR 코드 생성 이벤트
            this.dispatchEvent(new CustomEvent('qrGenerated', {
                detail: {
                    url: shortURL,
                    reportData: this.reportData
                }
            }));

        } catch (error) {
            console.error('❌ 양발 QR 코드 생성 오류:', error);
            this.dispatchEvent(new CustomEvent('qrError', {
                detail: { message: '양발 QR 코드 생성 중 오류가 발생했습니다.', error }
            }));
        }
    }

    /**
     * 압축된 리포트 데이터 생성 (양발 지원)
     */
    createCompactReportData(measurements, fileName) {
        // 핵심 데이터만 압축하여 저장 (양발 평균 또는 개별 데이터)
        const compact = {
            f: fileName.substring(0, 30),
            d: new Date().toISOString().substring(0, 10),
            m: {
                l: measurements.length ? Math.round(measurements.length * 10) / 10 : 0,
                w: measurements.width ? Math.round(measurements.width * 10) / 10 : 0,
                h: measurements.height ? Math.round(measurements.height * 10) / 10 : 0,
                u: measurements.unit || 'mm'
            },
            type: 'dual' // 양발 분석임을 표시
        };

        // 양발 개별 데이터가 있으면 추가
        if (measurements.leftFoot && measurements.rightFoot) {
            compact.lf = {
                l: Math.round(measurements.leftFoot.length * 10) / 10,
                w: Math.round(measurements.leftFoot.width * 10) / 10,
                h: Math.round(measurements.leftFoot.height * 10) / 10
            };
            compact.rf = {
                l: Math.round(measurements.rightFoot.length * 10) / 10,
                w: Math.round(measurements.rightFoot.width * 10) / 10,
                h: Math.round(measurements.rightFoot.height * 10) / 10
            };
        }

        // 발 유형 간단히 인코딩 (평균값 기준)
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
     * 짧은 모바일 URL 생성 (양발 지원)
     */
    createShortMobileURL(compactData) {
        // 압축된 JSON을 base64로 인코딩
        const jsonString = JSON.stringify(compactData);
        const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

        const ipAddress = '192.000.00.00'; // 실제 IP 주소로 변경 필요
        const port = '5500';
        const shortURL = `http://${ipAddress}:${port}/mobile-report.html?data=${base64Data}`;

        console.log('📊 양발 QR 데이터 압축 정보:', {
            original: JSON.stringify(this.createReportData(compactData, '')).length,
            compressed: jsonString.length,
            base64: base64Data.length,
            finalURL: shortURL.length
        });

        return shortURL;
    }

    /**
     * 리포트 데이터 생성 (호환성 유지)
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
            recommendations: "dual-foot-analysis"
        };
    }

    /**
     * 정리 (메모리 해제)
     */
    dispose() {
        this.reportData = null;
        console.log('🧹 Report Generator (양발 지원) 정리 완료');
    }
}