import React, { useEffect, useState } from 'react';
import api from '../api';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [applications, setApplications] = useState([]);
    const [curriculum, setCurriculum] = useState([]);
    const [departmentSettings, setDepartmentSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserRole, setSelectedUserRole] = useState('all');
    const [selectedApplication, setSelectedApplication] = useState(null);

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
            const [statsRes, usersRes, appsRes, curriculumRes, settingsRes] = await Promise.all([
                api.get('/applications/admin/stats'),
                api.get('/applications/admin/users'),
                api.get('/applications/admin/applications'),
                api.get('/applications/curriculum'),
                api.get('/applications/admin/department-settings')
            ]);

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

    const createCourse = async () => {
        try {
            await api.post('/applications/admin/curriculum', newCourse);
            alert('Ders eklendi.');
            setNewCourse({
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

    const assignApplication = async (applicationId) => {
        const faculty = prompt('Fakülte:');
        const department = prompt('Bölüm:');

        if (!faculty || !department) return;

        try {
            await api.put(`/applications/admin/applications/${applicationId}/assign`, {
                faculty,
                department
            });
            alert('Başvuru ilgili bölüme yönlendirildi.');
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

    const filteredUsers =
        selectedUserRole === 'all'
            ? users
            : users.filter(user => user.role === selectedUserRole);

    if (loading) {
        return <div style={{ padding: '30px' }}>Admin paneli yükleniyor...</div>;
    }

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                <h2 style={{ color: '#004a99' }}>Admin Paneli</h2>

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
                                    <p key={item.role}><b>{item.role}:</b> {item.count}</p>
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
                        <div style={formGrid}>
                            <input placeholder="Kullanıcı adı" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} style={inputStyle} />
                            <input placeholder="Geçici şifre" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={inputStyle} />
                            <input placeholder="Ad Soyad" value={newUser.fullname} onChange={e => setNewUser({ ...newUser, fullname: e.target.value })} style={inputStyle} />

                            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={inputStyle}>
                                <option value="student">Öğrenci</option>
                                <option value="teacher">Bölüm Yetkilisi</option>
                                <option value="commission">Öğrenci İşleri</option>
                                <option value="admin">Admin</option>
                            </select>

                            <input placeholder="Öğrenci No" value={newUser.studentNumber} onChange={e => setNewUser({ ...newUser, studentNumber: e.target.value })} style={inputStyle} />
                            <input placeholder="T.C. Kimlik No" value={newUser.tcKimlikNo} onChange={e => setNewUser({ ...newUser, tcKimlikNo: e.target.value })} style={inputStyle} />
                            <input placeholder="Fakülte" value={newUser.faculty} onChange={e => setNewUser({ ...newUser, faculty: e.target.value })} style={inputStyle} />
                            <input placeholder="Bölüm" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} style={inputStyle} />
                        </div>

                        <button onClick={createUser} style={primaryButton}>Kullanıcı Oluştur</button>

                        <h4 style={{ marginTop: '25px' }}>Kullanıcı Listesi</h4>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { value: 'all', label: 'Tümü' },
                                { value: 'student', label: 'Öğrenciler' },
                                { value: 'teacher', label: 'Bölüm Yetkilileri' },
                                { value: 'commission', label: 'Öğrenci İşleri' },
                                { value: 'admin', label: 'Adminler' }
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
                                                <input value={user.fullname || ''} onChange={e => updateUserField(realIndex, 'fullname', e.target.value)} style={inputStyle} />
                                            </td>
                                            <td style={tdStyle}>
                                                <select value={user.role || ''} onChange={e => updateUserField(realIndex, 'role', e.target.value)} style={inputStyle}>
                                                    <option value="student">student</option>
                                                    <option value="teacher">teacher</option>
                                                    <option value="commission">commission</option>
                                                    <option value="admin">admin</option>
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

                        <div style={formGrid}>
                            <input placeholder="Ders Kodu" value={newCourse.courseCode} onChange={e => setNewCourse({ ...newCourse, courseCode: e.target.value })} style={inputStyle} />
                            <input placeholder="Ders Adı" value={newCourse.courseName} onChange={e => setNewCourse({ ...newCourse, courseName: e.target.value })} style={inputStyle} />
                            <input placeholder="Kredi" value={newCourse.localCredit} onChange={e => setNewCourse({ ...newCourse, localCredit: e.target.value })} style={inputStyle} />
                            <input placeholder="AKTS" value={newCourse.akts} onChange={e => setNewCourse({ ...newCourse, akts: e.target.value })} style={inputStyle} />
                            <input placeholder="Dönem" value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} style={inputStyle} />
                            <input placeholder="Seçmeli Paket / Ders Tipi" value={newCourse.courseType} onChange={e => setNewCourse({ ...newCourse, courseType: e.target.value })} style={inputStyle} />
                            <input placeholder="Ön Koşul Ders Kodu" value={newCourse.prerequisiteCode} onChange={e => setNewCourse({ ...newCourse, prerequisiteCode: e.target.value })} style={inputStyle} />
                        </div>

                        <button onClick={createCourse} style={primaryButton}>Ders Ekle</button>

                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Kod</th>
                                    <th style={thStyle}>Ad</th>
                                    <th style={thStyle}>Kredi</th>
                                    <th style={thStyle}>AKTS</th>
                                    <th style={thStyle}>Dönem</th>
                                    <th style={thStyle}>Paket</th>
                                    <th style={thStyle}>Ön Koşul</th>
                                    <th style={thStyle}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {curriculum.map((course, index) => (
                                    <tr key={course.courseid}>
                                        <td style={tdStyle}><input value={course.coursecode || ''} onChange={e => updateCourseField(index, 'coursecode', e.target.value)} style={inputStyle} /></td>
                                        <td style={tdStyle}><input value={course.coursename || ''} onChange={e => updateCourseField(index, 'coursename', e.target.value)} style={inputStyle} /></td>
                                        <td style={tdStyle}><input value={course.localcredit || ''} onChange={e => updateCourseField(index, 'localcredit', e.target.value)} style={inputStyle} /></td>
                                        <td style={tdStyle}><input value={course.akts || ''} onChange={e => updateCourseField(index, 'akts', e.target.value)} style={inputStyle} /></td>
                                        <td style={tdStyle}><input value={course.semester || ''} onChange={e => updateCourseField(index, 'semester', e.target.value)} style={inputStyle} /></td>
                                        <td style={tdStyle}><input value={course.coursetype || ''} onChange={e => updateCourseField(index, 'coursetype', e.target.value)} style={inputStyle} /></td>
                                        <td style={tdStyle}><input value={course.prerequisitecode || ''} onChange={e => updateCourseField(index, 'prerequisitecode', e.target.value)} style={inputStyle} /></td>
                                        <td style={tdStyle}>
                                            <button onClick={() => updateCourse(course)} style={smallButton}>Kaydet</button>
                                            <button onClick={() => deleteCourse(course.courseid)} style={dangerButton}>Sil</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div style={sectionStyle}>
                        <h3>Komisyon / İmza Bilgileri</h3>

                        <div style={formGrid}>
                            <input placeholder="Fakülte" value={newSetting.faculty} onChange={e => setNewSetting({ ...newSetting, faculty: e.target.value })} style={inputStyle} />
                            <input placeholder="Bölüm" value={newSetting.department} onChange={e => setNewSetting({ ...newSetting, department: e.target.value })} style={inputStyle} />
                            <input placeholder="1. Üye" value={newSetting.commissionMember1} onChange={e => setNewSetting({ ...newSetting, commissionMember1: e.target.value })} style={inputStyle} />
                            <input placeholder="2. Üye" value={newSetting.commissionMember2} onChange={e => setNewSetting({ ...newSetting, commissionMember2: e.target.value })} style={inputStyle} />
                            <input placeholder="3. Üye" value={newSetting.commissionMember3} onChange={e => setNewSetting({ ...newSetting, commissionMember3: e.target.value })} style={inputStyle} />
                            <input placeholder="Komisyon Başkanı" value={newSetting.commissionPresident} onChange={e => setNewSetting({ ...newSetting, commissionPresident: e.target.value })} style={inputStyle} />
                            <input placeholder="Bölüm Başkanı" value={newSetting.departmentHead} onChange={e => setNewSetting({ ...newSetting, departmentHead: e.target.value })} style={inputStyle} />
                        </div>

                        <button onClick={saveSettings} style={primaryButton}>İmza Bilgilerini Kaydet</button>

                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Fakülte</th>
                                    <th style={thStyle}>Bölüm</th>
                                    <th style={thStyle}>1. Üye</th>
                                    <th style={thStyle}>2. Üye</th>
                                    <th style={thStyle}>3. Üye</th>
                                    <th style={thStyle}>Başkan</th>
                                    <th style={thStyle}>Bölüm Başkanı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departmentSettings.map(item => (
                                    <tr key={item.settingid}>
                                        <td style={tdStyle}>{item.faculty}</td>
                                        <td style={tdStyle}>{item.department}</td>
                                        <td style={tdStyle}>{item.commissionmember1}</td>
                                        <td style={tdStyle}>{item.commissionmember2}</td>
                                        <td style={tdStyle}>{item.commissionmember3}</td>
                                        <td style={tdStyle}>{item.commissionpresident}</td>
                                        <td style={tdStyle}>{item.departmenthead}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'applications' && (
                    <div style={sectionStyle}>
                        <h3>Başvuru İzleme</h3>
                        {selectedApplication && (
                            <div style={{ ...sectionStyle, background: '#f8f9fa' }}>
                                <button
                                    onClick={() => setSelectedApplication(null)}
                                    style={smallButton}
                                >
                                    Detayı Kapat
                                </button>

                                <button
                                    onClick={() => downloadPDF(selectedApplication.application.applicationid)}
                                    style={{ ...smallButton, background: '#198754' }}
                                >
                                    PDF İndir
                                </button>

                                <h3>Başvuru Detayı</h3>

                                <p><b>Öğrenci:</b> {selectedApplication.application.studentname}</p>
                                <p><b>Öğrenci No:</b> {selectedApplication.application.studentno}</p>
                                <p><b>Fakülte:</b> {selectedApplication.application.faculty}</p>
                                <p><b>Bölüm:</b> {selectedApplication.application.department}</p>
                                <p><b>Durum:</b> {selectedApplication.application.status}</p>

                                <h4>Yüklenen Belgeler</h4>
                                {selectedApplication.attachments?.length === 0 ? (
                                    <p>Belge yok.</p>
                                ) : (
                                    selectedApplication.attachments.map(file => (
                                        <button
                                            key={file.attachmentid}
                                            style={smallButton}
                                            onClick={() => {
                                                const fileUrl = `http://localhost:5000/${file.filepath.replaceAll('\\', '/')}`;
                                                window.open(fileUrl, '_blank');
                                            }}
                                        >
                                            {file.filetype} Görüntüle
                                        </button>
                                    ))
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
                                                    {m.externalCourses?.map(c => (
                                                        <div key={`${c.code}-${c.name}`}>
                                                            {c.code} - {c.name}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td style={tdStyle}>
                                                    {m.externalCourses?.map(c => (
                                                        <div key={c.code}>{c.akts}</div>
                                                    ))}
                                                </td>
                                                <td style={tdStyle}>
                                                    {m.externalCourses?.map(c => (
                                                        <div key={c.code}>{c.grade}</div>
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
                            </div>
                        )}

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
                                {applications.map(app => (
                                    <tr key={app.applicationid}>
                                        <td style={tdStyle}>{app.applicationid}</td>
                                        <td style={tdStyle}>{app.studentname}</td>
                                        <td style={tdStyle}>{app.faculty}</td>
                                        <td style={tdStyle}>{app.department}</td>
                                        <td style={tdStyle}>{app.exemptionreason}</td>
                                        <td style={tdStyle}>{app.status}</td>
                                        <td style={tdStyle}>
                                            <button onClick={() => assignApplication(app.applicationid)} style={smallButton}>
                                                Bölüme Yönlendir
                                            </button>
                                            <button onClick={() => openApplicationDetail(app.applicationid)} style={smallButton}>
                                                Detay Gör
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
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

export default AdminDashboard;