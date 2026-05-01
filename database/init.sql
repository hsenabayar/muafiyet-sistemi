-- 1. Tablo: Users (Kullanıcılar)
-- Sistemdeki tüm aktörleri ve rollerini (Öğrenci, Bölüm Yetkilisi vb.) tutar[cite: 181, 190].
CREATE TABLE Users (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash TEXT NOT NULL,
    Role VARCHAR(20) NOT NULL, -- 'Ogrenci', 'Ogrenci Isleri', 'Bolum Yetkilisi', 'Admin' [cite: 191]
    FullName VARCHAR(100),
    TCKimlikNo CHAR(11),
    StudentNumber VARCHAR(20),
    Department VARCHAR(100),
    Program VARCHAR(100),
    Email VARCHAR(100)
);

-- 2. Tablo: Curriculum (Müfredat)
-- Bölümün mevcut derslerini ve AKTS bilgilerini içerir[cite: 219, 254].
CREATE TABLE Curriculum (
    CourseID SERIAL PRIMARY KEY,
    CourseCode VARCHAR(20) NOT NULL,
    CourseName VARCHAR(200) NOT NULL,
    TheoreticalHours INT DEFAULT 0,
    PracticeHours INT DEFAULT 0,
    LabHours INT DEFAULT 0,
    LocalCredit DECIMAL(4,2),
    AKTS INT NOT NULL,
    Semester INT, -- 1-8 arası dönem bilgisi [cite: 256]
    CourseType VARCHAR(50), -- Zorunlu, Seçmeli [cite: 257]
    PackageName VARCHAR(100), -- SSD, TS paketleri için kritik [cite: 258]
    IsActive BOOLEAN DEFAULT TRUE
);

-- 3. Tablo: Applications (Başvurular)
-- Öğrencinin geldiği üniversite ve başvuru genel bilgilerini tutar[cite: 224, 229].
CREATE TABLE Applications (
    ApplicationID SERIAL PRIMARY KEY,
    UserID INT REFERENCES Users(UserID) ON DELETE CASCADE,
    AcademicYear VARCHAR(10),
    Semester VARCHAR(20),
    SourceUniversity VARCHAR(150),
    SourceFaculty VARCHAR(150),
    SourceDepartment VARCHAR(150),
    Status VARCHAR(50) DEFAULT 'Taslak', -- 'Taslak', 'Incelemede', 'Onaylandi' [cite: 230]
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CommissionNote TEXT,
    TotalExemptedAKTS INT DEFAULT 0
);

-- 4. Tablo: ExternalCourses (Dışarıdan Alınan Dersler)
-- Öğrencinin geldiği üniversitede aldığı derslerin dökümüdür[cite: 238, 239].
CREATE TABLE ExternalCourses (
    ExtCourseID SERIAL PRIMARY KEY,
    ApplicationID INT REFERENCES Applications(ApplicationID) ON DELETE CASCADE,
    CourseCode VARCHAR(20),
    CourseName VARCHAR(200),
    Grade VARCHAR(5), -- Öğrencinin eski üniversitesindeki notu [cite: 243]
    SourceAKTS INT
);

-- 5. Tablo: ExemptionDecisions (Muafiyet Kararları)
-- Muafiyet taleplerinin nihai onay/ret durumunu tutar[cite: 236, 263].
CREATE TABLE ExemptionDecisions (
    DecisionID SERIAL PRIMARY KEY,
    ApplicationID INT REFERENCES Applications(ApplicationID) ON DELETE CASCADE,
    TargetCourseID INT REFERENCES Curriculum(CourseID), -- Bizdeki karşılığı [cite: 262]
    ApprovedGrade VARCHAR(5), -- Bizim komisyonun verdiği harf notu [cite: 262]
    IsApproved BOOLEAN,
    CommissionComment TEXT
);

-- 6. Tablo: DecisionDetails (Karar Detayları)
-- Diyagramdaki ara tablo: Dış dersler ile kararlar arasındaki bağlantı[cite: 246, 249].
CREATE TABLE DecisionDetails (
    DetailID SERIAL PRIMARY KEY,
    DecisionID INT REFERENCES ExemptionDecisions(DecisionID) ON DELETE CASCADE,
    ExtCourseID INT REFERENCES ExternalCourses(ExtCourseID)
);

-- 7. Tablo: Prerequisites (Ön Koşullar)
-- Dersler arası akademik ön koşul bağlarını tutar[cite: 270, 272].
CREATE TABLE Prerequisites (
    PrereqID SERIAL PRIMARY KEY,
    MainCourseID INT REFERENCES Curriculum(CourseID),
    RequiredCourseID INT REFERENCES Curriculum(CourseID)
);

-- 8. Tablo: Attachments (Ekler)
-- Transkript ve ders içerikleri gibi dosyaların referanslarını tutar[cite: 265, 269].
CREATE TABLE Attachments (
    AttachmentID SERIAL PRIMARY KEY,
    ApplicationID INT REFERENCES Applications(ApplicationID) ON DELETE CASCADE,
    FileType VARCHAR(50),
    FilePath TEXT,
    UploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Örnek Admin Hesabı (Sistemi ilk kez açtığınızda giriş yapabilmeniz için)
INSERT INTO Users (Username, PasswordHash, Role, FullName) 
VALUES ('admin', 'admin_hash_buraya', 'Admin', 'Sistem Yoneticisi');