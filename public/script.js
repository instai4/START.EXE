/* ── CURSOR ── */
const cur = document.getElementById('cursor');
document.addEventListener('mousemove', e => { cur.style.left=e.clientX+'px'; cur.style.top=e.clientY+'px'; });

/* ── GLOBAL STATE ── */
let uLang = 'hinglish', uSkills = [], uProblem = '', uName = '';
let chatHistory = [], isBusy = false;
let obCurrent = 1;

/* ═══════════════ ONBOARDING ═══════════════ */
function pickLang(el) {
  document.querySelectorAll('[data-lang]').forEach(c => c.classList.remove('on'));
  el.classList.add('on'); uLang = el.dataset.lang;
}
function obGo(n) {
  if (n === 3) {
    uSkills = [...document.querySelectorAll('#sk-chips .ob-chip.on')].map(c => c.dataset.s);
    if (!uSkills.length) { alert('Bhai kuch toh select kar!'); return; }
  }
  document.getElementById('obs'+obCurrent).classList.remove('active');
  document.getElementById('od'+obCurrent).classList.remove('active');
  obCurrent = n;
  document.getElementById('obs'+n).classList.add('active');
  document.getElementById('od'+n).classList.add('active');
}
document.querySelectorAll('#sk-chips .ob-chip').forEach(c => c.addEventListener('click', () => {
  if (c.dataset.s === 'nothing') document.querySelectorAll('#sk-chips .ob-chip').forEach(x => x.classList.remove('on'));
  else document.querySelector('[data-s="nothing"]')?.classList.remove('on');
  c.classList.toggle('on');
}));
document.querySelectorAll('#prob-chips .ob-chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('#prob-chips .ob-chip').forEach(x => x.classList.remove('on'));
  c.classList.add('on'); uProblem = c.dataset.p;
}));

function beginApp() {
  uName = document.getElementById('ob-name').value.trim() || 'Bhai';
  if (!uProblem) { alert('Pehle apni problem select kar!'); return; }
  const ob = document.getElementById('onboarding');
  ob.classList.add('gone');
  setTimeout(() => ob.style.display='none', 400);
  initApp();
}

/* ─── INIT ─── */
function initApp() {
  // Populate idea skills
  const sk = document.getElementById('idea-skills');
  const toShow = uSkills.includes('nothing') ? ['html','css','javascript'] : uSkills;
  sk.innerHTML = toShow.map(s => `<div class="chip on" data-s="${s}" onclick="this.classList.toggle('on')">${s.toUpperCase()}</div>`).join('');

  // Portfolio checklist
  renderPortfolioChecklist();
  // Interview questions
  renderInterviewQA();
  // Hosting options
  renderHosting('static');

  // First chat greeting
  const skillStr = uSkills.includes('nothing') ? 'abhi seekhna shuru kar raha hai' : uSkills.join(', ');
  const probMap = { idea:'project idea nahi milta', start:'shuru karna nahi aata', build:'code karna hai', github:'GitHub samajh nahi aata', host:'hosting nahi aati', debug:'errors fix nahi hoti', portfolio:'portfolio weak hai', interview:'interview ready nahi hun' };
  const firstMsg = `User ka naam: ${uName}\nSkills: ${skillStr}\nMain problem: ${probMap[uProblem] || uProblem}\nLanguage: ${uLang}\n\nUser aaya hai. Unhe warm greet karo by name, apna introduction do as START.exe (coding bhaiya), aur unki main problem pe focus karo. Short raho — 3-4 sentences max. Phir ek simple question pucho jo conversation shuru kare.`;
  aiCall(firstMsg, true);
}

/* ═══════════════ TABS ═══════════════ */
function goTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id==='panel-'+name));
}

