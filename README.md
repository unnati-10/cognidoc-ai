# Cognidoc AI

### AI-Powered Personal Document Intelligence Platform

Cognidoc AI is an intelligent document management platform that helps users organize, manage, and understand their important documents using AI.

It brings document management, AI-powered assistance, and reminders together in one simple and user-friendly workspace.

---

## Overview

Managing multiple documents and finding important information can be time-consuming. Cognidoc AI aims to simplify this process by providing a centralized platform where users can upload documents, ask questions about their content, and manage important reminders.

## Key Features

| Feature | Description |
|---|---|
| Document Management | Upload, view, download, and delete documents. |
| AI Assistant | Ask questions and get AI-generated answers from documents. |
| Document Understanding | Generate summaries and extract useful information. |
| Reminder Management | Create, update, complete, and delete reminders. |
| Dashboard | View document statistics and workspace information. |
| Responsive Interface | Use the application on desktop and mobile devices. |

## Technology Stack

**Frontend**
- React.js
- Vite
- JavaScript
- HTML5
- CSS3

**Backend**
- Python
- FastAPI
- REST APIs

**AI Integration**
- Ollama
- Llama 3.2

## Project Structure

```text
cognidoc-ai/
│
├── backend/
│   └── app/
│       └── main.py
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── App.jsx
│       ├── App.css
│       ├── DocumentsResponsive.css
│       ├── api.js
│       ├── index.css
│       └── main.jsx
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Getting Started

### Prerequisites

Make sure the following are installed:

- Python
- Node.js and npm
- Ollama

### 1. Clone the Repository

```bash
git clone https://github.com/unnati-10/cognidoc-ai.git
cd cognidoc-ai
```

### 2. Run the Backend

Open a terminal:

```bash
cd backend
```

Activate your Python virtual environment and install the project's dependencies.

Start the backend:

```bash
python -m uvicorn app.main:app --reload
```

Backend URL: `http://127.0.0.1:8000`

### 3. Run the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

### 4. Start the AI Model

Install and run Ollama. Make sure the configured model is available:

```bash
ollama run llama3.2
```

## Project Objective

The main objective of Cognidoc AI is to make document management smarter and more efficient through artificial intelligence.

The platform aims to reduce the effort involved in organizing documents, finding information, and keeping track of important tasks.

## Future Enhancements

- Advanced document search and filtering
- Improved AI-powered document analysis
- Smart document categorization
- User authentication and security
- Cloud storage integration
- Support for additional document formats

## Developer

**Unnati**

B.Tech – Computer Science and Engineering (Artificial Intelligence)

GitHub: [unnati-10](https://github.com/unnati-10)

---

*Building smarter ways to manage and understand documents with AI.*