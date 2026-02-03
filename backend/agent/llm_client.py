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
    LITELLM = "litellm"
    CUSTOM = "custom"


class LLMClient:
    """통합 LLM API 클라이언트"""

    def __init__(self, provider: Optional[str] = None):
        self.provider = LLMProvider(provider or settings.llm_provider)
        self.max_retries = 3

        # 제공자별 클라이언트 초기화
        if self.provider == LLMProvider.ANTHROPIC:
            self._init_anthropic()
        elif self.provider == LLMProvider.OPENAI:
            self._init_openai()
        elif self.provider == LLMProvider.GEMINI:
            self._init_gemini()
        elif self.provider == LLMProvider.LITELLM:
            self._init_litellm()
        elif self.provider == LLMProvider.CUSTOM:
            self._init_custom()

    def _init_anthropic(self):
        """Anthropic 클라이언트 초기화"""
        from anthropic import Anthropic
        base_url = settings.anthropic_api_url or None
        self.client = Anthropic(
            api_key=settings.get_api_key("anthropic"),
            base_url=base_url,
        )
        self.model = settings.get_model("anthropic")

    def _init_openai(self):
        """OpenAI 클라이언트 초기화"""
        from openai import OpenAI
        base_url = settings.openai_api_url or None
        self.client = OpenAI(
            api_key=settings.get_api_key("openai"),
            base_url=base_url,
        )
        self.model = settings.get_model("openai")

    def _init_gemini(self):
        """Gemini 클라이언트 초기화 (google-genai 패키지)"""
        from google import genai
        self.client = genai.Client(api_key=settings.get_api_key("gemini"))
        self.model = settings.get_model("gemini")

    def _init_litellm(self):
        """LiteLLM 클라이언트 초기화"""
        import litellm
        self.client = litellm
        self.model = settings.litellm_model
        self.api_key = settings.litellm_api_key
        self.api_base = settings.litellm_api_base

        # LiteLLM 설정
        if self.api_key:
            litellm.api_key = self.api_key
        if self.api_base:
            litellm.api_base = self.api_base

    def _init_custom(self):
        """Custom LLM 클라이언트 초기화 (OpenAI 호환 API, httpx 사용)"""
        import httpx
        self.base_url = settings.custom_api_url.rstrip("/")
        self.api_key = settings.custom_api_key
        self.model = settings.custom_model
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=120.0,
            headers={
                "Content-Type": "application/json",
                **({"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}),
            },
        )

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
        elif self.provider == LLMProvider.LITELLM:
            return await self._chat_litellm(messages, tools, tool_choice, system_prompt, max_tokens)
        elif self.provider == LLMProvider.CUSTOM:
            return await self._chat_custom(messages, tools, tool_choice, system_prompt, max_tokens)

    async def chat_stream(
        self,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        tool_choice: Optional[dict] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
    ):
        """
        LLM 스트리밍 대화

        Yields:
            str: 응답 텍스트 청크
        """
        if self.provider == LLMProvider.ANTHROPIC:
            async for chunk in self._chat_stream_anthropic(messages, tools, tool_choice, system_prompt, max_tokens):
                yield chunk
        elif self.provider == LLMProvider.OPENAI:
            async for chunk in self._chat_stream_openai(messages, tools, tool_choice, system_prompt, max_tokens):
                yield chunk
        elif self.provider == LLMProvider.GEMINI:
            async for chunk in self._chat_stream_gemini(messages, tools, tool_choice, system_prompt, max_tokens):
                yield chunk
        elif self.provider == LLMProvider.LITELLM:
            async for chunk in self._chat_stream_litellm(messages, tools, tool_choice, system_prompt, max_tokens):
                yield chunk
        elif self.provider == LLMProvider.CUSTOM:
            async for chunk in self._chat_stream_custom(messages, tools, tool_choice, system_prompt, max_tokens):
                yield chunk

    async def _chat_stream_anthropic(self, messages, tools, tool_choice, system_prompt, max_tokens):
        """Anthropic 스트리밍 API 호출"""
        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": self._convert_messages_anthropic(messages),
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if tools:
            kwargs["tools"] = self._convert_tools_anthropic(tools)

        with self.client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                yield text

    async def _chat_stream_openai(self, messages, tools, tool_choice, system_prompt, max_tokens):
        """OpenAI 스트리밍 API 호출"""
        openai_messages = self._convert_messages_openai(messages, system_prompt)
        kwargs = {
            "model": self.model,
            "max_completion_tokens": max_tokens,  # 새 모델은 max_completion_tokens 사용
            "messages": openai_messages,
            "stream": True,
        }
        if tools:
            kwargs["tools"] = self._convert_tools_openai(tools)

        stream = self.client.chat.completions.create(**kwargs)
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def _chat_stream_gemini(self, messages, tools, tool_choice, system_prompt, max_tokens):
        """Gemini 스트리밍 API 호출 (google-genai 패키지)"""
        from google.genai import types

        gemini_contents = self._convert_messages_gemini(messages, system_prompt)

        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            system_instruction=system_prompt if system_prompt else None,
        )

        if tools:
            config.tools = self._convert_tools_gemini(tools)

        # 스트리밍 응답
        for chunk in self.client.models.generate_content_stream(
            model=self.model,
            contents=gemini_contents,
            config=config,
        ):
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text

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
                    "max_completion_tokens": max_tokens,  # 새 모델은 max_completion_tokens 사용
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
        """Gemini API 호출 (google-genai 패키지)"""
        from google.genai import types

        for attempt in range(self.max_retries):
            try:
                # Gemini용 메시지 변환
                gemini_contents = self._convert_messages_gemini(messages, system_prompt)

                # 생성 설정
                config = types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    system_instruction=system_prompt if system_prompt else None,
                )

                # 도구 설정
                if tools:
                    config.tools = self._convert_tools_gemini(tools)

                # 응답 생성
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=gemini_contents,
                    config=config,
                )

                return self._parse_response_gemini(response)

            except Exception as e:
                logger.error(f"Gemini API error, attempt {attempt + 1}/{self.max_retries}: {type(e).__name__}: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
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
    def _convert_messages_gemini(self, messages: list[dict], system_prompt: Optional[str]) -> list:
        """Gemini용 메시지 변환 (google-genai 패키지)"""
        from google.genai import types

        converted = []

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            # content가 리스트인 경우 (tool_use 등) 문자열로 변환
            if isinstance(content, list):
                text_parts = []
                for part in content:
                    if isinstance(part, dict):
                        if part.get("type") == "text":
                            text_parts.append(part.get("text", ""))
                        elif part.get("type") == "tool_use":
                            text_parts.append(f"[Tool: {part.get('name')}]")
                        elif part.get("type") == "tool_result":
                            text_parts.append(part.get("content", ""))
                    else:
                        text_parts.append(str(part))
                content = "\n".join(text_parts)

            if role == "system":
                continue
            elif role == "assistant":
                converted.append(types.Content(role="model", parts=[types.Part(text=content)]))
            elif role == "tool":
                tool_content = content if isinstance(content, str) else json.dumps(content, ensure_ascii=False)
                converted.append(types.Content(role="user", parts=[types.Part(text=f"[Tool Result]: {tool_content}")]))
            else:
                converted.append(types.Content(role="user", parts=[types.Part(text=content)]))

        return converted

    def _convert_tools_gemini(self, tools: list[dict]) -> list:
        """Gemini용 도구 변환 (google-genai 패키지)"""
        from google.genai import types

        function_declarations = []
        for tool in tools:
            # 파라미터 스키마 변환
            params = tool.get("parameters", {})
            properties = {}
            for k, v in params.get("properties", {}).items():
                prop_type = v.get("type", "string").upper()

                if prop_type == "ARRAY":
                    # 배열 타입은 items 필드 필수
                    items_type = v.get("items", {}).get("type", "string").upper()
                    properties[k] = types.Schema(
                        type="ARRAY",
                        description=v.get("description", ""),
                        items=types.Schema(type=items_type),
                    )
                else:
                    properties[k] = types.Schema(
                        type=prop_type,
                        description=v.get("description", ""),
                    )

            function_declarations.append(types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=types.Schema(
                    type="OBJECT",
                    properties=properties,
                    required=params.get("required", []),
                ),
            ))

        return [types.Tool(function_declarations=function_declarations)]

    def _parse_response_gemini(self, response) -> dict:
        """Gemini 응답 파싱 (google-genai 패키지)"""
        result = {"content": "", "tool_calls": [], "stop_reason": "end_turn"}

        try:
            # 텍스트 응답 추출
            if hasattr(response, "text") and response.text:
                result["content"] = response.text

            # candidates에서 function call 확인
            if hasattr(response, "candidates") and response.candidates:
                for candidate in response.candidates:
                    if not hasattr(candidate, "content") or candidate.content is None:
                        continue
                    if not hasattr(candidate.content, "parts") or candidate.content.parts is None:
                        continue

                    for part in candidate.content.parts:
                        if hasattr(part, "text") and part.text:
                            if not result["content"]:
                                result["content"] = part.text
                        elif hasattr(part, "function_call") and part.function_call:
                            fc = part.function_call
                            result["tool_calls"].append({
                                "id": f"call_{hash(fc.name)}",
                                "name": fc.name,
                                "arguments": dict(fc.args) if fc.args else {},
                            })
                            result["stop_reason"] = "tool_use"
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

        return result

    # LiteLLM 메서드
    async def _chat_litellm(
        self,
        messages: list[dict],
        tools: Optional[list[dict]],
        tool_choice: Optional[dict],
        system_prompt: Optional[str],
        max_tokens: int,
    ) -> dict:
        """LiteLLM API 호출"""
        for attempt in range(self.max_retries):
            try:
                # OpenAI 형식으로 메시지 변환
                litellm_messages = self._convert_messages_openai(messages, system_prompt)

                kwargs = {
                    "model": self.model,
                    "messages": litellm_messages,
                    "max_tokens": max_tokens,
                }

                if self.api_key:
                    kwargs["api_key"] = self.api_key
                if self.api_base:
                    kwargs["api_base"] = self.api_base

                if tools:
                    kwargs["tools"] = self._convert_tools_openai(tools)

                if tool_choice:
                    kwargs["tool_choice"] = "auto"

                # LiteLLM async completion
                response = await self.client.acompletion(**kwargs)
                return self._parse_response_litellm(response)

            except Exception as e:
                logger.error(f"LiteLLM API error, attempt {attempt + 1}/{self.max_retries}: {type(e).__name__}: {e}")
                if attempt == self.max_retries - 1:
                    raise
                import asyncio
                await asyncio.sleep(2 ** attempt)

    async def _chat_stream_litellm(self, messages, tools, tool_choice, system_prompt, max_tokens):
        """LiteLLM 스트리밍 API 호출"""
        litellm_messages = self._convert_messages_openai(messages, system_prompt)

        kwargs = {
            "model": self.model,
            "messages": litellm_messages,
            "max_tokens": max_tokens,
            "stream": True,
        }

        if self.api_key:
            kwargs["api_key"] = self.api_key
        if self.api_base:
            kwargs["api_base"] = self.api_base

        if tools:
            kwargs["tools"] = self._convert_tools_openai(tools)

        response = await self.client.acompletion(**kwargs)
        async for chunk in response:
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if hasattr(delta, "content") and delta.content:
                    yield delta.content

    def _parse_response_litellm(self, response) -> dict:
        """LiteLLM 응답 파싱"""
        result = {
            "content": "",
            "tool_calls": [],
            "stop_reason": "end_turn",
        }

        if hasattr(response, "choices") and response.choices:
            choice = response.choices[0]
            message = choice.message

            result["content"] = message.content or ""
            result["stop_reason"] = choice.finish_reason or "end_turn"

            if hasattr(message, "tool_calls") and message.tool_calls:
                for tc in message.tool_calls:
                    args = tc.function.arguments
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except json.JSONDecodeError:
                            args = {}

                    result["tool_calls"].append({
                        "id": tc.id,
                        "name": tc.function.name,
                        "arguments": args,
                    })

                if result["tool_calls"]:
                    result["stop_reason"] = "tool_use"

        return result

    # Custom LLM 메서드 (OpenAI 호환 API, httpx 사용)
    async def _chat_custom(
        self,
        messages: list[dict],
        tools: Optional[list[dict]],
        tool_choice: Optional[dict],
        system_prompt: Optional[str],
        max_tokens: int,
    ) -> dict:
        """Custom LLM API 호출 (OpenAI 호환)"""
        for attempt in range(self.max_retries):
            try:
                # OpenAI 형식으로 메시지 변환
                openai_messages = self._convert_messages_openai(messages, system_prompt)

                payload = {
                    "model": self.model,
                    "messages": openai_messages,
                    "max_tokens": max_tokens,
                }

                if tools:
                    payload["tools"] = self._convert_tools_openai(tools)

                if tool_choice:
                    payload["tool_choice"] = "auto"

                response = await self.client.post("/chat/completions", json=payload)
                response.raise_for_status()
                data = response.json()

                return self._parse_response_custom(data)

            except Exception as e:
                logger.error(f"Custom LLM API error, attempt {attempt + 1}/{self.max_retries}: {type(e).__name__}: {e}")
                if attempt == self.max_retries - 1:
                    raise
                import asyncio
                await asyncio.sleep(2 ** attempt)

    async def _chat_stream_custom(self, messages, tools, tool_choice, system_prompt, max_tokens):
        """Custom LLM 스트리밍 API 호출 (OpenAI 호환)"""
        openai_messages = self._convert_messages_openai(messages, system_prompt)

        payload = {
            "model": self.model,
            "messages": openai_messages,
            "max_tokens": max_tokens,
            "stream": True,
        }

        if tools:
            payload["tools"] = self._convert_tools_openai(tools)

        async with self.client.stream("POST", "/chat/completions", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        if chunk.get("choices") and chunk["choices"][0].get("delta", {}).get("content"):
                            yield chunk["choices"][0]["delta"]["content"]
                    except json.JSONDecodeError:
                        continue

    def _parse_response_custom(self, data: dict) -> dict:
        """Custom LLM 응답 파싱 (OpenAI 형식)"""
        result = {
            "content": "",
            "tool_calls": [],
            "stop_reason": "end_turn",
        }

        if data.get("choices"):
            choice = data["choices"][0]
            message = choice.get("message", {})

            result["content"] = message.get("content", "") or ""
            result["stop_reason"] = choice.get("finish_reason", "end_turn")

            if message.get("tool_calls"):
                for tc in message["tool_calls"]:
                    args = tc.get("function", {}).get("arguments", "{}")
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except json.JSONDecodeError:
                            args = {}

                    result["tool_calls"].append({
                        "id": tc.get("id", f"call_{hash(tc.get('function', {}).get('name', ''))}"),
                        "name": tc.get("function", {}).get("name", ""),
                        "arguments": args,
                    })

                if result["tool_calls"]:
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

    async def chat_stream(
        self,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        tool_choice: Optional[dict] = None,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
    ):
        """Mock 스트리밍 대화"""
        import asyncio
        response_text = "안녕하세요! 회의 일정 조율을 도와드릴게요. 어떤 회의를 잡으시겠어요?"

        # 텍스트를 청크로 나눠서 yield
        for char in response_text:
            yield char
            await asyncio.sleep(0.02)  # 타이핑 효과
