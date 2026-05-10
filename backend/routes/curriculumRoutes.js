const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// 📖 Herkes dersleri listeleyebilir (Öğrenciler başvuru için görmeli)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Curriculum WHERE IsActive = TRUE ORDER BY Semester, CourseName');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✍️ Sadece Bölüm Yetkilisi veya Admin müfredata yeni ders ekleyebilir
router.post('/add', verifyToken, checkRole(['Admin', 'Bolum Yetkilisi']), async (req, res) => {
    // Ders ekleme kodları buraya gelecek
    res.json({ message: "Ders ekleme yetkiniz doğrulandı." });
});

module.exports = router;