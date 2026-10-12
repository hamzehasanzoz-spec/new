import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * تصدير HTML إلى PDF
 * @param {string} htmlContent - محتوى HTML
 * @param {object} options - خيارات
 */
export async function exportHTMLToPDF(htmlContent, options = {}) {
  const {
    filename = 'export.pdf',
    title = '',
    orientation = 'portrait', // portrait | landscape
    format = 'a4',
  } = options;

  // 1. أنشئ حاوية مؤقتة
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.padding = '40px';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', 'Segoe UI', Tahoma, sans-serif";
  container.style.color = '#1E293B';
  container.style.lineHeight = '1.7';

  // 2. أضف الرأس
  container.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      h1, h2, h3 { color: #2A5C82; margin: 0 0 12px; }
      h1 { font-size: 22px; text-align: center; border-bottom: 3px solid #2A5C82; padding-bottom: 12px; margin-bottom: 24px; }
      h2 { font-size: 18px; margin-top: 20px; }
      h3 { font-size: 16px; }
      .header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px dashed #E2E8F0;
      }
      .header-title {
        font-size: 28px;
        font-weight: 800;
        color: #2A5C82;
        margin-bottom: 8px;
      }
      .header-subtitle {
        font-size: 14px;
        color: #64748B;
      }
      .section {
        margin-bottom: 20px;
        page-break-inside: avoid;
      }
      .message {
        margin-bottom: 12px;
        padding: 12px 16px;
        border-radius: 10px;
        page-break-inside: avoid;
      }
      .message-user {
        background: #EFF6FF;
        border-right: 4px solid #2A5C82;
      }
      .message-assistant {
        background: #F8FAFC;
        border-right: 4px solid #10B981;
      }
      .message-role {
        font-size: 12px;
        font-weight: bold;
        color: #64748B;
        margin-bottom: 6px;
      }
      .question {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .question-num {
        font-weight: bold;
        color: #2A5C82;
        margin-bottom: 8px;
      }
      .option {
        padding: 6px 10px;
        margin: 4px 0;
        border-radius: 6px;
        font-size: 13px;
      }
      .option-correct {
        background: #F0FDF4;
        border: 1px solid #10B981;
        color: #065F46;
      }
      .option-wrong {
        background: #FEF2F2;
        border: 1px solid #EF4444;
        color: #991B1B;
      }
      .option-user-wrong {
        background: #FEF2F2;
        border: 1px solid #FCA5A5;
        color: #991B1B;
      }
      .option-normal {
        background: #ffffff;
        border: 1px solid #E2E8F0;
      }
      .explanation {
        background: #EFF6FF;
        border-radius: 8px;
        padding: 10px;
        margin-top: 8px;
        font-size: 12px;
        color: #1E40AF;
      }
      .stats {
        display: flex;
        gap: 20px;
        justify-content: space-around;
        margin: 20px 0;
        padding: 20px;
        background: #F8FAFC;
        border-radius: 12px;
      }
      .stat-item {
        text-align: center;
      }
      .stat-value {
        font-size: 28px;
        font-weight: 800;
        color: #2A5C82;
      }
      .stat-label {
        font-size: 12px;
        color: #64748B;
        margin-top: 4px;
      }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
      }
      .badge-success { background: #D1FAE5; color: #065F46; }
      .badge-danger { background: #FEE2E2; color: #991B1B; }
      .badge-warning { background: #FEF3C7; color: #92400E; }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #E2E8F0;
        text-align: center;
        font-size: 11px;
        color: #94A3B8;
      }
      p { margin: 0 0 8px; }
      ul { margin: 8px 0; padding-right: 20px; }
      li { margin-bottom: 4px; }
    </style>
    <div class="header">
      <div class="header-title">🩺 كوتش AI</div>
      <div class="header-subtitle">${title || 'منصة الامتحان الوطني للطب في سوريا'}</div>
      <div class="header-subtitle" style="margin-top: 8px; font-size: 12px;">
        ${new Date().toLocaleDateString('ar-EG', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })}
      </div>
    </div>
    ${htmlContent}
    <div class="footer">
      تم إنشاء هذا الملف بواسطة كوتش AI — ${new Date().toLocaleString('ar-EG')}
    </div>
  `;

  document.body.appendChild(container);

  try {
    // 3. حوّل إلى canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // 4. أنشئ PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // 5. أضف الصفحات
    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 6. احفظ
    pdf.save(filename);
    return true;
  } catch (err) {
    console.error('PDF Export error:', err);
    throw err;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * تصدير محادثة
 */
export async function exportConversationPDF(messages, profile) {
  const title = `محادثة — ${profile?.full_name || 'الطالب'}`;
  const date = new Date().toLocaleDateString('ar-EG');

  const messagesHTML = messages
    .filter(m => m.content && m.content.trim())
    .map((msg, i) => {
      const isUser = msg.role === 'user';
      return `
        <div class="message ${isUser ? 'message-user' : 'message-assistant'}">
          <div class="message-role">
            ${isUser ? '👤 أنت' : '🩺 Coach AI'}
          </div>
          <div style="white-space: pre-wrap;">${escapeHTML(msg.content)}</div>
        </div>
      `;
    })
    .join('');

  const html = `
    <div class="section">
      <h2>💬 سجل المحادثة</h2>
      <p style="font-size: 13px; color: #64748B;">
        عدد الرسائل: ${messages.filter(m => m.content?.trim()).length}
      </p>
    </div>
    ${messagesHTML}
  `;

  const filename = `محادثة-${date.replace(/\//g, '-')}.pdf`;
  return exportHTMLToPDF(html, { filename, title });
}

/**
 * تصدير اختبار + النتيجة
 */
export async function exportQuizPDF({
  subject, topic, questions, answers, score, total, percentage, profile,
}) {
  const title = `اختبار — ${subject}`;
  const date = new Date().toLocaleDateString('ar-EG');

  const questionsHTML = questions.map((q, i) => {
    const userAns = answers[i];
    const isCorrect = userAns === q.correct;

    const optionsHTML = q.options.map((opt, oi) => {
      let cls = 'option option-normal';
      let prefix = '';
      if (oi === q.correct) {
        cls = 'option option-correct';
        prefix = '✅ ';
      } else if (oi === userAns && !isCorrect) {
        cls = 'option option-user-wrong';
        prefix = '❌ ';
      }
      return `
        <div class="${cls}">
          <strong>${String.fromCharCode(65 + oi)}.</strong> ${prefix}${escapeHTML(opt)}
        </div>
      `;
    }).join('');

    return `
      <div class="question">
        <div class="question-num">
          ${i + 1}. ${escapeHTML(q.q)}
          <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}" style="float: left;">
            ${isCorrect ? '✓ صحيح' : '✗ خطأ'}
          </span>
        </div>
        ${optionsHTML}
        ${q.explanation ? `<div class="explanation">💡 ${escapeHTML(q.explanation)}</div>` : ''}
      </div>
    `;
  }).join('');

  const html = `
    <div class="stats">
      <div class="stat-item">
        <div class="stat-value">${score}/${total}</div>
        <div class="stat-label">الدرجة</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: ${percentage >= 80 ? '#10B981' : percentage >= 60 ? '#F59E0B' : '#EF4444'};">
          ${percentage}%
        </div>
        <div class="stat-label">النسبة</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #EF4444;">${total - score}</div>
        <div class="stat-label">الأخطاء</div>
      </div>
    </div>

    <div class="section">
      <h2>📋 الأسئلة</h2>
      ${topic ? `<p style="color: #64748B; font-size: 13px;">الموضوع: ${escapeHTML(topic)}</p>` : ''}
    </div>

    ${questionsHTML}
  `;

  const filename = `اختبار-${subject}-${date.replace(/\//g, '-')}.pdf`;
  return exportHTMLToPDF(html, { filename, title });
}

/**
 * تصدير بنك الأخطاء
 */
export async function exportWrongAnswersPDF(answers, profile, filterSubject = '') {
  const title = filterSubject
    ? `بنك الأخطاء — ${filterSubject}`
    : 'بنك الأخطاء الكامل';
  const date = new Date().toLocaleDateString('ar-EG');

  if (answers.length === 0) {
    throw new Error('لا توجد أخطاء محفوظة');
  }

  // إحصائيات حسب المادة
  const bySubject = {};
  answers.forEach(a => {
    const s = a.subject || 'غير محدد';
    bySubject[s] = (bySubject[s] || 0) + 1;
  });

  const statsHTML = Object.entries(bySubject)
    .map(([s, c]) => `<li><strong>${s}:</strong> ${c} سؤال</li>`)
    .join('');

  const answersHTML = answers.map((item, i) => {
    const optionsHTML = item.options.map((opt, oi) => {
      let cls = 'option option-normal';
      let prefix = '';
      if (oi === item.correct_index) {
        cls = 'option option-correct';
        prefix = '✅ ';
      } else if (oi === item.user_answer_index) {
        cls = 'option option-user-wrong';
        prefix = '❌ ';
      }
      return `
        <div class="${cls}">
          <strong>${String.fromCharCode(65 + oi)}.</strong> ${prefix}${escapeHTML(opt)}
        </div>
      `;
    }).join('');

    return `
      <div class="question">
        <div class="question-num">${i + 1}. ${escapeHTML(item.question)}</div>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
          ${item.subject || ''}${item.topic ? ` — ${item.topic}` : ''}
        </div>
        ${optionsHTML}
        ${item.explanation ? `<div class="explanation">💡 ${escapeHTML(item.explanation)}</div>` : ''}
      </div>
    `;
  }).join('');

  const html = `
    <div class="section">
      <h2>📊 إحصائيات</h2>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">${answers.length}</div>
          <div class="stat-label">إجمالي الأخطاء</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Object.keys(bySubject).length}</div>
          <div class="stat-label">عدد المواد</div>
        </div>
      </div>
      <h3>الأخطاء حسب المادة:</h3>
      <ul>${statsHTML}</ul>
    </div>

    <div class="section">
      <h2>📝 الأسئلة الخاطئة</h2>
    </div>

    ${answersHTML}
  `;

  const filename = `بنك-الأخطاء-${date.replace(/\//g, '-')}.pdf`;
  return exportHTMLToPDF(html, { filename, title });
}

/**
 * تصدير نتيجة امتحان
 */
export async function exportExamPDF({
  subject, questions, answers, score, total, percentage, timeUsed, totalTime, profile,
}) {
  const title = `امتحان — ${subject}`;
  const date = new Date().toLocaleDateString('ar-EG');

  const wrongQuestions = questions
    .map((q, i) => ({ q, i, userAns: answers[i] }))
    .filter(({ q, i }) => answers[i] !== q.correct);

  const wrongHTML = wrongQuestions.length === 0
    ? '<p style="text-align: center; padding: 30px; color: #10B981; font-weight: bold;">🏆 لا توجد أخطاء — ممتاز!</p>'
    : wrongQuestions.map(({ q, i, userAns }) => {
        const optionsHTML = q.options.map((opt, oi) => {
          let cls = 'option option-normal';
          let prefix = '';
          if (oi === q.correct) {
            cls = 'option option-correct';
            prefix = '✅ ';
          } else if (oi === userAns) {
            cls = 'option option-user-wrong';
            prefix = '❌ ';
          }
          return `
            <div class="${cls}">
              <strong>${String.fromCharCode(65 + oi)}.</strong> ${prefix}${escapeHTML(opt)}
            </div>
          `;
        }).join('');

        return `
          <div class="question">
            <div class="question-num">${i + 1}. ${escapeHTML(q.q)}</div>
            ${optionsHTML}
            ${q.explanation ? `<div class="explanation">💡 ${escapeHTML(q.explanation)}</div>` : ''}
          </div>
        `;
      }).join('');

  const minutes = Math.floor(timeUsed / 60);
  const avgSec = total > 0 ? Math.round(timeUsed / total) : 0;

  const html = `
    <div class="stats">
      <div class="stat-item">
        <div class="stat-value">${score}/${total}</div>
        <div class="stat-label">الدرجة</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: ${percentage >= 80 ? '#10B981' : percentage >= 60 ? '#F59E0B' : '#EF4444'};">
          ${percentage}%
        </div>
        <div class="stat-label">النسبة</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #2A5C82;">${minutes}د</div>
        <div class="stat-label">الوقت</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #8B5CF6;">${avgSec}ث</div>
        <div class="stat-label">متوسط/سؤال</div>
      </div>
    </div>

    ${wrongQuestions.length > 0 ? `
      <div class="section">
        <h2>❌ الأسئلة الخاطئة (${wrongQuestions.length})</h2>
      </div>
      ${wrongHTML}
    ` : wrongHTML}
  `;

  const filename = `امتحان-${subject}-${date.replace(/\//g, '-')}.pdf`;
  return exportHTMLToPDF(html, { filename, title });
}

/**
 * حماية HTML
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}