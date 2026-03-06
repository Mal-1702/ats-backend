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

    def get_streaming_chat_response(self, system_prompt: str, user_message: str):
        """
        Generic method to get a streaming response from the configured LLM provider.
        Returns a generator of strings (tokens).
        """
        if self.provider == "groq":
            yield from self._stream_groq(system_prompt, user_message)
        elif self.provider == "openai":
            yield from self._stream_openai(system_prompt, user_message)
        elif self.provider == "anthropic":
            yield from self._stream_anthropic(system_prompt, user_message)
        else:
            yield "Error: LLM Provider not configured correctly."

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

    def _stream_groq(self, system_prompt: str, user_message: str):
        try:
            from groq import Groq
            client = Groq(api_key=self.settings.GROQ_API_KEY)
            stream = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                model=self.settings.GROQ_MODEL,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"Groq Stream Error: {str(e)}"

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

    def _stream_openai(self, system_prompt: str, user_message: str):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                stream=True
            )
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"OpenAI Stream Error: {str(e)}"

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

    def _stream_anthropic(self, system_prompt: str, user_message: str):
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=self.settings.ANTHROPIC_API_KEY)
            with client.messages.stream(
                model=self.settings.ANTHROPIC_MODEL,
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message}
                ]
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except Exception as e:
            yield f"Anthropic Stream Error: {str(e)}"
