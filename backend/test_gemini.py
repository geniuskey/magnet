"""Gemini API 직접 테스트 (google-genai 패키지)"""
import sys
sys.path.insert(0, '.')

from config import get_settings

settings = get_settings()
api_key = settings.gemini_api_key
model_name = settings.gemini_model

print(f"API Key: {api_key[:10]}..." if api_key else "API Key: None")
print(f"Model: {model_name}")

if not api_key:
    print("ERROR: GEMINI_API_KEY not set in .env")
    sys.exit(1)

try:
    from google import genai
    print("google-genai imported successfully")

    client = genai.Client(api_key=api_key)
    print("Client created")

    print("\n=== 스트리밍 테스트 ===")
    print("Response: ", end="", flush=True)

    for chunk in client.models.generate_content_stream(
        model=model_name,
        contents="회의실 예약 시스템에 대해 간단히 설명해줘. 3문장으로."
    ):
        if hasattr(chunk, "text") and chunk.text:
            print(chunk.text, end="", flush=True)

    print("\n\nSUCCESS!")

except Exception as e:
    print(f"\nERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
