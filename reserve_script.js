/***************************************
 * カレンダーIDを指定
 ***************************************/
const CALENDAR_ID = "s.hoshino@urlounge.co.jp";

const defaultDate = "2025-03-25";  // テスト用日付
const defaultTime = "17:00";       // テスト用時間


/***************************************
 * ページ振り分け用
 ***************************************/
function doGet(e) {
  Logger.log("ScriptApp.getService().getUrl(): %s", ScriptApp.getService().getUrl());

  const page = e.parameter.page;
  let tmpl; // ここで変数を宣言する

  if (page === 'reserve_personal') {
    tmpl = HtmlService.createTemplateFromFile("reserve_personal");
  } else {
    tmpl = HtmlService.createTemplateFromFile("reserve_date");
    tmpl.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
  }

  // デプロイ URL をテンプレートに渡す
  tmpl.redirectUrl = ScriptApp.getService().getUrl();

  // テンプレートを評価して返す
  return tmpl.evaluate().setTitle(
    page === 'reserve_personal' ? "個人情報入力" : "日時選択"
  );
}


/***************************************
 * テンプレート内で
 * <?!= include("xxx") ?> を使うためのヘルパー
 ***************************************/
function include(filename) {
  const tmpl = HtmlService.createTemplateFromFile(filename);
  tmpl.redirectUrl = ScriptApp.getService().getUrl();  // ← ここで変数を渡す
  return tmpl.evaluate().getContent();                 // ← ここでテンプレートとして展開
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
      const start = ev.start.dateTime || ev.start.date;
      const end = ev.end.dateTime || ev.end.date; // ここで終了時刻も取得
      return {
        id: ev.id,
        summary: ev.summary || "無題のイベント",
        start: start,
        end: end
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
  Logger.log("Received reservation data:", reservationData);

  try {
    // スプレッドシートを取得
    const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/1DW_31Sf8RVlbIVN-iZ_C6QjGcuXPhvXuff60-EVGYeE/edit";
    const ss = SpreadsheetApp.openByUrl(spreadsheetUrl);
    const sheet = ss.getSheetByName("アプリ予約");
    if (!sheet) {
      throw new Error("予約データ シートが見つかりません。");
    }

    // "YYYY-MM-DD HH:mm" → "YYYY-MM-DDTHH:mm" に変換
    const dateTimeStr = reservationData.time ? reservationData.time.replace(" ", "T") : ""; // timeが空でも処理
    const startTime = dateTimeStr ? new Date(dateTimeStr) : '';  // timeが空でも処理

    // シートに書き込む
    const timestampColumn = 1;  // A列 (タイムスタンプ)
    const dateColumn = 2;  // B列 (日付)
    const timeColumn = 3;  // C列 (時間)
    const fullNameColumn = 4;  // D列 (姓名)
    const kanaNameColumn = 5;  // E列 (セイメイ)
    const purposeColumn = 6;  // F列 (用件)
    const staffColumn = 7;  // G列 (スタッフ)
    const usageColumn = 8;  // H列 (利用回数)

    // 次の空行を取得
    const lastRow = sheet.getLastRow() + 1;

    // 空の場合はテスト値を使用
    const selectedDate = reservationData.time ? reservationData.time.split(" ")[0] : defaultDate;  // "YYYY-MM-DD"
    const selectedTime = reservationData.time ? reservationData.time.split(" ")[1] : defaultTime;  // "HH:MM"

    // 名前（姓＋名）を結合
    const fullName = reservationData.lastName + " " + reservationData.firstName;
    const kanaName = reservationData.lastNameKana + " " + reservationData.firstNameKana;

    // データを指定した列に挿入
    sheet.getRange(lastRow, timestampColumn).setValue(new Date());  // タイムスタンプ（現在の日時）
    sheet.getRange(lastRow, dateColumn).setValue(selectedDate);  // 日付
    sheet.getRange(lastRow, timeColumn).setValue(selectedTime);  // 時間
    sheet.getRange(lastRow, fullNameColumn).setValue(fullName);  // 姓名
    sheet.getRange(lastRow, kanaNameColumn).setValue(kanaName);  // セイメイ
    sheet.getRange(lastRow, purposeColumn).setValue(reservationData.purpose);  // 用件
    sheet.getRange(lastRow, staffColumn).setValue(reservationData.staff);  // スタッフ
    sheet.getRange(lastRow, usageColumn).setValue(reservationData.usage);  // 利用回数

    // --- シートへの登録が完了した後にカレンダーへ登録 ---
    const calendarEventId = addCalendarEvent(reservationData);
    Logger.log("Calendar Event created with ID: " + calendarEventId);

    // ここでイベントIDを返す
    return calendarEventId;
    
  } catch (err) {
    // エラーメッセージをログに記録
    Logger.log("Error details: " + err.message);
    Logger.log("Stack trace: " + err.stack);
  
    // ユーザー向けにわかりやすいエラーメッセージを表示
    throw new Error("予約処理に失敗しました。もう一度お試しください。詳細: " + err.message);
  }
}

/***************************************
 * addCalendarEvent: カレンダーに新規イベント作成
 ***************************************/
function addCalendarEvent(reservationData) {
const dateTimeStr = reservationData.time ? reservationData.time.replace(" ", "T") : defaultDate + "T" + defaultTime;  // 時間が空の場合はデフォルトの時間
const startTime = new Date(dateTimeStr);

  // 終了時刻は開始+30分（必要に応じて変更）
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + 30);

  const eventObj = {
    summary: `【予約】${reservationData.lastName} ${reservationData.firstName}様`,
    description:
      `用途: ${reservationData.purpose}\n` +
      `担当: ${reservationData.staff}\n` +
      `お名前: ${reservationData.lastName} ${reservationData.firstName}\n` +
      `フリガナ: ${reservationData.lastNameKana} ${reservationData.firstNameKana}\n` +
      `ご利用回数: ${reservationData.usage}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Asia/Tokyo"
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Asia/Tokyo"
      }
  };

// ログにイベント内容を記録
Logger.log("Event Object: " + JSON.stringify(eventObj, null, 2));

try {
  // カレンダーに登録
  const newEvent = Calendar.Events.insert(eventObj, CALENDAR_ID);

  // 新規イベントのIDをログに記録
  Logger.log("Event created with ID: " + newEvent.id);

  // イベントIDを返す
  return newEvent.id;
} catch (err) {
  // エラーが発生した場合はログにエラー内容を記録
  Logger.log("Error creating calendar event: " + err.message);
  throw new Error("カレンダーイベントの作成に失敗しました: " + err.message);
}
}