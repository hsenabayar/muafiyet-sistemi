const db = require('../config/db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');


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

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const uniqueName = Date.now() + '-' + originalName;
        cb(null, uniqueName);
    }
});

exports.upload = multer({ storage });

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
        intakeNote,

        studentNo,
        studentName,
        tcNo,
        faculty,
        department,
        program
    } = req.body;

    console.log("Başvuru oluşturma body:", req.body);

    const userId = req.user.id;

    try {
        const newApp = await db.query(
            `INSERT INTO Applications 
    (
        UserID,
        SourceUniversity,
        SourceFaculty,
        SourceDepartment,
        AcademicYear,
        Semester,
        Status,
        ExemptionReason,
        IntakeNote,
        StudentNo,
        StudentName,
        TcNo,
        Faculty,
        Department,
        Program
    ) 
    VALUES 
    ($1, $2, $3, $4, $5, $6, 'Komisyona Gönderildi', $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING ApplicationID`,
            [
                userId,
                sourceUniversity,
                sourceFaculty,
                sourceDepartment,
                academicYear,
                semester,
                exemptionReason,
                intakeNote,
                studentNo,
                studentName,
                tcNo,
                faculty,
                department,
                program
            ]
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
            `SELECT 
                courseid,
                coursecode,
                coursename,
                localcredit,
                akts,
                semester,
                coursetype,
                prerequisitecode
             FROM curriculum 
             ORDER BY semester, coursename ASC`
        );

        res.json({ status: "success", data: courses.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};


// 👤 Öğrencinin Son Başvurusunu Getir
exports.getMyLatestApplication = async (req, res) => {
    const userId = req.user.id || req.user.userid || req.user.userId;
    console.log("my-latest req.user:", req.user);
    console.log("my-latest userId:", userId);

    try {
        const appResult = await db.query(
            `SELECT 
            a.*,
            u.fullname,
            u.studentnumber,
            u.tckimlikno
        FROM Applications a
        JOIN Users u ON a.UserID = u.UserID
        WHERE a.UserID = $1
        ORDER BY a.ApplicationID DESC
        LIMIT 1`,
            [userId]
        );

        if (appResult.rows.length === 0) {
            return res.json({
                status: "empty",
                message: "Öğrenciye ait başvuru bulunamadı."
            });
        }

        const application = appResult.rows[0];

        const decisionsResult = await db.query(
            `SELECT 
                ed.DecisionID,
                ed.TargetCourseID,
                c.CourseCode,
                c.CourseName,
                c.LocalCredit,
                c.AKTS,
                ed.SuggestedGrade,
                ed.FinalGrade,
                ed.IsApproved,
                ed.ReviewNote
             FROM ExemptionDecisions ed
             JOIN Curriculum c ON ed.TargetCourseID = c.CourseID
             WHERE ed.ApplicationID = $1
             ORDER BY ed.DecisionID ASC`,
            [application.applicationid]
        );

        const externalResult = await db.query(
            `SELECT 
        dd.DecisionID,
        ec.ExtCourseID,
        ec.CourseCode,
        ec.CourseName,
        ec.SourceCredit,
        ec.SourceAKTS,
        ec.Grade
     FROM DecisionDetails dd
     JOIN ExternalCourses ec ON dd.ExtCourseID = ec.ExtCourseID
     JOIN ExemptionDecisions ed ON dd.DecisionID = ed.DecisionID
     WHERE ed.ApplicationID = $1
     ORDER BY dd.DecisionID ASC`,
            [application.applicationid]
        );

        const mappings = decisionsResult.rows.map(decision => {
            const externalCourses = externalResult.rows
                .filter(ext => ext.decisionid === decision.decisionid)
                .map(ext => ({
                    extCourseId: ext.extcourseid,
                    code: ext.coursecode,
                    name: ext.coursename,
                    sourceCredit: ext.sourcecredit,
                    akts: ext.sourceakts,
                    grade: ext.grade
                }));

            return {
                targetCourseId: decision.targetcourseid,
                targetCourse: {
                    courseid: decision.targetcourseid,
                    coursecode: decision.coursecode,
                    coursename: decision.coursename,
                    localcredit: decision.localcredit,
                    akts: decision.akts
                },
                suggestedGrade: decision.suggestedgrade,
                finalGrade: decision.finalgrade,
                isApproved: decision.isapproved,
                reviewNote: decision.reviewnote,
                externalCourses
            };
        });


        const attachmentsResult = await db.query(
            `SELECT attachmentid, filetype, filename, filepath
     FROM Attachments
     WHERE ApplicationID = $1`,
            [application.applicationid]
        );

        res.json({
            status: "success",
            data: {
                application,
                mappings,
                attachments: attachmentsResult.rows
            }
        });

    } catch (err) {
        console.error("my-latest hata:", err.message);
        console.error(err);

        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};



exports.uploadDocuments = async (req, res) => {
    const { applicationId } = req.body;

    try {
        const files = req.files;

        const fileList = [
            { field: 'transcript', type: 'Transkript' },
            { field: 'curriculum', type: 'Müfredat ve Ders İçerikleri' },
            { field: 'internship', type: 'Staj Belgesi' }
        ];

        for (const item of fileList) {
            if (files[item.field]) {
                const file = files[item.field][0];

                await db.query(
                    `INSERT INTO Attachments 
                    (ApplicationID, FileType, FileName, FilePath)
                    VALUES ($1, $2, $3, $4)`,
                    [
                        applicationId,
                        item.type,
                        file.originalname,
                        file.path
                    ]
                );
            }
        }

        res.json({
            status: "success",
            message: "Belgeler başarıyla yüklendi."
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

exports.uploadDocuments = async (req, res) => {
    const { applicationId } = req.body;

    try {
        const files = req.files;

        const fileList = [
            { field: 'transcript', type: 'Transkript' },
            { field: 'curriculum', type: 'Müfredat ve Ders İçerikleri' },
            { field: 'internship', type: 'Staj Belgesi' }
        ];

        for (const item of fileList) {
            if (files[item.field]) {
                const file = files[item.field][0];

                await db.query(
                    `INSERT INTO Attachments 
    (ApplicationID, FileType, FileName, FilePath)
    VALUES ($1, $2, $3, $4)`,
                    [
                        applicationId,
                        item.type,
                        Buffer.from(file.originalname, 'latin1').toString('utf8'),
                        file.path
                    ]
                );
            }
        }

        res.json({ status: "success", message: "Belgeler yüklendi." });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.getApplicationsForCommission = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                ApplicationID,
                StudentNo,
                StudentName,
                Faculty,
                Department,
                Program,
                AcademicYear,
                Semester,
                ExemptionReason,
                SourceUniversity,
                Status
             FROM Applications
             ORDER BY ApplicationID DESC`
        );

        res.json({
            status: "success",
            data: result.rows
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

exports.getApplicationDetailForCommission = async (req, res) => {
    const { id } = req.params;

    try {
        const appResult = await db.query(
            `SELECT *
             FROM Applications
             WHERE ApplicationID = $1`,
            [id]
        );

        if (appResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Başvuru bulunamadı."
            });
        }

        const application = appResult.rows[0];

        const decisionsResult = await db.query(
            `SELECT 
                ed.DecisionID,
                ed.TargetCourseID,
                c.CourseCode,
                c.CourseName,
                c.LocalCredit,
                c.AKTS,
                ed.SuggestedGrade,
                ed.FinalGrade,
                ed.IsApproved,
                ed.ReviewNote
             FROM ExemptionDecisions ed
             LEFT JOIN Curriculum c ON ed.TargetCourseID = c.CourseID
             WHERE ed.ApplicationID = $1
             ORDER BY ed.DecisionID ASC`,
            [id]
        );

        const externalResult = await db.query(
            `SELECT 
        dd.DecisionID,
        ec.ExtCourseID,
        ec.CourseCode,
        ec.CourseName,
        ec.SourceCredit,
        ec.SourceAKTS,
        ec.Grade
     FROM DecisionDetails dd
     JOIN ExternalCourses ec ON dd.ExtCourseID = ec.ExtCourseID
     JOIN ExemptionDecisions ed ON dd.DecisionID = ed.DecisionID
     WHERE ed.ApplicationID = $1
     ORDER BY dd.DecisionID ASC`,
            [application.applicationid]
        );

        const attachmentsResult = await db.query(
            `SELECT attachmentid, filetype, filename, filepath
             FROM Attachments
             WHERE ApplicationID = $1`,
            [id]
        );

        const mappings = decisionsResult.rows.map(decision => {
            const externalCourses = externalResult.rows
                .filter(ext => ext.decisionid === decision.decisionid)
                .map(ext => ({
                    extCourseId: ext.extcourseid,
                    code: ext.coursecode,
                    name: ext.coursename,
                    sourceCredit: ext.sourcecredit,
                    akts: ext.sourceakts,
                    grade: ext.grade
                }));

            return {
                decisionId: decision.decisionid,
                targetCourseId: decision.targetcourseid,
                targetCourse: {
                    courseid: decision.targetcourseid,
                    coursecode: decision.coursecode,
                    coursename: decision.coursename,
                    localcredit: decision.localcredit,
                    akts: decision.akts
                },
                suggestedGrade: decision.suggestedgrade,
                finalGrade: decision.finalgrade,
                isApproved: decision.isapproved,
                reviewNote: decision.reviewnote,
                externalCourses
            };
        });

        res.json({
            status: "success",
            data: {
                application,
                mappings,
                attachments: attachmentsResult.rows
            }
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

exports.updateDecisionTargetCourse = async (req, res) => {
    const { decisionId, targetCourseId } = req.body;

    try {
        const decisionResult = await db.query(
            `SELECT ApplicationID
             FROM ExemptionDecisions
             WHERE DecisionID = $1`,
            [decisionId]
        );

        if (decisionResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Karar kaydı bulunamadı."
            });
        }

        const applicationId = decisionResult.rows[0].applicationid;

        await db.query(
            `UPDATE ExemptionDecisions
             SET TargetCourseID = $1,
                 IsApproved = NULL,
                 FinalGrade = NULL,
                 ReviewNote = NULL
             WHERE DecisionID = $2`,
            [targetCourseId, decisionId]
        );

        await db.query(
            `UPDATE Applications
             SET Status = 'Başvuru Sonuçlandı: Olumlu'
             WHERE ApplicationID = $1`,
            [applicationId]
        );

        res.json({
            status: "success",
            message: "Hedef OMÜ dersi güncellendi."
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

// 👨‍🏫 Komisyon: Aynı kaynak derslerle yeni OMÜ dersi ekle
exports.addExtraTargetCourseForDecision = async (req, res) => {
    const { decisionId, targetCourseId } = req.body;

    try {
        // 1. Mevcut kararın ApplicationID değerini bul
        const decisionResult = await db.query(
            `SELECT ApplicationID
             FROM ExemptionDecisions
             WHERE DecisionID = $1`,
            [decisionId]
        );

        if (decisionResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Mevcut karar kaydı bulunamadı."
            });
        }

        const applicationId = decisionResult.rows[0].applicationid;

        // 2. Mevcut karara bağlı kaynak dersleri bul
        const detailResult = await db.query(
            `SELECT ExtCourseID
             FROM DecisionDetails
             WHERE DecisionID = $1`,
            [decisionId]
        );

        if (detailResult.rows.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Bu karara bağlı kaynak ders bulunamadı."
            });
        }

        // 3. Yeni OMÜ dersi için yeni karar kaydı oluştur
        const newDecision = await db.query(
            `INSERT INTO ExemptionDecisions
             (ApplicationID, TargetCourseID, IsApproved, SuggestedGrade, CalculatedScore)
             SELECT ApplicationID, $1, NULL, SuggestedGrade, CalculatedScore
             FROM ExemptionDecisions
             WHERE DecisionID = $2
             RETURNING DecisionID`,
            [targetCourseId, decisionId]
        );

        const newDecisionId = newDecision.rows[0].decisionid;

        // 4. Aynı kaynak dersleri yeni karara bağla
        for (const detail of detailResult.rows) {
            await db.query(
                `INSERT INTO DecisionDetails
                 (DecisionID, ExtCourseID)
                 VALUES ($1, $2)`,
                [newDecisionId, detail.extcourseid]
            );
        }

        await db.query(
            `UPDATE Applications
     SET Status = 'Başvuru Sonuçlandı: Olumlu'
     WHERE ApplicationID = $1`,
            [applicationId]
        );

        res.json({
            status: "success",
            message: "Aynı kaynak derslerle yeni OMÜ dersi eklendi.",
            newDecisionId
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

// 👨‍🏫 Komisyon: Hedef OMÜ dersini sil
exports.deleteDecision = async (req, res) => {
    const { decisionId } = req.params;

    try {
        const decisionResult = await db.query(
            `SELECT ApplicationID
             FROM ExemptionDecisions
             WHERE DecisionID = $1`,
            [decisionId]
        );

        if (decisionResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Karar kaydı bulunamadı."
            });
        }

        const applicationId = decisionResult.rows[0].applicationid;

        // Kararı silmiyoruz, sadece hedef OMÜ dersini kaldırıyoruz
        await db.query(
            `UPDATE ExemptionDecisions
             SET TargetCourseID = NULL,
                 IsApproved = NULL,
                 FinalGrade = NULL,
                 ReviewNote = NULL
             WHERE DecisionID = $1`,
            [decisionId]
        );

        const remainingTargetCourses = await db.query(
            `SELECT COUNT(*) AS count
             FROM ExemptionDecisions
             WHERE ApplicationID = $1
             AND TargetCourseID IS NOT NULL`,
            [applicationId]
        );

        if (Number(remainingTargetCourses.rows[0].count) === 0) {
            await db.query(
                `UPDATE Applications
                 SET Status = 'Başvuru Sonuçlandı: Olumsuz'
                 WHERE ApplicationID = $1`,
                [applicationId]
            );
        }

        res.json({
            status: "success",
            message: "Hedef OMÜ dersi kaldırıldı, kaynak ders korundu."
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

// 👨‍🏫 Komisyon: Kaynak dersi sil
exports.deleteExternalCourseFromApplication = async (req, res) => {
    const { extCourseId } = req.params;

    try {
        const infoResult = await db.query(
            `SELECT 
                ec.ApplicationID,
                dd.DecisionID
             FROM ExternalCourses ec
             LEFT JOIN DecisionDetails dd ON ec.ExtCourseID = dd.ExtCourseID
             WHERE ec.ExtCourseID = $1`,
            [extCourseId]
        );

        if (infoResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Kaynak ders bulunamadı."
            });
        }

        const applicationId = infoResult.rows[0].applicationid;
        const affectedDecisionIds = infoResult.rows
            .map(row => row.decisionid)
            .filter(Boolean);

        await db.query(
            `DELETE FROM DecisionDetails
             WHERE ExtCourseID = $1`,
            [extCourseId]
        );

        await db.query(
            `DELETE FROM ExternalCourses
             WHERE ExtCourseID = $1`,
            [extCourseId]
        );

        for (const decisionId of affectedDecisionIds) {
            const detailCount = await db.query(
                `SELECT COUNT(*) AS count
                 FROM DecisionDetails
                 WHERE DecisionID = $1`,
                [decisionId]
            );

            if (Number(detailCount.rows[0].count) === 0) {
                await db.query(
                    `DELETE FROM ExemptionDecisions
                     WHERE DecisionID = $1`,
                    [decisionId]
                );
            }
        }

        const remainingTargetCourses = await db.query(
            `SELECT COUNT(*) AS count
             FROM ExemptionDecisions
             WHERE ApplicationID = $1
             AND TargetCourseID IS NOT NULL`,
            [applicationId]
        );

        if (Number(remainingTargetCourses.rows[0].count) === 0) {
            await db.query(
                `UPDATE Applications
                 SET Status = 'Başvuru Sonuçlandı: Olumsuz'
                 WHERE ApplicationID = $1`,
                [applicationId]
            );
        }

        res.json({
            status: "success",
            message: "Kaynak ders silindi."
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

// 👨‍🏫 Komisyon: Mevcut hedef OMÜ dersine yeni kaynak ders ekle
exports.addExternalCourseToDecision = async (req, res) => {
    const {
        applicationId,
        targetCourseId,
        code,
        name,
        sourceCredit,
        akts,
        grade
    } = req.body;

    try {
        if (!applicationId || !targetCourseId || !code || !name || !akts || !grade) {
            return res.status(400).json({
                status: "error",
                message: "Kaynak ders bilgileri eksik."
            });
        }

        // İlgili başvuruda bu hedef OMÜ dersine ait karar kaydını bul
        const decisionResult = await db.query(
            `SELECT DecisionID
             FROM ExemptionDecisions
             WHERE ApplicationID = $1 AND TargetCourseID = $2
             ORDER BY DecisionID DESC
             LIMIT 1`,
            [applicationId, targetCourseId]
        );

        if (decisionResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Bu hedef OMÜ dersi için karar kaydı bulunamadı."
            });
        }

        const decisionId = decisionResult.rows[0].decisionid;

        // Yeni kaynak dersi ekle
        const extResult = await db.query(
            `INSERT INTO ExternalCourses
             (ApplicationID, CourseCode, CourseName, Grade, SourceAKTS, SourceCredit)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING ExtCourseID`,
            [
                applicationId,
                code,
                name,
                grade,
                Number(akts),
                sourceCredit ? Number(sourceCredit) : null
            ]
        );

        const extCourseId = extResult.rows[0].extcourseid;

        // Kaynak dersi karar kaydına bağla
        await db.query(
            `INSERT INTO DecisionDetails
             (DecisionID, ExtCourseID)
             VALUES ($1, $2)`,
            [decisionId, extCourseId]
        );

        res.json({
            status: "success",
            message: "Kaynak ders başarıyla eklendi."
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};

exports.addCommissionCourseMapping = async (req, res) => {
    const { applicationId, targetCourseId, externalCourses } = req.body;

    try {
        if (!applicationId || !targetCourseId || !externalCourses || externalCourses.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Eşleştirme bilgileri eksik."
            });
        }

        let totalWeightedScore = 0;
        let totalSourceAKTS = 0;

        for (const course of externalCourses) {
            const gradeValue = getGradeValue(course.grade);
            totalWeightedScore += gradeValue * Number(course.akts);
            totalSourceAKTS += Number(course.akts);
        }

        const calculatedAverage =
            totalSourceAKTS > 0 ? totalWeightedScore / totalSourceAKTS : 0;

        const suggestedGrade = getSuggestedGrade(calculatedAverage);

        const decision = await db.query(
            `INSERT INTO ExemptionDecisions
             (ApplicationID, TargetCourseID, IsApproved, SuggestedGrade, CalculatedScore)
             VALUES ($1, $2, NULL, $3, $4)
             RETURNING DecisionID`,
            [applicationId, targetCourseId, suggestedGrade, calculatedAverage.toFixed(2)]
        );

        const decisionId = decision.rows[0].decisionid;

        for (const course of externalCourses) {
            const extRes = await db.query(
                `INSERT INTO ExternalCourses
                 (ApplicationID, CourseCode, CourseName, Grade, SourceAKTS, NumericGrade, SourceCredit)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING ExtCourseID`,
                [
                    applicationId,
                    course.code,
                    course.name,
                    course.grade,
                    Number(course.akts),
                    getGradeValue(course.grade),
                    course.sourceCredit ? Number(course.sourceCredit) : null
                ]
            );

            await db.query(
                `INSERT INTO DecisionDetails
                 (DecisionID, ExtCourseID)
                 VALUES ($1, $2)`,
                [decisionId, extRes.rows[0].extcourseid]
            );
        }

        await db.query(
            `UPDATE Applications
     SET Status = 'Başvuru Sonuçlandı: Olumlu'
     WHERE ApplicationID = $1`,
            [applicationId]
        );

        res.json({
            status: "success",
            message: "Yeni eşleşme satırı oluşturuldu."
        });

    } catch (err) {
        console.error("Yeni eşleşme ekleme hatası:", err);

        res.status(500).json({
            status: "error",
            message: err.message
        });
    }
};