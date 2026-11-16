import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, Files, MessageCircle, CalendarDays, Settings,
  Search, Bell, Plus, Upload, FileText, FileSpreadsheet, FileImage,
  MoreHorizontal, ArrowUpRight, ArrowDownRight, Clock3, CheckCircle2,
  Circle, Sparkles, Send, ChevronRight, Menu, X, FolderOpen, ShieldCheck,
  Zap, Trash2, Download, Command, ArrowRight, CalendarCheck, CircleHelp,
  Filter, Paperclip, UserRound, CloudUpload, Check, LogOut,
} from "lucide-react";
import "./App.css";
import "./DocumentsResponsive.css";
/* =========================================================
   COGNIDOC AI — API CONNECTION
   Backend: http://127.0.0.1:8000
   ========================================================= */
   function mapBackendReminder(reminder) {
  const priority = reminder.priority || "medium";

  return {
    ...reminder,
    id: reminder.id,
    title: reminder.title || "Untitled reminder",
    due_date: reminder.due_date || reminder.date || "",
    due_time: reminder.due_time || reminder.time || "10:00",
    priority:
      priority.charAt(0).toUpperCase() +
      priority.slice(1).toLowerCase(),
    description: reminder.description || "Personal task",
    done: reminder.done ?? reminder.completed ?? false,
    demo: false,
  };
}
const API_BASE = "http://127.0.0.1:8000/api";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {
      // Use the default error message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response;
}

async function apiGetDocuments() {
  const data = await apiRequest("/documents");
  return Array.isArray(data) ? data : data.documents || [];
}

async function apiUploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest("/documents", {
    method: "POST",
    body: formData,
  });
}

async function apiDeleteDocument(id) {
  return apiRequest(`/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function apiDownloadDocument(id, filename) {
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(id)}/download`,
  );

  if (!response.ok) {
    throw new Error("Unable to download this document.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "document";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function apiGetReminders() {
  const data = await apiRequest("/reminders");
  return Array.isArray(data) ? data : data.reminders || [];
}

async function apiCreateReminder(reminder) {
  return apiRequest("/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reminder),
  });
}

async function apiUpdateReminder(id, changes) {
  return apiRequest(`/reminders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
}

async function apiDeleteReminder(id) {
  return apiRequest(`/reminders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function apiAskAssistant(question, documentIds = []) {
  return apiRequest("/assistant/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      document_ids: documentIds,
    }),
  });
}

/* =========================================================
   INITIAL DATA — shown only when the backend is unavailable
   ========================================================= */

const initialDocuments = [
  {
    id: 1,
    name: "Machine Learning Notes.pdf",
    category: "Education",
    size: "2.4 MB",
    date: "Today, 10:42 AM",
    type: "pdf",
    color: "blue",
    demo: true,
  },
  {
    id: 2,
    name: "Internship Offer Letter.pdf",
    category: "Career",
    size: "846 KB",
    date: "Yesterday",
    type: "pdf",
    color: "purple",
    demo: true,
  },
  {
    id: 3,
    name: "Project Requirements.docx",
    category: "Projects",
    size: "1.2 MB",
    date: "Oct 29, 2026",
    type: "doc",
    color: "cyan",
    demo: true,
  },
  {
    id: 4,
    name: "Monthly Expenses.xlsx",
    category: "Finance",
    size: "524 KB",
    date: "Oct 28, 2026",
    type: "sheet",
    color: "green",
    demo: true,
  },
  {
    id: 5,
    name: "UI Design References.png",
    category: "Projects",
    size: "3.1 MB",
    date: "Oct 27, 2026",
    type: "image",
    color: "orange",
    demo: true,
  },
];

const initialReminders = [
  {
    id: 1,
    title: "Submit project documentation",
    detail: "College project",
    date: "Today",
    time: "5:00 PM",
    due_date: "",
    priority: "High",
    done: false,
    demo: true,
  },
  {
    id: 2,
    title: "Review internship offer",
    detail: "Career",
    date: "Tomorrow",
    time: "10:00 AM",
    due_date: "",
    priority: "Medium",
    done: false,
    demo: true,
  },
  {
    id: 3,
    title: "Organize semester notes",
    detail: "Education",
    date: "Nov 4",
    time: "2:30 PM",
    due_date: "",
    priority: "Low",
    done: false,
    demo: true,
  },
];

const navGroups = [
  {
    label: "WORKSPACE",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "documents", label: "My Documents", icon: Files, badge: "05" },
      { id: "assistant", label: "AI Assistant", icon: MessageCircle, tag: "AI" },
      { id: "reminders", label: "Reminders", icon: CalendarDays },
    ],
  },
];

const pageInfo = {
  dashboard: {
    eyebrow: "YOUR WORKSPACE",
    title: "Good to see you!",
    description: "Everything important, all in one place.",
  },
  documents: {
    eyebrow: "YOUR LIBRARY",
    title: "My Documents",
    description: "Your files, organized and ready whenever you need them.",
  },
  assistant: {
    eyebrow: "YOUR AI COMPANION",
    title: "AI Assistant",
    description: "A smarter way to understand and work with your information.",
  },
  reminders: {
    eyebrow: "STAY ON TRACK",
    title: "Reminders",
    description: "Keep your important tasks and deadlines under control.",
  },
  settings: {
    eyebrow: "PREFERENCES",
    title: "Settings",
    description: "Manage your workspace preferences.",
  },
};

