// --- TEST LOGLARI BAŞLANGIÇ ---
console.log("🔍 DB_USER:", process.env.DB_USER);
console.log("🔍 DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("🔍 DB_HOST:", process.env.DB_HOST);
// --- TEST LOGLARI BİTİŞ ---
const { Pool } = require('pg');

// server.js zaten dotenv'i çalıştırdığı için burada tekrar çağırmaya gerek yok 
// ama garanti olsun diye değerleri kontrol edelim.
if (!process.env.DB_USER) {
    const path = require('path');
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'muafiyet_db',
    password: '1234',
    port: 5432,
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