/* ═══════════════ CHAT ═══════════════ */
function buildSystem() {
  const sl = uSkills.includes('nothing') ? 'no coding skills yet, total beginner' : uSkills.join(', ');
  const li = uLang === 'hinglish'
    ? `HINGLISH mein baat kar — Hindi + English natural mix. "Bhai", "yaar", "dekh", "ek kaam kar", "chill" use karo. Ekdum dost jaisi baat. Kabhi lecture mat dena.`
    : `Simple friendly English. Like a helpful senior friend. Short sentences. No jargon without explaining.`;
  return `You are START.exe — a warm, friendly senior coding brother who helps Indian college students go from zero to deploying real projects.

PERSONALITY: ${li}
- Never condescending. Always encouraging. If they're stuck, say "arre bhai normal hai, aisa sabke saath hota hai"
- Max 4-5 short paragraphs per response. No walls of text.
- Put ALL commands in code blocks
- End with next step or a question
- Use emojis naturally (not excessively)
- When referring to modules, say "Git Guide tab mein jao" or "Idea Generator use karo"

USER: ${uName} | Skills: ${sl} | Problem: ${uProblem} | Lang: ${uLang}

MODULES AVAILABLE (tell user to use these when relevant):
- 💡 Idea Generator — project ideas based on skills
- 🔨 Builder — breaks project into tasks
- 🐙 Git Guide — step by step git commands
- 🌐 Hosting — deploy guide
- 🐛 Debug — paste error get fix
- 📂 Portfolio Checker — GitHub profile analysis
- 💼 Interview Prep — project-based interview Qs

COVER ALL 7 PROBLEM AREAS:
1. Project ideas & breaking them down
2. Folder structure & project setup
3. Frontend-backend connection basics
4. Using APIs
5. Debugging mindset
6. Database basics
7. Git, GitHub, hosting, .env files, deployment errors
8. Portfolio building & interview prep
9. Mindset: fear of errors, perfectionism, consistency`;
}

function addMsg(role, text, qrs=[]) {
  const msgs = document.getElementById('chat-msgs');
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;

  const av = document.createElement('div');
  av.className = `av ${role === 'b' ? 'b' : 'u'}`;
  av.textContent = role === 'b' ? 'B' : (uName?.[0]?.toUpperCase() || 'U');

  const inner = document.createElement('div');
  inner.className = 'msg-inner';

  const who = document.createElement('div');
  who.className = 'msg-who';
  who.textContent = role === 'b' ? 'START.exe' : uName;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = fmtMsg(text);

  inner.appendChild(who);
  inner.appendChild(bubble);

  if (qrs.length) {
    const qrow = document.createElement('div');
    qrow.className = 'qr-row';
    qrs.forEach(r => {
      const chip = document.createElement('div');
      chip.className = 'qr';
      chip.textContent = r;
      chip.onclick = () => { document.getElementById('ci').value = r; chatSend(); qrow.remove(); };
      qrow.appendChild(chip);
    });
    inner.appendChild(qrow);
  }

  wrap.appendChild(av);
  wrap.appendChild(inner);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function fmtMsg(t) {
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre>$1</pre>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  t = t.replace(/\n/g, '<br>');
  return t;
}

function showTyping() {
  const msgs = document.getElementById('chat-msgs');
  const d = document.createElement('div');
  d.id = 'typing-ind';
  d.className = 'msg b typing-b';
  d.innerHTML = `<div class="av b">B</div><div class="typing-bubble"><div class="td"></div><div class="td"></div><div class="td"></div></div>`;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}
function hideTyping() { document.getElementById('typing-ind')?.remove(); }

async function aiCall(msg, isInit=false) {
  if (!isInit) chatHistory.push({ role:'user', content: msg });
  isBusy = true;
  document.getElementById('send-btn').disabled = true;
  showTyping();

  try {
    const res = await fetch('/api/start', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        system: buildSystem(),
        history: chatHistory.slice(-14),
        message: isInit ? msg : null,
        lang: uLang
      })
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Server error: ' + raw.slice(0,100)); }
    if (!res.ok) throw new Error(data?.error || 'Server error');
    hideTyping();
    chatHistory.push({ role:'assistant', content: data.reply });
    addMsg('b', data.reply, data.quickReplies || []);
  } catch(e) {
    hideTyping();
    addMsg('b', `Arre yaar, kuch error aayi 😅\n\`${e.message}\`\n\nThodi der baad try karo!`);
  } finally {
    isBusy = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('ci').focus();
  }
}

async function chatSend() {
  const ci = document.getElementById('ci');
  const msg = ci.value.trim();
  if (!msg || isBusy) return;
  ci.value = ''; chatResize(ci);
  addMsg('user', msg);
  await aiCall(msg);
}
function chatKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); chatSend(); } }
function chatResize(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,110)+'px'; }

