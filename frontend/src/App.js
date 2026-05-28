import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ExemptionForm from './components/ExemptionForm';
import Login from './components/Login';
import TeacherDashboard from './components/TeacherDashboard'; // Yeni oluşturacağın bileşen
import AdminDashboard from './components/AdminDashboard'; // Yeni oluşturacağın bileşen
import StudentAffairsDashboard from './components/StudentAffairsDashboard';

// 🔒 Yetkisiz erişimi engelleyen koruyucu bileşen
const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    // Hiç giriş yapılmamışsa login'e at
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Giriş yapılmış ama rolü bu sayfa için yetersizse unauthorized'a at
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    {/* Herkese açık rotalar */}
                    <Route path="/login" element={<Login />} />
                    
                    {/* Yetkisiz Erişim Sayfası */}
                    <Route path="/unauthorized" element={
                        <div style={{ textAlign: 'center', marginTop: '50px' }}>
                            <h1>403 - Yetkisiz Erişim</h1>
                            <p>Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz.</p>
                            <button onClick={() => window.location.href='/login'}>Giriş Sayfasına Dön</button>
                        </div>
                    } />

                    {/* 🎓 ÖĞRENCİ: Sadece başvuru formu */}
                    <Route 
                        path="/basvuru-yap" 
                        element={
                            <ProtectedRoute allowedRoles={['student']}>
                                <ExemptionForm />
                            </ProtectedRoute>
                        } 
                    />

                    {/* 👨‍🏫 BÖLÜM YETKİLİSİ: Başvuru listesi ve Onay */}
                    <Route 
                        path="/hoca-paneli" 
                        element={
                            <ProtectedRoute allowedRoles={['teacher',]}>
                                <TeacherDashboard />
                            </ProtectedRoute>
                        } 
                    />

                    {/* 🎓 ÖĞRENCİ İŞLERİ: Yeni Öğrenci Kaydı (GÜVENLİ) */}
                    <Route
                        path="/student-affairs"
                        element={
                            <ProtectedRoute allowedRoles={['commission', 'admin']}>
                                <StudentAffairsDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* ⚙️ ADMIN: Sistem yönetimi */}
                    <Route 
                        path="/admin-paneli" 
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Varsayılan rota: Giriş ekranına yönlendir */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;