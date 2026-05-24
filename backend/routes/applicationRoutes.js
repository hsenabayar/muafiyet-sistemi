const express = require('express');
const router = express.Router();

const appController = require('../controllers/applicationController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');


// ======================================================
// 🎓 ÖĞRENCİ ROTALARI
// ======================================================

// Yeni başvuru oluştur
router.post(
    '/create',
    verifyToken,
    checkRole(['student']),
    appController.createApplication
);

// Başvuruya ders ekleme
router.post(
    '/add-course',
    verifyToken,
    checkRole(['student']),
    appController.addCourseMapping
);

// Öğrencinin son başvurusunu getir
router.get(
    '/my-latest',
    verifyToken,
    checkRole(['student']),
    appController.getMyLatestApplication
);

// Müfredat listesini getir
router.get(
    '/curriculum',
    verifyToken,
    appController.getCurriculumCourses
);

// Belge yükleme
router.post(
    '/upload-documents',
    verifyToken,
    appController.upload.fields([
        { name: 'transcript', maxCount: 1 },
        { name: 'curriculum', maxCount: 1 },
        { name: 'internship', maxCount: 1 }
    ]),
    appController.uploadDocuments
);


// ======================================================
// 👨‍🏫 KOMİSYON / HOCA ROTALARI
// ======================================================

// Başvuru listesi
router.get(
    '/commission/applications',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.getApplicationsForCommission
);

// Başvuru detay
router.get(
    '/commission/applications/:id',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.getApplicationDetailForCommission
);

// Hedef OMÜ dersini güncelle
router.post(
    '/commission/update-target-course',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.updateDecisionTargetCourse
);

// Aynı kaynak derslerle yeni OMÜ dersi ekle
router.post(
    '/commission/add-target-course',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.addExtraTargetCourseForDecision
);

router.post(
    '/commission/add-external-course',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.addExternalCourseToDecision
);

// Hedef OMÜ dersini sil
router.delete(
    '/commission/decision/:decisionId',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.deleteDecision
);

router.delete(
    '/commission/external-course/:extCourseId',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.deleteExternalCourseFromApplication
);

// Komisyon kararı kaydet
router.post(
    '/finalize-decision',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.finalizeDecision
);


// ======================================================
// 📄 PDF
// ======================================================

router.get(
    '/download-report/:id',
    verifyToken,
    appController.generatePDF
);


module.exports = router;