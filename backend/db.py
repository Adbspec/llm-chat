# backend/db.py
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'chat_history.db')
ENGINE = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False)
Base = declarative_base()

class Message(Base):
    __tablename__ = 'messages'
    id        = Column(Integer, primary_key=True, index=True)
    chat_id   = Column(String, index=True)
    model     = Column(String, nullable=False)     # ← new
    device    = Column(String, nullable=False)     # ← new
    sender    = Column(String, nullable=False)     # 'user' or 'bot'
    text      = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

# create tables if not exist (you may need to drop & recreate for existing DB)
Base.metadata.create_all(bind=ENGINE)
