import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ExemptionForm from './components/ExemptionForm';
import Login from './components/Login'; // Birazdan oluşturacağız/güncelleyeceğiz

// 🔒 Yetkisiz erişimi engelleyen koruyucu bileşen
const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

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
                    {/* Herkese açık rota */}
                    <Route path="/login" element={<Login />} />

                    {/* Sadece ÖĞRENCİ erişebilir */}
                    <Route 
                        path="/basvuru-yap" 
                        element={
                            <ProtectedRoute allowedRoles={['student']}>
                                <ExemptionForm />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Sadece HOCA erişebilir (Dashboard'u sonra yapacağız) */}
                    <Route 
                        path="/hoca-paneli" 
                        element={
                            <ProtectedRoute allowedRoles={['teacher', 'commission']}>
                                <div>Hoca Onay Paneli Çok Yakında...</div>
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