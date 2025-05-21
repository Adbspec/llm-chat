# backend/db.py

import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# DB file alongside your code
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'chat_history.db')
ENGINE = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False)
Base = declarative_base()

class Message(Base):
    __tablename__ = 'messages'
    id       = Column(Integer, primary_key=True, index=True)
    chat_id  = Column(String, index=True)
    sender   = Column(String)       # 'user' or 'bot'
    text     = Column(Text)
    timestamp= Column(DateTime, default=datetime.utcnow)

# create tables if not exist
Base.metadata.create_all(bind=ENGINE)
