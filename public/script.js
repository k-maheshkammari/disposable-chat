const socket = io();
let currentRoom = "";

function toggleMode() {
    const body = document.body;
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    }
}

function setColor(themeClass) {
    const body = document.body;
    body.classList.remove('theme-blue', 'theme-orange', 'theme-green', 'theme-pink', 'theme-yellow', 'theme-hacker');
    body.classList.add(themeClass);
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    
    if (codeFromUrl && codeFromUrl.length === 6) {
        document.getElementById('join-code').value = codeFromUrl;
        joinCode(); 
    }
};

function generateCode() {
    // 1. "Generate New Code" బటన్ నొక్కిన వెంటనే యాడ్ కనిపించేలా చేయడం
    const adBox = document.getElementById('ad-container');
    if (adBox) {
        adBox.style.display = 'block';
    }

    // 2. సర్వర్‌కి రూమ్ క్రియేషన్ రిక్వెస్ట్ పంపడం
    socket.emit('create_room');
}

socket.on('room_created', (code) => {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('display-code').innerText = code;
    
    const inviteUrl = window.location.origin + '?code=' + code;
    document.getElementById('invite-link').value = inviteUrl;
});

function copyLink() {
    const linkInput = document.getElementById('invite-link');
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value);
    alert("Link Copied! Send it to your friend.");
}

function joinCode() {
    const code = document.getElementById('join-code').value.toUpperCase();
    if(code.length === 6) { 
        socket.emit('join_room', code); 
    } else { 
        alert("Please enter a valid 6-character code!"); 
    }
}

socket.on('room_joined', (code) => {
    currentRoom = code;
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.remove('hidden');
    window.history.replaceState(null, '', window.location.pathname);
});

socket.on('error_msg', (msg) => { 
    alert("❌ " + msg); 
    window.history.replaceState(null, '', window.location.pathname);
    document.getElementById('home-screen').classList.remove('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.add('hidden');
});

function sendMessage() {
    const msgInput = document.getElementById('message-input');
    const msg = msgInput.value.trim();
    if(msg) {
        appendMessage('You', msg, 'sent'); 
        socket.emit('send_message', { room: currentRoom, message: msg }); 
        msgInput.value = ''; 
    }
}

socket.on('receive_message', (msg) => { 
    appendMessage('Stranger', msg, 'received'); 
});

function appendMessage(sender, msg, type) {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', type);
    msgDiv.innerText = msg;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; 
}

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const recordBtn = document.getElementById('record-btn');

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            isRecording = true;
            
            recordBtn.innerText = "🛑";
            recordBtn.style.color = "red";

            mediaRecorder.ondataavailable = event => { audioChunks.push(event.data); };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    appendVoice('You', base64Audio, 'sent'); 
                    socket.emit('send_voice', { room: currentRoom, audio: base64Audio }); 
                };
            };
        } catch (err) {
            alert("దయచేసి మైక్రోఫోన్ కి పర్మిషన్ ఇవ్వండి!");
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.innerText = "🎤";
        recordBtn.style.color = "inherit";
    }
}

socket.on('receive_voice', (audioData) => { 
    appendVoice('Stranger', audioData, 'received'); 
});

function appendVoice(sender, audioData, type) {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', type);
    
    const audioElem = document.createElement('audio');
    audioElem.controls = true;
    audioElem.src = audioData;
    audioElem.style.maxWidth = "100%";
    audioElem.style.height = "30px";
    
    msgDiv.appendChild(audioElem);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function endChat() { 
    socket.emit('end_chat', currentRoom); 
}
socket.on('chat_ended', () => { 
    location.reload(); 
});


// --- మొబైల్ కీబోర్డ్ వచ్చినప్పుడు చాట్ ఆటో-స్క్రోల్ అవ్వడానికి ---
const messageInputBox = document.getElementById('message-input');
const chatBoxArea = document.getElementById('chat-box');

if (messageInputBox && chatBoxArea) {
    messageInputBox.addEventListener('focus', () => {
        setTimeout(() => {
            chatBoxArea.scrollTop = chatBoxArea.scrollHeight;
        }, 300);
    });
}

