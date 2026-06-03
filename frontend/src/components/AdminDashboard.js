import React, { useEffect, useState } from 'react';
import api from '../api';
import { User, LogOut } from 'lucide-react';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [applications, setApplications] = useState([]);
    const [curriculum, setCurriculum] = useState([]);
    const [departmentSettings, setDepartmentSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserRole, setSelectedUserRole] = useState('all');
    const [userSearch, setUserSearch] = useState('');
    const [courseSearch, setCourseSearch] = useState('');
    const [selectedCourseFaculty, setSelectedCourseFaculty] = useState('');
    const [selectedCourseDepartment, setSelectedCourseDepartment] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);


    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        fullname: '',
        role: 'student',
        studentNumber: '',
        tcKimlikNo: '',
        faculty: '',
        department: ''
    });

    const [newCourse, setNewCourse] = useState({
        faculty: '',
        department: '',
        courseCode: '',
        courseName: '',
        localCredit: '',
        akts: '',
        semester: '',
        courseType: '',
        prerequisiteCode: ''
    });

    const [newSetting, setNewSetting] = useState({
        faculty: '',
        department: '',
        commissionMember1: '',
        commissionMember2: '',
        commissionMember3: '',
        commissionPresident: '',
        departmentHead: ''
    });

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        try {
            const [statsRes, usersRes, appsRes, curriculumRes, settingsRes, meRes] = await Promise.all([
                api.get('/applications/admin/stats'),
                api.get('/applications/admin/users'),
                api.get('/applications/admin/applications'),
                api.get('/applications/curriculum'),
                api.get('/applications/admin/department-settings'),
                api.get('/auth/me')
            ]);

            setCurrentUser(meRes.data);

            setStats(statsRes.data.data);
            setUsers(usersRes.data.data || []);
            setApplications(appsRes.data.data || []);
            setCurriculum(curriculumRes.data.data || []);
            setDepartmentSettings(settingsRes.data.data || []);
            setLoading(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Admin verileri alınamadı.');
            setLoading(false);
        }
    };

    const createUser = async () => {
        try {
            await api.post('/applications/admin/users', newUser);
            alert('Kullanıcı oluşturuldu.');
            setNewUser({
                username: '',
                password: '',
                fullname: '',
                role: 'student',
                studentNumber: '',
                tcKimlikNo: '',
                faculty: '',
                department: ''
            });
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Kullanıcı oluşturulamadı.');
        }
    };

    const updateUser = async (user) => {
        try {
            await api.put(`/applications/admin/users/${user.userid}`, {
                username: user.username,
                fullname: user.fullname,
                role: user.role,
                studentNumber: user.studentnumber,
                tcKimlikNo: user.tckimlikno,
                faculty: user.faculty,
                department: user.department
            });
            alert('Kullanıcı güncellendi.');
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Kullanıcı güncellenemedi.');
        }
    };

    const resetPassword = async (userId) => {
        const newPassword = prompt('Yeni geçici şifreyi gir:');
        if (!newPassword) return;

        try {
            await api.put(`/applications/admin/users/${userId}/password`, { newPassword });
            alert('Şifre sıfırlandı.');
        } catch (err) {
            alert(err.response?.data?.message || 'Şifre sıfırlanamadı.');
        }
    };


    const deleteUser = async (userId) => {
        if (!window.confirm('Bu kullanıcıyı silmek istediğine emin misin?')) return;

        try {
            await api.delete(`/applications/admin/users/${userId}`);
            alert('Kullanıcı silindi.');
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Kullanıcı silinemedi.');
        }
    };

    const deleteApplication = async (applicationId) => {
        if (
            !window.confirm(
                'Bu başvuruyu kalıcı olarak silmek istediğinize emin misiniz?'
            )
        ) return;

        try {
            await api.delete(
                `/applications/admin/applications/${applicationId}`
            );

            alert('Başvuru silindi.');
            loadAdminData();

            if (
                selectedApplication &&
                selectedApplication.application.applicationid === applicationId
            ) {
                setSelectedApplication(null);
            }

        } catch (err) {
            alert(
                err.response?.data?.message ||
                'Başvuru silinemedi.'
            );
        }
    };

    const createCourse = async () => {
        try {
            await api.post('/applications/admin/curriculum', newCourse);
            alert('Ders eklendi.');
            setNewCourse({
                faculty: '',
                department: '',
                courseCode: '',
                courseName: '',
                localCredit: '',
                akts: '',
                semester: '',
                courseType: '',
                prerequisiteCode: ''
            });
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Ders eklenemedi.');
        }
    };

    const updateCourse = async (course) => {
        try {
            await api.put(`/applications/admin/curriculum/${course.courseid}`, {
                faculty: course.faculty,
                department: course.department,
                courseCode: course.coursecode,
                courseName: course.coursename,
                localCredit: course.localcredit,
                akts: course.akts,
                semester: course.semester,
                courseType: course.coursetype,
                prerequisiteCode: course.prerequisitecode
            });
            alert('Ders güncellendi.');
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Ders güncellenemedi.');
        }
    };

    const deleteCourse = async (courseId) => {
        if (!window.confirm('Bu dersi silmek istediğine emin misin?')) return;

        try {
            await api.delete(`/applications/admin/curriculum/${courseId}`);
            alert('Ders silindi.');
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Ders silinemedi.');
        }
    };

    const saveSettings = async () => {
        try {
            await api.post('/applications/admin/department-settings', newSetting);
            alert('Komisyon/imza bilgileri kaydedildi.');
            setNewSetting({
                faculty: '',
                department: '',
                commissionMember1: '',
                commissionMember2: '',
                commissionMember3: '',
                commissionPresident: '',
                departmentHead: ''
            });
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Ayarlar kaydedilemedi.');
        }
    };

    const assignApplication = async () => {
        if (!assignForm.applicationId || !assignForm.faculty || !assignForm.department) {
            alert('Lütfen fakülte ve bölüm seçiniz.');
            return;
        }

        try {
            await api.put(`/applications/admin/applications/${assignForm.applicationId}/assign`, {
                faculty: assignForm.faculty,
                department: assignForm.department
            });

            alert('Başvuru ilgili bölüme yönlendirildi.');

            setAssignForm({
                applicationId: null,
                faculty: '',
                department: ''
            });

            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'Başvuru yönlendirilemedi.');
        }
    };

    const updateUserField = (index, field, value) => {
        const copy = [...users];
        copy[index][field] = value;
        setUsers(copy);
    };

    const updateCourseField = (index, field, value) => {
        const copy = [...curriculum];
        copy[index][field] = value;
        setCurriculum(copy);
    };

    const updateSettingField = (index, field, value) => {
        const copy = [...departmentSettings];
        copy[index][field] = value;
        setDepartmentSettings(copy);
    };

    const updateSetting = async (setting) => {
        try {
            await api.put(`/applications/admin/department-settings/${setting.settingid}`, {
                faculty: setting.faculty,
                department: setting.department,
                commissionMember1: setting.commissionmember1,
                commissionMember2: setting.commissionmember2,
                commissionMember3: setting.commissionmember3,
                commissionPresident: setting.commissionpresident,
                departmentHead: setting.departmenthead
            });

            alert('İmza bilgileri güncellendi.');
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'İmza bilgileri güncellenemedi.');
        }
    };

    const deleteSetting = async (settingId) => {
        if (!window.confirm('Bu komisyon/imza kaydını silmek istediğine emin misin?')) return;

        try {
            await api.delete(`/applications/admin/department-settings/${settingId}`);
            alert('İmza bilgileri silindi.');
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || 'İmza bilgileri silinemedi.');
        }
    };

    const openApplicationDetail = async (applicationId) => {
        try {
            const res = await api.get(`/applications/admin/applications/${applicationId}`);
            setSelectedApplication(res.data.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Başvuru detayı alınamadı.');
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
            alert('PDF indirilemedi.');
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

    const normalizeCode = (code) => {
        return String(code || '')
            .trim()
            .toUpperCase()
            .replaceAll('İ', 'I');
    };

    const getCleanCourseName = (courseName) => {
        return String(courseName || '').replace(/\s*\([^)]+\)\s*/g, '').trim();
    };

    const getPrerequisite = (course) => {
        return course?.prerequisitecode || '';
    };

    const getPackageName = (course) => {
        const type = course?.coursetype || '';
        if (type) return type;

        const courseName = course?.coursename || '';
        const match = courseName.match(/\(([^)]+)\)/);

        return match ? match[1].trim() : '';
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

    const roleOptions = [
        { value: 'student', label: 'Öğrenci' },
        { value: 'teacher', label: 'Bölüm Yetkilisi' },
        { value: 'commission', label: 'Öğrenci İşleri' },
        { value: 'admin', label: 'Sistem Yöneticisi' }
    ];

    const getRoleLabel = (role) => {
        const found = roleOptions.find(item => item.value === role);
        return found ? found.label : role;
    };


    const normalizeText = (text) =>
        String(text ?? '')
            .toLocaleLowerCase('tr-TR')
            .trim();

    const filteredUsers = users.filter(user => {
        const roleMatch =
            selectedUserRole === 'all' ||
            user.role === selectedUserRole;

        const searchTerm = normalizeText(userSearch);

        const searchMatch =
            normalizeText(user.username).includes(searchTerm) ||
            normalizeText(user.fullname).includes(searchTerm) ||
            normalizeText(user.department).includes(searchTerm) ||
            normalizeText(user.faculty).includes(searchTerm) ||
            normalizeText(user.tckimlikno).includes(searchTerm);

        return roleMatch && searchMatch;
    });

    const [assignForm, setAssignForm] = useState({
        applicationId: null,
        faculty: '',
        department: ''
    });

    const filteredCourses = curriculum.filter(course => {
        const searchTerm = normalizeText(courseSearch);

        const facultyMatch =
            !selectedCourseFaculty ||
            course.faculty === selectedCourseFaculty;

        const departmentMatch =
            !selectedCourseDepartment ||
            course.department === selectedCourseDepartment;

        const searchMatch =
            normalizeText(course.coursecode).includes(searchTerm) ||
            normalizeText(course.coursename).includes(searchTerm) ||
            normalizeText(course.semester).includes(searchTerm) ||
            normalizeText(course.coursetype).includes(searchTerm) ||
            normalizeText(course.prerequisitecode).includes(searchTerm);

        return facultyMatch && departmentMatch && searchMatch;
    });

    if (loading) {
        return <div style={{ padding: '30px' }}>Admin paneli yükleniyor...</div>;
    }

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                <div style={headerBannerStyle}>
                    <div>
                        <h3 style={{ margin: '4px' }}>
                            T.C. ONDOKUZ MAYIS ÜNİVERSİTESİ
                        </h3>

                        <h2 style={{ margin: '4px', color: '#004a99' }}>
                            Ders Saydırma ve Muafiyet Sistemi
                        </h2>

                        <p style={{ margin: '4px', color: '#666' }}>
                            Sistem Yöneticisi Paneli
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
                                fontWeight: 'bold',
                                fontSize: '15px'
                            }}>
                                <User size={18} color="#004a99" />
                                {currentUser.fullname || currentUser.FullName || 'Sistem Yöneticisi'}
                            </div>

                            <div style={{
                                color: '#666',
                                fontSize: '13px',
                                marginTop: '4px',
                                marginBottom: '8px'
                            }}>
                                Bilgi İşlem Daire Başkanlığı - Sistem Yöneticisi
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

                <div style={tabBar}>
                    <button style={tabStyle(activeTab === 'users')} onClick={() => setActiveTab('users')}>Kullanıcı Yönetimi</button>
                    <button style={tabStyle(activeTab === 'curriculum')} onClick={() => setActiveTab('curriculum')}>Müfredat Yönetimi</button>
                    <button style={tabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>Komisyon / İmza</button>
                    <button style={tabStyle(activeTab === 'applications')} onClick={() => setActiveTab('applications')}>Başvuru İzleme</button>
                    <button style={tabStyle(activeTab === 'stats')} onClick={() => setActiveTab('stats')}>İstatistikler</button>
                </div>

                {activeTab === 'stats' && (
                    <div style={sectionStyle}>
                        <h3>Genel İstatistikler</h3>
                        <div style={cardGrid}>
                            <div style={cardStyle}>
                                <h4>Kullanıcı Rolleri</h4>
                                {stats?.usersByRole?.map(item => (
                                    <p key={item.role}><b>{getRoleLabel(item.role)}:</b> {item.count}</p>
                                ))}
                            </div>

                            <div style={cardStyle}>
                                <h4>Başvuru Durumları</h4>
                                {stats?.applicationsByStatus?.map(item => (
                                    <p key={item.status}><b>{item.status || 'Durum Yok'}:</b> {item.count}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div style={sectionStyle}>
                        <h3>Kullanıcı Yönetimi</h3>

                        <h4>Yeni Kullanıcı Oluştur</h4>
                        <div style={userCreateBox}>
                            <div style={formGridTwo}>

                                <div>
                                    <label style={formLabel}>Ad Soyad</label>
                                    <input
                                        placeholder="Ad Soyad"
                                        value={newUser.fullname}
                                        onChange={e => setNewUser({ ...newUser, fullname: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>


                                <div>
                                    <label style={formLabel}>Rol</label>
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                        style={inputStyle}
                                    >
                                        {roleOptions.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={formLabel}>
                                        {newUser.role === 'student' ? 'Kullanıcı Adı / Öğrenci No' : 'Kullanıcı Adı'}
                                    </label>
                                    <input
                                        placeholder={newUser.role === 'student' ? 'Kullanıcı adı' : 'Kullanıcı adı'}
                                        value={newUser.username}
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>





                                {newUser.role !== 'admin' && (
                                    <div>
                                        <label style={formLabel}>Fakülte</label>
                                        <select
                                            value={newUser.faculty}
                                            onChange={(e) =>
                                                setNewUser({
                                                    ...newUser,
                                                    faculty: e.target.value,
                                                    department: ''
                                                })
                                            }
                                            style={inputStyle}
                                        >
                                            <option value="">Fakülte seçiniz...</option>
                                            <option value="Mühendislik Fakültesi">Mühendislik Fakültesi</option>
                                        </select>
                                    </div>


                                )}


                                <div>
                                    <label style={formLabel}>T.C. Kimlik No</label>
                                    <input
                                        placeholder="T.C. Kimlik No"
                                        value={newUser.tcKimlikNo}
                                        onChange={e => setNewUser({ ...newUser, tcKimlikNo: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>



                                {(newUser.role === 'student' || newUser.role === 'teacher') && (
                                    <div>
                                        <label style={formLabel}>Bölüm</label>
                                        <select
                                            value={newUser.department}
                                            onChange={(e) =>
                                                setNewUser({
                                                    ...newUser,
                                                    department: e.target.value
                                                })
                                            }
                                            style={inputStyle}
                                        >
                                            <option value="">Bölüm seçiniz...</option>
                                            <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
                                            <option value="Çevre Mühendisliği">Çevre Mühendisliği</option>
                                            <option value="Elektrik Elektronik Mühendisliği">Elektrik Elektronik Mühendisliği</option>
                                            <option value="Endüstri Mühendisliği">Endüstri Mühendisliği</option>
                                            <option value="Gıda Mühendisliği">Gıda Mühendisliği</option>
                                            <option value="Harita Mühendisliği">Harita Mühendisliği</option>
                                            <option value="İnşaat Mühendisliği">İnşaat Mühendisliği</option>
                                            <option value="Kimya Mühendisliği">Kimya Mühendisliği</option>
                                            <option value="Makine Mühendisliği">Makine Mühendisliği</option>
                                            <option value="Metalurji ve Malzeme Mühendisliği">Metalurji ve Malzeme Mühendisliği</option>
                                        </select>
                                    </div>
                                )}




                                <div>
                                    <label style={formLabel}>Geçici Şifre</label>
                                    <input
                                        placeholder="Geçici şifre"
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>



                            </div>

                            <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                <button onClick={createUser} style={primaryButton}>
                                    Kullanıcı Oluştur
                                </button>
                            </div>
                        </div>

                        <h4 style={{ marginTop: '25px' }}>Kullanıcı Listesi</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <input
                                type="text"
                                placeholder="Kullanıcı adı, ad soyad, fakülte, bölüm veya TC Kimlik No ile ara..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { value: 'all', label: 'Tümü' },
                                { value: 'student', label: 'Öğrenciler' },
                                { value: 'teacher', label: 'Bölüm Yetkilileri' },
                                { value: 'commission', label: 'Öğrenci İşleri' },
                                { value: 'admin', label: 'Sistem Yöneticileri' }
                            ].map(item => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setSelectedUserRole(item.value)}
                                    style={{
                                        padding: '7px 11px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        backgroundColor: selectedUserRole === item.value ? '#004a99' : '#e9ecef',
                                        color: selectedUserRole === item.value ? 'white' : 'black',
                                        fontWeight: selectedUserRole === item.value ? 'bold' : 'normal'
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <table style={tableStyle}>
                            <thead>

                                <tr>
                                    <th style={thStyle}>ID</th>
                                    <th style={thStyle}>T.C. Kimlik No</th>
                                    <th style={thStyle}>Kullanıcı Adı</th>
                                    <th style={thStyle}>Ad Soyad</th>
                                    <th style={thStyle}>Rol</th>
                                    <th style={thStyle}>Fakülte</th>
                                    <th style={thStyle}>Bölüm</th>
                                    <th style={thStyle}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const realIndex = users.findIndex(u => u.userid === user.userid);

                                    return (
                                        <tr key={user.userid}>
                                            <td style={tdStyle}>{user.userid}</td>
                                            <td style={tdStyle}>
                                                <input
                                                    value={user.tckimlikno || ''}
                                                    onChange={e => updateUserField(realIndex, 'tckimlikno', e.target.value)}
                                                    style={inputStyle}
                                                />
                                            </td>
                                            <td style={tdStyle}>
                                                <input
                                                    value={user.username || ''}
                                                    onChange={e => updateUserField(realIndex, 'username', e.target.value)}
                                                    style={inputStyle}
                                                />
                                            </td>
                                            <td style={tdStyle}>
                                                <input value={user.fullname || ''} onChange={e => updateUserField(realIndex, 'fullname', e.target.value)} style={inputStyle} />
                                            </td>
                                            <td style={tdStyle}>
                                                <select
                                                    value={user.role || ''}
                                                    onChange={e => updateUserField(realIndex, 'role', e.target.value)}
                                                    style={inputStyle}
                                                >
                                                    {roleOptions.map(role => (
                                                        <option key={role.value} value={role.value}>
                                                            {role.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td style={tdStyle}>
                                                <input value={user.faculty || ''} onChange={e => updateUserField(realIndex, 'faculty', e.target.value)} style={inputStyle} />
                                            </td>
                                            <td style={tdStyle}>
                                                <input value={user.department || ''} onChange={e => updateUserField(realIndex, 'department', e.target.value)} style={inputStyle} />
                                            </td>

                                            <td style={tdStyle}>
                                                <button onClick={() => updateUser(user)} style={smallButton}>Kaydet</button>
                                                <button onClick={() => resetPassword(user.userid)} style={smallButton}>Şifre</button>
                                                <button onClick={() => deleteUser(user.userid)} style={dangerButton}>Sil</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'curriculum' && (
                    <div style={sectionStyle}>
                        <h3>Müfredat / Ders Yönetimi</h3>
                        <div style={{ ...userCreateBox, marginBottom: '15px' }}>
                            <h4>Müfredat Filtrele</h4>

                            <div style={formGridTwo}>
                                <div>
                                    <label style={formLabel}>Fakülte</label>
                                    <select
                                        value={selectedCourseFaculty}
                                        onChange={(e) => {
                                            setSelectedCourseFaculty(e.target.value);
                                            setSelectedCourseDepartment('');
                                        }}
                                        style={inputStyle}
                                    >
                                        <option value="">Tüm Fakülteler</option>
                                        <option value="Mühendislik Fakültesi">Mühendislik Fakültesi</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={formLabel}>Bölüm</label>
                                    <select
                                        value={selectedCourseDepartment}
                                        onChange={(e) => setSelectedCourseDepartment(e.target.value)}
                                        style={inputStyle}
                                    >
                                        <option value="">Tüm Bölümler</option>
                                        <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
                                        <option value="Çevre Mühendisliği">Çevre Mühendisliği</option>
                                        <option value="Elektrik Elektronik Mühendisliği">Elektrik Elektronik Mühendisliği</option>
                                        <option value="Endüstri Mühendisliği">Endüstri Mühendisliği</option>
                                        <option value="Gıda Mühendisliği">Gıda Mühendisliği</option>
                                        <option value="Harita Mühendisliği">Harita Mühendisliği</option>
                                        <option value="İnşaat Mühendisliği">İnşaat Mühendisliği</option>
                                        <option value="Kimya Mühendisliği">Kimya Mühendisliği</option>
                                        <option value="Makine Mühendisliği">Makine Mühendisliği</option>
                                        <option value="Metalurji ve Malzeme Mühendisliği">Metalurji ve Malzeme Mühendisliği</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={userCreateBox}>
                            <div style={formGridTwo}>

                                <div>
                                    <label style={formLabel}>Fakülte</label>
                                    <select
                                        value={newCourse.faculty}
                                        onChange={(e) =>
                                            setNewCourse({
                                                ...newCourse,
                                                faculty: e.target.value,
                                                department: ''
                                            })
                                        }
                                        style={inputStyle}
                                    >
                                        <option value="">Fakülte seçiniz...</option>
                                        <option value="Mühendislik Fakültesi">Mühendislik Fakültesi</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={formLabel}>Bölüm</label>
                                    <select
                                        value={newCourse.department}
                                        onChange={(e) =>
                                            setNewCourse({
                                                ...newCourse,
                                                department: e.target.value
                                            })
                                        }
                                        style={inputStyle}
                                    >
                                        <option value="">Bölüm seçiniz...</option>
                                        <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
                                        <option value="Çevre Mühendisliği">Çevre Mühendisliği</option>
                                        <option value="Elektrik Elektronik Mühendisliği">Elektrik Elektronik Mühendisliği</option>
                                        <option value="Endüstri Mühendisliği">Endüstri Mühendisliği</option>
                                        <option value="Gıda Mühendisliği">Gıda Mühendisliği</option>
                                        <option value="Harita Mühendisliği">Harita Mühendisliği</option>
                                        <option value="İnşaat Mühendisliği">İnşaat Mühendisliği</option>
                                        <option value="Kimya Mühendisliği">Kimya Mühendisliği</option>
                                        <option value="Makine Mühendisliği">Makine Mühendisliği</option>
                                        <option value="Metalurji ve Malzeme Mühendisliği">Metalurji ve Malzeme Mühendisliği</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={formLabel}>Ders Kodu</label>
                                    <input
                                        placeholder="Ders Kodu"
                                        value={newCourse.courseCode}
                                        onChange={e => setNewCourse({ ...newCourse, courseCode: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>Ders Adı</label>
                                    <input
                                        placeholder="Ders Adı"
                                        value={newCourse.courseName}
                                        onChange={e => setNewCourse({ ...newCourse, courseName: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>Kredi</label>
                                    <input
                                        placeholder="Kredi"
                                        value={newCourse.localCredit}
                                        onChange={e => setNewCourse({ ...newCourse, localCredit: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>AKTS</label>
                                    <input
                                        placeholder="AKTS"
                                        value={newCourse.akts}
                                        onChange={e => setNewCourse({ ...newCourse, akts: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>Dönem</label>
                                    <input
                                        placeholder="Dönem"
                                        value={newCourse.semester}
                                        onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>Seçmeli Paket / Ders Tipi</label>
                                    <input
                                        placeholder="Seçmeli Paket / Ders Tipi"
                                        value={newCourse.courseType}
                                        onChange={e => setNewCourse({ ...newCourse, courseType: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>Ön Koşul Ders Kodu</label>
                                    <input
                                        placeholder="Ön Koşul Ders Kodu"
                                        value={newCourse.prerequisiteCode}
                                        onChange={e => setNewCourse({ ...newCourse, prerequisiteCode: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                            </div>

                            <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                <button onClick={createCourse} style={primaryButton}>
                                    Ders Ekle
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: '15px', marginBottom: '10px' }}>
                            <input
                                type="text"
                                placeholder="Ders kodu, ders adı, dönem, paket veya ön koşul ile ara..."
                                value={courseSearch}
                                onChange={(e) => setCourseSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Fakülte</th>
                                        <th style={thStyle}>Bölüm</th>

                                        <th style={thStyle}>Kod</th>
                                        <th style={{ ...thStyle, minWidth: '300px' }}>
                                            Ad
                                        </th>
                                        <th style={thStyle}>Kredi</th>
                                        <th style={thStyle}>AKTS</th>
                                        <th style={thStyle}>Dönem</th>
                                        <th style={thStyle}>Paket</th>
                                        <th style={thStyle}>Ön Koşul</th>
                                        <th style={thStyle}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses.map((course) => {
                                        const realIndex = curriculum.findIndex(c => c.courseid === course.courseid);

                                        return (

                                            <tr key={course.courseid}>
                                                <td style={tdStyle}>
                                                    <input
                                                        value={course.faculty || ''}
                                                        onChange={e =>
                                                            updateCourseField(realIndex, 'faculty', e.target.value)
                                                        }
                                                        style={inputStyle}
                                                    />
                                                </td>

                                                <td style={tdStyle}>
                                                    <input
                                                        value={course.department || ''}
                                                        onChange={e =>
                                                            updateCourseField(realIndex, 'department', e.target.value)
                                                        }
                                                        style={inputStyle}
                                                    />
                                                </td>
                                                <td style={tdStyle}><input value={course.coursecode || ''} onChange={e => updateCourseField(realIndex, 'coursecode', e.target.value)} style={inputStyle} /></td>
                                                <td style={{ ...tdStyle, minWidth: '300px' }}>
                                                    <input
                                                        title={course.coursename || ''}
                                                        value={course.coursename || ''}
                                                        onChange={e => updateCourseField(realIndex, 'coursename', e.target.value)}
                                                        style={{
                                                            ...inputStyle,
                                                            width: '100%'
                                                        }}
                                                    />
                                                </td>
                                                <td style={tdStyle}><input value={course.localcredit || ''} onChange={e => updateCourseField(realIndex, 'localcredit', e.target.value)} style={inputStyle} /></td>
                                                <td style={tdStyle}><input value={course.akts || ''} onChange={e => updateCourseField(realIndex, 'akts', e.target.value)} style={inputStyle} /></td>
                                                <td style={tdStyle}><input value={course.semester || ''} onChange={e => updateCourseField(realIndex, 'semester', e.target.value)} style={inputStyle} /></td>
                                                <td style={tdStyle}><input value={course.coursetype || ''} onChange={e => updateCourseField(realIndex, 'coursetype', e.target.value)} style={inputStyle} /></td>
                                                <td style={tdStyle}><input value={course.prerequisitecode || ''} onChange={e => updateCourseField(realIndex, 'prerequisitecode', e.target.value)} style={inputStyle} /></td>
                                                <td style={tdStyle}>
                                                    <button onClick={() => updateCourse(course)} style={smallButton}>Kaydet</button>
                                                    <button onClick={() => deleteCourse(course.courseid)} style={dangerButton}>Sil</button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                </tbody>

                            </table>
                        </div>
                    </div>

                )}



                {activeTab === 'settings' && (
                    <div style={sectionStyle}>
                        <h3>Komisyon / İmza Bilgileri</h3>

                        <div style={userCreateBox}>
                            <div style={formGridTwo}>

                                <div>
                                    <label style={formLabel}>Fakülte</label>
                                    <select
                                        value={newSetting.faculty}
                                        onChange={(e) =>
                                            setNewSetting({
                                                ...newSetting,
                                                faculty: e.target.value,
                                                department: ''
                                            })
                                        }
                                        style={inputStyle}
                                    >
                                        <option value="">Fakülte Seçiniz</option>
                                        <option value="Mühendislik Fakültesi">
                                            Mühendislik Fakültesi
                                        </option>
                                    </select>
                                </div>




                                <div>
                                    <label style={formLabel}>Bölüm Başkanı</label>
                                    <input
                                        placeholder="Bölüm Başkanı"
                                        value={newSetting.departmentHead}
                                        onChange={e => setNewSetting({ ...newSetting, departmentHead: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>Bölüm</label>
                                    <select
                                        value={newSetting.department}
                                        onChange={(e) =>
                                            setNewSetting({
                                                ...newSetting,
                                                department: e.target.value
                                            })
                                        }
                                        style={inputStyle}
                                    >
                                        <option value="">Bölüm Seçiniz</option>

                                        <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
                                        <option value="Çevre Mühendisliği">Çevre Mühendisliği</option>
                                        <option value="Elektrik Elektronik Mühendisliği">Elektrik Elektronik Mühendisliği</option>
                                        <option value="Endüstri Mühendisliği">Endüstri Mühendisliği</option>
                                        <option value="Gıda Mühendisliği">Gıda Mühendisliği</option>
                                        <option value="Harita Mühendisliği">Harita Mühendisliği</option>
                                        <option value="İnşaat Mühendisliği">İnşaat Mühendisliği</option>
                                        <option value="Kimya Mühendisliği">Kimya Mühendisliği</option>
                                        <option value="Makine Mühendisliği">Makine Mühendisliği</option>
                                        <option value="Metalurji ve Malzeme Mühendisliği">Metalurji ve Malzeme Mühendisliği</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={formLabel}>1. Üye</label>
                                    <input
                                        placeholder="1. Üye"
                                        value={newSetting.commissionMember1}
                                        onChange={e => setNewSetting({ ...newSetting, commissionMember1: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>


                                <div>
                                    <label style={formLabel}>Komisyon Başkanı</label>
                                    <input
                                        placeholder="Komisyon Başkanı"
                                        value={newSetting.commissionPresident}
                                        onChange={e => setNewSetting({ ...newSetting, commissionPresident: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>



                                <div>
                                    <label style={formLabel}>2. Üye</label>
                                    <input
                                        placeholder="2. Üye"
                                        value={newSetting.commissionMember2}
                                        onChange={e => setNewSetting({ ...newSetting, commissionMember2: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>







                            </div>

                            <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                <button onClick={saveSettings} style={primaryButton}>
                                    İmza Bilgilerini Kaydet
                                </button>
                            </div>
                        </div>

                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Fakülte</th>
                                    <th style={thStyle}>Bölüm</th>
                                    <th style={thStyle}>1. Üye</th>
                                    <th style={thStyle}>2. Üye</th>
                                    <th style={thStyle}>Başkan</th>
                                    <th style={thStyle}>Bölüm Başkanı</th>
                                    <th style={thStyle}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departmentSettings.map((item, index) => (
                                    <tr key={item.settingid}>
                                        <td style={tdStyle}>
                                            <input value={item.faculty || ''} onChange={e => updateSettingField(index, 'faculty', e.target.value)} style={inputStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input value={item.department || ''} onChange={e => updateSettingField(index, 'department', e.target.value)} style={inputStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input value={item.commissionmember1 || ''} onChange={e => updateSettingField(index, 'commissionmember1', e.target.value)} style={inputStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input value={item.commissionmember2 || ''} onChange={e => updateSettingField(index, 'commissionmember2', e.target.value)} style={inputStyle} />
                                        </td>

                                        <td style={tdStyle}>
                                            <input value={item.commissionpresident || ''} onChange={e => updateSettingField(index, 'commissionpresident', e.target.value)} style={inputStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input value={item.departmenthead || ''} onChange={e => updateSettingField(index, 'departmenthead', e.target.value)} style={inputStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <button onClick={() => updateSetting(item)} style={smallButton}>Kaydet</button>
                                            <button onClick={() => deleteSetting(item.settingid)} style={dangerButton}>Sil</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'applications' && (
                    <div style={sectionStyle}>
                        <h3>Başvuru İzleme</h3>
                        {assignForm.applicationId && (
                            <div style={assignBox}>
                                <h4>Başvuruyu Bölüme Yönlendir</h4>

                                <div style={formGridTwo}>
                                    <div>
                                        <label style={formLabel}>Fakülte</label>
                                        <select
                                            value={assignForm.faculty}
                                            onChange={(e) =>
                                                setAssignForm({
                                                    ...assignForm,
                                                    faculty: e.target.value,
                                                    department: ''
                                                })
                                            }
                                            style={inputStyle}
                                        >
                                            <option value="">Fakülte seçiniz...</option>
                                            <option value="Mühendislik Fakültesi">Mühendislik Fakültesi</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={formLabel}>Bölüm</label>
                                        <select
                                            value={assignForm.department}
                                            onChange={(e) =>
                                                setAssignForm({
                                                    ...assignForm,
                                                    department: e.target.value
                                                })
                                            }
                                            style={inputStyle}
                                        >
                                            <option value="">Bölüm seçiniz...</option>
                                            <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
                                            <option value="Çevre Mühendisliği">Çevre Mühendisliği</option>
                                            <option value="Elektrik Elektronik Mühendisliği">Elektrik Elektronik Mühendisliği</option>
                                            <option value="Endüstri Mühendisliği">Endüstri Mühendisliği</option>
                                            <option value="Gıda Mühendisliği">Gıda Mühendisliği</option>
                                            <option value="Harita Mühendisliği">Harita Mühendisliği</option>
                                            <option value="İnşaat Mühendisliği">İnşaat Mühendisliği</option>
                                            <option value="Kimya Mühendisliği">Kimya Mühendisliği</option>
                                            <option value="Makine Mühendisliği">Makine Mühendisliği</option>
                                            <option value="Metalurji ve Malzeme Mühendisliği">Metalurji ve Malzeme Mühendisliği</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setAssignForm({
                                                applicationId: null,
                                                faculty: '',
                                                department: ''
                                            })
                                        }
                                        style={{ ...smallButton, background: '#6c757d' }}
                                    >
                                        İptal
                                    </button>

                                    <button
                                        type="button"
                                        onClick={assignApplication}
                                        style={primaryButton}
                                    >
                                        Yönlendir
                                    </button>
                                </div>
                            </div>
                        )}
                        {selectedApplication && (() => {
                            const adminWarnings = generateWarnings(selectedApplication.mappings || []);

                            return (
                                <div style={{ ...sectionStyle, background: '#f8f9fa' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>Başvuru Detayı</h3>

                                        <div>
                                            <button
                                                onClick={() => downloadPDF(selectedApplication.application.applicationid)}
                                                style={{ ...smallButton, background: '#198754' }}
                                            >
                                                PDF İndir
                                            </button>

                                            <button
                                                onClick={() => setSelectedApplication(null)}
                                                style={smallButton}
                                            >
                                                Detayı Kapat
                                            </button>
                                        </div>
                                    </div>

                                    <div style={detailGrid}>
                                        <div style={infoCard}>
                                            <h4>Öğrenci Bilgileri</h4>
                                            <p><b>Ad Soyad:</b> {selectedApplication.application.studentname}</p>
                                            <p><b>Öğrenci No:</b> {selectedApplication.application.studentno}</p>
                                            <p><b>Fakülte:</b> {selectedApplication.application.faculty}</p>
                                            <p><b>Bölüm:</b> {selectedApplication.application.department}</p>
                                        </div>

                                        <div style={infoCard}>
                                            <h4>Başvuru Bilgileri</h4>
                                            <p><b>Gerekçe:</b> {selectedApplication.application.exemptionreason || '-'}</p>
                                            <p><b>Durum:</b> {selectedApplication.application.status || '-'}</p>
                                            <p><b>Akademik Yıl:</b> {selectedApplication.application.academicyear || '-'}</p>
                                            <p><b>Yarıyıl:</b> {selectedApplication.application.semester || '-'}</p>
                                        </div>
                                    </div>

                                    <h4>Süreç Takibi</h4>
                                    <div style={processBox}>
                                        <div>✓ Başvuru Oluşturuldu</div>
                                        <div>✓ Bölüme Yönlendirildi</div>
                                        <div>✓ Komisyon İncelemesi</div>
                                        <div
                                            style={{
                                                color: selectedApplication.application.status?.includes('Sonuçlandı')
                                                    ? '#198754'
                                                    : '#856404',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {selectedApplication.application.status || 'Süreç devam ediyor'}
                                        </div>
                                    </div>

                                    <h4>Yüklenen Belgeler</h4>
                                    {selectedApplication.attachments?.length === 0 ? (
                                        <p>Belge yok.</p>
                                    ) : (
                                        <div style={{ marginBottom: '15px' }}>
                                            {selectedApplication.attachments.map(file => (
                                                <button
                                                    key={file.attachmentid}
                                                    style={smallButton}
                                                    onClick={() => {
                                                        const fileUrl = `http://localhost:5000/${file.filepath.replaceAll('\\', '/')}`;
                                                        window.open(getUploadedFileUrl(file.filepath), '_blank');
                                                    }}
                                                >
                                                    {file.filetype} Görüntüle
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <h4>Ders Eşleştirmeleri</h4>
                                    <table style={tableStyle}>
                                        <thead>
                                            <tr>
                                                <th style={thStyle}>Kaynak Ders</th>
                                                <th style={thStyle}>Kaynak AKTS</th>
                                                <th style={thStyle}>Harf Notu</th>
                                                <th style={thStyle}>Hedef OMÜ Dersi</th>
                                                <th style={thStyle}>OMÜ AKTS</th>
                                                <th style={thStyle}>OMÜ Harf Notu</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {selectedApplication.mappings?.map((m, index) => (
                                                <tr key={index}>
                                                    <td style={tdStyle}>
                                                        {m.externalCourses?.map((c, i) => (
                                                            <div key={i} style={innerRow}>
                                                                {c.code} - {c.name}
                                                            </div>
                                                        ))}
                                                    </td>

                                                    <td style={tdStyle}>
                                                        {m.externalCourses?.map((c, i) => (
                                                            <div key={i} style={innerRow}>
                                                                {c.akts}
                                                            </div>
                                                        ))}
                                                    </td>

                                                    <td style={tdStyle}>
                                                        {m.externalCourses?.map((c, i) => (
                                                            <div key={i} style={innerRow}>
                                                                {c.grade}
                                                            </div>
                                                        ))}
                                                    </td>

                                                    <td style={tdStyle}>
                                                        {m.targetCourse?.coursecode
                                                            ? `${m.targetCourse.coursecode} - ${m.targetCourse.coursename}`
                                                            : '-'}
                                                    </td>

                                                    <td style={tdStyle}>{m.targetCourse?.akts || '-'}</td>
                                                    <td style={tdStyle}>{m.finalGrade || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {adminWarnings.length > 0 && (
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
                                                {adminWarnings.map((warning, index) => (
                                                    <li key={index}>{warning}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div style={adminNoteBox}>
                                        Bu ekran yalnızca başvuru sürecini izlemek içindir. Ders eşleştirme, not ve akademik karar düzenlemeleri bölüm yetkilisi tarafından yapılır.
                                    </div>
                                </div>
                            );
                        })()}

                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Başvuru No</th>
                                    <th style={thStyle}>Öğrenci</th>
                                    <th style={thStyle}>Fakülte</th>
                                    <th style={thStyle}>Bölüm</th>
                                    <th style={thStyle}>Gerekçe</th>
                                    <th style={thStyle}>Durum</th>
                                    <th style={thStyle}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications
                                    .filter(app => app.status !== 'Taslak')
                                    .map(app => (
                                        <tr key={app.applicationid}>
                                            <td style={tdStyle}>{app.applicationid}</td>
                                            <td style={tdStyle}>{app.studentname}</td>
                                            <td style={tdStyle}>{app.faculty}</td>
                                            <td style={tdStyle}>{app.department}</td>
                                            <td style={tdStyle}>{app.exemptionreason}</td>
                                            <td style={tdStyle}>{app.status}</td>
                                            <td style={tdStyle}>
                                                {app.status !== 'Taslak' && (
                                                    <button
                                                        onClick={() =>
                                                            setAssignForm({
                                                                applicationId: app.applicationid,
                                                                faculty: app.faculty || '',
                                                                department: app.department || ''
                                                            })
                                                        }
                                                        style={smallButton}
                                                    >
                                                        {app.department
                                                            ? 'Yönlendirmeyi Güncelle'
                                                            : 'Bölüme Yönlendir'}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => openApplicationDetail(app.applicationid)}
                                                    style={smallButton}
                                                >
                                                    Detay Gör
                                                </button>

                                                <button
                                                    onClick={() => deleteApplication(app.applicationid)}
                                                    style={dangerButton}
                                                >
                                                    Sil
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    );
};

const pageStyle = { background: '#f4f4f4', minHeight: '100vh', padding: '25px' };
const containerStyle = { maxWidth: '1350px', margin: '0 auto', background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' };
const sectionStyle = { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginTop: '15px' };
const tabBar = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' };
const tabStyle = active => ({
    padding: '9px 13px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    background: active ? '#004a99' : '#e9ecef',
    color: active ? 'white' : 'black',
    fontWeight: active ? 'bold' : 'normal'
});
const userCreateBox = {
    background: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '18px'
};

const formGridTwo = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
};

const formLabel = {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '13px'
};

const detailGrid = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px'
};

const infoCard = {
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px'
};

const processBox = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '15px',
    textAlign: 'center'
};

const innerRow = {
    padding: '5px 0',
    borderBottom: '1px solid #eee'
};

const adminNoteBox = {
    marginTop: '15px',
    padding: '10px',
    background: '#fff3cd',
    border: '1px solid #ffeeba',
    borderRadius: '6px',
    color: '#856404',
    fontSize: '13px'
};

const assignBox = {
    background: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '18px'
};
const cardGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const cardStyle = { background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', padding: '15px' };
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' };
const inputStyle = { padding: '7px', width: '100%', boxSizing: 'border-box' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '15px' };
const thStyle = { border: '1px solid #ddd', padding: '7px', background: '#f1f1f1', textAlign: 'left' };
const tdStyle = { border: '1px solid #ddd', padding: '7px' };
const primaryButton = { padding: '8px 12px', background: '#004a99', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const smallButton = { padding: '5px 8px', background: '#004a99', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', marginBottom: '4px' };
const dangerButton = { ...smallButton, background: '#dc3545' };
const headerBannerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '15px 25px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

export default AdminDashboard;