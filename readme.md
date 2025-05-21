# 🦜🔗 LLM Chat

A simple, self-hosted ChatGPT-style application with Streamlit frontend and FastAPI backend.
Local model inference (Transformers or llama.cpp) on CPU/GPU, with SQLite persistence for multi-turn chat history and session metadata.

---

## 🔨 Features

* **Streamlit** UI with:

  * Sidebar conversation list & **New Chat** button
  * Model & compute-mode selectors (auto/cpu/gpu)
  * Single Load/Unload toggle button per chat
  * Chat transcript display with timestamps, tokens, and throughput (TPS)
  * URL-based `chat_id` for deep linking & hard-refresh resiliency

* **FastAPI** backend with:

  * `/status` (global or per-chat) to retrieve loaded state & last-used model
  * `/chats` to list all conversations and their metadata
  * `/history` to fetch full transcript for a chat
  * `/load` & `/unload` to manage model memory per chat
  * `/chat` to handle multi-turn context, truncation, inference, and performance metrics
  * `/docs` for interactive API documentation (Swagger UI)
  * UTF-8 logging and SQLite persistence of every message and session

* **ModelManager** to dynamically load/unload models from `/models` folder:

  * Auto-detects GGUF (llama.cpp) vs. Transformers
  * Supports CPU/GPU/auto modes with fallback
  * Frees GPU VRAM on unload

* **SQLite** for durable storage of:

  * Message history (`chat_history.db`)
  * Session metadata (last-used model & device)

---

## 📁 Folder Structure

```
mini-chatgpt-app/
├── backend/
│   ├── logging_config.py    # Python logging setup
│   ├── db.py                # SQLAlchemy models & SQLite setup
│   ├── model_loader.py      # Dynamic model load/unload
│   └── main.py              # FastAPI application
├── frontend/
│   └── app.py               # Streamlit application
├── models/                  # Place your model folders here
│   └── Qwen2.5-Math-1.5B/   # Example model checkpoint
├── logs/                    # UTF-8 safe log files per chat
├── chat_history.db          # SQLite database file
├── requirements.txt         # Python dependencies
└── README.md                # This documentation
```

---

## 🚀 Quick Start

1. **Clone the repo** and `cd` into it:

   ```bash
   git clone <your-repo-url> mini-chatgpt-app
   cd mini-chatgpt-app
   ```

2. **Create & activate** a Python venv:

   ```bash
   python -m venv venv
   source venv/bin/activate     # Linux/macOS
   venv\\Scripts\\activate    # Windows
   ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Download a model** (e.g. Qwen2.5-Math-1.5B) into `models/`:

   ```bash
   git lfs install
   cd models
   git clone https://huggingface.co/Qwen/Qwen2.5-Math-1.5B
   cd ..
   ```

5. **Clone an example model** from Hugging Face into `models/`:

   ```bash
   cd models
   git lfs install
   git clone https://huggingface.co/cognitivecomputations/Dolphin3.0-Qwen2.5-1.5B
   cd ..
   ```

6. **Run the backend**:

   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Run the frontend**:

   ```bash
   streamlit run frontend/app.py
   ```

8. **Open** [http://localhost:8501](http://localhost:8501) in your browser.

---

## 📝 API Reference

### Models

| Schema             | Fields                                  |
| ------------------ | --------------------------------------- |
| **LoadRequest**    | `chat_id`, `model`, `device`            |
| **UnloadRequest**  | `chat_id`, `model`, `device`            |
| **ChatRequest**    | `chat_id`, `message`                    |
| **ChatResponse**   | `response`, `tokens`, `time_s`, `tps`   |
| **StatusResponse** | `loaded`, `model?`, `device?`           |
| **ChatMeta**       | `chat_id`, `title`, `model?`, `device?` |
| **ChatMessage**    | `sender`, `text`, `timestamp`           |

### Endpoints

#### `GET /status?chat_id={chat_id}`

* **Returns** last-loaded state & model/device for a chat, or global fallback if no `chat_id`.

#### `GET /chats`

* **Returns** list of all chats with their `chat_id`, a truncated first message as `title`, and last-used model/device.

#### `GET /history?chat_id={chat_id}`

* **Returns** full message history of `<chat_id>` in chronological order.

#### `GET /docs`

* **Description**: FastAPI's automatically generated interactive documentation (Swagger UI) for all endpoints.
* **URL**: [http://localhost:8000/docs](http://localhost:8000/docs)

#### `POST /load`

* **Body**: `LoadRequest`
* **Action**: Loads model into memory and persists `(model, device)` for `chat_id`.
* **Response**: `{status, chat_id, model, device, load_time_s}`

#### `POST /unload`

* **Body**: `UnloadRequest`
* **Action**: Unloads model from memory for `chat_id` (DB retains metadata).
* **Response**: `{status, chat_id, model, device}`

#### `POST /chat?model={model}&device={device}`

* **Body**: `ChatRequest`
* **Action**: Runs one chat turn with context from SQLite, persists messages, returns `ChatResponse`.

---

## 💡 How It Works

1. **Persistent Storage**: All messages and session choices are stored in SQLite (`chat_history.db`).
2. **Context Window**: On each `/chat`, the backend loads full history, concatenates into a prompt, truncates to the model’s `max_position_embeddings`, then runs inference.
3. **Model Management**: Use `/load`/`/unload` to control GPU/CPU memory. The Streamlit UI reflects loaded state and last-used model per-chat.

---

## 🛠️ Troubleshooting

* **Empty dropdown**? Ensure your model folder (e.g. `models/Qwen2.5-Math-1.5B`) exists.
* **GPU not detected**? Confirm `torch.cuda.is_available()` and install the CUDA-enabled torch wheel.
* **Encoding errors**? Logs and DB use UTF-8; please check your system locale.

---

Enjoy your self-hosted Mini ChatGPT! 🎉
