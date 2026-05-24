import React, { useEffect, useState } from 'react';
import api from '../api';

const TeacherDashboard = () => {
    const [applications, setApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [curriculum, setCurriculum] = useState([]);

    const [activeAddRow, setActiveAddRow] = useState(null);
    // 🎯 Yeni: Hoca satırın içine doğrudan kaynak ders eklemek istediğinde açılacak panel state'i
    const [activeAddExternalRow, setActiveAddExternalRow] = useState(null);
    const [selectedReason, setSelectedReason] = useState('Tümü');

    useEffect(() => {
        loadApplications();

        api.get('/applications/curriculum')
            .then(res => {
                setCurriculum(res.data.data || []);
            })
            .catch(err => {
                console.error("Müfredat alınamadı:", err);
            });
    }, []);

    const getPackageName = (course) => {
        const packageFromColumn =
            course?.packagecode ||
            course?.package_code ||
            course?.coursepackage ||
            course?.course_package ||
            course?.electivepackage ||
            course?.elective_package ||
            course?.electivegroup ||
            course?.elective_group ||
            course?.paket ||
            course?.paketadi ||
            course?.paket_adi ||
            '';

        if (packageFromColumn) {
            return packageFromColumn;
        }

        const courseName = course?.coursename || '';
        const match = courseName.match(/\(([^)]+)\)/);

        if (match) {
            return match[1].trim();
        }

        return '';
    };

    const getCleanCourseName = (courseName) => {
        return String(courseName || '').replace(/\s*\([^)]+\)\s*/g, '').trim();
    };

    const getSemesterName = (course) => {
        return course?.semester || course?.donem || course?.term || 'Dönem Bilgisi Yok';
    };

    const groupedCurriculum = curriculum.reduce((groups, course) => {
        const packageName = getPackageName(course);
        const semesterName = getSemesterName(course);

        const groupTitle = packageName
            ? `Seçmeli Paket: ${packageName}`
            : `${semesterName}. Dönem Dersleri`;

        if (!groups[groupTitle]) {
            groups[groupTitle] = [];
        }

        groups[groupTitle].push(course);
        return groups;
    }, {});

    const loadApplications = () => {
        api.get('/applications/commission/applications')
            .then(res => {
                setApplications(res.data.data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Başvurular alınamadı:", err);
                alert(err.response?.data?.message || "Başvurular alınamadı.");
                setLoading(false);
            });
    };

    const openDetail = async (applicationId) => {
        try {
            setDetailLoading(true);

            const res = await api.get(`/applications/commission/applications/${applicationId}`);

            setSelectedApplication(res.data.data);
            setDetailLoading(false);
        } catch (err) {
            console.error("Başvuru detayı alınamadı:", err);
            alert(err.response?.data?.message || "Başvuru detayı alınamadı.");
            setDetailLoading(false);
        }
    };

    const updateDecision = async (decisionId, isApproved, finalGrade, reviewNote) => {
        try {
            await api.post('/applications/finalize-decision', {
                decisionId,
                isApproved,
                finalGrade,
                reviewNote
            });

            alert("Karar kaydedildi.");
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Karar kaydedilemedi.");
        }
    };

    const updateTargetCourse = async (decisionId, targetCourseId) => {
        try {
            await api.post('/applications/commission/update-target-course', {
                decisionId,
                targetCourseId
            });

            alert("Hedef OMÜ dersi güncellendi.");
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Hedef ders güncellenemedi.");
        }
    };

    const addExtraTargetCourse = async (decisionId, targetCourseId) => {
        if (!targetCourseId) {
            alert("Lütfen eklenecek OMÜ dersini seçiniz.");
            return;
        }

        try {
            await api.post('/applications/commission/add-target-course', {
                decisionId,
                targetCourseId
            });

            alert("Aynı kaynak derslerle yeni OMÜ dersi eklendi.");
            setActiveAddRow(null);
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Yeni OMÜ dersi eklenemedi.");
        }
    };

    // 🎯 Yeni Backend Fonksiyonu: Belirli bir Kararı (Hedef Ders Eşleşmesini) Sağ Taraftan Silme
    const deleteTargetCourseDecision = async (decisionId) => {
        if (!window.confirm("Bu hedef OMÜ dersini ve bağlı kararı silmek istediğinize emin misiniz?")) return;
        try {
            await api.delete(`/applications/commission/decision/${decisionId}`);
            alert("Hedef ders başarıyla silindi.");
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Hedef ders silinemedi.");
        }
    };

    // 🎯 Yeni Backend Fonksiyonu: Belirli bir Gruba Yeni Kaynak Ders Ekleme
    const addExternalCourseToGroup = async (applicationId, targetCourseId, courseData) => {
        try {
            await api.post('/applications/commission/add-external-course', {
                applicationId,
                targetCourseId,
                ...courseData
            });
            alert("Yeni kaynak ders başarıyla eklendi.");
            setActiveAddExternalRow(null);
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Kaynak ders eklenemedi.");
        }
    };

    // 🎯 Yeni Backend Fonksiyonu: Öğrencinin Eklediği Kaynak Dersi Sol Taraftan Silme
    const deleteExternalCourseFromGroup = async (mappingId) => {
        if (!window.confirm("Bu kaynak dersi eşleştirmeden silmek istediğinize emin misiniz?")) return;
        try {
            await api.delete(`/applications/commission/external-course/${mappingId}`);
            alert("Kaynak ders silindi.");
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Kaynak ders silinemedi.");
        }
    };

    const getGroupedMappings = (rawMappings) => {
        const groups = {};

        rawMappings.forEach(mapping => {
            const sortedExternalCodes = (mapping.externalCourses || [])
                .map(c => String(c.code || c.externalcoursecode || '').trim().toUpperCase())
                .sort()
                .join('-');

            // Eğer mapping nesnesinde doğrudan benzersiz grup belirteci yoksa kaynak kod kombinasyonunu baz alıyoruz
            const groupKey = mapping.groupId || sortedExternalCodes;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupId: groupKey,
                    externalCourses: mapping.externalCourses || [],
                    decisions: []
                };
            }
            groups[groupKey].decisions.push(mapping);
        });

        return Object.values(groups);
    };

    const reasonOptions = [
        'Tümü',
        'Yatay Geçiş',
        'Dikey Geçiş',
        'ÖSYM ile Yerleşme',
        'Yaz Okulu',
        'Diğer'
    ];

    const filteredApplications =
        selectedReason === 'Tümü'
            ? applications
            : applications.filter(app => app.exemptionreason === selectedReason);

    if (loading) {
        return <div style={{ padding: '30px' }}>Başvurular yükleniyor...</div>;
    }

    if (selectedApplication) {
        const app = selectedApplication.application;
        const rawMappings = selectedApplication.mappings || [];
        const attachments = selectedApplication.attachments || [];
        const structuredGroups = getGroupedMappings(rawMappings);

        return (
            <div style={pageStyle}>
                <div style={containerStyle}>
                    <button
                        type="button"
                        onClick={() => setSelectedApplication(null)}
                        style={secondaryButton}
                    >
                        ← Başvuru Listesine Dön
                    </button>

                    <h2 style={{ color: '#004a99' }}>Başvuru Detayı</h2>

                    {/* Öğrenci Bilgileri */}
                    <div style={sectionStyle}>
                        <h3>Öğrenci Bilgileri</h3>
                        <table style={tableStyle}>
                            <tbody>
                                <tr>
                                    <td style={labelCell}>Başvuru No</td>
                                    <td style={tdStyle}>{app.applicationid}</td>
                                    <td style={labelCell}>Durum</td>
                                    <td style={tdStyle}>{app.status}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Öğrenci No</td>
                                    <td style={tdStyle}>{app.studentno || '-'}</td>
                                    <td style={labelCell}>Ad Soyad</td>
                                    <td style={tdStyle}>{app.studentname || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>T.C. Kimlik No</td>
                                    <td style={tdStyle}>{app.tcno || '-'}</td>
                                    <td style={labelCell}>Fakülte</td>
                                    <td style={tdStyle}>{app.faculty || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Bölüm</td>
                                    <td style={tdStyle}>{app.department || '-'}</td>
                                    <td style={labelCell}>Program</td>
                                    <td style={tdStyle}>{app.program || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Başvuru Bilgileri */}
                    <div style={sectionStyle}>
                        <h3>Başvuru Bilgileri</h3>
                        <table style={tableStyle}>
                            <tbody>
                                <tr>
                                    <td style={labelCell}>Akademik Yıl</td>
                                    <td style={tdStyle}>{app.academicyear || '-'}</td>
                                    <td style={labelCell}>Yarıyıl</td>
                                    <td style={tdStyle}>{app.semester || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Muafiyet Gerekçesi</td>
                                    <td style={tdStyle}>{app.exemptionreason || '-'}</td>
                                    <td style={labelCell}>Önceki Üniversite</td>
                                    <td style={tdStyle}>{app.sourceuniversity || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Önceki Fakülte</td>
                                    <td style={tdStyle}>{app.sourcefaculty || '-'}</td>
                                    <td style={labelCell}>Önceki Bölüm</td>
                                    <td style={tdStyle}>{app.sourcedepartment || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Belgeler */}
                    <div style={sectionStyle}>
                        <h3>Yüklenen Belgeler</h3>
                        {attachments.length === 0 ? (
                            <p>Yüklenen belge bulunamadı.</p>
                        ) : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={{ background: '#f1f1f1' }}>
                                        <th style={thStyle}>Belge Türü</th>
                                        <th style={thStyle}>Dosya Adı</th>
                                        <th style={thStyle}>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attachments.map(file => (
                                        <tr key={file.attachmentid}>
                                            <td style={tdStyle}>{file.filetype}</td>
                                            <td style={tdStyle}>{file.filename}</td>
                                            <td style={tdStyle}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const fileUrl = `http://localhost:5000/${file.filepath.replaceAll('\\', '/')}`;
                                                        window.open(fileUrl, '_blank');
                                                    }}
                                                    style={primaryButton}
                                                >
                                                    Görüntüle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Ders Eşleştirmeleri */}
                    <div style={sectionStyle}>
                        <h3>Ders Eşleştirmeleri</h3>

                        {rawMappings.length === 0 ? (
                            <p>Ders eşleştirmesi bulunamadı.</p>
                        ) : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={{ background: '#f1f1f1' }}>
                                        <th style={thStyle}>#</th>
                                        <th style={thStyle}>Kaynak Ders</th>
                                        <th style={thStyle}>Kaynak Kredi</th>
                                        <th style={thStyle}>Kaynak AKTS</th>
                                        <th style={thStyle}>Harf Notu</th>
                                        <th style={thStyle}>Hedef OMÜ Dersi</th>
                                        <th style={thStyle}>OMÜ Kredi</th>
                                        <th style={thStyle}>OMÜ AKTS</th>
                                        <th style={thStyle}>OMÜ Harf Notu</th>
                                        <th style={thStyle}>İşlem</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {structuredGroups.map((group, groupIndex) => {
                                        const totalRowsInGroup = group.decisions.length;

                                        return group.decisions.map((mapping, rowIndex) => (
                                            <tr key={`${groupIndex}-${rowIndex}`}>

                                                {/* SIRA NUMARASI */}
                                                {rowIndex === 0 && (
                                                    <td rowSpan={totalRowsInGroup} style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center', background: '#fafafa' }}>
                                                        {groupIndex + 1}
                                                    </td>
                                                )}

                                                {/* 🛠️ SOL TARAF: FAKÜLTE YETKİLİSİNİN DERS EKLEYİP SİLEBİLECEĞİ DİNAMİK KAYNAK DERS ALANI */}
                                                {rowIndex === 0 && (
                                                    <>
                                                        <td rowSpan={totalRowsInGroup} style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                            {group.externalCourses.map((course, i) => (
                                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '4px', borderBottom: '1px dashed #eee' }}>
                                                                    <span><b>{course.code || course.externalcoursecode}</b> - {course.name || course.externalcoursename}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteExternalCourseFromGroup(course.extCourseId || course.extcourseid)}
                                                                        style={{ background: '#dc3545', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                                                                    >
                                                                        Sil
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {/* Hoca satır içi kaynak ders eklemek isterse */}
                                                            {activeAddExternalRow === groupIndex ? (
                                                                <div style={{ background: '#f8f9fa', padding: '6px', borderRadius: '4px', marginTop: '8px', border: '1px solid #ddd' }}>
                                                                    <input id={`ext-code-${groupIndex}`} placeholder="Kod (MAT101)" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                    <input id={`ext-name-${groupIndex}`} placeholder="Ders Adı" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                    <input id={`ext-credit-${groupIndex}`} type="number" placeholder="Kredi" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                    <input id={`ext-akts-${groupIndex}`} type="number" placeholder="AKTS" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                    <input id={`ext-grade-${groupIndex}`} placeholder="Harf Notu (AA)" style={{ width: '100%', marginBottom: '6px', padding: '4px' }} />
                                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                                        <button type="button" style={{ ...primaryButton, backgroundColor: '#198754', padding: '2px 6px', fontSize: '11px' }} onClick={() => {
                                                                            const code = document.getElementById(`ext-code-${groupIndex}`).value;
                                                                            const name = document.getElementById(`ext-name-${groupIndex}`).value;
                                                                            const sourceCredit = document.getElementById(`ext-credit-${groupIndex}`).value;
                                                                            const akts = document.getElementById(`ext-akts-${groupIndex}`).value;
                                                                            const grade = document.getElementById(`ext-grade-${groupIndex}`).value;
                                                                            addExternalCourseToGroup(app.applicationid, mapping.targetCourse?.courseid, { code, name, sourceCredit, akts, grade });
                                                                        }}>Ekle</button>
                                                                        <button type="button" style={{ ...secondaryButton, marginBottom: 0, padding: '2px 6px', fontSize: '11px' }} onClick={() => setActiveAddExternalRow(null)}>İptal</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button type="button" style={{ ...primaryButton, backgroundColor: '#6c757d', width: '100%', marginTop: '5px', fontSize: '11px', padding: '3px' }} onClick={() => setActiveAddExternalRow(groupIndex)}>
                                                                    + Farklı Kaynak Ders Ekle
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td rowSpan={totalRowsInGroup} style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                                                            {group.externalCourses.map((course, i) => (
                                                                <div key={i} style={{ height: '24px' }}>{course.sourceCredit || course.externalcredit || '-'}</div>
                                                            ))}
                                                        </td>
                                                        <td rowSpan={totalRowsInGroup} style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                                                            {group.externalCourses.map((course, i) => (
                                                                <div key={i} style={{ height: '24px' }}>{course.akts || course.externalakts || '-'}</div>
                                                            ))}
                                                        </td>
                                                        <td rowSpan={totalRowsInGroup} style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                                                            {group.externalCourses.map((course, i) => (
                                                                <div key={i} style={{ height: '24px' }}>{course.grade || course.externalgrade || '-'}</div>
                                                            ))}
                                                        </td>
                                                    </>
                                                )}

                                                {/* SAĞ TARAF: HEDEF OMÜ DERSLERİ VE KONTROL ALANLARI */}
                                                <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                    <select
                                                        id={`target-${mapping.decisionId}`}
                                                        defaultValue={mapping.targetCourse?.courseid}
                                                        style={{ padding: '6px', width: '100%' }}
                                                    >
                                                        {Object.keys(groupedCurriculum).map(groupName => (
                                                            <optgroup key={groupName} label={groupName}>
                                                                {groupedCurriculum[groupName].map(c => (
                                                                    <option key={c.courseid} value={c.courseid}>
                                                                        [{c.coursecode}] {getCleanCourseName(c.coursename)} - Kredi: {c.localcredit || '-'} - {c.akts} AKTS
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>

                                                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                                                        <button
                                                            type="button"
                                                            style={{ ...primaryButton, flex: 2, fontSize: '11px', padding: '4px' }}
                                                            onClick={() => {
                                                                const selectedTargetId = document.getElementById(`target-${mapping.decisionId}`).value;
                                                                updateTargetCourse(mapping.decisionId, selectedTargetId);
                                                            }}
                                                        >
                                                            Güncelle
                                                        </button>
                                                        {/* 🎯 Yeni: Hedef OMÜ Dersini Tamamen Silme Butonu */}
                                                        <button
                                                            type="button"
                                                            style={{ ...primaryButton, backgroundColor: '#dc3545', flex: 1, fontSize: '11px', padding: '4px' }}
                                                            onClick={() => deleteTargetCourseDecision(mapping.decisionId || mapping.decisionid)}
                                                        >
                                                            Kaldır
                                                        </button>
                                                    </div>

                                                    {/* Yeni OMÜ Dersi Ekleme Paneli her zaman grubun en altında sabit kalır */}
                                                    {rowIndex === totalRowsInGroup - 1 && (
                                                        <div style={{ marginTop: '12px', borderTop: '2px dashed #004a99', paddingTop: '10px' }}>
                                                            {activeAddRow === groupIndex ? (
                                                                <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                                                    <select
                                                                        id={`extra-target-${mapping.decisionId}`}
                                                                        style={{ padding: '6px', width: '100%', marginBottom: '6px' }}
                                                                        defaultValue=""
                                                                    >
                                                                        <option value="">Ek OMÜ dersi seç...</option>
                                                                        {Object.keys(groupedCurriculum).map(groupName => (
                                                                            <optgroup key={groupName} label={groupName}>
                                                                                {groupedCurriculum[groupName].map(c => (
                                                                                    <option key={c.courseid} value={c.courseid}>
                                                                                        [{c.coursecode}] {getCleanCourseName(c.coursename)} - {c.akts} AKTS
                                                                                    </option>
                                                                                ))}
                                                                            </optgroup>
                                                                        ))}
                                                                    </select>

                                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                                        <button
                                                                            type="button"
                                                                            style={{ ...primaryButton, backgroundColor: '#198754', flex: 1 }}
                                                                            onClick={() => {
                                                                                const extraTargetId = document.getElementById(`extra-target-${mapping.decisionId}`).value;
                                                                                addExtraTargetCourse(mapping.decisionId, extraTargetId);
                                                                            }}
                                                                        >
                                                                            Ekle
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            style={{ ...secondaryButton, marginBottom: 0, padding: '4px 8px', fontSize: '12px' }}
                                                                            onClick={() => setActiveAddRow(null)}
                                                                        >
                                                                            İptal
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    style={{ ...primaryButton, backgroundColor: '#198754', width: '100%', fontWeight: 'bold' }}
                                                                    onClick={() => setActiveAddRow(groupIndex)}
                                                                >
                                                                    + Yeni OMÜ Dersi Ekle
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {mapping.targetCourse?.localcredit || '-'}
                                                </td>

                                                <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {mapping.targetCourse?.akts || '-'}
                                                </td>

                                                <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                    <select
                                                        defaultValue={mapping.finalGrade || mapping.suggestedGrade || ''}
                                                        id={`grade-${mapping.decisionId}`}
                                                        style={{ padding: '6px', width: '100%' }}
                                                    >
                                                        <option value="">Not Seç</option>
                                                        <option value="AA">AA</option><option value="BA">BA</option>
                                                        <option value="BB">BB</option><option value="CB">CB</option>
                                                        <option value="CC">CC</option><option value="DC">DC</option>
                                                        <option value="DD">DD</option><option value="FF">FF</option>
                                                    </select>
                                                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                                                        Sistem önerisi: {mapping.suggestedGrade || '-'}
                                                    </div>
                                                </td>



                                                <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                    <button
                                                        type="button"
                                                        style={primaryButton}
                                                        onClick={() => {
                                                            const finalGrade = document.getElementById(`grade-${mapping.decisionId}`).value;
                                                            const approveValue = document.getElementById(`approve-${mapping.decisionId}`).value;
                                                            const reviewNote = document.getElementById(`note-${mapping.decisionId}`).value;

                                                            if (!finalGrade) { alert("Lütfen OMÜ harf notunu seçiniz."); return; }
                                                            if (approveValue === '') { alert("Lütfen karar seçiniz."); return; }

                                                            updateDecision(mapping.decisionId, approveValue === 'true', finalGrade, reviewNote);
                                                        }}
                                                    >
                                                        Kaydet
                                                    </button>
                                                </td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                <h2 style={{ color: '#004a99' }}>Komisyon Başvuru Listesi</h2>

                <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {reasonOptions.map(reason => (
                        <button
                            key={reason}
                            type="button"
                            onClick={() => setSelectedReason(reason)}
                            style={{
                                padding: '8px 12px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: selectedReason === reason ? '#004a99' : '#e9ecef',
                                color: selectedReason === reason ? 'white' : 'black',
                                fontWeight: selectedReason === reason ? 'bold' : 'normal'
                            }}
                        >
                            {reason}
                        </button>
                    ))}
                </div>

                {detailLoading && <p>Başvuru detayı yükleniyor...</p>}

                {filteredApplications.length === 0 ? (
                    <p>Henüz başvuru bulunmamaktadır.</p>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f1f1' }}>
                                <th style={thStyle}>Başvuru No</th>
                                <th style={thStyle}>Öğrenci No</th>
                                <th style={thStyle}>Ad Soyad</th>
                                <th style={thStyle}>Fakülte</th>
                                <th style={thStyle}>Bölüm</th>
                                <th style={thStyle}>Akademik Yıl</th>
                                <th style={thStyle}>Yarıyıl</th>
                                <th style={thStyle}>Gerekçe</th>
                                <th style={thStyle}>Durum</th>
                                <th style={thStyle}>İşlem</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredApplications.map(app => (
                                <tr key={app.applicationid}>
                                    <td style={tdStyle}>{app.applicationid}</td>
                                    <td style={tdStyle}>{app.studentno || '-'}</td>
                                    <td style={tdStyle}>{app.studentname || '-'}</td>
                                    <td style={tdStyle}>{app.faculty || '-'}</td>
                                    <td style={tdStyle}>{app.department || '-'}</td>
                                    <td style={tdStyle}>{app.academicyear || '-'}</td>
                                    <td style={tdStyle}>{app.semester || '-'}</td>
                                    <td style={tdStyle}>{app.exemptionreason || '-'}</td>
                                    <td style={tdStyle}>{app.status || '-'}</td>
                                    <td style={tdStyle}>
                                        <button
                                            type="button"
                                            onClick={() => openDetail(app.applicationid)}
                                            style={primaryButton}
                                        >
                                            Detay Gör
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const pageStyle = { backgroundColor: '#f4f4f4', minHeight: '100vh', padding: '25px' };
const containerStyle = { maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' };
const sectionStyle = { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '20px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle = { border: '1px solid #ddd', padding: '8px', textAlign: 'left' };
const tdStyle = { border: '1px solid #ddd', padding: '8px' };
const labelCell = { border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', background: '#f8f9fa' };
const primaryButton = { padding: '6px 10px', backgroundColor: '#004a99', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const secondaryButton = { padding: '7px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' };

export default TeacherDashboard;