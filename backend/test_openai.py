"""OpenAI API 직접 테스트"""
import sys
sys.path.insert(0, '.')

from config import get_settings

settings = get_settings()
api_key = settings.openai_api_key
model_name = settings.openai_model

print(f"API Key: {api_key[:10]}..." if api_key else "API Key: None")
print(f"Model: {model_name}")

if not api_key:
    print("ERROR: OPENAI_API_KEY not set in .env")
    sys.exit(1)

try:
    from openai import OpenAI
    print("openai imported successfully")

    client = OpenAI(api_key=api_key)
    print("Client created")

    print("\n=== 스트리밍 테스트 ===")
    print("Response: ", end="", flush=True)

    stream = client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": "회의실 예약 시스템에 대해 간단히 설명해줘. 3문장으로."}],
        max_completion_tokens=1024,
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)

    print("\n\nSUCCESS!")

except Exception as e:
    print(f"\nERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
