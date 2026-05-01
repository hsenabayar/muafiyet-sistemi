const express = require('express');
const cors = require('cors');
const path = require('path');
// .env dosyasını projenin en üst klasöründe arar
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('./config/db');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rotalar
app.use('/api/auth', require('./routes/authRoutes'));

// Bağlantı Testi
app.get('/api/test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).json({ 
            status: "success", 
            message: "Sistem Aktif", 
            dbTime: result.rows[0].now 
        });
    } catch (err) {
        console.error("❌ Test Hatası:", err.message);
        res.status(500).json({ 
            status: "error", 
            message: "DB Hatası: " + err.message 
        });
    }
});

// Hata Yakalayıcı
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: "error", message: "Sunucu hatası!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
});