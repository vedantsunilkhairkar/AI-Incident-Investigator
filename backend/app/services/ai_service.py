import os
import json
import time
import logging
from pathlib import Path
from google import genai
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _build_prompt(
    application: str,
    error_message: str,
    description: str,
    severity: str,
    similar_incidents: list[dict] | None = None,
) -> str:
    """Build RAG-enhanced prompt if similar incidents exist, otherwise plain prompt."""

    # Build historical context block if we have past similar incidents
    history_block = ""
    if similar_incidents:
        lines = []
        for i, inc in enumerate(similar_incidents, 1):
            lines.append(
                f"  Past Incident {i} (Similarity: {inc['similarity_score']}% | App: {inc['application']}):\n"
                f"    Error: {inc['error']}\n"
                f"    Root Cause: {inc.get('root_cause', 'N/A')}\n"
                f"    Fix Applied: {inc.get('suggested_solution', 'N/A')}\n"
                f"    Prevention: {inc.get('preventive_action', 'N/A')}"
            )
        history_block = (
            "\n  INTERNAL COMPANY HISTORY — Similar resolved incidents from this organization:\n"
            + "\n".join(lines)
            + "\n\n  Use the above internal history to provide a more accurate and company-specific analysis.\n"
        )

    prompt = f"""
    You are an AI software incident investigator with access to this company's internal incident history.

    Analyze the following software incident:

    Application: {application}
    Error: {error_message}
    Description: {description}
    Reported Severity: {severity}
    {history_block}
    Based on the incident details{' and internal history above' if similar_incidents else ''},
    determine the root cause and provide a practical solution.

    Return ONLY valid JSON with exactly these fields:

    {{
        "root_cause": "Explain the root cause clearly",
        "severity": "Low, Medium, High, or Critical",
        "explanation": "Explain what happened and why",
        "suggested_solution": "Exact steps to fix it",
        "preventive_action": "How to prevent this in future"
    }}
    """
    return prompt


def investigate_incident(
    application: str,
    error_message: str,
    description: str,
    severity: str,
    similar_incidents: list[dict] | None = None,
) -> dict:
    """
    Investigate an incident using Gemini.
    If similar_incidents is provided, builds a RAG-enhanced prompt.
    """
    prompt = _build_prompt(
        application=application,
        error_message=error_message,
        description=description,
        severity=severity,
        similar_incidents=similar_incidents,
    )

    max_retries = 3

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json"
                }
            )

            result = json.loads(response.text)

            # Log whether RAG was used
            if similar_incidents:
                logger.info(
                    "RAG investigation completed with %d historical matches",
                    len(similar_incidents)
                )
            else:
                logger.info("Standard investigation completed (no historical matches)")

            return result

        except Exception as e:
            error_text = str(e)

            if "503" in error_text or "UNAVAILABLE" in error_text:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    time.sleep(wait_time)
                    continue

            raise e
