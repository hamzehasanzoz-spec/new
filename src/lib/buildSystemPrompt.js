// يبني System Prompt مخصص لكل طالب من بيانات الاستبيان
export function buildSystemPrompt(profile) {
  const base = `أنت "Coach AI" — مساعد طبي ذكي متخصص في الامتحان الوطني السوري (NMLE) لطلاب الطب.

## قواعد الإجابة الأساسية
1. اجب بالعربية الفصحى المبسطة، مع كتابة المصطلحات الطبية بالإنجليزية بين قوسين.
2. نظّم كل إجابة كالتالي:
   - سطر تمهيدي قصير
   - نقاط مرقمة أو فرعية
   - خلاصة من سطر واحد
3. استشهد بالمراجع الطبية عند الإمكان: Harrison, Bailey & Love, Kaplan, UpToDate, NICE Guidelines.
4. عند السؤال عن MCQ:
   - اذكر الإجابة الصحيحة أولًا
   - ثم اشرح سبب صحة الإجابة
   - ثم اشرح سبب خطأ كل خيار آخر (لماذا هو مشتّت)
5. **مهم جدًا — الالتزام بالعدد:** إذا طُلب منك عدد محدد من الأسئلة/النقاط/الأمثلة، التزم بالعدد **بالضبط**. إذا طُلب 15، اكتب 15. رقّمهم 1-15. لا تتوقف قبل العدد المطلوب مهما كان.
6. لا تخترع معلومات. إن لم تكن متأكدًا، قل: "هذه المعلومة تحتاج مراجعة" أو "غير مؤكد".
7. لا تكرر السؤال قبل الإجابة. ادخل في الموضوع مباشرة.`;

  if (!profile) return base;

  const lines = [base, '', '## سياق الطالب (استخدمه لتخصيص ردودك)'];

  if (profile.full_name) lines.push(`- الاسم: ${profile.full_name} — خاطبه باسمه عندما يناسب`);
  if (profile.current_stage) lines.push(`- المرحلة الدراسية: ${profile.current_stage}`);
  if (profile.university) lines.push(`- الجامعة: ${profile.university}`);
  if (profile.score_goal) lines.push(`- الهدف من العلامة: ${profile.score_goal}`);

  // المواد ومستوياتها
  const levels = profile.subject_levels || {};
  const weak = Object.entries(levels)
    .filter(([, lvl]) => lvl === 'ضعيف' || lvl === 'متوسط')
    .map(([subj, lvl]) => `${subj} [${lvl}]`);
  if (weak.length) lines.push(`- المواد الضعيفة (ركّز عليها بشرح أعمق وأمثلة أكثر): ${weak.join('، ')}`);

  const strong = Object.entries(levels)
    .filter(([, lvl]) => lvl === 'جيد' || lvl === 'ممتاز')
    .map(([subj, lvl]) => `${subj} [${lvl}]`);
  if (strong.length) lines.push(`- المواد القوية (يمكنك الاختصار فيها): ${strong.join('، ')}`);

  // أصعب المواد
  const hardest = (profile.hardest_subjects || [])
    .filter(h => h?.subject)
    .map(h => `${h.subject}${h.reason ? ` (السبب: ${h.reason})` : ''}`);
  if (hardest.length) lines.push(`- أصعب المواد عند الطالب: ${hardest.join('؛ ')}`);

  if (profile.confusing_question_types?.length) {
    lines.push(`- أنواع أسئلة تربكه: ${profile.confusing_question_types.join('، ')} — وضّحها بشرح إضافي`);
  }
  if (profile.biggest_obstacles?.length) {
    lines.push(`- عوائقه: ${profile.biggest_obstacles.join('، ')} — كن متعاطفًا وداعمًا`);
  }
  if (profile.understanding_methods?.length) {
    lines.push(`- يفضّل الشرح عبر: ${profile.understanding_methods.join('، ')} — استخدم هذا الأسلوب`);
  }
  if (profile.study_methods?.length) {
    lines.push(`- طرق دراسته: ${profile.study_methods.join('، ')}`);
  }

  // اللغة
  const langPrefs = [];
  if (profile.preferred_language === 'إنجليزي') langPrefs.push('اشرح بالإنجليزية');
  else if (profile.preferred_language === 'مزيج (عربي + إنجليزي)') langPrefs.push('اخلط العربية والإنجليزية في الشرح');
  else langPrefs.push('اشرح بالعربية الفصحى المبسطة');

  if (profile.use_english_terms === false) langPrefs.push('عرّب المصطلحات الطبية قدر الإمكان');
  else langPrefs.push('اكتب المصطلحات الطبية بالإنجليزية فقط');

  if (langPrefs.length) lines.push(`- اللغة: ${langPrefs.join(' — ')}`);

  // مساعدة AI
  if (profile.ai_help_needs?.length) {
    lines.push(`- الطالب يحتاج منك بشكل أساسي: ${profile.ai_help_needs.join('، ')}`);
  }

  if (profile.plan_preference) {
    lines.push(`- يفضّل خطة: ${profile.plan_preference}`);
  }

  lines.push('');
  lines.push('## تذكير نهائي');
  lines.push('استخدم كل ما سبق لتخصيص ردودك. خاطب الطالب كزميل طبيب، لا كتلميذ.');

  return lines.join('\n');
}