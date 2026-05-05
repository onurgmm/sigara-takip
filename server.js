const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Statik dosyaları sunma (CSS, JS)
app.use('/public', express.static(path.join(__dirname, 'public')));

// View engine ayarı
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rotalar
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/form', (req, res) => {
    res.render('form');
});

app.post('/save', async (req, res) => {
    try {
        const { name, quit_date, daily_cigarettes, pack_price, cigarettes_per_pack } = req.body;
        
        if (!name || !quit_date || !daily_cigarettes || !pack_price || !cigarettes_per_pack) {
            return res.status(400).render('error', { message: "Eksik bilgi", detail: "Lütfen tüm alanları doldurun." });
        }
        
        const [year, month, day] = quit_date.split('-');
        const quitDateObj = new Date(year, month - 1, day);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (quitDateObj > today) {
            return res.status(400).render('error', { message: "Geçersiz Tarih", detail: "Bırakma tarihi bugünden ileri bir tarih olamaz." });
        }

        const user = await prisma.user.create({
            data: {
                name,
                quitDate: quitDateObj,
                dailyCigarettes: parseInt(daily_cigarettes),
                packPrice: parseFloat(pack_price),
                cigarettesPerPack: parseInt(cigarettes_per_pack),
                priceHistories: {
                    create: {
                        packPrice: parseFloat(pack_price),
                        effectiveDate: quitDateObj
                    }
                }
            }
        });

        res.redirect(`/dashboard/${user.id}`);
    } catch (error) {
        console.error('Kayıt sırasında hata:', error);
        res.status(500).render('error', {
            message: 'Kayıt sırasında hata oluştu.',
            detail: error.message
        });
    }
});

