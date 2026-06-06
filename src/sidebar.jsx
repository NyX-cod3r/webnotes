function Sidebar({ notes, selectedId, onSelectNote, searchQuery, onSearchChange, onCreateNote, onDeleteNote, onShareNote, onDownloadNote }) {
    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <h1>WebNotes</h1>
                <div className="sidebar__controls">
                    <label className="sidebar__search">
                        <span className="sr-only">Search notes</span>
                        <input type="search" placeholder="Search notes" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
                    </label>

                    <button type="button" className="button button--primary sidebar__create" onClick={onCreateNote} aria-label="New note">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="icon">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </button>
                </div>
            </div>

            <ul className="note-list">
                {notes.map((note) => {
                    const isActive = note.id === selectedId;

                    return (
                        <li key={note.id}>
                            <div className={isActive ? "note-list__item note-list__item--active" : "note-list__item"}>
                                <button type="button" className="note-list__select" onClick={() => onSelectNote(note.id)}>
                                    <strong>{note.title}</strong>
                                    <span>{note.preview}</span>
                                </button>

                                <div className="note-list__rail">
                                    <span className="note-list__updated">{note.updatedAt}</span>

                                    <div className="note-list__menu">
                                        <button type="button" className="note-list__icon-button" aria-label="More actions">
                                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="icon icon--more">
                                                <circle cx="12" cy="5" r="1.6" />
                                                <circle cx="12" cy="12" r="1.6" />
                                                <circle cx="12" cy="19" r="1.6" />
                                            </svg>
                                        </button>

                                        <div className="note-list__actions" aria-label="Note actions">
                                            <button type="button" className="note-list__action" aria-label="Delete note" onClick={() => onDeleteNote(note.id)}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="icon">
                                                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 7h10l-1 12H8L7 7Z" />
                                                </svg>
                                            </button>
                                            <button type="button" className="note-list__action" aria-label="Share note" onClick={() => onShareNote(note)}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="icon">
                                                    <path d="M14 9V5l7 7-7 7v-4.1c-4.5 0-7.5 1.4-10 4.1 1-5.5 4-11 10-11Z" />
                                                </svg>
                                            </button>
                                            <button type="button" className="note-list__action" aria-label="Download note" onClick={() => onDownloadNote(note)}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="icon">
                                                    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}

export default Sidebar;