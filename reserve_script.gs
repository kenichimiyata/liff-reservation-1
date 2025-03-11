function showHTML() {
    return HtmlService.createHtmlOutputFromFile("reserve_personal.html")
        .setTitle("予約システム");
}
function requireE(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
    //  return HtmlService
    //      .createTemplateFromFile(filename)
    //      .evaluate();
}

document.addEventListener("DOMContentLoaded", function() {
    async function fetchEvents() {
        try {
            const url = "https://script.google.com/macros/s/AKfycbzNGhG5KcV9tBT60v7OsL67xTkpCi_pchVd3V8YNuR3vNzt75N2ce3eC4wZTSKOGLs_rQ/exec";
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTPエラー: ${response.status}`);
            }
            const data = await response.json();
            return data.events;
        } catch (error) {
            console.error("エラー:", error);
            return [];
        }
    }

    async function setupCalendar() {
        const events = await fetchEvents();
        const availableDates = events.map(event => event.date.split(" ")[0]);

        flatpickr("#datepicker", {
            locale: "ja",
            dateFormat: "Y-m-d",
            enable: availableDates,
            disableMobile: true,
            inline: true
        });
    }

    function generateTimeSlots() {
        const timeButtonsContainer = document.getElementById("time-buttons");
        for (let hour = 11; hour <= 18; hour++) {
            for (let minutes = 0; minutes < 60; minutes += 30) {
                if (hour === 18 && minutes > 30) break;
                let time = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                let button = document.createElement("button");
                button.textContent = time;
                button.classList.add("time-button");
                button.addEventListener('click', () => {
                    document.getElementById("selected-time").value = `${time}`;
                });
                timeButtonsContainer.appendChild(button);
            }
        }
    }

    function submitReservation() {
        const selectedTime = document.getElementById("selected-time").value;
        alert(`予約日時: ${selectedTime}`);
    }

    setupCalendar();
    generateTimeSlots();

    document.getElementById("reservation-form").addEventListener("submit", function(event) {
        event.preventDefault();
        let firstName = document.getElementById("first-name").value.trim();
        let lastName = document.getElementById("last-name").value.trim();
        let firstNameKana = document.getElementById("first-name-kana").value.trim();
        let lastNameKana = document.getElementById("last-name-kana").value.trim();
        
        if (!firstName || !lastName || !firstNameKana || !lastNameKana) {
            alert("すべての必須項目を入力してください。");
            return;
        }
        alert("送信が完了しました！");
        this.submit();
    });
});
