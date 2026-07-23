const socket = io();
let currentRoom = "";

// --- 1. Theme & Mode Controls ---
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

// --- 2. Auto Join Logic (Link Sharing) ---
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    
    if (codeFromUrl && codeFromUrl.length === 6) {
        document.getElementById('join-code').value = codeFromUrl;
        joinCode(); 
    }
};

// --- 3. Room Logic (Create & Join) ---
function generateCode() { 
    socket.emit('create_room'); 
}

socket.on('room_created', (code) => {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('display-code').innerText = code;
    
    // డైరెక్ట్ లింక్ క్రియేట్ చేయడం
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
    // URL లో ఉన్న కోడ్ ని మాయం చేసి క్లీన్ గా ఉంచడం
    window.history.replaceState(null, '', window.location.pathname);
});

socket.on('error_msg', (msg) => { 
    alert("❌ " + msg); 
    window.history.replaceState(null, '', window.location.pathname);
    document.getElementById('home-screen').classList.remove('hidden');
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.add('hidden');
});

// --- 4. Text Message Logic ---
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

// --- 5. Voice Logic ---
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

// --- 6. End Chat Logic ---
function endChat() { 
    socket.emit('end_chat', currentRoom); 
}
socket.on('chat_ended', () => { 
    location.reload(); 
});


// టెక్స్ట్ టైప్ చేసే ఇన్పుట్ బాక్స్ ఐడీ
const messageInput = document.getElementById('message_input'); // మీ ఫైల్‌లో ఐడీ ఏదైతే అది ఇవ్వండి
// మెసేజ్‌లు కనిపించే బాక్స్ ఐడీ
const chatBox = document.getElementById('chat_box'); // మీ ఫైల్‌లో ఐడీ ఏదైతే అది ఇవ్వండి

// టైపింగ్ బాక్స్ మీద క్లిక్ చేసినప్పుడు (కీబోర్డ్ ఓపెన్ అయినప్పుడు)
messageInput.addEventListener('focus', () => {
    // కీబోర్డ్ పూర్తిగా పైకి రావడానికి ఒక 300 మిల్లీ సెకండ్స్ టైమ్ పడుతుంది, 
    // ఆ తర్వాత వెంటనే చాట్ లాస్ట్ కి స్క్రోల్ అవుతుంది.
    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 300);
});

// ఒకవేళ యూజర్ టైప్ చేస్తున్నప్పుడు కూడా ఎప్పటికప్పుడు పైకి వెళ్లాలంటే (Optional)
window.addEventListener('resize', () => {
    chatBox.scrollTop = chatBox.scrollHeight;
});