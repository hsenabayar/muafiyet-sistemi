const jwt = require('jsonwebtoken');

// 🛡️ TOKEN DOĞRULAMA (Login olan herkes için)
exports.verifyToken = (req, res, next) => {
    // Header'dan token'ı al (Format: Bearer <token>)
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: "Erişim engellendi. Giriş yapmalısınız." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Token içindeki { id, role } bilgisini isteğe ekle
        next();
    } catch (err) {
        res.status(401).json({ message: "Geçersiz veya süresi dolmuş token." });
    }
};

// 🛂 ROL KONTROLÜ (Hocanın istediği yetki katmanı)
exports.checkRole = (roles) => {
    return (req, res, next) => {
        // req.user.role 'Admin', 'Ogrenci Isleri', 'Bolum Yetkilisi' veya 'Ogrenci' olabilir
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Bu işlem için '${roles.join(", ")}' yetkisi gerekiyor. Mevcut yetkiniz: ${req.user.role}` 
            });
        }
        next();
    };
};