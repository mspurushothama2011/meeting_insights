
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env variables
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ Error: GEMINI_API_KEY not found in environment variables.")
    exit(1)


print(f"API Key found: {api_key[:5]}...{api_key[-5:]}")

# Configure
genai.configure(api_key=api_key)

print("\nListing available models...")
try:
    found_flash = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f" - {m.name}")
            if "gemini-1.5-flash" in m.name:
                found_flash = True
except Exception as e:
    print(f"Error listing models: {e}")

print("\nTesting generation with 'gemini-flash-latest'...")
try:
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content("Hello, can you confirm you are working?")
    print(f"Success! Response: {response.text}")
except Exception as e:
    print(f"Error with gemini-flash-latest: {e}")

print("\nTesting generation with 'gemini-2.0-flash-exp'...")
try:
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    response = model.generate_content("Hello, are you working?")
    print(f"Success! Response: {response.text}")
except Exception as e:
    print(f"Error with gemini-2.0-flash-exp: {e}")
