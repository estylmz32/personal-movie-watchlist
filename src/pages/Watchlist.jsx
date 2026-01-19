import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getWatchlist,
  removeFromWatchlist,
  toggleWatched,
  updateNote,
  updateRating,
} from "../utils/watchlist";
import "../styles/watchlist.css";

function Stars({ value, disabled, onChange }) {
  return (
    <div className={disabled ? "stars starsDisabled" : "stars"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= (value || 0) ? "star starOn" : "star"}
          disabled={disabled}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
      <button
        type="button"
        className="starClear"
        disabled={disabled || value == null}
        onClick={() => onChange(null)}
      >
        Clear
      </button>
    </div>
  );
}

function Dropdown({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const label = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : placeholder || "Select";
  }, [value, options, placeholder]);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="dd" ref={wrapRef}>
      <button
        type="button"
        className="ddBtn"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ddLabel">{label}</span>
        <span className={open ? "ddCaret ddCaretUp" : "ddCaret"}>▾</span>
      </button>

      {open && (
        <div className="ddMenu" role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={o.value === value ? "ddItem ddItemOn" : "ddItem"}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              role="option"
              aria-selected={o.value === value}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Watchlist() {
  const [list, setList] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [savedId, setSavedId] = useState(null);
  const [draftNotes, setDraftNotes] = useState({});

  const load = () => setList(getWatchlist());

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const obj = {};
    for (const m of list) obj[m.id] = m.note || "";
    setDraftNotes(obj);
  }, [list]);

  useEffect(() => {
    if (savedId == null) return;
    const t = setTimeout(() => setSavedId(null), 1000);
    return () => clearTimeout(t);
  }, [savedId]);

  const stats = useMemo(() => {
    const total = list.length;
    const watchedCount = list.filter((m) => m.watched).length;
    const remaining = total - watchedCount;
    const progress = total === 0 ? 0 : Math.round((watchedCount / total) * 100);

    const rated = list.filter((m) => m.rating != null);
    const avgRating =
      rated.length === 0
        ? null
        : Math.round((rated.reduce((s, m) => s + Number(m.rating), 0) / rated.length) * 10) / 10;

    return { total, watchedCount, remaining, progress, avgRating };
  }, [list]);

  const visibleList = useMemo(() => {
    let out = [...list];

    const q = query.trim().toLowerCase();
    if (q) out = out.filter((m) => (m.title || "").toLowerCase().includes(q));

    if (filter === "watched") out = out.filter((m) => m.watched);
    if (filter === "unwatched") out = out.filter((m) => !m.watched);

    if (sort === "newest") out.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    if (sort === "az") out.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sort === "watchedFirst") out.sort((a, b) => Number(b.watched) - Number(a.watched));

    return out;
  }, [list, query, filter, sort]);

  const saveNote = (id) => {
    const note = (draftNotes[id] ?? "").trimEnd();
    updateNote(id, note);
    load();
    setSavedId(id);
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "watched", label: "Watched" },
    { value: "unwatched", label: "Unwatched" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest added" },
    { value: "az", label: "Title A–Z" },
    { value: "watchedFirst", label: "Watched first" },
  ];

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1 className="title">Watchlist</h1>
          <p className="subtitle">Search, filter, and track what you’ve watched.</p>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="statLabel">Total</div>
            <div className="statValue">{stats.total}</div>
          </div>

          <div className="stat">
            <div className="statLabel">Watched</div>
            <div className="statValue">{stats.watchedCount}</div>
          </div>

          <div className="stat">
            <div className="statLabel">Remaining</div>
            <div className="statValue">{stats.remaining}</div>
          </div>

          <div className="stat">
            <div className="statLabel">Avg Rating</div>
            <div className="statValue">{stats.avgRating == null ? "-" : stats.avgRating}</div>
          </div>

          <div className="progressWrap" aria-label="Watch progress">
            <div className="progressBar">
              <div className="progressFill" style={{ width: `${stats.progress}%` }} />
            </div>
            <div className="progressText">{stats.progress}%</div>
          </div>
        </div>
      </header>

      <section className="controls">
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
        />

        <Dropdown value={filter} options={filterOptions} onChange={setFilter} placeholder="Filter" />
        <Dropdown value={sort} options={sortOptions} onChange={setSort} placeholder="Sort" />
      </section>

      <section className="content">
        {visibleList.length === 0 ? (
          <div className="empty">
            <div className="emptyTitle">No results</div>
            <div className="emptyText">Try changing the search/filter or add more movies.</div>
          </div>
        ) : (
          <ul className="grid">
            {visibleList.map((m) => (
              <li key={m.id} className="card">
                <div className="cardTop">
                  <div className="cardTitle">
                    <Link className="movieLink" to={`/details/${m.id}`}>
                      {m.title}
                    </Link>
                    <div className="year">
                      {m.release_date?.slice(0, 4) ? `(${m.release_date.slice(0, 4)})` : ""}
                    </div>
                  </div>

                  <div className={m.watched ? "badge badgeOk" : "badge"}>
                    {m.watched ? "Watched ✓" : "Not watched"}
                  </div>
                </div>

                <div className="ratingRow">
                  <div className="ratingLabel">{m.watched ? "Your rating" : "Watch first to rate"}</div>
                  <Stars
                    value={m.rating}
                    disabled={!m.watched}
                    onChange={(v) => {
                      updateRating(m.id, v);
                      load();
                      setSavedId(m.id);
                    }}
                  />
                </div>

                <div className="noteWrap">
                  <input
                    className="input noteInput"
                    value={draftNotes[m.id] ?? ""}
                    onChange={(e) => setDraftNotes((p) => ({ ...p, [m.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveNote(m.id);
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setDraftNotes((p) => ({ ...p, [m.id]: m.note || "" }));
                        e.currentTarget.blur();
                      }
                    }}
                    placeholder="Add a note... (Enter to save)"
                  />
                  <div className={savedId === m.id ? "savedBadge savedBadgeOn" : "savedBadge"}>Saved</div>
                </div>

                <div className="cardActions">
                  <button
                    className="btn"
                    onClick={() => {
                      toggleWatched(m.id);
                      load();
                    }}
                  >
                    {m.watched ? "Mark unwatched" : "Mark watched"}
                  </button>

                  <button
                    className="btn btnDanger"
                    onClick={() => {
                      removeFromWatchlist(m.id);
                      load();
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
