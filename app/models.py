from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from .database import Base

class Input(Base):
    __tablename__ = "inputs"

    id = Column(Integer, primary_key=True, index=True)
    text_payload = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)
    response_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
