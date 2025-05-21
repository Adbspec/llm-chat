import os
import pathlib
import streamlit as st
import requests
import uuid
from datetime import datetime

# Base API URL (FastAPI backend)
API_URL = os.getenv("API_URL", "http://localhost:8000")

st.set_page_config(page_title="🦜🔗 Mini ChatGPT", page_icon="🤖")

# --- 1) Read chat_id from URL once ---
initial_chat_id = st.query_params.get("chat_id", [None])[0]

# --- 2) Initialize session state once ---
if "initialized" not in st.session_state:
    st.session_state.chat_id = initial_chat_id
    st.session_state.history = []
    st.session_state.loaded = False
    st.session_state.selected_model = ""
    st.session_state.mode = "auto"
    st.session_state.processing = False
    st.session_state.initialized = True

# --- 3) Load history *once* per chat_id ---
if st.session_state.chat_id and not st.session_state.history:
    # 3a) Fetch transcript
    resp_h = requests.get(
        f"{API_URL}/history", params={"chat_id": st.session_state.chat_id}, timeout=5
    )
    if resp_h.ok:
        st.session_state.history = [
            {
                "sender": msg["sender"],
                "text": msg["text"],
                "timestamp": datetime.fromisoformat(msg["timestamp"])
            }
            for msg in resp_h.json()
        ]

    # 3b) Fetch last-used model/device
    resp_s = requests.get(
        f"{API_URL}/status", params={"chat_id": st.session_state.chat_id}, timeout=5
    )
    if resp_s.ok:
        status = resp_s.json()
        if status.get("model"):
            st.session_state.selected_model = status["model"]
            st.session_state.mode = status.get("device", "auto")
        st.session_state.loaded = status.get("loaded", False)

# --- Sidebar: Conversation list & New Chat ---
st.sidebar.title("Conversations")

# ➕ New Chat
if st.sidebar.button("➕ New Chat"):
    new_chat = str(uuid.uuid4())
    # update URL
    st.query_params.clear()
    st.query_params["chat_id"] = new_chat

    # reset state
    st.session_state.chat_id = new_chat
    st.session_state.history = []
    # note: keep loaded/model/mode unchanged

# List existing chats
try:
    chats = requests.get(f"{API_URL}/chats", timeout=5).json()
except:
    chats = []

for chat in chats:
    label = chat["title"] or chat["chat_id"]
    if st.sidebar.button(label, key=f"chat_{chat['chat_id']}"):
        # set URL to this chat
        st.query_params.clear()
        st.query_params["chat_id"] = chat["chat_id"]

        # update session state
        st.session_state.chat_id = chat["chat_id"]
        st.session_state.history = []
        # reload history
        resp_h2 = requests.get(
            f"{API_URL}/history", params={"chat_id": chat["chat_id"]}, timeout=5
        )
        if resp_h2.ok:
            st.session_state.history = [
                {
                    "sender": m["sender"],
                    "text": m["text"],
                    "timestamp": datetime.fromisoformat(m["timestamp"])
                }
                for m in resp_h2.json()
            ]
        # reload model/device
        if chat.get("model"):
            st.session_state.selected_model = chat["model"]
            st.session_state.mode = chat.get("device", "auto")
            st.session_state.loaded = True

# --- Main Area ---
st.title("🦜🔗 Mini ChatGPT")

# 4) Blank slate
if not st.session_state.chat_id:
    st.info("No conversation. Click ➕ New Chat to get started.")
    st.stop()

# 5) Model & Compute Mode selectors
base_dir = pathlib.Path(__file__).resolve().parent.parent
models = [d.name for d in (base_dir / "models").iterdir() if d.is_dir()]
if st.session_state.selected_model not in models:
    st.session_state.selected_model = models[0] if models else ""
mode_list = ["auto", "cpu", "gpu"]
if st.session_state.mode not in mode_list:
    st.session_state.mode = "auto"

st.selectbox("Select model", models, key="selected_model")
st.selectbox("Compute Mode", mode_list, key="mode")

# 6) Load/Unload toggle
label = "Unload Model" if st.session_state.loaded else "Load Model"
if st.button(label, disabled=st.session_state.processing):
    st.session_state.processing = True
    payload = {
        "chat_id": st.session_state.chat_id,
        "model": st.session_state.selected_model,
        "device": st.session_state.mode
    }
    endpoint = "/unload" if st.session_state.loaded else "/load"
    res = requests.post(f"{API_URL}{endpoint}", json=payload, timeout=60)
    if res.ok:
        st.session_state.loaded = not st.session_state.loaded
        if endpoint == "/unload":
            st.session_state.history = []
            st.info(f"Unloaded {st.session_state.selected_model}")
        else:
            st.success(f"Loaded {st.session_state.selected_model} on {st.session_state.mode}")
    else:
        st.error(res.text)
    st.session_state.processing = False

# 7) Status display
st.write(f"**Chat ID:** {st.session_state.chat_id}")
st.write(f"**Status:** { 'Loaded' if st.session_state.loaded else 'Not loaded' }")

# 8) Chat UI
if st.session_state.loaded:
    for e in st.session_state.history:
        if "tps" in e:
            st.write(f"**{e['sender']}**: {e['text']}")
            st.write(f"_Time: {e['time_s']:.2f}s | Tokens: {e['tokens']} | TPS: {e['tps']:.2f}_")
        else:
            st.write(f"**{e['sender']}**: {e['text']}")

    def send():
        msg = st.session_state.input.strip()
        if not msg:
            return
        st.session_state.history.append({"sender": "You", "text": msg})
        payload = {"chat_id": st.session_state.chat_id, "message": msg}
        try:
            r = requests.post(
                f"{API_URL}/chat",
                params={"model": st.session_state.selected_model, "device": st.session_state.mode},
                json=payload,
                timeout=60
            )
            r.raise_for_status()
            data = r.json()
            st.session_state.history.append({
                "sender": "Bot",
                "text": data["response"],
                "tokens": data["tokens"],
                "time_s": data["time_s"],
                "tps": data["tps"]
            })
        except Exception as err:
            st.session_state.history.append({"sender": "Bot", "text": f"Error: {err}"})
        st.session_state.input = ""

    st.text_input("You:", key="input")
    st.button("Send", on_click=send)
else:
    st.info("Please load a model before chatting.")
