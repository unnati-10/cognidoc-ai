const API_BASE_URL = "http://127.0.0.1:8000/api";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // Keep the default error message if the response isn't JSON.
    }

    throw new Error(message);
  }

  return response;
}

export async function getDocuments() {
  const response = await apiRequest("/documents");
  const data = await response.json();

  // Support either a list or an object containing a list.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.documents)) return data.documents;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest("/documents", {
    method: "POST",
    body: formData,
  });

  return response.json();
}

export async function deleteDocumentFromAPI(id) {
  await apiRequest(`/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function downloadDocumentFromAPI(id, filename) {
  const response = await apiRequest(
    `/documents/${encodeURIComponent(id)}/download`,
  );

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename || "document";
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser time to begin downloading before revoking the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}