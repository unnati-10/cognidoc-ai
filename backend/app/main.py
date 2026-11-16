import json
import os
import uuid
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv


# =========================================================
# COGNIDOC AI — BACKEND CONFIGURATION
# =========================================================

app = FastAPI(
    title="Cognidoc AI",
    description="AI-Powered Personal Document Intelligence Platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
METADATA_FILE = BASE_DIR / "documents.json"
REMINDERS_FILE = BASE_DIR / "reminders.json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 15 * 1024 * 1024
MAX_AI_CONTEXT_CHARS = 6000
PDF_TEXT_CACHE = {}

# =========================================================
# REQUEST MODELS
# =========================================================

class CategoryUpdate(BaseModel):
    category: str = Field(min_length=1, max_length=60)


class ReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    due_date: Optional[date] = None
    priority: str = "medium"
    document_id: Optional[str] = None


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    due_date: Optional[date] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None
    document_id: Optional[str] = None


class AskQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    document_ids: list[str] = Field(default_factory=list)


# =========================================================
# JSON STORAGE HELPERS
# =========================================================

def read_json_file(path: Path) -> list:
    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8"))

        if not isinstance(data, list):
            raise HTTPException(
                status_code=500,
                detail=f"Invalid data format in {path.name}.",
            )

        return data

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read {path.name}. Its JSON data is invalid.",
        )

    except OSError:
        raise HTTPException(
            status_code=500,
            detail=f"Could not access {path.name}.",
        )


def write_json_file(path: Path, data: list) -> None:
    try:
        temporary_path = path.with_suffix(".tmp")

        temporary_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        temporary_path.replace(path)

    except OSError:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save {path.name}.",
        )


def read_documents() -> list:
    return read_json_file(METADATA_FILE)


def save_documents(documents: list) -> None:
    write_json_file(METADATA_FILE, documents)


def read_reminders() -> list:
    return read_json_file(REMINDERS_FILE)


def save_reminders(reminders: list) -> None:
    write_json_file(REMINDERS_FILE, reminders)


def find_document(document_id: str) -> dict:
    document = next(
        (
            item
            for item in read_documents()
            if item.get("id") == document_id
        ),
        None,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return document


def get_stored_path(document: dict) -> Path:
    stored_name = document.get("stored_name", "")

    # Never allow a stored filename to escape the uploads directory.
    if not stored_name or Path(stored_name).name != stored_name:
        raise HTTPException(
            status_code=500,
            detail="Invalid stored document filename.",
        )

    return UPLOAD_DIR / stored_name


# =========================================================
# PDF TEXT EXTRACTION
# =========================================================

def extract_pdf_text(file_path: Path) -> str:
    """
    Extract selectable text from a PDF.
    Reads at most 100 pages.
    Scanned/image-only PDFs require OCR.
    """

    if file_path.suffix.lower() != ".pdf":
        return ""

    try:
        from pypdf import PdfReader

        reader = PdfReader(str(file_path))
        page_text = []

        for page in reader.pages[:100]:
            page_text.append(page.extract_text() or "")

        return "\n".join(page_text).strip()

    except ImportError:
        print("PDF extraction unavailable: install pypdf.")
        return ""

    except Exception as exc:
        print(
            f"PDF extraction failed for {file_path.name}: "
            f"{type(exc).__name__}: {exc}"
        )
        return ""


def get_document_text(document: dict) -> str:
    """
    Return cached PDF text when the file has not changed.
    Otherwise, extract the text and update the cache.
    """

    path = get_stored_path(document)

    if not path.is_file():
        PDF_TEXT_CACHE.pop(document.get("id"), None)
        return ""

    try:
        stat = path.stat()
        cache_key = document.get("id")
        signature = (stat.st_size, stat.st_mtime_ns)

        cached = PDF_TEXT_CACHE.get(cache_key)

        if cached and cached["signature"] == signature:
            return cached["text"]

        text = extract_pdf_text(path)

        PDF_TEXT_CACHE[cache_key] = {
            "signature": signature,
            "text": text,
        }

        return text

    except OSError as exc:
        print(f"Could not access PDF {path.name}: {exc}")
        return " "

# =========================================================
# PHASE 1 & 2 — DOCUMENT MANAGEMENT
# =========================================================

@app.get("/api/documents")
def list_documents():
    documents = read_documents()

    # Return metadata only. Do not expose server-side file paths.
    return [
        {
            key: value
            for key, value in document.items()
            if key not in {"stored_name"}
        }
        for document in documents
    ]


@app.get("/api/documents/{document_id}")
def get_document_details(document_id: str):
    document = find_document(document_id)

    return {
        key: value
        for key, value in document.items()
        if key != "stored_name"
    }


@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...)):
    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()

    if not original_name:
        raise HTTPException(
            status_code=400,
            detail="Please select a file.",
        )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, PNG, JPG, and JPEG files are supported.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 15 MB.",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The selected file is empty.",
        )

    file_id = uuid.uuid4().hex
    stored_name = f"{file_id}{extension}"
    stored_path = UPLOAD_DIR / stored_name

    try:
        stored_path.write_bytes(content)

        documents = read_documents()

        document = {
            "id": file_id,
            "name": original_name,
            "stored_name": stored_name,
            "size": len(content),
            "category": "Uncategorized",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }

        documents.insert(0, document)
        save_documents(documents)

        return {
            key: value
            for key, value in document.items()
            if key != "stored_name"
        }

    except Exception:
        stored_path.unlink(missing_ok=True)
        raise

    finally:
        await file.close()


