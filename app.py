"""Backend for the "Ask My AI" box. Keeps the API key on the server, never in the browser."""
import os

from anthropic import Anthropic
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()  # reads ANTHROPIC_API_KEY from the .env file

app = Flask(__name__)

# Only your own website may call this API (add your live site URL in .env)
origins = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500").split(",")
CORS(app, origins=origins)

# Protects your bill: limits how often one visitor can ask
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day"])

client = Anthropic()  # picks up ANTHROPIC_API_KEY automatically
MODEL = "claude-haiku-4-5-20251001"  # fast and cheap, good for a chat box

# ========== EDIT THIS: everything the AI knows about you ==========
SYSTEM_PROMPT = """You are the assistant on the portfolio website of Sammy K. (Basetwo).
Answer visitors' questions about Sammy, using only the facts below.

About Sammy:
- Web developer with a computer science background, building clean, responsive web experiences.
- Tech stack: Python, Java, JavaScript, HTML, CSS.
- Interests: photography, coding, and coffee.
- Projects: (add your projects here, one line each)
- Contact: email mbithisama@gmail.com, WhatsApp 0758 991 866, YouTube youtube.com/@sammybase2.

Rules:
- Be friendly and keep answers short (2-4 sentences).
- If the answer is not in the facts above, say you don't know and suggest contacting Sammy.
- Never invent projects, jobs, skills or prices.
- Politely decline questions unrelated to Sammy or his work.
"""


@app.post("/api/chat")
@limiter.limit("10 per minute")
def chat():
    data = request.get_json(silent=True) or {}

    # Keep only the last few valid messages, each capped in length
    messages = []
    for m in data.get("messages", [])[-8:]:
        role, content = m.get("role"), str(m.get("content", ""))[:500].strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    while messages and messages[0]["role"] != "user":
        messages.pop(0)  # a conversation must start with the visitor
    if not messages or messages[-1]["role"] != "user":
        return jsonify(error="Please send a question."), 400

    try:
        response = client.messages.create(
            model=MODEL, max_tokens=300, system=SYSTEM_PROMPT, messages=messages
        )
        return jsonify(reply=response.content[0].text)
    except Exception:
        return jsonify(error="The assistant is unavailable right now."), 502


if __name__ == "__main__":
    app.run(port=5000, debug=True)
