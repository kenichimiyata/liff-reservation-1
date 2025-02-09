const GAS_API_URL = "https://script.google.com/a/macros/urlounge.co.jp/s/AKfycbypYewhi9BRPgTogA3eUrcogX5XUQOgSh-vsp5BtmkmC9y8l-Ffemm81myxBdJ5L1CqfA/exec"; // GASのURL
const LIFF_ID = "1653447401-vlyOgDZO"; // **LIFF IDのみ（URLではない）**

document.addEventListener("DOMContentLoaded", function () {
    liff.init({
        liffId: LIFF_ID,
        withLoginOnExternalBrowser: true // 🚀 追加
    })
    .then(() => {
        console.log("✅ LIFF initialized successfully");

        if (liff.isLoggedIn()) {
            console.log("🔑 User is logged in.");
        } else {
            console.log("🔒 User is not logged in. Redirecting...");
            liff.login(); // 自動ログイン
            return;
        }

        // 📌 予約可能日付を取得（LIFF初期化後に実行）
        fetch(GAS_API_URL + "?func=getDateOptions")
            .then(response => response.json())
            .then(data => {
                console.log("📅 Date API Response:", data);
                if (data.statusCode === 200) {
                    populateDateOptions(data.options);
                } else {
                    console.error("🚨 Date API Error:", data.error);
                }
            })
            .catch(error => console.error("❌ Error fetching dates:", error));
    })
    .catch(err => {
        console.error("🚨 LIFF initialization failed", err);
        alert("❌ LIFFの初期化に失敗しました: " + err.message);
    });
});


// 📌 予約日が選択されたら、予約可能時間を取得
document.getElementById("dateSelect").addEventListener("change", function () {
    let selectedDate = this.value;
    if (!selectedDate) return;

    console.log(`📅 選択された日付: ${selectedDate}`);

    fetch(GAS_API_URL + `?func=getTimeOptions&date=${selectedDate}`)
        .then(response => response.json())
        .then(data => {
            console.log("⏰ Time API Response:", data);
            if (data.statusCode === 200) {
                populateTimeOptions(data.options);
            } else {
                console.error("🚨 Time API Error:", data.error);
            }
        })
        .catch(error => console.error("❌ Error fetching times:", error));
});

// 📌 予約可能な日付をプルダウンに追加
function populateDateOptions(dateList) {
    let dateSelect = document.getElementById("dateSelect");
    dateSelect.innerHTML = '<option value="">-- 日付を選択 --</option>';
    dateList.forEach(dateObj => {
        let option = document.createElement("option");
        option.value = dateObj.value;
        option.textContent = dateObj.label;
        dateSelect.appendChild(option);
    });
}

// 📌 予約可能な時間をプルダウンに追加
function populateTimeOptions(timeList) {
    let timeSelect = document.getElementById("timeSelect");
    timeSelect.innerHTML = '<option value="">-- 時間を選択 --</option>';
    timeList.forEach(timeObj => {
        let option = document.createElement("option");
        option.value = timeObj.value;
        option.textContent = timeObj.label;
        timeSelect.appendChild(option);
    });
}

// 📌 予約情報を送信
function submitReservation() {
    let reservationData = {
        date: document.getElementById("dateSelect").value,
        time: document.getElementById("timeSelect").value,
        drinks: Array.from(document.querySelectorAll('input[name="drink"]:checked')).map(el => el.value),
        message: document.getElementById("messageInput").value
    };

    if (!reservationData.date || !reservationData.time) {
        alert("❌ 予約日と時間を選択してください！");
        return;
    }

    console.log("📩 送信データ:", reservationData);

    fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("📩 Response from GAS:", data);
        if (data.statusCode === 200) {
            alert("✅ 予約が完了しました！");
            liff.closeWindow();
        } else {
            alert("❌ 予約に失敗しました: " + data.error);
        }
    })
    .catch(error => {
        console.error("❌ Error submitting reservation:", error);
        alert("❌ 予約送信中にエラーが発生しました");
    });
}
