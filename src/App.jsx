import Sidebar from "./sidebar";
import "./App.css";
import { useMemo, useState } from "react";

const initialNotes = [
  {
    id: 1,
    title: "Project outline",
    body: "Capture the direction, decisions, and next steps here.",
    updatedAt: "Today",
    preview: "Capture the direction, decisions, and next steps here.",
  },
  {
    id: 2,
    title: "Design review",
    body: "Check spacing, hierarchy, empty states, and responsive behavior.",
    updatedAt: "Yesterday",
    preview: "Check spacing, hierarchy, empty states, and responsive behavior.",
  },
];

function App() {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState(initialNotes[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
          return true;
        }

        return [note.title, note.body, note.preview].some((value) =>
          value.toLowerCase().includes(query),
        );
      }),
    [notes, searchQuery],
  );

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

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

    if (navigator.share) {
      navigator.share({
        title: note.title,
        text: note.body,
      });
      return;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
    }
  }

  function handleDownloadNote(note) {
    if (!note) {
      return;
    }

    const blob = new Blob([`${note.title}\n\n${note.body}`], {
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
                ? value.trim().slice(0, 96) || "Blank note."
                : note.preview,
          }
          : note,
      ),
    );
  }

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
        <section className="editor-card">
          {selectedNote ? (
            <>
              <div className="editor-card__toolbar">
                <div>
                  <span className="editor-card__status">Editing note</span>
                  <h2>{selectedNote.title || "Untitled note"}</h2>
                </div>
                <button type="button" className="button button--ghost" onClick={handleClearSelection}>
                  Close
                </button>
              </div>

              <label className="field">
                <span>Title</span>
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Note</span>
                <textarea
                  rows="12"
                  value={selectedNote.body}
                  onChange={(event) => handleChange("body", event.target.value)}
                />
              </label>

              <div className="note-meta">
                <span>Updated</span>
                <strong>{selectedNote.updatedAt}</strong>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state__label">Nothing open</span>
              <p>Create a note from the toolbar to start writing.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


export default App;
