const express = require('express');
const router = express.Router();
const appController = require('../controllers/applicationController'); // Burada 'appController' olarak tanımlı
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Sadece öğrenciler başvuru yapabilir
router.post('/create', verifyToken, checkRole(['student']), appController.createApplication);

// Başvuruya ders ekleme
router.post('/add-course', verifyToken, checkRole(['student']), appController.addCourseMapping);

// DÜZELTİLEN SATIR: 'applicationController' yerine 'appController' yazmalısın
router.post('/finalize-decision', appController.finalizeDecision); 

// PDF indirme rotası
router.get('/download-report/:id', verifyToken, appController.generatePDF);

// Müfredat listesini getiren yeni rota
router.get('/curriculum', verifyToken, appController.getCurriculumCourses);

module.exports = router;