/* ═══════════════ LANGUAGE ═══════════════ */
function setLang(l) {
  uLang = l;
  document.getElementById('lhi').classList.toggle('active', l==='hinglish');
  document.getElementById('len').classList.toggle('active', l==='english');
}

/* ═══════════════ AI HELPER (shared) ═══════════════ */
async function callAI(prompt) {
  const res = await fetch('/api/start', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ system: buildSystem(), history:[], message: prompt, lang: uLang })
  });
  const raw = await res.text();
  const data = JSON.parse(raw);
  if (!res.ok) throw new Error(data?.error || 'AI error');
  return data.reply || '';
}

function setLoading(btnId, outId, loading) {
  const btn = document.getElementById(btnId);
  const out = document.getElementById(outId);
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;
    out.innerHTML = '';
    out.classList.add('show');
  } else {
    btn.disabled = false;
  }
}

function fmtOutput(t) {
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre>$1</pre>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\n/g, '<br>');
  return t;
}

/* ═══════════════ IDEA GENERATOR ═══════════════ */
let ideaDiff = 'beginner', ideaCats = [];
function pickDiff(el) { document.querySelectorAll('[data-d]').forEach(c=>c.classList.remove('on')); el.classList.add('on'); ideaDiff=el.dataset.d; }
function toggleCat(el) { el.classList.toggle('on'); ideaCats = [...document.querySelectorAll('[data-c].on')].map(c=>c.dataset.c); }

async function genIdeas() {
  const skills = [...document.querySelectorAll('#idea-skills .chip.on')].map(c=>c.dataset.s);
  const cats = ideaCats.length ? ideaCats.join(', ') : 'any';
  const prompt = `Generate 4 unique project ideas for a ${ideaDiff} developer with skills: ${skills.join(', ')}. Category preference: ${cats}.
Language: ${uLang}.
For each idea give:
- Project name (creative)
- One line description
- Key features (3 bullet points)  
- Why it's good for portfolio
- Estimated time to build
Format as: NAME|DESCRIPTION|FEATURE1,FEATURE2,FEATURE3|WHY|TIME
One idea per line. 4 lines total. Nothing else.`;

  setLoading('idea-btn', 'idea-output', true);
  document.getElementById('idea-btn').innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;
  document.getElementById('idea-output').innerHTML = '';

  try {
    const reply = await callAI(prompt);
    document.getElementById('idea-btn').disabled = false;
    document.getElementById('idea-btn').innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Ideas';
    const lines = reply.split('\n').filter(l=>l.includes('|'));
    const out = document.getElementById('idea-output');
    lines.slice(0,4).forEach(line => {
      const [name,desc,feats,why,time] = line.split('|');
      if (!name) return;
      const card = document.createElement('div');
      card.className = 'idea-card';
      card.innerHTML = `
        <div class="idea-name"><i class="fa-solid fa-folder" style="color:var(--green);font-size:.75rem"></i>${name?.trim()}</div>
        <div class="idea-desc">${desc?.trim()}</div>
        <div class="idea-meta">
          ${(feats||'').split(',').map(f=>`<span class="badge green">${f.trim()}</span>`).join('')}
          ${time?`<span class="badge blue">⏱ ${time.trim()}</span>`:''}
        </div>
        ${why?`<div style="font-size:.72rem;color:var(--txt3);margin-top:.5rem;font-family:var(--fm)">📌 ${why.trim()}</div>`:''}
        <button class="action-btn outline" style="margin-top:.6rem;padding:.45rem 1rem;font-size:.72rem" onclick="useIdea('${name?.trim()}','${desc?.trim()}')">
          <i class="fa-solid fa-arrow-right"></i> Is idea pe kaam karo
        </button>`;
      out.appendChild(card);
    });
  } catch(e) {
    document.getElementById('idea-btn').disabled = false;
    document.getElementById('idea-btn').innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Ideas';
    document.getElementById('idea-output').innerHTML = `<div style="color:var(--red);font-size:.78rem;padding:.5rem">Error: ${e.message}</div>`;
  }
}

