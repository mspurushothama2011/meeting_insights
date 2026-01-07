import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv(override=True)

from app.nlp_analyzer import NLPAnalyzer

def test_gemini_setup():
    print("🔍 Checking Gemini Configuration...")
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY is missing in .env")
        return
    
    if api_key.startswith("AIzaSy-your-actual-key"):
        print("❌ GEMINI_API_KEY is still the placeholder value!")
        print("   Please edit .env and paste your real API key.")
        return
        
    print(f"✅ GEMINI_API_KEY found (starts with {api_key[:6]}...)")
    
    print("\n🏗️ Initializing NLP Analyzer...")
    try:
        nlp = NLPAnalyzer()
        
        if nlp.gemini_client:
            print("✅ Gemini Client initialized successfully!")
            print(f"   Model: {nlp.gemini_model}")
            
            # Test a quick generation
            print("\n🧪 Testing Summarization with Gemini...")
            test_text = "The team met at 10 AM. Alice said she will fix the login bug by tomorrow. Bob agreed to test it."
            summary = nlp.summarize(test_text)
            print(f"   Input: {test_text}")
            print(f"   Summary: {summary}")
            
            if summary:
                 print("✅ Summarization test passed!")
            else:
                 print("⚠️ Summarization returned empty string.")
                 
        else:
            print("❌ Gemini Client FAILED to initialize (nlp.gemini_client is None).")
            if nlp.openai_client:
                print("   (It seems OpenAI client is active instead)")
            else:
                print("   (Neither OpenAI nor Gemini client is active - falling back to rule-based)")

    except Exception as e:
        print(f"❌ Error during initialization: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_gemini_setup()
