'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, FileSpreadsheet, Loader2, Bot, User, KeyRound, Database } from 'lucide-react';

export default function ChatApp() {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Initial Load: Check local storage for API key 
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    
    if (savedKey) {
        setApiKey(savedKey);
        setIsApiKeySet(true);
        setMessages([
          {
            id: Date.now(),
            sender: 'bot',
            text: "Welcome back! The analytics engine is ready. What data would you like to explore today?"
          }
        ]);
    }
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!apiKey.trim().startsWith('sk-')) {
        alert("Please enter a valid OpenAI API key starting with 'sk-'");
        return;
    }
    
    // Save to local storage
    localStorage.setItem('openai_api_key', apiKey.trim());
    setIsApiKeySet(true);
    
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: "Authentication successful! I am ready to analyze the 170,000+ data points for you. You can ask me questions now."
      }
    ]);
  };

  // Reset Session
  const clearSession = () => {
      localStorage.removeItem('openai_api_key');
      
      // Cleanup deprecated keys if they exist
      localStorage.removeItem('openai_file_id');
      localStorage.removeItem('openai_assistant_id');
      localStorage.removeItem('openai_thread_id');

      setIsApiKeySet(false);
      setMessages([]);
      setApiKey('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userQuery = inputText.trim();
    const newUserMessage = { id: Date.now(), sender: 'user', text: userQuery };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const startTime = Date.now();
      
      const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              apiKey: apiKey.trim(),
              message: userQuery
          })
      });
      
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.text || "I found some results but couldn't format them."
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: `I couldn't quite calculate that. Can you try rephrasing your question or being more specific?`
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // 1. Render Setup Screen
  if (!isApiKeySet) {
      return (
          <div className="setup-container">
            <div className="setup-card">
              <Database size={48} color="var(--primary)" style={{marginBottom: 16}} />
              <h2>New Analytics Session</h2>
              <p>Please log in with your API limit key to authenticate the SQL Engine.</p>
              
              <form onSubmit={handleStart} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <input 
                      type="password" 
                      className="api-input" 
                      placeholder="OpenAI API Key (sk-...)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                  />

                  <div className="file-upload-box" style={{opacity: 0.5, pointerEvents: 'none', background: '#111', border: 'none'}}>
                      <label htmlFor="file-upload" className="custom-file-upload">
                          <br />
                          <b style={{color: 'var(--primary)'}}>sales.db (170,528 rows attached via better-sqlite3)</b>
                      </label>
                  </div>

                  <button type="submit" className="btn-primary" disabled={!apiKey.trim()}>
                      Authenticate
                  </button>
              </form>
            </div>
          </div>
      )
  }

  // 2. Render Main App
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <Database className="logo-icon" size={28} />
          <div className="header-text">
            <h1>Sadhana Bot</h1>
            <span className="subtitle">Get instant responses</span>
          </div>
        </div>
        <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <button onClick={clearSession} style={{background: 'rgba(255,0,0,0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13}}>Logout</button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="chat-container">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
              <div className={`avatar ${msg.sender}`}>
                {msg.sender === 'bot' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className={`message-bubble ${msg.sender}`}>
                <p style={{whiteSpace: 'pre-wrap'}}>{msg.text}</p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message-wrapper bot">
              <div className="avatar bot"><Bot size={20} /></div>
              <div className="message-bubble bot typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span style={{color: 'grey', marginLeft: 16, fontSize: 12}}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="input-container">
        <form onSubmit={handleSend} className="input-form">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={"Prompt the SQLite Database (e.g. Sales generated in Florida)..."}
            disabled={isTyping}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isTyping}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}
