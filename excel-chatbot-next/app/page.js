'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, FileSpreadsheet, Bot, User, Sparkles, LogOut, Loader2, Database } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Lightweight inline Markdown → JSX renderer (bold, italic, newlines)
function renderMarkdown(text) {
  if (!text) return null;
  // Split on newlines first, then process inline formatting per line
  return text.split('\n').map((line, lineIdx) => {
    // Process inline formatting: **bold** and *italic*
    const parts = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      if (match[1] !== undefined) {
        parts.push(<strong key={match.index}>{match[1]}</strong>);
      } else if (match[2] !== undefined) {
        parts.push(<em key={match.index}>{match[2]}</em>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex));
    return <p key={lineIdx} style={{marginBottom: lineIdx < text.split('\n').length - 1 ? '6px' : 0}}>{parts.length ? parts : '\u00A0'}</p>;
  });
}

const CHART_COLORS = [
  '#10a37f','#5b5ef4','#f59e0b','#ef4444','#06b6d4',
  '#8b5cf6','#ec4899','#84cc16','#f97316','#14b8a6',
  '#a855f7','#eab308','#3b82f6','#22c55e','#e11d48'
];

// ── INTERACTIVE PIE CHART (Chart.js) ──
function PieChart({ labels, values }) {
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderColor: '#212121',
      borderWidth: 2,
      hoverOffset: 8
    }]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#ececec', font: { size: 12 }, padding: 16, boxWidth: 12 }
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((ctx.parsed / total) * 100).toFixed(1);
            const val = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(ctx.parsed);
            return ` ${ctx.label}: ${val} (${pct}%)`;
          }
        }
      }
    }
  };
  return <div style={{ maxWidth: 520, margin: '0 auto' }}><Pie data={data} options={options} /></div>;
}

