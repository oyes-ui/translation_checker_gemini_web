import os
import json
import re
from google import genai
from google.genai import types
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class ModelHandler:
    def __init__(self):
        # Gemini config (New SDK)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_client = None
        if self.gemini_api_key:
            self.gemini_client = genai.Client(api_key=self.gemini_api_key)
        
        # OpenAI config
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_client = None
        if self.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=self.openai_api_key)

    def _safe_parse_json(self, text: str):
        """
        AI가 반환한 텍스트에서 JSON 블록을 찾아 파싱합니다.
        마크다운 백틱(```json ... ```)이나 불필요한 서술어를 처리합니다.
        """
        if not text:
            return {}
        try:
            # 1. 마크다운 스타일 JSON 블록 추출
            clean_text = text.strip()
            if "```json" in clean_text:
                clean_text = clean_res = clean_text.split("```json")[-1].split("```")[0].strip()
            elif "```" in clean_text:
                clean_text = clean_text.split("```")[-1].split("```")[0].strip()
            
            # 2. { } 외부의 텍스트 제거 시도 (가장 바깥쪽 중괄호 찾기)
            start_idx = clean_text.find('{')
            end_idx = clean_text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                clean_text = str(clean_text)[start_idx:end_idx + 1]
            
            return json.loads(clean_text)
        except Exception as e:
            print(f"JSON Parsing Error: {e}\nOriginal Text: {text}")
            return {"error": "parsing_failed", "original_text": text}

    async def call_gemini(self, prompt, model_name="gemini-2.5-flash", system_instruction=None, response_json=False):
        if not self.gemini_client:
            return "Gemini API Key not configured."
        
        try:
            actual_model_name = model_name
            if not actual_model_name.startswith("models/"):
                actual_model_name = f"models/{actual_model_name}"
            
            config = None
            if system_instruction or response_json:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json" if response_json else "text/plain"
                )
            
            response = await self.gemini_client.aio.models.generate_content(
                model=actual_model_name,
                contents=prompt,
                config=config
            )
            
            res_text = response.text.strip()
            if response_json:
                return self._safe_parse_json(res_text)
            return res_text
        except Exception as e:
            return f"Gemini Error: {str(e)}"

    async def call_gpt(self, prompt, model_name="gpt-5-mini", system_instruction=None, response_json=False):
        if not self.openai_client:
            return "OpenAI API Key not configured."
        
        try:
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            
            # OpenAI JSON 모드는 프롬프트에 'json' 단어가 포함되어야 함
            final_prompt = prompt
            if response_json and "json" not in prompt.lower():
                final_prompt += "\n\nReturn the output in JSON format."
                
            messages.append({"role": "user", "content": final_prompt})
            
            kwargs = {
                "model": model_name,
                "messages": messages
            }
            if response_json:
                kwargs["response_format"] = {"type": "json_object"}
            
            response = await self.openai_client.chat.completions.create(**kwargs)
            res_text = response.choices[0].message.content.strip()
            
            if response_json:
                return self._safe_parse_json(res_text)
            return res_text
        except Exception as e:
            return f"GPT Error: {str(e)}"

    async def generate_content(self, prompt, model_name="gemini-2.5-flash", system_instruction=None, response_json=False):
        """Unified method to call either Gemini or GPT based on model name."""
        if "gpt" in model_name.lower() or "o1" in model_name.lower():
            return await self.call_gpt(prompt, model_name=model_name, system_instruction=system_instruction, response_json=response_json)
        else:
            return await self.call_gemini(prompt, model_name=model_name, system_instruction=system_instruction, response_json=response_json)
