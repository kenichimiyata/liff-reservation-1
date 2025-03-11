# liff-reservation✅各ファイルの役割 & 記述例
## 1️⃣ index.html（Webページ本体）  
📌 役割
- requireE() を使って style.css.html（CSS）と reserve_script.js.html（JavaScript）を読み込む
- 予約フォームを作成
- html


## 2️⃣ reserve_script.gs（サーバーサイド/GAS）  
📌 役割
- index.html を表示
- CSSとJSを読み込む
- 必要なデータを doGet() で提供（APIとしてデータを返す）
- javascript

## 3️⃣ reserve_script.js.html（クライアントサイドJavaScript）  
📌 役割
- fetchEvents() を使って doGet() のAPIから予約可能日を取得
- flatpickr を使ってカレンダーに予約可能日を設定
- generateTimeSlots() で時間選択ボタンを作成
- submitReservation() でフォームを処理

## 4️⃣ style.css.html（スタイルシート/CSS）  
📌 役割
- デザインを適用（ボタンのスタイル、フォームの配置など）
