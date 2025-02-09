const GAS_API_URL = "https://script.google.com/a/macros/urlounge.co.jp/s/AKfycbypYewhi9BRPgTogA3eUrcogX5XUQOgSh-vsp5BtmkmC9y8l-Ffemm81myxBdJ5L1CqfA/exec"; // GASのURLを入れる
const LIFF_ID = "https://liff.line.me/1653447401-vlyOgDZO"; // LINE LIFF ID

document.addEventListener("DOMContentLoaded", function() {
    liff.init({ liffId: LIFF_ID })
        .then(() => console.log("LIFF initialized"))
        .catch(err => console.error("LIFF initialization failed", err));

    fetch(GAS_API_URL + "?func=getDateOptions")
        .then(response => response.json())
        .then(data => populateDateOptions(data.options))
        .catch(error => console.error("Error fetching dates:", error));
});

document.getElementById("dateSelect").addEventListener("change", function() {
    let selectedDate = this.value;
    fetch(GAS_API_URL + `?func=getTimeOptions&date=${selectedDate}`)
        .then(response => response.json())
        .then(data => populateTimeOptions(data.options))
        .catch(error => console.error("Error fetching times:", error));
});

function populateDateOptions(dateList) {
    let dateSelect = document.getElementById("dateSelect");
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

function submitReservation() {
    let reservationData = {
        date: document.getElementById("dateSelect").value,
        time: document.getElementById("timeSelect").value,
        drinks: Array.from(document.querySelectorAll('input[name="drink"]:checked')).map(el => el.value),
        message: document.getElementById("messageInput").value
    };

    fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.statusCode === 200) {
            alert("予約が完了しました！");
            liff.closeWindow();
        } else {
            alert("予約に失敗しました。");
        }
    })
    .catch(error => console.error("Error submitting reservation:", error));
}
