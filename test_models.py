import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
key = (os.getenv("GEMINI_API_KEY") or "").strip().strip('"').strip("'")
client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=15000))

CANDIDATES = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemma-4-26b-a4b-it",
    "gemma-4-31b-it",
]

print("Testing each model with a tiny request...\n")
for name in CANDIDATES:
    start = time.time()
    try:
        r = client.models.generate_content(
            model=name,
            contents="Reply with just the word: ok",
            config=types.GenerateContentConfig(max_output_tokens=20),
        )
        print(f"WORKS  {name:30} {time.time() - start:4.1f}s  -> {(r.text or '').strip()[:30]}")
    except Exception as e:
        msg = str(e).replace("\n", " ")[:70]
        print(f"FAILS  {name:30} {time.time() - start:4.1f}s  -> {msg}")