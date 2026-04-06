// api/start.js
// START.exe v2 — Friendly coding bhaiya AI
// Powers: Chat + Idea Generator + Builder + Git + Hosting + Debug + Portfolio + Interview
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
    if (!system && !message) return res.status(400).json({ error: 'No prompt provided.' });

    const XKEY  = process.env.XAI_API_KEY;
    const GQKEY = process.env.GROQ_API_KEY;
    const GKEY  = process.env.GEMINI_API_KEY;

    if (!XKEY && !GQKEY && !GKEY) {
      return res.status(500).json({
        error: 'No API keys found. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables. Get free key at aistudio.google.com/app/apikey'
      });
    }

    // Build messages
    const systemPrompt = system || 'You are a helpful coding assistant.';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    // Add message or quick reply prompt
    const finalMsg = message || (history[history.length-1]?.content || '');
    const isChat = history.length > 0 && !message;

    // For chat: add quick reply instruction
    const qrInstr = isChat ? '' : `\n\nAfter your response, on a new line write: QUICK_REPLIES: ["short option 1","short option 2","short option 3"] — in ${lang === 'hinglish' ? 'Hinglish' : 'English'}. Keep them short (max 6 words each).`;

    if (message) {
      messages.push({ role: 'user', content: message + qrInstr });
    } else if (history.length > 0) {
      // Already has history, just add qr instr to last message
      const last = messages[messages.length - 1];
      if (last.role === 'user') last.content += qrInstr;
    }

    let rawReply = null;

    // ── Grok ──
    if (XKEY) {
      try {
        const r = await fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${XKEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'grok-3-mini', messages, max_tokens: 1200, temperature: 0.85 })
        });
        const d = await r.json();
        const t = d?.choices?.[0]?.message?.content?.trim();
        if (r.ok && t) { rawReply = t; console.log('[START] Grok OK'); }
        else console.log('[START] Grok failed:', r.status, d?.error?.message);
      } catch(e) { console.log('[START] Grok error:', e.message); }
    }

    // ── Groq ──
    if (!rawReply && GQKEY) {
      for (const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']) {
        try {
          const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GQKEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, max_tokens: 1200, temperature: 0.85 })
          });
          const d = await r.json();
          const t = d?.choices?.[0]?.message?.content?.trim();
          if (r.ok && t) { rawReply = t; console.log('[START] Groq OK:', model); break; }
          else console.log('[START] Groq failed:', model, r.status, d?.error?.message);
        } catch(e) { console.log('[START] Groq error:', model, e.message); }
      }
    }

    // ── Gemini ──
    if (!rawReply && GKEY) {
      for (const model of ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']) {
        try {
          // Convert to Gemini format
          const geminiContents = [];
          for (const m of messages) {
            if (m.role === 'system') continue; // handled via systemInstruction
            geminiContents.push({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            });
          }
          // Ensure last message is user
          if (geminiContents[geminiContents.length-1]?.role !== 'user') {
            geminiContents.push({ role:'user', parts:[{ text: finalMsg + qrInstr }] });
          }

          const r = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GKEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: geminiContents,
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { maxOutputTokens: 1200, temperature: 0.85 }
              })
            }
          );
          const d = await r.json();
          const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (r.ok && t) { rawReply = t; console.log('[START] Gemini OK:', model); break; }
          else console.log('[START] Gemini failed:', model, r.status, d?.error?.message);
        } catch(e) { console.log('[START] Gemini error:', model, e.message); }
      }
    }

    if (!rawReply) {
      return res.status(500).json({
        error: 'All AI providers failed. Make sure at least one API key has quota remaining.',
        reply: lang === 'hinglish'
          ? 'Arre yaar, AI thodi der ke liye down hai 😅 Thodi der mein try karo! API keys check karo Vercel mein.'
          : 'AI is temporarily unavailable. Please try again in a moment.'
      });
    }

    // Extract quick replies
    let reply = rawReply;
    let quickReplies = [];
    const qrMatch = rawReply.match(/QUICK_REPLIES:\s*(\[[\s\S]*?\])/);
    if (qrMatch) {
      try { quickReplies = JSON.parse(qrMatch[1]); } catch {}
      reply = rawReply.replace(/QUICK_REPLIES:\s*\[[\s\S]*?\]/, '').trim();
    }

    return res.status(200).json({ reply, quickReplies });

  } catch(e) {
    console.error('[START] Handler error:', e);
    return res.status(500).json({
      error: e.message || 'Server error',
      reply: 'Kuch technical issue aa gayi. Dobara try karo bhai!'
    });
  }
}