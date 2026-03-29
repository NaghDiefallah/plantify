"""LLM-powered bilingual chatbot service for agricultural expert advice."""

import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator, Literal
import httpx

from app.services.language_utils import detect_language


class ChatbotService:
    """Bilingual chatbot providing expert agricultural advice."""
    
    def __init__(
        self,
        model_name: str = "qwen2.5:1.5b",
        glossary_path: str | None = None,
        base_url: str = "http://localhost:11434",
        auto_pull_model: bool = True,
        pull_timeout_seconds: int = 900,
    ):
        """Initialize the chatbot service.
        
        Args:
            model_name: Name of the Ollama model to use (default: qwen2.5:1.5b)
            glossary_path: Path to botanical glossary JSON file
            base_url: Ollama API base URL
        """
        self.model_name = model_name
        self.base_url = base_url
        self.auto_pull_model = auto_pull_model
        self.pull_timeout_seconds = pull_timeout_seconds
        self.glossary = self._load_glossary(glossary_path)
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=45.0, write=15.0, pool=5.0)
        )
        self._model_ready = False
        self._ensure_lock = asyncio.Lock()

    @staticmethod
    def _is_fast_path_message(message: str) -> bool:
        normalized = (message or "").strip().lower()
        if not normalized:
            return False
        return normalized in {
            "hello",
            "hi",
            "hey",
            "test",
            "testing",
            "مرحبا",
            "اهلا",
            "أهلا",
            "اختبار",
            "تجربة",
        }

    @staticmethod
    def _fast_path_response(language: Literal["en", "ar"]) -> str:
        if language == "ar":
            return (
                "مرحباً! أنا خبير Plantify الزراعي. "
                "أرسل اسم المرض أو صورة الفحص وسأعطيك خطوات عملية سريعة للعلاج والوقاية."
            )
        return (
            "Hello! I am your Plantify Agri Expert. "
            "Share a disease name or scan result and I will provide concise treatment and prevention steps."
        )

    @staticmethod
    def _fallback_response(language: Literal["en", "ar"]) -> str:
        if language == "ar":
            return (
                "الخدمة بطيئة حالياً أو غير متاحة مؤقتاً. "
                "جرّب بعد قليل، أو اذكر اسم المرض مباشرة لأعطيك إرشادات عامة."
            )
        return (
            "The AI service is currently slow or temporarily unavailable. "
            "Please retry in a moment, or share the disease name for general guidance."
        )

    async def ensure_model_ready(self) -> None:
        """Ensure Ollama is reachable and the configured model is available."""
        if self._model_ready:
            return

        async with self._ensure_lock:
            if self._model_ready:
                return

            tags = await self._list_model_tags()
            if not self._has_model_tag(tags):
                if not self.auto_pull_model:
                    raise RuntimeError(
                        f"Chatbot model '{self.model_name}' is not available and auto-pull is disabled"
                    )
                await self._pull_model()

            self._model_ready = True

    async def _list_model_tags(self) -> list[str]:
        response = await self.http_client.get(f"{self.base_url}/api/tags", timeout=20.0)
        response.raise_for_status()
        payload = response.json()
        models = payload.get("models", [])
        tags: list[str] = []
        for item in models:
            name = item.get("name") if isinstance(item, dict) else None
            if isinstance(name, str) and name.strip():
                tags.append(name.strip())
        return tags

    def _has_model_tag(self, tags: list[str]) -> bool:
        target = self.model_name.strip()
        if not target:
            return False
        return any(tag == target or tag.startswith(f"{target}:") for tag in tags)

    async def _pull_model(self) -> None:
        async with self.http_client.stream(
            "POST",
            f"{self.base_url}/api/pull",
            json={"name": self.model_name, "stream": True},
            timeout=self.pull_timeout_seconds,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                error_message = data.get("error")
                if isinstance(error_message, str) and error_message.strip():
                    raise RuntimeError(f"Failed to pull chatbot model '{self.model_name}': {error_message}")

        # Confirm availability after pull.
        tags = await self._list_model_tags()
        if not self._has_model_tag(tags):
            raise RuntimeError(f"Chatbot model '{self.model_name}' was pulled but is still unavailable")
    
    def _load_glossary(self, glossary_path: str | None = None) -> dict:
        """Load the botanical glossary."""
        if glossary_path is None:
            glossary_path = Path(__file__).parent.parent / "data" / "botanical_glossary.json"
        
        if Path(glossary_path).exists():
            return json.loads(Path(glossary_path).read_text(encoding="utf-8"))
        return {}
    
    def _build_system_prompt(self, language: Literal["en", "ar"]) -> str:
        """Build system prompt for the specified language."""
        if language == "ar":
            return """أنت خبير زراعي متخصص يساعد المزارعين والعاملين في الزراعة على فهم وعلاج أمراض النبات.

مهامك:
- توفير معلومات دقيقة وموثوقة عن أمراض النبات والآفات الزراعية
- شرح أسباب الأمراض وطرق الوقاية والعلاج
- تقديم نصائح عملية لتحسين صحة المحصول
- الاستجابة بوضوح وسهولة مع تجنب التعقيد غير الضروري
- استخدام المصطلحات الزراعية الصحيحة بالعربية

تجنب:
- المعلومات غير الدقيقة أو المضللة
- التوصيات الضارة أو الخطرة
- الخروج عن موضوع الزراعة

أجب بالعربية دائماً."""
        
        else:  # English
            return """You are an expert agronomist helping farmers and agricultural workers understand and treat plant diseases.

Your roles:
- Provide accurate and reliable information about plant diseases and agricultural pests
- Explain disease causes, prevention methods, and treatment options
- Offer practical advice for improving crop health
- Respond clearly and simply, avoiding unnecessary complexity
- Use proper botanical and agricultural terminology

Avoid:
- Inaccurate or misleading information
- Harmful or dangerous recommendations
- Straying from agricultural topics

Always respond in English."""
    
    def _add_context(self, query: str, language: Literal["en", "ar"]) -> str:
        """Add botanical context to the query."""
        context = ""
        
        # Add glossary context if available
        if self.glossary:
            glossary_str = json.dumps(self.glossary, ensure_ascii=False, indent=2)
            context += f"\n\nBotanical Reference:\n{glossary_str}"
        
        return f"{context}\n\nUser Question: {query}"
    
    async def chat_stream(
        self,
        message: str,
        scan_context: dict | None = None,
        conversation_history: list[dict] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chatbot response in the user's language.
        
        Args:
            message: User message
            scan_context: Optional recent scan data (disease_name, confidence, etc.)
            conversation_history: Previous messages for context
            
        Yields:
            Streamed response chunks
        """
        # Detect user language
        language = detect_language(message)

        if self._is_fast_path_message(message):
            yield self._fast_path_response(language)
            return

        try:
            await self.ensure_model_ready()
        except Exception:
            yield self._fallback_response(language)
            return
        
        # Build context-aware query
        enhanced_query = message
        if scan_context:
            disease = scan_context.get("disease_name", "")
            confidence = scan_context.get("confidence", 0)
            if language == "ar":
                enhanced_query += f"\n\n[السياق الأخير: مرض '{disease}' بدرجة ثقة {confidence:.1%}]"
            else:
                enhanced_query += f"\n\n[Recent context: disease '{disease}' with {confidence:.1%} confidence]"
        
        # Build system prompt
        system_prompt = self._build_system_prompt(language)
        
        # Prepare messages for Ollama
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": enhanced_query}
        ]
        
        # Stream the response from Ollama
        try:
            async with self.http_client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model_name,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": 0.4,
                        "num_predict": 180,
                    },
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line and line.startswith('{"'):
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                chunk = data["message"]["content"]
                                if chunk:
                                    yield chunk
                        except json.JSONDecodeError:
                            continue

        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError):
            yield self._fallback_response(language)
        except Exception:
            yield self._fallback_response(language)
    
    async def chat(
        self,
        message: str,
        scan_context: dict | None = None,
    ) -> str:
        """Get a complete chatbot response (non-streaming).
        
        Args:
            message: User message
            scan_context: Optional recent scan data
            
        Returns:
            Complete response
        """
        response = ""
        async for chunk in self.chat_stream(message, scan_context):
            response += chunk
        return response
    
    def get_glossary_term(
        self,
        term: str,
        language: Literal["en", "ar"] = "en"
    ) -> dict | None:
        """Look up a botanical term in the glossary.
        
        Args:
            term: Term to look up
            language: Language for response
            
        Returns:
            Term information or None if not found
        """
        if not self.glossary:
            return None
        
        # Search diseases
        for disease, data in self.glossary.get("diseases", {}).items():
            if disease.lower() == term.lower():
                if language == "ar":
                    return {
                        "term": disease,
                        "translation": data.get("ar", ""),
                        "description": data.get("ar_description", "")
                    }
                else:
                    return {
                        "term": disease,
                        "translation": data.get("ar", ""),
                        "description": data.get("en_description", "")
                    }
        
        # Search agronomic terms
        for term_name, data in self.glossary.get("agronomic_terms", {}).items():
            if term_name.lower() == term.lower():
                if language == "ar":
                    return {
                        "term": term_name,
                        "translation": data.get("ar", ""),
                        "description": data.get("description", "")
                    }
                else:
                    return {
                        "term": term_name,
                        "translation": data.get("ar", ""),
                        "description": data.get("description", "")
                    }
        
        return None

