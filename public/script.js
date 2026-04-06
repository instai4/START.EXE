/* ── CURSOR ── */
const cur = document.getElementById('cursor');
document.addEventListener('mousemove', e => { cur.style.left=e.clientX+'px'; cur.style.top=e.clientY+'px'; });

/* ── STATE ── */
let userLang = 'hinglish';
let userSkills = [];
let userGoal = '';
let userName = '';
let chatHistory = [];
let roadmapSteps = [];
let completedSteps = new Set();
let isTyping = false;

/* ── ONBOARDING ── */
let obStep = 1;

function pickLang(el) {
  document.querySelectorAll('[data-lang]').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  userLang = el.dataset.lang;
}

function obNext(step) {
  if (step === 3) {
    userSkills = [...document.querySelectorAll('#skills-chips .ob-chip.on')].map(c => c.dataset.s);
    if (!userSkills.length) { alert('Bhai kuch toh select kar!'); return; }
  }
  document.getElementById('ob-' + obStep).classList.remove('active');
  document.getElementById('dot-' + obStep).classList.remove('active');
  obStep = step;
  document.getElementById('ob-' + obStep).classList.add('active');
  document.getElementById('dot-' + obStep).classList.add('active');
}

document.querySelectorAll('#skills-chips .ob-chip').forEach(c => {
  c.addEventListener('click', () => {
    if (c.dataset.s === 'nothing') {
      document.querySelectorAll('#skills-chips .ob-chip').forEach(x => x.classList.remove('on'));
    } else {
      document.querySelector('[data-s="nothing"]')?.classList.remove('on');
    }
    c.classList.toggle('on');
  });
});

document.querySelectorAll('#goal-chips .ob-chip').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('#goal-chips .ob-chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    userGoal = c.dataset.g;
  });
});

async function startChat() {
  userName = document.getElementById('ob-name').value.trim() || 'Bhai';
  if (!userGoal) { alert('Pehle goal select kar!'); return; }

  // Hide onboarding
  const ob = document.getElementById('onboarding');
  ob.classList.add('hide');
  setTimeout(() => ob.style.display='none', 400);

  // Build roadmap
  buildRoadmap();

  // Send first AI message
  const skillsStr = userSkills.includes('nothing') ? 'abhi kuch nahi aata' : userSkills.join(', ');
  const goalMap = { idea:'project idea chahiye', build:'project banana hai', github:'GitHub pe project daalna hai', host:'website host karni hai', all:'pura journey — idea se hosting tak' };
  const goalStr = goalMap[userGoal] || userGoal;

  const systemCtx = buildSystem();
  const firstPrompt = `User ka naam: ${userName}
Skills: ${skillsStr}
Goal: ${goalStr}
Language: ${userLang}

Inhe greet kar, apna introduction de as START.exe (ek helpful senior coding bhaiya), aur pehla step shuru kar. Roadmap steps ka pehla item cover karna start kar.`;

  await getAIResponse(firstPrompt, true);
}

