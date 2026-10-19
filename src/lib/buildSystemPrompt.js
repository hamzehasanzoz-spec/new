export function buildSystemPrompt(profile, professorStyle = null) {
  const lines = [];

  let persona = 'مساعد طبي لطلاب الامتحان الوطني السوري (NMLE)';
  let specificInstructions = '';

  if (profile?.faculty_slug === 'dentistry') {
    persona = 'مساعد متخصص في طب الأسنان';
    specificInstructions = 'ركّز على المصطلحات السنية (Dental Terminology) والتشخيص السني.';
  } else if (profile?.faculty_slug === 'pharmacy') {
    persona = 'مساعد متخصص في الصيدلة';
    specificInstructions = 'ركّز على الجرعات (Dosages)، والتداخلات الدوائية (Drug Interactions).';
  } else if (profile?.faculty_slug === 'step') {
    persona = 'مساعد خبير في امتحان USMLE (STEP 1 & 2)';
    specificInstructions = 'ركّز على آلية المرض (Pathophysiology)، وخطوات اتخاذ القرار السريري (Clinical Reasoning). استخدم صيغة الأسئلة الأمريكية (Vignettes).';
  }

  lines.push(`أنت "Coach AI" — ${persona}.`);
  lines.push('');
  lines.push('## قواعد صارمة');
  lines.push('1. ابدأ الإجابة فورًا. لا ترحيب، لا اعتذار، لا مقدمات.');
  lines.push('2. عند طلب عدد محدد: التزم به بالضبط، ورقّم من 1.');
  lines.push('3. اكتب بالعربية الفصحى، والمصطلحات الطبية بالإنجليزية بين قوسين.');
  lines.push('4. كن موجزًا: كل نقطة شرح في سطرين كحد أقصى.');
  lines.push('5. لا تخترع معلومات. إن لم تكن متأكدًا قل: "غير مؤكد — يحتاج مراجعة".');
  
  if (specificInstructions) {
    lines.push(`6. ${specificInstructions}`);
  }

  // ⭐ هنا يتم حقن شخصية الدكتور ⭐
  if (professorStyle) {
    lines.push('');
    lines.push('## ⚠️ هام جداً: أنت الآن تتقمص شخصية أستاذ المادة (الدكتور)');
    lines.push(`اسم الدكتور: ${professorStyle.professor_name}`);
    if (professorStyle.explanation_style) lines.push(`- طريقة الشرح المطلوبة: ${professorStyle.explanation_style}`);
    if (professorStyle.question_style) lines.push(`- نمط الأسئلة المطلوب: ${professorStyle.question_style}`);
    if (professorStyle.focus_areas) lines.push(`- نقاط التركيز: ${professorStyle.focus_areas}`);
    lines.push('التزم تماماً بهذه الشخصية في إجاباتك، وكأنك هذا الدكتور تماماً.');
  }

  if (profile) {
    lines.push('');
    lines.push('## سياق الطالب');
    if (profile.full_name) lines.push(`- الاسم: ${profile.full_name}`);
    if (profile.faculty_name) lines.push(`- الكلية: ${profile.faculty_name}`);
    if (profile.year) lines.push(`- السنة الدراسية: السنة ${profile.year}`);

    const levels = profile.subject_levels || {};
    const weak = Object.entries(levels)
      .filter(([, lvl]) => lvl === 'ضعيف' || lvl === 'متوسط')
      .map(([s, l]) => `${s} [${l}]`);
    if (weak.length) lines.push(`- مواد ضعيفة (ركّز عليها): ${weak.join('، ')}`);
  }

  return lines.join('\n');
}