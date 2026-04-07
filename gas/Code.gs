/**
 * ParentGate 消息管理 - Google Apps Script 后端
 *
 * 使用方法：
 * 1. 在 Google Sheets 中创建一个新的电子表格
 * 2. 创建两个 sheet: "Messages" 和 "Events"
 * 3. Messages 表头: id | title | source | receivedAt | notes | fileUrls | fileNames | createdAt
 * 4. Events 表头: id | messageId | title | description | eventDate | eventTime | endDate | endTime | location | category | gcalEventId | isDone | createdAt
 * 5. 在 Google Drive 中创建一个文件夹，用于存放上传的文件
 * 6. 将 SPREADSHEET_ID 和 FOLDER_ID 替换为实际 ID
 * 7. 部署为 Web App（执行身份：自己，访问权限：任何人）
 */

const SPREADSHEET_ID = '1_nTDxoDF31iT6q3l-TtpxJLHHNCrDGoPmCTblUoZ6gs';
const FOLDER_ID = '1Gwp4l1eEoEOng_Uq0UNRcyDy4K2Jogmh';

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(v => v !== '');
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

function sheetToObjects(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return data
    .map((row, i) => {
      const obj = { rowIndex: i + 2 };
      headers.forEach((h, j) => { obj[h] = row[j] === undefined || row[j] === null ? '' : row[j]; });
      return obj;
    })
    .filter(obj => obj.id !== '');
}

// ─── HTTP Handlers ───

function doGet(e) {
  const action = e.parameter.action;

  // quickSave：Claude 手机端专用，返回 HTML 页面给用户看结果
  if (action === 'quickSave') {
    try {
      const html = handleQuickSave(e.parameter);
      return HtmlService.createHtmlOutput(html).setTitle('ParentGate 保存结果');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        `<h2 style="color:red">❌ 保存失败</h2><p>${err.message}</p>`
      ).setTitle('保存失败');
    }
  }

  let result;
  try {
    switch (action) {
      case 'getMessages':
        result = handleGetMessages(e.parameter);
        break;
      case 'getMessage':
        result = handleGetMessage(e.parameter);
        break;
      case 'getEvents':
        result = handleGetEvents(e.parameter);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * quickSave：从 Claude 手机端生成的链接保存消息和活动
 *
 * URL 参数：
 *   t  = 消息标题
 *   r  = 收到日期 YYYY-MM-DD（可选，默认今天）
 *   s  = 来源（可选，默认 ParentGate）
 *   n  = 备注（可选）
 *   e  = 活动列表，多个活动用分号分隔，每个活动格式：
 *        活动名|YYYY-MM-DD|HH:MM|地点|分类|描述
 *        （地点/分类/描述可留空，用 | 占位）
 *
 * 示例：
 *   ?action=quickSave&t=武术比赛名单&r=2026-04-07
 *   &e=张三武术比赛|2026-04-15|09:00|体育馆|学校活动|第一场
 */
function handleQuickSave(params) {
  const title = params.t || '未命名消息';
  const source = params.s || 'ParentGate';
  const receivedAt = params.r || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const notes = params.n || '';
  const eventsRaw = params.e || '';

  // 创建消息
  const msgSheet = getSheet('Messages');
  const msgId = getNextId(msgSheet);
  const now = new Date().toISOString();
  msgSheet.appendRow([msgId, title, source, receivedAt, notes, '', '', now]);

  // 解析并创建活动
  const evtSheet = getSheet('Events');
  const eventLines = eventsRaw ? eventsRaw.split(';').filter(s => s.trim()) : [];
  let savedCount = 0;

  for (const line of eventLines) {
    const parts = line.split('|');
    const evtTitle = (parts[0] || '').trim();
    const evtDate  = (parts[1] || '').trim();
    if (!evtTitle || !evtDate) continue;

    const evtId = getNextId(evtSheet);
    evtSheet.appendRow([
      evtId,
      msgId,
      evtTitle,
      (parts[5] || '').trim(),   // description
      evtDate,
      (parts[2] || '').trim(),   // eventTime
      '', '',
      (parts[3] || '').trim(),   // location
      (parts[4] || '学校活动').trim(), // category
      '', 0, now
    ]);
    savedCount++;
  }

  // 返回手机友好的 HTML 结果页
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>保存成功</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; text-align: center; background: #f8fafc; }
    .card { background: white; border-radius: 16px; padding: 32px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 12px; }
    h2 { color: #1e293b; margin: 0 0 8px; font-size: 20px; }
    p { color: #64748b; margin: 4px 0; font-size: 14px; }
    .events { margin-top: 16px; text-align: left; }
    .event-item { background: #f1f5f9; border-radius: 8px; padding: 8px 12px; margin-top: 8px; font-size: 13px; color: #475569; }
    .event-title { font-weight: 600; color: #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h2>保存成功！</h2>
    <p>「${title}」</p>
    <p style="color:#6366f1; margin-top:8px;">共保存 ${savedCount} 个活动</p>
    ${savedCount > 0 ? `<div class="events">${eventLines.map(l => {
      const p = l.split('|');
      return `<div class="event-item"><div class="event-title">${p[0] || ''}</div><div>${p[1] || ''}${p[2] ? ' ' + p[2] : ''}${p[3] ? ' · ' + p[3] : ''}</div></div>`;
    }).join('')}</div>` : ''}
  </div>
</body>
</html>`;
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  let result;

  try {
    switch (action) {
      case 'addMessage':
        result = handleAddMessage(body);
        break;
      case 'updateMessage':
        result = handleUpdateMessage(body);
        break;
      case 'deleteMessage':
        result = handleDeleteMessage(body);
        break;
      case 'uploadFile':
        result = handleUploadFile(body);
        break;
      case 'addEvent':
        result = handleAddEvent(body);
        break;
      case 'updateEvent':
        result = handleUpdateEvent(body);
        break;
      case 'deleteEvent':
        result = handleDeleteEvent(body);
        break;
      case 'toggleEventDone':
        result = handleToggleEventDone(body);
        break;
      case 'syncToCalendar':
        result = handleSyncToCalendar(body);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Messages ───

const MSG_HEADERS = ['id', 'title', 'source', 'receivedAt', 'notes', 'fileUrls', 'fileNames', 'createdAt'];

function handleGetMessages(params) {
  const sheet = getSheet('Messages');
  let messages = sheetToObjects(sheet, MSG_HEADERS);

  if (params.month) {
    messages = messages.filter(m => String(m.receivedAt).startsWith(params.month));
  }

  return { messages: messages.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))) };
}

function handleGetMessage(params) {
  const id = Number(params.id);
  const sheet = getSheet('Messages');
  const messages = sheetToObjects(sheet, MSG_HEADERS);
  const message = messages.find(m => m.id === id);

  if (!message) return { error: 'Message not found' };

  // Get linked events
  const evtSheet = getSheet('Events');
  const allEvents = sheetToObjects(evtSheet, EVT_HEADERS);
  const events = allEvents.filter(e => e.messageId === id);

  return { message, events };
}

function handleAddMessage(body) {
  const sheet = getSheet('Messages');
  const id = getNextId(sheet);
  const now = new Date().toISOString();
  sheet.appendRow([id, body.title, body.source, body.receivedAt, body.notes, body.fileUrls, body.fileNames, now]);
  return { id };
}

function handleUpdateMessage(body) {
  const sheet = getSheet('Messages');
  const rowIndex = body.rowIndex;
  if (!rowIndex) return { error: 'Missing rowIndex' };
  sheet.getRange(rowIndex, 2, 1, 6).setValues([[body.title, body.source, body.receivedAt, body.notes, body.fileUrls, body.fileNames]]);
  return { success: true };
}

function handleDeleteMessage(body) {
  const id = Number(body.id);
  const sheet = getSheet('Messages');
  const messages = sheetToObjects(sheet, MSG_HEADERS);
  const msg = messages.find(m => m.id === id);
  if (!msg) return { error: 'Not found' };

  // Delete Drive files
  if (msg.fileUrls) {
    const urls = String(msg.fileUrls).split(',');
    for (const url of urls) {
      try {
        const fileId = extractDriveFileId(url.trim());
        if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
      } catch (e) {
        // Ignore file deletion errors
      }
    }
  }

  sheet.deleteRow(msg.rowIndex);
  return { success: true };
}

function extractDriveFileId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ─── File Upload ───

function handleUploadFile(body) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const blob = Utilities.newBlob(Utilities.base64Decode(body.base64), body.mimeType, body.filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';
  return { fileUrl };
}

// ─── Events ───

const EVT_HEADERS = ['id', 'messageId', 'title', 'description', 'eventDate', 'eventTime', 'endDate', 'endTime', 'location', 'category', 'gcalEventId', 'isDone', 'createdAt'];

function handleGetEvents(params) {
  const sheet = getSheet('Events');
  let events = sheetToObjects(sheet, EVT_HEADERS);

  if (params.month) {
    events = events.filter(e => String(e.eventDate).startsWith(params.month));
  }

  if (params.upcoming === 'true') {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    const twoWeeksStr = Utilities.formatDate(twoWeeks, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    events = events.filter(e => String(e.eventDate) >= today && String(e.eventDate) <= twoWeeksStr);
  }

  return { events: events.sort((a, b) => String(a.eventDate).localeCompare(String(b.eventDate))) };
}

function handleAddEvent(body) {
  const sheet = getSheet('Events');
  const id = getNextId(sheet);
  const now = new Date().toISOString();
  sheet.appendRow([
    id, body.messageId || '', body.title, body.description || '',
    body.eventDate, body.eventTime || '', body.endDate || '', body.endTime || '',
    body.location || '', body.category || '学校活动', '', 0, now
  ]);
  return { id };
}

function handleUpdateEvent(body) {
  const sheet = getSheet('Events');
  const rowIndex = body.rowIndex;
  if (!rowIndex) return { error: 'Missing rowIndex' };
  sheet.getRange(rowIndex, 2, 1, 10).setValues([[
    body.messageId || '', body.title, body.description || '',
    body.eventDate, body.eventTime || '', body.endDate || '', body.endTime || '',
    body.location || '', body.category || '学校活动', body.gcalEventId || ''
  ]]);
  return { success: true };
}

function handleDeleteEvent(body) {
  const id = Number(body.id);
  const sheet = getSheet('Events');
  const events = sheetToObjects(sheet, EVT_HEADERS);
  const evt = events.find(e => e.id === id);
  if (!evt) return { error: 'Not found' };
  sheet.deleteRow(evt.rowIndex);
  return { success: true };
}

function handleToggleEventDone(body) {
  const id = Number(body.id);
  const sheet = getSheet('Events');
  const events = sheetToObjects(sheet, EVT_HEADERS);
  const evt = events.find(e => e.id === id);
  if (!evt) return { error: 'Not found' };

  const newVal = evt.isDone ? 0 : 1;
  sheet.getRange(evt.rowIndex, 12).setValue(newVal); // isDone is column 12
  return { success: true, isDone: newVal };
}

// ─── Calendar Sync ───

function handleSyncToCalendar(body) {
  const eventId = Number(body.eventId);
  const sheet = getSheet('Events');
  const events = sheetToObjects(sheet, EVT_HEADERS);
  const evt = events.find(e => e.id === eventId);
  if (!evt) return { error: 'Event not found' };
  if (evt.gcalEventId) return { gcalEventId: evt.gcalEventId };

  const cal = CalendarApp.getDefaultCalendar();
  let gcalEvent;

  if (evt.eventTime) {
    const startDate = new Date(evt.eventDate + 'T' + evt.eventTime + ':00');
    let endDate;
    if (evt.endDate && evt.endTime) {
      endDate = new Date(evt.endDate + 'T' + evt.endTime + ':00');
    } else {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
    }
    gcalEvent = cal.createEvent(evt.title, startDate, endDate, {
      description: evt.description || '',
      location: evt.location || '',
    });
  } else {
    const date = new Date(evt.eventDate + 'T00:00:00');
    if (evt.endDate) {
      const endDate = new Date(evt.endDate + 'T00:00:00');
      endDate.setDate(endDate.getDate() + 1); // All-day events need end date +1
      gcalEvent = cal.createAllDayEvent(evt.title, date, endDate, {
        description: evt.description || '',
        location: evt.location || '',
      });
    } else {
      gcalEvent = cal.createAllDayEvent(evt.title, date, {
        description: evt.description || '',
        location: evt.location || '',
      });
    }
  }

  // Add reminder
  gcalEvent.addPopupReminder(60 * 24); // 1 day before
  gcalEvent.addPopupReminder(60);       // 1 hour before

  const gcalEventId = gcalEvent.getId();
  sheet.getRange(evt.rowIndex, 11).setValue(gcalEventId); // gcalEventId is column 11

  return { gcalEventId };
}
