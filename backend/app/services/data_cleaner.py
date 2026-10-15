import re


def clean_text(value: str) -> str:
    """Clean unnecessary spaces and symbols from text."""
    if not value:
        return ""

    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"!{2,}", "!", value)

    return value


def clean_severity(severity: str) -> str:
    """Convert severity into a standard format."""
    if not severity:
        return "Low"

    severity = severity.strip().lower()

    severity_map = {
        "low": "Low",
        "medium": "Medium",
        "high": "High",
        "critical": "Critical"
    }

    return severity_map.get(severity, "Low")


def clean_incident_data(data: dict) -> dict:
    """Clean and standardize incident data."""

    cleaned_data = {
        "application": clean_text(data.get("application")),
        "error": clean_text(data.get("error")),
        "severity": clean_severity(data.get("severity")),
        "description": clean_text(data.get("description"))
    }

    return cleaned_data


def validate_incident_data(data: dict) -> tuple[bool, list[str]]:
    """Validate cleaned incident data."""

    errors = []

    if not data.get("application"):
        errors.append("Application name is required.")

    if not data.get("error"):
        errors.append("Error message is required.")

    if not data.get("description"):
        errors.append("Description is required.")

    if data.get("severity") not in ["Low", "Medium", "High", "Critical"]:
        errors.append("Invalid severity.")

    return len(errors) == 0, errors