@app.patch("/api/documents/{document_id}/category")
def update_document_category(
    document_id: str,
    body: CategoryUpdate,
):
    documents = read_documents()

    document = next(
        (
            item
            for item in documents
            if item.get("id") == document_id
        ),
        None,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    category = body.category.strip()

    if not category:
        raise HTTPException(
            status_code=400,
            detail="Category cannot be empty.",
        )

    document["category"] = category
    save_documents(documents)

    return {
        "id": document_id,
        "category": category,
        "message": "Category updated successfully.",
    }


@app.get("/api/documents/{document_id}/download")
def download_document(document_id: str):
    document = find_document(document_id)
    file_path = get_stored_path(document)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Stored file not found.",
        )

    return FileResponse(
        path=file_path,
        filename=document["name"],
    )


@app.delete("/api/documents/{document_id}")
def delete_document(document_id: str):
    documents = read_documents()

    document = next(
        (
            item
            for item in documents
            if item.get("id") == document_id
        ),
        None,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    file_path = get_stored_path(document)
    file_path.unlink(missing_ok=True)

    save_documents([
        item
        for item in documents
        if item.get("id") != document_id
    ])

    # Remove linked document references from reminders.
    reminders = read_reminders()

    for reminder in reminders:
        if reminder.get("document_id") == document_id:
            reminder["document_id"] = None

    save_reminders(reminders)

    return {
        "message": "Document deleted successfully.",
        "id": document_id,
    }



# =========================================================
# PHASE 3 — AI DOCUMENT ASSISTANT (LOCAL OLLAMA)
# =========================================================

@app.post("/api/assistant/ask")
def ask_about_documents(body: AskQuestion):
    """Answer questions about uploaded PDFs using local Ollama."""

    import urllib.request
    import urllib.error
    import time

    question = body.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question.",
        )

    all_documents = read_documents()

    if body.document_ids:
        selected_ids = set(body.document_ids)
        selected_documents = [
            doc for doc in all_documents
            if doc.get("id") in selected_ids
        ]

        if len(selected_documents) != len(selected_ids):
            raise HTTPException(
                status_code=404,
                detail="One or more selected documents were not found.",
            )
    else:
        selected_documents = all_documents

    if not selected_documents:
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF before asking questions.",
        )

    # Keep the request small for faster local inference.
    max_chars = 3500
    context_parts = []
    sources = []
    total_chars = 0

    for document in selected_documents:
        if Path(document.get("name", "")).suffix.lower() != ".pdf":
            continue
        remaining = max_chars - total_chars
        if remaining <= 0:
             break

        document_text = get_document_text(document)

        if not document_text:
            continue

        excerpt = document_text[:remaining]

        context_parts.append(
            f"DOCUMENT: {document['name']}\n"
            f"CONTENT:\n{excerpt}"
        )

        sources.append({
            "document_id": document["id"],
            "document_name": document["name"],
        })

        total_chars += len(excerpt)

    if not context_parts:
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable PDF text was found. "
                "Make sure your PDFs contain selectable text. "
                "Scanned PDFs require OCR."
            ),
        )

    context = "\n\n".join(context_parts)

    prompt = (
        "You are Cognidoc AI, a document assistant. "
        "Answer using only the supplied document content. "
        "Do not invent facts. Use simple language and short bullets. "
        "For a summary, provide the most important points. "
        "If the documents do not contain the answer, say so.\n\n"
        f"QUESTION:\n{question}\n\n"
        f"DOCUMENTS:\n{context}\n\n"
        "Mention the names of the documents used."
    )

    start_time = time.time()

    try:
        payload = json.dumps({
            "model": "llama3.2",
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "stream": False,
            "options": {
                "num_predict": 120,
            },
        }).encode("utf-8")

        request = urllib.request.Request(
            "http://127.0.0.1:11434/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(
            request,
            timeout=90,
        ) as response:
            result = json.loads(
                response.read().decode("utf-8")
            )

        answer = result.get("message", {}).get("content", "").strip()

        if not answer:
            raise HTTPException(
                status_code=502,
                detail="Ollama returned an empty answer.",
            )

        elapsed = time.time() - start_time
        print(f"Cognidoc AI completed in {elapsed:.1f} seconds.")

        return {
            "answer": answer,
            "sources": sources,
            "model": "llama3.2",
        }

    except HTTPException:
        raise

    except urllib.error.URLError as exc:
        if isinstance(exc.reason, (TimeoutError, OSError)):
            raise HTTPException(
                status_code=504,
                detail=(
                    "Ollama took too long to respond. "
                    "Please try again."
                ),
            )

        raise HTTPException(
            status_code=503,
            detail=(
                "Cannot connect to Ollama. "
                "Ensure Ollama is running and llama3.2 is installed."
            ),
        )

    except Exception as exc:
        print(
            f"Ollama request failed: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=502,
            detail="The local AI service could not answer this question.",
        )


