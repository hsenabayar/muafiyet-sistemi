import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { User, GraduationCap, Settings, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('student'); // Varsayılan: Öğrenci
    const navigate = useNavigate();

    // Rol tanımları ve ikonları
    const roles = [
        { id: 'student', name: 'Öğrenci', icon: <GraduationCap size={24} /> },
        { id: 'teacher', name: 'Bölüm Yetkilisi', icon: <User size={24} /> },
        { id: 'commission', name: 'Öğrenci İşleri', icon: <Settings size={24} /> },
        { id: 'admin', name: 'Sistem Admin', icon: <ShieldCheck size={24} /> },
    ];

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Seçilen rolü de backend'e gönderiyoruz ki kontrol edebilsin
            const res = await api.post('/auth/login', { 
                username, 
                password, 
                role: selectedRole 
            });
            
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('role', user.role);
            localStorage.setItem('userName', user.fullname);

            // Role göre ilgili sayfaya yönlendiriyoruz
            if (user.role === 'student') {
                navigate('/basvuru-yap');
            } else {
                navigate('/hoca-paneli');
            }
            
        } catch (err) {
            alert(err.response?.data?.message || "Giriş başarısız.");
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
            <div style={{ maxWidth: '450px', width: '100%', padding: '30px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <h2 style={{ textAlign: 'center', color: '#004a99', marginBottom: '10px' }}>OMÜ Muafiyet Giriş</h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '25px', fontSize: '14px' }}>Lütfen sistemdeki rolünüzü seçerek giriş yapın</p>
                
                {/* ROL SEÇİM ALANI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
                    {roles.map((r) => (
                        <div 
                            key={r.id}
                            onClick={() => setSelectedRole(r.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px',
                                border: selectedRole === r.id ? '2px solid #004a99' : '1px solid #ddd',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: selectedRole === r.id ? '#eef6ff' : 'white',
                                transition: '0.2s all ease'
                            }}
                        >
                            <span style={{ color: selectedRole === r.id ? '#004a99' : '#999' }}>{r.icon}</span>
                            <span style={{ fontSize: '13px', fontWeight: selectedRole === r.id ? 'bold' : 'normal', color: selectedRole === r.id ? '#004a99' : '#333' }}>
                                {r.name}
                            </span>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '15px' }}>
                        <input 
                            type="text" 
                            placeholder="Kullanıcı Adı / E-posta" 
                            onChange={e => setUsername(e.target.value)} 
                            autoComplete="off"
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                            required 
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <input 
                            type="password" 
                            placeholder="Şifre" 
                            onChange={e => setPassword(e.target.value)} 
                            autoComplete="new-password"
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
                            required 
                        />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '14px', background: '#004a99', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                        {selectedRole.toUpperCase()} OLARAK GİRİŞ YAP
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;