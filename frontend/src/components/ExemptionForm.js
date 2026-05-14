import React, { useState, useEffect } from 'react';
import api from '../api';

const ExemptionForm = () => {
    const [curriculum, setCurriculum] = useState([]);
    const [targetCourseId, setTargetCourseId] = useState('');
    const [externalCourses, setExternalCourses] = useState([{ code: '', name: '', sourceCredit:'', grade: '', akts: '' }]);

    const [applicationId, setApplicationId] = useState(null);
    const [academicYear, setAcademicYear] = useState('');
    const [semester, setSemester] = useState('');
    const [exemptionReason, setExemptionReason] = useState('');
    const [sourceUniversity, setSourceUniversity] = useState('');
    const [sourceFaculty, setSourceFaculty] = useState('');
    const [sourceDepartment, setSourceDepartment] = useState('');
    const [intakeNote, setIntakeNote] = useState('');

    const [studentNo, setStudentNo] = useState('');
    const [studentName, setStudentName] = useState('');
    const [tcNo, setTcNo] = useState('');
    const [faculty, setFaculty] = useState('');
    const [department, setDepartment] = useState('');
    const [program, setProgram] = useState('');
    const [savedMappings, setSavedMappings] = useState([]);

    useEffect(() => {
        api.get('/applications/curriculum')
            .then(res => {
            console.log("Müfredat verisi:", res.data.data);
            setCurriculum(res.data.data);
        })
            .catch(err => console.error("Dersler yüklenemedi", err));
    }, []);

    const addExternalRow = () => {
        setExternalCourses([...externalCourses, { code: '', name: '', sourceCredit:'', grade: '', akts: '' }]);
    };
 
    const createApplication = async () => {
    try {
        const res = await api.post('/applications/create', {
            academicYear,
            semester,
            exemptionReason,
            sourceUniversity,
            sourceFaculty,
            sourceDepartment,
            intakeNote
        });

        setApplicationId(res.data.applicationId || res.data.data?.applicationId);
        alert("Başvuru taslağı oluşturuldu.");
    } catch (err) {
        alert(err.response?.data?.message || "Başvuru taslağı oluşturulamadı.");
    }
};

    const handleSubmit = async (e) => {
    e.preventDefault();

    if (!applicationId) {
        alert("Önce başvuru taslağı oluşturmalısınız.");
        return;
    }

    if (!targetCourseId) {
        alert("Lütfen OMÜ dersini seçiniz.");
        return;
    }

    const hasEmptyAkts = externalCourses.some(course => !course.akts);

    if (hasEmptyAkts) {
        alert("Lütfen tüm kaynak dersler için AKTS değerini giriniz.");
        return;
    }

    try {
        await api.post('/applications/add-course', {
            applicationId,
            targetCourseId,
            externalCourses
        });

        setSavedMappings([
            ...savedMappings,
            {
                targetCourse: selectedOMUCourse,
                externalCourses: [...externalCourses]
            }
        ]);

        alert("Ders eşleştirmesi taslağa eklendi!");

        setTargetCourseId('');
        setExternalCourses([{ code: '', name: '', sourceCredit:'', grade: '', akts: '' }]);

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
                    <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>Başvuru Bilgileri</h3>
                    <form onSubmit={handleSubmit}>


                            <div style={{ marginBottom: '10px' }}>
                                <label>Öğrenci No:</label>
                                <input
                                    style={{ width: '100%', padding: '8px' }}
                                    value={studentNo}
                                    onChange={(e) => setStudentNo(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <label>Adı Soyadı:</label>
                                <input
                                    style={{ width: '100%', padding: '8px' }}
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <label>T.C. Kimlik No:</label>
                                <input
                                    style={{ width: '100%', padding: '8px' }}
                                    value={tcNo}
                                    onChange={(e) => setTcNo(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <label>Fakülte/YO/MYO:</label>
                                <input
                                    style={{ width: '100%', padding: '8px' }}
                                    value={faculty}
                                    onChange={(e) => setFaculty(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <label>Bölüm:</label>
                                <input
                                    style={{ width: '100%', padding: '8px' }}
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <label>Program:</label>
                                <input
                                    style={{ width: '100%', padding: '8px' }}
                                    value={program}
                                    onChange={(e) => setProgram(e.target.value)}
                                />
                            </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Akademik Yıl:</label>
                            <input
                                style={{ width: '100%', padding: '8px' }}
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Yarıyıl:</label>
                            <select
                                style={{ width: '100%', padding: '8px' }}
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                            >
                                <option value="">Yarıyıl seçin...</option>
                                <option value="Güz">Güz</option>
                                <option value="Bahar">Bahar</option>
                                <option value="Yaz">Yaz</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Muafiyet Gerekçesi:</label>
                            <select
                                style={{ width: '100%', padding: '8px' }}
                                value={exemptionReason}
                                onChange={(e) => setExemptionReason(e.target.value)}
                            >
                                <option value="">Muafiyet gerekçesi seçin...</option>
                                <option value="Yatay Geçiş">Yatay Geçiş</option>
                                <option value="Dikey Geçiş">Dikey Geçiş</option>
                                <option value="ÖSYM ile Yerleşme">ÖSYM ile Yerleşme</option>
                                <option value="Yaz Okulu">Yaz Okulu</option>
                                <option value="Diğer">Diğer</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Daha Önce Okuduğu Üniversite:</label>
                            <input
                                style={{ width: '100%', padding: '8px' }}
                                value={sourceUniversity}
                                onChange={(e) => setSourceUniversity(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Önceki Fakülte / Yüksekokul:</label>
                            <input
                                style={{ width: '100%', padding: '8px' }}
                                value={sourceFaculty}
                                onChange={(e) => setSourceFaculty(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Önceki Bölüm / Program:</label>
                            <input
                                style={{ width: '100%', padding: '8px' }}
                                value={sourceDepartment}
                                onChange={(e) => setSourceDepartment(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label>İntibak Notu:</label>
                            <textarea
                                style={{ width: '100%', padding: '8px' }}
                                value={intakeNote}
                                onChange={(e) => setIntakeNote(e.target.value)}
                                placeholder="Örn: Öğrencinin intibakı 2. sınıf 3. yarıyıla yapılacaktır."
                            />
                        </div>

                        <button
                            type="button"
                            onClick={createApplication}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#198754',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginBottom: '20px'
                            }}
                        >
                            BAŞVURU TASLAĞI OLUŞTUR
                        </button>

                        {applicationId && (
                            <div style={{ padding: '10px', background: '#e7f3ff', marginBottom: '15px' }}>
                                Başvuru Taslağı Oluşturuldu. Başvuru ID: {applicationId}
                            </div>
                        )}
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
                                        [{c.coursecode}] {c.coursename} - Kredi: {c.localcredit} - {c.akts} AKTS
                                    </option>
                                ))}
                            </select>
                        </div>

                        <h4 style={{ marginTop: '20px' }}>Eşleşecek Kaynak Dersler (N:1)</h4>
                        {externalCourses.map((course, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr', gap: '5px', marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
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

                                <input
                                    type="number"
                                    placeholder="Kredi"
                                    value={course.sourceCredit}
                                    onChange={e => {
                                        const newCourses = [...externalCourses];
                                        newCourses[index].sourceCredit = e.target.value;
                                        setExternalCourses(newCourses);
                                    }}
                                />
                                <select value={course.grade} onChange={e => {
                                    const newCourses = [...externalCourses];
                                    newCourses[index].grade = e.target.value;
                                    setExternalCourses(newCourses);
                                }}>
                                    <option value="">Not</option>
                                    <option value="AA">AA</option>
                                    <option value="BA">BA</option>
                                    <option value="BB">BB</option>
                                    <option value="CB">CB</option>
                                    <option value="CC">CC</option>
                                    <option value="DC">DC</option>
                                    <option value="DD">DD</option>
                                    <option value="FF">FF</option>
                                </select>
                                <input
                                type="number"
                                placeholder="AKTS"
                                value={course.akts}
                                onChange={e => {
                                    const newCourses = [...externalCourses];
                                    newCourses[index].akts = e.target.value;
                                    setExternalCourses(newCourses);
                                }}
                                required
                            />
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
                <div style={{
                    flex: '1.5',
                    backgroundColor: 'white',
                    padding: '25px',
                    border: '1px solid #999',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    minHeight: '900px',
                    fontSize: '11px',
                    color: 'black'
                }}>

                    {/* BAŞLIK */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0 }}>T.C.</h4>
                        <h3 style={{ margin: 0 }}>ONDOKUZ MAYIS ÜNİVERSİTESİ</h3>
                        <h3 style={{ margin: 0 }}>DERS MUAFİYET BAŞVURU FORMU</h3>
                    </div>

                    {/* AKADEMİK YIL */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                        <tbody>
                            <tr>
                            <td style={{ border: '1px solid black', fontWeight: 'bold', width: '20%', padding: '4px' }}>Akademik Yıl</td>
                            <td style={{ border: '1px solid black', padding: '4px' }}>{academicYear}</td>
                            <td style={{ border: '1px solid black', fontWeight: 'bold', width: '15%', padding: '4px' }}>Yarıyıl</td>
                            <td style={{ border: '1px solid black', padding: '4px' }}>{semester}</td>
                        </tr>
                        </tbody>
                    </table>

                    {/* ÖĞRENCİ BİLGİLERİ */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                        <tbody>
                            <tr>
                                <td colSpan="4" style={{ border: '1px solid black', textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>
                                    ÖĞRENCİ BİLGİLERİ
                                </td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px' }}>Öğrenci No</td>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{studentNo}</td>
                                <td style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px' }}>Fakülte/YO/MYO</td>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{faculty}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px' }}>Adı – Soyadı</td>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{studentName}</td>
                                <td style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px' }}>Bölüm</td>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{department}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px' }}>T.C. Kimlik No</td>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{tcNo}</td>
                                <td style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px' }}>Program</td>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{program}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* MUAFİYET TALEBİ */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>
                        MUAFİYET TALEBİ
                    </div>

                    <p style={{ lineHeight: '1.5', marginBottom: '15px' }}>
                        Önceki yıllarda okuduğum Yükseköğretim Kurumunda başarılı olduğum dersleri gösteren transkriptim ektedir.
                        Aşağıda belirttiği eşdeğer derslerden muaf olmak istiyorum.
                    </p>

                    <p style={{ marginBottom: '15px' }}>Gereğini bilgilerinize arz ederim.</p>

                    {/* DERS TABLOSU */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontSize: '10px' }}>
                        <thead>
                            <tr style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                <th colSpan="5" style={{ border: '1px solid black', padding: '5px' }}>
                                    DAHA ÖNCE OKUDUĞU YÜKSEKÖĞRETİM KURUMUNDAKİ DERSLER
                                </th>
                                <th colSpan="4" style={{ border: '1px solid black', padding: '5px' }}>
                                    OMÜ FAKÜLTE / YÜKSEKOKUL ALDIĞI EŞ DEĞER DERSLER
                                </th>
                            </tr>
                            <tr style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                <th style={{ border: '1px solid black', padding: '4px' }}>Kodu</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>Dersin Adı</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>K</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>AKTS</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>Notu</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>Kodu</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>Dersin Adı</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>K</th>
                                <th style={{ border: '1px solid black', padding: '4px' }}>AKTS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {savedMappings.map((mapping, mappingIndex) =>
                                mapping.externalCourses.map((c, i) => (
                                    <tr key={`${mappingIndex}-${i}`}>
                                        <td style={{ border: '1px solid black', padding: '5px' }}>{c.code}</td>
                                        <td style={{ border: '1px solid black', padding: '5px' }}>{c.name}</td>
                                        <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{c.sourceCredit || ''}</td>
                                        <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{c.akts}</td>
                                        <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{c.grade}</td>

                                        {i === 0 ? (
                                            <>
                                                <td rowSpan={mapping.externalCourses.length} style={{ border: '1px solid black', padding: '5px' }}>
                                                    {mapping.targetCourse?.coursecode || ''}
                                                </td>
                                                <td rowSpan={mapping.externalCourses.length} style={{ border: '1px solid black', padding: '5px' }}>
                                                    {mapping.targetCourse?.coursename || ''}
                                                </td>
                                                <td rowSpan={mapping.externalCourses.length} style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                                                    {mapping.targetCourse?.localcredit ||  ''}
                                                </td>
                                                <td rowSpan={mapping.externalCourses.length} style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                                                    {mapping.targetCourse?.akts || ''}
                                                </td>
                                            </>
                                        ) : null}
                                    </tr>
                                ))
                            )}

                            {savedMappings.length === 0 && (
                                <tr>
                                    <td colSpan="9" style={{ border: '1px solid black', padding: '8px', textAlign: 'center', color: '#777' }}>
                                        Henüz ders eşleştirmesi eklenmedi.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* EKLER */}
                    <div style={{ marginTop: '35px' }}>
                        <strong>EKLER</strong>
                        <div>☐ 1. Öğrencinin onaylı not durum belgesi/transkripti.</div>
                        <div>☐ 2. Onaylı müfredat ve ders içerikleri</div>
                        <div>☐ 3. Transkriptte yoksa staj durumunu gösteren belge.</div>
                    </div>

                    {/* AÇIKLAMALAR */}
                    <div style={{ marginTop: '25px' }}>
                        <strong>AÇIKLAMALAR</strong>
                        <p>
                            Muafiyet başvurusu dönem başından sonra gelen 3 hafta içinde yapılabilir.
                            Bu süre sonrası yapılan başvurular kabul edilmez.
                        </p>
                    </div>

                    {/* İMZA */}
                    <div style={{ marginTop: '30px', textAlign: 'right' }}>
                        <div>Öğrencinin Adı Soyadı / İmza</div>
                        <div style={{ marginTop: '30px' }}>....................................</div>
                    </div>

                    <div style={{ marginTop: '25px', borderTop: '1px solid black', paddingTop: '5px', fontSize: '10px', fontStyle: 'italic' }}>
                        PP1.2.FR.0041, R0, Temmuz 2019
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExemptionForm;