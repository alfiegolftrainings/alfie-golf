// ══════════════════════════════════════════════════════════════════
//  Alfie Golf Trainings — Apps Script
//  Owner: alfie.golf.trainings@gmail.com
// ══════════════════════════════════════════════════════════════════

var SHEET_ID   = '1FaZ-NhnoLUJx-__-nvaELy2iQsuDIlEJl8LhPZ_gZBk';
var SHEET_NAME = 'Users List';

// Column indices in Users List (1-based for getRange)
var COL_WEEK1_SENT = 11; // K — Week 1 Plan Sent
var COL_WEEK2_SENT = 15; // O — Week 2 Plan Sent

function doGet(e) {
  e = e || {};
  e.parameter = e.parameter || {};
  var action = e.parameter.action || '';

  // ── 1. Store an HTML chunk in cache ─────────────────────────
  if (action === 'storeChunk') {
    try {
      var key   = e.parameter.key   || '';
      var index = e.parameter.index || '0';
      var data  = e.parameter.data  || '';
      CacheService.getScriptCache().put(key + '_' + index, data, 21600);
      return json({ status: 'ok' });
    } catch(err) {
      Logger.log('storeChunk error: ' + err.toString());
      return json({ status: 'error', message: err.toString() });
    }
  }

  // ── 2. Create Gmail draft with HTML attachment ───────────────
  if (action === 'createDraft') {
    try {
      var key       = e.parameter.key      || '';
      var total     = parseInt(e.parameter.total) || 0;
      var to        = e.parameter.to       || '';
      var name      = e.parameter.name     || 'there';
      var week      = e.parameter.week     || '1';
      var filename  = e.parameter.filename || 'plan.html';
      var firstName = name.split(' ')[0];

      if (!to) return json({ status: 'error', message: 'No recipient' });

      // Reassemble base64 from chunks
      var b64 = '';
      if (key && total > 0) {
        var cache = CacheService.getScriptCache();
        for (var i = 0; i < total; i++) {
          var chunk = cache.get(key + '_' + i);
          if (!chunk) return json({ status: 'error', message: 'Chunk ' + i + ' missing from cache' });
          b64 += chunk;
        }
      }

      var subject = 'Your Week ' + week + ' Practice Plan is here, ' + firstName + ' ⛳';

      var htmlBody =
        '<p>Hey ' + firstName + ',</p>' +
        '<p>I\'ve been genuinely looking forward to putting this together — and here it is. ' +
        'Your personalised Week ' + week + ' practice plan, built entirely around your game, ' +
        'your schedule, and the frustration you told me about.</p>' +
        '<p>&#x1F4F1; <strong>Attached is your interactive HTML file.</strong> ' +
        'Open it in your phone\'s browser (tap the attachment &#x2192; if it previews oddly, ' +
        'tap the download icon and open the downloaded file). ' +
        'You\'ll be able to type your scores directly into the plan as you practise, ' +
        'answer the feedback questions, and then tap a single button that sends everything ' +
        'back to me automatically — pre-formatted, nothing to type. ' +
        'Takes about 2 minutes after your session.</p>' +
        '<p>One small thing: the interactive file will only let you hit Send once you\'ve ' +
        'filled in all your scores and told me whether you\'d like a plan next week.</p>' +
        '<p>One thing I\'d really ask: be honest with the scores. ' +
        'A 5 out of 9 is just as useful to me as a 9 out of 9 — ' +
        'it\'s what lets me design next week\'s plan with the right progression ' +
        'for your game, not a generic one.</p>' +
        '<p>Looking forward to hearing how it goes. &#x1F3CC;&#xFE0F;</p>' +
        '<p>Talk soon,<br>Alfie<br><small>Free personalized golf practice plans</small></p>';

      var body =
        'Hey ' + firstName + ',\n\n' +
        'I\'ve been genuinely looking forward to putting this together — and here it is. ' +
        'Your personalised Week ' + week + ' practice plan is attached.\n\n' +
        'Open the HTML file in your phone\'s browser, fill in your scores and feedback, ' +
        'then tap Send — takes 2 minutes.\n\n' +
        'Talk soon,\nAlfie\n\nFree personalized golf practice plans';

      var options = { htmlBody: htmlBody };

      if (b64) {
        var htmlBytes = Utilities.base64Decode(b64);
        var blob      = Utilities.newBlob(htmlBytes, 'text/html', filename);
        options.attachments = [blob];
      }

      GmailApp.createDraft(to, subject, body, options);
      Logger.log('Draft created for ' + to);

      // Write date to the "Plan Sent" column in Users List
      var rowIndex = parseInt(e.parameter.rowIndex);
      if (!isNaN(rowIndex) && rowIndex >= 0) {
        try {
          var ss        = SpreadsheetApp.openById(SHEET_ID);
          var sheet     = ss.getSheetByName(SHEET_NAME);
          var sheetRow  = rowIndex + 2; // +1 header, +1 for 1-based
          var weekNum   = parseInt(week) || 1;
          var col       = weekNum === 1 ? COL_WEEK1_SENT : COL_WEEK2_SENT;
          var today     = new Date();
          var dd        = String(today.getDate()).padStart(2, '0');
          var mm        = String(today.getMonth() + 1).padStart(2, '0');
          var yyyy      = today.getFullYear();
          sheet.getRange(sheetRow, col).setValue(dd + '/' + mm + '/' + yyyy);
          Logger.log('Updated row ' + sheetRow + ' col ' + col);
        } catch(dateErr) {
          Logger.log('Date update error: ' + dateErr.toString());
        }
      }

      return json({ status: 'ok' });

    } catch(err) {
      Logger.log('createDraft error: ' + err.toString());
      return json({ status: 'error', message: err.toString() });
    }
  }

  // ── 3. Get dashboard data ────────────────────────────────────
  if (action === 'getDashboardData') {
    try {
      var ss    = SpreadsheetApp.openById(SHEET_ID);
      var sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) return json({ error: 'Sheet not found' });

      var rows    = sheet.getDataRange().getValues();
      var headers = rows[0];

      // Build header index map
      var hi = {};
      headers.forEach(function(h, i) { hi[h] = i; });

      var golfers = [];
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var name = (row[hi['First Name']] || '').toString().trim();
        if (!name) continue;
        golfers.push({
          rowIndex:   i,
          name:       name,
          contact:    (row[hi['Contact (WhatsApp / Email)']] || '').toString().trim(),
          handicap:   (row[hi['Handicap']] || '').toString().trim(),
          frustration:(row[hi['Main Frustration']] || '').toString().trim(),
          sessions:   (row[hi['Weekly Practice Session']] || '').toString().trim(),
          duration:   (row[hi['Time per Session']] || '').toString().trim(),
          facilities: (row[hi['Facilities']] || '').toString().trim(),
          cohort:     (row[hi['Cohort #']] || '').toString().trim(),
          week1Sent:  (row[hi['Week 1 Plan Sent']] || '').toString().trim(),
          week2Sent:  (row[hi['Week 2 Plan Sent']] || '').toString().trim(),
          notes:      (row[hi['Notes / Quotes']] || '').toString().trim()
        });
      }

      // Search Gmail for result emails — "Week N results" in subject (dash optional for manual sends)
      var resultMap = {};
      try {
        var threads = GmailApp.search('in:inbox subject:results subject:week', 0, 200);
        threads.forEach(function(thread) {
          // Only read the FIRST message in the thread (the golfer's original submission).
          // Reply chains can have multiple messages all sharing the same subject line —
          // iterating all of them would create false duplicate sessions.
          // Genuine multiple sessions = multiple separate threads, not multiple messages
          // within the same thread.
          var messages = thread.getMessages();
          var msg = messages[0];
          if (!msg) return;
          (function() {
            var subj = msg.getSubject() || '';
            var body = msg.getPlainBody() || '';
            var date = msg.getDate();
            // Extract golfer name — dash/em-dash optional to catch manual sends
            var m = subj.match(/Week\s*(\d+)\s*results\s*[—\-]?\s*(.+)/i);
            if (!m) return;
            var weekNum  = parseInt(m[1]) || 1;
            var rawName  = m[2].trim();
            var firstName = rawName.split(/\s+/)[0].toLowerCase();
            var key = firstName + '_w' + weekNum;
            if (!resultMap[key]) resultMap[key] = [];
            resultMap[key].push({
              week:    weekNum,
              rawName: rawName,
              date:    date.toISOString(),
              subject: subj,
              session: resultMap[key].length + 1,
              parsed:  parseResultEmail(body)
            });
          })();
        });
      } catch(gmailErr) {
        Logger.log('Gmail search error: ' + gmailErr.toString());
      }

      // Attach result emails to golfers — all sessions for each week
      golfers.forEach(function(g) {
        var firstName = g.name.split(/\s+/)[0].toLowerCase();
        g.results = [];
        for (var wk = 1; wk <= 4; wk++) {
          var key = firstName + '_w' + wk;
          if (resultMap[key]) {
            resultMap[key].forEach(function(r) { g.results.push(r); });
          }
        }
      });

      return json({ golfers: golfers, resultMap: resultMap });
    } catch(err) {
      Logger.log('getDashboardData error: ' + err.toString());
      return json({ error: err.toString() });
    }
  }

  // ── 4. Search Gmail inbox for golfer emails ──────────────────
  if (action === 'searchEmail') {
    try {
      var from = e.parameter.from || '';
      if (!from) return json({ found: false });
      var threads = GmailApp.search('from:' + from, 0, 5);
      if (!threads || threads.length === 0) return json({ found: false });
      var messages = threads[0].getMessages();
      var msg      = messages[messages.length - 1];
      return json({
        found:   true,
        subject: msg.getSubject(),
        date:    msg.getDate().toString(),
        body:    msg.getPlainBody().trim().substring(0, 3000)
      });
    } catch(err) {
      Logger.log('searchEmail error: ' + err.toString());
      return json({ found: false, error: err.toString() });
    }
  }

  // ── 4. Load sheet data (default) ────────────────────────────
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return json({ error: 'Sheet "' + SHEET_NAME + '" not found' });
    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0];
    var result  = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var obj = {};
      headers.forEach(function(h, j) { obj[h] = row[j] || ''; });
      result.push(obj);
    }
    return json(result);
  } catch(err) {
    Logger.log('Sheet load error: ' + err.toString());
    return json({ error: err.toString() });
  }
}

// ── Email parsing helpers ────────────────────────────────────

function parseResultEmail(body) {
  var result = {
    scores: [],
    q1: extractAnswer(body, 'Q1'),
    q2: extractAnswer(body, 'Q2'),
    q3: extractAnswer(body, 'Q3'),
    q4: extractQ4(body)
  };

  // Extract score lines — look for "__ / N" or "X / N" patterns
  var scoreRe = /([A-Za-z &\-()]+)[\s:]+(\d+)\s*\/\s*(\d+)/g;
  var sm;
  while ((sm = scoreRe.exec(body)) !== null) {
    var label = sm[1].trim();
    // Skip Q-labels that got matched
    if (/^Q[1-4]$/i.test(label)) continue;
    result.scores.push({
      label: label,
      value: parseInt(sm[2]),
      max:   parseInt(sm[3])
    });
  }

  return result;
}

function extractAnswer(body, qLabel) {
  var num = qLabel.replace('Q', '');
  // Match "Q1: answer" OR "1. Question text:\nanswer" (actual email format from buildEmailParts)
  var re = new RegExp(
    '(?:' + qLabel + '[:\\s]+|' + num + '\\.[^\\n]+\\n)([\\s\\S]*?)(?=\\n[1-4]\\.|\\n—|$)',
    'i'
  );
  var m = body.match(re);
  if (!m) return '';
  return m[1].replace(/\n+/g, ' ').trim().substring(0, 500);
}

