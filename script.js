/* ========== PROJECTS: edit this list to add your own ========== */
// image: path to a screenshot (e.g. "images/project1.jpg"), leave "" for none
// link: live site or GitHub repo, leave "" to hide the link
const projects = [
  {
    title: "Project name",
    description: "One or two sentences on what it does and the problem it solves.",
    tags: ["HTML", "CSS", "JavaScript"],
    image: "",
    link: ""
  },
  {
    title: "Another project",
    description: "Replace this with your next project. Delete any entries you don't need.",
    tags: ["Python"],
    image: "",
    link: ""
  }
];

/* ========== HELPER: build elements safely (text is never read as HTML) ========== */
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

/* ========== RENDER PROJECTS ========== */
const grid = document.getElementById("project-grid");

projects.forEach(({ title, description, tags, image, link }) => {
  const card = el("article", "project");

  if (image) {
    const shot = el("div", "photo");
    const img = document.createElement("img");
    img.src = image;
    img.alt = `Screenshot of ${title}`;
    img.loading = "lazy";
    shot.append(img);
    card.append(shot);
  }

  const body = el("div", "project-body");
  body.append(el("h3", "", title), el("p", "", description));

  const list = el("ul", "chips");
  tags.forEach(tag => list.append(el("li", "", tag)));
  body.append(list);

  if (link) {
    const a = el("a", "", "View project");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
    a.append(el("i", "fa-solid fa-arrow-up-right-from-square"));
    body.append(a);
  }

  card.append(body);
  grid.append(card);
});

/* ========== NAV: highlight the section being viewed ========== */
const navLinks = document.querySelectorAll(".site-header nav a");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const current = entry.target.dataset.nav || entry.target.id;
    navLinks.forEach(a => { if (a.id !== "nav-ask") a.classList.toggle("active", a.getAttribute("href") === `#${current}`); });
  });
}, { rootMargin: "-40% 0px -55% 0px" });

document.querySelectorAll("main > section[id]").forEach(s => observer.observe(s));

/* ========== CONTACT FORM ========== */
// Free key from https://web3forms.com (enter your email, the key is sent to your inbox).
// It is safe to keep in this file: it can only send mail to YOUR address.
const WEB3FORMS_KEY = "09918a4e-6fc8-42eb-a65e-162de3abb499";

const form = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

// Sends through Web3Forms (works on GitHub Pages, no backend needed)
async function sendViaWeb3Forms(d) {
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `[Portfolio] ${d.subject || "Message from " + d.first}`,
      from_name: "Portfolio contact form",
      name: `${d.first} ${d.last || ""}`.trim(),
      email: d.email,          // so pressing Reply goes to the visitor
      message: d.message
    }),
    signal: AbortSignal.timeout(20000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || `Error ${res.status}`);
}

