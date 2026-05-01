const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const db = require('../config/db');

const fileName = 'mufredat.csv';
const filePath = path.resolve(__dirname, '../../', fileName);

const results = [];

const importCurriculum = async () => {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Hata: Dosya bulunamadı! Yol: ${filePath}`);
        process.exit(1);
    }

    console.log('🚀 Aktarım başlatıldı...');

    fs.createReadStream(filePath)
        .pipe(csv({ 
            separator: ';',
            // Başlıkları olduğu gibi bırakıyoruz, trim yapmıyoruz çünkü terminalde gördüğümüz isimleri kullanacağız
        }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            if (results.length === 0) {
                console.error('⚠️ CSV okundu ama veri bulunamadı.');
                process.exit(1);
            }

            for (const row of results) {
                // Terminal çıktısına göre eşleştirme yapıyoruz:
                const courseCode = row['Kodu']; 
                const courseName = row['Dersin Ad'];
                const theoretical = parseInt(row['T']) || 0;
                const practice = parseInt(row['U']) || 0;
                const lab = parseInt(row['L']) || 0;
                const credit = parseFloat(row['K']) || 0; // Excel'inde kredi 'K' olarak görünüyor
                const akts = parseInt(row['AKTS']) || 0;
                const semester = parseInt(row['Dnem']) || 0;

                // Eğer kod boşsa satırı atla
                if (!courseCode) continue;

                try {
                    const checkExist = await db.query(
                        'SELECT * FROM Curriculum WHERE CourseCode = $1',
                        [courseCode]
                    );

                    if (checkExist.rows.length > 0) {
                        await db.query(
                            `UPDATE Curriculum SET 
                                CourseName = $1, TheoreticalHours = $2, PracticeHours = $3, 
                                LabHours = $4, LocalCredit = $5, AKTS = $6, Semester = $7 
                             WHERE CourseCode = $8`,
                            [courseName, theoretical, practice, lab, credit, akts, semester, courseCode]
                        );
                    } else {
                        await db.query(
                            `INSERT INTO Curriculum 
                            (CourseCode, CourseName, TheoreticalHours, PracticeHours, LabHours, LocalCredit, AKTS, Semester, IsActive) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
                            [courseCode, courseName, theoretical, practice, lab, credit, akts, semester]
                        );
                    }
                    console.log(`✅ İşlendi: ${courseCode}`);
                } catch (err) {
                    console.error(`❌ Hata: ${courseCode} aktarılamadı. Sebep: ${err.message}`);
                }
            }

            console.log('🚀 Tüm işlemler bitti!');
            process.exit();
        });
};

importCurriculum();