// 這個檔案跑在伺服器上,不會被瀏覽器看到內容,所以 API 金鑰放在這裡是安全的。
// 金鑰本身不寫在程式碼裡,而是從 Vercel 的「環境變數」讀取(部署步驟會教你怎麼設定)。
// 這個版本改用 Google Gemini API(免費方案),不再使用 Anthropic API。

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受 POST 請求' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器尚未設定 GEMINI_API_KEY,請檢查 Vercel 環境變數設定。' });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: '缺少 prompt 內容' });
  }

  try {
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const message = (data && data.error && data.error.message) || 'Gemini API 回應錯誤';
      return res.status(geminiResponse.status).json({ error: message });
    }

    const candidate = (data.candidates && data.candidates[0]) || null;
    const text = candidate && candidate.content && candidate.content.parts
      ? candidate.content.parts.map(p => p.text || '').join('').trim()
      : '';

    if (!text) {
      return res.status(500).json({ error: 'AI 沒有回傳內容,請再試一次。' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: '伺服器呼叫 AI 服務時發生錯誤' });
  }
};
