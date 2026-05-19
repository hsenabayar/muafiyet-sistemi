import React, { useState, useEffect } from 'react';
import api from '../api';

const ExemptionForm = () => {
    const [curriculum, setCurriculum] = useState([]);
    const [targetCourseId, setTargetCourseId] = useState('');
    const [externalCourses, setExternalCourses] = useState([
        { code: '', name: '', sourceCredit: '', grade: '', akts: '' }
    ]);

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
    const [warnings, setWarnings] = useState([]);
    const [selectionWarning, setSelectionWarning] = useState('');
    const [submittedApplication, setSubmittedApplication] = useState(null);
    const [transcriptFile, setTranscriptFile] = useState(null);
    const [curriculumFile, setCurriculumFile] = useState(null);
    const [internshipFile, setInternshipFile] = useState(null);

    useEffect(() => {
        api.get('/applications/curriculum')
            .then(res => {
                console.log("Müfredat verisi:", res.data.data);
                setCurriculum(res.data.data);
            })
            .catch(err => console.error("Dersler yüklenemedi", err));

        api.get('/applications/my-latest')
            .then(res => {
                console.log("Son başvuru:", res.data);

                if (res.data.status === "success") {
                    const app = res.data.data.application;
                    const mappings = res.data.data.mappings;
                    const attachments = res.data.data.attachments || [];

                    setApplicationId(app.applicationid);

                    setSubmittedApplication({
                        applicationId: app.applicationid,
                        status: app.status || 'Komisyona Gönderildi',
                        student: {
                            studentNo: app.studentno || app.studentnumber || '',
                            studentName: app.studentname || app.fullname || '',
                            tcNo: app.tcno || app.tckimlikno || '',
                            faculty: app.faculty || '',
                            department: app.department || '',
                            program: app.program || ''
                        },
                        application: {
                            academicYear: app.academicyear,
                            semester: app.semester,
                            exemptionReason: app.exemptionreason,
                            sourceUniversity: app.sourceuniversity,
                            sourceFaculty: app.sourcefaculty,
                            sourceDepartment: app.sourcedepartment,
                            intakeNote: app.intakenote
                        },
                        mappings,
                        documents: {
                            attachments
                        },
                        totalTargetAkts: mappings.reduce(
                            (sum, item) => sum + (Number(item.targetCourse?.akts) || 0),
                            0
                        ),
                        totalTargetCredit: mappings.reduce(
                            (sum, item) => sum + (Number(item.targetCourse?.localcredit) || 0),
                            0
                        )
                    });
                }
            })
            .catch(err => {
                console.error("Son başvuru alınamadı:", err.response?.data || err.message);
            });
    }, []);

    const selectedOMUCourse = curriculum.find(
        c => String(c.courseid) === String(targetCourseId)
    );

    const normalizeCode = (code) => {
        return String(code || '')
            .trim()
            .toUpperCase()
            .replaceAll('İ', 'I');
    };

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

    const getPrerequisite = (course) => {
        return (
            course?.prerequisitecode ||
            course?.prerequisite ||
            course?.precondition ||
            course?.onkosul ||
            ''
        );
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

    const addExternalRow = () => {
        setExternalCourses([
            ...externalCourses,
            { code: '', name: '', sourceCredit: '', grade: '', akts: '' }
        ]);
    };

    const removeExternalRow = (index) => {
        if (externalCourses.length === 1) {
            alert("En az bir kaynak ders bulunmalıdır.");
            return;
        }

        setExternalCourses(externalCourses.filter((_, i) => i !== index));
    };

    const createApplication = async () => {
        if (!academicYear || !semester || !exemptionReason || !sourceUniversity) {
            alert("Lütfen başvuru bilgilerini eksiksiz doldurunuz.");
            return;
        }

        try {
            const appRes = await api.post('/applications/create', {
                academicYear,
                semester,
                exemptionReason,
                sourceUniversity,
                sourceFaculty,
                sourceDepartment,
                intakeNote,
                studentNo,
                studentName,
                tcNo,
                faculty,
                department,
                program
            });

            setApplicationId(res.data.applicationId || res.data.data?.applicationId);
            alert("Başvuru taslağı oluşturuldu.");
        } catch (err) {
            alert(err.response?.data?.message || "Başvuru taslağı oluşturulamadı.");
        }
    };

    const checkWarnings = (newMapping) => {
        const warningList = [];
        const allMappings = [...savedMappings, newMapping];

        const packageCounts = {};

        allMappings.forEach(item => {
            const packageName = getPackageName(item.targetCourse);

            if (packageName) {
                packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;
            }
        });

        Object.keys(packageCounts).forEach(packageName => {
            if (packageCounts[packageName] > 1) {
                warningList.push(
                    `Aynı seçmeli paketten birden fazla ders seçildi: ${packageName}. Nihai karar komisyon tarafından verilmelidir.`
                );
            }
        });

        const prerequisite = getPrerequisite(newMapping.targetCourse);

        if (prerequisite) {
            const prerequisiteList = prerequisite
                .split(',')
                .map(p => p.trim())
                .filter(Boolean);

            const missingPrerequisites = prerequisiteList.filter(prereq =>
                !savedMappings.some(mapping =>
                    normalizeCode(mapping.targetCourse?.coursecode) === normalizeCode(prereq)
                )
            );

            if (missingPrerequisites.length > 0) {
                warningList.push(
                    `${newMapping.targetCourse?.coursecode} - ${getCleanCourseName(newMapping.targetCourse?.coursename)} dersi için ön koşul bulunmaktadır. Eksik ön koşullar: ${missingPrerequisites.join(', ')}.`
                );
            }
        }

        return warningList;
    };

    const handleAddMapping = async (e) => {
        e.preventDefault();



        if (!targetCourseId) {
            alert("Lütfen hedef OMÜ dersini seçiniz.");
            return;
        }

        const hasEmptyCourse = externalCourses.some(course =>
            !course.code || !course.name || !course.akts || !course.grade
        );

        if (hasEmptyCourse) {
            alert("Lütfen kaynak ders kodu, ders adı, AKTS ve not alanlarını doldurunuz.");
            return;
        }

        const prerequisite = getPrerequisite(selectedOMUCourse);

        if (prerequisite) {
            const prerequisiteList = prerequisite
                .split(',')
                .map(p => p.trim())
                .filter(Boolean);

            const missingPrerequisites = prerequisiteList.filter(prereq =>
                !savedMappings.some(mapping =>
                    normalizeCode(mapping.targetCourse?.coursecode) === normalizeCode(prereq)
                )
            );

            if (missingPrerequisites.length > 0) {
                const continueAdd = window.confirm(
                    `${selectedOMUCourse?.coursecode} - ${getCleanCourseName(selectedOMUCourse?.coursename)} dersi için ön koşul bulunmaktadır.\n\n` +
                    `Eksik ön koşullar: ${missingPrerequisites.join(', ')}\n\n` +
                    `Sistem seçimi engellemez; nihai karar komisyon tarafından verilecektir.\n\n` +
                    `Yine de taslağa eklemek istiyor musunuz?`
                );

                if (!continueAdd) {
                    return;
                }
            }
        }

        const newMapping = {
            targetCourse: selectedOMUCourse,
            targetCourseId,
            externalCourses: [...externalCourses]
        };

        setSavedMappings([
            ...savedMappings,
            newMapping
        ]);

        setWarnings(checkWarnings(newMapping));

        alert("Ders eşleştirmesi başvuruya eklendi.");

        setTargetCourseId('');
        setSelectionWarning('');
        setExternalCourses([
            { code: '', name: '', sourceCredit: '', grade: '', akts: '' }
        ]);
    };

    const removeMapping = (index) => {
        const newMappings = savedMappings.filter((_, i) => i !== index);

        setSavedMappings(newMappings);

        const updatedWarnings = [];

        // Aynı paket uyarılarını yeniden hesapla
        const packageCounts = {};

        newMappings.forEach(item => {
            const packageName = getPackageName(item.targetCourse);

            if (packageName) {
                packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;
            }
        });

        Object.keys(packageCounts).forEach(packageName => {
            if (packageCounts[packageName] > 1) {
                updatedWarnings.push(
                    `Aynı seçmeli paketten birden fazla ders seçildi: ${packageName}. Nihai karar komisyon tarafından verilmelidir.`
                );
            }
        });

        setWarnings(updatedWarnings);
    };

    const openFilePreview = (file) => {
        if (!file) {
            alert("Dosya seçilmedi.");
            return;
        }

        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
    };

    const submitApplication = async () => {
        if (!academicYear || !semester || !exemptionReason || !sourceUniversity) {
            alert("Lütfen başvuru bilgilerini eksiksiz doldurunuz.");
            return;
        }

        if (savedMappings.length === 0) {
            alert("Başvuruyu göndermeden önce en az bir ders eşleştirmesi eklemelisiniz.");
            return;
        }

        if (!transcriptFile) {
            alert("Lütfen transkript / not durum belgesini yükleyiniz.");
            return;
        }

        if (!curriculumFile) {
            alert("Lütfen onaylı müfredat ve ders içerikleri belgesini yükleyiniz.");
            return;
        }

        try {
            const appRes = await api.post('/applications/create', {
                academicYear,
                semester,
                exemptionReason,
                sourceUniversity,
                sourceFaculty,
                sourceDepartment,
                intakeNote,

                studentNo,
                studentName,
                tcNo,
                faculty,
                department,
                program
            });

            const newApplicationId =
                appRes.data.applicationId || appRes.data.data?.applicationId;

            for (const mapping of savedMappings) {
                await api.post('/applications/add-course', {
                    applicationId: newApplicationId,
                    targetCourseId: mapping.targetCourseId || mapping.targetCourse?.courseid,
                    externalCourses: mapping.externalCourses
                });
            }

            setApplicationId(newApplicationId);

            const formData = new FormData();
            formData.append('applicationId', newApplicationId);

            if (transcriptFile) {
                formData.append('transcript', transcriptFile);
            }

            if (curriculumFile) {
                formData.append('curriculum', curriculumFile);
            }

            if (internshipFile) {
                formData.append('internship', internshipFile);
            }

            await api.post('/applications/upload-documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSubmittedApplication({
                applicationId: newApplicationId,
                status: 'Komisyona Gönderildi',
                student: {
                    studentNo,
                    studentName,
                    tcNo,
                    faculty,
                    department,
                    program
                },
                application: {
                    academicYear,
                    semester,
                    exemptionReason,
                    sourceUniversity,
                    sourceFaculty,
                    sourceDepartment,
                    intakeNote
                },
                mappings: savedMappings,
                documents: {
                    transcript: transcriptFile,
                    curriculum: curriculumFile,
                    internship: internshipFile
                },
                totalTargetAkts,
                totalTargetCredit
            });

            alert("Başvuru başarıyla komisyona gönderildi.");
        } catch (err) {
            alert(err.response?.data?.message || "Başvuru gönderilirken bir hata oluştu.");
        }
    };

    const totalTargetCredit = savedMappings.reduce(
        (sum, item) => sum + (Number(item.targetCourse?.localcredit) || 0),
        0
    );

    const totalTargetAkts = savedMappings.reduce(
        (sum, item) => sum + (Number(item.targetCourse?.akts) || 0),
        0
    );

    const inputStyle = {
        width: '100%',
        padding: '9px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box'
    };

    const sectionStyle = {
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    };

    const labelStyle = {
        fontWeight: 'bold',
        display: 'block',
        marginBottom: '5px'
    };

    const gridTwo = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
    };

    if (submittedApplication) {
        return (
            <div style={{ backgroundColor: '#f4f4f4', minHeight: '100vh', padding: '25px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ color: '#198754', marginBottom: '5px' }}>
                            Başvurunuz Komisyona Gönderildi
                        </h2>
                        <p style={{ color: '#666' }}>
                            Başvuru No: {submittedApplication.applicationId}
                        </p>
                    </div>

                    <div style={sectionStyle}>
                        <h3>Başvuru Durumu</h3>

                        <div style={{
                            padding: '15px',
                            backgroundColor: '#e7f3ff',
                            border: '1px solid #b6d4fe',
                            borderRadius: '6px',
                            marginBottom: '15px'
                        }}>
                            <strong>Güncel Durum:</strong> {submittedApplication.status}
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ padding: '10px', background: '#d1e7dd', borderRadius: '6px' }}>
                                1. Başvuru Gönderildi
                            </div>
                            <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '6px' }}>
                                2. Komisyon İncelemesinde
                            </div>
                            <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                                3. Karar Verildi
                            </div>

                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <h3>Öğrenci Bilgileri</h3>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Öğrenci No</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.student.studentNo}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Ad Soyad</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.student.studentName}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>T.C. Kimlik No</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.student.tcNo}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Fakülte</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.student.faculty}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Bölüm</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.student.department}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Program</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.student.program}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={sectionStyle}>
                        <h3>Başvuru Bilgileri</h3>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Akademik Yıl</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.application.academicYear}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Yarıyıl</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.application.semester}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Muafiyet Gerekçesi</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.application.exemptionReason}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Önceki Üniversite</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.application.sourceUniversity}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Önceki Fakülte</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.application.sourceFaculty}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Önceki Bölüm</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{submittedApplication.application.sourceDepartment}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={sectionStyle}>
                        <h3>Seçilen Dersler</h3>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f1f1f1' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>#</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kaynak Ders</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kaynak Kredi</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kaynak AKTS</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Harf Notu</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Hedef OMÜ Dersi</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>OMÜ Kredi</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>OMÜ AKTS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submittedApplication.mappings.map((mapping, index) => (
                                    <tr key={index}>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.code} - {course.name}</div>
                                            ))}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.sourceCredit || '-'}</div>
                                            ))}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.akts || '-'}</div>
                                            ))}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.grade || '-'}</div>
                                            ))}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            {mapping.targetCourse?.coursecode} - {getCleanCourseName(mapping.targetCourse?.coursename)}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.targetCourse?.localcredit || '-'}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.targetCourse?.akts || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{
                            marginTop: '15px',
                            padding: '12px',
                            background: '#f8f9fa',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}>
                            <strong>Toplam Talep Edilen OMÜ Kredi:</strong> {submittedApplication.totalTargetCredit}
                            <br />
                            <strong>Toplam Talep Edilen OMÜ AKTS:</strong> {submittedApplication.totalTargetAkts}
                        </div>
                    </div>
                    <div style={sectionStyle}>
                        <h3>Yüklenen Belgeler</h3>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f1f1f1' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Belge Türü</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Dosya Adı</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Transkript / Not Durum Belgesi</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        {submittedApplication.documents?.transcript?.name || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                        {submittedApplication.documents?.transcript ? (
                                            <button
                                                type="button"
                                                onClick={() => openFilePreview(submittedApplication.documents.transcript)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: '#004a99',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Görüntüle
                                            </button>
                                        ) : '-'}
                                    </td>
                                </tr>

                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Onaylı Müfredat ve Ders İçerikleri</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        {submittedApplication.documents?.curriculum?.name || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                        {submittedApplication.documents?.curriculum ? (
                                            <button
                                                type="button"
                                                onClick={() => openFilePreview(submittedApplication.documents.curriculum)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: '#004a99',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Görüntüle
                                            </button>
                                        ) : '-'}
                                    </td>
                                </tr>

                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Transkriptte Yoksa Staj Durumunu Gösteren Belge</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        {submittedApplication.documents?.internship?.name || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                        {submittedApplication.documents?.internship ? (
                                            <button
                                                type="button"
                                                onClick={() => openFilePreview(submittedApplication.documents.internship)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: '#004a99',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Görüntüle
                                            </button>
                                        ) : '-'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#f4f4f4', minHeight: '100vh', padding: '25px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{
                    textAlign: 'center',
                    backgroundColor: 'white',
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ margin: '4px' }}>T.C. ONDOKUZ MAYIS ÜNİVERSİTESİ</h3>
                    <h2 style={{ margin: '4px', color: '#004a99' }}>Ders Saydırma ve Muafiyet Sistemi</h2>
                    <p style={{ margin: '4px', color: '#666' }}>Yeni Muafiyet Başvurusu</p>
                </div>

                <form onSubmit={handleAddMapping}>
                    <div style={sectionStyle}>
                        <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>
                            1. Öğrenci Bilgileri
                        </h3>

                        <div style={gridTwo}>
                            <div>
                                <label style={labelStyle}>Öğrenci No</label>
                                <input style={inputStyle} value={studentNo} onChange={(e) => setStudentNo(e.target.value)} />
                            </div>

                            <div>
                                <label style={labelStyle}>Adı Soyadı</label>
                                <input style={inputStyle} value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                            </div>

                            <div>
                                <label style={labelStyle}>T.C. Kimlik No</label>
                                <input style={inputStyle} value={tcNo} onChange={(e) => setTcNo(e.target.value)} />
                            </div>

                            <div>
                                <label style={labelStyle}>Fakülte / YO / MYO</label>
                                <input style={inputStyle} value={faculty} onChange={(e) => setFaculty(e.target.value)} />
                            </div>

                            <div>
                                <label style={labelStyle}>Bölüm</label>
                                <input style={inputStyle} value={department} onChange={(e) => setDepartment(e.target.value)} />
                            </div>

                            <div>
                                <label style={labelStyle}>Program</label>
                                <input style={inputStyle} value={program} onChange={(e) => setProgram(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>
                            2. Başvuru Bilgileri
                        </h3>

                        <div style={gridTwo}>
                            <div>
                                <label style={labelStyle}>Akademik Yıl</label>
                                <input
                                    style={inputStyle}
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    placeholder="Örn: 2025-2026"
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Yarıyıl</label>
                                <select style={inputStyle} value={semester} onChange={(e) => setSemester(e.target.value)}>
                                    <option value="">Yarıyıl seçin...</option>
                                    <option value="Güz">Güz</option>
                                    <option value="Bahar">Bahar</option>
                                    <option value="Yaz">Yaz</option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Muafiyet Gerekçesi</label>
                                <select style={inputStyle} value={exemptionReason} onChange={(e) => setExemptionReason(e.target.value)}>
                                    <option value="">Muafiyet gerekçesi seçin...</option>
                                    <option value="Yatay Geçiş">Yatay Geçiş</option>
                                    <option value="Dikey Geçiş">Dikey Geçiş</option>
                                    <option value="ÖSYM ile Yerleşme">ÖSYM ile Yerleşme</option>
                                    <option value="Yaz Okulu">Yaz Okulu</option>
                                    <option value="Diğer">Diğer</option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Daha Önce Okuduğu Üniversite</label>
                                <input
                                    style={inputStyle}
                                    value={sourceUniversity}
                                    onChange={(e) => setSourceUniversity(e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Önceki Fakülte / Yüksekokul</label>
                                <input
                                    style={inputStyle}
                                    value={sourceFaculty}
                                    onChange={(e) => setSourceFaculty(e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Önceki Bölüm / Program</label>
                                <input
                                    style={inputStyle}
                                    value={sourceDepartment}
                                    onChange={(e) => setSourceDepartment(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            <label style={labelStyle}>Açıklama / İntibak Notu</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '80px' }}
                                value={intakeNote}
                                onChange={(e) => setIntakeNote(e.target.value)}
                                placeholder="Örn: Öğrencinin intibakı 2. sınıf 3. yarıyıla yapılacaktır."
                            />
                        </div>


                    </div>

                    <div style={sectionStyle}>
                        <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>
                            3. Ders Eşleştirme
                        </h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Hedef OMÜ Dersi</label>
                            <select
                                style={inputStyle}
                                value={targetCourseId}
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    setTargetCourseId(selectedId);

                                    const selectedCourse = curriculum.find(
                                        c => String(c.courseid) === String(selectedId)
                                    );

                                    const selectedPackage = getPackageName(selectedCourse);

                                    if (selectedPackage) {
                                        const alreadySelected = savedMappings.find(mapping =>
                                            getPackageName(mapping.targetCourse) === selectedPackage
                                        );

                                        if (alreadySelected) {
                                            setSelectionWarning(
                                                `${selectedPackage} paketinden daha önce "${getCleanCourseName(alreadySelected.targetCourse?.coursename)}" dersini seçtiniz. Aynı seçmeli paketten ikinci ders seçiyorsunuz. Nihai karar komisyon tarafından verilecektir.`
                                            );
                                        } else {
                                            setSelectionWarning('');
                                        }
                                    } else {
                                        setSelectionWarning('');
                                    }
                                }}
                            >
                                <option value="">Müfredattan ders seçin...</option>
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

                            {selectionWarning && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '10px',
                                    background: '#fff3cd',
                                    border: '1px solid #ffecb5',
                                    borderRadius: '4px',
                                    color: '#664d03'
                                }}>
                                    ⚠ {selectionWarning}
                                </div>
                            )}
                        </div>

                        <h4>Kaynak Dersler</h4>

                        {externalCourses.map((course, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr auto',
                                    gap: '8px',
                                    marginBottom: '10px',
                                    padding: '10px',
                                    background: '#f9f9f9',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    alignItems: 'center'
                                }}
                            >
                                <input
                                    style={inputStyle}
                                    placeholder="Kod"
                                    value={course.code}
                                    onChange={e => {
                                        const newCourses = [...externalCourses];
                                        newCourses[index].code = e.target.value;
                                        setExternalCourses(newCourses);
                                    }}
                                />

                                <input
                                    style={inputStyle}
                                    placeholder="Ders adı"
                                    value={course.name}
                                    onChange={e => {
                                        const newCourses = [...externalCourses];
                                        newCourses[index].name = e.target.value;
                                        setExternalCourses(newCourses);
                                    }}
                                />

                                <input
                                    style={inputStyle}
                                    type="number"
                                    placeholder="Kredi"
                                    value={course.sourceCredit}
                                    onChange={e => {
                                        const newCourses = [...externalCourses];
                                        newCourses[index].sourceCredit = e.target.value;
                                        setExternalCourses(newCourses);
                                    }}
                                />

                                <input
                                    style={inputStyle}
                                    type="number"
                                    placeholder="AKTS"
                                    value={course.akts}
                                    onChange={e => {
                                        const newCourses = [...externalCourses];
                                        newCourses[index].akts = e.target.value;
                                        setExternalCourses(newCourses);
                                    }}
                                />

                                <select
                                    style={inputStyle}
                                    value={course.grade}
                                    onChange={e => {
                                        const newCourses = [...externalCourses];
                                        newCourses[index].grade = e.target.value;
                                        setExternalCourses(newCourses);
                                    }}
                                >
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

                                <button
                                    type="button"
                                    onClick={() => removeExternalRow(index)}
                                    style={{
                                        padding: '8px',
                                        background: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Sil
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addExternalRow}
                            style={{
                                padding: '9px 14px',
                                background: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginRight: '10px'
                            }}
                        >
                            + Kaynak Ders Ekle
                        </button>

                        <button
                            type="submit"
                            style={{
                                padding: '9px 14px',
                                background: '#004a99',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Eşleştirmeyi Taslağa Ekle
                        </button>
                    </div>
                </form>

                <div style={sectionStyle}>
                    <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>
                        4. Eklenen Ders Eşleştirmeleri
                    </h3>

                    {savedMappings.length === 0 ? (
                        <p style={{ color: '#777' }}>Henüz ders eşleştirmesi eklenmedi.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f1f1f1' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>#</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kaynak Ders</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kaynak Kredi</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kaynak AKTS</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Harf Notu</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Hedef OMÜ Dersi</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>OMÜ Kredi</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>OMÜ AKTS</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>İşlem</th>

                                </tr>
                            </thead>

                            <tbody>
                                {savedMappings.map((mapping, index) => (
                                    <tr key={index}>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {index + 1}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.code} - {course.name}</div>
                                            ))}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.sourceCredit || '-'}</div>
                                            ))}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.akts || '-'}</div>
                                            ))}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                                            {mapping.externalCourses.map((course, i) => (
                                                <div key={i}>{course.grade || '-'}</div>
                                            ))}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            {mapping.targetCourse?.coursecode} - {getCleanCourseName(mapping.targetCourse?.coursename)}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.targetCourse?.localcredit || '-'}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            {mapping.targetCourse?.akts || '-'}
                                        </td>

                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => removeMapping(index)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Sil
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div style={{
                        marginTop: '15px',
                        padding: '12px',
                        background: '#f8f9fa',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                    }}>
                        <strong>Toplam Eşleştirme Sayısı:</strong> {savedMappings.length}
                        <br />
                        <strong>Toplam Talep Edilen OMÜ AKTS:</strong> {totalTargetAkts}
                        <br />
                        <strong>Toplam Talep Edilen OMÜ Kredi:</strong> {totalTargetCredit}

                        {warnings.length > 0 && (
                            <div style={{
                                marginTop: '15px',
                                padding: '12px',
                                background: '#fff3cd',
                                border: '1px solid #ffecb5',
                                borderRadius: '4px',
                                color: '#664d03'
                            }}>
                                <strong>Sistem Uyarıları</strong>
                                <ul style={{ marginBottom: 0 }}>
                                    {warnings.map((warning, index) => (
                                        <li key={index}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div style={sectionStyle}>
                    <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>
                        5. Belgeler
                    </h3>

                    <p style={{ color: '#666' }}>
                        Muafiyet başvurusu için gerekli belgeleri aşağıdan yükleyiniz.
                    </p>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={labelStyle}>
                            1. Transkript / Not Durum Belgesi
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            style={inputStyle}
                            onChange={(e) => setTranscriptFile(e.target.files[0])}
                        />
                        {transcriptFile && (
                            <div style={{ marginTop: '8px', color: '#198754' }}>
                                Seçilen dosya: {transcriptFile.name}
                                <button
                                    type="button"
                                    onClick={() => openFilePreview(transcriptFile)}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '5px 10px',
                                        background: '#004a99',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Görüntüle
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={labelStyle}>
                            2. Onaylı Müfredat ve Ders İçerikleri
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            style={inputStyle}
                            onChange={(e) => setCurriculumFile(e.target.files[0])}
                        />
                        {curriculumFile && (
                            <div style={{ marginTop: '8px', color: '#198754' }}>
                                Seçilen dosya: {curriculumFile.name}
                                <button
                                    type="button"
                                    onClick={() => openFilePreview(curriculumFile)}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '5px 10px',
                                        background: '#004a99',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Görüntüle
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={labelStyle}>
                            3. Staj Durumunu Gösteren Belge
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            style={inputStyle}
                            onChange={(e) => setInternshipFile(e.target.files[0])}
                        />
                        {internshipFile && (
                            <div style={{ marginTop: '8px', color: '#198754' }}>
                                Seçilen dosya: {internshipFile.name}
                                <button
                                    type="button"
                                    onClick={() => openFilePreview(internshipFile)}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '5px 10px',
                                        background: '#004a99',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Görüntüle
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{
                        padding: '10px',
                        background: '#fff3cd',
                        border: '1px solid #ffecb5',
                        borderRadius: '4px',
                        color: '#664d03'
                    }}>
                        Not: Transkript ve ders içerikleri zorunludur. Staj belgesi yalnızca transkriptte staj bilgisi yoksa yüklenmelidir.
                    </div>
                </div>

                <div style={sectionStyle}>



                    <button
                        type="button"
                        onClick={submitApplication}
                        style={{
                            width: '100%',
                            padding: '13px',
                            background: '#198754',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '15px'
                        }}
                    >
                        Başvuruyu Komisyona Gönder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExemptionForm;