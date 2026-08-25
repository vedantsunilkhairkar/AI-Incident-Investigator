import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def investigate_incident(error_message: str):
    prompt = f"""
    You are an AI software incident investigator.

    Analyze this software error:

    {error_message}

    Return ONLY valid JSON with exactly these fields:

    {{
        "root_cause": "Explain the root cause",
        "severity": "Low, Medium, High, or Critical",
        "explanation": "Explain what happened",
        "suggested_solution": "Explain how to fix it",
        "preventive_action": "Explain how to prevent it"
    }}
    """

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )

    return json.loads(response.text)