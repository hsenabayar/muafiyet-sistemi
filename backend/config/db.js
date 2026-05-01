const { Pool } = require('pg');

// server.js zaten dotenv'i çalıştırdığı için burada tekrar çağırmaya gerek yok 
// ama garanti olsun diye değerleri kontrol edelim.
if (!process.env.DB_USER) {
    const path = require('path');
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD), // Şifreyi string'e zorla (1234 gibi sayıları korur)
    port: process.env.DB_PORT || 5432,
});

// Bağlantı sağlandığında log bas
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ DB Bağlantı Hatası (Şifre/Kullanıcı yanlış olabilir):', err.stack);
    }
    console.log('✅ Veritabanına başarıyla bağlanıldı.');
    release();
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};