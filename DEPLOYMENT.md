# Coolify Deployment Talimatları

## Adım 1: GitHub'a Yükleme

PowerShell veya Git Bash'te şu komutları çalıştırın:

```bash
cd c:/Users/HakanG/Desktop/LisansKontrol

# Git repository başlat
git init

# Tüm dosyaları ekle
git add .

# İlk commit
git commit -m "Initial commit: License Control System"

# Ana branch'i main olarak ayarla
git branch -M main

# Remote repository ekle
git remote add origin https://github.com/coinfxpro/lisanskontrol.git

# GitHub'a push et
git push -u origin main
```

**NOT:** GitHub'da repository'yi önceden oluşturmanız gerekebilir.

---

## Adım 2: Coolify'de Yeni Proje Oluşturma

1. Coolify dashboard'a giriş yapın: `http://194.62.52.109:8000`
2. Sol menüden **Projects** seçin
3. **+ Add Resource** butonuna tıklayın
4. **New Project** seçeneğini seçin
5. Proje adı: `License Control System`

---

## Adım 3: PostgreSQL Database Ekleme

1. Yeni oluşturduğunuz projede **+ Add Resource** tıklayın
2. **Database** > **PostgreSQL** seçin
3. Ayarlar:
   - **Name:** `license-postgres`
   - **Database Name:** `licensedb`
   - **Username:** `licenseuser`
   - **Password:** Güçlü bir şifre belirleyin (örn: `LicenseDB2026!Secure`)
4. **Create** butonuna tıklayın
5. Database'in başlatılmasını bekleyin

**ÖNEMLİ:** Database connection string'i not edin:
```
postgresql://licenseuser:[ŞİFRENİZ]@license-postgres:5432/licensedb
```

---

## Adım 4: Backend Uygulaması Ekleme

1. Aynı projede **+ Add Resource** > **Application** tıklayın
2. **Public Repository** seçin
3. Ayarlar:
   - **Repository URL:** `https://github.com/coinfxpro/lisanskontrol.git`
   - **Branch:** `main`
   - **Build Pack:** `Dockerfile`
   - **Dockerfile Location:** `/backend/Dockerfile`
   - **Base Directory:** `/backend`
   - **Name:** `license-backend`
   - **Port:** `3001`

4. **Environment Variables** bölümüne ekleyin:
   ```
   DATABASE_URL=postgresql://licenseuser:[ŞİFRENİZ]@license-postgres:5432/licensedb
   PORT=3001
   NODE_ENV=production
   ```

5. **Domains** bölümünde:
   - Domain ekleyin (örn: `api-license.yourdomain.xyz`)
   - VEYA Coolify'nin otomatik verdiği domain'i kullanın

6. **Deploy** butonuna tıklayın

---

## Adım 5: Frontend Uygulaması Ekleme

1. Aynı projede **+ Add Resource** > **Application** tıklayın
2. **Public Repository** seçin
3. Ayarlar:
   - **Repository URL:** `https://github.com/coinfxpro/lisanskontrol.git`
   - **Branch:** `main`
   - **Build Pack:** `Dockerfile`
   - **Dockerfile Location:** `/frontend/Dockerfile`
   - **Base Directory:** `/frontend`
   - **Name:** `license-frontend`
   - **Port:** `80`

4. **Environment Variables** bölümüne ekleyin:
   ```
   REACT_APP_API_URL=/api
   ```

5. **Domains** bölümünde:
   - Domain ekleyin (örn: `license.yourdomain.xyz`)
   - VEYA Coolify'nin otomatik verdiği domain'i kullanın

6. **Deploy** butonuna tıklayın

---

## Adım 6: Domain Yapılandırması

### Backend API Domain
Örnek: `https://api-license.yourdomain.xyz`

Bu domain'i programınızda lisans kontrolü için kullanacaksınız:

```javascript
// Programınızda kullanacağınız URL
const API_URL = "https://api-license.yourdomain.xyz/api/validate-license";

// Örnek kullanım
fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    license_key: "ASU-A4K9X2-20260513",
    machine_id: "xxxxx"
  })
})
.then(response => response.json())
.then(data => {
  if (data.valid) {
    console.log("Lisans geçerli!");
    // Programınız çalışmaya devam edebilir
  } else {
    console.log("Lisans geçersiz:", data.error);
    // Programı durdur
  }
});
```

### Frontend Panel Domain
Örnek: `https://license.yourdomain.xyz`

Bu adresten lisansları yönetebilirsiniz.

---

## Adım 7: İlk Lisans Oluşturma

1. Frontend panel'e girin: `https://license.yourdomain.xyz`
2. **Yeni Lisans Ekle** butonuna tıklayın
3. **Oluştur** butonu ile otomatik lisans anahtarı oluşturun
4. Müşteri adını girin
5. Son kullanma tarihini seçin
6. **Ekle** butonuna tıklayın

---

## Güvenlik Kontrol Listesi

✅ Database şifresini güçlü tutun
✅ `.env` dosyasını asla GitHub'a yüklemeyin
✅ HTTPS kullanımı aktif olsun
✅ Düzenli database yedekleri alın
✅ Sadece gerekli portları açık tutun

---

## Sorun Giderme

### Backend başlamıyor
- Database'in çalıştığından emin olun
- Environment variables'ları kontrol edin
- Logs'ları inceleyin: Coolify > Backend > Logs

### Frontend API'ye bağlanamıyor
- Backend'in çalıştığından emin olun
- nginx.conf'ta proxy ayarlarını kontrol edin
- Browser console'da hata mesajlarını kontrol edin

### Database bağlantı hatası
- Connection string'in doğru olduğundan emin olun
- Database container'ının çalıştığını kontrol edin
- Network ayarlarını kontrol edin

---

## Mevcut Sunucudaki Diğer Projelere Etkisi

**HAYIR, HİÇBİR ETKİSİ OLMAZ!**

Coolify her projeyi izole Docker container'larda çalıştırır:
- Ayrı network'ler
- Ayrı volume'ler
- Ayrı portlar
- Ayrı environment variables

Mevcut `xscanai-main` projeniz tamamen bağımsız çalışmaya devam edecektir.

---

## Lisans Doğrulama URL'i

Programınızda kullanacağınız tam URL:

```
https://[BACKEND-DOMAIN]/api/validate-license
```

Örnek:
```
https://api-license.yourdomain.xyz/api/validate-license
```

veya Coolify otomatik domain:
```
https://license-backend-abc123.coolify.io/api/validate-license
```

---

## Destek

Herhangi bir sorun yaşarsanız:
1. Coolify logs'larını kontrol edin
2. GitHub Issues açın
3. Deployment loglarını paylaşın
