// استخراج النص من الملفات داخل المتصفح

export async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `\n--- صفحة ${i} ---\n${pageText}\n`;
  }

  return fullText;
}

export async function extractTextFromTXT(file) {
  return await file.text();
}

export async function extractText(file) {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  if (type === 'text/plain' || name.endsWith('.txt')) {
    return extractTextFromTXT(file);
  }

  throw new Error('نوع الملف غير مدعوم حاليًا. الرجاء رفع PDF أو TXT.');
}