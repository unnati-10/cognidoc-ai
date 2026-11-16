\# Cognidoc AI

\### AI-Powered Personal Document Intelligence Platform



Cognidoc AI is an intelligent document management platform designed to help users organize, access, and understand their important documents in one place.



It combines document management, AI-powered question answering, and reminders in a single, user-friendly workspace.



\## ✨ Features



\- \*\*Document Management:\*\* Upload, view, download, and delete documents.

\- \*\*AI Assistant:\*\* Ask questions about your documents and receive AI-generated responses.

\- \*\*Smart Document Understanding:\*\* Get summaries and useful information from uploaded documents.

\- \*\*Reminder Management:\*\* Create, update, complete, and delete reminders.

\- \*\*Dashboard:\*\* View document statistics and important workspace information.

\- \*\*Responsive Design:\*\* Access the application through desktop and mobile screens.

\- \*\*Backend Integration:\*\* Store and manage application data through a FastAPI backend.



\## 🛠️ Technologies Used



\### Frontend

\- React.js

\- Vite

\- JavaScript

\- HTML5

\- CSS3



\### Backend

\- Python

\- FastAPI

\- REST APIs

\- Ollama (Local AI model)



\## 📁 Project Structure



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



\## ⚙️ Installation and Setup



\### Prerequisites



Install the following before running the project:



\- Python

\- Node.js and npm

\- Ollama



\### 1. Clone the Repository



```bash

git clone https://github.com/unnati-10/cognidoc-ai.git

cd cognidoc-ai

```



\### 2. Start the Backend



Open a terminal:



```bash

cd backend

```



Activate the existing Python virtual environment, or create one and install the project's Python dependencies.



Start the FastAPI server using:



```bash

python -m uvicorn app.main:app --reload

```



Backend URL:



```text

http://127.0.0.1:8000

```



\### 3. Start the Frontend



Open another terminal:



```bash

cd frontend

npm install

npm run dev

```



Frontend URL:



```text

http://localhost:5173

```



\### 4. Run the Local AI Model



Install and start Ollama, then make sure the model configured by the backend is available locally.



The current project uses:



```text

llama3.2

```



\## 🎯 Project Objective



The objective of Cognidoc AI is to simplify personal document management by combining file organization, AI-powered document interaction, and reminder management into one intelligent platform.



It aims to reduce the effort required to search through documents and make important information easier to access.



\## 🚀 Future Enhancements



\- Advanced document search and filtering

\- Improved AI-based document analysis

\- Document categorization

\- Enhanced security and authentication

\- Cloud storage integration

\- Additional file format support



\## 👩‍💻 Developer



\*\*Unnati\*\*



B.Tech – Computer Science and Engineering (Artificial Intelligence)



GitHub: https://github.com/unnati-10



\---



\*Built as a project to explore AI-powered document intelligence and modern full-stack development.\*

