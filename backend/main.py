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
from starlette.middleware.cors import CORSMiddleware

app = FastAPI()

# --- CORS setup ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # or list of allowed origins
    allow_credentials=True,
    allow_methods=["*"],            # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],            # e.g. ["Authorization", "Content-Type"]
)
# -------------------

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
    sender:   str
    text:     str
    timestamp: datetime
    model:    str
    device:   str

# ----- Helper -----
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----- List Available Models -----
@app.get("/models", response_model=List[str])
async def available_models():
    """
    Return a list of model names available in the models directory.

    Returns:
        List[str]: e.g., ['gpt2', 'qwen2.5', 'local-llama']
    """
    try:
        return ModelManager.list_available_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    db = SessionLocal()
    try:
        msgs = (
            db.query(Message)
              .filter(Message.chat_id == chat_id)
              .order_by(Message.id)
              .all()
        )
        return [
            ChatMessage(
                sender=m.sender,
                text=m.text,
                timestamp=m.timestamp,
                model=m.model,
                device=m.device
            )
            for m in msgs
        ]
    finally:
        db.close()

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
    if (model, device) not in ModelManager._cache:
        raise HTTPException(status_code=400, detail="Model not loaded")

    chat_id = req.chat_id or str(uuid4())
    # generate…
    # ──────────────────────────────────────

    # 1) Tokenize
    # tokenizer, model_obj = ModelManager._cache[(model, device)]
    # inputs = tokenizer(req.message, return_tensors='pt').to(model_obj.device)

    tokenizer, model_obj = ModelManager._cache[(model, device)]
    inputs    = tokenizer(req.message, return_tensors='pt').to(model_obj.device)
    input_ids = inputs["input_ids"]
    L_in      = input_ids.shape[-1]   

    # 2) Generate
    start = time.time()
    outputs = model_obj.generate(**inputs, max_new_tokens=250,
                                 pad_token_id=tokenizer.eos_token_id,use_cache=False)
    
    # 3) Slice off prompt & decode only new tokens
    gen_ids = outputs[0][L_in:]                  # ← new: drop prompt tokens
    
    text    = tokenizer.decode(
                gen_ids,
                skip_special_tokens=True
            ).strip()        
    
    # 4) Metrics
    elapsed = time.time() - start
    tokens  = outputs.shape[-1]
    tps     = tokens / elapsed if elapsed > 0 else 0
    # ──────────────────────────────────────

    
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        db.add_all([
            Message(
                chat_id=chat_id,
                model=model,
                device=device,
                sender='user',
                text=req.message,
                timestamp=now
            ),
            Message(
                chat_id=chat_id,
                model=model,
                device=device,
                sender='bot',
                text=text,
                timestamp=datetime.utcnow()
            )
        ])
        db.commit()
    finally:
        db.close()

    return {"response": text, "tokens": int(tokens),
            "time_s": elapsed, "tps": tps}

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