app.get('/dashboard/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        
        // ID geçerli bir sayı mı kontrol et
        if (isNaN(userId)) {
            return res.status(400).render('error', { 
                message: 'Geçersiz Kullanıcı ID', 
                detail: 'Lütfen geçerli bir kullanıcı linki girdiğinizden emin olun.' 
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                dailyLogs: {
                    orderBy: { date: 'desc' },
                    take: 7
                },
                priceHistories: {
                    orderBy: { effectiveDate: 'asc' }
                }
            }
        });

        if (!user) {
            return res.status(404).render('error', {
                message: 'Kullanıcı Bulunamadı',
                detail: 'Bu kullanıcı bulunamadı. Lütfen önce kayıt oluşturun.'
            });
        }

        const todayStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
        const today = new Date(todayStr);
        today.setHours(0, 0, 0, 0);

        const quitDateStr = new Date(user.quitDate).toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
        const quitDate = new Date(quitDateStr);
        quitDate.setHours(0, 0, 0, 0);
        
        // Geçen gün sayısı (Kullanıcının istediği dinamik ve güvenli hesaplama)
        const dayCount = Math.max(
          1,
          Math.floor((today - quitDate) / (1000 * 60 * 60 * 24)) + 1
        );
        
        // İçilmeyen sigara
        const avoidedCigarettes = dayCount * user.dailyCigarettes;
        
        // Fiyat geçmişine göre günlük tasarruf hesabı
        let totalSaved = 0;
        let projectedInvestmentValue = 0;
        const dailyRate = 0.001; // %0.1 günlük getiri
        let histories = user.priceHistories || [];
        
        if (histories.length === 0) {
            histories = [{ effectiveDate: quitDate, packPrice: user.packPrice }];
        }

        for (let i = 0; i < dayCount; i++) {
            let currentDate = new Date(quitDate);
            currentDate.setDate(quitDate.getDate() + i);
            currentDate.setHours(0,0,0,0);
            
            // O gün geçerli olan fiyatı bul
            let activePrice = histories[0].packPrice;
            for (let j = 0; j < histories.length; j++) {
                const historyDateStr = new Date(histories[j].effectiveDate).toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
                let historyDate = new Date(historyDateStr);
                historyDate.setHours(0,0,0,0);
                if (historyDate <= currentDate) {
                    activePrice = histories[j].packPrice;
                }
            }
            
            let pricePerCigarette = activePrice / user.cigarettesPerPack;
            const dailySavingForDay = user.dailyCigarettes * pricePerCigarette;
            totalSaved += dailySavingForDay;

            // Doğru yatırım mantığı: Her günün tasarrufu ayrı ayrı nemalanır
            // i=0 (1. gün) -> dayCount kadar nemalanır
            // i=dayCount-1 (son gün) -> 1 gün nemalanır
            const remainingInvestmentDays = dayCount - i;
            projectedInvestmentValue += dailySavingForDay * Math.pow(1 + dailyRate, remainingInvestmentDays);
        }
        const projectedProfit = projectedInvestmentValue - totalSaved;

        // Güncel tasarruf hesaplamaları (gelecek tahminleri)
        const currentPricePerCigarette = user.packPrice / user.cigarettesPerPack;
        const dailySaving = user.dailyCigarettes * currentPricePerCigarette;
        const weeklySaving = dailySaving * 7;
        const monthlySaving = dailySaving * 30;

        // Genişletilmiş Hedefler (Goals)
        const allGoals = [
          { label: "7 Gün", days: 7 },
          { label: "14 Gün", days: 14 },
          { label: "30 Gün", days: 30 },
          { label: "60 Gün", days: 60 },
          { label: "90 Gün", days: 90 },
          { label: "180 Gün", days: 180 },
          { label: "1 Yıl", days: 365 },
          { label: "2 Yıl", days: 730 },
          { label: "3 Yıl", days: 1095 },
          { label: "5 Yıl", days: 1825 },
          { label: "10 Yıl", days: 3650 },
          { label: "15 Yıl", days: 5475 }
        ];

        const completedGoals = allGoals.filter(g => dayCount >= g.days);
        const nextGoalObj = allGoals.find(g => dayCount < g.days) || allGoals[allGoals.length - 1];
        const nextGoal = nextGoalObj.days;
        const currentGoalProgress = dayCount;
        const progressPercent = Math.min((dayCount / nextGoal) * 100, 100);

        // Bugünün takip kaydını kontrol et (todayStart ve todayEnd ile garanti altına al)
        const todayStartStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
        const todayStart = new Date(todayStartStr);
        todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const todayLog = user.dailyLogs.find(log => log.date >= todayStart && log.date < todayEnd);
        const recentLogs = user.dailyLogs;

        // Motivasyon mesajı
        const messages = [
            "Harika gidiyorsun! Sağlıklı bir yaşam seninle.",
            "Böyle devam et, bedenin sana teşekkür ediyor.",
            "Her yeni gün, dumansız bir hayatın zaferidir.",
            "Kararlılığın ilham verici. Asla pes etme!",
            "Kazandığın sadece para değil, aynı zamanda sağlığın."
        ];
        let motivationalMessage = messages[Math.floor(Math.random() * messages.length)];
        
        if (todayLog && todayLog.status === 'relapsed') {
            motivationalMessage = "Bir aksama tüm süreci bitirmez. Bugün yeniden devam edebilirsin.";
        }

        // --- SAĞLIK GELİŞİMİ AŞAMALARI ---
        const healthMilestones = [
            { label: "20 dakika", minutes: 20, description: "Nabız ve kan basıncı düşmeye başlar." },
            { label: "12 saat", minutes: 720, description: "Kandaki karbonmonoksit seviyesi normale yaklaşır." },
            { label: "2 hafta", minutes: 20160, description: "Dolaşım ve akciğer fonksiyonları iyileşmeye başlar." },
            { label: "3 ay", minutes: 129600, description: "Akciğer fonksiyonlarındaki iyileşme daha belirgin hale gelir." },
            { label: "9 ay", minutes: 388800, description: "Öksürük ve nefes darlığı azalabilir." },
            { label: "1 yıl", minutes: 525600, description: "Koroner kalp hastalığı riski belirgin azalır." },
            { label: "5 yıl", minutes: 2628000, description: "İnme riski zamanla azalır." },
            { label: "10 yıl", minutes: 5256000, description: "Akciğer kanseri riski sigara içmeye devam edenlere göre azalır." },
            { label: "15 yıl", minutes: 7884000, description: "Kalp hastalığı riski sigara içmeyenlere yaklaşabilir." }
        ];

        // Anlık tarihe göre geçen dakika hesabı (veritabanındaki quitDate gece 00:00 olarak kaydediliyor)
        const nowInTurkeyStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
        const nowInTurkey = new Date(nowInTurkeyStr);
        const quitDateExactStr = new Date(user.quitDate).toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
        const quitDateExact = new Date(quitDateExactStr);
        quitDateExact.setHours(0,0,0,0);

        const elapsedMinutes = Math.floor((nowInTurkey - quitDateExact) / (1000 * 60));

        const completedMilestones = healthMilestones.filter(m => elapsedMinutes >= m.minutes);
        const currentMilestone = completedMilestones[completedMilestones.length - 1] || null;
        const nextMilestone = healthMilestones.find(m => elapsedMinutes < m.minutes) || null;

        // Kullanıcının verdiği algoritmaya göre toplam ilerleme:
        const maxMinutes = healthMilestones[healthMilestones.length - 1].minutes;
        // Ancak 0% görünmemesi için kısa vadede en azından completed index'ine göre dinamik bar veya %2 gibi minimum bir görsel değer konulabilir.
        // Verilen algoritmaya tam sadık kalarak, bar min %2 görünür yapıyoruz.
        let rawPercent = (elapsedMinutes / maxMinutes) * 100;
        // Motive edici olması için, eğer kısa süredeyse logaritmik veya aşama bazlı bir bar kullanabiliriz. 
        // Fakat basitçe algoritmayı kullanıyoruz:
        const healthProgressPercent = Math.max(1, Math.min(100, Math.round(rawPercent)));

        let healthProgressMessage = "";

        if (currentMilestone && nextMilestone) {
            healthProgressMessage = `${currentMilestone.label} aşamasını tamamladın. Sıradaki hedef: ${nextMilestone.label}.`;
        } else if (!currentMilestone && nextMilestone) {
            healthProgressMessage = `İlk hedefin: ${nextMilestone.label}.`;
        } else {
            healthProgressMessage = "Tüm uzun vadeli sağlık hedeflerini tamamladın.";
        }

        const investmentPrincipal = totalSaved;
        const investmentDays = dayCount;

        res.render('dashboard', {
            user,
            dayCount,
            avoidedCigarettes,
            totalSaved,
            dailySaving,
            weeklySaving,
            monthlySaving,
            todayLog,
            recentLogs,
            progressPercent,
            nextGoal,
            allGoals,
            completedGoals,
            nextGoalObj,
            currentGoalProgress,
            motivationalMessage,
            healthMilestones,
            completedMilestones,
            currentMilestone,
            nextMilestone,
            healthProgressPercent,
            healthProgressMessage,
            elapsedMinutes,
            investmentPrincipal,
            investmentDays,
            projectedInvestmentValue,
            projectedProfit
        });
    } catch (error) {
        console.error('Dashboard veri çekme hatası:', error);
        res.status(500).render('error', {
            message: 'Dashboard verileri yüklenirken bir hata oluştu.',
            detail: error.message
        });
    }
});

