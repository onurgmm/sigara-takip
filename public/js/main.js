// Sayfa yüklendiğinde çalışacak işlemler
document.addEventListener('DOMContentLoaded', function() {
    
    // Form elemanını seçme
    const quitForm = document.getElementById('quitForm');
    
    // Form varsa dinleyici ekle
    if (quitForm) {
        quitForm.addEventListener('submit', function(event) {
            
            // İnput değerlerini alma
            const name = document.getElementById('name').value.trim();
            const quitDate = document.getElementById('quit_date').value;
            const dailyCigarettes = document.getElementById('daily_cigarettes').value;
            const packPrice = document.getElementById('pack_price').value;
            const cigarettesPerPack = document.getElementById('cigarettes_per_pack').value;
            
            // 1. Boş alan kontrolü
            if (!name || !quitDate || !dailyCigarettes || !packPrice || !cigarettesPerPack) {
                alert('Lütfen tüm alanları eksiksiz doldurun!');
                event.preventDefault(); // Form gönderimini durdur
                return;
            }
            
            // 2. Tarih kontrolü (bugünden ileri olmamalı)
            const selectedDate = new Date(quitDate);
            const today = new Date();
            // Saatleri sıfırla ki sadece gün bazında karşılaştırsın
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate > today) {
                alert('Hata: Bırakma tarihi bugünden ileri bir tarih olamaz!');
                event.preventDefault(); // Form gönderimini durdur
                return;
            }
            
            // 3. Mantıksal rakam kontrolü (Negatif veya sıfır girilmemeli)
            if (dailyCigarettes <= 0 || packPrice <= 0 || cigarettesPerPack <= 0) {
                alert('Hata: Lütfen geçerli (sıfırdan büyük) rakamlar girin!');
                event.preventDefault(); // Form gönderimini durdur
                return;
            }
        });
    }

    // --- PROFIL SISTEMI ---
    // --- PROFIL SISTEMI (DROPDOWN) ---
    function saveProfile(profile) {
        let profiles = JSON.parse(localStorage.getItem("profiles") || "[]");
        const existingIndex = profiles.findIndex(p => String(p.id) === String(profile.id));

        if (existingIndex !== -1) {
            profiles[existingIndex] = {
                ...profiles[existingIndex],
                name: profile.name,
                savedAt: new Date().toISOString()
            };
        } else {
            profiles.push({
                id: profile.id,
                name: profile.name,
                savedAt: new Date().toISOString()
            });
        }

        profiles.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        if (profiles.length > 3) profiles = profiles.slice(0, 3);
        localStorage.setItem("profiles", JSON.stringify(profiles));
    }

    if (window.currentProfile) {
        saveProfile(window.currentProfile);
    }

    const profiles = JSON.parse(localStorage.getItem("profiles") || "[]");
    const profileIconButton = document.getElementById('profileIconButton');
    const profileDropdown = document.getElementById('profileDropdown');
    const profileDropdownList = document.getElementById('profileDropdownList');

    if (profileIconButton && profileDropdown && profileDropdownList) {
        // Dropdown içeriğini oluştur
        if (profiles.length > 0) {
            profileDropdownList.innerHTML = '';
            profiles.forEach(p => {
                const item = document.createElement('a');
                item.href = `/dashboard/${p.id}`;
                item.className = 'profile-item';
                item.innerHTML = `
                    <span class="profile-item-icon">👤</span>
                    <span class="profile-item-name">${p.name}</span>
                `;
                profileDropdownList.appendChild(item);
            });
        } else {
            profileDropdownList.innerHTML = '<div class="no-profile-text">Kayıtlı profil yok.</div>';
        }

        // Dropdown aç/kapat
        profileIconButton.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });

        // Dışarı tıklanınca kapat
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && e.target !== profileIconButton) {
                profileDropdown.classList.add('hidden');
            }
        });
    }

    // --- SAĞLIK MODALI SISTEMI ---
    const healthModal = document.getElementById('healthModal');
    const openHealthModalBtn = document.getElementById('healthButton');
    const closeHealthModalBtn = document.getElementById('closeHealthModalBtn');

    if (openHealthModalBtn && healthModal && closeHealthModalBtn) {
        openHealthModalBtn.addEventListener('click', () => {
            healthModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Arkaplanı kaydırmayı kapat
        });

        closeHealthModalBtn.addEventListener('click', () => {
            healthModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        window.addEventListener('click', (e) => {
            if (e.target === healthModal) {
                healthModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && healthModal.style.display === 'block') {
                healthModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    // --- FİYAT GÜNCELLEME MODALI ---
    const priceModal = document.getElementById('priceModal');
    const openPriceModalBtn = document.getElementById('openPriceModalBtn');
    const closePriceModalBtn = document.getElementById('closePriceModalBtn');

    if (priceModal && openPriceModalBtn && closePriceModalBtn) {
        openPriceModalBtn.addEventListener('click', () => {
            priceModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });

        closePriceModalBtn.addEventListener('click', () => {
            priceModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        window.addEventListener('click', (e) => {
            if (e.target === priceModal) {
                priceModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && priceModal.style.display === 'block') {
                priceModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    // --- KUTLAMA VE UYARI ANİMASYONU SİSTEMİ ---
    const dailyLogForm = document.querySelector('.daily-log-form');
    const successBtn = document.querySelector('.btn-log-success[data-status="success"]');
    const relapsedBtn = document.querySelector('.btn-log-danger[data-status="relapsed"]');

    if (dailyLogForm && successBtn) {
        successBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Normal form gönderimini engelle
            
            const formData = new URLSearchParams();
            formData.append('status', 'success');
            
            try {
                // Formu arkaplanda gönder
                const response = await fetch(dailyLogForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const result = await response.json();
                    console.error("Daily log API hatası:", result);
                    alert(result.message + (result.error ? "\nDetay: " + result.error : ""));
                    return;
                }
                
                // Tam ekran animasyonu başlat
                showFullscreenCelebration();
            } catch (error) {
                console.error('Kayıt hatası:', error);
                // Bir hata olursa normal olarak formu submit et (fallback)
                alert("Bağlantı hatası: " + error.message);
            }
        });
    }

    if (dailyLogForm && relapsedBtn) {
        relapsedBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const formData = new URLSearchParams();
            formData.append('status', 'relapsed');
            
            try {
                const response = await fetch(dailyLogForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const result = await response.json();
                    console.error("Daily log API hatası:", result);
                    alert(result.message + (result.error ? "\nDetay: " + result.error : ""));
                    return;
                }
                
                showRelapseAnimation();
            } catch (error) {
                console.error('Kayıt hatası:', error);
                alert("Bağlantı hatası: " + error.message);
            }
        });
    }

    function showFullscreenCelebration() {
        const overlay = document.getElementById('celebrationOverlay');
        const title = document.getElementById('celebrationTitle');
        
        if (!overlay) return;

        const messages = [
            "BUGÜN DE KAZANDIN! 🎉",
            "SİGARASIZ BİR GÜN DAHA! 🔥",
            "SAĞLIĞINA BİR ADIM DAHA YAKLAŞTIN! 💚"
        ];
        if (title) {
            title.textContent = messages[Math.floor(Math.random() * messages.length)];
        }

        // Overlay'i göster (arka plan kararsın ve tıklamalar engellensin)
        overlay.classList.add('active');

        if (typeof confetti === "function") {
            const duration = 4000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }

            const interval = setInterval(function() {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                
                // Sol üstten havai fişek
                confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                // Sağ üstten havai fişek
                confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
                // Aşağıdan partikül çıkışı
                confetti(Object.assign({}, defaults, { particleCount: 20, spread: 100, origin: { x: 0.5, y: 1 }, startVelocity: 45 }));
            }, 250);
        }

        // 4.5 saniye sonra arkaplanı kaldır ve sayfayı yenile
        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(() => {
                window.location.reload();
            }, 500); // 0.5 saniye fade-out bekleme süresi
        }, 4500);
    }

    function showRelapseAnimation() {
        const overlay = document.getElementById("relapseOverlay");
        if (!overlay) return;

        overlay.classList.remove("hidden");

        setTimeout(() => {
            overlay.classList.add("fade-out");
        }, 3000);

        setTimeout(() => {
            overlay.classList.add("hidden");
            overlay.classList.remove("fade-out");
            // Sayfayı yenile ki yeni log duruma yansısın
            window.location.reload();
        }, 4000);
    }
});
