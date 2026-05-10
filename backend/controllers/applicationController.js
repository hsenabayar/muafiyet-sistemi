const db = require('../config/db');

/**
 * YARDIMCI FONKSİYONLAR
 */

// Harf notunu 4'lük sisteme çevirir (Hocanın ağırlıklı ortalama formülü için)
const getGradeValue = (grade) => {
    const values = { 'AA': 4.0, 'BA': 3.5, 'BB': 3.0, 'CB': 2.5, 'CC': 2.0, 'DC': 1.5, 'DD': 1.0, 'FF': 0.0 };
    return values[grade.toUpperCase()] || 0.0;
};

// Hesaplanan sayısal notu en yakın harf notuna yuvarlar (Hocaya öneri sunmak için)
const getSuggestedGrade = (score) => {
    if (score >= 3.75) return 'AA';
    if (score >= 3.25) return 'BA';
    if (score >= 2.75) return 'BB';
    if (score >= 2.25) return 'CB';
    if (score >= 1.75) return 'CC';
    if (score >= 1.25) return 'DC';
    if (score >= 0.75) return 'DD';
    return 'FF';
};

/**
 * CONTROLLER FONKSİYONLARI
 */

// 📄 Yeni Muafiyet Başvurusu Oluştur
exports.createApplication = async (req, res) => {
    const { 
        sourceUniversity, 
        sourceFaculty, 
        sourceDepartment, 
        academicYear, 
        semester,
        exemptionReason, 
        intakeNote 
    } = req.body;
    
    const userId = req.user.id; 

    try {
        const newApp = await db.query(
            `INSERT INTO Applications 
            (UserID, SourceUniversity, SourceFaculty, SourceDepartment, AcademicYear, Semester, Status, ExemptionReason, IntakeNote) 
             VALUES ($1, $2, $3, $4, $5, $6, 'Taslak', $7, $8) RETURNING ApplicationID`,
            [userId, sourceUniversity, sourceFaculty, sourceDepartment, academicYear, semester, exemptionReason, intakeNote]
        );

        res.status(201).json({
            status: "success",
            applicationId: newApp.rows[0].applicationid,
            message: "Başvuru taslağı oluşturuldu."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

// 📚 Ders Eşleştirmesi Ekle (N:1 Mantığı, Ortalama Hesabı ve GRUP KISITLAMASI)
exports.addCourseMapping = async (req, res) => {
    const { applicationId, externalCourses, targetCourseId } = req.body;

    try {
        // 1. Hedef dersin bilgilerini çek
        const targetResult = await db.query(
            `SELECT akts, coursetype, coursename FROM curriculum WHERE courseid = $1`, 
            [targetCourseId]
        );
        
        if (targetResult.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Hedef ders bulunamadı." });
        }
        
        const targetAKTS = targetResult.rows[0].akts;
        const courseGroup = targetResult.rows[0].coursetype;

        // 2. GRUP KISITLAMASI KONTROLÜ (Kritik Nokta)
        const restrictedGroups = ['SSD', 'TS6', 'SSD1', 'SSD2', 'BİLSEÇ-9']; 
        
        if (courseGroup && restrictedGroups.includes(courseGroup)) {
            const alreadyExists = await db.query(
                `SELECT c.CourseName 
                 FROM ExemptionDecisions ed
                 JOIN curriculum c ON ed.TargetCourseID = c.courseid
                 WHERE ed.ApplicationID = $1 AND c.coursetype = $2`, 
                [applicationId, courseGroup]
            );

            if (alreadyExists.rows.length > 0) {
                // Eğer burada kayıt varsa, işlemi burada kesip hata döner
                return res.status(400).json({ 
                    status: "error", 
                    message: `${courseGroup} grubundan zaten bir ders seçtiniz (${alreadyExists.rows[0].coursename}).` 
                });
            }
        }

        // --- 3. AĞIRLIKLI ORTALAMA HESAPLA (Hocanın İstediği Formül) ---
        let totalWeightedScore = 0;
        let totalSourceAKTS = 0;

        for (let course of externalCourses) {
            const gradeValue = course.numericGrade || getGradeValue(course.grade);
            totalWeightedScore += (gradeValue * course.akts);
            totalSourceAKTS += course.akts;
        }

        const calculatedAverage = totalSourceAKTS > 0 ? (totalWeightedScore / totalSourceAKTS) : 0;
        const suggestedGrade = getSuggestedGrade(calculatedAverage);

        // --- 4. ANA KARAR KAYDINI OLUŞTUR ---
        const decision = await db.query(
            `INSERT INTO ExemptionDecisions 
            (ApplicationID, TargetCourseID, IsApproved, SuggestedGrade, CalculatedScore) 
             VALUES ($1, $2, NULL, $3, $4) RETURNING DecisionID`,
            [applicationId, targetCourseId, suggestedGrade, calculatedAverage.toFixed(2)]
        );
        const decisionId = decision.rows[0].decisionid;

        // --- 5. DIŞ DERSLERİ VE DETAYLARI KAYDET ---
        for (let course of externalCourses) {
            const extRes = await db.query(
                `INSERT INTO ExternalCourses 
                (ApplicationID, CourseCode, CourseName, Grade, SourceAKTS, NumericGrade, SourceCredit) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ExtCourseID`,
                [applicationId, course.code, course.name, course.grade, course.akts, course.numericGrade, course.sourceCredit]
            );
            
            await db.query(
                `INSERT INTO DecisionDetails (DecisionID, ExtCourseID) VALUES ($1, $2)`,
                [decisionId, extRes.rows[0].extcourseid]
            );
        }

        // --- 6. HOCA İÇİN AKILLI UYARILAR ---
        let warnings = [];
        if (totalSourceAKTS < targetAKTS) {
            warnings.push(`Kredi Uyarısı: Gelen derslerin toplam AKTS'si (${totalSourceAKTS}), müfredattaki dersten (${targetAKTS}) düşüktür.`);
        }

        res.json({ 
            status: "success", 
            message: "Eşleştirme kaydedildi. Hoca onayı bekleniyor.",
            analysis: {
                calculatedScore: calculatedAverage.toFixed(2),
                suggestedGrade: suggestedGrade,
                totalSourceAKTS: totalSourceAKTS,
                targetAKTS: targetAKTS,
                warnings: warnings
            }
        });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

// 👨‍🏫 Hoca Kararını Uygula (Onay/Red ve Not Güncelleme)
exports.finalizeDecision = async (req, res) => {
    const { decisionId, isApproved, finalGrade, reviewNote } = req.body;

    try {
        await db.query(
            `UPDATE ExemptionDecisions 
             SET IsApproved = $1, FinalGrade = $2, ReviewNote = $3, ReviewDate = NOW()
             WHERE DecisionID = $4`,
            [isApproved, finalGrade, reviewNote, decisionId]
        );

        res.json({ status: "success", message: "Karar başarıyla kaydedildi." });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

// 📋 Başvurunun Tüm Detaylarını Getir (Hoca Ekranı İçin)
exports.getApplicationSummaryForExcel = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT 
                c.CourseCode as "Ders Kodu",
                c.CourseName as "Ders Adı",
                ed.SuggestedGrade as "Sistem Notu",
                ed.CalculatedScore as "Ortalama",
                string_agg(ec.CourseName, ' + ') as "Muafiyet Kaynağı"
             FROM ExemptionDecisions ed
             JOIN curriculum c ON ed.TargetCourseID = c.courseid
             JOIN DecisionDetails dd ON ed.DecisionID = dd.DecisionID
             JOIN ExternalCourses ec ON dd.ExtCourseID = ec.ExtCourseID
             WHERE ed.ApplicationID = $1
             GROUP BY ed.DecisionID, c.CourseCode, c.CourseName, ed.SuggestedGrade, ed.CalculatedScore`,
            [id]
        );
        res.json({ status: "success", copyPasteFriendlyData: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const PDFDocument = require('pdfkit');

// 📄 Resmi Muafiyet Formu (PDF) Oluştur
// 📄 Resmi OMÜ Formatında Muafiyet Formu (PDF) Oluştur
exports.generatePDF = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Veri Çekme (userid ve fullname üzerinden)
        const appInfo = await db.query(
            `SELECT a.*, u.fullname, u.tckimlikno, u.studentnumber 
             FROM Applications a 
             JOIN Users u ON a.userid = u.userid WHERE a.applicationid = $1`, [id]
        );

        // Sadece onaylanan dersleri, hem dış hem iç ders bilgileriyle çekiyoruz
        const decisions = await db.query(
            `SELECT ed.finalgrade, ed.reviewnote, 
                    c.coursecode as target_code, c.coursename as target_name, c.akts as target_akts,
                    string_agg(ec.coursename || ' (' || ec.grade || ')', ' + ') as source_details,
                    sum(ec.sourceakts) as source_total_akts
             FROM ExemptionDecisions ed
             JOIN curriculum c ON ed.TargetCourseID = c.courseid
             JOIN DecisionDetails dd ON ed.DecisionID = dd.DecisionID
             JOIN ExternalCourses ec ON dd.ExtCourseID = ec.ExtCourseID
             WHERE ed.ApplicationID = $1 AND ed.IsApproved = true
             GROUP BY ed.decisionid, c.coursecode, c.coursename, c.akts, ed.finalgrade, ed.reviewnote`, [id]
        );

        if (appInfo.rows.length === 0) return res.status(404).send("Başvuru bulunamadı.");

        const app = appInfo.rows[0];
        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=OMU_Muafiyet_Formu_${id}.pdf`);
        doc.pipe(res);

        // --- PDF TASARIMI (PP1.2.FR.0041 STANDARDI) ---

        // Üst Başlık ve Logo Alanı
        doc.fontSize(10).text('T.C.', { align: 'center' });
        doc.fontSize(12).text('ONDOKUZ MAYIS ÜNİVERSİTESİ', { align: 'center', weight: 'bold' });
        doc.fontSize(12).text('DERS MUAFİYET BAŞVURU FORMU', { align: 'center', weight: 'bold' });
        doc.fontSize(7).text('Form No: PP1.2.FR.0041', { align: 'right' });
        doc.moveDown();

        // Öğrenci Bilgileri Tablosu (Görsel 33'teki yapı)
        const startY = 100;
        doc.rect(30, startY, 535, 50).stroke(); // Çerçeve
        doc.fontSize(9);
        doc.text(`Öğrenci No: ${app.studentnumber || '-'}`, 40, startY + 10);
        doc.text(`Fakülte: Mühendislik Fakültesi`, 250, startY + 10);
        doc.text(`Adı Soyadı: ${app.fullname}`, 40, startY + 25);
        doc.text(`Bölüm: Bilgisayar Mühendisliği Bölümü`, 250, startY + 25);
        doc.text(`T.C. Kimlik No: ${app.tckimlikno || '-'}`, 40, startY + 40);
        doc.text(`Muafiyet Gerekçesi: ${app.exemptionreason || 'Yatay Geçiş'}`, 250, startY + 40);
        
        doc.moveDown(3);

        // Karşılaştırmalı Muafiyet Tablosu Başlıkları
        const tableY = 170;
        doc.rect(30, tableY, 535, 20).fillAndStroke('#eeeeee', '#000000');
        doc.fillColor('#000000').fontSize(8);
        doc.text('GELDİĞİ KURUMDA ALDIĞI DERSLER', 40, tableY + 7);
        doc.text('OMU TRANSKRİPTİNE AKTARILACAK DERSLER', 300, tableY + 7);

        // Ders Listesi
        let currentY = tableY + 25;
        decisions.rows.forEach((row, i) => {
            // Satır Çizgisi
            doc.moveTo(30, currentY + 25).lineTo(565, currentY + 25).stroke('#cccccc');
            
            // Sol Taraf (Dış Ders)
            doc.fontSize(8).text(row.source_details, 40, currentY, { width: 240 });
            
            // Sağ Taraf (OMÜ Ders)
            doc.text(`[${row.target_code}] ${row.target_name}`, 300, currentY);
            doc.text(`Not: ${row.finalgrade} | AKTS: ${row.target_akts}`, 300, currentY + 10);

            currentY += 35;

            // Sayfa sonu kontrolü
            if (currentY > 650) { doc.addPage(); currentY = 50; }
        });

        // İntibak Notu
        doc.moveDown();
        doc.fontSize(9).text(`Not: ${app.intakenote || 'İntibakı ilgili sınıfa yapılacaktır.'}`, { oblique: true });

        // 4'lü Komisyon İmza Bloğu (Görsel 40'a göre)
        const footerY = 720;
        doc.fontSize(8);
        
        doc.text('Dr. Öğr. Üyesi İsmail İŞERİ', 40, footerY);
        doc.text('Komisyon Üyesi', 40, footerY + 10);

        doc.text('Dr. Öğr. Üyesi Gökhan KAYHAN', 170, footerY);
        doc.text('Komisyon Üyesi', 170, footerY + 10);

        doc.text('Dr. Öğr. Üyesi Erhan ERGÜN', 300, footerY);
        doc.text('Komisyon Başkanı', 300, footerY + 10);

        doc.text('Prof. Dr. Erdal KILIÇ', 440, footerY);
        doc.text('Bölüm Başkanı', 440, footerY + 10);

        doc.end();

    } catch (err) {
        res.status(500).send("PDF Oluşturma Hatası: " + err.message);
    }
};



exports.getCurriculumCourses = async (req, res) => {
    try {
        const courses = await db.query(
            `SELECT courseid, coursecode, coursename, akts, coursetype 
             FROM curriculum 
             ORDER BY semester, coursename ASC`
        );
        res.json({ status: "success", data: courses.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};