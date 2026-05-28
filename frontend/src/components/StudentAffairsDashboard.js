import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Search, Edit2, X, Trash2, LogOut, User } from 'lucide-react';
import api from '../api';

const StudentAffairsDashboard = () => {
    const [formData, setFormData] = useState({
        studentName: '', tcNo: '', studentNo: '', department: '', password: ''
    });
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // 👤 Yeni: Giriş Yapan Yetkili State'i
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchStudents();
        fetchCurrentUser(); // Sayfa açılınca yetkili bilgisini de getir
    }, []);

    // 👤 Yeni: Yetkili Bilgisini Çeken Fonksiyon
    const fetchCurrentUser = async () => {
        try {
            const res = await api.get('/auth/me');
            setCurrentUser(res.data);
        } catch (err) {
            console.error("Yetkili bilgisi alınamadı", err);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get('/student-affairs/students');
            setStudents(res.data);
        } catch (err) {
            console.error("Öğrenciler yüklenemedi", err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleEditClick = (student) => {
        setFormData({
            studentName: student.fullname,
            tcNo: student.tckimlikno || '',
            studentNo: student.studentnumber,
            department: student.department,
            password: '***'
        });
        setIsEditing(true);
        setMessage('');
    };

    const handleDeleteClick = async (student) => {
        const no = student.studentnumber || student.StudentNumber || student.studentNo;

        if (!no) {
            setMessage("HATA: Öğrenci numarası bulunamadı (Veritabanı sütun ismi uyuşmazlığı)!");
            return;
        }

        if (window.confirm(`${no} numaralı öğrenciyi sistemden silmek istediğinize emin misiniz?`)) {
            try {
                await api.delete(`/student-affairs/students/${no}`);
                setMessage(`${no} numaralı öğrenci sistemden başarıyla SİLİNDİ!`);

                if (isEditing && formData.studentNo === no) {
                    cancelEdit();
                }
                fetchStudents();
            } catch (err) {
                console.error("Silme hatası:", err);
                setMessage("HATA: " + (err.response?.data?.message || err.message));
            }
        }
    };

    const cancelEdit = () => {
        setFormData({ studentName: '', tcNo: '', studentNo: '', department: '', password: '' });
        setIsEditing(false);
        setMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('İşlem yapılıyor...');

        try {
            if (isEditing) {
                await api.put(`/student-affairs/students/${formData.studentNo}`, formData);
                setMessage('Öğrenci bilgileri başarıyla GÜNCELLENDİ!');
            } else {
                await api.post('/student-affairs/register-student', formData);
                setMessage('Yeni öğrenci başarıyla KAYDEDİLDİ!');
            }
            cancelEdit();
            fetchStudents();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Bir hata oluştu.');
        }
    };

    // 🚪 Yeni: Çıkış Yapma Fonksiyonu
    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const filteredStudents = students.filter(student =>
        student.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentnumber?.includes(searchTerm) ||
        student.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- OMÜ Temasına Uygun Stiller ---
    const pageContainerStyle = { backgroundColor: '#f4f4f4', minHeight: '100vh', padding: '25px' };
    const innerContainerStyle = { maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' };
    const headerBannerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px 25px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
    const contentLayout = { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' };
    const sectionStyle = { backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
    const sectionHeaderStyle = { borderBottom: '2px solid #004a99', paddingBottom: '10px', color: '#004a99', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 };
    const formGroup = { marginBottom: '15px' };
    const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' };
    const inputStyle = { width: '100%', padding: '9px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' };
    const submitButtonStyle = { padding: '10px 14px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', width: '100%' };
    const messageStyle = { padding: '12px', marginBottom: '15px', border: '1px solid transparent', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' };
    const thStyle = { border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f1f1f1' };
    const tdStyle = { border: '1px solid #ddd', padding: '10px' };
    const actionBtnStyle = { border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'white' };

    return (
        <div style={pageContainerStyle}>
            <div style={innerContainerStyle}>

                {/* 🎓 ÜST BAŞLIK VE PROFİL BİLGİSİ */}
                <div style={headerBannerStyle}>
                    <div>
                        <h3 style={{ margin: '4px' }}>T.C. ONDOKUZ MAYIS ÜNİVERSİTESİ</h3>
                        <h2 style={{ margin: '4px', color: '#004a99' }}>Ders Saydırma ve Muafiyet Sistemi</h2>
                        <p style={{ margin: '4px', color: '#666' }}>Öğrenci İşleri Yönetim Paneli</p>
                    </div>

                    {/* 👤 YETKİLİ KART GÖRÜNÜMÜ */}
                    {currentUser && (
                        <div style={{ textAlign: 'right', background: '#f8f9fa', padding: '10px 15px', border: '1px solid #eee', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', color: '#333', fontWeight: 'bold', fontSize: '15px' }}>
                                <User size={18} color="#004a99" />
                                {currentUser.fullname || currentUser.FullName || 'Öğrenci İşleri'}
                            </div>
                            <div style={{ color: '#666', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>
                                {currentUser.faculty || currentUser.Faculty || 'Mühendislik Fakültesi'} - Öğrenci İşleri
                            </div>
                            <button
                                onClick={handleLogout}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' }}
                            >
                                <LogOut size={14} /> Çıkış Yap
                            </button>
                        </div>
                    )}
                </div>

                <div style={contentLayout}>
                    {/* SOL TARAF: FORM */}
                    <div style={{ ...sectionStyle, borderColor: isEditing ? '#ffeeba' : '#ddd', backgroundColor: isEditing ? '#fffcf5' : 'white' }}>
                        <h3 style={{ ...sectionHeaderStyle, color: isEditing ? '#856404' : '#004a99', borderBottomColor: isEditing ? '#ffeeba' : '#004a99' }}>
                            <UserPlus size={20} />
                            {isEditing ? "Öğrenciyi Düzenle" : "Yeni Öğrenci Kaydı"}
                        </h3>

                        {message && (
                            <div style={{
                                ...messageStyle,
                                backgroundColor: message.includes('HATA') || message.includes('başarısız') ? '#f8d7da' : '#d1e7dd',
                                color: message.includes('HATA') || message.includes('başarısız') ? '#842029' : '#0f5132',
                                borderColor: message.includes('HATA') || message.includes('başarısız') ? '#f5c2c7' : '#badbcc'
                            }}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={formGroup}>
                                <label style={labelStyle}>Öğrenci Adı Soyadı</label>
                                <input type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} style={inputStyle} required />
                            </div>
                            <div style={formGroup}>
                                <label style={labelStyle}>TC Kimlik No</label>
                                <input type="text" name="tcNo" value={formData.tcNo} onChange={handleInputChange} maxLength="11" style={inputStyle} required />
                            </div>
                            <div style={formGroup}>
                                <label style={labelStyle}>Öğrenci Numarası</label>
                                <input
                                    type="text" name="studentNo" value={formData.studentNo} onChange={handleInputChange}
                                    style={{ ...inputStyle, backgroundColor: isEditing ? '#e9ecef' : '#fff', cursor: isEditing ? 'not-allowed' : 'text' }}
                                    readOnly={isEditing}
                                    required
                                    title={isEditing ? "Öğrenci numarası güncellenemez." : "Bu numara aynı zamanda sisteme giriş kullanıcı adı olacaktır."}
                                />
                            </div>
                            <div style={formGroup}>
                                <label style={labelStyle}>Atanacak Bölüm</label>
                                <select name="department" value={formData.department} onChange={handleInputChange} style={inputStyle} required>
                                    <option value="">Seçiniz...</option>
                                    <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
                                    <option value="Elektrik Elektronik Mühendisliği">Elektrik Elektronik Mühendisliği</option>
                                    <option value="Çevre Mühendisliği">Çevre Mühendisliği</option>
                                    <option value="Gıda Mühendisliği">Gıda Mühendisliği</option>
                                </select>
                            </div>

                            {!isEditing && (
                                <div style={formGroup}>
                                    <label style={labelStyle}>Geçici Şifre</label>
                                    <input
                                        type="text"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        placeholder="Örn: 123456"
                                        required
                                        title="Öğrencinin sisteme ilk girişinde kullanacağı şifreyi belirleyin."
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" style={{ ...submitButtonStyle, backgroundColor: isEditing ? '#ffc107' : '#198754', color: isEditing ? '#000' : '#fff' }}>
                                    {isEditing ? "Değişiklikleri Güncelle" : "Sisteme Kaydet"}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={cancelEdit} style={{ ...submitButtonStyle, backgroundColor: '#6c757d', color: 'white', flex: '0 0 100px' }}>
                                        <X size={18} /> İptal
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* SAĞ TARAF: TABLO */}
                    <div style={sectionStyle}>
                        <h3 style={sectionHeaderStyle}>
                            <Users size={20} />
                            Kayıtlı Öğrenciler
                        </h3>

                        {/* 🔍 ARAMA KUTUSU */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                            <Search size={18} style={{ marginRight: '10px', color: '#666' }} />
                            <input
                                type="text"
                                placeholder="İsim, Numara veya Bölüm ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Öğrenci No</th>
                                        <th style={thStyle}>Ad Soyad</th>
                                        <th style={thStyle}>Bölüm</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student, index) => (
                                            <tr key={index} style={{ backgroundColor: isEditing && formData.studentNo === student.studentnumber ? '#fffcf5' : 'transparent' }}>
                                                <td style={tdStyle}><strong>{student.studentnumber}</strong></td>
                                                <td style={tdStyle}>{student.fullname}</td>
                                                <td style={tdStyle}>{student.department}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                        <button onClick={() => handleEditClick(student)} style={{ ...actionBtnStyle, background: '#004a99' }} title="Düzenle">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(student)} style={{ ...actionBtnStyle, background: '#dc3545' }} title="Sil">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888', border: '1px solid #ddd' }}>
                                                Kayıtlı veya aramanıza uygun öğrenci bulunamadı.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAffairsDashboard;