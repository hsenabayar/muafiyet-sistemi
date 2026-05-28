const db = require('../config/db');
const bcrypt = require('bcrypt');

// 📄 Yeni Öğrenci Kaydetme
exports.registerStudent = async (req, res) => {
    const { studentName, tcNo, studentNo, department, password } = req.body;

    try {
        // Öğrenci numarası (Username) zaten var mı kontrolü
        const userExists = await db.query('SELECT * FROM Users WHERE Username = $1', [studentNo]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "Bu öğrenci numarası ile zaten bir kayıt bulunuyor!" });
        }

        // Şifreyi şifreleme (Hash)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || '123', salt);

        // Veritabanına Ekleme (Kullanıcı Adı olarak Öğrenci Numarasını kullanıyoruz)
        const newUser = await db.query(
            `INSERT INTO Users 
            (Username, PasswordHash, Role, FullName, TCKimlikNo, StudentNumber, Department, Program) 
            VALUES ($1, $2, 'student', $3, $4, $5, $6, 'Lisans') 
            RETURNING UserID, FullName, StudentNumber, Department`,
            [studentNo, hashedPassword, studentName, tcNo, studentNo, department]
        );

        res.status(201).json({
            message: "Öğrenci başarıyla kaydedildi!",
            student: newUser.rows[0]
        });

    } catch (error) {
        console.error("Öğrenci kayıt hatası:", error);
        res.status(500).json({ message: "Sunucu hatası: Öğrenci kaydedilemedi." });
    }
};

// 👥 Kayıtlı Öğrencileri Listeleme (Sağ taraftaki tablo için)
// 👥 Kayıtlı Öğrencileri Listeleme
exports.getAllStudents = async (req, res) => {
    try {
        const students = await db.query(
            // TCKimlikNo eklendi
            `SELECT UserID, StudentNumber, FullName, TCKimlikNo, Department FROM Users WHERE Role = 'student' ORDER BY UserID DESC`
        );
        res.status(200).json(students.rows);
    } catch (error) {
        console.error("Öğrenci listesi çekilemedi:", error);
        res.status(500).json({ message: "Öğrenciler getirilemedi." });
    }
};

// ✏️ Öğrenci Bilgilerini Güncelleme
exports.updateStudent = async (req, res) => {
    const { studentNo } = req.params; // Güncellenecek öğrencinin numarası (URL'den gelir)
    const { studentName, tcNo, department } = req.body; // Formdan gelen yeni veriler

    try {
        const result = await db.query(
            `UPDATE Users 
             SET FullName = $1, TCKimlikNo = $2, Department = $3 
             WHERE StudentNumber = $4 AND Role = 'student'
             RETURNING *`,
            [studentName, tcNo, department, studentNo]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Öğrenci bulunamadı." });
        }

        res.status(200).json({ message: "Öğrenci bilgileri başarıyla güncellendi!" });
    } catch (error) {
        console.error("Öğrenci güncelleme hatası:", error);
        res.status(500).json({ message: "Sunucu hatası: Öğrenci güncellenemedi." });
    }
};

// 🗑️ Öğrenci Silme İşlemi
exports.deleteStudent = async (req, res) => {
    const { studentNo } = req.params; // Silinecek öğrencinin numarası (URL'den gelir)

    try {
        const result = await db.query(
            `DELETE FROM Users WHERE StudentNumber = $1 AND Role = 'student' RETURNING *`,
            [studentNo]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Silinecek öğrenci bulunamadı." });
        }

        res.status(200).json({ message: "Öğrenci sistemden başarıyla silindi!" });
    } catch (error) {
        console.error("Öğrenci silme hatası:", error);
        res.status(500).json({ message: "Sunucu hatası: Öğrenci silinemedi." });
    }
};