/* ── ROADMAP ── */
function buildRoadmap() {
  const phases = [];
  const hasGit = userSkills.includes('git');
  const hasCode = userSkills.some(s => ['html','css','javascript','python','java','react','nodejs'].includes(s));

  if (userGoal === 'idea' || userGoal === 'all' || userGoal === 'build') {
    phases.push({
      label: '💡 Project Planning',
      icon: 'fa-lightbulb',
      steps: [
        { id:'idea', text:'Project idea decide karo' },
        { id:'scope', text:'Features list banao (simple rakho)' },
        { id:'tech', text:'Tech stack choose karo' },
      ]
    });
  }

  if (userGoal === 'build' || userGoal === 'all') {
    phases.push({
      label: '🔨 Building',
      icon: 'fa-hammer',
      steps: [
        { id:'setup', text:'Project folder setup karo' },
        { id:'code1', text:'Basic structure banao' },
        { id:'code2', text:'Main features implement karo' },
        { id:'test', text:'Test karo, bugs fix karo' },
      ]
    });
  }

  if (userGoal === 'github' || userGoal === 'all') {
    phases.push({
      label: '🐙 GitHub',
      icon: 'fa-brands fa-github',
      steps: [
        { id:'git-install', text: hasGit ? 'Git already hai ✓' : 'Git install karo' },
        { id:'git-init', text:'git init & first commit' },
        { id:'gh-repo', text:'GitHub pe new repo banao' },
        { id:'git-push', text:'Code push karo' },
        { id:'readme', text:'README.md likho' },
      ]
    });
  }

  if (userGoal === 'host' || userGoal === 'all') {
    phases.push({
      label: '🌐 Hosting',
      icon: 'fa-globe',
      steps: [
        { id:'host-pick', text:'Platform choose karo' },
        { id:'host-deploy', text:'Deploy karo' },
        { id:'host-live', text:'Live URL share karo! 🎉' },
      ]
    });
  }

  // Flatten steps
  roadmapSteps = phases.flatMap(p => p.steps);

  // Render sidebar
  const sb = document.getElementById('sb-steps');
  sb.innerHTML = phases.map(phase => `
    <div class="sb-phase">
      <div class="sb-phase-label"><i class="fa-solid ${phase.icon}"></i>${phase.label}</div>
      ${phase.steps.map(s => `
        <div class="sb-step" id="step-${s.id}" onclick="askAboutStep('${s.id}','${s.text}')">
          <div class="sb-step-icon"><i class="fa-solid fa-check" style="opacity:0" id="check-${s.id}"></i></div>
          <span class="sb-step-text">${s.text}</span>
        </div>`).join('')}
    </div>`).join('');

  updateProgress();
}

function markStep(id) {
  completedSteps.add(id);
  const el = document.getElementById('step-'+id);
  if (el) {
    el.classList.add('done');
    el.querySelector('.sb-step-icon i').style.opacity = '1';
  }
  updateProgress();
}

