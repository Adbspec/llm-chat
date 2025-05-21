import os
import time
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from uuid import uuid4
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import Response, status
from backend.logging_config import logger, LOG_DIR
from backend.db import SessionLocal, Message
from backend.model_loader import ModelManager

app = FastAPI()

# ----- Schemas -----
class LoadRequest(BaseModel):
    model: str
    device: str = 'auto'

class UnloadRequest(BaseModel):
    model: str
    device: str = 'auto'

class ChatRequest(BaseModel):
    chat_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    tokens: int
    time_s: float
    tps: float

class StatusResponse(BaseModel):
    loaded: bool
    model: Optional[str] = None
    device: Optional[str] = None

class ChatMeta(BaseModel):
    chat_id: str
    title: str

class ChatMessage(BaseModel):
    sender: str
    text: str
    timestamp: datetime

# ----- Helper -----
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----- Endpoints -----
@app.get('/status', response_model=StatusResponse)
async def status():
    if ModelManager._cache:
        name, dev = list(ModelManager._cache.keys())[-1]
        return StatusResponse(loaded=True, model=name, device=dev)
    return StatusResponse(loaded=False)

@app.get('/chats', response_model=List[ChatMeta])
async def list_chats():
    db: Session = SessionLocal()
    ids = [row[0] for row in db.query(Message.chat_id).distinct()]
    out = []
    for cid in ids:
        first = (
            db.query(Message)
              .filter(Message.chat_id == cid)
              .order_by(Message.id)
              .first()
        )
        title = (first.text[:30] + '...') if first and len(first.text) > 30 else (first.text or cid)
        out.append(ChatMeta(chat_id=cid, title=title))
    db.close()
    return out

@app.get('/history', response_model=List[ChatMessage])
async def get_history(chat_id: str = Query(...)):
    db: Session = SessionLocal()
    msgs = (
        db.query(Message)
          .filter(Message.chat_id == chat_id)
          .order_by(Message.id)
          .all()
    )
    out = [ChatMessage(sender=m.sender.capitalize(), text=m.text, timestamp=m.timestamp) for m in msgs]
    db.close()
    return out

@app.post('/load')
async def load_model(req: LoadRequest):
    start = time.time()
    try:
        ModelManager.load_model(req.model, req.device)
        elapsed = time.time() - start
        logger.info(f"Loaded model {req.model} on {req.device} in {elapsed:.2f}s")
        return {"status": "loaded", "model": req.model, "device": req.device, "load_time_s": elapsed}
    except Exception as e:
        logger.exception("Error loading model")
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/unload')
async def unload_model(req: UnloadRequest):
    ModelManager.unload_model(req.model, req.device)
    return {"status": "unloaded", "model": req.model, "device": req.device}

@app.post('/chat', response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    model: str = Query(...),
    device: str = Query('auto')
):
    # Ensure model is loaded
    if (model, device) not in ModelManager._cache:
        raise HTTPException(status_code=400, detail="Model not loaded")

    chat_id = req.chat_id or str(uuid4())
    log_file = os.path.join(LOG_DIR, f"{chat_id}.log")
    timestamp = datetime.utcnow().isoformat()

    try:
        # Log user message with UTF-8 encoding
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"{timestamp} | USER ({device}): {req.message}\n")
        logger.info(f"[{chat_id}] USER ({device}): {req.message}")

        # Generate response
        tokenizer, model_obj = ModelManager._cache[(model, device)]
        inputs = tokenizer(req.message, return_tensors='pt').to(model_obj.device)
        start = time.time()
        outputs = model_obj.generate(
            **inputs,
            max_new_tokens=150,
            pad_token_id=tokenizer.eos_token_id
        )
        text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        elapsed = time.time() - start
        tokens = outputs.shape[-1]
        tps = tokens / elapsed if elapsed > 0 else 0

        # Log bot response with UTF-8 encoding
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"{datetime.utcnow().isoformat()} | BOT: {text}\n")
        logger.info(f"[{chat_id}] BOT: {text}")

        return {"response": text, "tokens": int(tokens), "time_s": elapsed, "tps": tps}
    except Exception as e:
        logger.exception("Chat error")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clear_all")
async def clear_all_messages():
    """
    Deletes every row in the messages table.
    """
    db: Session = SessionLocal()
    db.query(Message).delete()
    db.commit()
    db.close()
    return {"status": "all messages cleared"}