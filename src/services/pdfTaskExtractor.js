import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

const cleanLine = (line) => line
  .replace(/^\s*(?:[•●▪◦‣*-]|\d+[.)]|\[[ xX✓]\])\s*/, '')
  .replace(/\s+/g, ' ')
  .trim();

const looksLikeTask = (line) => {
  const trimmed = line.trim();
  const isListItem = /^(?:[•●▪◦‣*-]|\d+[.)]|\[[ xX✓]\])\s+/.test(trimmed);
  const taskVerb = /\b(crear|diseñar|desarrollar|añadir|implementar|configurar|revisar|preparar|generar|permitir|seleccionar|integrar|actualizar|corregir|entregar|realizar|incluir)\b/i.test(trimmed);
  return (isListItem || taskVerb) && trimmed.length >= 5 && trimmed.length <= 180;
};

export async function extractTasksFromPdf(file) {
  const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const tasks = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = [];
    let currentY = null;
    content.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (currentY !== null && Math.abs(y - currentY) > 2) lines.push('\n');
      lines.push(item.str);
      currentY = y;
    });
    lines.join(' ').split(/\n|\s{3,}/).filter(looksLikeTask).forEach((line) => {
      const title = cleanLine(line);
      if (title && !tasks.some((task) => task.title.toLowerCase() === title.toLowerCase())) {
        const done = /^\s*\[[xX✓]\]/.test(line);
        tasks.push({ id: crypto.randomUUID(), title, status: done ? 'done' : 'todo', done, createdAt: Date.now(), source: file.name, subtasks: [] });
      }
    });
  }
  return tasks.slice(0, 60);
}
