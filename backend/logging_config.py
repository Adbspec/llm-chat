import logging
import os

# Ensure logs directory exists
LOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_fmt = logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S'
)
console_handler.setFormatter(console_fmt)

# Logger setup
logger = logging.getLogger('chat_app')
logger.setLevel(logging.INFO)
logger.addHandler(console_handler)