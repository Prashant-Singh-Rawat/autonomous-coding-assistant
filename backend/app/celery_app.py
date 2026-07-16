import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

from kombu import Queue

celery_app = Celery(
    "tony_tasks",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks"]
)

celery_app.conf.update(
    task_always_eager=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_queue="general_automation",
    task_queues=(
        Queue("sync"),
        Queue("ai_review"),
        Queue("scans"),
        Queue("general_automation"),
    )
)