// Sends through your own Flask backend (/api/contact, Gmail SMTP)
async function sendViaBackend(d) {
  const res = await fetch(API_URL.replace(/\/chat$/, "/contact"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
    signal: AbortSignal.timeout(20000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const d = Object.fromEntries(new FormData(form));

  // Hidden spam-trap field: bots fill it in, people never see it
  if (d.website) { form.reset(); return; }

  btn.disabled = true;
  formStatus.textContent = "Sending...";

  try {
    if (WEB3FORMS_KEY && !WEB3FORMS_KEY.startsWith("PASTE_")) await sendViaWeb3Forms(d);
    else await sendViaBackend(d);
    formStatus.textContent = "Thank you! Your message was sent. I'll reply soon.";
    form.reset();
  } catch (err) {
    console.error("Contact form error:", err); // press F12 > Console to see why it failed
    // Backup so the message isn't lost: open the visitor's email app instead
    const subject = d.subject || `Message from ${d.first}`;
    const body = `${d.message}\n\nFrom: ${d.first} ${d.last}\nEmail: ${d.email}`;
    formStatus.textContent = `Couldn't send it directly (${err.message}). Opening your email app instead...`;
    await new Promise(r => setTimeout(r, 4000)); // leave time to read the reason
    window.location.href = `mailto:mbithisama@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  btn.disabled = false;
});

/* ========== ASK MY AI ========== */
// Address of your backend: localhost while testing, your deployed URL when live
const API_URL = "http://127.0.0.1:5000/api/chat";

const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatHistory = []; // conversation sent to the backend each time

const addMsg = (text, who) => {
  const msg = el("p", `msg ${who}`, text);
  chatLog.append(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
  return msg;
};

async function ask(question) {
  document.getElementById("chat-suggest").hidden = true; // suggestions are only needed at the start
  addMsg(question, "user");
  chatHistory.push({ role: "user", content: question });
  const pending = addMsg("Thinking...", "bot pending");
  chatInput.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
      signal: AbortSignal.timeout(25000) // give up after 25 seconds
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    pending.textContent = data.reply;
    chatHistory.push({ role: "assistant", content: data.reply });
  } catch (err) {
    console.error("Chat error:", err); // press F12 > Console to see why it failed
    chatHistory.pop(); // drop the unanswered question
    pending.textContent = err.name === "TimeoutError"
      ? "Sorry, that took too long. Please try again or use the contact form in the Contact section."
      : "Sorry, the assistant is unavailable right now. Please use the contact form in the Contact section.";
  }

  pending.classList.remove("pending");
  chatInput.disabled = false;
  chatInput.focus();
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;
  chatInput.value = "";
  ask(question);
});

// Suggested questions fill and send in one click
document.querySelectorAll("#chat-suggest button").forEach(btn =>
  btn.addEventListener("click", () => ask(btn.textContent)));

/* ========== ASK AI WIDGET: open, close and resize ========== */
const aiWidget = document.getElementById("ai-widget");
const aiPanel = document.getElementById("ai-panel");
const aiLauncher = document.getElementById("ai-launcher");
const aiResize = document.getElementById("ai-resize");
const aiClose = document.getElementById("ai-close");
const navAsk = document.getElementById("nav-ask");

function setAI(open) {
  aiWidget.classList.toggle("open", open);
  aiLauncher.setAttribute("aria-expanded", String(open));
  aiPanel.setAttribute("aria-hidden", String(!open));
  navAsk.classList.toggle("active", open);
  if (open) setTimeout(() => chatInput.focus(), 260);
  else setTimeout(() => aiLauncher.focus(), 260);
}

aiLauncher.addEventListener("click", () => setAI(true));
aiClose.addEventListener("click", () => setAI(false));
navAsk.addEventListener("click", e => { e.preventDefault(); setAI(true); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && aiWidget.classList.contains("open")) setAI(false); });

// Expand / shrink the chat window
aiResize.addEventListener("click", () => {
  const large = aiPanel.classList.toggle("large");
  aiResize.querySelector("i").className = large ? "fa-solid fa-compress" : "fa-solid fa-expand";
  aiResize.setAttribute("aria-label", large ? "Shrink chat" : "Expand chat");
  aiResize.title = large ? "Shrink chat" : "Expand chat";
  chatLog.scrollTop = chatLog.scrollHeight;
});

/* ========== FADE-IN when a section scrolls into view ========== */
const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in");
    obs.unobserve(entry.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(node => revealObserver.observe(node));

/* ========== BACKGROUND LINES: appear while you scroll, fade out slowly after you stop ========== */
(() => {
  const canvas = document.getElementById("bg-lines");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");

  const WAVES = 30;        // number of flowing lines across the screen
  const CROSS = 20;        // number of crossing lines (makes the pattern more complex)
  const STEP = 16;         // smaller = smoother curves, but more work
  const FADE = 0.972;      // closer to 1 = lines fade out more slowly after you stop

  let W = 0, H = 0, dpr = 1, color = "37, 99, 235";
  let intensity = 0, running = false, lastFrame = 0;
  let lastScrollY = window.scrollY, lastScrollT = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (intensity < 0.01) return;
    const p = window.scrollY * 0.0035;   // the pattern moves with your scrolling
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgb(${color})`;

    for (let i = 0; i < WAVES; i++) {      // horizontal flowing lines
      const base = (i / (WAVES - 1)) * H;
      ctx.globalAlpha = intensity * (0.14 + 0.3 * ((i * 7) % 5) / 4);
      ctx.beginPath();
      for (let x = 0; x <= W + STEP; x += STEP) {
        const y = base + 38 * Math.sin(x * 0.006 + i * 0.45 + p) + 22 * Math.sin(x * 0.013 - i * 0.3 - p * 1.6) + 14 * Math.sin(x * 0.0027 + i * 0.9 + p * 0.6);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < CROSS; i++) {      // vertical crossing lines
      const base = (i / (CROSS - 1)) * W;
      ctx.globalAlpha = intensity * (0.1 + 0.2 * ((i * 3) % 4) / 3);
      ctx.beginPath();
      for (let y = 0; y <= H + STEP; y += STEP) {
        const x = base + 34 * Math.sin(y * 0.007 + i * 0.5 - p * 1.2) + 20 * Math.sin(y * 0.015 + i * 0.3 + p);
        y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.max(now - lastFrame, 1);
    lastFrame = now;
    intensity *= Math.pow(FADE, dt / 16.7);          // slow fade after you release
    draw();
    if (intensity > 0.01) requestAnimationFrame(frame);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  window.addEventListener("scroll", () => {
    const now = performance.now();
    const dy = Math.abs(window.scrollY - lastScrollY);
    const dt = Math.min(Math.max(now - lastScrollT, 4), 50);
    lastScrollY = window.scrollY; lastScrollT = now;
    const speed = dy / dt;                            // pixels per millisecond
    intensity = Math.max(intensity, Math.min(1, Math.sqrt(speed / 1.5)));   // faster scroll = stronger lines
    if (!running) {
      running = true;
      lastFrame = now;
      color = getComputedStyle(document.documentElement).getPropertyValue("--lines-rgb").trim() || color;
      requestAnimationFrame(frame);
    }
  }, { passive: true });

  window.addEventListener("resize", resize);
  resize();
})();

/* ========== THEME SWITCH: blue & light green <-> green, remembered in the browser ========== */
const themeBtn = document.getElementById("theme-toggle");
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "blue" ? "green" : "blue";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
});