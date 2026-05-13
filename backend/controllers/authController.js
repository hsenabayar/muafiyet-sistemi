const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 📝 Kullanıcı Kayıt (Register)
exports.register = async (req, res) => {
    const { username, password, role, fullName, studentNumber, department } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO Users (Username, PasswordHash, Role, FullName, StudentNumber, Department)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING UserID, Username, Role
        `;
        const values = [username, hashedPassword, role, fullName, studentNumber, department];
        
        const result = await db.query(query, values);
        res.status(201).json({ status: "success", message: "Kullanıcı başarıyla oluşturuldu.", user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};

// 🔑 Kullanıcı Girişi (Login)
exports.login = async (req, res) => {
    const { username, password, role } = req.body; // Frontend'den seçilen rolü de aldık

    try {
        const userResult = await db.query('SELECT * FROM Users WHERE Username = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Kullanıcı bulunamadı." });
        }

        const user = userResult.rows[0];

        // 🛡️ Kritik Kontrol: Seçilen Rol ile Veritabanındaki Rol Uyuşuyor mu?
        if (role && user.role !== role) {
            return res.status(403).json({ 
                status: "error", 
                message: `Bu hesap ${role} yetkisine sahip değil. Lütfen doğru rolü seçin.` 
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordhash);
        if (!isMatch) {
            return res.status(400).json({ status: "error", message: "Hatalı şifre." });
        }

        const token = jwt.sign(
            { id: user.userid, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            status: "success",
            token,
            user: { 
                id: user.userid, 
                fullname: user.fullname, 
                role: user.role 
            }
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
};