function setActiveStep(id) {
  document.querySelectorAll('.sb-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('step-'+id);
  if (el) { el.classList.add('active'); el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
}

function updateProgress() {
  const pct = roadmapSteps.length ? Math.round(completedSteps.size / roadmapSteps.length * 100) : 0;
  document.getElementById('sb-prog-fill').style.width = pct + '%';
  document.getElementById('sb-prog-txt').textContent = pct + '%';
}

function askAboutStep(id, text) {
  document.getElementById('chat-input').value = text + ' ke baare mein batao';
  document.getElementById('chat-input').focus();
}

/* ── LANGUAGE ── */
function setLang(lang) {
  userLang = lang;
  document.getElementById('lng-hi').classList.toggle('active', lang==='hinglish');
  document.getElementById('lng-en').classList.toggle('active', lang==='english');
}

/* ── SYSTEM PROMPT ── */
function buildSystem() {
  const skillsStr = userSkills.includes('nothing') ? 'no coding skills yet' : userSkills.join(', ');
  const langInstr = userLang === 'hinglish'
    ? `Hinglish mein baat kar — Hindi aur English mix karo. Casual, friendly tone. "Bhai", "yaar", "dekh", "ek kaam kar" jaise words use karo. Lectures mat dena, dost ki tarah samjhao.`
    : `Talk in simple, friendly English. Like a helpful senior friend, not a professor. Short sentences. No jargon without explanation.`;

  return `You are START.exe — a friendly, helpful senior coding brother (bhaiya) who guides college students in India to build and deploy their first projects.

YOUR PERSONALITY:
- Talk like a cool, helpful senior friend — warm, encouraging, never condescending
- ${langInstr}
- Use emojis naturally (not too many, not too few)
- Break things into small, doable steps
- When giving commands, put them in code blocks
- Always end with what to do NEXT or ask if they're stuck
- If they seem lost, encourage them — "arre bhai, ye sab normal hai, main hoon na"
- Never give a lecture. Max 4-5 short paragraphs per response.
- When a step is complete, say "✅ [step name] done!" so the frontend can track it

USER PROFILE:
- Name: ${userName}
- Skills: ${skillsStr}
- Goal: ${userGoal}
- Language preference: ${userLang}

ROADMAP STEPS (guide through these in order):
${roadmapSteps.map((s,i) => `${i+1}. ${s.text} [ID: ${s.id}]`).join('\n')}

When you complete a step, write "✅ STEP_DONE: [step_id]" on its own line (this will be hidden from user but used to track progress).

TOPICS YOU HELP WITH:
- Project ideas based on their skill level
- Setting up project folder structure  
- Writing clean code basics
- Git: init, add, commit, push
- GitHub: creating repos, pushing code, writing README
- Hosting: GitHub Pages (free, HTML/CSS/JS), Vercel (free, any framework), Netlify (free)
- Debugging common beginner errors
- What to learn next`;
}

/* ── CHAT ── */
function addMessage(role, content, quickReplies=[]) {
  const msgs = document.getElementById('messages');

  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'bhaiya' ? 'bhaiya' : 'user'}`;

  const avatarEl = document.createElement('div');
  avatarEl.className = `msg-avatar ${role === 'bhaiya' ? 'bhaiya' : 'user-av'}`;
  avatarEl.textContent = role === 'bhaiya' ? 'B' : (userName?.[0]?.toUpperCase() || 'U');

  const contentEl = document.createElement('div');
  contentEl.className = 'msg-content';

  const nameEl = document.createElement('div');
  nameEl.className = 'msg-name';
  nameEl.textContent = role === 'bhaiya' ? 'START.exe' : (userName || 'You');

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatMessage(content);

  contentEl.appendChild(nameEl);
  contentEl.appendChild(bubble);

  if (quickReplies.length) {
    const qr = document.createElement('div');
    qr.className = 'quick-replies';
    quickReplies.forEach(r => {
      const chip = document.createElement('div');
      chip.className = 'qr-chip';
      chip.textContent = r;
      chip.onclick = () => {
        document.getElementById('chat-input').value = r;
        sendMessage();
        qr.remove();
      };
      qr.appendChild(chip);
    });
    contentEl.appendChild(qr);
  }

  wrap.appendChild(avatarEl);
  wrap.appendChild(contentEl);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function formatMessage(text) {
  // Parse step done markers (hidden)
  text = text.replace(/✅ STEP_DONE: (\w+)/g, (_, id) => {
    markStep(id);
    return '';
  });

  // Code blocks
  text = text.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Links
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Newlines
  text = text.replace(/\n/g, '<br>');
  return text;
}

function showTyping() {
  const msgs = document.getElementById('messages');
  const wrap = document.createElement('div');
  wrap.className = 'msg bhaiya typing-indicator';
  wrap.id = 'typing-indicator';
  wrap.innerHTML = `
    <div class="msg-avatar bhaiya">B</div>
    <div class="typing-wrap">
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping() {
  document.getElementById('typing-indicator')?.remove();
}

async function getAIResponse(userMsg, isSystem = false) {
  if (!isSystem) {
    chatHistory.push({ role: 'user', content: userMsg });
  }

  isTyping = true;
  document.getElementById('send-btn').disabled = true;
  showTyping();

  try {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: buildSystem(),
        history: chatHistory.slice(-12),
        message: isSystem ? userMsg : null,
        lang: userLang
      })
    });

    const rawText = await res.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch { throw new Error('Server error: ' + rawText.slice(0, 100)); }

    if (!res.ok) throw new Error(data?.error || 'Server error');

    const reply = data.reply || '';
    hideTyping();

    // Extract any step active hints
    const stepMatch = reply.match(/\[ACTIVE_STEP: (\w+)\]/);
    if (stepMatch) setActiveStep(stepMatch[1]);

    chatHistory.push({ role: 'assistant', content: reply });
    addMessage('bhaiya', reply, data.quickReplies || []);

  } catch(e) {
    hideTyping();
    addMessage('bhaiya', `Arre yaar, kuch technical dikkat aayi 😅\n\nError: ${e.message}\n\nThodi der baad try karo, ya check karo ki API keys Vercel mein set hain.`);
  } finally {
    isTyping = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('chat-input').focus();
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg || isTyping) return;

  input.value = '';
  autoResize(input);
  addMessage('user', msg);
  await getAIResponse(msg);
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
