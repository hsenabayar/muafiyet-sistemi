const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 📝 Kullanıcı Kayıt (Register)
exports.register = async (req, res) => {
    const { username, password, role, fullName, studentNumber, department } = req.body;

    try {
        // Şifreyi güvenlik için hash'liyoruz (Hocanızın istediği güvenlik katmanı)
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
    const { username, password } = req.body;

    try {
        const userResult = await db.query('SELECT * FROM Users WHERE Username = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Kullanıcı bulunamadı." });
        }

        const user = userResult.rows[0];

        // Şifre kontrolü
        const isMatch = await bcrypt.compare(password, user.passwordhash);
        if (!isMatch) {
            return res.status(400).json({ error: "Hatalı şifre." });
        }

        // JWT Token oluştur (1 gün geçerli)
        const token = jwt.sign(
            { id: user.userid, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            status: "success",
            token,
            user: { id: user.userid, name: user.fullname, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};