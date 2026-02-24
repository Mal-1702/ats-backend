"""
LLM Service - Wrapper for different LLM providers (Groq, OpenAI, Anthropic)
"""
import os
from app.core.config import get_settings

class LLMService:
    def __init__(self):
        self.settings = get_settings()
        self.provider = self.settings.LLM_PROVIDER
        
    def get_chat_response(self, system_prompt: str, user_message: str) -> str:
        """
        Generic method to get a response from the configured LLM provider.
        """
        if self.provider == "groq":
            return self._call_groq(system_prompt, user_message)
        elif self.provider == "openai":
            return self._call_openai(system_prompt, user_message)
        elif self.provider == "anthropic":
            return self._call_anthropic(system_prompt, user_message)
        else:
            return "Error: LLM Provider not configured correctly."

    def _call_groq(self, system_prompt: str, user_message: str) -> str:
        try:
            from langchain_groq import ChatGroq
            llm = ChatGroq(
                api_key=self.settings.GROQ_API_KEY,
                model_name=self.settings.GROQ_MODEL
            )
            messages = [
                ("system", system_prompt),
                ("human", user_message),
            ]
            response = llm.invoke(messages)
            return response.content
        except Exception as e:
            return f"Groq Error: {str(e)}"

    def _call_openai(self, system_prompt: str, user_message: str) -> str:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"OpenAI Error: {str(e)}"

    def _call_anthropic(self, system_prompt: str, user_message: str) -> str:
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=self.settings.ANTHROPIC_API_KEY)
            message = client.messages.create(
                model=self.settings.ANTHROPIC_MODEL,
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message}
                ]
            )
            return message.content[0].text
        except Exception as e:
            return f"Anthropic Error: {str(e)}"