function useIdea(name, desc) {
  document.getElementById('build-input').value = `${name}: ${desc}`;
  goTab('builder');
  setTimeout(() => genBuilder(), 300);
}

/* ═══════════════ PROJECT BUILDER ═══════════════ */
let tasks = [];
async function genBuilder() {
  const idea = document.getElementById('build-input').value.trim();
  const tech = document.getElementById('build-tech').value.trim();
  if (!idea) { alert('Pehle project describe kar!'); return; }

  const prompt = `Break down this project into actionable tasks for a beginner developer.
Project: ${idea}
Tech: ${tech || 'not specified'}
Language: ${uLang}

Create a task list grouped by phases. Format:
PHASE:Phase Name
TASK:Task description|estimated time
(repeat for all tasks)

Make tasks very specific and beginner-friendly. 3-4 phases, 3-5 tasks each. Nothing else.`;

  setLoading('build-btn', 'build-output', true);
  document.getElementById('build-btn').innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  try {
    const reply = await callAI(prompt);
    document.getElementById('build-btn').disabled = false;
    document.getElementById('build-btn').innerHTML = '<i class="fa-solid fa-list-check"></i> Break it into Tasks';

    const out = document.getElementById('build-output');
    out.innerHTML = '';
    tasks = [];
    let phaseEl = null;
    let taskIdx = 0;

    reply.split('\n').forEach(line => {
      line = line.trim();
      if (line.startsWith('PHASE:')) {
        const ph = document.createElement('div');
        ph.style.cssText = 'margin-bottom:.3rem;margin-top:.8rem';
        ph.innerHTML = `<div class="label"><i class="fa-solid fa-layer-group"></i>${line.slice(6)}</div>`;
        out.appendChild(ph);
        phaseEl = ph;
      } else if (line.startsWith('TASK:')) {
        const [desc, time] = line.slice(5).split('|');
        const idx = taskIdx++;
        tasks.push({ desc: desc?.trim(), done: false });
        const item = document.createElement('div');
        item.className = 'task-item';
        item.id = `task-${idx}`;
        item.onclick = () => toggleTask(idx);
        item.innerHTML = `
          <div class="task-cb"><i class="fa-solid fa-check"></i></div>
          <div>
            <div class="task-text">${desc?.trim()}</div>
            ${time?`<div class="task-phase">${time.trim()}</div>`:''}
          </div>`;
        out.appendChild(item);
      }
    });

    if (!out.innerHTML) {
      out.innerHTML = `<div style="color:var(--txt2);font-size:.82rem;padding:.5rem">${fmtOutput(reply)}</div>`;
    }
    out.classList.add('show');

    // also chat about it
    addMsg('b', `✅ Maine "${idea}" ko tasks mein tod diya! **Builder tab** mein dekho aur ek ek task complete karte jao. Pehle task start karne mein help chahiye toh puchho! 🚀`);
    goTab('builder');
  } catch(e) {
    document.getElementById('build-btn').disabled = false;
    document.getElementById('build-btn').innerHTML = '<i class="fa-solid fa-list-check"></i> Break it into Tasks';
    document.getElementById('build-output').innerHTML = `<div style="color:var(--red);font-size:.78rem">${e.message}</div>`;
  }
}

function toggleTask(idx) {
  tasks[idx].done = !tasks[idx].done;
  document.getElementById(`task-${idx}`).classList.toggle('done', tasks[idx].done);
  const done = tasks.filter(t=>t.done).length;
  if (done === tasks.length && tasks.length > 0) {
    setTimeout(() => addMsg('b', `🎉 Waah bhai! Saare tasks done kar diye! Ab **Git Guide** tab mein jao aur isko GitHub pe push karo! 🚀`), 500);
    goTab('chat');
  }
}

/* ═══════════════ GIT GUIDE ═══════════════ */
function toggleStage(id) {
  document.getElementById(id).classList.toggle('open');
}
function copyCmd(el) {
  const text = el.querySelector('span').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const ic = el.querySelector('.copy-icon');
    ic.className = 'fa-solid fa-check copy-icon';
    ic.style.color = 'var(--green)';
    setTimeout(() => { ic.className = 'fa-regular fa-copy copy-icon'; ic.style.color=''; }, 1500);
  });
}

