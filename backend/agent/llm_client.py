"""LLM API 클라이언트 - Anthropic, OpenAI, Gemini 지원"""

import json
from typing import Any, Optional
from enum import Enum

from config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class LLMProvider(str, Enum):
    """LLM 제공자"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"


class LLMClient:
    """통합 LLM API 클라이언트"""

    def __init__(self, provider: Optional[str] = None):
        self.provider = LLMProvider(provider or settings.llm_provider)
        self.model = settings.llm_model
        self.max_retries = 3

        # 제공자별 클라이언트 초기화
        if self.provider == LLMProvider.ANTHROPIC:
            self._init_anthropic()
        elif self.provider == LLMProvider.OPENAI:
            self._init_openai()
        elif self.provider == LLMProvider.GEMINI:
            self._init_gemini()

    def _init_anthropic(self):
        """Anthropic 클라이언트 초기화"""
        from anthropic import Anthropic
        self.client = Anthropic(api_key=settings.llm_api_key)
        if not self.model or self.model.startswith("gpt") or self.model.startswith("gemini"):
            self.model = "claude-sonnet-4-20250514"

    def _init_openai(self):
        """OpenAI 클라이언트 초기화"""
        from openai import OpenAI
        self.client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_api_url if settings.llm_api_url else None,
        )
        if not self.model or self.model.startswith("claude") or self.model.startswith("gemini"):
            self.model = "gpt-4o"

    def _init_gemini(self):
        """Gemini 클라이언트 초기화"""
        import google.generativeai as genai
        genai.configure(api_key=settings.llm_api_key)
        if not self.model or not self.model.startswith("gemini"):
            self.model = "gemini-1.5-pro"
        self.client = genai.GenerativeModel(self.model)

    async def chat(
        self,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        tool_choice: Optional[dict] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
    ) -> dict:
        """
        LLM과 대화

        Args:
            messages: 대화 메시지 목록
            tools: 사용 가능한 도구 목록
            tool_choice: 도구 선택 옵션
            system_prompt: 시스템 프롬프트
            max_tokens: 최대 응답 토큰 수

        Returns:
            LLM 응답
        """
        if self.provider == LLMProvider.ANTHROPIC:
            return await self._chat_anthropic(messages, tools, tool_choice, system_prompt, max_tokens)
        elif self.provider == LLMProvider.OPENAI:
            return await self._chat_openai(messages, tools, tool_choice, system_prompt, max_tokens)
        elif self.provider == LLMProvider.GEMINI:
            return await self._chat_gemini(messages, tools, tool_choice, system_prompt, max_tokens)

    async def _chat_anthropic(
        self,
        messages: list[dict],
        tools: Optional[list[dict]],
        tool_choice: Optional[dict],
        system_prompt: Optional[str],
        max_tokens: int,
    ) -> dict:
        """Anthropic API 호출"""
        from anthropic import APIError, RateLimitError

        for attempt in range(self.max_retries):
            try:
                kwargs = {
                    "model": self.model,
                    "max_tokens": max_tokens,
                    "messages": self._convert_messages_anthropic(messages),
                }

                if system_prompt:
                    kwargs["system"] = system_prompt

                if tools:
                    kwargs["tools"] = self._convert_tools_anthropic(tools)

                if tool_choice:
                    kwargs["tool_choice"] = tool_choice

                response = self.client.messages.create(**kwargs)
                return self._parse_response_anthropic(response)

            except RateLimitError:
                logger.warning(f"Rate limit hit, attempt {attempt + 1}/{self.max_retries}")
                if attempt == self.max_retries - 1:
                    raise
                import asyncio
                await asyncio.sleep(2 ** attempt)

            except APIError as e:
                logger.error(f"Anthropic API error: {str(e)}")
                raise

    async def _chat_openai(
        self,
        messages: list[dict],
        tools: Optional[list[dict]],
        tool_choice: Optional[dict],
        system_prompt: Optional[str],
        max_tokens: int,
    ) -> dict:
        """OpenAI API 호출"""
        from openai import APIError, RateLimitError

        for attempt in range(self.max_retries):
            try:
                # 메시지 변환
                openai_messages = self._convert_messages_openai(messages, system_prompt)

                kwargs = {
                    "model": self.model,
                    "max_tokens": max_tokens,
                    "messages": openai_messages,
                }

                if tools:
                    kwargs["tools"] = self._convert_tools_openai(tools)

                if tool_choice:
                    kwargs["tool_choice"] = "auto"

                response = self.client.chat.completions.create(**kwargs)
                return self._parse_response_openai(response)

            except RateLimitError:
                logger.warning(f"Rate limit hit, attempt {attempt + 1}/{self.max_retries}")
                if attempt == self.max_retries - 1:
                    raise
                import asyncio
                await asyncio.sleep(2 ** attempt)

            except APIError as e:
                logger.error(f"OpenAI API error: {str(e)}")
                raise

    async def _chat_gemini(
        self,
        messages: list[dict],
        tools: Optional[list[dict]],
        tool_choice: Optional[dict],
        system_prompt: Optional[str],
        max_tokens: int,
    ) -> dict:
        """Gemini API 호출"""
        import google.generativeai as genai

        for attempt in range(self.max_retries):
            try:
                # Gemini용 메시지 변환
                gemini_messages = self._convert_messages_gemini(messages, system_prompt)

                # 도구 설정
                gemini_tools = None
                if tools:
                    gemini_tools = self._convert_tools_gemini(tools)

                # 생성 설정
                generation_config = genai.GenerationConfig(
                    max_output_tokens=max_tokens,
                )

                # 채팅 세션 시작
                chat = self.client.start_chat(history=gemini_messages[:-1] if len(gemini_messages) > 1 else [])

                # 응답 생성
                if gemini_tools:
                    response = chat.send_message(
                        gemini_messages[-1]["parts"] if gemini_messages else "",
                        generation_config=generation_config,
                        tools=gemini_tools,
                    )
                else:
                    response = chat.send_message(
                        gemini_messages[-1]["parts"] if gemini_messages else "",
                        generation_config=generation_config,
                    )

                return self._parse_response_gemini(response)

            except Exception as e:
                logger.warning(f"Gemini API error, attempt {attempt + 1}/{self.max_retries}: {e}")
                if attempt == self.max_retries - 1:
                    raise
                import asyncio
                await asyncio.sleep(2 ** attempt)

    # Anthropic 변환 메서드
    def _convert_messages_anthropic(self, messages: list[dict]) -> list[dict]:
        """Anthropic용 메시지 변환"""
        converted = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "system":
                continue

            if role == "tool":
                converted.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": msg.get("tool_use_id", ""),
                            "content": content if isinstance(content, str) else json.dumps(content, ensure_ascii=False),
                        }
                    ],
                })
            else:
                converted.append({"role": role, "content": content})

        return converted

    def _convert_tools_anthropic(self, tools: list[dict]) -> list[dict]:
        """Anthropic용 도구 변환"""
        return [
            {
                "name": tool["name"],
                "description": tool["description"],
                "input_schema": tool.get("parameters", tool.get("input_schema", {})),
            }
            for tool in tools
        ]

    def _parse_response_anthropic(self, response) -> dict:
        """Anthropic 응답 파싱"""
        result = {"content": "", "tool_calls": [], "stop_reason": response.stop_reason}

        for block in response.content:
            if block.type == "text":
                result["content"] += block.text
            elif block.type == "tool_use":
                result["tool_calls"].append({
                    "id": block.id,
                    "name": block.name,
                    "arguments": block.input,
                })

        return result

    # OpenAI 변환 메서드
    def _convert_messages_openai(self, messages: list[dict], system_prompt: Optional[str]) -> list[dict]:
        """OpenAI용 메시지 변환"""
        converted = []

        if system_prompt:
            converted.append({"role": "system", "content": system_prompt})

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "tool":
                converted.append({
                    "role": "tool",
                    "tool_call_id": msg.get("tool_use_id", ""),
                    "content": content if isinstance(content, str) else json.dumps(content, ensure_ascii=False),
                })
            elif role != "system":
                converted.append({"role": role, "content": content})

        return converted

    def _convert_tools_openai(self, tools: list[dict]) -> list[dict]:
        """OpenAI용 도구 변환"""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool.get("parameters", {}),
                },
            }
            for tool in tools
        ]

    def _parse_response_openai(self, response) -> dict:
        """OpenAI 응답 파싱"""
        message = response.choices[0].message
        result = {
            "content": message.content or "",
            "tool_calls": [],
            "stop_reason": response.choices[0].finish_reason,
        }

        if message.tool_calls:
            for tc in message.tool_calls:
                result["tool_calls"].append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments),
                })

        return result

    # Gemini 변환 메서드
    def _convert_messages_gemini(self, messages: list[dict], system_prompt: Optional[str]) -> list[dict]:
        """Gemini용 메시지 변환"""
        converted = []

        # 시스템 프롬프트를 첫 사용자 메시지에 포함
        system_prefix = f"{system_prompt}\n\n" if system_prompt else ""

        for i, msg in enumerate(messages):
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "system":
                continue
            elif role == "assistant":
                converted.append({"role": "model", "parts": content})
            elif role == "tool":
                # Gemini에서는 function response로 처리
                converted.append({
                    "role": "function",
                    "parts": content if isinstance(content, str) else json.dumps(content, ensure_ascii=False),
                })
            else:
                # 첫 번째 사용자 메시지에 시스템 프롬프트 추가
                if i == 0 or (i == 1 and messages[0].get("role") == "system"):
                    converted.append({"role": "user", "parts": system_prefix + content})
                    system_prefix = ""
                else:
                    converted.append({"role": "user", "parts": content})

        return converted

    def _convert_tools_gemini(self, tools: list[dict]) -> list:
        """Gemini용 도구 변환"""
        import google.generativeai as genai

        function_declarations = []
        for tool in tools:
            function_declarations.append(genai.protos.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        k: genai.protos.Schema(type=genai.protos.Type.STRING)
                        for k in tool.get("parameters", {}).get("properties", {}).keys()
                    },
                    required=tool.get("parameters", {}).get("required", []),
                ),
            ))

        return [genai.protos.Tool(function_declarations=function_declarations)]

    def _parse_response_gemini(self, response) -> dict:
        """Gemini 응답 파싱"""
        result = {"content": "", "tool_calls": [], "stop_reason": "end_turn"}

        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, "text"):
                    result["content"] += part.text
                elif hasattr(part, "function_call"):
                    fc = part.function_call
                    result["tool_calls"].append({
                        "id": f"call_{hash(fc.name)}",
                        "name": fc.name,
                        "arguments": dict(fc.args),
                    })
                    result["stop_reason"] = "tool_use"

        return result


class MockLLMClient:
    """테스트용 Mock LLM 클라이언트"""

    def __init__(self):
        self.responses = []
        self.call_count = 0

    def add_response(self, response: dict):
        """Mock 응답 추가"""
        self.responses.append(response)

    async def chat(
        self,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        tool_choice: Optional[dict] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
    ) -> dict:
        """Mock 대화"""
        if self.responses:
            response = self.responses[self.call_count % len(self.responses)]
            self.call_count += 1
            return response

        last_message = messages[-1].get("content", "") if messages else ""

        if "회의" in last_message and ("잡아" in last_message or "예약" in last_message):
            return {
                "content": "",
                "tool_calls": [
                    {
                        "id": "tool_001",
                        "name": "search_employee",
                        "arguments": {"query": "김철수"},
                    }
                ],
                "stop_reason": "tool_use",
            }

        return {
            "content": "안녕하세요! 회의 일정 조율을 도와드릴게요. 어떤 회의를 잡으시겠어요?",
            "tool_calls": [],
            "stop_reason": "end_turn",
        }
