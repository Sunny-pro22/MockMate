
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Interview from "./interview";
import Jarvis from "./Jarvis";
import "./App.css";

function Home() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {

    return localStorage.getItem("mode") === "dark";
  });

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "";
    localStorage.setItem("mode", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className="card">
      <div className="theme-toggle">
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>
      <h1 className="title">Welcome to the Dashboard</h1>
      <p className="subtitle">Choose an option to continue:</p>
      <div className="button-group">
        <button className="btn blue" onClick={() => navigate("/interview")}>
          🚀 Go to Interview
        </button>
        <button className="btn green" onClick={() => navigate("/jarvis")}>
          🤖 Go to Jarvis
        </button>
      </div>
    </div>
  );
}


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/jarvis" element={<Jarvis />} />
      </Routes>
    </Router>
  );
}

export default App;