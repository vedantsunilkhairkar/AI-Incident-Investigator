from sqlalchemy import Column, Integer, String, Text
from .database import Base


from sqlalchemy import Column, Integer, String, Text
from .database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    application = Column(String, index=True)
    error = Column(Text)
    severity = Column(String,index=True)
    description = Column(Text)
    status = Column(String,index=True)

    root_cause = Column(Text, nullable=True)
    investigation_severity = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)
    suggested_solution = Column(Text, nullable=True)
    preventive_action = Column(Text, nullable=True)