async function genReadme() {
  const name = document.getElementById('readme-name').value.trim();
  const desc = document.getElementById('readme-desc').value.trim();
  if (!name) { alert('Project name daalo!'); return; }
  const prompt = `Generate a clean, professional README.md for this project:
Name: ${name}
Description: ${desc}
Write a complete README with: title, description, features, installation steps, usage, tech stack, and author section. Use markdown formatting. Keep it concise but complete.`;

  setLoading('readme-btn', 'readme-out', true);
  document.getElementById('readme-btn').innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  try {
    const reply = await callAI(prompt);
    const out = document.getElementById('readme-out');
    out.innerHTML = `<pre style="white-space:pre-wrap;font-size:.72rem">${reply}</pre>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('readme-out').querySelector('pre').textContent)">
        <i class="fa-regular fa-copy"></i> Copy README
      </button>`;
    out.classList.add('show');
    document.getElementById('readme-btn').disabled = false;
    document.getElementById('readme-btn').innerHTML = '<i class="fa-solid fa-magic"></i> Generate README';
  } catch(e) {
    document.getElementById('readme-out').innerHTML = `<span style="color:var(--red)">${e.message}</span>`;
    document.getElementById('readme-btn').disabled = false;
    document.getElementById('readme-btn').innerHTML = '<i class="fa-solid fa-magic"></i> Generate README';
  }
}

/* ═══════════════ HOSTING ═══════════════ */
const hostingData = {
  static: [
    { name:'GitHub Pages', icon:'fa-brands fa-github', badge:'Free', color:'green', desc:'HTML/CSS/JS projects ke liye best. GitHub repo se directly deploy hota hai.',
      steps:['GitHub pe repo push karo', 'Repo Settings → Pages → Source: main branch', 'Save karo — 2-3 min mein live ho jaayega!', 'URL milega: username.github.io/repo-name'] },
    { name:'Netlify', icon:'fa-solid fa-n', badge:'Free', color:'blue', desc:'Drag & drop se deploy. Bahut easy. Custom domain bhi milta hai free mein.',
      steps:['netlify.com pe signup karo', '"New site from Git" ya folder drag & drop karo', 'Deploy hone do (1 min)', 'Random URL milega — custom domain baad mein add kar sakte ho'] },
    { name:'Vercel', icon:'fa-solid fa-triangle', badge:'Free', color:'purple', desc:'Fastest deployment. GitHub se connect karo — auto deploy on every push.',
      steps:['vercel.com pe signup (GitHub se)', '"New Project" → GitHub repo import karo', 'Framework: Other (for plain HTML)', 'Deploy karo — tera app live!'] },
  ],
  react: [
    { name:'Vercel', icon:'fa-solid fa-triangle', badge:'Recommended', color:'purple', desc:'React ke liye best. Zero config. Auto build aur deploy.',
      steps:['vercel.com → New Project → GitHub repo', 'Framework: Vite ya Create React App auto detect hoga', 'Deploy! Environment variables Settings mein daalo', 'Har git push pe auto redeploy hoga'] },
    { name:'Netlify', icon:'fa-solid fa-n', badge:'Free', color:'blue', desc:'React ke liye bhi achha kaam karta hai. Build command set karna padega.',
      steps:['netlify.com → New site from Git', 'Build command: npm run build', 'Publish directory: dist (Vite) ya build (CRA)', 'Deploy!'] },
  ],
  node: [
    { name:'Render', icon:'fa-solid fa-server', badge:'Free', color:'orange', desc:'Node.js backends ke liye best free option. Databases bhi host kar sakte ho.',
      steps:['render.com pe signup karo', '"New Web Service" → GitHub repo connect karo', 'Start command: node index.js ya npm start', 'Environment variables add karo (Dashboard → Environment)', 'Deploy!'] },
    { name:'Railway', icon:'fa-solid fa-train', badge:'Free Trial', color:'purple', desc:'Developer-friendly. Databases bhi saath mein milti hain.',
      steps:['railway.app pe signup karo', '"New Project" → Deploy from GitHub repo', 'Environment variables add karo', 'Auto deploys on every push'] },
  ],
  python: [
    { name:'Render', icon:'fa-solid fa-server', badge:'Free', color:'orange', desc:'Flask/Django dono ke liye kaam karta hai. Easy setup.',
      steps:['render.com → New Web Service', 'Build command: pip install -r requirements.txt', 'Start command: gunicorn app:app', 'Environment variables add karo'] },
    { name:'PythonAnywhere', icon:'fa-brands fa-python', badge:'Free', color:'blue', desc:'Python specific platform. Flask ke liye bahut easy.',
      steps:['pythonanywhere.com pe free account banao', 'Files upload karo ya Git clone karo', 'Web tab → Add new web app → Flask', 'WSGI file configure karo — done!'] },
  ],
  fullstack: [
    { name:'Vercel + Render', icon:'fa-solid fa-layer-group', badge:'Recommended', color:'green', desc:'Frontend Vercel pe, Backend Render pe. Best combo for free hosting.',
      steps:['Frontend (React/HTML) → Vercel pe deploy karo', 'Backend (Node/Python) → Render pe deploy karo', 'Frontend mein API URL environment variable mein daalo', 'CORS set karo backend mein allow your Vercel URL'] },
    { name:'Railway', icon:'fa-solid fa-train', badge:'Full Stack', color:'purple', desc:'Frontend aur backend dono ek jagah deploy kar sakte ho. Database bhi.',
      steps:['railway.app → New Project', 'Frontend aur backend ke liye alag services banao', 'Database (Postgres/MySQL) bhi add kar sakte ho', 'Internal networking se connect karo'] },
  ],
};

