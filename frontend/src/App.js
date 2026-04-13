import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Key, 
  Users, 
  Calendar, 
  Activity, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [licenses, setLicenses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('licenses');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newLicense, setNewLicense] = useState({
    license_key: '',
    customer_name: '',
    expires_at: ''
  });

  useEffect(() => {
    fetchLicenses();
    fetchLogs();
    fetchStats();
    const interval = setInterval(() => {
      fetchLicenses();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLicenses = async () => {
    try {
      const response = await axios.get(`${API_URL}/licenses`);
      setLicenses(response.data);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/logs`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateLicenseKey = () => {
    const segments = [];
    for (let i = 0; i < 3; i++) {
      const segment = Math.random().toString(36).substring(2, 8).toUpperCase();
      segments.push(segment);
    }
    return `ASU-${segments.join('-')}`;
  };

  const handleAddLicense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/licenses`, newLicense);
      setShowAddModal(false);
      setNewLicense({ license_key: '', customer_name: '', expires_at: '' });
      fetchLicenses();
      fetchStats();
    } catch (error) {
      alert('Hata: ' + (error.response?.data?.error || 'Lisans eklenemedi'));
    }
  };

  const handleDeleteLicense = async (id) => {
    if (window.confirm('Bu lisansı silmek istediğinizden emin misiniz?')) {
      try {
        await axios.delete(`${API_URL}/licenses/${id}`);
        fetchLicenses();
        fetchStats();
      } catch (error) {
        alert('Lisans silinemedi');
      }
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await axios.put(`${API_URL}/licenses/${id}`, {
        is_active: !currentStatus
      });
      fetchLicenses();
      fetchStats();
    } catch (error) {
      alert('Durum güncellenemedi');
    }
  };

  const isExpired = (date) => {
    return new Date(date) < new Date();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Key size={32} />
            <h1>Lisans Kontrol Paneli</h1>
          </div>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#667eea' }}>
            <Key size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Toplam Lisans</p>
            <p className="stat-value">{stats.total_licenses || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#48bb78' }}>
            <Check size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Aktif Lisans</p>
            <p className="stat-value">{stats.active_licenses || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f56565' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Süresi Dolmuş</p>
            <p className="stat-value">{stats.expired_licenses || 0}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ed8936' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Toplam Doğrulama</p>
            <p className="stat-value">{stats.total_validations || 0}</p>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          <Key size={18} />
          Lisanslar
        </button>
        <button 
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Activity size={18} />
          Doğrulama Logları
        </button>
      </div>

      <div className="content">
        {activeTab === 'licenses' && (
          <div className="licenses-section">
            <div className="section-header">
              <h2>Lisans Yönetimi</h2>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={18} />
                Yeni Lisans Ekle
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Lisans Anahtarı</th>
                    <th>Müşteri Adı</th>
                    <th>Makine ID</th>
                    <th>Son Kullanma</th>
                    <th>Durum</th>
                    <th>Aktivasyon</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => (
                    <tr key={license.id}>
                      <td className="license-key">{license.license_key}</td>
                      <td>{license.customer_name}</td>
                      <td className="machine-id">{license.machine_id || '-'}</td>
                      <td className={isExpired(license.expires_at) ? 'expired' : ''}>
                        {formatDate(license.expires_at)}
                      </td>
                      <td>
                        <span className={`badge ${license.is_active ? 'active' : 'inactive'}`}>
                          {license.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>{license.activation_count || 0}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon"
                            onClick={() => handleToggleActive(license.id, license.is_active)}
                            title={license.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            {license.is_active ? <X size={16} /> : <Check size={16} />}
                          </button>
                          <button 
                            className="btn-icon danger"
                            onClick={() => handleDeleteLicense(license.id)}
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-section">
            <h2>Doğrulama Logları</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tarih/Saat</th>
                    <th>Lisans Anahtarı</th>
                    <th>Makine ID</th>
                    <th>IP Adresi</th>
                    <th>Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.validated_at).toLocaleString('tr-TR')}</td>
                      <td className="license-key">{log.license_key}</td>
                      <td className="machine-id">{log.machine_id}</td>
                      <td>{log.ip_address}</td>
                      <td>
                        <span className={`badge ${log.is_valid ? 'active' : 'inactive'}`}>
                          {log.is_valid ? 'Başarılı' : 'Başarısız'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yeni Lisans Ekle</h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddLicense}>
              <div className="form-group">
                <label>Lisans Anahtarı</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={newLicense.license_key}
                    onChange={(e) => setNewLicense({...newLicense, license_key: e.target.value})}
                    required
                    placeholder="ASU-XXXXXX-XXXXXX"
                  />
                  <button 
                    type="button" 
                    className="btn-generate"
                    onClick={() => setNewLicense({...newLicense, license_key: generateLicenseKey()})}
                  >
                    Oluştur
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Müşteri Adı</label>
                <input
                  type="text"
                  value={newLicense.customer_name}
                  onChange={(e) => setNewLicense({...newLicense, customer_name: e.target.value})}
                  required
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="form-group">
                <label>Son Kullanma Tarihi</label>
                <input
                  type="date"
                  value={newLicense.expires_at}
                  onChange={(e) => setNewLicense({...newLicense, expires_at: e.target.value})}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn-primary">
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
