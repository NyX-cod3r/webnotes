import Sidebar from "./sidebar";
import "./App.css";
import { useMemo, useState, useRef, useEffect } from "react";

// Strip HTML tags helper to generate plain text preview and search
function stripHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || doc.body.innerText || "";
}

// IndexedDB Helper Functions to persist Directory Handles across app restarts
const DB_NAME = "WebNotesDB";
const STORE_NAME = "handles";
const KEY_NAME = "notesDirHandle";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function storeDirectoryHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, KEY_NAME);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getStoredDirectoryHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY_NAME);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function clearStoredDirectoryHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(KEY_NAME);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function verifyPermission(handle, readWrite = true) {
  const options = {};
  if (readWrite) {
    options.mode = "readwrite";
  }
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }
  if ((await handle.requestPermission(options)) === "granted") {
    return true;
  }
  return false;
}

async function readNotesFromDirectory(dirHandle) {
  try {
    const fileHandle = await dirHandle.getFileHandle("notes.json");
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (err) {
    // Return empty array if file does not exist
    return [];
  }
}

async function writeNotesToDirectory(dirHandle, notes) {
  try {
    const fileHandle = await dirHandle.getFileHandle("notes.json", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(notes, null, 2));
    await writable.close();
  } catch (err) {
    console.error("Failed to write notes.json to local directory:", err);
  }
}

// WYSIWYG Rich-Text Toolbar Component
function RichTextToolbar({ executeCommand, insertTable }) {
  return (
    <div className="notes-toolbar">
      {/* History Group */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          title="Undo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("undo")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Redo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("redo")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>
        </button>
      </div>

      {/* Text Style and Fonts Group */}
      <div className="toolbar-group">
        <select
          className="toolbar-select"
          title="Text Style"
          onChange={(e) => executeCommand("formatBlock", e.target.value)}
          defaultValue=""
        >
          <option value="<p>">Normal Text</option>
          <option value="<h1>">Heading 1</option>
          <option value="<h2>">Heading 2</option>
          <option value="<h3>">Heading 3</option>
          <option value="<blockquote>">Quote</option>
          <option value="<pre>">Code Block</option>
        </select>

        <select
          className="toolbar-select"
          title="Font Family"
          onChange={(e) => executeCommand("fontName", e.target.value)}
          defaultValue=""
        >
          <option value="Inter, sans-serif">Sans-serif</option>
          <option value="Georgia, serif">Serif</option>
          <option value="Fira Code, monospace">Monospace</option>
          <option value="Playfair Display, serif">Playfair</option>
        </select>

        <select
          className="toolbar-select"
          title="Font Size"
          onChange={(e) => executeCommand("fontSize", e.target.value)}
          defaultValue="3"
        >
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Medium</option>
          <option value="5">Large</option>
          <option value="6">Huge</option>
        </select>
      </div>

      {/* Formatting Buttons Group */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          title="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("bold")}
          style={{ fontWeight: "bold" }}
        >
          B
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("italic")}
          style={{ fontStyle: "italic" }}
        >
          I
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("underline")}
          style={{ textDecoration: "underline" }}
        >
          U
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Strikethrough"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("strikeThrough")}
          style={{ textDecoration: "line-through" }}
        >
          S
        </button>
      </div>

      {/* Colors Group */}
      <div className="toolbar-group">
        <label className="toolbar-color-btn" title="Text Color" onMouseDown={(e) => e.preventDefault()}>
          <svg viewBox="0 0 24 24" className="icon">
            <path d="M4 20h16M12 4v12M8 10h8" />
          </svg>
          <input
            type="color"
            defaultValue="#ffffff"
            onChange={(e) => executeCommand("foreColor", e.target.value)}
            style={{ display: "none" }}
          />
        </label>
        <label className="toolbar-color-btn" title="Highlight Color" onMouseDown={(e) => e.preventDefault()}>
          <svg viewBox="0 0 24 24" className="icon">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <input
            type="color"
            defaultValue="#ffff00"
            onChange={(e) => executeCommand("hiliteColor", e.target.value)}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* Alignment Group */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          title="Align Left"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("justifyLeft")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Align Center"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("justifyCenter")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M4 6h16M6 12h12M5 18h14"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Align Right"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("justifyRight")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M4 6h16M10 12h10M6 18h14"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Justify"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("justifyFull")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* Lists & Indentation Group */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          title="Bulleted List"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("insertUnorderedList")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Numbered List"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("insertOrderedList")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M10 6h11M10 12h11M10 18h11M4 6H3v2h2V6M4 12H3v2h2v-2M4 18H3v2h2v-2"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Decrease Indent"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("outdent")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="m11 17-5-5 5-5M21 18H9M21 12H9M21 6H9"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Increase Indent"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("indent")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="m10 7 5 5-5 5M21 18H9M21 12H9M21 6H9"/></svg>
        </button>
      </div>

      {/* Insertables Group */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          title="Insert Table"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertTable}
        >
          <svg viewBox="0 0 24 24" className="icon">
            <path d="M3 3h18v18H3V3zm0 6h18M3 15h18M9 3v18M15 3v18" />
          </svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Horizontal Line"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("insertHorizontalRule")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M5 12h14"/></svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Clear Formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand("removeFormat")}
        >
          <svg viewBox="0 0 24 24" className="icon"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

function App() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [dirHandle, setDirHandle] = useState(null);
  const [dirName, setDirName] = useState("");
  const [needsPermission, setNeedsPermission] = useState(false);

  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
          return true;
        }

        const rawBodyText = stripHtml(note.body);
        return [note.title, rawBodyText, note.preview].some((value) =>
          value.toLowerCase().includes(query),
        );
      }),
    [notes, searchQuery],
  );

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  // Load directory handles and notes on mount
  useEffect(() => {
    async function loadStoredHandle() {
      try {
        const storedHandle = await getStoredDirectoryHandle();
        if (storedHandle) {
          setDirName(storedHandle.name);
          const hasPerm = (await storedHandle.queryPermission({ mode: "readwrite" })) === "granted";
          if (hasPerm) {
            setDirHandle(storedHandle);
            const loadedNotes = await readNotesFromDirectory(storedHandle);
            if (loadedNotes && loadedNotes.length > 0) {
              setNotes(loadedNotes);
              setSelectedId(loadedNotes[0].id);
            }
          } else {
            setNeedsPermission(true);
          }
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem("webnotes_data");
          if (saved) {
            const parsed = JSON.parse(saved);
            setNotes(parsed);
            if (parsed.length > 0) {
              setSelectedId(parsed[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load stored directory handle:", err);
      }
    }
    loadStoredHandle();
  }, []);

  // Save notes dynamically whenever note state changes
  useEffect(() => {
    if (dirHandle) {
      writeNotesToDirectory(dirHandle, notes);
    } else {
      localStorage.setItem("webnotes_data", JSON.stringify(notes));
    }
  }, [notes, dirHandle]);

  // Synchronize editor innerHTML when note selection changes
  useEffect(() => {
    if (selectedNote && editorRef.current && editorRef.current.innerHTML !== selectedNote.body) {
      editorRef.current.innerHTML = selectedNote.body;
    }
  }, [selectedNote?.id]);

  function handleSelectNote(noteId) {
    setSelectedId(noteId);
  }

  function handleCreateNote() {
    const nextId = notes.length ? Math.max(...notes.map((note) => note.id)) + 1 : 1;
    const newNote = {
      id: nextId,
      title: "Untitled note",
      body: "",
      updatedAt: "Just now",
      preview: "Blank note.",
    };

    setNotes([newNote, ...notes]);
    setSelectedId(nextId);
    setSearchQuery("");
  }

  function handleShareNote(note) {
    if (!note) {
      return;
    }

    const plainTextBody = stripHtml(note.body);
    if (navigator.share) {
      navigator.share({
        title: note.title,
        text: plainTextBody,
      });
      return;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${note.title}\n\n${plainTextBody}`);
      alert("Note text copied to clipboard!");
    }
  }

  function handleDownloadNote(note) {
    if (!note) {
      return;
    }

    const plainTextBody = stripHtml(note.body);
    const blob = new Blob([`${note.title}\n\n${plainTextBody}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title || "note"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleteNote(noteId) {
    const noteToDelete = notes.find((note) => note.id === noteId);

    if (!noteToDelete) {
      return;
    }

    const remainingNotes = notes.filter((note) => note.id !== noteId);
    setNotes(remainingNotes);
    setSelectedId((currentSelectedId) =>
      currentSelectedId === noteId ? remainingNotes[0]?.id ?? null : currentSelectedId,
    );
  }

  function handleClearSelection() {
    setSelectedId(null);
  }

  function handleChange(field, value) {
    if (!selectedNote) {
      return;
    }

    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === selectedNote.id
          ? {
              ...note,
              [field]: value,
              updatedAt: "Just now",
              preview:
                field === "body"
                  ? stripHtml(value).trim().slice(0, 96) || "Blank note."
                  : note.preview,
            }
          : note,
      ),
    );
  }

  // Browser directory picker connection handlers
  const handleConnectDirectory = async () => {
    try {
      if (!window.showDirectoryPicker) {
        alert(
          "Local file system sync is not supported in this browser. Please use Chrome, Edge, or other Chromium-based browsers."
        );
        return;
      }
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await storeDirectoryHandle(handle);
      setDirHandle(handle);
      setDirName(handle.name);
      setNeedsPermission(false);

      const loadedNotes = await readNotesFromDirectory(handle);
      if (loadedNotes && loadedNotes.length > 0) {
        const confirmLoad = window.confirm(
          `Found ${loadedNotes.length} notes in folder "${handle.name}". Load folder notes? (Warning: This will overwrite browser memory notes)`
        );
        if (confirmLoad) {
          setNotes(loadedNotes);
          setSelectedId(loadedNotes[0].id);
        } else {
          await writeNotesToDirectory(handle, notes);
        }
      } else {
        await writeNotesToDirectory(handle, notes);
      }
    } catch (err) {
      console.error("Failed to connect local folder:", err);
    }
  };

  const handleAuthorizeDirectory = async () => {
    try {
      const storedHandle = await getStoredDirectoryHandle();
      if (storedHandle) {
        const granted = await verifyPermission(storedHandle, true);
        if (granted) {
          setDirHandle(storedHandle);
          setNeedsPermission(false);
          const loadedNotes = await readNotesFromDirectory(storedHandle);
          if (loadedNotes && loadedNotes.length > 0) {
            setNotes(loadedNotes);
            setSelectedId(loadedNotes[0].id);
          } else {
            await writeNotesToDirectory(storedHandle, notes);
          }
        }
      }
    } catch (err) {
      console.error("Failed to authorize directory handle:", err);
    }
  };

  const handleDisconnectDirectory = async () => {
    if (window.confirm(`Disconnect folder "${dirName}"? Syncing will stop.`)) {
      await clearStoredDirectoryHandle();
      setDirHandle(null);
      setDirName("");
      setNeedsPermission(false);
    }
  };

  // Selection save and restore management for WYSIWYG editing focus
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range;
      }
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  };

  const executeCommand = (command, value = null) => {
    restoreSelection();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleChange("body", editorRef.current.innerHTML);
    }
  };

  const insertTable = () => {
    restoreSelection();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr style="background-color: var(--border);">
            <th style="border: 1px solid var(--border); padding: 8px; text-align: left;">Header 1</th>
            <th style="border: 1px solid var(--border); padding: 8px; text-align: left;">Header 2</th>
            <th style="border: 1px solid var(--border); padding: 8px; text-align: left;">Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid var(--border); padding: 8px;">Cell 1</td>
            <td style="border: 1px solid var(--border); padding: 8px;">Cell 2</td>
            <td style="border: 1px solid var(--border); padding: 8px;">Cell 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid var(--border); padding: 8px;">Cell 4</td>
            <td style="border: 1px solid var(--border); padding: 8px;">Cell 5</td>
            <td style="border: 1px solid var(--border); padding: 8px;">Cell 6</td>
          </tr>
        </tbody>
      </table>
    `;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const div = document.createElement("div");
    div.innerHTML = tableHtml;
    const frag = document.createDocumentFragment();
    let node, lastNode;
    while ((node = div.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);

    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    if (editorRef.current) {
      handleChange("body", editorRef.current.innerHTML);
    }
  };

  const handleCopyText = () => {
    if (!selectedNote) return;
    const text = `${selectedNote.title}\n\n${stripHtml(selectedNote.body)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Note text copied to clipboard!");
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        notes={filteredNotes}
        selectedId={selectedId}
        onSelectNote={handleSelectNote}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onShareNote={handleShareNote}
        onDownloadNote={handleDownloadNote}
      />

      <main className="content">
        {selectedNote ? (
          <div className="main-workspace">
            {/* Top Workspace Header (formatting toolbar & local directory sync status) */}
            <div className="workspace-toolbar">
              <RichTextToolbar executeCommand={executeCommand} insertTable={insertTable} />

              <div className="toolbar-actions-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {/* PWA Local Folder Sync Controllers */}
                {dirHandle ? (
                  <div
                    className="folder-sync-status"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.82rem",
                      background: "#121e16",
                      border: "1px solid #23362a",
                      padding: "0.4rem 0.65rem",
                      borderRadius: "var(--radius-sm)",
                      color: "#a2e3a6"
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="icon" style={{ width: "0.9rem", height: "0.9rem", stroke: "#5cd067", fill: "none" }}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Synced: {dirName}</span>
                    <button
                      type="button"
                      onClick={handleDisconnectDirectory}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ff5555",
                        cursor: "pointer",
                        padding: "0 0.1rem",
                        fontWeight: "bold",
                        fontSize: "0.85rem"
                      }}
                      title="Disconnect Local Folder"
                    >
                      ✕
                    </button>
                  </div>
                ) : needsPermission ? (
                  <button
                    type="button"
                    className="button"
                    onClick={handleAuthorizeDirectory}
                    style={{
                      padding: "0.45rem 0.75rem",
                      fontSize: "0.85rem",
                      borderColor: "#a37015",
                      background: "#251b0f",
                      color: "#ffd580",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer"
                    }}
                  >
                    Authorize Sync
                  </button>
                ) : (
                  window.showDirectoryPicker && (
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={handleConnectDirectory}
                      style={{
                        padding: "0.45rem 0.75rem",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        borderRadius: "var(--radius-sm)"
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="icon" style={{ width: "0.85rem", height: "0.85rem", fill: "none" }}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      Local Sync
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="button button--ghost"
                  title="Copy Plain Text"
                  onClick={handleCopyText}
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)" }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  title="Download Note"
                  onClick={() => handleDownloadNote(selectedNote)}
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)" }}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  title="Share Note"
                  onClick={() => handleShareNote(selectedNote)}
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)" }}
                >
                  Share
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleClearSelection}
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)" }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Bottom Workspace Body (white document area containing title & canvas) */}
            <div className="workspace-body">
              <div className="editor-container">
                <input
                  type="text"
                  className="editor-title-input"
                  placeholder="Title"
                  value={selectedNote.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                />

                <div
                  ref={editorRef}
                  className="editor-content"
                  contentEditable
                  onInput={(e) => handleChange("body", e.target.innerHTML)}
                  onBlur={saveSelection}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onFocus={saveSelection}
                  placeholder="Start typing your note here..."
                />

                <div className="editor-footer">
                  <span>
                    Updated <strong>{selectedNote.updatedAt}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>Create a new note.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
