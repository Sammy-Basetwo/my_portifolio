import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Use the explicit package path to bypass your PyCharm environment conflict
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)

# Dynamically updates to match your local browser port (58228) from your screenshot
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:58228,http://127.0.0.1:58228").split(",")
CORS(app, origins=origins)

# Spambot wallet protection
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day"])

# Configure Gemini using your API key from the .env file
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Using Google's highly efficient, free-tier optimized model
MODEL = "gemini-1.5-flash"

SYSTEM_PROMPT = """You are the assistant on the portfolio website of Sammy K. (Basetwo).
Answer visitors' questions about Sammy, using only the facts below.

About Sammy:
- Web developer with a computer science background, building clean, responsive web experiences.
- Tech stack: Python, Java, JavaScript, HTML, CSS.
- Interests: photography, coding, and coffee.
- Contact: email mbithisama@gmail.com, WhatsApp 0758 991 866, YouTube ://youtube.com.

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

    # Format conversation history into the structured layout required by this SDK
    messages = []
    for m in data.get("messages", [])[-8:]:
        role = "user" if m.get("role") == "user" else "model"
        content = str(m.get("content", ""))[:500].strip()
        if content:
            messages.append({"role": role, "parts": [content]})

    if not messages or messages[-1]["role"] != "user":
        return jsonify(error="Please send a question."), 400

    try:
        # Initialize the model container injecting the system instructions
        model = genai.GenerativeModel(
            model_name=MODEL,
            system_instruction=SYSTEM_PROMPT
        )

        # Fire request directly to Google's endpoints
        response = model.generate_content(messages)

        return jsonify(reply=response.text)

    except Exception as e:
        # This will output exact diagnostic descriptions to your PyCharm console if a connection breaks
        print(f"Server-Side Error: {e}")
        return jsonify(error="The assistant is unavailable right now."), 502


if __name__ == "__main__":
    app.run(port=5000, debug=True)
