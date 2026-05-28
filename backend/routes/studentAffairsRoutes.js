const express = require('express');
const router = express.Router();
const studentAffairsController = require('../controllers/studentAffairsController');

// Rotalarımız:
router.post('/register-student', studentAffairsController.registerStudent);
router.get('/students', studentAffairsController.getAllStudents);
router.put('/students/:studentNo', studentAffairsController.updateStudent);
router.delete('/students/:studentNo', studentAffairsController.deleteStudent);

module.exports = router;