"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Project = { id: string; name: string };
type AppSession = {
  metronomeCustomerId: string;
  stripeCustomerId: string;
  displayName: string;
  projects: Project[];
};
type Message = { role: "user" | "assistant"; text: string };

const MODELS = ["gpt-5.4", "gpt-5.4-mini", "gpt-5.5"] as const;
const API_TYPES = ["flex", "batch", "standard", "priority"] as const;

function getSession(): AppSession | null {
  try {
    const raw = localStorage.getItem("appSession");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AppSession) {
  localStorage.setItem("appSession", JSON.stringify(session));
}

export default function ChatPage() {
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [model, setModel] = useState<string>(MODELS[0]);
  const [apiType, setApiType] = useState<string>(API_TYPES[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/"); return; }
    setSession(s);
    if (s.projects.length > 0) setSelectedProjectId(s.projects[0].id);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleLogout() {
    localStorage.removeItem("appSession");
    router.push("/");
  }

  function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name || !session) return;

    const newProject: Project = { id: crypto.randomUUID(), name };
    const updated = { ...session, projects: [...session.projects, newProject] };
    saveSession(updated);
    setSession(updated);
    setSelectedProjectId(newProject.id);
    setNewProjectName("");
    setShowNewProject(false);
    setMessages([]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedProjectId || !session || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          model,
          apiType,
          projectId: selectedProjectId,
          metronomeCustomerId: session.metronomeCustomerId,
          userName: session.displayName,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Error sending message. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!session) return null;

  const selectedProject = session.projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-gray-900 border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <p className="text-sm text-gray-400">Signed in as</p>
          <p className="font-medium truncate">{session.displayName}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{session.metronomeCustomerId}</p>
          <button
            onClick={handleLogout}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Log out
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Projects</p>
          {session.projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                setSelectedProjectId(project.id);
                setMessages([]);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedProjectId === project.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {project.name}
            </button>
          ))}

          {showNewProject ? (
            <form onSubmit={handleCreateProject} className="mt-2 space-y-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="flex-1 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewProject(false); setNewProjectName(""); }}
                  className="flex-1 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewProject(true)}
              className="w-full mt-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors text-left"
            >
              + New project
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-4 px-6 py-3 border-b border-gray-800 bg-gray-900">
          <span className="text-sm font-medium text-gray-200 mr-2">
            {selectedProject?.name ?? "Select a project"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-gray-400">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500"
            >
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="text-xs text-gray-400 ml-2">API Type</label>
            <select
              value={apiType}
              onChange={(e) => setApiType(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-indigo-500"
            >
              {API_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!selectedProjectId && (
            <div className="text-center text-gray-500 mt-16">
              Create or select a project to start chatting
            </div>
          )}
          {selectedProjectId && messages.length === 0 && (
            <div className="text-center text-gray-500 mt-16">
              Send a message to start the conversation
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-gray-800 text-gray-100 rounded-bl-sm"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-sm text-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex gap-3 px-6 py-4 border-t border-gray-800 bg-gray-900"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedProjectId ? "Message..." : "Select a project first"}
            disabled={!selectedProjectId || loading}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || !selectedProjectId || loading}
            className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
