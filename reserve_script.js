/***************************************
 * カレンダーIDを指定
 ***************************************/
const CALENDAR_ID = "s.hoshino@urlounge.co.jp";

/***************************************
 * ページ振り分け用
 ***************************************/
function doGet(e) {
  Logger.log("ScriptApp.getService().getUrl(): %s", ScriptApp.getService().getUrl());
  
  const page = e.parameter.page;
  if (page === 'reserve_personal') {
   let tmpl = HtmlService.createTemplateFromFile("reserve_personal");
   return tmpl.evaluate().setTitle("個人情報入力");
  } else {
   let tmpl = HtmlService.createTemplateFromFile("reserve_date");
   return tmpl.evaluate().setTitle("日時選択");
  }
}


/***************************************
 * テンプレート内で
 * <?!= include("xxx") ?> を使うためのヘルパー
 ***************************************/
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/***************************************
 * getEvents: カレンダーからイベントを取得
 * 終日イベントは除外
 ***************************************/
function getEvents() {
  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 60);

  const optionalArgs = {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    showDeleted: false,
    singleEvents: true,
    orderBy: "startTime"
  };

  // Advanced Service: Calendar.Events.list
  const events = Calendar.Events.list(CALENDAR_ID, optionalArgs);

  if (!events.items || events.items.length === 0) {
    Logger.log("No events found in the specified period.");
    return [];
  }

  // 終日イベント(= dateTimeが無い)を除外
  const results = events.items
    .filter(ev => {
      const isAllDay = !ev.start.dateTime && !ev.end.dateTime;
      if (isAllDay) {
        Logger.log(`終日イベントを除外: ${ev.summary}`);
      }
      return !isAllDay;
    })
    .map(ev => {
      const start = ev.start.dateTime || ev.start.date; // 時間指定 or 日付
      return {
        id: ev.id,
        summary: ev.summary || "無題のイベント",
        start: start
      };
    });

  Logger.log("Filtered Events: %s", JSON.stringify(results, null, 2));
  return results;
}

/***************************************
 * submitReservationToSheet:
 * 予約内容をスプレッドシートに書き込んで、
 * カレンダーにもイベントを追加
 ***************************************/
function submitReservationToSheet(reservationData) {
  try {
    // スプレッドシートを取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("予約データ");
    if (!sheet) {
      throw new Error("予約データ シートが見つかりません。");
    }

    // "YYYY-MM-DD HH:mm" → "YYYY-MM-DDTHH:mm" に変換
    const dateTimeStr = reservationData.time.replace(" ", "T");
    const startTime = new Date(dateTimeStr);

    // シートに書き込む
    sheet.appendRow([
      new Date(),       // 予約受付日時
      startTime,        // 予約日時
      reservationData.purpose,
      reservationData.firstName,
      reservationData.lastName,
      reservationData.firstNameKana,
      reservationData.lastNameKana,
      reservationData.staff,
      reservationData.usage
    ]);

    // カレンダーにも登録
    const eventId = addCalendarEvent(reservationData);
    return `OK (Calendar Event ID: ${eventId})`;

  } catch (err) {
    throw new Error("予約処理に失敗: " + err);
  }
}

/***************************************
 * addCalendarEvent: カレンダーに新規イベント作成
 ***************************************/
function addCalendarEvent(reservationData) {
  const dateTimeStr = reservationData.time.replace(" ", "T");
  const startTime = new Date(dateTimeStr);

  // 終了時刻は開始+30分（必要に応じて変更）
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + 30);

  const eventObj = {
    summary: `【予約】${reservationData.lastName}様`,
    description:
      `用途: ${reservationData.purpose}\n` +
      `担当: ${reservationData.staff}\n` +
      `お名前: ${reservationData.lastName} ${reservationData.firstName}\n` +
      `フリガナ: ${reservationData.lastNameKana} ${reservationData.firstNameKana}\n` +
      `ご利用回数: ${reservationData.usage}`,
    start: {
      dateTime: startTime.toISOString()
    },
    end: {
      dateTime: endTime.toISOString()
    }
  };

  // カレンダーに登録
  const newEvent = Calendar.Events.insert(eventObj, CALENDAR_ID);
  return newEvent.id;
}
