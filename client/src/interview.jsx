import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MonacoEditor from '@monaco-editor/react';
import './interview.css';




const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;
}
const OFF_TOPIC_KEYWORDS = [
  'weather', 'hobby', 'movie', 'music', 'sport', 'game', 'tv', 
  'television', 'netflix', 'youtube', 'facebook', 'instagram',
  'whatsapp', 'chat', 'message', 'offtopic', 'break', 'coffee',
  'food', 'lunch', 'dinner', 'breakfast', 'snack', 'drink'
];

const createSpeechSynthesis = () => {
  if (!window.speechSynthesis) return null;
  
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance();
  utter.rate = 1; 
  utter.pitch = 1; 
  utter.volume = 1;
  
  return { synth, utter };
};

export default function Interview() {
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [currentProblem, setCurrentProblem] = useState(null);
  const [interviewPhase, setInterviewPhase] = useState('intro');
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [offTopicLogs, setOffTopicLogs] = useState([]);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const problemPresentedRef = useRef(false);

  const GEMINI_API_KEY = "AIzaSyDGsvKOtxX5EVAhsg1wW6abmWp3d3qFCTc";

  
  useEffect(() => {
    speechSynthesisRef.current = createSpeechSynthesis();
    
    const handleVoicesChanged = () => {
      setVoicesLoaded(true);
    };
    
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      setVoicesLoaded(window.speechSynthesis.getVoices().length > 0);
    }
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
        if (tabSwitches > 2) {
          setConversation(prev => [...prev, {
            id: uuidv4(),
            sender: 'System',
            text: 'Warning: Multiple tab switches detected! This may affect your evaluation.'
          }]);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tabSwitches]);
  
  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      clearInterval(timer);
      handleTimeUp();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);


  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [conversation]);


  const speak = text => {
    if (!speechSynthesisRef.current) return;
    
    const { synth, utter } = speechSynthesisRef.current;
    const cleanText = text.replace(/[^\w\s.,!?;:'"()-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (!cleanText) return;
    
    if (synth.speaking) {
      synth.cancel();
    }
    
   
    if (voicesLoaded) {
      const voices = synth.getVoices();
      const preferredVoices = [
        'Google UK English Male',
        'Microsoft David - English (United States)',
        'Alex',
        'Daniel',
        'Thomas'
      ];
      
      for (const voiceName of preferredVoices) {
        const voice = voices.find(v => v.name.includes(voiceName));
        if (voice) {
          utter.voice = voice;
          break;
        }
      }
      
     
      if (!utter.voice) {
        const englishVoice = voices.find(v => v.lang.startsWith('en-'));
        if (englishVoice) utter.voice = englishVoice;
      }
    }
    
    utter.text = cleanText;
    synth.speak(utter);
  };

  useEffect(() => {
    if (!recognition) return;
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript + ' ';
        }
      }
      
      setInterimTranscript(interim);
      
      if (finalTranscript) {
        setIsListening(false);
        handleSend(finalTranscript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      
      let errorMsg = 'Speech recognition error: ';
      switch(event.error) {
        case 'no-speech':
          errorMsg += 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMsg += 'Microphone not available. Please check permissions.';
          break;
        case 'not-allowed':
          errorMsg += 'Microphone access denied. Please enable permissions.';
          break;
        default:
          errorMsg += 'Please try again or type your response.';
      }
      
      setConversation(prev => [...prev, { 
        id: uuidv4(), 
        sender: 'System', 
        text: errorMsg 
      }]);
    };
    
    recognition.onend = () => {
      if (!interimTranscript) {
        setIsListening(false);
      }
    };
    
    return () => { 
      recognition.stop(); 
    };
  }, [conversation]);

  
  useEffect(() => {
    if (!recognition) return;
    if (isListening) {
      setInterimTranscript('');
      recognition.start();
    } else {
      recognition.stop();
    }
  }, [isListening]);

 
  const formatTime = secs => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTimeUp = () => {
    setIsTimerRunning(false);
    const msg = "Time's up! Stop coding immediately. We'll review what you have.";
    setConversation(prev => [...prev, { id: uuidv4(), sender: 'Raju', text: msg }]);
    speak(msg);
    handleCodeReview();
  };

  const detectOffTopic = text => {
    const found = OFF_TOPIC_KEYWORDS.filter(keyword => 
      new RegExp(`\\b${keyword}\\b`, 'i').test(text)
    );
    return found.length > 0 ? found[0] : null;
  };

  
  const handleSend = async(text) => {
    const msg = text || userInput.trim();
    if (!msg) return;
    
    
    const offTopicKeyword = detectOffTopic(msg);
    if (offTopicKeyword) {
      setOffTopicLogs(prev => [...prev, {keyword: offTopicKeyword, message: msg}]);
      const warning = `This is a technical interview. Please focus on the problem. Mentioning "${offTopicKeyword}" is inappropriate.`;
      setConversation(prev => [...prev, 
        { id: uuidv4(), sender: 'User', text: msg },
        { id: uuidv4(), sender: 'Raju', text: warning }
      ]);
      speak(warning);
      setUserInput('');
      return;
    }
    
    setConversation(prev => [...prev, { id: uuidv4(), sender: 'User', text: msg }]);
    setUserInput(''); 
    setIsLoading(true);

    const history = conversation.map(m => ({ 
      role: m.sender === 'User' ? 'user' : 'assistant', 
      content: m.text 
    }));
    
    const systemPrompt = `
      You are Rajju, a strict technical interviewer for SDE positions. Rules:
      first introduceurself and take intro of the user 
      1. Present ONLY ONE medium level DSA problem at the beginning
      2. During solution discussion:
          - Be highly critical of mistakes
          - NEVER reveal edge cases until final feedback
          - Demand improvements for suboptimal solutions
          - Only provide minimal hints when explicitly asked
          - NEVER reveal the solution until final feedback
      3. If solution is incorrect:
          - State why it's wrong WITHOUT revealing edge cases
          - Ask candidate to identify edge cases
      4. If solution is correct:
          - Still point out potential improvements
      5. Maintain strict professional tone
      6. End interview after 30 minutes
      7. In final feedback ONLY:
          - Reveal missed edge cases
          - Provide optimal solution
          - Critically evaluate performance
      8. Use plain text without markdown
      9. Respond concisely - maximum 3 sentences
      10. Immediately stop any off-topic discussions
    `;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
            { role: 'user', parts: [{ text: msg }] }
          ]
        })
      });
      
      const data = await res.json();
      let botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Please focus on the technical question.";
      
     
      botText = botText
        .replace(/\b(great|excellent|well done|good job)\b/gi, 'adequate')
        .replace(/\b(please|kindly|would you)\b/gi, '')
        .replace(/\*/g, '')
        .replace(/```[\s\S]*?```/g, '');
        
      const botMsg = { id: uuidv4(), sender: 'Raju', text: botText };
      setConversation(prev => [...prev, botMsg]); 
      speak(botText);
      
     
      if (!problemPresentedRef.current && /problem|question|solve this/i.test(botText)) {
        setCurrentProblem(botText); 
        setInterviewPhase('problem'); 
        setIsTimerRunning(true);
        problemPresentedRef.current = true;
      }
      
     
      if (/feedback|how did i do|review/i.test(msg) || /feedback|review/i.test(botText)) {
        setInterviewPhase('feedback'); 
        setFeedback(botText);
      }
      
    } catch (err) {
      const errMsg = { id: uuidv4(), sender: 'Raju', text: "Connection issue. Focus on your solution." };
      setConversation(prev => [...prev, errMsg]); 
      speak(errMsg.text);
    } finally { 
      setIsLoading(false); 
      inputRef.current?.focus(); 
    }
  };

 
  const handleCodeReview = async() => {
    if (!currentProblem || !codeValue.trim()) return;
    setIsLoading(true);
    
    let finalPrompt = `
      As a strict interviewer, provide FINAL feedback:
      
      Problem: ${currentProblem}
      
      Candidate Solution:
      ${codeValue}
      
      Include:
      1. Performance rating (1-10)
      2. All missed edge cases
      3. Optimal solution
      4. Improvement areas
      5. Brutally honest critique
    `;
    
  
    if (offTopicLogs.length > 0) {
      finalPrompt += "\n\nOff-topic discussions:\n";
      offTopicLogs.forEach(log => {
        finalPrompt += `- Mentioned "${log.keyword}" when discussing: ${log.message}\n`;
      });
      finalPrompt += "Penalize candidate for lack of focus.";
    }
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
        })
      });
      
      const data = await res.json();
      let revText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to review solution.";
      
      
      revText = revText
        .replace(/\b(good|nice|well)\b/gi, 'inadequate')
        .replace(/\b(consider|maybe|perhaps)\b/gi, 'must')
        .replace(/\*/g, '')
        .replace(/```[\s\S]*?```/g, '');
        
      const revMsg = { id: uuidv4(), sender: 'Raju', text: revText };
      setConversation(prev => [...prev, revMsg]); 
      speak(revText); 
      setInterviewPhase('feedback'); 
      setFeedback(revText);
      
    } catch (err) {
      const errMsg = { id: uuidv4(), sender: 'Raju', text: "Failed to review solution." };
      setConversation(prev => [...prev, errMsg]); 
      speak(errMsg.text);
    } finally { 
      setIsLoading(false); 
    }
  };

  const requestFinalFeedback = () => handleSend("Provide final evaluation with: 1. Performance rating 2. Missed edge cases 3. Optimal solution 4. Improvement areas. Be brutally critical.");
  const isCodeEmpty = !codeValue.trim() || codeValue.includes('// Implement your solution here');

  return (
    <div className="chatbot-container">
      <header className="header">
        <div className="header-left">
          <h1>Raju Technical Interviewer</h1>
          <div className="status-container">
            <span className={isLoading ? 'status thinking' : 'status online'}>
              {isLoading ? 'Analyzing...' : 'Online'}
            </span>
            <span className={`phase-tag ${interviewPhase}`}>
              {interviewPhase.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="timer-container">
          <div className="timer-label">TIME REMAINING</div>
          <div className="timer-display">{formatTime(timeLeft)}</div>
        </div>
      </header>

      <div className="main-content">
        <aside className="conversation-panel">
          <div className="feedback-header">
            <button 
              onClick={requestFinalFeedback}
              className="feedback-btn"
              disabled={isLoading}
            >
              GET FINAL FEEDBACK
            </button>
          </div>

          <div className="messages">
            {conversation.map(msg => (
              <div key={msg.id} className={msg.sender === 'User' ? 'msg user' : 'msg bot'}>
                <div className="meta">
                  <span className="sender">
                    {msg.sender === 'User' ? 'YOU' : 'RAJU'}
                  </span> 
                  <span className="time">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="content">{msg.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-fixed">
            {SpeechRecognition && (
              <button 
                onClick={() => setIsListening(x => !x)} 
                className={isListening ? 'mic active' : 'mic'} 
                disabled={isLoading} 
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                <svg viewBox="0 0 24 24" className="mic-icon">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={isListening ? interimTranscript : userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()}
              disabled={isLoading}
              placeholder={isListening ? 'Listening...' : 'Type your response...'}
            />
            <button 
              onClick={() => handleSend()} 
              disabled={isLoading || (!userInput.trim() && !interimTranscript)} 
              className="send"
            >
              SEND
            </button>
          </div>
        </aside>

        <section className="editor-panel">
          <div className="editor-header">
            <span>CODE EDITOR</span>
            <div>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c++">C++</option>
              </select>
              <button 
                onClick={handleCodeReview} 
                className="action review"
                disabled={isCodeEmpty || isLoading}
              >
                SUBMIT SOLUTION
              </button>
              <button 
                onClick={() => setCodeValue('')} 
                className="action reset"
              >
                CLEAR EDITOR
              </button>
            </div>
          </div>
          <MonacoEditor
            height="100%"
            language={language}
            theme="vs-dark"
            value={codeValue}
            onChange={setCodeValue}
            options={{ 
              automaticLayout: true, 
              minimap: { enabled: false }, 
              fontSize: 14,
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false
              }
            }}
          />
        </section>
      </div>
    </div>
  );
}