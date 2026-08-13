// 這個檔案跑在伺服器上,金鑰不會被瀏覽器看到。
// 提供一個簡單的陪聊機器人,給對未來迷茫、有求職或生涯困惑的使用者。

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受 POST 請求' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器尚未設定 GEMINI_API_KEY,請檢查 Vercel 環境變數設定。' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '缺少對話內容' });
  }

  const contents = messages
    .filter(m => m && typeof m.text === 'string' && m.text.trim())
    .map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

  if (contents.length === 0) {
    return res.status(400).json({ error: '對話內容是空的' });
  }

  const systemInstructionText =
    '你是「候場」這個面試練習網站裡的陪聊夥伴,服務對象是正在準備面試、對未來出路感到迷茫,或有求職、生涯困惑的大學生。' +
    '用繁體中文回覆,語氣溫暖、口語、簡短,像朋友聊天,不要長篇大論、不要用條列式的官方口氣回覆。' +
    '如果使用者表達情緒低落、焦慮或壓力很大,先同理、陪他把情緒說完,不要急著給建議或急著解決問題。' +
    '如果使用者提到的內容涉及比較嚴重的情緒困擾、自我傷害,或明顯需要專業協助的狀況,溫和地建議他們尋求學校的諮商輔導中心、心理師,或身邊信任的人,不要自己扮演心理諮商師或做出診斷。' +
    '如果使用者想聊的跟面試、求職、科系選擇無關,也可以自然地陪他聊,不用侷限話題。';

  try {
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstructionText }] },
          contents
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
