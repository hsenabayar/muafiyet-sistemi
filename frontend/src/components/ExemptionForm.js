import React, { useState, useEffect } from 'react';
import api from '../api';

const ExemptionForm = () => {
    const [curriculum, setCurriculum] = useState([]);
    const [targetCourseId, setTargetCourseId] = useState('');
    const [externalCourses, setExternalCourses] = useState([{ code: '', name: '', grade: '', akts: '' }]);

    useEffect(() => {
        api.get('/applications/curriculum')
            .then(res => setCurriculum(res.data.data))
            .catch(err => console.error("Dersler yüklenemedi", err));
    }, []);

    const addExternalRow = () => {
        setExternalCourses([...externalCourses, { code: '', name: '', grade: '', akts: '' }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/applications/add-course', {
                applicationId: 1, 
                targetCourseId,
                externalCourses
            });
            alert("Başarıyla taslağa eklendi!");
        } catch (err) {
            alert(err.response?.data?.message || "Bir hata oluştu");
        }
    };

    // Seçili dersin tüm bilgilerini bulalım
    const selectedOMUCourse = curriculum.find(c => String(c.courseid) === String(targetCourseId));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
            
            {/* ÜST BAŞLIK ALANI (PDF'deki gibi) */}
            <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '10px', border: '1px solid #ddd' }}>
                <h4 style={{ margin: '2px' }}>T.C. ONDOKUZ MAYIS ÜNİVERSİTESİ</h4>
                <h5 style={{ margin: '2px' }}>DERS MUAFİYET BAŞVURU FORMU (PP1.2.FR.0041)</h5>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                
                {/* SOL TARAF: VERİ GİRİŞ FORMU */}
                <div style={{ flex: '1', backgroundColor: 'white', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>Veri Girişi</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block' }}>Hedef OMÜ Dersi:</label>
                            <select 
                                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                value={targetCourseId} 
                                onChange={(e) => setTargetCourseId(e.target.value)} 
                                required
                            >
                                <option value="">Müfredattan seçin...</option>
                                {curriculum.map(c => (
                                    <option key={c.courseid} value={c.courseid}>
                                        [{c.coursecode}] {c.coursename} - {c.akts} AKTS
                                    </option>
                                ))}
                            </select>
                        </div>

                        <h4 style={{ marginTop: '20px' }}>Eşleşecek Kaynak Dersler (N:1)</h4>
                        {externalCourses.map((course, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '5px', marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                                <input placeholder="Kod (MAT101)" value={course.code} onChange={e => {
                                    const newCourses = [...externalCourses];
                                    newCourses[index].code = e.target.value;
                                    setExternalCourses(newCourses);
                                }} />
                                <input placeholder="Ders Adı" value={course.name} onChange={e => {
                                    const newCourses = [...externalCourses];
                                    newCourses[index].name = e.target.value;
                                    setExternalCourses(newCourses);
                                }} />
                                <input placeholder="Not" value={course.grade} onChange={e => {
                                    const newCourses = [...externalCourses];
                                    newCourses[index].grade = e.target.value;
                                    setExternalCourses(newCourses);
                                }} />
                            </div>
                        ))}
                        
                        <button type="button" onClick={addExternalRow} style={{ padding: '8px', cursor: 'pointer' }}>+ Başka Ders Ekle</button>
                        <hr style={{ margin: '20px 0' }} />
                        <button type="submit" style={{ width: '100%', padding: '12px', background: '#004a99', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            EŞLEŞTİRMEYİ TASLAĞA EKLE
                        </button>
                    </form>
                </div>

                {/* SAĞ TARAF: RESMİ FORM ÖNİZLEMESİ (PDF STANDARDI) */}
                <div style={{ flex: '1.5', backgroundColor: 'white', padding: '30px', border: '1px solid #999', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', minHeight: '600px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '12px' }}>
                        <strong>GELDİĞİ KURUMDA ALDIĞI DERSLER / OMÜ TRANSKRİPTİNE AKTARILACAK DERSLER</strong>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}>
                        <thead>
                            <tr style={{ fontSize: '10px', textAlign: 'center', background: '#eee' }}>
                                <th style={{ border: '1px solid black', width: '50%' }}>DAHA ÖNCE OKUDUĞU YÜKSEKÖĞRETİM KURUMUNDAKİ DERSLER</th>
                                <th style={{ border: '1px solid black', width: '50%' }}>OMÜ FAKÜLTE/YÜKSEKOKUL ALDIĞI EŞ DEĞER DERSLER</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ minHeight: '100px', verticalAlign: 'top', fontSize: '11px' }}>
                                {/* SOL SÜTUN: Gelen Dersler */}
                                <td style={{ border: '1px solid black', padding: '10px' }}>
                                    {externalCourses.map((c, i) => (
                                        <div key={i} style={{ marginBottom: '8px' }}>
                                            {c.code && <strong>{c.code} - </strong>} {c.name || '...'} 
                                            {c.grade && <span style={{ float: 'right' }}>({c.grade})</span>}
                                        </div>
                                    ))}
                                    {externalCourses.length > 0 && <div style={{ borderTop: '1px solid #ccc', marginTop: '10px', paddingTop: '5px' }}>
                                        Toplam AKTS: {externalCourses.reduce((sum, curr) => sum + (Number(curr.akts) || 0), 0)}
                                    </div>}
                                </td>

                                {/* SAĞ SÜTUN: OMÜ Karşılığı */}
                                <td style={{ border: '1px solid black', padding: '10px' }}>
                                    {selectedOMUCourse ? (
                                        <div>
                                            <strong>{selectedOMUCourse.coursecode}</strong><br />
                                            {selectedOMUCourse.coursename}<br />
                                            <span style={{ color: '#666' }}>AKTS: {selectedOMUCourse.akts}</span>
                                            <div style={{ marginTop: '15px', padding: '5px', border: '1px dashed #004a99', color: '#004a99' }}>
                                                Sistem Önerisi: {selectedOMUCourse.coursetype || 'Normal'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ color: '#ccc', textAlign: 'center', marginTop: '20px' }}>Lütfen ders seçin...</div>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ marginTop: '40px', fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
                        * Bu önizleme PP1.2.FR.0041 nolu Ders Muafiyet Başvuru Formu formatına göre oluşturulmaktadır.
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExemptionForm;