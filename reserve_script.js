/***************************************
 * カレンダーIDの指定
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
  let tmpl;

  if (page === 'reserve_personal') {
    tmpl = HtmlService.createTemplateFromFile("reserve_personal");
  } else {
    //ifrale rediect 許可
    tmpl = HtmlService.createTemplateFromFile("reserve_date");
    tmpl.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
  }

  tmpl.redirectUrl = ScriptApp.getService().getUrl();

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
  tmpl.redirectUrl = ScriptApp.getService().getUrl();
  return tmpl.evaluate().getContent();
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
      const end = ev.end.dateTime || ev.end.date;
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
 * submitReservationToSheet: GSSへの転記処理
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

    const timestampColumn = 1;  // A列 (タイムスタンプ)
    const dateColumn = 2;       // B列 (日付)
    const timeColumn = 3;       // C列 (時間)
    const lineNameColumn = 4;   // D列 (LINE名)
    const lineIdColumn = 5;     // E列 (LINE ID)
    const purposeColumn = 6;    // F列 (用件)
    const staffColumn = 7;      // G列 (スタッフ)
    const usageColumn = 8;      // H列 (利用回数)

    // 次の空行を取得
    const lastRow = sheet.getLastRow() + 1;

    // 空の場合はテスト値を使用
    const selectedDate = reservationData.time ? reservationData.time.split(" ")[0] : defaultDate;  // "YYYY-MM-DD"
    const selectedTime = reservationData.time ? reservationData.time.split(" ")[1] : defaultTime;  // "HH:MM"

    sheet.getRange(lastRow, timestampColumn).setValue(new Date());
    sheet.getRange(lastRow, dateColumn).setValue(selectedDate);
    sheet.getRange(lastRow, timeColumn).setValue(selectedTime);
    sheet.getRange(lastRow, lineNameColumn).setValue(reservationData.lineName);
    sheet.getRange(lastRow, lineIdColumn).setValue(reservationData.lineId);
    sheet.getRange(lastRow, purposeColumn).setValue(reservationData.purpose);
    sheet.getRange(lastRow, staffColumn).setValue(reservationData.staff);
    sheet.getRange(lastRow, usageColumn).setValue(reservationData.usage);

    const calendarEventId = addCalendarEvent(reservationData);
    Logger.log("Calendar Event created with ID: " + calendarEventId);
    return calendarEventId;
    
  } catch (err) {
    Logger.log("Error details: " + err.message);
    Logger.log("Stack trace: " + err.stack);
    throw new Error("予約処理に失敗しました。もう一度お試しください。詳細: " + err.message);
  }
}

/***************************************
 * addCalendarEvent: カレンダーに新規イベント作成  
 * LINE予約の場合は、LINEの表示名とIDをタイトルに含める
 ***************************************/
function addCalendarEvent(reservationData) {
  // 日時設定（空の場合はテスト値を使用）
  const dateTimeStr = reservationData.time
    ? reservationData.time.replace(" ", "T")
    : defaultDate + "T" + defaultTime;
  const startTime = new Date(dateTimeStr);
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + 30);

  // タイトルには LINE 名のみを使用
  let displayName = reservationData.lineName;

  // イベントオブジェクトの作成
  const eventObj = {
    summary: `${reservationData.purpose}：LINE予約：${displayName}さま`,
    description: 
    `用途: ${reservationData.purpose || "なし"}
    担当者希望: ${reservationData.staff || "未入力"}
    来店回数: ${reservationData.useage || "未入力"}
    LINE ID: ${reservationData.lineId || "未入力"}`,
    location: "〒170-0013 東京都豊島区東池袋１丁目２５−１４ アルファビルディング 4F",
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Tokyo"
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "Asia/Tokyo"
    }
  };

  Logger.log("Event Object: " + JSON.stringify(eventObj, null, 2));

  try {
    // イベントの新規作成
    const newEvent = Calendar.Events.insert(eventObj, CALENDAR_ID);
    Logger.log("Event created with ID: " + newEvent.id);

    // 招待するゲストリストの設定（主催者も含める場合）
    let requiredGuests = ["subaru6363natuko@gmail.com,s.hoshino@urlounge.co.jp"];
    requiredGuests.unshift(CALENDAR_ID);  // 主催者（カレンダーID）をゲストリストの先頭に追加

    Logger.log("招待するゲストリスト: " + requiredGuests.join(", "));

    // patch 更新用のイベントリソース
    const eventResource = {
      attendees: requiredGuests.map(email => ({ email: email }))
    };

    // patch 更新を実施して招待メール送信（sendUpdates: "all" を指定）
    Calendar.Events.patch(eventResource, CALENDAR_ID, newEvent.id, { sendUpdates: "all" });
    Logger.log("Google Calendar API による patch 更新と招待メール送信リクエスト完了");

    return newEvent.id;
  } catch (err) {
    Logger.log("Error creating or updating calendar event: " + err.message);
    throw new Error("カレンダーイベントの作成または招待メール送信に失敗しました: " + err.message);
  }
}
