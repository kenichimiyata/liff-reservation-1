function doGet(e) {
  let page = e.parameter.page;
  if (page === 'personal') {
    return HtmlService.createTemplateFromFile("reserve_personal")
      .evaluate()
      .setTitle("個人情報入力");
  } else {
    return HtmlService.createTemplateFromFile("reserve_date")
      .evaluate()
      .setTitle("日時選択");
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getEvents() {
  // 仮データ。後でGoogleカレンダーAPIで置き換える。
  return [
    {date: "2025-03-15 11:00"},
    {date: "2025-03-14 13:00"},
    {date: "2025-03-15 15:00"}
  ];
}

function submitReservationToSheet(reservationData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("予約データ");
  sheet.appendRow([
    new Date(),
    reservationData.time,
    reservationData.purpose,
    reservationData.firstName,
    reservationData.lastName,
    reservationData.firstNameKana,
    reservationData.lastNameKana,
    reservationData.staff,
    reservationData.usage
  ]);
}