// Yardımcı Fonksiyon: Bugünün Türkiye saatine göre başlangıcı
function getIstanbulTodayStart() {
    const now = new Date();
    const istanbulDateString = now.toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul"
    });
    return new Date(`${istanbulDateString}T00:00:00.000Z`);
}

// Günlük takip kaydı oluşturma/güncelleme
app.post('/daily-log/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { status } = req.body;
        const note = req.body.note || null;
        
        // Status Validasyonu
        const validStatuses = ['success', 'struggled', 'relapsed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Geçersiz status değeri." });
        }

        // Kullanıcı var mı kontrol et
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        const todayStart = getIstanbulTodayStart();

        await prisma.dailyLog.upsert({
            where: {
                userId_date: {
                    userId: userId,
                    date: todayStart
                }
            },
            update: {
                status: status,
                note: note
            },
            create: {
                userId: userId,
                date: todayStart,
                status: status,
                note: note
            }
        });

        // Eğer AJAX isteği ise (fetch ile gönderildiyse JSON dönebiliriz ama mevcut HTML formları için yönlendirme gerekir)
        // Ancak fetch() JSON bekliyorsa veya en azından hata durumunda detay istiyorsa:
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true, message: "Kaydedildi." });
        }
        
        res.redirect('/dashboard/' + userId);
    } catch (error) {
        console.error("Daily log kayıt hatası:", error);
        return res.status(500).json({
            success: false,
            message: "Kayıt sırasında hata oluştu.",
            error: error.message,
            code: error.code || null
        });
    }
});

app.get('/history/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        if (isNaN(userId)) return res.status(400).send("Geçersiz ID");
        
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).render('error', {
                message: 'Kullanıcı Bulunamadı',
                detail: 'Bu kullanıcı bulunamadı.'
            });
        }

        const history = await prisma.dailyLog.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' }
        });

        res.render('history', { user, history });
    } catch (error) {
        console.error('History çekme hatası:', error);
        res.status(500).render('error', {
            message: 'Geçmiş verileri yüklenirken hata oluştu.',
            detail: error.message
        });
    }
});

// Fiyat Güncelleme Rotası
app.post('/update-price/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const newPackPrice = parseFloat(req.body.packPrice);
        
        if (isNaN(userId) || isNaN(newPackPrice) || newPackPrice <= 0) {
            return res.status(400).send("Geçersiz veri.");
        }

        const todayInTurkeyStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
        const todayInTurkey = new Date(todayInTurkeyStr);

        await prisma.user.update({
            where: { id: userId },
            data: { packPrice: newPackPrice }
        });

        await prisma.priceHistory.create({
            data: {
                userId: userId,
                packPrice: newPackPrice,
                effectiveDate: todayInTurkey
            }
        });

        res.redirect('/dashboard/' + userId);
    } catch (error) {
        console.error("Fiyat güncellenirken hata:", error);
        res.status(500).send("Bir hata oluştu.");
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
});
