const GAS_API_URL = "https://script.google.com/a/macros/urlounge.co.jp/s/AKfycby1DhJiYykQi3PhkJigxHmcADsOE7So8GU592vpDNr81Scde8zRP0A7Bb_LWYeZMIOJlg/exec"; // GASのAPI URLを設定

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
