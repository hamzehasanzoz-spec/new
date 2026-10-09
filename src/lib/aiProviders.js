// يرسل مصفوفة messages إلى /api/chat
export async function askAI(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'AI request failed');
  }
  return res.json(); // { text, provider }
}