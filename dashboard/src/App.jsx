import { useEffect, useState } from "react";
import SkeetForm from "./SkeetForm";
import "./App.css";

function App() {
  const [skeets, setSkeets] = useState([]);
  const [selectedReplies, setSelectedReplies] = useState([]);

  const fetchSkeets = () => {
    fetch("/api/skeets")
      .then((res) => res.json())
      .then((data) => setSkeets(data));
  };

  useEffect(() => {
    fetchSkeets();
  }, []);

  const fetchReplies = (skeetId) => {
    fetch(`/api/replies/${skeetId}`)
      .then((res) => res.json())
      .then((data) => setSelectedReplies(data.replies || []));
  };

  const refreshReactions = (skeetId) => {
    fetch(`/api/reactions/${skeetId}`).then(() => {
      fetch("/api/skeets")
        .then((res) => res.json())
        .then((data) => setSkeets(data));
    });
  };

  return (
    <div className="dashboard">
      <h1>Bluesky Kampagnen Dashboard</h1>
      <SkeetForm onSkeetCreated={fetchSkeets} />

      <ul className="skeet-list">
        {skeets.map((skeet) => (
          <li key={skeet.id} className="skeet-item">
            <p>{skeet.content}</p>
            <p>
              Likes: {skeet.likesCount} | Reposts: {skeet.repostsCount}
            </p>
            <button onClick={() => fetchReplies(skeet.id)}>
              Replies anzeigen
            </button>
            <button onClick={() => refreshReactions(skeet.id)}>
              Reaktionen aktualisieren
            </button>
          </li>
        ))}
      </ul>

      {selectedReplies.length > 0 && (
        <div className="replies-section">
          <h2>Replies</h2>
          <ul>
            {selectedReplies.map((reply, index) => (
              <li key={index}>
                <strong>{reply.authorHandle}:</strong> {reply.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
