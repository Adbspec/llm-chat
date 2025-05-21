import os
import torch
import logging
import gc
from transformers import AutoModelForCausalLM, AutoTokenizer
from llama_cpp import Llama

MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
logger = logging.getLogger('chat_app')

class ModelManager:
    _cache = {}

    @classmethod
    def load_model(cls, model_name: str, device_mode: str = 'auto'):
        """
        Load a model in 'auto', 'cpu', or 'gpu' mode.  
        GPU mode will fall back to CPU if no GPU is found.
        """
        key = (model_name, device_mode)
        if key in cls._cache:
            return cls._cache[key]

        # Determine compute device
        if device_mode == 'auto':
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
        elif device_mode == 'gpu':
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            if device == 'cpu':
                logger.warning("GPU mode requested but no GPU detected; using CPU.")
        elif device_mode == 'cpu':
            device = 'cpu'
        else:
            raise ValueError(f"Invalid device_mode: {device_mode}")

        model_path = os.path.join(MODELS_DIR, model_name)
        if not os.path.isdir(model_path):
            raise FileNotFoundError(f"Model '{model_name}' not found in {MODELS_DIR}")

        # Check for GGUF files
        gguf_files = [f for f in os.listdir(model_path) if f.endswith('.gguf')]
        if gguf_files:
            gguf_path = os.path.join(model_path, gguf_files[0])
            model = Llama(model_path=gguf_path)
            cls._cache[key] = model
            return model

        # Load via Transformers
        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        if device == 'cpu':
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=torch.float32,
                trust_remote_code=True
            )
            model.to('cpu')
        else:
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                device_map='auto',
                torch_dtype=torch.float16,
                trust_remote_code=True
            )
        model.eval()

        cls._cache[key] = (tokenizer, model)
        return tokenizer, model

    @classmethod
    def unload_model(cls, model_name: str, device_mode: str = 'auto'):
        """
        Unload a previously loaded model, freeing up GPU memory.
        """
        key = (model_name, device_mode)
        if key in cls._cache:
            obj = cls._cache.pop(key)
            # Delete model object
            try:
                if isinstance(obj, tuple):
                    _, model = obj
                else:
                    model = obj
                # Remove references
                del obj
                del model
            except Exception:
                pass
            # Run garbage collector and clear caches
            gc.collect()
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass
            logger.info(f"Unloaded model {model_name} ({device_mode}) and freed GPU memory.")
        else:
            logger.info(f"Model {model_name} ({device_mode}) not loaded; nothing to unload.")