function formatFileSize(bytes = 0) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function mapBackendDocument(doc) {
  const name =
    doc.name ||
    doc.filename ||
    doc.original_filename ||
    doc.original_name ||
    "Untitled document";

  const type = getFileType({ name });
  const rawSize = doc.size ?? doc.file_size ?? doc.size_bytes ?? 0;

  let date = "Recently uploaded";

  const uploadedAt = doc.uploaded_at || doc.created_at || doc.date;

  if (uploadedAt) {
    const parsedDate = new Date(uploadedAt);

    if (!Number.isNaN(parsedDate.getTime())) {
      date = parsedDate.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }

  return {
    id: doc.id ?? doc.document_id,
    name,
    category: doc.category || "Projects",
    size:
      typeof rawSize === "number"
        ? formatFileSize(rawSize)
        : String(rawSize),
    date,
    type,
    color:
      type === "sheet"
        ? "green"
        : type === "doc"
          ? "cyan"
          : type === "image"
            ? "orange"
            : type === "file"
              ? "purple"
              : "blue",
  };
}
function getFileType(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "doc";
  if (/\.(xls|xlsx|csv)$/.test(name)) return "sheet";
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(name)) return "image";
  return "file";
}

function getFileIcon(type) {
  if (type === "sheet") return FileSpreadsheet;
  if (type === "image") return FileImage;
  return FileText;
}

function colorForType(type) {
  if (type === "sheet") return "green";
  if (type === "doc") return "cyan";
  if (type === "image") return "orange";
  return "blue";
}

