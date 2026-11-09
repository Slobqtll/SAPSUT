// ชื่อแอป (แสดงบนแท็บเบราว์เซอร์)
var APP_NAME = 'Mini Editor';
// URL ไอคอนแท็บ ต้องเป็นลิงก์ตรงของไฟล์ภาพที่ลงท้ายด้วย .png เช่น
// 'https://raw.githubusercontent.com/ชื่อผู้ใช้/ชื่อรีโพ/main/favicon-64.png'
var ICON_URL = 'https://slobqtll.github.io/SAPSUT/';

function doGet() {
  var out = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  if (ICON_URL) out.setFaviconUrl(ICON_URL);
  return out;
}

function _folder() {
  var it = DriveApp.getFoldersByName('MiniEditorProjects');
  return it.hasNext() ? it.next() : DriveApp.createFolder('MiniEditorProjects');
}

function listProjects() {
  var out = [], fs = _folder().getFiles();
  while (fs.hasNext()) {
    var f = fs.next();
    out.push({ id: f.getId(), name: f.getName().replace(/\.json$/, '') });
  }
  return out;
}

function saveProject(name, json, id) {
  if (id) {
    var f = DriveApp.getFileById(id);
    f.setName(name + '.json').setContent(json);
    return id;
  }
  return _folder().createFile(name + '.json', json, MimeType.PLAIN_TEXT).getId();
}

function loadProject(id) {
  return DriveApp.getFileById(id).getBlob().getDataAsString();
}

// ซับไตเติ้ลอัตโนมัติ: ใช้ OpenAI Whisper
// ตั้งค่า: Project Settings (ไอคอนเฟือง) > Script properties > เพิ่ม OPENAI_API_KEY
function transcribe(b64, lang) {
  var key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) throw new Error('ยังไม่ได้ตั้งค่า OPENAI_API_KEY ใน Script properties');
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'audio/wav', 'audio.wav');
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + key },
    muteHttpExceptions: true,
    payload: { file: blob, model: 'whisper-1', response_format: 'verbose_json', language: lang }
  });
  if (res.getResponseCode() !== 200) throw new Error(res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText()).segments.map(function (s) {
    return { start: s.start, end: s.end, text: s.text.trim() };
  });
}
