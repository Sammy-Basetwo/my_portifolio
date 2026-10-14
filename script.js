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

/* ========== CONTACT FORM: opens the visitor's email app with the message filled in ========== */
const form = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

form.addEventListener("submit", e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  const subject = d.subject || `Message from ${d.first}`;
  const body = `${d.message}\n\nFrom: ${d.first} ${d.last}\nEmail: ${d.email}`;
  window.location.href = `mailto:mbithisama@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  formStatus.textContent = "Opening your email app to send the message...";
  form.reset();
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
      body: JSON.stringify({ messages: chatHistory })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    pending.textContent = data.reply;
    chatHistory.push({ role: "assistant", content: data.reply });
  } catch (err) {
    console.error("Chat error:", err); // press F12 > Console to see why it failed
    chatHistory.pop(); // drop the unanswered question
    pending.textContent = "Sorry, the assistant is unavailable right now. Please use the contact form below.";
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
