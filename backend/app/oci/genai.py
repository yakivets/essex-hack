"""OCI Generative AI client + structured-output helper.

Imported only when FAKE_OCI=0, so the canned path runs without the `oci` SDK
installed. Auth is read from ~/.oci/config automatically.

NOTE: the chat-request class differs by model family (Cohere vs Llama/Generic).
We branch on the model id. If your console "Chat playground -> View code" shows a
different shape, match it here — that snippet is the source of truth for your model.
"""

from __future__ import annotations

import json
from typing import Type, TypeVar

from pydantic import BaseModel, ValidationError

from app.config import settings

T = TypeVar("T", bound=BaseModel)


def _client():
    import oci

    config = oci.config.from_file()  # ~/.oci/config, [DEFAULT] profile
    return oci.generative_ai_inference.GenerativeAiInferenceClient(
        config=config,
        service_endpoint=settings.oci_genai_endpoint,
    )


def chat(prompt: str, *, max_tokens: int = 3000, temperature: float = 0.2) -> str:
    """Single-turn chat completion. Returns the model's text."""
    from oci.generative_ai_inference import models as m

    client = _client()
    model_id = settings.oci_genai_chat_model
    serving = m.OnDemandServingMode(model_id=model_id)

    if "cohere" in model_id.lower():
        chat_request = m.CohereChatRequest(
            message=prompt, max_tokens=max_tokens, temperature=temperature
        )
    else:  # Meta Llama / other GENERIC-format models
        content = m.TextContent(text=prompt)
        message = m.Message(role="USER", content=[content])
        chat_request = m.GenericChatRequest(
            messages=[message], max_tokens=max_tokens, temperature=temperature
        )

    details = m.ChatDetails(
        serving_mode=serving,
        chat_request=chat_request,
        compartment_id=settings.oci_compartment_id,
    )
    response = client.chat(details)
    return _extract_text(response.data.chat_response)


def _extract_text(chat_response) -> str:
    # Cohere responses expose .text; Generic responses use choices[].message.content[].text
    text = getattr(chat_response, "text", None)
    if text:
        return text
    try:
        return chat_response.choices[0].message.content[0].text
    except (AttributeError, IndexError) as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Unexpected GenAI response shape: {chat_response!r}") from exc


def _strip_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        s = s.rsplit("```", 1)[0]
    return s.strip()


def llm_json(prompt: str, schema: Type[T], *, max_tokens: int = 3000) -> T:
    """Ask for JSON, parse it into `schema`. Retries once on malformed output."""
    instruction = (
        f"{prompt}\n\nRespond with ONLY valid JSON, no markdown fences, no commentary."
    )
    last_err: Exception | None = None
    for _attempt in range(2):
        raw = chat(instruction, max_tokens=max_tokens)
        try:
            return schema.model_validate_json(_strip_fence(raw))
        except (ValidationError, json.JSONDecodeError) as exc:
            last_err = exc
            instruction = (
                f"{prompt}\n\nYour previous reply was not valid JSON for the schema. "
                f"Return ONLY a single valid JSON object matching the requested fields."
            )
    raise RuntimeError(f"LLM did not return valid JSON after retry: {last_err}")