function displayDate(value) {
  if (!value) return "Recently added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}




/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({
  activePage,
  setActivePage,
  mobileOpen,
  setMobileOpen,
  documents,
  reminders,
}) {
  const incompleteReminders = reminders.filter((item) => !item.done).length;

  function navigate(page) {
    setActivePage(page);
    setMobileOpen(false);
  }

  return (
    <>
      {mobileOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <FolderOpen size={23} strokeWidth={2.4} />
            <span className="brand-sparkle"><Sparkles size={10} /></span>
          </div>
          <div className="brand-copy">
            <span className="brand-name">cogni<span>doc</span></span>
            <span className="brand-caption">AI WORKSPACE</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <button className="workspace-switcher" onClick={() => navigate("dashboard")}>
          <div className="workspace-avatar"><Command size={17} /></div>
          <div className="workspace-info">
         <strong>Personal workspace</strong>
         <span>Your document workspace</span>
          </div>
          <ChevronRight size={16} className="workspace-chevron" />
        </button>

        <nav className="sidebar-navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                const badge =
                  item.id === "documents"
                    ? String(documents.length).padStart(2, "0")
                    : item.id === "reminders" && incompleteReminders > 0
                      ? String(incompleteReminders).padStart(2, "0")
                      : item.badge;

                return (
                  <button
                    key={item.id}
                    className={`nav-item ${active ? "nav-item-active" : ""}`}
                    onClick={() => navigate(item.id)}
                  >
                    <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                    {item.tag && <span className="nav-ai-tag">{item.tag}</span>}
                    {badge && <span className="nav-badge">{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="nav-group nav-bottom-group">
            <p className="nav-group-label">PREFERENCES</p>
            <button
              className={`nav-item ${activePage === "settings" ? "nav-item-active" : ""}`}
              onClick={() => navigate("settings")}
            >
              <Settings size={19} strokeWidth={1.8} />
              <span>Settings</span>
            </button>
            <button
              className="nav-item"
              onClick={() => window.alert("Contact your workspace administrator for help.")}
            >
              <CircleHelp size={19} strokeWidth={1.8} />
              <span>Help & support</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-spacer" />

        <div className="storage-card">
          <div className="storage-heading">
            <div className="storage-icon"><CloudUpload size={17} /></div>
            <span>Storage</span>
            <span className="storage-percent">24%</span>
          </div>
          <div className="storage-track"><span /></div>
          <p>1.2 GB of 5 GB used</p>
          <button
            className="storage-upgrade"
            onClick={() => window.alert("Storage plans will be available in a future version.")}
          >
            Explore plans <ArrowRight size={14} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">U</div>
          <div className="user-details">
            <strong>Your Workspace</strong>
            <span>Personal account</span>
          </div>
          <button
            className="icon-button user-menu-button"
            aria-label="Account menu"
            onClick={() => navigate("settings")}
          >
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   TOP BAR AND REUSABLE COMPONENTS
   ========================================================= */

function Topbar({ activePage, setMobileOpen, searchQuery, setSearchQuery }) {
  const info = pageInfo[activePage] || pageInfo.dashboard;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-button mobile-menu-button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={21} />
        </button>
        <div className="breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={14} />
          <strong>{info.title}</strong>
        </div>
      </div>

      <div className="topbar-actions">
        <label className="global-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search documents and content"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="topbar-divider" />
        <button
          className="icon-button notification-button"
          aria-label="Notifications"
          onClick={() => window.alert("You're all caught up!")}
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
        <div className="topbar-avatar">U</div>
      </div>
    </header>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && (
        <button className="primary-button" onClick={onAction}>
          <ActionIcon size={17} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, description, icon: Icon, tone, trend, trendType = "up" }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon stat-icon-${tone}`}>
          <Icon size={21} strokeWidth={1.9} />
        </div>
        {trend && (
          <span className={`stat-trend stat-trend-${trendType}`}>
            {trendType === "down" ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {trend}
          </span>
        )}
      </div>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-description">{description}</div>
    </article>
  );
}

function DocumentIcon({ type, color }) {
  const Icon = getFileIcon(type);
  const label = type === "sheet" ? "XLS" : type === "doc" ? "DOC" : type === "image" ? "IMG" : type === "file" ? "FILE" : "PDF";

  return (
    <div className={`document-file-icon file-icon-${color}`}>
      <Icon size={22} strokeWidth={1.8} />
      <span>{label}</span>
    </div>
  );
}

function DocumentTable({ documents, onDelete, onDownload, compact = false }) {
  const [openMenu, setOpenMenu] = useState(null);

  if (!documents.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><FolderOpen size={28} /></div>
        <h3>No documents found</h3>
        <p>Try another search or upload a document to get started.</p>
      </div>
    );
  }

  return (
    <div className="document-table-wrap">
      <table className="document-table">
        <thead>
          <tr>
            <th>DOCUMENT NAME</th>
            <th>CATEGORY</th>
            <th>FILE SIZE</th>
            {!compact && <th>LAST MODIFIED</th>}
            <th className="table-actions-heading"> </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td>
                <div className="document-name-cell">
                  <DocumentIcon type={doc.type} color={doc.color} />
                  <div className="document-name-text">
                    <strong title={doc.name}>{doc.name}</strong>
                    <span>{doc.type.toUpperCase()} document</span>
                  </div>
                </div>
              </td>
              <td>
                <span className={`category-pill category-${String(doc.category).toLowerCase()}`}>
                  {doc.category}
                </span>
              </td>
              <td className="file-size">{doc.size}</td>
              {!compact && <td className="document-date">{doc.date}</td>}
              <td className="table-actions-cell">
                <div className="document-actions">
                  <button
                    className="icon-button row-action"
                    aria-label={`Download ${doc.name}`}
                    title="Download"
                    onClick={() => onDownload(doc)}
                  >
                    <Download size={16} />
                  </button>
                  <div className="menu-anchor">
                    <button
                      className="icon-button row-action"
                      aria-label={`More options for ${doc.name}`}
                      onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                    {openMenu === doc.id && (
                      <div className="document-menu">
                        <button onClick={() => { onDownload(doc); setOpenMenu(null); }}>
                          <Download size={15} /> Download
                        </button>
                        <button
                          className="danger-menu-item"
                          onClick={() => { onDelete(doc.id); setOpenMenu(null); }}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   AI ASSISTANT
   ========================================================= */

function AIWelcome({ onSuggestion }) {
  const suggestions = [
    {
      icon: FileText,
      title: "Summarize a document",
      description: "Get the key points in seconds",
      prompt: "Summarize my uploaded documents.",
    },
    {
      icon: Search,
      title: "Find information",
      description: "Locate details across your files",
      prompt: "What information can you find in my documents?",
    },
    {
      icon: CalendarCheck,
      title: "Plan my tasks",
      description: "Turn notes into actionable steps",
      prompt: "Help me make a plan for my upcoming tasks.",
    },
  ];

  return (
    <div className="ai-welcome">
      <div className="ai-orb"><Sparkles size={29} /></div>
      <span className="ai-welcome-label"><span className="live-dot" /> YOUR PERSONAL AI</span>
      <h2>What can I help you<br />with today?</h2>
      <p>
        Ask questions, organize your thoughts, or get help
        <br className="desktop-break" /> making sense of your information.
      </p>
      <div className="ai-suggestion-grid">
        {suggestions.map((item) => {
          const Icon = item.icon;
          return (
            <button className="ai-suggestion-card" key={item.title} onClick={() => onSuggestion(item.prompt)}>
              <div className="suggestion-icon"><Icon size={19} /></div>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <ArrowUpRight className="suggestion-arrow" size={17} />
            </button>
          );
        })}
      </div>
      <div className="ai-demo-note">
        <ShieldCheck size={16} />
        <span>Ask questions about documents uploaded to your workspace.</span>
      </div>
    </div>
  );
}

function AssistantPage({ documents }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  async function askQuestion(question) {
    if (!question.trim() || loading) return;

    const cleanQuestion = question.trim();
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text: cleanQuestion },
    ]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await apiAskAssistant(cleanQuestion, selectedDocumentIds);
      const answer =
        response.answer ||
        response.response ||
        response.message ||
        "The assistant returned an empty response.";

     setMessages((current) => [
  ...current,
  {
    id: `${Date.now()}-assistant`,
    role: "assistant",
    text: answer,
    sources: response.sources || [],
  },
]);
    } catch (err) {
      setError(err.message || "Unable to contact the AI assistant.");
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          text: `I couldn't get an answer from the backend. ${err.message || "Please check that the backend is running and your AI API key is configured."}`,
        },
      ]);
    } finally {
      setLoading(false);
      window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    askQuestion(input);
  }

    return (
    <div className="assistant-layout">
      <section className="assistant-main-card">
        {/* Chat header */}
        <div className="assistant-topline">
          <div className="assistant-profile">
            <div className="assistant-avatar">
              <Sparkles size={20} />
            </div>

            <div>
              <strong>Cognidoc AI Assistant</strong>
              <span>
                <span className="live-dot" />
                {loading ? "Thinking..." : "Your document assistant"}
              </span>
            </div>
          </div>

          <span className="assistant-version">AI WORKSPACE</span>
        </div>

        {/* Conversation area */}
        <div className="assistant-conversation">
          {messages.length === 0 ? (
            <AIWelcome onSuggestion={askQuestion} />
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message chat-message-${message.role}`}
                >
                  <div className="chat-message-avatar">
                    {message.role === "assistant" ? (
                      <Sparkles size={16} />
                    ) : (
                      <UserRound size={16} />
                    )}
                  </div>

                  <div className="chat-message-body">
                    <strong>
                      {message.role === "assistant" ? "Cognidoc AI" : "You"}
                    </strong>

                    <p>{message.text}</p>

                    {message.role === "assistant" &&
                      message.sources?.length > 0 && (
                        <div className="chat-message-sources">
                          <strong>Sources</strong>

                          {message.sources.map((source, index) => (
                            <span
                              key={
                                source.document_id ??
                                `${source.document_name}-${index}`
                              }
                            >
                              <FileText size={14} />
                              {source.document_name || "Uploaded document"}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {/* AI typing indicator */}
              {loading && (
                <div className="chat-message chat-message-assistant">
                  <div className="chat-message-avatar">
                    <Sparkles size={16} />
                  </div>

                  <div className="chat-message-body">
                    <strong>Cognidoc AI</strong>

                    <div
                      className="assistant-typing"
                      aria-label="AI is generating a response"
                    >
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="assistant-error" role="alert">
            {error}
          </div>
        )}

        {/* Chat input */}
        <form className="assistant-input-area" onSubmit={handleSubmit}>
          <div className="assistant-input-box">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              placeholder="Ask anything about your documents..."
              aria-label="Ask Cognidoc AI a question"
              rows={1}
              disabled={loading}
            />

            <button
              type="submit"
              className="assistant-send-button"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="assistant-input-hint">
            AI-generated answers may need verification. Press Enter to send;
            Shift + Enter for a new line.
          </div>
        </form>
      </section>
    </div>
  );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function DashboardPage({ documents, reminders, onUpload, onNavigate, onDelete, onDownload }) {
  const upcoming = reminders.filter((item) => !item.done).slice(0, 3);
  const [activityPeriod, setActivityPeriod] = useState("This week");

  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE"
        title="Good to see you!"
        description="Here's what's happening with your documents today."
        action
        actionLabel="Upload document"
        actionIcon={Upload}
        onAction={onUpload}
      />

      <section className="welcome-banner">
        <div className="welcome-banner-content">
          <div className="welcome-chip"><Sparkles size={13} /> YOUR SPACE, SIMPLIFIED</div>
          <h2>Your knowledge.<br /><span>One smart workspace.</span></h2>
          <p>All your important files, notes, and reminders,<br className="desktop-break" /> organized in one place.</p>
          <button className="welcome-cta" onClick={() => onNavigate("documents")}>
            Explore your documents <ArrowRight size={16} />
          </button>
        </div>
        <div className="welcome-illustration" aria-hidden="true">
          <div className="illustration-glow" />
          <div className="illustration-back-card">
            <div className="illustration-lines"><span /><span /><span /><span /></div>
          </div>
          <div className="illustration-front-card">
            <div className="illustration-file-icon"><FileText size={29} /></div>
            <div className="illustration-file-lines"><span /><span /><span /></div>
            <div className="illustration-check"><Check size={16} /></div>
          </div>
          <div className="illustration-floating illustration-float-one"><Sparkles size={18} /></div>
          <div className="illustration-floating illustration-float-two"><CheckCircle2 size={19} /></div>
          <div className="illustration-dots">· · · · · · · · ·</div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Total documents" value={documents.length} description="Files in your workspace" icon={Files} tone="blue" trend="Your library" />
         <StatCard
  label="Storage used"
  value={formatFileSize(
    documents.reduce(
      (total, doc) => total + (Number(doc.sizeBytes) || 0),
      0
    )
  )}
  description="Total size of uploaded documents"
  icon={FolderOpen}
  tone="purple"
/>
        <StatCard label="Active reminders" value={reminders.filter((item) => !item.done).length} description="Tasks to keep in mind" icon={CalendarCheck} tone="orange" trend="Stay organized" />
        <StatCard label="AI conversations" value="Ready" description="Ask your first question" icon={Sparkles} tone="green" trend="Get started" />
      </section>

      <div className="dashboard-columns">
        <section className="content-card recent-documents-card">
          <div className="card-heading">
            <div><h2>Recent documents</h2><p>Your files, right where you need them.</p></div>
            <button className="text-button" onClick={() => onNavigate("documents")}>View all <ArrowRight size={15} /></button>
          </div>
          <DocumentTable documents={documents.slice(0, 4)} compact onDelete={onDelete} onDownload={onDownload} />
        </section>

        <div className="dashboard-right-column">
          <section className="content-card activity-card">
            <div className="card-heading">
              <div><h2>Workspace activity</h2><p>Your document library</p></div>
              <select className="period-select" value={activityPeriod} onChange={(event) => setActivityPeriod(event.target.value)} aria-label="Activity period">
                <option>This week</option><option>This month</option>
              </select>
            </div>
            <div className="activity-summary">
              <div><strong>{documents.length}</strong><span>Files in library</span></div>
              <div className="activity-summary-icon"><Files size={19} /></div>
            </div>
            <div className="activity-chart">
              {[36, 54, 42, 74, 48, 88, 63, 96, 52, 70, 44, 80].map((height, index) => (
                <div className="chart-column" key={index}>
                  <span style={{ height: `${height}%` }} className={index === 7 ? "chart-bar-highlight" : ""} />
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {activityPeriod === "This week"
                ? <><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></>
                : <><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></>}
            </div>
            <p className="chart-demo-note"><span className="chart-legend-dot" /> Illustrative activity · Real analytics coming later</p>
          </section>

          <section className="content-card reminders-card">
            <div className="card-heading">
              <div><h2>Upcoming reminders</h2><p>Don't let important things slip.</p></div>
              <button className="icon-button card-more-button" aria-label="View all reminders" onClick={() => onNavigate("reminders")}><MoreHorizontal size={20} /></button>
            </div>
            <div className="mini-reminder-list">
              {upcoming.length === 0 ? (
                <div className="mini-empty-state"><CheckCircle2 size={21} /><span>You're all caught up!</span></div>
              ) : upcoming.map((reminder) => (
                <div className="mini-reminder" key={reminder.id}>
                  <div className="reminder-date-box"><CalendarDays size={17} /></div>
                  <div className="mini-reminder-info"><strong>{reminder.title}</strong><span>{reminder.date} · {reminder.time}</span></div>
                  <span className={`priority-dot priority-${reminder.priority.toLowerCase()}`} />
                </div>
              ))}
            </div>
            <button className="reminders-footer-button" onClick={() => onNavigate("reminders")}>Manage reminders <ArrowRight size={15} /></button>
          </section>
        </div>
      </div>

      <section className="ai-promo-card">
        <div className="ai-promo-icon"><Sparkles size={23} /></div>
        <div className="ai-promo-content">
          <span>MEET YOUR AI ASSISTANT</span>
          <h3>Your documents have more to tell.</h3>
          <p>Ask questions, explore information, and make your files more useful.</p>
        </div>
        <button className="secondary-button" onClick={() => onNavigate("assistant")}>Explore AI assistant <ArrowRight size={16} /></button>
      </section>
    </>
  );
}

/* =========================================================
   DOCUMENTS PAGE
   ========================================================= */

function DocumentsPage({ documents, onUpload, onDelete, onDownload, searchQuery, loading }) {
  const [category, setCategory] = useState("All files");
  const [fileType, setFileType] = useState("All types");

  const categories = [
    "All files",
    ...Array.from(new Set(documents.map((doc) => doc.category || "Uncategorized")))
      .filter((item) => item !== "All files")
      .sort((a, b) => a.localeCompare(b)),
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = category === "All files" || (doc.category || "Uncategorized") === category;
    const extension = String(doc.name || "").split(".").pop().toLowerCase();
    const isPdf = extension === "pdf";
    const isImage = ["png", "jpg", "jpeg"].includes(extension);
    const matchesFileType =
      fileType === "All types" ||
      (fileType === "PDF" && isPdf) ||
      (fileType === "Images" && isImage);
    const searchableText = `${doc.name || ""} ${doc.category || "Uncategorized"} ${doc.type || ""}`.toLowerCase();
    const matchesSearch = !searchQuery || searchableText.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesFileType && matchesSearch;
  });

  const pdfCount = documents.filter((doc) => String(doc.name || "").toLowerCase().endsWith(".pdf")).length;
  const imageCount = documents.filter((doc) => /\.(png|jpe?g)$/i.test(doc.name || "")).length;

  function resetFilters() {
    setCategory("All files");
    setFileType("All types");
  }

  return (
    <div className="documents-workspace">
      <PageHeading
        eyebrow="YOUR LIBRARY"
        title="My Documents"
        description="All your important files, organized in one secure workspace."
        action
        actionLabel="Upload document"
        actionIcon={Upload}
        onAction={onUpload}
      />

      <section className="document-overview-strip documents-hero-strip">
        <div className="document-overview-icon"><Files size={23} /></div>
        <div className="documents-hero-copy">
          <strong>{documents.length} {documents.length === 1 ? "document" : "documents"} in your library</strong>
          <p>Your files are synced with your Cognidoc backend.</p>
        </div>
        <div className="documents-hero-stats">
          <span><FileText size={15} /> {pdfCount} PDFs</span>
          <span><FileImage size={15} /> {imageCount} Images</span>
        </div>
      </section>

      <section className="content-card documents-page-card documents-library-card">
        <div className="documents-library-heading">
          <div>
            <h2>Your library</h2>
            <p>Search, filter, and manage your uploaded files.</p>
          </div>
          <span className="documents-result-count">{filteredDocuments.length} results</span>
        </div>

        <div className="documents-filter-toolbar">
          <label className="documents-filter-field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="documents-filter-field">
            <span>File type</span>
            <select value={fileType} onChange={(event) => setFileType(event.target.value)} aria-label="Filter by file type">
              <option value="All types">All types</option>
              <option value="PDF">PDF files</option>
              <option value="Images">Images (PNG, JPG, JPEG)</option>
            </select>
          </label>
          <button className="filter-button documents-reset-button" onClick={resetFilters} type="button">
            <Filter size={16} /> Reset filters
          </button>
          <button className="primary-button documents-toolbar-upload" onClick={onUpload} type="button">
            <Upload size={16} /> Upload files
          </button>
        </div>

        {loading ? (
          <div className="documents-loading-state"><span className="documents-loader" /> Loading your documents…</div>
        ) : (
          <DocumentTable documents={filteredDocuments} onDelete={onDelete} onDownload={onDownload} />
        )}

        <div className="document-table-footer">
          <span>Showing {filteredDocuments.length} of {documents.length} documents</span>
          <span>Changes are saved to your backend.</span>
        </div>
      </section>

      <section className="upload-dropzone documents-upload-prompt">
        <div className="dropzone-icon"><CloudUpload size={27} /></div>
        <h3>Add more to your library</h3>
        <p>Upload PDF, PNG, JPG, or JPEG files up to 15 MB each.</p>
        <button className="secondary-button" onClick={onUpload} type="button"><Upload size={16} /> Choose files</button>
      </section>
    </div>
  );
}

/* =========================================================
   REMINDERS PAGE
   ========================================================= */

function RemindersPage({ reminders, setReminders, setNotice }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [priority, setPriority] = useState("Medium");
  const [saving, setSaving] = useState(false);

  const completed = reminders.filter((item) => item.done).length;
  const pending = reminders.filter((item) => !item.done).length;

  async function toggleReminder(reminder) {
    const nextDone = !reminder.done;
    if (reminder.demo) {
      setReminders((current) => current.map((item) => item.id === reminder.id ? { ...item, done: nextDone } : item));
      return;
    }

    try {
      await apiUpdateReminder(reminder.id, { completed: nextDone });
      setReminders((current) => current.map((item) => item.id === reminder.id ? { ...item, done: nextDone } : item));
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function addReminder(event) {
    event.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    try {
      const created = await apiCreateReminder({
        title: title.trim(),
        description: "Personal task",
        due_date: date || null,
        priority: priority.toLowerCase(),
      });

      const mapped = mapBackendReminder({
        ...created,
        title: created.title || title.trim(),
        due_date: created.due_date ?? date,
        priority: created.priority || priority.toLowerCase(),
        description: created.description || "Personal task",
      });

      setReminders((current) => [mapped, ...current.filter((item) => !item.demo)]);
      setTitle("");
      setDate("");
      setTime("10:00");
      setPriority("Medium");
      setShowForm(false);
      setNotice("Reminder created successfully.");
    } catch (error) {
      setNotice(`Could not create reminder: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeReminder(reminder) {
    if (!window.confirm(`Delete "${reminder.title}"?`)) return;

    if (!reminder.demo) {
      try {
        await apiDeleteReminder(reminder.id);
      } catch (error) {
        setNotice(error.message);
        return;
      }
    }

    setReminders((current) => current.filter((item) => item.id !== reminder.id));
  }

  return (
    <>
      <PageHeading
        eyebrow="STAY ORGANIZED"
        title="Reminders"
        description="A little planning goes a long way. Keep your priorities clear."
        action
        actionLabel="New reminder"
        actionIcon={Plus}
        onAction={() => setShowForm((value) => !value)}
      />

      <section className="reminder-stats-grid">
        <div className="reminder-stat-card"><div className="reminder-stat-icon reminder-stat-blue"><CalendarDays size={20} /></div><div><span>Total reminders</span><strong>{reminders.length}</strong></div></div>
        <div className="reminder-stat-card"><div className="reminder-stat-icon reminder-stat-orange"><Clock3 size={20} /></div><div><span>Pending tasks</span><strong>{pending}</strong></div></div>
        <div className="reminder-stat-card"><div className="reminder-stat-icon reminder-stat-green"><CheckCircle2 size={20} /></div><div><span>Completed</span><strong>{completed}</strong></div></div>
      </section>

      {showForm && (
        <section className="content-card reminder-form-card">
          <div className="card-heading">
            <div><h2>Create a reminder</h2><p>Add a task to your personal reminder list.</p></div>
            <button className="icon-button" aria-label="Close reminder form" onClick={() => setShowForm(false)}><X size={19} /></button>
          </div>
          <form className="reminder-form" onSubmit={addReminder}>
            <label>Task name
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Submit assignment" required />
            </label>
            <div className="reminder-form-row">
              <label>Due date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
              <label>Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select>
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving}><Plus size={17} /> {saving ? "Saving..." : "Create reminder"}</button>
            </div>
          </form>
        </section>
      )}

      <section className="content-card full-reminders-card">
        <div className="card-heading"><div><h2>Your tasks</h2><p>Check off tasks as you complete them.</p></div><span className="task-count">{pending} remaining</span></div>
        <div className="full-reminder-list">
          {reminders.length === 0 ? (
            <div className="empty-state"><CalendarDays size={29} /><h3>No reminders yet</h3><p>Create your first reminder to stay organized.</p></div>
          ) : reminders.map((reminder) => (
            <div className={`full-reminder-row ${reminder.done ? "reminder-completed" : ""}`} key={reminder.id}>
              <button className={`reminder-check ${reminder.done ? "reminder-check-done" : ""}`} aria-label={reminder.done ? "Mark incomplete" : "Mark complete"} onClick={() => toggleReminder(reminder)}>
                {reminder.done ? <Check size={15} /> : <Circle size={20} />}
              </button>
              <div className="full-reminder-info"><strong>{reminder.title}</strong><span>{reminder.detail}</span></div>
              <div className="full-reminder-date"><CalendarDays size={15} /><span>{reminder.date}</span></div>
              <div className="full-reminder-time"><Clock3 size={15} /><span>{reminder.time}</span></div>
              <span className={`priority-pill priority-pill-${reminder.priority.toLowerCase()}`}>{reminder.priority}</span>
              <button className="icon-button delete-reminder-button" aria-label={`Delete ${reminder.title}`} onClick={() => removeReminder(reminder)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      <div className="reminder-tip">
        <div className="reminder-tip-icon"><Sparkles size={18} /></div>
        <div><strong>A little tip</strong><p>Break large tasks into smaller steps to make progress easier to track.</p></div>
      </div>
    </>
  );
}

/* =========================================================
   SETTINGS PAGE
   ========================================================= */

function SettingsPage({ backendConnected }) {
  const [notifications, setNotifications] = useState(true);
  const [compactView, setCompactView] = useState(false);

  return (
    <>
      <PageHeading eyebrow="YOUR PREFERENCES" title="Settings" description="Make your Cognidoc workspace feel like yours." />
      <section className="content-card settings-card">
        <div className="settings-section-heading">
          <div className="settings-heading-icon"><UserRound size={20} /></div>
          <div><h2>Profile & workspace</h2><p>Your personal workspace details.</p></div>
        </div>
        <div className="settings-profile-row">
          <div className="settings-profile-avatar">U</div>
          <div><strong>Personal workspace</strong><span>Personal account</span></div>
          <span className="demo-status-pill"><span /> {backendConnected ? "Connected" : "Offline"}</span>
        </div>
        <div className="settings-divider" />
        <div className="settings-section-heading">
          <div className="settings-heading-icon"><Bell size={20} /></div>
          <div><h2>Preferences</h2><p>Control how your workspace behaves.</p></div>
        </div>
        <div className="setting-option">
          <div><strong>Notifications</strong><p>Show notification indicators in the workspace.</p></div>
          <button className={`toggle-switch ${notifications ? "toggle-on" : ""}`} role="switch" aria-checked={notifications} aria-label="Toggle notifications" onClick={() => setNotifications((value) => !value)}><span /></button>
        </div>
        <div className="setting-option">
          <div><strong>Compact document list</strong><p>Use a more condensed document table.</p></div>
          <button className={`toggle-switch ${compactView ? "toggle-on" : ""}`} role="switch" aria-checked={compactView} aria-label="Toggle compact view" onClick={() => setCompactView((value) => !value)}><span /></button>
        </div>
        <div className="settings-divider" />
        <div className="settings-section-heading">
          <div className="settings-heading-icon"><ShieldCheck size={20} /></div>
          <div><h2>Privacy & security</h2><p>Learn how the app handles your data.</p></div>
        </div>
        <div className="settings-info-box">
          <ShieldCheck size={19} />
          <p>Your documents are uploaded to your backend. Keep your AI API key in the backend environment, never in frontend code.</p>
        </div>
      </section>
    </>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState([]);
const visibleDocuments = documents;
  const [reminders, setReminders] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef(null);
  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      setDocumentsLoading(true);

      try {
        const backendDocuments = await apiGetDocuments();
        if (!active) return;
        setDocuments(backendDocuments.map(mapBackendDocument));
        setBackendConnected(true);
        setNotice("");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load documents:", error);
        setDocuments([]);
        setBackendConnected(false);
        setNotice(`Could not load documents. Check that the backend is running. ${error.message}`);
      }

      try {
        const backendReminders = await apiGetReminders();
        if (!active) return;
        setReminders(backendReminders.map(mapBackendReminder));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load reminders:", error);
        setReminders([]);
        setNotice((current) => current || `Could not load reminders. ${error.message}`);
      } finally {
        if (active) setDocumentsLoading(false);
      }
    }

    loadWorkspace();
    return () => { active = false; };
  }, []);
  

async function uploadDocuments(event) {
  const selectedFiles = Array.from(event.target.files || []);

  if (selectedFiles.length === 0) return;

  let uploadedCount = 0;
  const failedFiles = [];

  setDocumentsLoading(true);

  try {
    for (const file of selectedFiles) {
      try {
        await apiUploadDocument(file);
        uploadedCount += 1;
      } catch (error) {
        failedFiles.push(`${file.name}: ${error.message}`);
      }
    }

    // Refresh the document list from the backend
    const backendDocuments = await apiGetDocuments();

    setDocuments(backendDocuments.map(mapBackendDocument));
    setBackendConnected(true);

    if (uploadedCount > 0) {
      setActivePage("documents");
      setNotice(`${uploadedCount} file(s) uploaded successfully.`);
    }

    if (failedFiles.length > 0) {
      window.alert(
        `${uploadedCount} file(s) uploaded successfully.\n\n` +
          `Failed uploads:\n${failedFiles.join("\n")}`,
      );
    }
  } catch (error) {
    setNotice(`Could not refresh your documents: ${error.message}`);
  } finally {
    setDocumentsLoading(false);
    event.target.value = "";
  }
}

async function deleteDocument(id) {
  const doc = documents.find((item) => item.id === id);

  if (!doc) return;

  if (!window.confirm(`Are you sure you want to delete "${doc.name}"?`)) {
    return;
  }

  // Handle sample documents locally
  if (doc.demo) {
    setDocuments((current) =>
      current.filter((item) => item.id !== id),
    );

    setNotice("Sample document removed from the current view.");
    return;
  }

  try {
    await apiDeleteDocument(id);

    setDocuments((current) =>
      current.filter((item) => item.id !== id),
    );

    setNotice("Document deleted successfully.");
  } catch (error) {
    setNotice(`Could not delete document: ${error.message}`);
  }
}

async function downloadDocument(doc) {
  if (doc.demo) {
    setNotice(
      "This is sample data and has no real file attached. Upload the actual file to download it from the backend.",
    );
    return;
  }

  try {
    await apiDownloadDocument(doc.id, doc.name);
  } catch (error) {
    setNotice(`Could not download document: ${error.message}`);
  }
}

function openUpload() {
  fileInputRef.current?.click();
}

function navigate(page) {
  setActivePage(page);
  setMobileOpen(false);
}

const info = pageInfo[activePage] || pageInfo.dashboard;

return (
  <div className="app-shell">
    <input
      ref={fileInputRef}
      className="visually-hidden"
      type="file"
      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
      multiple
      onChange={uploadDocuments}
      aria-label="Upload documents"
    />

    <Sidebar
      activePage={activePage}
      setActivePage={navigate}
      mobileOpen={mobileOpen}
      setMobileOpen={setMobileOpen}
      documents={documents}
      reminders={reminders}
    />

    <main className="main-area">
      <Topbar
        activePage={activePage}
        setMobileOpen={setMobileOpen}
        searchQuery={searchQuery}
        setSearchQuery={(value) => {
          setSearchQuery(value);

          if (value.trim() && activePage !== "documents") {
            setActivePage("documents");
          }
        }}
      />
```

        <div className="page-content">
          {notice && (
            <div className="workspace-notice" role="status">
              <span>{notice}</span>
              <button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button>
            </div>
          )}

          {activePage === "dashboard" && (
            <DashboardPage
              documents={documents}
              reminders={reminders}
              onUpload={openUpload}
              onNavigate={navigate}
              onDelete={deleteDocument}
              onDownload={downloadDocument}
            />
          )}

          {activePage === "documents" && (
            <DocumentsPage
              documents={visibleDocuments}
              onUpload={openUpload}
              onDelete={deleteDocument}
              onDownload={downloadDocument}
              searchQuery={searchQuery}
              loading={documentsLoading}
            />
          )}

          {activePage === "assistant" && <AssistantPage documents={documents} />}

          {activePage === "reminders" && (
            <RemindersPage
              reminders={reminders}
              setReminders={setReminders}
              setNotice={setNotice}
            />
          )}

          {activePage === "settings" && <SettingsPage backendConnected={backendConnected} />}

          <footer className="app-footer">
            <span>© 2026 Cognidoc AI</span>
            <span className="footer-status"><span /> {backendConnected ? "Backend connected" : "Backend disconnected"}</span>
            <span>Made for a more organized you.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
/* Fix sidebar scrolling */
