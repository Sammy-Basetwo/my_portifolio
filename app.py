import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)

# Sites allowed to call this API (override with ALLOWED_ORIGINS in .env)
origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:58228,http://127.0.0.1:58228"
).split(",")
CORS(app, origins=origins)

# Spam / bill protection (storage_uri removes the in-memory warning)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day"],
    storage_uri="memory://"
)

# Create the Gemini client (20-second timeout, value is in milliseconds)
api_key = os.getenv("GEMINI_API_KEY")
client = None
if api_key:
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=20000)
    )
else:
    print("WARNING: GEMINI_API_KEY is missing from your .env file!")

# This alias always points to Google's current Flash model
MODEL = "gemini-flash-latest"

SYSTEM_PROMPT = """You are the assistant on the portfolio website of Sammy K. (Basetwo).
Answer visitors' questions about Sammy, using only the facts below.

About Sammy:
- Web developer with a computer science background, building clean, responsive web experiences.
- Tech stack: Python, Java, JavaScript, HTML, CSS.
- Interests: photography, coding, and coffee.
- Contact: email mbithisama@gmail.com, WhatsApp 0758 991 866, YouTube https://youtube.com/@YOUR_CHANNEL

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

    # Keep the last 8 messages, trimmed to 500 characters each
    contents = []
    for m in data.get("messages", [])[-8:]:
        role = "user" if m.get("role") == "user" else "model"
        text = str(m.get("content", ""))[:500].strip()
        if text:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))

    if not contents or contents[-1].role != "user":
        return jsonify(error="Please send a question."), 400

    if client is None:
        return jsonify(error="The assistant is not configured."), 503

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=400
            )
        )
        return jsonify(reply=response.text)

    except Exception as e:
        # The exact reason prints in your terminal
        print(f"Server-Side Error: {e}")
        return jsonify(error="The assistant is unavailable right now."), 502


if __name__ == "__main__":
    app.run(port=5000, debug=True)