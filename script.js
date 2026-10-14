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
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
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
      ? "Sorry, that took too long. Please try again or use the contact form below."
      : "Sorry, the assistant is unavailable right now. Please use the contact form below.";
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

/* ========== THEME SWITCH: blue & light green <-> green, remembered in the browser ========== */
const themeBtn = document.getElementById("theme-toggle");
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "blue" ? "green" : "blue";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
});