// ── INTERACTIVE BAR CHART (Chart.js) ──
function BarChart({ labels, values }) {
  const data = {
    labels,
    datasets: [{
      label: 'Value',
      data: values,
      backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'cc'),
      borderColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 1,
      borderRadius: 4,
    }]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(ctx.parsed.y);
            return ` ${val}`;
          }
        }
      }
    },
    scales: {
      x: { ticks: { color: '#8e8ea0', maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#8e8ea0', callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(1)+'K' : v }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };
  return <div style={{ maxWidth: 560 }}><Bar data={data} options={options} /></div>;
}

export default function ChatApp() {
  const [apiKey, setApiKey] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Autocomplete state
  const [columns, setColumns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  // Restore session from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    const dbReady = localStorage.getItem('db_ready');
    if (savedKey && dbReady) {
      setApiKey(savedKey);
      setIsReady(true);
    }
  }, []);

  // Fetch column names for autocomplete once the DB is ready
  useEffect(() => {
    if (!isReady) return;
    fetch('/api/columns')
      .then(r => r.json())
      .then(d => setColumns(d.columns || []))
      .catch(() => {});
  }, [isReady]);

  // Auto-scroll to the bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!apiKey.trim().startsWith('sk-')) {
      alert("Please enter a valid OpenAI API key starting with 'sk-'");
      return;
    }
    if (!file && !localStorage.getItem('db_ready')) {
      alert("Please select an Excel file to analyze.");
      return;
    }

    setIsUploading(true);

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/init", { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      } catch (err) {
        alert("Failed to load data: " + err.message);
        setIsUploading(false);
        return;
      }
    }

    localStorage.setItem('openai_api_key', apiKey.trim());
    localStorage.setItem('db_ready', 'true');
    setIsReady(true);
    setIsUploading(false);
  };

  const clearSession = () => {
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('db_ready');
    setIsReady(false);
    setMessages([]);
    setApiKey('');
    setFile(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userQuery = inputText.trim();
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userQuery }]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), message: userQuery })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.text || "I found some results but couldn't format them.",
        chart: data.chart || null
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: "I couldn't quite calculate that. Can you try rephrasing your question or being more specific?"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    // Find the last word/phrase being typed
    const lastWord = val.split(/\s+/).pop();
    if (lastWord.length >= 2) {
      const filtered = columns.filter(col =>
        col.toLowerCase().includes(lastWord.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 6));
      setActiveSuggestion(0);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (col) => {
    // Replace the last word with the selected column name
    const words = inputText.split(/\s+/);
    words[words.length - 1] = col;
    setInputText(words.join(' ') + ' ');
    setSuggestions([]);
  };
  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && activeSuggestion >= 0)) {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // ── SETUP SCREEN ──
  if (!isReady) {
    return (
      <div className="setup-page">
        <div className="setup-card">
          <div style={{ background: 'linear-gradient(135deg, #10a37f, #1a7a5e)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Sparkles size={28} color="white" />
          </div>
          <h2>Sadhana Bot</h2>
          <p>Upload your Excel file and enter your OpenAI key to start analyzing your data instantly.</p>

          <form className="setup-form" onSubmit={handleStart}>
            <input
              type="password"
              className="api-input"
              placeholder="OpenAI API Key (sk-...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <label htmlFor="file-upload" className={`file-drop ${file ? 'has-file' : ''}`}>
              <FileSpreadsheet size={28} color={file ? 'var(--primary)' : 'var(--text-muted)'} />
              <span>{file ? file.name : 'Click to upload your Excel file'}</span>
              <span style={{ fontSize: '0.75rem' }}>.xlsx or .xls</span>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ display: 'none' }}
            />

            <button
              className="btn-primary"
              type="submit"
              disabled={!apiKey.trim() || (!file && !localStorage.getItem('db_ready')) || isUploading}
            >
              {isUploading
                ? <><Loader2 className="spinner" size={18} /> Loading Data...</>
                : 'Get Started'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── MAIN CHAT UI ──
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ background: 'linear-gradient(135deg, #10a37f, #1a7a5e)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="white" />
          </div>
          <h1>Sadhana Bot</h1>
        </div>
        <div className="sidebar-body">
          <p className="sidebar-label">Current Dataset</p>
          <div style={{ padding: '10px 10px', borderRadius: 10, background: 'rgba(16,163,127,0.08)', border: '1px solid rgba(16,163,127,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={16} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>data.xlsx</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ready to query</div>
            </div>
          </div>
        </div>
        <div className="sidebar-footer">
          <button className="sidebar-btn danger" onClick={clearSession}>
            <LogOut size={15} />
            Change Dataset
          </button>
        </div>
      </aside>

      {/* Chat panel */}
      <main className="chat-panel">
        <div className="chat-header">
          <span className="chat-header-title">
            <span className="status-dot" />
            Analytics Ready
          </span>
        </div>

        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div style={{ background: 'linear-gradient(135deg, #10a37f, #1a7a5e)', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={24} color="white" />
              </div>
              <h2>Ask me anything about your data</h2>
              <p>Try: "Which country has the highest trade sales?" or "Total sales in 2023"</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-row ${msg.sender}`}>
                  <div className={`avatar ${msg.sender}`}>
                    {msg.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
                  </div>
                  <div className="message-content" style={{ maxWidth: msg.chart ? '100%' : undefined }}>
                    <div className="message-text">
                      {msg.sender === 'bot' ? renderMarkdown(msg.text) : msg.text}
                    </div>
                    {msg.chart && (
                      <div style={{ marginTop: 16, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#8e8ea0', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {msg.chart.type === 'pie' ? '🥧 Pie Chart' : '📊 Bar Chart'} — {msg.chart.valueKey}
                        </div>
                        {msg.chart.type === 'pie'
                          ? <PieChart labels={msg.chart.labels} values={msg.chart.values} />
                          : <BarChart labels={msg.chart.labels} values={msg.chart.values} />
                        }
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="typing-row">
                  <div className="avatar bot"><Bot size={18} /></div>
                  <div className="typing-indicator">
                    <div className="dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                    <span className="typing-text">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="input-wrapper" style={{ position: 'relative' }}>
            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: '#1e1e1e',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
                zIndex: 200
              }}>
                {suggestions.map((col, i) => (
                  <div
                    key={col}
                    onClick={() => applySuggestion(col)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      background: i === activeSuggestion ? 'rgba(16,163,127,0.15)' : 'transparent',
                      color: i === activeSuggestion ? 'var(--primary)' : 'var(--text)',
                      borderLeft: i === activeSuggestion ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'background 0.1s, color 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={() => setActiveSuggestion(i)}
                  >
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, fontFamily: 'monospace' }}>COL</span>
                    {col}
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="chat-input"
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your data..."
              disabled={isTyping}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!inputText.trim() || isTyping}
            >
              <Send size={16} />
            </button>
          </div>
          <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  );
}
