const express = require('express');
const router = express.Router();
const appController = require('../controllers/applicationController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// 🎓 ÖĞRENCİ ROTALARI

// Yeni başvuru oluşturma
router.post('/create', verifyToken, checkRole(['student']), appController.createApplication);

// Başvuruya ders ekleme
router.post('/add-course', verifyToken, checkRole(['student']), appController.addCourseMapping);

// Öğrencinin son başvurusunu getirme
router.get('/my-latest', verifyToken, appController.getMyLatestApplication);

// Müfredat listesini çekme
router.get('/curriculum', verifyToken, appController.getCurriculumCourses);

router.get('/my-latest', verifyToken, checkRole(['student']), appController.getMyLatestApplication);

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


// 👨‍🏫 HOCA / KOMİSYON ROTALARI

// Kesin karar verme
router.post(
    '/finalize-decision',
    verifyToken,
    checkRole(['teacher', 'comission']),
    appController.finalizeDecision
);

// PDF indirme
router.get('/download-report/:id', verifyToken, appController.generatePDF);

module.exports = router;

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

