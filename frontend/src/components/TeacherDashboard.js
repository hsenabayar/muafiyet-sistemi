import React, { useEffect, useState } from 'react';
import api from '../api';

const TeacherDashboard = () => {
    const [applications, setApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [curriculum, setCurriculum] = useState([]);

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
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Yeni OMÜ dersi eklenemedi.");
        }
    };

    if (loading) {
        return <div style={{ padding: '30px' }}>Başvurular yükleniyor...</div>;
    }

    if (selectedApplication) {
        const app = selectedApplication.application;
        const mappings = selectedApplication.mappings || [];
        const attachments = selectedApplication.attachments || [];

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

                    <div style={sectionStyle}>
                        <h3>Ders Eşleştirmeleri</h3>

                        {mappings.length === 0 ? (
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
                                        <th style={thStyle}>Karar</th>
                                        <th style={thStyle}>Açıklama</th>
                                        <th style={thStyle}>İşlem</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {mappings.map((mapping, index) => (
                                        <tr key={mapping.decisionId}>
                                            <td style={tdStyle}>{index + 1}</td>

                                            <td style={tdStyle}>
                                                {mapping.externalCourses.map((course, i) => (
                                                    <div key={i}>{course.code} - {course.name}</div>
                                                ))}
                                            </td>

                                            <td style={tdStyle}>
                                                {mapping.externalCourses.map((course, i) => (
                                                    <div key={i}>{course.sourceCredit || '-'}</div>
                                                ))}
                                            </td>

                                            <td style={tdStyle}>
                                                {mapping.externalCourses.map((course, i) => (
                                                    <div key={i}>{course.akts || '-'}</div>
                                                ))}
                                            </td>

                                            <td style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center' }}>
                                                {mapping.externalCourses.map((course, i) => (
                                                    <div key={i}>{course.grade || '-'}</div>
                                                ))}
                                            </td>

                                            <td style={tdStyle}>
                                                <select
                                                    id={`target-${mapping.decisionId}`}
                                                    defaultValue={mapping.targetCourse?.courseid}
                                                    style={{ padding: '6px', width: '100%' }}
                                                >
                                                    {Object.keys(groupedCurriculum).map(groupName => (
                                                        <optgroup key={groupName} label={groupName}>
                                                            {groupedCurriculum[groupName].map(course => (
                                                                <option key={course.courseid} value={course.courseid}>
                                                                    [{course.coursecode}] {getCleanCourseName(course.coursename)} - Kredi: {course.localcredit || '-'} - {course.akts} AKTS
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>

                                                <button
                                                    type="button"
                                                    style={{ ...primaryButton, marginTop: '6px' }}
                                                    onClick={() => {
                                                        const selectedTargetId = document.getElementById(`target-${mapping.decisionId}`).value;
                                                        updateTargetCourse(mapping.decisionId, selectedTargetId);
                                                    }}
                                                >
                                                    Hedef Dersi Güncelle
                                                </button>

                                                <div style={{ marginTop: '10px', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                                                    <select
                                                        id={`extra-target-${mapping.decisionId}`}
                                                        style={{ padding: '6px', width: '100%' }}
                                                        defaultValue=""
                                                    >
                                                        <option value="">Ek OMÜ dersi seç...</option>

                                                        {Object.keys(groupedCurriculum).map(groupName => (
                                                            <optgroup key={groupName} label={groupName}>
                                                                {groupedCurriculum[groupName].map(course => (
                                                                    <option key={course.courseid} value={course.courseid}>
                                                                        [{course.coursecode}] {getCleanCourseName(course.coursename)} - Kredi: {course.localcredit || '-'} - {course.akts} AKTS
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>

                                                    <button
                                                        type="button"
                                                        style={{
                                                            ...primaryButton,
                                                            marginTop: '6px',
                                                            backgroundColor: '#198754'
                                                        }}
                                                        onClick={() => {
                                                            const extraTargetId = document.getElementById(`extra-target-${mapping.decisionId}`).value;
                                                            addExtraTargetCourse(mapping.decisionId, extraTargetId);
                                                        }}
                                                    >
                                                        + Aynı Kaynak Derslerle Yeni OMÜ Dersi Ekle
                                                    </button>
                                                </div>
                                            </td>

                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {mapping.targetCourse?.localcredit || '-'}
                                            </td>

                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {mapping.targetCourse?.akts || '-'}
                                            </td>

                                            <td style={tdStyle}>
                                                <select
                                                    defaultValue={mapping.finalGrade || mapping.suggestedGrade || ''}
                                                    id={`grade-${mapping.decisionId}`}
                                                    style={{ padding: '6px', width: '100%' }}
                                                >
                                                    <option value="">Not Seç</option>
                                                    <option value="AA">AA</option>
                                                    <option value="BA">BA</option>
                                                    <option value="BB">BB</option>
                                                    <option value="CB">CB</option>
                                                    <option value="CC">CC</option>
                                                    <option value="DC">DC</option>
                                                    <option value="DD">DD</option>
                                                    <option value="FF">FF</option>
                                                </select>

                                                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                                                    Sistem önerisi: {mapping.suggestedGrade || '-'}
                                                </div>
                                            </td>

                                            <td style={tdStyle}>
                                                <select
                                                    defaultValue={
                                                        mapping.isApproved === true
                                                            ? 'true'
                                                            : mapping.isApproved === false
                                                                ? 'false'
                                                                : ''
                                                    }
                                                    id={`approve-${mapping.decisionId}`}
                                                    style={{ padding: '6px', width: '100%' }}
                                                >
                                                    <option value="">Beklemede</option>
                                                    <option value="true">Onaylandı</option>
                                                    <option value="false">Reddedildi</option>
                                                </select>
                                            </td>

                                            <td style={tdStyle}>
                                                <textarea
                                                    defaultValue={mapping.reviewNote || ''}
                                                    id={`note-${mapping.decisionId}`}
                                                    placeholder="Komisyon açıklaması"
                                                    style={{ width: '100%', minHeight: '45px' }}
                                                />
                                            </td>

                                            <td style={tdStyle}>
                                                <button
                                                    type="button"
                                                    style={primaryButton}
                                                    onClick={() => {
                                                        const finalGrade = document.getElementById(`grade-${mapping.decisionId}`).value;
                                                        const approveValue = document.getElementById(`approve-${mapping.decisionId}`).value;
                                                        const reviewNote = document.getElementById(`note-${mapping.decisionId}`).value;

                                                        if (!finalGrade) {
                                                            alert("Lütfen OMÜ harf notunu seçiniz.");
                                                            return;
                                                        }

                                                        if (approveValue === '') {
                                                            alert("Lütfen karar seçiniz.");
                                                            return;
                                                        }

                                                        updateDecision(
                                                            mapping.decisionId,
                                                            approveValue === 'true',
                                                            finalGrade,
                                                            reviewNote
                                                        );
                                                    }}
                                                >
                                                    Kaydet
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
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

                {detailLoading && <p>Başvuru detayı yükleniyor...</p>}

                {applications.length === 0 ? (
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
                            {applications.map(app => (
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

const pageStyle = {
    backgroundColor: '#f4f4f4',
    minHeight: '100vh',
    padding: '25px'
};

const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd'
};

const sectionStyle = {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
};

const thStyle = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'left'
};

const tdStyle = {
    border: '1px solid #ddd',
    padding: '8px'
};

const labelCell = {
    border: '1px solid #ddd',
    padding: '8px',
    fontWeight: 'bold',
    background: '#f8f9fa'
};

const primaryButton = {
    padding: '6px 10px',
    backgroundColor: '#004a99',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
};

const secondaryButton = {
    padding: '7px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '15px'
};

export default TeacherDashboard;