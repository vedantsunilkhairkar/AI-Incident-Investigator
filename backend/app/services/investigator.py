import os
from dotenv import load_dotenv
from google import genai

load_dotenv("../.env")

API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY)


def investigate_incident(incident):
    prompt = f"""
    You are a software incident investigator.

    Analyze this incident:

    Application: {incident.application}
    Error: {incident.error}
    Severity: {incident.severity}
    Description: {incident.description}

    Return ONLY valid JSON in this exact structure:

    {{
        "root_cause": "possible root cause",
        "recommended_solution": "recommended solution",
        "prevention_steps": "steps to prevent this incident"
    }}
    """

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    return {
        "analysis": response.text
    }