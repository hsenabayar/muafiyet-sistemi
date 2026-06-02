const db = require('../config/db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');


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
             SET IsApproved = $1,
                 FinalGrade = $2,
                 ReviewNote = $3,
                 ReviewDate = NOW()
             WHERE DecisionID = $4`,
            [isApproved, finalGrade, reviewNote, decisionId]
        );

        await db.query(
            `UPDATE Applications
             SET Status = 'Başvuru Sonuçlandı: Olumlu'
             WHERE ApplicationID = $1`,
            [applicationId]
        );

        res.json({
            status: "success",
            message: "Karar başarıyla kaydedildi."
        });

    } catch (err) {
        res.status(500).json({
            status: "error",
            message: err.message
        });
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
        const appResult = await db.query(
            `SELECT *
             FROM Applications
             WHERE ApplicationID = $1`,
            [id]
        );

        if (appResult.rows.length === 0) {
            return res.status(404).send("Başvuru bulunamadı.");
        }

        const app = appResult.rows[0];

        const settingsResult = await db.query(
            `SELECT *
                FROM DepartmentSettings
                WHERE Faculty = $1 AND Department = $2
                ORDER BY SettingID DESC
                LIMIT 1`,
            [app.faculty, app.department]
        );

        const departmentSetting = settingsResult.rows[0] || {};

        const decisionsResult = await db.query(
            `SELECT 
                ed.DecisionID,
                ed.FinalGrade,
                c.CourseCode AS TargetCode,
                c.CourseName AS TargetName,
                c.LocalCredit AS TargetCredit,
                c.AKTS AS TargetAKTS
             FROM ExemptionDecisions ed
             JOIN Curriculum c ON ed.TargetCourseID = c.CourseID
             WHERE ed.ApplicationID = $1
             AND ed.TargetCourseID IS NOT NULL
             ORDER BY ed.DecisionID ASC`,
            [id]
        );

        const externalResult = await db.query(
            `SELECT 
                dd.DecisionID,
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
            [id]
        );

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 45 });

        const fontPath = path.join('C:', 'Windows', 'Fonts', 'arial.ttf');
        const boldFontPath = path.join('C:', 'Windows', 'Fonts', 'arialbd.ttf');

        doc.registerFont('TR', fontPath);
        doc.registerFont('TR-Bold', boldFontPath);

        doc.font('TR');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=ders_muafiyet_formu_${id}.pdf`
        );

        doc.pipe(res);

        const pageWidth = doc.page.width;
        const left = 45;
        const right = pageWidth - 45;

        const cell = (x, y, w, h, text, options = {}) => {
            doc.rect(x, y, w, h).stroke();

            if (options.bold) {
                doc.font('TR-Bold');
            } else {
                doc.font('TR');
            }

            doc.fontSize(options.fontSize || 8);

            doc.text(String(text || ''), x + 4, y + 5, {
                width: w - 8,
                align: options.align || 'left'
            });
        };

        // BAŞLIK
        doc.font('TR-Bold').fontSize(11).text('T.C.', 0, 35, { align: 'center' });
        doc.fontSize(13).text('ONDOKUZ MAYIS ÜNİVERSİTESİ', { align: 'center' });
        doc.fontSize(12).text('DERS MUAFİYET BAŞVURU FORMU', { align: 'center' });

        doc.font('TR').fontSize(7).text(
            'PP1.2.FR.0041, R0, Temmuz 2019',
            right - 120,
            35
        );

        let y = 95;

        // AKADEMİK YIL
        cell(left, y, 100, 22, 'Akademik Yıl', { bold: true });
        cell(left + 100, y, 180, 22, app.academicyear || '');
        cell(left + 280, y, 80, 22, 'Yarıyıl', { bold: true });
        cell(left + 360, y, right - left - 360, 22, app.semester || '');
        y += 35;

        // ÖĞRENCİ BİLGİLERİ
        doc.font('TR-Bold').fontSize(9).text('ÖĞRENCİ BİLGİLERİ', left, y, {
            width: right - left,
            align: 'center'
        });
        y += 15;

        cell(left, y, 95, 20, 'Öğrenci No', { bold: true });
        cell(left + 95, y, 190, 20, app.studentno || '');
        cell(left + 285, y, 115, 20, 'Fakülte/YO/MYO', { bold: true });
        cell(left + 400, y, right - left - 400, 20, app.faculty || '');
        y += 20;

        cell(left, y, 95, 20, 'Adı - Soyadı', { bold: true });
        cell(left + 95, y, 190, 20, app.studentname || '');
        cell(left + 285, y, 115, 20, 'Bölüm', { bold: true });
        cell(left + 400, y, right - left - 400, 20, app.department || '');
        y += 20;

        cell(left, y, 95, 20, 'T.C. Kimlik No', { bold: true });
        cell(left + 95, y, 190, 20, app.tcno || '');
        cell(left + 285, y, 115, 20, 'Program', { bold: true });
        cell(left + 400, y, right - left - 400, 20, app.program || '');
        y += 35;

        // MUAFİYET TALEBİ
        doc.font('TR-Bold').fontSize(9).text('MUAFİYET TALEBİ', left, y, {
            width: right - left,
            align: 'center'
        });
        y += 18;

        doc.font('TR').fontSize(8).text(
            'Önceki yıllarda okuduğum Yükseköğretim Kurumunda başarılı olduğum dersleri gösteren transkriptim ektedir.',
            left,
            y,
            {
                width: right - left,
                indent: 21
            }
        );
        y += 14;

        doc.text(
            'Aşağıda belirttiğim eşdeğer derslerden muaf olmak istiyorum.',
            left,
            y,
            { width: right - left }
        );
        y += 18;

        doc.text('Gereğini bilgilerinize arz ederim.', left + 21, y);

        y += 30;

        // DERS TABLOSU BAŞLIK

        const innerPadding = 10;
        const tableX = left + innerPadding;
        const tableW = right - left - (innerPadding * 2);


        const col = {
            sourceCode: 42,
            sourceName: 135,
            sourceCredit: 32,
            sourceAkts: 35,
            sourceGrade: 32,
            targetCode: 45,
            targetName: 135,
            targetCredit: 32,
            targetAkts: 32
        };


        const sourceTableW =
            col.sourceCode + col.sourceName + col.sourceCredit + col.sourceAkts + col.sourceGrade;

        const targetTableW =
            col.targetCode + col.targetName + col.targetCredit + col.targetAkts;

        const sourceX = {
            code: tableX,
            name: tableX + col.sourceCode,
            credit: tableX + col.sourceCode + col.sourceName,
            akts: tableX + col.sourceCode + col.sourceName + col.sourceCredit,
            grade: tableX + col.sourceCode + col.sourceName + col.sourceCredit + col.sourceAkts
        };

        const targetX = tableX + sourceTableW;

        const targetColX = {
            code: targetX,
            name: targetX + col.targetCode,
            credit: targetX + col.targetCode + col.targetName,
            akts: targetX + col.targetCode + col.targetName + col.targetCredit
        };

        cell(tableX, y, sourceTableW, 24, 'DAHA ÖNCE OKUDUĞU YÜKSEKÖĞRETİM KURUMUNDAKİ DERSLER', {
            bold: true,
            align: 'center',
            fontSize: 7
        });

        cell(tableX + sourceTableW, y, targetTableW, 24, 'OMÜ FAKÜLTE / YÜKSEKOKUL ALDIĞI EŞ DEĞER DERSLER', {
            bold: true,
            align: 'center',
            fontSize: 7
        });

        y += 24;

        cell(sourceX.code, y, col.sourceCode, 20, 'Kodu', { bold: true, fontSize: 7 });
        cell(sourceX.name, y, col.sourceName, 20, 'Dersin Adı', { bold: true, fontSize: 7 });
        cell(sourceX.credit, y, col.sourceCredit, 20, 'K', { bold: true, align: 'center', fontSize: 7 });
        cell(sourceX.akts, y, col.sourceAkts, 20, 'AKTS', { bold: true, align: 'center', fontSize: 7 });
        cell(sourceX.grade, y, col.sourceGrade, 20, 'Notu', { bold: true, align: 'center', fontSize: 7 });

        cell(targetColX.code, y, col.targetCode, 20, 'Kodu', { bold: true, fontSize: 7 });
        cell(targetColX.name, y, col.targetName, 20, 'Dersin Adı', { bold: true, fontSize: 7 });
        cell(targetColX.credit, y, col.targetCredit, 20, 'K', { bold: true, align: 'center', fontSize: 7 });
        cell(targetColX.akts, y, col.targetAkts, 20, 'AKTS', { bold: true, align: 'center', fontSize: 7 });

        y += 20;


        decisionsResult.rows.forEach(decision => {
            const externalCourses = externalResult.rows.filter(
                ext => ext.decisionid === decision.decisionid
            );

            externalCourses.forEach((ext, index) => {
                if (y > 690) {
                    doc.addPage();
                    y = 40;
                }

                const rowH = 28;

                cell(sourceX.code, y, col.sourceCode, rowH, ext.coursecode || '', { fontSize: 7 });
                cell(sourceX.name, y, col.sourceName, rowH, ext.coursename || '', { fontSize: 7 });
                cell(sourceX.credit, y, col.sourceCredit, rowH, ext.sourcecredit || '', { align: 'center', fontSize: 7 });
                cell(sourceX.akts, y, col.sourceAkts, rowH, ext.sourceakts || '', { align: 'center', fontSize: 7 });
                cell(sourceX.grade, y, col.sourceGrade, rowH, ext.grade || '', { align: 'center', fontSize: 7 });

                if (index === 0) {
                    cell(targetX, y, col.targetCode, rowH, decision.targetcode || '', { fontSize: 7 });
                    cell(targetX + col.targetCode, y, col.targetName, rowH, decision.targetname || '', { fontSize: 7 });
                    cell(targetX + col.targetCode + col.targetName, y, col.targetCredit, rowH, decision.targetcredit || '', { align: 'center', fontSize: 7 });
                    cell(targetX + col.targetCode + col.targetName + col.targetCredit, y, col.targetAkts, rowH, decision.targetakts || '', { align: 'center', fontSize: 7 });
                } else {
                    cell(targetColX.code, y, col.targetCode, rowH, '', { fontSize: 7 });
                    cell(targetColX.name, y, col.targetName, rowH, '', { fontSize: 7 });
                    cell(targetColX.credit, y, col.targetCredit, rowH, '', { align: 'center', fontSize: 7 });
                    cell(targetColX.akts, y, col.targetAkts, rowH, '', { align: 'center', fontSize: 7 });
                }

                y += rowH;
            });
        });

        y += 30;

        // EKLER
        doc.font('TR-Bold').fontSize(9).text('EKLER', left, y);
        y += 15;

        doc.font('TR').fontSize(8).text('☐ 1. Öğrencinin onaylı not durum belgesi/transkripti.', left, y);
        y += 13;
        doc.text('☐ 2. Onaylı müfredat ve ders içerikleri', left, y);
        y += 13;
        doc.text('☐ 3. Transkriptte yoksa staj durumunu gösteren belge.', left, y);
        y += 25;

        // AÇIKLAMALAR
        doc.font('TR-Bold').fontSize(9).text('AÇIKLAMALAR', left, y);
        y += 15;

        doc.font('TR').fontSize(8).text(
            'Muafiyet başvurusu dönem başından sonra gelen 3 hafta içinde yapılabilir. Bu süre sonrası yapılan başvurular kabul edilmez.',
            left,
            y,
            { width: right - left }
        );

        y += 45;



        const signatureY = y;
        const signatureW = 120;
        const gap = 10;

        const signatureBox = (x, name, title) => {
            doc.font('TR').fontSize(8);

            // İmza çizgisi
            doc.moveTo(x, signatureY, x + signatureW, signatureY).stroke();


            // Ad soyad
            doc.font('TR').fontSize(8).text(name, x, signatureY + 25, {
                width: signatureW,
                align: 'center'
            });

            // Görev
            doc.font('TR-Bold').fontSize(8).text(title, x, signatureY + 38, {
                width: signatureW,
                align: 'center'
            });
        };

        signatureBox(
            left,
            departmentSetting.commissionmember1 || '1. Üye',
            'Komisyon Üyesi'
        );

        signatureBox(
            left + signatureW + gap,
            departmentSetting.commissionmember2 || '2. Üye',
            'Komisyon Üyesi'
        );

        signatureBox(
            left + (signatureW + gap) * 2,
            departmentSetting.commissionpresident || 'Komisyon Başkanı',
            'Komisyon Başkanı'
        );

        signatureBox(
            left + (signatureW + gap) * 3,
            departmentSetting.departmenthead || 'Bölüm Başkanı',
            'Bölüm Başkanı'
        );

        doc.font('TR').fontSize(7).text('Sayfa 1 / 1', right - 60, 760);

        doc.end();

    } catch (err) {
        console.error("PDF oluşturma hatası:", err);
        res.status(500).send("PDF oluşturma hatası: " + err.message);
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
             ORDER BY coursecode ASC`
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
                        Buffer.from(file.originalname, 'latin1').toString('utf8'),
                        `uploads/${file.filename}`
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
        const userId = req.user.id || req.user.userid || req.user.userId;

        const userResult = await db.query(
            `SELECT Faculty, Department, Role
             FROM Users
             WHERE UserID = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Kullanıcı bulunamadı."
            });
        }

        const currentUser = userResult.rows[0];

        let result;

        // Öğrenci işleri isterse tüm başvuruları görebilir
        if (currentUser.role === 'commission') {
            result = await db.query(
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
        } else {
            // Bölüm yetkilisi sadece kendi fakülte/bölüm başvurularını görür
            result = await db.query(
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
                 WHERE Faculty = $1
                 AND Department = $2
                 ORDER BY ApplicationID DESC`,
                [currentUser.faculty, currentUser.department]
            );
        }

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

        // Kararı tamamen sil
        await db.query(
            `DELETE FROM ExemptionDecisions
             WHERE DecisionID = $1`,
            [decisionId]
        );

        // Başvuruda hedef OMÜ dersi kalmış mı kontrol et
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
        } else {
            await db.query(
                `UPDATE Applications
                 SET Status = 'Başvuru Sonuçlandı: Olumlu'
                 WHERE ApplicationID = $1`,
                [applicationId]
            );
        }

        res.json({
            status: "success",
            message: "Hedef OMÜ dersi başarıyla silindi."
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

// ======================================================
// ⚙️ ADMIN PANEL FONKSİYONLARI
// ======================================================

exports.getAdminStats = async (req, res) => {
    try {
        const usersByRole = await db.query(`
            SELECT Role, COUNT(*) AS count
            FROM Users
            GROUP BY Role
            ORDER BY Role
        `);

        const applicationsByStatus = await db.query(`
            SELECT Status, COUNT(*) AS count
            FROM Applications
            GROUP BY Status
            ORDER BY Status
        `);

        res.json({
            status: "success",
            data: {
                usersByRole: usersByRole.rows,
                applicationsByStatus: applicationsByStatus.rows
            }
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.getAdminUsers = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                UserID,
                Username,
                FullName,
                StudentNumber,
                TCKimlikNo,
                Role,
                Faculty,
                Department,
                IsActive
            FROM Users
            ORDER BY UserID DESC
        `);

        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.createUserByAdmin = async (req, res) => {
    const {
        username,
        password,
        fullname,
        role,
        studentNumber,
        tcKimlikNo,
        faculty,
        department
    } = req.body;

    const allowedRoles = ['student', 'teacher', 'commission', 'admin'];

    try {
        if (!username || !password || !fullname || !role) {
            return res.status(400).json({
                status: "error",
                message: "Kullanıcı adı, şifre, ad soyad ve rol zorunludur."
            });
        }

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                status: "error",
                message: "Geçersiz rol."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO Users
     (Username, PasswordHash, FullName, Role, StudentNumber, TCKimlikNo, Faculty, Department, IsActive)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
            [
                username,
                hashedPassword,
                fullname,
                role,
                studentNumber || null,
                tcKimlikNo || null,
                faculty || null,
                department || null
            ]
        );

        res.json({
            status: "success",
            message: "Kullanıcı oluşturuldu."
        });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.updateUserByAdmin = async (req, res) => {
    const { userId } = req.params;
    const {
        fullname,
        role,
        studentNumber,
        tcKimlikNo,
        faculty,
        department
    } = req.body;

    try {
        await db.query(
            `UPDATE Users
             SET FullName = $1,
                 Role = $2,
                 StudentNumber = $3,
                 TCKimlikNo = $4,
                 Faculty = $5,
                 Department = $6
             WHERE UserID = $7`,
            [
                fullname,
                role,
                studentNumber || null,
                tcKimlikNo || null,
                faculty || null,
                department || null,
                userId
            ]
        );

        res.json({
            status: "success",
            message: "Kullanıcı bilgileri güncellendi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.resetUserPasswordByAdmin = async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;

    try {
        if (!newPassword) {
            return res.status(400).json({
                status: "error",
                message: "Yeni şifre zorunludur."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            `UPDATE Users
             SET PasswordHash = $1
             WHERE UserID = $2`,
            [hashedPassword, userId]
        );

        res.json({
            status: "success",
            message: "Şifre sıfırlandı."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.changeUserStatusByAdmin = async (req, res) => {
    const { userId } = req.params;
    const { isActive } = req.body;

    try {
        await db.query(
            `UPDATE Users
             SET IsActive = $1
             WHERE UserID = $2`,
            [isActive, userId]
        );

        res.json({
            status: "success",
            message: "Kullanıcı durumu güncellendi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.deleteUserByAdmin = async (req, res) => {
    const { userId } = req.params;

    try {
        await db.query(
            `DELETE FROM Users
             WHERE UserID = $1`,
            [userId]
        );

        res.json({
            status: "success",
            message: "Kullanıcı silindi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.getAllApplicationsForAdmin = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
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
            ORDER BY ApplicationID DESC
        `);

        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.assignApplicationDepartmentByAdmin = async (req, res) => {
    const { applicationId } = req.params;
    const { faculty, department } = req.body;

    try {
        await db.query(
            `UPDATE Applications
             SET Faculty = $1,
                 Department = $2
             WHERE ApplicationID = $3`,
            [faculty, department, applicationId]
        );

        res.json({
            status: "success",
            message: "Başvuru ilgili bölüme yönlendirildi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.createCurriculumCourseByAdmin = async (req, res) => {
    const {
        courseCode,
        courseName,
        localCredit,
        akts,
        semester,
        courseType,
        prerequisiteCode
    } = req.body;

    try {
        await db.query(
            `INSERT INTO Curriculum
             (CourseCode, CourseName, LocalCredit, AKTS, Semester, CourseType, PrerequisiteCode)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                courseCode,
                courseName,
                localCredit === '' ? null : Number(localCredit),
                akts === '' ? null : Number(akts),
                semester === '' ? null : Number(semester),
                courseType || null,
                prerequisiteCode || null
            ]
        );

        res.json({
            status: "success",
            message: "Ders müfredata eklendi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.updateCurriculumCourseByAdmin = async (req, res) => {
    const { courseId } = req.params;
    const {
        courseCode,
        courseName,
        localCredit,
        akts,
        semester,
        courseType,
        prerequisiteCode
    } = req.body;

    try {
        await db.query(
            `UPDATE Curriculum
             SET CourseCode = $1,
                 CourseName = $2,
                 LocalCredit = $3,
                 AKTS = $4,
                 Semester = $5,
                 CourseType = $6,
                 PrerequisiteCode = $7
             WHERE CourseID = $8`,
            [
                courseCode,
                courseName,
                localCredit === '' ? null : Number(localCredit),
                akts === '' ? null : Number(akts),
                semester === '' ? null : Number(semester),
                courseType || null,
                prerequisiteCode || null,
                courseId
            ]
        );

        res.json({
            status: "success",
            message: "Ders güncellendi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.deleteCurriculumCourseByAdmin = async (req, res) => {
    const { courseId } = req.params;

    try {
        await db.query(
            `DELETE FROM Curriculum
             WHERE CourseID = $1`,
            [courseId]
        );

        res.json({
            status: "success",
            message: "Ders silindi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.getDepartmentSettings = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT *
            FROM DepartmentSettings
            ORDER BY Faculty, Department
        `);

        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.saveDepartmentSettings = async (req, res) => {
    const {
        faculty,
        department,
        commissionMember1,
        commissionMember2,
        commissionMember3,
        commissionPresident,
        departmentHead
    } = req.body;

    try {
        await db.query(
            `INSERT INTO DepartmentSettings
             (Faculty, Department, CommissionMember1, CommissionMember2, CommissionMember3, CommissionPresident, DepartmentHead)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                faculty,
                department,
                commissionMember1 || null,
                commissionMember2 || null,
                commissionMember3 || null,
                commissionPresident || null,
                departmentHead || null
            ]
        );

        res.json({
            status: "success",
            message: "Komisyon/imza ayarları kaydedildi."
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

exports.getApplicationDetailForAdmin = async (req, res) => {
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
            [id]
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
                    code: ext.coursecode,
                    name: ext.coursename,
                    sourceCredit: ext.sourcecredit,
                    akts: ext.sourceakts,
                    grade: ext.grade
                }));

            return {
                decisionId: decision.decisionid,
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

exports.updateDepartmentSetting = async (req, res) => {
    const { id } = req.params;

    const {
        faculty,
        department,
        commissionMember1,
        commissionMember2,
        commissionMember3,
        commissionPresident,
        departmentHead
    } = req.body;

    try {
        await db.query(
            `UPDATE DepartmentSettings
             SET Faculty = $1,
                 Department = $2,
                 CommissionMember1 = $3,
                 CommissionMember2 = $4,
                 CommissionMember3 = $5,
                 CommissionPresident = $6,
                 DepartmentHead = $7
             WHERE SettingID = $8`,
            [
                faculty,
                department,
                commissionMember1,
                commissionMember2,
                commissionMember3,
                commissionPresident,
                departmentHead,
                id
            ]
        );

        res.json({
            status: 'success',
            message: 'İmza bilgileri güncellendi.'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
};

exports.deleteDepartmentSetting = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query(
            `DELETE FROM DepartmentSettings
             WHERE SettingID = $1`,
            [id]
        );

        res.json({
            status: 'success',
            message: 'İmza bilgileri silindi.'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
};