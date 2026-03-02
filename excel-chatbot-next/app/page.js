'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, FileSpreadsheet, Loader2, Bot, User, KeyRound, UploadCloud } from 'lucide-react';

export default function ChatApp() {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  
  // File upload state
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Storage state
  const [assistantId, setAssistantId] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [fileId, setFileId] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Initial Load: Check local storage for API key and Assistant ID
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    const savedAssistant = localStorage.getItem('openai_assistant_id');
    const savedThread = localStorage.getItem('openai_thread_id');
    const savedFileId = localStorage.getItem('openai_file_id');
    
    if (savedKey) setApiKey(savedKey);
    // If they already fully logged in and uploaded a file previously:
    if (savedKey && savedAssistant && savedThread && savedFileId) {
        setIsApiKeySet(true);
        setAssistantId(savedAssistant);
        setThreadId(savedThread);
        setFileId(savedFileId);
        setMessages([
          {
            id: Date.now(),
            sender: 'bot',
            text: "Welcome back! I remembered your Excel file and session so you don't have to wait for an upload again. How can I help you today?"
          }
        ]);
    }
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
          setFile(e.target.files[0]);
      }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!apiKey.trim().startsWith('sk-')) {
        alert("Please enter a valid OpenAI API key starting with 'sk-'");
        return;
    }

    if (!file && !assistantId) {
        alert("Please select your dataset to upload!");
        return;
    }
    
    // Save to local storage
    localStorage.setItem('openai_api_key', apiKey.trim());
    setIsApiKeySet(true);
    setIsUploading(true);
    
    try {
        // Prepare multipart/form-data
        const formData = new FormData();
        formData.append('apiKey', apiKey.trim());
        if (file) formData.append('file', file);
        if (assistantId) formData.append('assistantId', assistantId); // In case they are updating an existing assistant

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData, // Notice no 'Content-Type' header here, fetch handles it automatically
        });
        
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        // Cache Assistant and Thread!
        setAssistantId(data.assistantId);
        setThreadId(data.threadId);
        setFileId(data.fileId);
        localStorage.setItem('openai_assistant_id', data.assistantId);
        localStorage.setItem('openai_thread_id', data.threadId);
        if (data.fileId) localStorage.setItem('openai_file_id', data.fileId);
        
        setMessages([
          {
            id: Date.now(),
            sender: 'bot',
            text: "Welcome! Your dataset has been securely uploaded to OpenAI's Code Interpreter. You can now ask me any questions."
          }
        ]);
    } catch (error) {
        console.error("Setup Error:", error);
        alert(`Setup failed: ${error.message}`);
        setIsApiKeySet(false);
    } finally {
        setIsUploading(false);
    }
  };

  // Reset Session
  const clearSession = () => {
      localStorage.removeItem('openai_api_key');
      localStorage.removeItem('openai_assistant_id');
      localStorage.removeItem('openai_thread_id');
      localStorage.removeItem('openai_file_id');
      setIsApiKeySet(false);
      setAssistantId(null);
      setThreadId(null);
      setFileId(null);
      setMessages([]);
      setFile(null);
      setApiKey('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !assistantId || !threadId) return;

    const userQuery = inputText.trim();
    const newUserMessage = { id: Date.now(), sender: 'user', text: userQuery };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              apiKey: apiKey.trim(),
              assistantId,
              threadId,
              fileId,
              message: userQuery
          })
      });
      
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.text
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Error generating response: ${e.message}`
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // 1. Render Setup/Upload Screen
  if (!isApiKeySet) {
      return (
          <div className="setup-container">
            <div className="setup-card">
              <KeyRound size={48} color="var(--primary)" style={{marginBottom: 16}} />
              <h2>New Analytics Session</h2>
              <p>Please provide your API key and map the dataset you want to analyze.</p>
              
              <form onSubmit={handleStart} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <input 
                      type="password" 
                      className="api-input" 
                      placeholder="OpenAI API Key (sk-...)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                  />

                  <div className="file-upload-box">
                      <label htmlFor="file-upload" className="custom-file-upload">
                          <UploadCloud size={24} style={{marginBottom: 8}}/>
                          <br />
                          {file ? <b style={{color: 'var(--primary)'}}>{file.name}</b> : <span>Click to Upload Excel File</span>}
                      </label>
                      <input id="file-upload" type="file" accept=".xlsx,.csv" onChange={handleFileChange} style={{display: 'none'}} />
                  </div>

                  <button type="submit" className="btn-primary" disabled={!apiKey.trim() || (!file && !assistantId) || isUploading}>
                      {isUploading ? "Uploading Data (Do Not Close)..." : "Start Chatbot"}
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
          <FileSpreadsheet className="logo-icon" size={28} />
          <div className="header-text">
            <h1>Excel Bot (OpenAI)</h1>
            <span className="subtitle">Secure Full-Stack Next.js App</span>
          </div>
        </div>
        <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            {isUploading && (
                <div className="loading-badge">
                <Loader2 className="spinner" size={16} />
                <span>Uploading Dataset...</span>
                </div>
            )}
            <button onClick={clearSession} style={{background: 'rgba(255,0,0,0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13}}>Reset</button>
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
            placeholder={isUploading ? "Please wait for dataset upload..." : "Ask about sales in Florida in 2024..."}
            disabled={isUploading || isTyping}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isUploading || isTyping}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}
