import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { LogOut, User } from 'lucide-react';
import api from '../api';
import { Trash2 } from 'lucide-react';

const Header = ({ userName, userRole, panelTitle, onLogout }) => (
    <div style={headerBannerStyle}>
        <div>
            <h3 style={{ margin: '4px' }}>T.C. ONDOKUZ MAYIS ÜNİVERSİTESİ</h3>
            <h2 style={{ margin: '4px', color: '#004a99' }}>Ders Saydırma ve Muafiyet Sistemi</h2>
            <p style={{ margin: '4px', color: '#666' }}>{panelTitle}</p>
        </div>
        <div style={{ textAlign: 'right', background: '#f8f9fa', padding: '10px 15px', border: '1px solid #eee', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', color: '#004a99', fontWeight: 'bold', fontSize: '16px' }}>
                {/* Kullanıcı ikonu burada */}
                <User size={20} />
                {userName || 'Kullanıcı'}
            </div>
            {/* Görev bilgisi burada */}
            <div style={{ color: '#333', fontSize: '13px', marginTop: '4px', marginBottom: '8px', fontWeight: '500' }}>
                {userRole || 'Bölüm Yetkilisi'}
            </div>
            <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' }}>
                <LogOut size={14} /> Çıkış Yap
            </button>
        </div>
    </div>
);

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
    const [decisionEdits, setDecisionEdits] = useState({});
    const [emptyMappingFormOpen, setEmptyMappingFormOpen] = useState(false);

    useEffect(() => {
        loadApplications();

        api.get('/curriculum')
            .then(res => {
                setCurriculum(res.data || []);
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

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        loadApplications();
        fetchCurrentUser(); // Yetkili bilgisini çek
        // ... diğer useEffect içeriği
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await api.get('/auth/me');
            setCurrentUser(res.data);
        } catch (err) {
            console.error("Yetkili bilgisi alınamadı", err);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const getUploadedFileUrl = (filePath) => {
        const cleanPath = String(filePath || '')
            .replaceAll('\\', '/')
            .replace(/^.*uploads\//, 'uploads/');

        return `http://localhost:5000/${cleanPath}`;
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

    const courseSelectOptions = Object.keys(groupedCurriculum).map(groupName => ({
        label: groupName,
        options: groupedCurriculum[groupName].map(c => ({
            value: c.courseid,
            label: `[${c.coursecode}] ${getCleanCourseName(c.coursename)} - Kredi: ${c.localcredit || '-'} - ${c.akts} AKTS`
        }))
    }));

    const allCourseOptions = courseSelectOptions.flatMap(group => group.options);

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
            const data = res.data.data;

            setSelectedApplication(data);

            const initialEdits = {};
            (data.mappings || []).forEach(mapping => {
                initialEdits[mapping.decisionId] = {
                    finalGrade: mapping.finalGrade || mapping.suggestedGrade || '',
                    reviewNote: mapping.reviewNote || ''
                };
            });

            setDecisionEdits(initialEdits);
            setDetailLoading(false);
        } catch (err) {
            console.error("Başvuru detayı alınamadı:", err);
            alert(err.response?.data?.message || "Başvuru detayı alınamadı.");
            setDetailLoading(false);
        }
    };

    const downloadPDF = async (applicationId) => {
        try {
            const res = await api.get(`/applications/download-report/${applicationId}`, {
                responseType: 'blob'
            });

            const fileURL = window.URL.createObjectURL(new Blob([res.data], {
                type: 'application/pdf'
            }));

            const link = document.createElement('a');
            link.href = fileURL;
            link.setAttribute('download', `ders_muafiyet_formu_${applicationId}.pdf`);
            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(fileURL);

        } catch (err) {
            alert(err.response?.data?.message || "PDF indirilemedi.");
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

    const handleDecisionEditChange = (decisionId, field, value) => {
        setDecisionEdits(prev => ({
            ...prev,
            [decisionId]: {
                ...prev[decisionId],
                [field]: value
            }
        }));
    };

    const saveAllDecisions = async () => {
        const mappings = selectedApplication?.mappings || [];

        if (mappings.length === 0) {
            alert("Kaydedilecek ders eşleştirmesi bulunmamaktadır.");
            return;
        }

        for (const mapping of mappings) {
            const edit = decisionEdits[mapping.decisionId];

            if (!edit) continue;

            if (!edit.finalGrade) {
                alert("Lütfen tüm dersler için OMÜ harf notunu seçiniz.");
                return;
            }
        }

        try {
            await Promise.all(
                mappings.map(mapping => {
                    const edit = decisionEdits[mapping.decisionId];

                    return api.post('/applications/finalize-decision', {
                        decisionId: mapping.decisionId,
                        isApproved: true,
                        finalGrade: edit.finalGrade,
                        reviewNote: edit.reviewNote || 'Bölüm yetkilisi tarafından uygun görüldü.'
                    });
                })
            );

            alert("Tüm ders kararları başarıyla kaydedildi.");
            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Kararlar kaydedilemedi.");
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

    // 🎯 Belirli bir hedef OMÜ dersini silme
    const deleteTargetCourseDecision = async (decisionId) => {
        if (!window.confirm("Bu hedef OMÜ dersini ve bağlı kararı silmek istediğinize emin misiniz?"))
            return;

        try {
            await api.delete(`/applications/commission/decision/${decisionId}`);

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

            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Kaynak ders silinemedi.");
        }
    };

    const deleteMappingGroup = async (group) => {
        if (!window.confirm("Bu ders eşleştirmesini tamamen silmek istediğinize emin misiniz?")) return;

        try {
            for (const decision of group.decisions) {
                await api.delete(`/applications/commission/decision/${decision.decisionId || decision.decisionid}`);
            }

            for (const course of group.externalCourses) {
                const extId = course.extCourseId || course.extcourseid;
                if (extId) {
                    await api.delete(`/applications/commission/external-course/${extId}`);
                }
            }

            openDetail(selectedApplication.application.applicationid);
        } catch (err) {
            alert(err.response?.data?.message || "Eşleşme silinemedi.");
        }
    };


    const addNewMappingFromEmptyState = async () => {
        const code = document.getElementById('new-ext-code').value;
        const name = document.getElementById('new-ext-name').value;
        const sourceCredit = document.getElementById('new-ext-credit').value;
        const akts = document.getElementById('new-ext-akts').value;
        const grade = document.getElementById('new-ext-grade').value;
        const targetCourseId = window.newTargetCourseId;

        if (!code || !name || !akts || !grade || !targetCourseId) {
            alert("Lütfen kaynak ders ve hedef OMÜ ders bilgilerini doldurunuz.");
            return;
        }

        try {
            await api.post('/applications/commission/add-course-mapping', {
                applicationId: selectedApplication.application.applicationid,
                targetCourseId,
                externalCourses: [
                    { code, name, sourceCredit, akts, grade }
                ]
            });

            alert("Yeni eşleşme eklendi.");
            setEmptyMappingFormOpen(false);
            openDetail(selectedApplication.application.applicationid);

        } catch (err) {
            alert(err.response?.data?.message || "Yeni eşleşme eklenemedi.");
        }
    };

    const getGroupedMappings = (rawMappings) => {
        const groups = {};

        rawMappings.forEach(mapping => {
            const externalCourses = mapping.externalCourses || [];

            if (externalCourses.length === 0) return;

            const sortedExternalCodes = externalCourses
                .map(c => String(c.code || c.externalcoursecode || '').trim().toUpperCase())
                .sort()
                .join('-');

            const groupKey = mapping.groupId || sortedExternalCodes;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupId: groupKey,
                    externalCourses,
                    decisions: []
                };
            }

            if (mapping.targetCourse?.courseid) {
                groups[groupKey].decisions.push(mapping);
            } else if (groups[groupKey].decisions.length === 0) {
                groups[groupKey].decisions.push(mapping);
            }
        });

        return Object.values(groups).filter(group => group.externalCourses.length > 0);
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
                <Header
                    userName={currentUser?.fullname || 'Yükleniyor...'}
                    userRole={currentUser?.department || 'Bölüm Yetkilisi'}
                    panelTitle="Bölüm Yetkilisi Yönetim Paneli"
                    onLogout={handleLogout}
                />
                <div style={containerStyle}>
                    <button
                        type="button"
                        onClick={() => setSelectedApplication(null)}
                        style={secondaryButton}
                    >
                        ← Başvuru Listesine Dön
                    </button>

                    <h2 style={{ color: '#004a99' }}>Başvuru Detayı</h2>

                    <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                        <button
                            type="button"
                            onClick={() => downloadPDF(app.applicationid)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: '#198754',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            PDF Formunu İndir
                        </button>
                    </div>

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
                                <tr>
                                    <td style={labelCell}>Öğrencinin Notu</td>
                                    <td colSpan="3" style={{ ...tdStyle, fontStyle: 'italic', color: '#4f6fd9' }}>
                                        {app.intakenote || 'Öğrenci ek bir not/açıklama girmemiş.'}
                                    </td>
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
                                                        window.open(getUploadedFileUrl(file.filepath), '_blank');
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
                            <div>
                                <p>Ders eşleştirmesi bulunamadı.</p>

                                {!emptyMappingFormOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setEmptyMappingFormOpen(true)}
                                        style={primaryButton}
                                    >
                                        + Yeni Eşleşme Satırı Ekle
                                    </button>
                                ) : (
                                    <div style={{
                                        marginTop: '15px',
                                        padding: '15px',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        background: '#f8f9fa'
                                    }}>
                                        <input id="new-ext-code" placeholder="Kaynak Ders Kodu" style={{ margin: '5px', padding: '8px' }} />
                                        <input id="new-ext-name" placeholder="Kaynak Ders Adı" style={{ margin: '5px', padding: '8px' }} />
                                        <input id="new-ext-credit" type="number" placeholder="Kaynak Kredi" style={{ margin: '5px', padding: '8px' }} />
                                        <input id="new-ext-akts" type="number" placeholder="Kaynak AKTS" style={{ margin: '5px', padding: '8px' }} />
                                        <input id="new-ext-grade" placeholder="Harf Notu" style={{ margin: '5px', padding: '8px' }} />

                                        <select id="new-target-course" style={{ margin: '5px', padding: '8px', width: '100%' }}>
                                            <option value="">Hedef OMÜ dersi seç...</option>
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

                                        <button type="button" onClick={addNewMappingFromEmptyState} style={primaryButton}>
                                            Kaydet
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setEmptyMappingFormOpen(false)}
                                            style={{ ...secondaryButton, marginLeft: '10px' }}
                                        >
                                            İptal
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
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
                                            const sourceRowHeight = 58;


                                            return group.decisions.map((mapping, rowIndex) => (
                                                <tr
                                                    key={`${groupIndex}-${rowIndex}`}
                                                    style={{
                                                        borderTop:
                                                            groupIndex > 0 && rowIndex === 0
                                                                ? '3px solid #666'
                                                                : undefined
                                                    }}
                                                >

                                                    {/* SIRA NUMARASI */}
                                                    {rowIndex === 0 && (
                                                        <td rowSpan={totalRowsInGroup} style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center', background: '#fafafa' }}>
                                                            {groupIndex + 1}
                                                        </td>
                                                    )}

                                                    {/* 🛠️ SOL TARAF: FAKÜLTE YETKİLİSİNİN DERS EKLEYİP SİLEBİLECEĞİ DİNAMİK KAYNAK DERS ALANI */}
                                                    {rowIndex === 0 && (
                                                        <>
                                                            {/* Kaynak Ders */}
                                                            <td
                                                                rowSpan={totalRowsInGroup}
                                                                style={{
                                                                    ...tdStyle,
                                                                    padding: 0,
                                                                    verticalAlign: 'middle',
                                                                    borderTop:
                                                                        groupIndex > 0
                                                                            ? '3px solid #666'
                                                                            : undefined
                                                                }}
                                                            >
                                                                {group.externalCourses.map((course, i) => (
                                                                    <div
                                                                        key={i}
                                                                        style={{
                                                                            height: `${sourceRowHeight}px`,
                                                                            boxSizing: 'border-box',
                                                                            padding: '8px',
                                                                            display: 'grid',
                                                                            gridTemplateColumns: '1fr 26px',
                                                                            gap: '6px',
                                                                            alignItems: 'center',
                                                                            borderBottom:
                                                                                i !== group.externalCourses.length - 1
                                                                                    ? '1px solid #ddd'
                                                                                    : 'none'
                                                                        }}
                                                                    >
                                                                        <span>
                                                                            <b>{course.code || course.externalcoursecode}</b>
                                                                            {' - '}
                                                                            {course.name || course.externalcoursename}
                                                                        </span>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                deleteExternalCourseFromGroup(
                                                                                    course.extCourseId || course.extcourseid
                                                                                )
                                                                            }
                                                                            title="Kaynak dersi sil"
                                                                            style={{
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                border: 'none',
                                                                                background: 'transparent',
                                                                                color: '#dc3545',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                padding: 0
                                                                            }}
                                                                        >
                                                                            <Trash2 size={15} />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                {activeAddExternalRow === groupIndex ? (
                                                                    <div style={{ background: '#f8f9fa', padding: '6px', borderRadius: '4px', marginTop: '8px', border: '1px solid #ddd' }}>
                                                                        <input id={`ext-code-${groupIndex}`} placeholder="Kod" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                        <input id={`ext-name-${groupIndex}`} placeholder="Ders Adı" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                        <input id={`ext-credit-${groupIndex}`} type="number" placeholder="Kredi" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                        <input id={`ext-akts-${groupIndex}`} type="number" placeholder="AKTS" style={{ width: '100%', marginBottom: '4px', padding: '4px' }} />
                                                                        <input id={`ext-grade-${groupIndex}`} placeholder="Harf Notu" style={{ width: '100%', marginBottom: '6px', padding: '4px' }} />

                                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                                            <button
                                                                                type="button"
                                                                                style={{ ...primaryButton, backgroundColor: '#198754', padding: '2px 6px', fontSize: '11px' }}
                                                                                onClick={() => {
                                                                                    const code = document.getElementById(`ext-code-${groupIndex}`).value;
                                                                                    const name = document.getElementById(`ext-name-${groupIndex}`).value;
                                                                                    const sourceCredit = document.getElementById(`ext-credit-${groupIndex}`).value;
                                                                                    const akts = document.getElementById(`ext-akts-${groupIndex}`).value;
                                                                                    const grade = document.getElementById(`ext-grade-${groupIndex}`).value;

                                                                                    addExternalCourseToGroup(app.applicationid, mapping.targetCourse?.courseid, {
                                                                                        code,
                                                                                        name,
                                                                                        sourceCredit,
                                                                                        akts,
                                                                                        grade
                                                                                    });
                                                                                }}
                                                                            >
                                                                                Ekle
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                style={{ ...secondaryButton, marginBottom: 0, padding: '2px 6px', fontSize: '11px' }}
                                                                                onClick={() => setActiveAddExternalRow(null)}
                                                                            >
                                                                                İptal
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        style={{ ...primaryButton, backgroundColor: '#6c757d', width: '100%', marginTop: '6px', fontSize: '11px', padding: '3px' }}
                                                                        onClick={() => setActiveAddExternalRow(groupIndex)}
                                                                    >
                                                                        + Farklı Kaynak Ders Ekle
                                                                    </button>
                                                                )}
                                                            </td>

                                                            {/* Kaynak Kredi */}
                                                            <td
                                                                rowSpan={totalRowsInGroup}
                                                                style={{
                                                                    ...tdStyle,
                                                                    padding: 0,
                                                                    verticalAlign: 'middle',
                                                                    borderTop:
                                                                        groupIndex > 0
                                                                            ? '3px solid #666'
                                                                            : undefined
                                                                }}
                                                            >
                                                                {group.externalCourses.map((course, i) => (
                                                                    <div
                                                                        key={i}
                                                                        style={{
                                                                            height: `${sourceRowHeight}px`,
                                                                            boxSizing: 'border-box',
                                                                            padding: '8px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            borderBottom:
                                                                                i !== group.externalCourses.length - 1
                                                                                    ? '1px solid #ddd'
                                                                                    : 'none'
                                                                        }}
                                                                    >
                                                                        {course.sourceCredit || course.externalcredit || '-'}
                                                                    </div>
                                                                ))}
                                                            </td>

                                                            {/* Kaynak AKTS */}
                                                            <td
                                                                rowSpan={totalRowsInGroup}
                                                                style={{
                                                                    ...tdStyle,
                                                                    padding: 0,
                                                                    verticalAlign: 'middle',
                                                                    borderTop:
                                                                        groupIndex > 0
                                                                            ? '3px solid #666'
                                                                            : undefined
                                                                }}
                                                            >
                                                                {group.externalCourses.map((course, i) => (
                                                                    <div
                                                                        key={i}
                                                                        style={{
                                                                            height: `${sourceRowHeight}px`,
                                                                            boxSizing: 'border-box',
                                                                            padding: '8px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            borderBottom:
                                                                                i !== group.externalCourses.length - 1
                                                                                    ? '1px solid #ddd'
                                                                                    : 'none'
                                                                        }}
                                                                    >
                                                                        {course.akts || course.externalakts || '-'}
                                                                    </div>
                                                                ))}
                                                            </td>

                                                            {/* Harf Notu */}
                                                            <td
                                                                rowSpan={totalRowsInGroup}
                                                                style={{
                                                                    ...tdStyle,
                                                                    padding: 0,
                                                                    verticalAlign: 'middle',
                                                                    borderTop:
                                                                        groupIndex > 0
                                                                            ? '3px solid #666'
                                                                            : undefined
                                                                }}
                                                            >
                                                                {group.externalCourses.map((course, i) => (
                                                                    <div
                                                                        key={i}
                                                                        style={{
                                                                            height: `${sourceRowHeight}px`,
                                                                            boxSizing: 'border-box',
                                                                            padding: '8px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            borderBottom:
                                                                                i !== group.externalCourses.length - 1
                                                                                    ? '1px solid #ddd'
                                                                                    : 'none'
                                                                        }}
                                                                    >
                                                                        {course.grade || course.externalgrade || '-'}
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        </>
                                                    )}

                                                    {/* SAĞ TARAF: HEDEF OMÜ DERSLERİ VE KONTROL ALANLARI */}
                                                    <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                        {mapping.targetCourse?.courseid ? (
                                                            <>
                                                                <div
                                                                    style={{
                                                                        display: 'grid',
                                                                        gridTemplateColumns: '1fr 34px',
                                                                        gap: '6px',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <Select
                                                                        options={courseSelectOptions}
                                                                        placeholder="Hedef OMÜ dersi seç..."
                                                                        isSearchable
                                                                        value={
                                                                            allCourseOptions.find(
                                                                                option => String(option.value) === String(mapping.targetCourse?.courseid)
                                                                            ) || null
                                                                        }
                                                                        onChange={(selectedOption) => {
                                                                            if (!selectedOption) return;
                                                                            updateTargetCourse(mapping.decisionId || mapping.decisionid, selectedOption.value);
                                                                        }}
                                                                        styles={selectStyle}
                                                                    />

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteTargetCourseDecision(mapping.decisionId || mapping.decisionid)}
                                                                        title="Bu hedef dersi kaldır"
                                                                        style={{
                                                                            width: '34px',
                                                                            height: '34px',
                                                                            border: 'none',
                                                                            borderRadius: '5px',
                                                                            background: 'transparent',
                                                                            color: '#dc3545',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <></>
                                                        )}

                                                        {rowIndex === totalRowsInGroup - 1 && (
                                                            <div style={{ marginTop: '12px', borderTop: '2px dashed #004a99', paddingTop: '10px' }}>
                                                                {activeAddRow === groupIndex ? (
                                                                    <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                                                        <Select
                                                                            options={courseSelectOptions}
                                                                            placeholder="Ek OMÜ dersi seç..."
                                                                            isSearchable
                                                                            onChange={(selectedOption) => {
                                                                                window[`extraTarget_${mapping.decisionId}`] = selectedOption?.value || '';
                                                                            }}
                                                                            styles={selectStyle}
                                                                        />

                                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                                            <button
                                                                                type="button"
                                                                                style={{ ...primaryButton, backgroundColor: '#198754', flex: 1 }}
                                                                                onClick={() => {
                                                                                    const extraTargetId = window[`extraTarget_${mapping.decisionId}`];
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
                                                        {mapping.targetCourse?.courseid ? (
                                                            <>
                                                                <select
                                                                    value={decisionEdits[mapping.decisionId]?.finalGrade || ''}
                                                                    onChange={(e) =>
                                                                        handleDecisionEditChange(mapping.decisionId, 'finalGrade', e.target.value)
                                                                    }
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
                                                            </>
                                                        ) : (
                                                            <span style={{ color: '#999' }}>-</span>
                                                        )}
                                                    </td>

                                                    {rowIndex === 0 && (
                                                        <td
                                                            rowSpan={totalRowsInGroup}
                                                            style={{
                                                                ...tdStyle,
                                                                textAlign: 'center',
                                                                verticalAlign: 'middle'
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteMappingGroup(group)}
                                                                style={{
                                                                    background: 'transparent',
                                                                    color: '#dc3545',
                                                                    border: '1px solid #dc3545',
                                                                    borderRadius: '4px',
                                                                    padding: '5px 8px',
                                                                    fontSize: '11px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Eşleşmeyi Sil
                                                            </button>
                                                        </td>
                                                    )}


                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </table>

                                <div style={{
                                    marginTop: '20px',
                                    padding: '15px',
                                    border: '1px dashed #004a99',
                                    borderRadius: '6px',
                                    background: '#f8f9fa'
                                }}>
                                    {!emptyMappingFormOpen ? (
                                        <button
                                            type="button"
                                            onClick={() => setEmptyMappingFormOpen(true)}
                                            style={{
                                                ...primaryButton,
                                                backgroundColor: '#198754'
                                            }}
                                        >
                                            + Yeni Eşleşme Satırı Ekle
                                        </button>
                                    ) : (
                                        <div>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr',
                                                gap: '8px',
                                                marginBottom: '10px'
                                            }}>
                                                <input
                                                    id="new-ext-code"
                                                    placeholder="Kaynak Ders Kodu"
                                                    style={{ padding: '8px' }}
                                                />

                                                <input
                                                    id="new-ext-name"
                                                    placeholder="Kaynak Ders Adı"
                                                    style={{ padding: '8px' }}
                                                />

                                                <input
                                                    id="new-ext-credit"
                                                    type="number"
                                                    placeholder="Kaynak Kredi"
                                                    style={{ padding: '8px' }}
                                                />

                                                <input
                                                    id="new-ext-akts"
                                                    type="number"
                                                    placeholder="Kaynak AKTS"
                                                    style={{ padding: '8px' }}
                                                />

                                                <select
                                                    id="new-ext-grade"
                                                    defaultValue=""
                                                    style={{ padding: '8px' }}
                                                >
                                                    <option value="">Harf Notu</option>
                                                    <option value="AA">AA</option>
                                                    <option value="BA">BA</option>
                                                    <option value="BB">BB</option>
                                                    <option value="CB">CB</option>
                                                    <option value="CC">CC</option>
                                                    <option value="DC">DC</option>
                                                    <option value="DD">DD</option>
                                                    <option value="FF">FF</option>
                                                </select>
                                            </div>

                                            <Select
                                                options={courseSelectOptions}
                                                placeholder="Hedef OMÜ dersi seç..."
                                                isSearchable
                                                onChange={(selectedOption) => {
                                                    window.newTargetCourseId = selectedOption?.value || '';
                                                }}
                                                styles={selectStyle}
                                            />

                                            <button
                                                type="button"
                                                onClick={addNewMappingFromEmptyState}
                                                style={{
                                                    ...primaryButton,
                                                    backgroundColor: '#198754',
                                                    marginRight: '8px'
                                                }}
                                            >
                                                Eşleşmeyi Ekle
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setEmptyMappingFormOpen(false)}
                                                style={secondaryButton}
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                    <button
                                        type="button"
                                        onClick={saveAllDecisions}
                                        style={{
                                            padding: '12px 22px',
                                            backgroundColor: '#198754',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Tüm Kararları Kaydet
                                    </button>
                                </div>
                            </>

                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <Header
                userName={currentUser?.fullname || 'Yükleniyor...'}
                userRole={currentUser?.department || 'Bölüm Yetkilisi'}
                panelTitle="Bölüm Yetkilisi Yönetim Paneli"
                onLogout={handleLogout}
            />
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
// ... (Mevcut stillerinizin altına ekleyin)

const headerCardStyle = {
    backgroundColor: 'white',
    padding: '20px 25px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto 20px auto' // Ortalama ve alt boşluk
};

const headerLeftStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
};

const userInfoBoxStyle = {
    border: '1px solid #eee',
    borderRadius: '6px',
    padding: '12px 15px',
    backgroundColor: '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    minWidth: '250px'
};

const logoutBtnStyle = {
    marginTop: '10px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
};

const headerBannerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '15px 25px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    maxWidth: '1200px',
    margin: '0 auto 20px auto'
};

const selectStyle = {
    control: (base) => ({
        ...base,
        minHeight: '38px',
        borderColor: '#ccc',
        fontSize: '13px'
    }),
    menu: (base) => ({
        ...base,
        zIndex: 9999
    })
};

export default TeacherDashboard;