/***************************************
 * 定数: カレンダーID
 *  (「primary」や「xxx@group.calendar.google.com」でも可)
 ***************************************/
const CALENDAR_ID = "s.hoshino@urlounge.co.jp";

/***************************************
 * doGet: ページ振り分け用メイン関数
 *  ?page=personal なら 個人情報入力ページ
 *  それ以外は 日時選択ページ
 ***************************************/
function doGet(e) {
  const page = e.parameter.page;
  if (page === 'personal') {
    return HtmlService.createTemplateFromFile("reserve_personal")
      .evaluate()
      .setTitle("個人情報入力");
  } else {
    // デフォルト: 日時選択ページ
    return HtmlService.createTemplateFromFile("reserve_date")
      .evaluate()
      .setTitle("日時選択");
  }
}

/***************************************
 * include: テンプレートHTML内から
 *   <?!= include("filename") ?>
 *  と呼び出せるヘルパー
 ***************************************/
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/***************************************
 * getEvents:
 *  カレンダーから直近30日分のイベントを取得し、
 *  クライアントサイドでflatpickr等へ反映させるための
 *  配列データを返す
 ***************************************/
function getEvents() {
  // 取得期間を設定 (今日～30日後)
  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  // カレンダー検索パラメータ
  const optionalArgs = {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    showDeleted: false,
    singleEvents: true,
    orderBy: "startTime"
  };

  // Advanced Service: Calendar.Events.list
  const events = Calendar.Events.list(CALENDAR_ID, optionalArgs);

  // イベントが無ければ空配列を返す
  if (!events.items || events.items.length === 0) {
    return [];
  }

  // 必要情報を抜き出して返す (例: id, summary, start)
  return events.items.map(ev => {
    // 終日の場合は ev.start.date、時間指定の場合は ev.start.dateTime
    const start = ev.start.dateTime || ev.start.date;
    return {
      id: ev.id,
      summary: ev.summary || "無題のイベント",
      start: start
    };
  });
}

/***************************************
 * addCalendarEvent:
 *  Googleカレンダーに新しいイベントを作成し、
 *  イベントIDを返す
 ***************************************/
function addCalendarEvent(reservationData) {
  // 「YYYY-MM-DD HH:mm」形式の時刻を "T" 区切りに変更してDate型へ
  const dateTimeStr = reservationData.time.replace(" ", "T");
  const startTime = new Date(dateTimeStr);

  // 予約終了時刻を開始+30分として設定 (必要に応じて変更)
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

  // カレンダーへイベント登録
  const newEvent = Calendar.Events.insert(eventObj, CALENDAR_ID);
  return newEvent.id; // 作成されたイベントのID
}

/***************************************
 * submitReservationToSheet:
 *  クライアントから reservationData を受け取り、
 *  1) スプレッドシートに書き込む
 *  2) カレンダーにイベントを追加登録
 *  成功時に "OK" 等の文字列を返し、
 *  失敗時には throw して .withFailureHandler に渡す
 ***************************************/
function submitReservationToSheet(reservationData) {
  try {
    // スプレッドシート取得
    // ※ コンテナバインドプロジェクトなら getActiveSpreadsheet() でもOK
    //   特定シートIDの場合は openById("xxxxx") を使用
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("予約データ");
    if (!sheet) {
      throw new Error("予約データ シートが見つかりません。");
    }

    // "YYYY-MM-DD HH:mm" -> "YYYY-MM-DDTHH:mm" に変換してDate化
    const dateTimeStr = reservationData.time.replace(" ", "T");
    const startTime = new Date(dateTimeStr);

    // シートに追記
    sheet.appendRow([
      new Date(),                  // この処理を実行した日時 (予約受付日時)
      startTime,                   // ユーザーが選択した予約日時
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

    // 正常終了: 成功を示す文字列を返す
    return `OK (Calendar Event ID: ${eventId})`;

  } catch (err) {
    // 何かエラーが起きたらthrow → クライアント側 .withFailureHandler(...) へ
    throw new Error("予約処理に失敗: " + err);
  }
}
