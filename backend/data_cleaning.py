from app.services.data_cleaner import (
    clean_incident_data,
    validate_incident_data
)


# Test 1: Valid incident
valid_data = {
    "application": "   Payment Service   ",
    "error": "   DATABASE CONNECTION FAILED!!!   ",
    "severity": "High",
    "description": "   database    connection    is    not responding   "
}

cleaned_valid = clean_incident_data(valid_data)
is_valid, errors = validate_incident_data(cleaned_valid)

print("VALID INCIDENT TEST")
print("Cleaned data:", cleaned_valid)
print("Valid:", is_valid)
print("Errors:", errors)


# Test 2: Invalid incident
invalid_data = {
    "application": "   ",
    "error": "   ",
    "severity": "High",
    "description": "   "
}

cleaned_invalid = clean_incident_data(invalid_data)
is_valid, errors = validate_incident_data(cleaned_invalid)

print("\nINVALID INCIDENT TEST")
print("Cleaned data:", cleaned_invalid)
print("Valid:", is_valid)
print("Errors:", errors)