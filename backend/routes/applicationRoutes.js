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

router.post(
    '/commission/add-course-mapping',
    verifyToken,
    checkRole(['teacher', 'commission']),
    appController.addCommissionCourseMapping
);

// ======================================================
// ⚙️ ADMIN ROTALARI
// ======================================================

router.get(
    '/admin/stats',
    verifyToken,
    checkRole(['admin']),
    appController.getAdminStats
);

router.get(
    '/admin/users',
    verifyToken,
    checkRole(['admin']),
    appController.getAdminUsers
);

router.post(
    '/admin/users',
    verifyToken,
    checkRole(['admin']),
    appController.createUserByAdmin
);

router.put(
    '/admin/users/:userId',
    verifyToken,
    checkRole(['admin']),
    appController.updateUserByAdmin
);

router.put(
    '/admin/users/:userId/password',
    verifyToken,
    checkRole(['admin']),
    appController.resetUserPasswordByAdmin
);

router.put(
    '/admin/users/:userId/status',
    verifyToken,
    checkRole(['admin']),
    appController.changeUserStatusByAdmin
);

router.delete(
    '/admin/users/:userId',
    verifyToken,
    checkRole(['admin']),
    appController.deleteUserByAdmin
);

router.get(
    '/admin/applications',
    verifyToken,
    checkRole(['admin']),
    appController.getAllApplicationsForAdmin
);

router.put(
    '/admin/applications/:applicationId/assign',
    verifyToken,
    checkRole(['admin']),
    appController.assignApplicationDepartmentByAdmin
);

router.post(
    '/admin/curriculum',
    verifyToken,
    checkRole(['admin']),
    appController.createCurriculumCourseByAdmin
);

router.put(
    '/admin/curriculum/:courseId',
    verifyToken,
    checkRole(['admin']),
    appController.updateCurriculumCourseByAdmin
);

router.delete(
    '/admin/curriculum/:courseId',
    verifyToken,
    checkRole(['admin']),
    appController.deleteCurriculumCourseByAdmin
);

router.get(
    '/admin/department-settings',
    verifyToken,
    checkRole(['admin']),
    appController.getDepartmentSettings
);

router.post(
    '/admin/department-settings',
    verifyToken,
    checkRole(['admin']),
    appController.saveDepartmentSettings
);

router.get(
    '/admin/applications/:id',
    verifyToken,
    checkRole(['admin']),
    appController.getApplicationDetailForAdmin
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