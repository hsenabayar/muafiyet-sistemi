const express = require('express');
const router = express.Router();
const appController = require('../controllers/applicationController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// 🎓 ÖĞRENCİ ROTALARI
// Yeni başvuru oluşturma
router.post('/create', verifyToken, checkRole(['student']), appController.createApplication);

// Başvuruya ders ekleme (BİLSEÇ-9 kısıtlaması burada çalışır)
router.post('/add-course', verifyToken, checkRole(['student']), appController.addCourseMapping);

// Müfredat listesini çekme (Başvuru yaparken dropdown'ı doldurur)
router.get('/curriculum', verifyToken, appController.getCurriculumCourses);


// 👨‍🏫 HOCA / KOMİSYON ROTALARI
// Kesin karar verme (Sadece yetkili personel)
router.post('/finalize-decision', verifyToken, checkRole(['teacher', 'commission']), appController.finalizeDecision); 

// PDF indirme (Resmi OMÜ Formu çıktısı)
router.get('/download-report/:id', verifyToken, appController.generatePDF);

module.exports = router;