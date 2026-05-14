import React, { useEffect, useState } from 'react';
import api from '../api';

const TeacherDashboard = () => {
    const [applications, setApplications] = useState([]);
    const userName = localStorage.getItem('userName');

    useEffect(() => {
        // Backend'den tüm başvuruları çekiyoruz
        api.get('/applications/all-applications')
            .then(res => setApplications(res.data.data))
            .catch(err => console.error("Başvurular yüklenemedi", err));
    }, []);

    const handleApprove = (id) => {
        // Onay mekanizması kodları buraya gelecek
        alert(`Başvuru #${id} onaylandı!`);
    };

    return (
        <div style={{ padding: '30px', fontFamily: 'Arial' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#004a99' }}>Bölüm Yetkilisi Değerlendirme Paneli</h2>
                <span>Hoş geldiniz, <b>{userName}</b></span>
            </div>

            <table border="1" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#004a99', color: 'white' }}>
                    <tr>
                        <th style={{ padding: '10px' }}>Öğrenci No</th>
                        <th>Ad Soyad</th>
                        <th>Bölüm</th>
                        <th>Tarih</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    {applications.length > 0 ? applications.map(app => (
                        <tr key={app.applicationid}>
                            <td style={{ padding: '10px' }}>{app.studentnumber}</td>
                            <td>{app.fullname}</td>
                            <td>{app.department}</td>
                            <td>{new Date(app.createdat).toLocaleDateString()}</td>
                            <td>
                                <span style={{ padding: '5px', borderRadius: '4px', background: app.status === 'Pending' ? '#fff3cd' : '#d4edda' }}>
                                    {app.status}
                                </span>
                            </td>
                            <td>
                                <button onClick={() => handleApprove(app.applicationid)} style={{ marginRight: '5px', cursor: 'pointer' }}>İncele</button>
                                <button style={{ color: 'red', cursor: 'pointer' }}>Reddet</button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Henüz başvuru bulunmamaktadır.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TeacherDashboard;