# =========================================================
# PHASE 4 — PERSISTENT REMINDERS
# =========================================================

VALID_PRIORITIES = {"low", "medium", "high"}


def validate_priority(priority: str) -> str:
    normalized = priority.strip().lower()

    if normalized not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Priority must be low, medium, or high.",
        )

    return normalized


def serialize_reminder(reminder: dict) -> dict:
    result = dict(reminder)

    due_date = result.get("due_date")

    if due_date:
        result["due_date"] = str(due_date)

    return result


@app.get("/api/reminders")
def list_reminders():
    reminders = read_reminders()

    return sorted(
        [serialize_reminder(item) for item in reminders],
        key=lambda item: (
            item.get("completed", False),
            item.get("due_date") or "9999-12-31",
            item.get("created_at") or "",
        ),
    )


@app.post("/api/reminders")
def create_reminder(body: ReminderCreate):
    title = body.title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Reminder title cannot be empty.",
        )

    priority = validate_priority(body.priority)

    if body.document_id:
        find_document(body.document_id)

    reminders = read_reminders()

    reminder = {
        "id": uuid.uuid4().hex,
        "title": title,
        "description": body.description.strip(),
        "due_date": (
            body.due_date.isoformat()
            if body.due_date
            else None
        ),
        "priority": priority,
        "completed": False,
        "document_id": body.document_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    reminders.insert(0, reminder)
    save_reminders(reminders)

    return serialize_reminder(reminder)


@app.patch("/api/reminders/{reminder_id}")
def update_reminder(
    reminder_id: str,
    body: ReminderUpdate,
):
    reminders = read_reminders()

    reminder = next(
        (
            item for item in reminders
            if item.get("id") == reminder_id
        ),
        None,
    )

    if reminder is None:
        raise HTTPException(
            status_code=404,
            detail="Reminder not found.",
        )

    changes = body.model_dump(exclude_unset=True)

    for key, value in changes.items():
        if key == "title":
            value = value.strip()

            if not value:
                raise HTTPException(
                    status_code=400,
                    detail="Reminder title cannot be empty.",
                )

        elif key == "description":
            value = value.strip()

        elif key == "priority" and value is not None:
            value = validate_priority(value)

        elif key == "due_date":
            value = value.isoformat() if value else None

        elif key == "document_id" and value:
            find_document(value)

        reminder[key] = value

    reminder["updated_at"] = datetime.now(timezone.utc).isoformat()

    save_reminders(reminders)

    return serialize_reminder(reminder)


@app.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: str):
    reminders = read_reminders()

    reminder = next(
        (
            item for item in reminders
            if item.get("id") == reminder_id
        ),
        None,
    )

    if reminder is None:
        raise HTTPException(
            status_code=404,
            detail="Reminder not found.",
        )

    save_reminders([
        item for item in reminders
        if item.get("id") != reminder_id
    ])

    return {
        "message": "Reminder deleted successfully.",
        "id": reminder_id,
    }


# =========================================================
# PHASE 5 — DASHBOARD SUMMARY
# =========================================================

@app.get("/api/dashboard")
def dashboard_summary():
    documents = read_documents()
    reminders = read_reminders()

    total_size = sum(
        int(document.get("size", 0) or 0)
        for document in documents
    )

    category_counts = {}

    for document in documents:
        category = document.get("category") or "Uncategorized"

        category_counts[category] = (
            category_counts.get(category, 0) + 1
        )

    today = date.today()

    pending_reminders = [
        item for item in reminders
        if not item.get("completed", False)
    ]

    overdue_count = 0

    for reminder in pending_reminders:
        due_date = reminder.get("due_date")

        if due_date:
            try:
                if date.fromisoformat(due_date) < today:
                    overdue_count += 1
            except ValueError:
                pass

    recent_documents = sorted(
        documents,
        key=lambda item: item.get("uploaded_at", ""),
        reverse=True,
    )[:5]

    return {
        "total_documents": len(documents),
        "total_size": total_size,
        "category_count": len(category_counts),
        "categories": category_counts,
        "pending_reminders": len(pending_reminders),
        "overdue_reminders": overdue_count,
        "recent_documents": [
            {
                key: value
                for key, value in document.items()
                if key != "stored_name"
            }
            for document in recent_documents
        ],
    }