function pickHostType(el) {
  document.querySelectorAll('[data-ht]').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  renderHosting(el.dataset.ht);
}

function renderHosting(type) {
  const opts = hostingData[type] || hostingData.static;
  const div = document.getElementById('host-options');
  div.innerHTML = opts.map((h,i) => `
    <div class="host-card ${i===0?'active':''}" onclick="toggleHost(this)">
      <div class="host-name">
        <i class="fa-${h.icon.includes('fa-brands')?'brands':'solid'} ${h.icon.replace('fa-brands ','').replace('fa-solid ','')}"></i>
        ${h.name} <span class="badge ${h.color}">${h.badge}</span>
      </div>
      <div class="host-desc">${h.desc}</div>
      <div class="host-steps">
        ${h.steps.map((s,si)=>`<div class="step-box"><div class="step-num">${si+1}</div><div class="step-content">${s}</div></div>`).join('')}
      </div>
    </div>`).join('');
}

function toggleHost(el) {
  document.querySelectorAll('.host-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

/* ═══════════════ DEBUG HELPER ═══════════════ */
let errType = '';
function pickErr(el) { document.querySelectorAll('.error-chip').forEach(c=>c.classList.remove('on')); el.classList.add('on'); errType=el.dataset.e; }

async function debugIt() {
  const err = document.getElementById('err-input').value.trim();
  const code = document.getElementById('code-input').value.trim();
  if (!err) { alert('Error message paste karo pehle!'); return; }

  const prompt = `You are a debugging expert. A beginner student has this error:

Error type: ${errType || 'unknown'}
Error message: ${err}
${code ? `Relevant code:\n${code}` : ''}

In ${uLang === 'hinglish' ? 'Hinglish (friendly casual tone)' : 'simple English'}, provide:
1. What this error means (simply explain)
2. Why it happens (common cause)
3. Exact fix with code example
4. How to avoid it next time

Be specific, not generic. Max 5-6 short paragraphs.`;

  setLoading('debug-btn', 'debug-out', true);
  document.getElementById('debug-btn').innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  try {
    const reply = await callAI(prompt);
    const out = document.getElementById('debug-out');
    out.innerHTML = fmtOutput(reply) + `<br><button class="copy-btn" onclick="this.previousSibling.remove();chatWithDebug()"><i class="fa-solid fa-comments"></i> Bhaiya se aur puchho</button>`;
    out.classList.add('show');
    document.getElementById('debug-btn').disabled = false;
    document.getElementById('debug-btn').innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i> Fix Dhundo';
  } catch(e) {
    document.getElementById('debug-out').innerHTML = `<span style="color:var(--red)">${e.message}</span>`;
    document.getElementById('debug-btn').disabled = false;
    document.getElementById('debug-btn').innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i> Fix Dhundo';
  }
}

function chatWithDebug() {
  const err = document.getElementById('err-input').value.trim();
  document.getElementById('ci').value = `Mujhe ye error aa rahi hai: ${err.slice(0,200)}`;
  goTab('chat');
  chatSend();
}

/* ═══════════════ PORTFOLIO CHECKER ═══════════════ */
const portfolioChecks = [
  { id:'repos', label:'5+ public repositories', tip:'Kam se kam 5 public repos hone chahiye', weight:20 },
  { id:'readme', label:'Repos mein README files', tip:'Har repo mein README honi chahiye', weight:15 },
  { id:'pinned', label:'Top projects pinned', tip:'Best 6 repos pin karo profile pe', weight:10 },
  { id:'bio', label:'GitHub bio filled', tip:'Bio mein skills aur contact daalo', weight:10 },
  { id:'avatar', label:'Profile picture set', tip:'Professional photo ya avatar lagao', weight:5 },
  { id:'commits', label:'Regular commits (green graph)', tip:'Roz ya weekly commit karo', weight:15 },
  { id:'portfolio-site', label:'Portfolio website linked', tip:'GitHub profile mein website URL daalo', weight:15 },
  { id:'linkedin', label:'LinkedIn profile linked', tip:'Professional network banana zaroori hai', weight:10 },
];

function renderPortfolioChecklist() {
  const list = document.getElementById('check-list');
  list.innerHTML = portfolioChecks.map(c => `
    <div class="check-item" id="ci-${c.id}" onclick="toggleCheck('${c.id}')">
      <div class="check-left">
        <div class="check-icon"><i class="fa-solid fa-check"></i></div>
        <div>
          <div class="check-label">${c.label}</div>
          <div class="check-tip">${c.tip}</div>
        </div>
      </div>
      <span class="badge blue">${c.weight}%</span>
    </div>`).join('');
  updateScore();
}

function toggleCheck(id) {
  const el = document.getElementById('ci-'+id);
  el.classList.toggle('done');
  el.classList.toggle('miss', !el.classList.contains('done'));
  updateScore();
}

function updateScore() {
  const done = portfolioChecks.filter(c => document.getElementById('ci-'+c.id)?.classList.contains('done'));
  const score = done.reduce((s,c) => s+c.weight, 0);
  document.getElementById('score-val').textContent = score+'%';
  const offset = 201 - (201 * score/100);
  document.getElementById('score-arc').style.strokeDashoffset = offset;
  const arc = document.getElementById('score-arc');
  arc.style.stroke = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)';
}

async function checkPortfolio() {
  const user = document.getElementById('gh-user').value.trim();
  if (!user) { alert('GitHub username daalo!'); return; }

  setLoading('port-btn', 'portfolio-ai-out', true);
  document.getElementById('port-btn').innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  try {
    const r = await fetch(`https://api.github.com/users/${user}`);
    if (!r.ok) throw new Error('GitHub user nahi mila');
    const d = await r.json();
    const reposR = await fetch(`https://api.github.com/users/${user}/repos?per_page=100`);
    const repos = reposR.ok ? await reposR.json() : [];

    // Auto-check some items
    if (d.avatar_url && !d.avatar_url.includes('default')) document.getElementById('ci-avatar')?.classList.add('done');
    if (d.bio) document.getElementById('ci-bio')?.classList.add('done');
    if (d.blog) document.getElementById('ci-portfolio-site')?.classList.add('done');
    if (repos.length >= 5) document.getElementById('ci-repos')?.classList.add('done');
    if (repos.some(r=>r.has_projects)) document.getElementById('ci-pinned')?.classList.add('done');
    updateScore();

    const prompt = `Analyze this GitHub profile for a college student:
Username: ${user}
Bio: ${d.bio || 'none'}
Public repos: ${d.public_repos}
Followers: ${d.followers}
Website: ${d.blog || 'none'}
Top repos: ${repos.slice(0,5).map(r=>r.name).join(', ')}

In ${uLang === 'hinglish' ? 'Hinglish' : 'English'}, give:
1. Overall profile assessment (2-3 sentences)
2. Top 3 specific improvements to make RIGHT NOW
3. What recruiters will think when they see this
Keep it honest but encouraging. Max 3-4 short paragraphs.`;

    const reply = await callAI(prompt);
    const out = document.getElementById('portfolio-ai-out');
    out.innerHTML = fmtOutput(reply);
    out.classList.add('show');
    document.getElementById('port-btn').disabled = false;
    document.getElementById('port-btn').innerHTML = '<i class="fa-solid fa-search"></i> Check';
  } catch(e) {
    document.getElementById('portfolio-ai-out').innerHTML = `<span style="color:var(--red)">${e.message}</span>`;
    document.getElementById('portfolio-ai-out').classList.add('show');
    document.getElementById('port-btn').disabled = false;
    document.getElementById('port-btn').innerHTML = '<i class="fa-solid fa-search"></i> Check';
  }
}

/* ═══════════════ INTERVIEW PREP ═══════════════ */
const ivQA = [
  { q:'Tell me about a project you built', a:'Ek project choose karo — uska purpose, what problem it solves, what tech you used, aur kya interesting challenge aaya tha build karte time. Specific raho, generic mat bolo.' },
  { q:'Why did you choose this tech stack?', a:'Pehle kya alternatives the, unhe kyun nahi choose kiya, aur is stack ke advantages kya the tera use case ke liye — ye logic explain karo.' },
  { q:'What was the biggest challenge?', a:'Ek real problem batao — CORS error, API integration, state management — aur tum exactly kaise solve kiya. Google karke fix kiya bhi valid hai, bas process batao.' },
  { q:'How would you improve this project?', a:'Ye question batata hai tum apne kaam ko critically dekh sakte ho. Features jo add karna chahoge, performance improvements, better error handling — soch ke rakho.' },
  { q:"Explain your project's code structure", a:'Folders kaise organize kiye, frontend-backend separation kaisi hai, important files kya hain — agar GitHub pe README mein ye likha hai toh directly refer kar sakte ho.' },
  { q:'Did you work in a team? How did you use Git?', a:'Branching strategy, commit messages, pull requests — agar solo project bhi hai toh batao ki git history maintain karte the aur features branches pe karte the.' },
  { q:'How did you deploy it? Where is it hosted?', a:'Platform name batao (Vercel/Netlify/Render), deployment process briefly, aur live link share karo. Live projects = instant credibility.' },
  { q:"What would you do differently if you started over?", a:'Mature answer hai ye. Architecture decisions, over-engineering, tech choices jo better hoti — honest reflection shows growth mindset.' },
];

function renderInterviewQA() {
  const list = document.getElementById('iq-list');
  list.innerHTML = ivQA.map((qa,i) => `
    <div class="interview-qa" id="iq-${i}">
      <div class="iq-header" onclick="toggleIQ(${i})">
        <div class="iq-q">Q: ${qa.q}</div>
        <i class="fa-solid fa-chevron-down iq-chev"></i>
      </div>
      <div class="iq-body">${qa.a}</div>
    </div>`).join('');
}

function toggleIQ(i) {
  document.getElementById('iq-'+i).classList.toggle('open');
}

async function genInterview() {
  const proj = document.getElementById('iv-project').value.trim();
  if (!proj) { alert('Pehle apna project describe karo!'); return; }

  const prompt = `Generate 6 realistic technical interview questions for this project:
${proj}
Language: ${uLang}

For each question provide:
- The question an interviewer would ask
- How to answer it well (tips, what to include)
Format: Q: question here
A: answer tips here

Be specific to this project, not generic. Make questions progressively harder.`;

  setLoading('iv-btn', 'iv-out', true);
  document.getElementById('iv-btn').innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  try {
    const reply = await callAI(prompt);
    const out = document.getElementById('iv-out');
    out.innerHTML = fmtOutput(reply);
    out.classList.add('show');
    document.getElementById('iv-btn').disabled = false;
    document.getElementById('iv-btn').innerHTML = '<i class="fa-solid fa-comments"></i> Generate Questions';
  } catch(e) {
    document.getElementById('iv-out').innerHTML = `<span style="color:var(--red)">${e.message}</span>`;
    document.getElementById('iv-btn').disabled = false;
    document.getElementById('iv-btn').innerHTML = '<i class="fa-solid fa-comments"></i> Generate Questions';
  }
}