function extractQ4(body) {
  // Match both "Q4: answer" and "4. Ready for next week's plan: answer" formats
  var re = /(?:Q4[:\s]+|4\.\s*Ready for next week[^:]*:\s*)([\s\S]*?)(?=\n—|\n\n|$)/i;
  var m = body.match(re);
  if (!m) return 'unknown';
  var section = m[1].toLowerCase();
  if (/yes|send|ready/.test(section)) return 'yes';
  if (/no|not yet|more time/.test(section)) return 'no';
  return 'unknown';
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function authorizeAll() {
  var ss     = SpreadsheetApp.openById(SHEET_ID);
  var sheet  = ss.getSheetByName(SHEET_NAME);
  var drafts = GmailApp.getDrafts();
  Logger.log('Sheet OK — ' + ss.getName() + ' / tab: ' + (sheet ? sheet.getName() : 'NOT FOUND'));
  Logger.log('Gmail OK — ' + drafts.length + ' existing drafts');
}

function testEmojiHtml() {
  var htmlBody =
    '<p>Phone: &#x1F4F1;</p>' +
    '<p>Golf: &#x1F3CC;&#xFE0F;</p>';
  GmailApp.createDraft(
    'fabio.pengue@gmail.com',
    'Test subject — no emoji here',
    'Plain text fallback',
    { htmlBody: htmlBody }
  );
}
