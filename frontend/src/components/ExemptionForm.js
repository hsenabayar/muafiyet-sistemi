import React, { useState, useEffect } from 'react';
import api from '../api';
import { User, LogOut } from 'lucide-react';
import Select from 'react-select';

const ExemptionForm = () => {
    const [curriculum, setCurriculum] = useState([]);
    const [targetCourseIds, setTargetCourseIds] = useState([]);
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
    const [currentUser, setCurrentUser] = useState(null);


    useEffect(() => {
        api.get('/auth/me')
            .then(res => {
                const user = res.data;
                setCurrentUser(user);
                // PostgreSQL sütun isimleri genellikle küçük harfle döner
                setStudentNo(user.studentnumber || user.StudentNumber || '');
                setStudentName(user.fullname || user.FullName || '');
                setTcNo(user.tckimlikno || user.TCKimlikNo || '');
                setFaculty(user.faculty || user.Faculty || 'Mühendislik Fakültesi');
                setDepartment(user.department || user.Department || 'Bilgisayar Mühendisliği');
                setProgram(user.program || user.Program || 'Lisans');
            })
            .catch(err => console.error("Öğrenci bilgileri alınamadı:", err));

        api.get('/curriculum')
            .then(res => {
                setCurriculum(res.data || []);
            })
            .catch(err => {
                console.error("Dersler yüklenemedi:", err);
            });

        api.get('/applications/my-latest')
            .then(res => {
                console.log("Son başvuru:", res.data);

                if (res.data.status === "success") {
                    const app = res.data.data.application;
                    const mappings = res.data.data.mappings || [];
                    const attachments = res.data.data.attachments || [];

                    if (app.status === 'Taslak') {
                        setSubmittedApplication(null);
                        setApplicationId(app.applicationid);

                        setAcademicYear(app.academicyear || '');
                        setSemester(app.semester || '');
                        setExemptionReason(app.exemptionreason || '');
                        setSourceUniversity(app.sourceuniversity || '');
                        setSourceFaculty(app.sourcefaculty || '');
                        setSourceDepartment(app.sourcedepartment || '');
                        setIntakeNote(app.intakenote || '');
                        setSavedMappings(mappings || []);

                        setWarnings(generateWarnings(mappings || []));

                        setWarnings([...new Set(restoredWarnings)]);

                        return;
                    }

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
                            academicYear: app.academicyear || '',
                            semester: app.semester || '',
                            exemptionReason: app.exemptionreason || '',
                            sourceUniversity: app.sourceuniversity || '',
                            sourceFaculty: app.sourcefaculty || '',
                            sourceDepartment: app.sourcedepartment || '',
                            intakeNote: app.intakenote || ''
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


    const selectedOMUCourses = curriculum.filter(
        c => targetCourseIds.map(String).includes(String(c.courseid))
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

    const getDecisionText = (isApproved) => {
        if (isApproved === true) return 'Onaylandı';
        if (isApproved === false) return 'Reddedildi';
        return 'Beklemede';
    };

    const getDecisionColor = (isApproved) => {
        if (isApproved === true) return '#198754';
        if (isApproved === false) return '#dc3545';
        return '#856404';
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
    };

    const getUploadedFileUrl = (filePath) => {
        const cleanPath = String(filePath || '')
            .replaceAll('\\', '/')
            .replace(/^.*uploads\//, 'uploads/');

        return `http://localhost:5000/${cleanPath}`;
    };

    const getOverallApplicationStatus = (mappings = [], applicationStatus = '') => {
        if (applicationStatus === 'Başvuru Sonuçlandı: Olumsuz') {
            return 'Başvuru Sonuçlandı: Olumsuz';
        }

        if (applicationStatus === 'Başvuru Sonuçlandı: Olumlu') {
            return 'Başvuru Sonuçlandı: Olumlu';
        }

        if (!mappings || mappings.length === 0) {
            return 'Komisyona Gönderildi';
        }

        const allPending = mappings.every(
            m => m.isApproved === null || m.isApproved === undefined
        );

        if (allPending) {
            return 'Komisyon İncelemesinde';
        }

        return 'Başvuru Sonuçlandı: Olumlu';
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

    const getGroupedSubmittedMappings = (mappings = []) => {
        const groups = {};

        mappings.forEach(mapping => {
            const externalKey = (mapping.externalCourses || [])
                .map(c => `${c.code || ''}-${c.name || ''}`)
                .join('|');

            if (!groups[externalKey]) {
                groups[externalKey] = {
                    externalCourses: mapping.externalCourses || [],
                    targetMappings: []
                };
            }

            groups[externalKey].targetMappings.push(mapping);
        });

        return Object.values(groups);
    };

    const courseSelectOptions = Object.keys(groupedCurriculum).flatMap(groupName => [
        {
            label: groupName,
            options: groupedCurriculum[groupName].map(c => ({
                value: c.courseid,
                label: `[${c.coursecode}] ${getCleanCourseName(c.coursename)} - Kredi: ${c.localcredit || '-'} - ${c.akts} AKTS`
            }))
        }
    ]);

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

    const saveDraft = async () => {
        if (!academicYear || !semester || !exemptionReason || !sourceUniversity) {
            alert("Taslak kaydetmek için başvuru bilgilerini doldurunuz.");
            return;
        }

        try {
            const appRes = await api.post('/applications/save-draft', {
                applicationId,
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
                program,
                mappings: savedMappings
            });

            const draftApplicationId =
                appRes.data.applicationId || appRes.data.data?.applicationId;

            setApplicationId(draftApplicationId);

            const formData = new FormData();
            formData.append('applicationId', draftApplicationId);

            if (transcriptFile) formData.append('transcript', transcriptFile);
            if (curriculumFile) formData.append('curriculum', curriculumFile);
            if (internshipFile) formData.append('internship', internshipFile);

            if (transcriptFile || curriculumFile || internshipFile) {
                await api.post('/applications/upload-documents', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            alert("Başvuru taslağı kaydedildi.");
        } catch (err) {
            alert(err.response?.data?.message || "Taslak kaydedilemedi.");
        }
    };

    const deleteDraft = () => {
        alert("Taslak silme işlemini backend ile bağlayacağız. Şimdilik bu butonu kullanma.");
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

            setApplicationId(appRes.data.applicationId || appRes.data.data?.applicationId);
            alert("Başvuru taslağı oluşturuldu.");
        } catch (err) {
            alert(err.response?.data?.message || "Başvuru taslağı oluşturulamadı.");
        }
    };

    const generateWarnings = (mappings = []) => {
        const warningList = [];

        const selectedTargetCodes = mappings.map(mapping =>
            normalizeCode(mapping.targetCourse?.coursecode)
        );

        mappings.forEach(mapping => {
            const prerequisite = getPrerequisite(mapping.targetCourse);

            if (prerequisite) {
                const missingPrerequisites = prerequisite
                    .split(',')
                    .map(p => p.trim())
                    .filter(Boolean)
                    .filter(prereq =>
                        !selectedTargetCodes.includes(normalizeCode(prereq))
                    );

                if (missingPrerequisites.length > 0) {
                    warningList.push(
                        `${mapping.targetCourse?.coursecode} - ${getCleanCourseName(mapping.targetCourse?.coursename)} dersi için ön koşul bulunmaktadır. Eksik ön koşullar: ${missingPrerequisites.join(', ')}.`
                    );
                }
            }
        });

        const packageCounts = {};

        mappings.forEach(mapping => {
            const packageName = getPackageName(mapping.targetCourse);
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

        return [...new Set(warningList)];
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

        if (targetCourseIds.length === 0) {
            alert("Lütfen en az bir hedef OMÜ dersi seçiniz.");
            return;
        }

        const hasEmptyCourse = externalCourses.some(course =>
            !course.code || !course.name || !course.akts || !course.grade
        );

        if (hasEmptyCourse) {
            alert("Lütfen kaynak ders kodu, ders adı, AKTS ve not alanlarını doldurunuz.");
            return;
        }

        for (const selectedOMUCourse of selectedOMUCourses) {
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

                    if (!continueAdd) return;
                }
            }
        }

        const newMappings = selectedOMUCourses.map(course => ({
            targetCourse: course,
            targetCourseId: course.courseid,
            externalCourses: [...externalCourses]
        }));

        setSavedMappings([
            ...savedMappings,
            ...newMappings
        ]);

        const allWarnings = [
            ...warnings,
            ...newMappings.flatMap(mapping => checkWarnings(mapping))
        ];

        setWarnings([...new Set(allWarnings)]);

        alert("Ders eşleştirmesi başvuruya eklendi.");

        setTargetCourseIds([]);
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

            setApplicationId(newApplicationId);


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

    const headerBannerStyle = {
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    };

    const gridTwo = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
    };

    if (submittedApplication) {
        const currentStatus = getOverallApplicationStatus(
            submittedApplication.mappings,
            submittedApplication.status
        );

        const isCompletedPositive = currentStatus === 'Başvuru Sonuçlandı: Olumlu';
        const isCompletedNegative = currentStatus === 'Başvuru Sonuçlandı: Olumsuz';
        const isCompleted = isCompletedPositive || isCompletedNegative;
        const isInReview = currentStatus === 'Komisyon İncelemesinde';
        const summaryWarnings = generateWarnings(submittedApplication.mappings || []);
        return (
            <div style={{ backgroundColor: '#f4f4f4', minHeight: '100vh', padding: '25px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={headerBannerStyle}>
                        <div>
                            <h3 style={{ margin: '4px' }}>
                                T.C. ONDOKUZ MAYIS ÜNİVERSİTESİ
                            </h3>

                            <h2 style={{
                                margin: '4px',
                                color: '#004a99'
                            }}>
                                Ders Saydırma ve Muafiyet Sistemi
                            </h2>

                            <p style={{
                                margin: '4px',
                                color: '#666'
                            }}>
                                Başvuru Özeti
                            </p>
                        </div>

                        {currentUser && (
                            <div style={{
                                textAlign: 'right',
                                background: '#f8f9fa',
                                padding: '10px 15px',
                                border: '1px solid #eee',
                                borderRadius: '6px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '8px',
                                    color: '#333',
                                    fontWeight: 'bold'
                                }}>
                                    <User size={18} color="#004a99" />
                                    {currentUser.fullname || currentUser.FullName}
                                </div>

                                <div style={{
                                    color: '#666',
                                    fontSize: '13px',
                                    marginTop: '4px',
                                    marginBottom: '8px'
                                }}>
                                    {currentUser.department || currentUser.Department}
                                    {' - Öğrenci'}
                                </div>

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '5px 10px',
                                        background: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        marginLeft: 'auto'
                                    }}
                                >
                                    <LogOut size={14} />
                                    Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={sectionStyle}>
                        <h3>Başvuru Durumu</h3>

                        <div style={{
                            padding: '15px',
                            backgroundColor: isCompletedPositive
                                ? '#d1e7dd'
                                : isCompletedNegative
                                    ? '#f8d7da'
                                    : isInReview
                                        ? '#fff3cd'
                                        : '#e7f3ff',
                            border: isCompletedPositive
                                ? '1px solid #badbcc'
                                : isCompletedNegative
                                    ? '1px solid #f5c2c7'
                                    : isInReview
                                        ? '1px solid #ffecb5'
                                        : '1px solid #b6d4fe',
                            borderRadius: '6px',
                            marginBottom: '15px',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}>
                            Güncel Durum: {currentStatus}
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                padding: '10px',
                                background: '#d1e7dd',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}>
                                ✓ Başvuru Gönderildi
                            </div>

                            <div style={{
                                padding: '10px',
                                background: isCompleted
                                    ? '#d1e7dd'
                                    : isInReview
                                        ? '#fff3cd'
                                        : '#f8f9fa',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}>
                                {isCompleted ? '✓ Komisyon İncelemesi Tamamlandı' : '2. Komisyon İncelemesinde'}
                            </div>

                            <div style={{
                                padding: '10px',
                                background: isCompletedPositive
                                    ? '#d1e7dd'
                                    : isCompletedNegative
                                        ? '#f8d7da'
                                        : '#f8f9fa',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}>
                                {isCompletedPositive
                                    ? '✓ Başvuru Sonuçlandı: Olumlu'
                                    : isCompletedNegative
                                        ? '✕ Başvuru Sonuçlandı: Olumsuz'
                                        : '3. Sonuç Bekleniyor'}
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
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>OMÜ Harf Notu</th>

                                </tr>
                            </thead>
                            <tbody>
                                {getGroupedSubmittedMappings(submittedApplication.mappings).map((group, index) => (
                                    <React.Fragment key={index}>

                                        {index > 0 && (
                                            <tr>
                                                <td
                                                    colSpan="9"
                                                    style={{
                                                        padding: 0,
                                                        height: '0px',
                                                        borderTop: '3px solid #666',
                                                        background: '#666'
                                                    }}
                                                />
                                            </tr>
                                        )}

                                        <tr>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                                {index + 1}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom:
                                                                i !== group.externalCourses.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {course.code} - {course.name}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom:
                                                                i !== group.externalCourses.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {course.sourceCredit || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom:
                                                                i !== group.externalCourses.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {course.akts || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center', fontWeight: 'bold' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom:
                                                                i !== group.externalCourses.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {course.grade || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            minHeight: '48px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            borderBottom:
                                                                i !== group.targetMappings.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {mapping.targetCourse?.coursecode}
                                                        {' - '}
                                                        {getCleanCourseName(mapping.targetCourse?.coursename)}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            minHeight: '48px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderBottom:
                                                                i !== group.targetMappings.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {mapping.targetCourse?.localcredit || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            minHeight: '48px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderBottom:
                                                                i !== group.targetMappings.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {mapping.targetCourse?.akts || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            minHeight: '48px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderBottom:
                                                                i !== group.targetMappings.length - 1
                                                                    ? '1px solid #ddd'
                                                                    : 'none'
                                                        }}
                                                    >
                                                        {mapping.finalGrade || '-'}
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    </React.Fragment>
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
                    {summaryWarnings.length > 0 && (
                        <div style={{
                            marginTop: '15px',
                            padding: '12px',
                            background: '#fff3cd',
                            border: '1px solid #ffecb5',
                            borderRadius: '6px',
                            color: '#664d03'
                        }}>
                            <strong>Sistem Uyarıları</strong>
                            <ul style={{ marginBottom: 0 }}>
                                {summaryWarnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}
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
                                {submittedApplication.documents?.attachments?.length > 0 ? (
                                    submittedApplication.documents.attachments.map((file, index) => (
                                        <tr key={index}>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                {file.filetype}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                {file.filename}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(getUploadedFileUrl(file.filepath), '_blank')}
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
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <>
                                        <tr>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                Transkript / Not Durum Belgesi
                                            </td>
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
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                Onaylı Müfredat ve Ders İçerikleri
                                            </td>
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
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                Transkriptte Yoksa Staj Durumunu Gösteren Belge
                                            </td>
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
                                    </>
                                )}
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
                <div style={headerBannerStyle}>
                    <div>
                        <h3 style={{ margin: '4px' }}>
                            T.C. ONDOKUZ MAYIS ÜNİVERSİTESİ
                        </h3>

                        <h2 style={{
                            margin: '4px',
                            color: '#004a99'
                        }}>
                            Ders Saydırma ve Muafiyet Sistemi
                        </h2>

                        <p style={{
                            margin: '4px',
                            color: '#666'
                        }}>
                            Yeni Muafiyet Başvurusu
                        </p>
                    </div>

                    {currentUser && (
                        <div style={{
                            textAlign: 'right',
                            background: '#f8f9fa',
                            padding: '10px 15px',
                            border: '1px solid #eee',
                            borderRadius: '6px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '8px',
                                color: '#333',
                                fontWeight: 'bold'
                            }}>
                                <User size={18} color="#004a99" />
                                {currentUser.fullname || currentUser.FullName}
                            </div>

                            <div style={{
                                color: '#666',
                                fontSize: '13px',
                                marginTop: '4px',
                                marginBottom: '8px'
                            }}>
                                {currentUser.department || currentUser.Department}
                                {' - Öğrenci'}
                            </div>

                            <button
                                onClick={handleLogout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 10px',
                                    background: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    marginLeft: 'auto'
                                }}
                            >
                                <LogOut size={14} />
                                Çıkış Yap
                            </button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleAddMapping}>
                    <div style={sectionStyle}>
                        <h3 style={{ borderBottom: '2px solid #004a99', paddingBottom: '10px' }}>
                            1. Öğrenci Bilgileri
                        </h3>
                        <p style={{ color: '#dc3545', fontSize: '13px', fontStyle: 'italic' }}>
                            * Bu bilgiler Öğrenci İşleri tarafından merkezi olarak atanmıştır, değiştirilemez.
                        </p>

                        <div style={gridTwo}>
                            <div>
                                <label style={labelStyle}>Öğrenci No</label>
                                <input
                                    style={{ ...inputStyle, backgroundColor: '#e9ecef', color: '#6c757d', cursor: 'not-allowed' }}
                                    value={studentNo}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Adı Soyadı</label>
                                <input
                                    style={{ ...inputStyle, backgroundColor: '#e9ecef', color: '#6c757d', cursor: 'not-allowed' }}
                                    value={studentName}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>T.C. Kimlik No</label>
                                <input
                                    style={{ ...inputStyle, backgroundColor: '#e9ecef', color: '#6c757d', cursor: 'not-allowed' }}
                                    value={tcNo}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Fakülte / YO / MYO</label>
                                <input
                                    style={{ ...inputStyle, backgroundColor: '#e9ecef', color: '#6c757d', cursor: 'not-allowed' }}
                                    value={faculty}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Bölüm</label>
                                <input
                                    style={{ ...inputStyle, backgroundColor: '#e9ecef', color: '#6c757d', cursor: 'not-allowed' }}
                                    value={department}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Program</label>
                                <input
                                    style={{ ...inputStyle, backgroundColor: '#e9ecef', color: '#6c757d', cursor: 'not-allowed' }}
                                    value={program}
                                    readOnly
                                />
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
                            <Select
                                options={courseSelectOptions}
                                placeholder="Müfredattan ders seçin..."
                                isSearchable
                                isMulti
                                closeMenuOnSelect={false}
                                value={
                                    courseSelectOptions
                                        .flatMap(group => group.options)
                                        .filter(option => targetCourseIds.map(String).includes(String(option.value)))
                                }
                                onChange={(selectedOptions) => {
                                    const selectedIds = selectedOptions
                                        ? selectedOptions.map(option => option.value)
                                        : [];

                                    setTargetCourseIds(selectedIds);

                                    const selectedCourses = curriculum.filter(
                                        c => selectedIds.map(String).includes(String(c.courseid))
                                    );

                                    const warningMessages = [];

                                    selectedCourses.forEach(selectedCourse => {
                                        const selectedPackage = getPackageName(selectedCourse);

                                        if (selectedPackage) {
                                            const alreadySelected = savedMappings.find(mapping =>
                                                getPackageName(mapping.targetCourse) === selectedPackage
                                            );

                                            const samePackageInCurrentSelection = selectedCourses.filter(course =>
                                                getPackageName(course) === selectedPackage
                                            );

                                            if (alreadySelected || samePackageInCurrentSelection.length > 1) {
                                                warningMessages.push(
                                                    `${selectedPackage} paketinden birden fazla ders seçildi. Nihai karar komisyon tarafından verilecektir.`
                                                );
                                            }
                                        }
                                    });

                                    setSelectionWarning([...new Set(warningMessages)].join(' '));
                                }}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        minHeight: '39px',
                                        borderColor: '#ccc',
                                        fontSize: '14px'
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        zIndex: 9999
                                    })
                                }}
                            />

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
                                {getGroupedSubmittedMappings(savedMappings).map((group, index) => (
                                    <React.Fragment key={index}>

                                        {index > 0 && (
                                            <tr>
                                                <td
                                                    colSpan="9"
                                                    style={{
                                                        padding: 0,
                                                        height: '0px',
                                                        borderTop: '3px solid #666',
                                                        background: '#666'
                                                    }}
                                                />
                                            </tr>
                                        )}

                                        <tr>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                                {index + 1}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom: i !== group.externalCourses.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        {course.code} - {course.name}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom: i !== group.externalCourses.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        {course.sourceCredit || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom: i !== group.externalCourses.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        {course.akts || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center', fontWeight: 'bold' }}>
                                                {group.externalCourses.map((course, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            borderBottom: i !== group.externalCourses.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        {course.grade || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            minHeight: '42px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            borderBottom: i !== group.targetMappings.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        {mapping.targetCourse?.coursecode} - {getCleanCourseName(mapping.targetCourse?.coursename)}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            minHeight: '42px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderBottom: i !== group.targetMappings.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        {mapping.targetCourse?.localcredit || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '8px',
                                                            minHeight: '42px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderBottom: i !== group.targetMappings.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        {mapping.targetCourse?.akts || '-'}
                                                    </div>
                                                ))}
                                            </td>

                                            <td style={{ border: '1px solid #ddd', padding: '0', textAlign: 'center' }}>
                                                {group.targetMappings.map((mapping, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            padding: '6px',
                                                            minHeight: '42px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderBottom: i !== group.targetMappings.length - 1 ? '1px solid #ddd' : 'none'
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMapping(savedMappings.findIndex(item => item === mapping))}
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
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    </React.Fragment>
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

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <button
                            type="button"
                            onClick={saveDraft}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#004a99',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Taslağı Kaydet
                        </button>

                        <button
                            type="button"
                            onClick={deleteDraft}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Taslağı Sil
                        </button>
                    </div>

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