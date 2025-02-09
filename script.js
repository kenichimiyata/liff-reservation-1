const GAS_API_URL = "https://script.google.com/macros/s/YOUR_GAS_DEPLOYMENT_URL/exec";
const LIFF_ID = "1653447401-vlyOgDZO"; 

document.addEventListener("DOMContentLoaded", function () {
    liff.init({
        liffId: LIFF_ID,
        withLoginOnExternalBrowser: true
    })
    .then(() => {
        console.log("✅ LIFF initialized successfully");

        fetch(GAS_API_URL + "?func=getDateOptions")
            .then(response => response.json())
            .then(data => {
                console.log("📅 Date API Response:", data);
                if (data.statusCode === 200) {
                    populateDateOptions(data.options);
                } else {
                    console.error("🚨 Date API Error:", data.body);
                }
            })
            .catch(error => console.error("❌ Error fetching dates:", error));
    })
    .catch(err => {
        console.error("🚨 LIFF initialization failed", err);
        alert("❌ LIFFの初期化に失敗しました: " + err.message);
    });
});

document.getElementById("dateSelect").addEventListener("change", function () {
    let selectedDate = this.value;
    if (!selectedDate) return;

    let requestUrl = GAS_API_URL + `?func=getTimeOptions&date=${selectedDate}`;
    console.log("📡 Fetching:", requestUrl);

    fetch(requestUrl)
        .then(response => response.json())
        .then(data => {
            console.log("⏰ Time API Response:", data);
            if (data.statusCode === 200) {
                populateTimeOptions(data.options);
            } else {
                console.error("🚨 Time API Error:", data.body);
            }
        })
        .catch(error => console.error("❌ Error fetching times:", error));
});

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
