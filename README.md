📺 Digital Signage Player (Dijital Ekran Yöneticisi)
English | Türkçe

<a name="english"></a>

🇬🇧 English
Digital Signage Player is a robust, open-source content management solution designed for retail stores, pharmacies, waiting rooms, and corporate lobbies. It transforms any secondary monitor or TV into a professional digital signage display while keeping your main workstation free for work.

Built with Electron, it supports video, images, and web content with advanced scheduling and hardware control.

✨ Key Features
🖥️ Smart Dual-Monitor Support: Designed to run on a secondary display (TV/Monitor).

🛡️ Smart Protection & Hot-Plug Detection:

Auto-Start: Automatically launches the player on the second screen when a cable (HDMI/DP) is plugged in.

Safety Lock: If the second screen is disconnected, the player automatically closes to prevent interfering with your main workflow.

📅 Advanced Scheduling: Schedule specific content to play only on certain days, dates, or time ranges.

🔊 Audio Management:

Select specific audio output devices (e.g., separate speakers for the signage).

Volume control, mute toggle, and smooth fade-in effects for videos.

🌍 Multi-Language Support:

Full UI support for English, Turkish, German, French, and Arabic.

Automatic RTL (Right-to-Left) layout adjustment for Arabic.

Multi-language installer setup.

📢 Info Bar & Marquee: Customizable scrolling text (marquee) with adjustable speed, branding area, and real-time clock.

📂 Content Types: Supports MP4, WebM videos, JPG/PNG images, and live Web URLs.

💾 Backup & Restore: Export your entire playlist, settings, and theme configuration to a JSON file and restore it on another device instantly.

🚀 Installation & Usage
Download the latest installer (.exe) from the releases page.

Run the setup and select your preferred installation language.

Launch the Management Panel from the system tray icon.

Configuration:

Select your target monitor.

Enable "Play on 2nd Screen Only" for smart protection.

Add media files or URLs to the playlist.

Click "SAVE AND PUBLISH".

🛠️ Development
To build this project from source:

Bash

# 1. Clone the repository
git clone https://github.com/yourusername/digital-signage-player.git

# 2. Install dependencies
npm install

# 3. Run in development mode
npm start

# 4. Build executable (Windows .exe)
npm run dist
📂 Project Structure
main.js: Electron main process (Hardware control, Window management, IPC).

views/: HTML/CSS/JS files for the Settings Panel and Player Window.

locales/: JSON language files (en, tr, de, fr, ar).

assets/: Icons and static resources.

<a name="türkçe"></a>

🇹🇷 Türkçe
Dijital Ekran Yöneticisi, eczaneler, mağazalar, bekleme salonları ve kurumsal lobiler için tasarlanmış profesyonel bir içerik yönetim çözümüdür. İkinci bir monitörü veya TV'yi profesyonel bir reklam/bilgi ekranına dönüştürürken, ana bilgisayarınızda çalışmaya devam etmenize olanak tanır.

Electron altyapısı ile geliştirilmiştir; video, resim ve web içeriğini gelişmiş zamanlama seçenekleriyle oynatır.

✨ Temel Özellikler
🖥️ Akıllı Çift Monitör Desteği: İçerikleri doğrudan ikinci ekranda (TV/Monitör) tam ekran oynatır.

🛡️ Akıllı Koruma ve Tak-Çıkar Algılama:

Otomatik Başlatma: İkinci ekran kablosu (HDMI/DP) takıldığı an oynatıcı otomatik olarak o ekranda başlar.

Güvenlik Kilidi: İkinci ekran bağlantısı kesilirse, oynatıcı ana ekranınızı işgal etmemek için kendini otomatik kapatır.

📅 Gelişmiş Zamanlama: İçerikleri belirli günlerde, tarih aralıklarında veya saat dilimlerinde oynatılacak şekilde ayarlayın.

🔊 Ses Yönetimi:

Sadece ekran için özel ses çıkış cihazı seçebilme.

Ses seviyesi kontrolü, sessize alma ve videolar için yumuşak ses geçişi (fade-in).

🌍 Çoklu Dil Desteği:

Türkçe, İngilizce, Almanca, Fransızca ve Arapça arayüz desteği.

Arapça için otomatik Sağdan Sola (RTL) yerleşim düzeni.

Kurulum aşamasında dil seçimi.

📢 Bilgi Çubuğu: Hızı ayarlanabilir kayan yazı (duyuru), firma ismi ve canlı saat göstergesi.

📂 İçerik Türleri: MP4, WebM videoları, JPG/PNG resimler ve Canlı Web Siteleri.

💾 Yedekleme ve Geri Yükleme: Tüm oynatma listenizi, ayarlarınızı ve renk temanızı tek bir JSON dosyası olarak dışa aktarın ve başka bir bilgisayara saniyeler içinde kurun.

🚀 Kurulum ve Kullanım
En son sürüm yükleyiciyi (.exe) indirin.

Kurulumu çalıştırın ve kurulum dilini seçin.

Sağ alt köşedeki (System Tray) simgeden Yönetim Paneli'ni açın.

Yapılandırma:

Hedef monitörü seçin.

Akıllı koruma için "Sadece 2. Ekranda Oynat" seçeneğini aktif edin.

Dosya veya URL ekleyerek listenizi oluşturun.

"KAYDET VE YAYINLA" butonuna basın.

🛠️ Geliştirme (Development)
Projeyi kaynak kodlarından çalıştırmak için:

Bash

# 1. Projeyi klonlayın
git clone https://github.com/kullaniciadi/digital-signage-player.git

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirici modunda çalıştırın
npm start

# 4. Kurulum dosyası oluşturun (.exe)
npm run dist
📄 Lisans
Bu proje ISC lisansı ile lisanslanmıştır.

Author / Yapımcı: Mehmet S. YILMAZ
