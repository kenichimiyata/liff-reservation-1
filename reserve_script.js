const url = "https://script.google.com/macros/s/AKfycbzNGhG5KcV9tBT60v7OsL67xTkpCi_pchVd3V8YNuR3vNzt75N2ce3eC4wZTSKOGLs_rQ/exec"; // GASのWebアプリURL

async function fetchEvents() {
    try {
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

function formatDate(date) {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

async function setupCalendar() {
    const events = await fetchEvents();
    const availableDates = events.map(event => event.date.split(" ")[0]);

    flatpickr("#datepicker", {
        locale: "ja",
        dateFormat: "Y-m-d",
        enable: availableDates, // 予約可能な日だけ選択可能
        disableMobile: true,
        inline: true // カレンダーを常に表示
    });
}

function generateTimeSlots() {
    const timeButtonsContainer = document.getElementById("time-buttons");

    for (let hour = 11; hour <= 18; hour++) {
        for (let minutes = 0; minutes < 60; minutes += 30) {
            if (hour === 18 && minutes > 30) {
                break;
            }
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

document.addEventListener("DOMContentLoaded", function() {
    setupCalendar();
    generateTimeSlots();
});
