// api/start.js
// START.exe — Friendly coding bhaiya AI
// Grok → Groq → Gemini fallback
//
// Env vars: XAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY

async function fetchWithTimeout(url, options, ms = 9000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { system, history = [], message, lang } = req.body || {};
    if (!system) return res.status(400).json({ error: 'No system prompt.' });

    const XKEY  = process.env.XAI_API_KEY;
    const GQKEY = process.env.GROQ_API_KEY;
    const GKEY  = process.env.GEMINI_API_KEY;

    if (!XKEY && !GQKEY && !GKEY) {
      return res.status(500).json({
        error: 'No API keys set. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables.'
      });
    }

    // Build messages array
    const messages = [
      { role: 'system', content: system },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];
    if (message) messages.push({ role: 'user', content: message });

    // Quick replies instruction appended to last user message
    const qrInstr = `\n\nAfter your response, on a new line write: QUICK_REPLIES: ["option1","option2","option3"] — 2-3 short follow-up options the user might want to click. In ${lang === 'hinglish' ? 'Hinglish' : 'English'}.`;
    messages[messages.length - 1].content += qrInstr;

    let rawReply = null;

    // ── Grok ──
    if (XKEY) {
      try {
        const r = await fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${XKEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'grok-3-mini', messages, max_tokens: 1000, temperature: 0.85 })
        });
        const d = await r.json();
        const t = d?.choices?.[0]?.message?.content?.trim();
        if (r.ok && t) { rawReply = t; console.log('[START] Grok OK'); }
        else console.log('[START] Grok failed:', r.status, d?.error?.message);
      } catch(e) { console.log('[START] Grok error:', e.message); }
    }

    // ── Groq ──
    if (!rawReply && GQKEY) {
      for (const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']) {
        try {
          const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GQKEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, max_tokens: 1000, temperature: 0.85 })
          });
          const d = await r.json();
          const t = d?.choices?.[0]?.message?.content?.trim();
          if (r.ok && t) { rawReply = t; console.log('[START] Groq OK'); break; }
          else console.log('[START] Groq failed:', r.status, d?.error?.message);
        } catch(e) { console.log('[START] Groq error:', e.message); }
      }
    }

    // ── Gemini ──
    if (!rawReply && GKEY) {
      for (const model of ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']) {
        try {
          // Convert to Gemini format
          const geminiContents = history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));
          const lastMsg = message || history[history.length-1]?.content || '';
          geminiContents.push({ role: 'user', parts: [{ text: lastMsg + qrInstr }] });

          const r = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GKEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: geminiContents,
                systemInstruction: { parts: [{ text: system }] },
                generationConfig: { maxOutputTokens: 1000, temperature: 0.85 }
              })
            }
          );
          const d = await r.json();
          const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (r.ok && t) { rawReply = t; console.log('[START] Gemini OK'); break; }
          else console.log('[START] Gemini failed:', r.status, d?.error?.message);
        } catch(e) { console.log('[START] Gemini error:', e.message); }
      }
    }

    if (!rawReply) {
      return res.status(500).json({ error: 'All AI providers failed. Check API keys have quota.' });
    }

    // Extract quick replies
    let reply = rawReply;
    let quickReplies = [];
    const qrMatch = rawReply.match(/QUICK_REPLIES:\s*(\[.*?\])/s);
    if (qrMatch) {
      try { quickReplies = JSON.parse(qrMatch[1]); } catch {}
      reply = rawReply.replace(/QUICK_REPLIES:\s*\[.*?\]/s, '').trim();
    }

    return res.status(200).json({ reply, quickReplies });

  } catch(e) {
    console.error('[START] Handler error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}