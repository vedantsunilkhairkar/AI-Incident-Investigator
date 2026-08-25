from app.services.ai_service import investigate_incident

error = "TypeError: unsupported operand type(s) for +: 'int' and 'str'"

result = investigate_incident(error)

print(result)