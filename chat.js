function sendChatMessage(message) {
  const webhookUrl = "https://chat.googleapis.com/v1/spaces/AAAAF_b7vzQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=6WgKFXw37IUl2puKyMuiaefXuVOGUjhXQgw5wN5KrwI"; // ← 自分のWebhook URLに置き換え

  const payload = {
    text: message
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(webhookUrl, options);
}

function testchat(){
  sendChatMessage("test")
}