import os
import json
import math
import logging
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from sqlalchemy.orm import Session

load_dotenv(Path(__file__).resolve().parent.parent.parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

EMBEDDING_MODEL = "gemini-embedding-exp-03-07"

# Incident categories for classification
INCIDENT_CATEGORIES = [
    "Database",
    "Authentication",
    "Network / Connectivity",
    "Memory / Performance",
    "Application Logic",
    "Security",
    "Infrastructure",
    "Third-party / External API",
    "Configuration",
    "Unknown",
]


def generate_embedding(text: str) -> list[float] | None:
    """
    Generate a text embedding using Gemini Embedding API.
    Returns a list of floats (the embedding vector), or None on failure.
    """
    try:
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        return response.embeddings[0].values
    except Exception as e:
        logger.warning("Embedding generation failed: %s", e)
        return None


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def find_similar_incidents(
    db: Session,
    current_embedding: list[float],
    exclude_id: int,
    top_k: int = 3,
    min_similarity: float = 0.70,
) -> list[dict]:
    """
    Search all resolved incidents in the DB for similar ones.
    Returns top_k incidents above min_similarity threshold.
    """
    from app import models  # local import to avoid circular dependency

    # Only search resolved incidents — they have verified solutions
    past_incidents = (
        db.query(models.Incident)
        .filter(
            models.Incident.id != exclude_id,
            models.Incident.status == "Resolved",
            models.Incident.embedding.isnot(None),
            models.Incident.suggested_solution.isnot(None),
        )
        .all()
    )

    scored = []

    for incident in past_incidents:
        try:
            past_vec = json.loads(incident.embedding)
            score = cosine_similarity(current_embedding, past_vec)
            if score >= min_similarity:
                scored.append({
                    "id": incident.id,
                    "application": incident.application,
                    "error": incident.error,
                    "severity": incident.severity,
                    "root_cause": incident.root_cause,
                    "suggested_solution": incident.suggested_solution,
                    "preventive_action": incident.preventive_action,
                    "similarity_score": round(score * 100, 1),
                })
        except Exception:
            continue

    # Sort by highest similarity first
    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:top_k]


def predict_category(error: str, description: str) -> str:
    """
    Use Gemini to categorize the incident type.
    Returns one of the INCIDENT_CATEGORIES.
    """
    try:
        categories_list = ", ".join(INCIDENT_CATEGORIES)
        prompt = f"""
        Classify this software incident into exactly one category.
        Categories: {categories_list}

        Error: {error}
        Description: {description}

        Reply with ONLY the category name, nothing else.
        """
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        raw = response.text.strip()
        # Validate it's one of our categories
        for cat in INCIDENT_CATEGORIES:
            if cat.lower() in raw.lower():
                return cat
        return "Unknown"
    except Exception as e:
        logger.warning("Category prediction failed: %s", e)
        return "Unknown"
