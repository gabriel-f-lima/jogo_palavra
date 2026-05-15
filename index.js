const setupContainer = document.getElementById('setup-container');
const gameContainer = document.getElementById('game-container');
const wordDisplay = document.getElementById('word-display');
const gameMessage = document.getElementById('game-message');
const errorCount = document.getElementById('error-count');
const resetBtn = document.getElementById('reset-btn');
const inputLetra = document.getElementById('letter-input');
const gameHint = document.getElementById('game-hint');
const hintContainer = document.getElementById('hint-container');
const URL_API = 'https://api-palavras-8ptt.onrender.com';
const botoes = document.querySelectorAll('.nivel-btn button');
let nivelSelecionado = 'facil';


// ==========================================
// SISTEMA DE ÁUDIO (Web Audio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarSom(frequencia, tipo, duracao) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo;
    osc.frequency.value = frequencia;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duracao);
    osc.stop(audioCtx.currentTime + duracao);
}
function selecionarNivel(nivel) {
    nivelSelecionado = nivel;
    botoes.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    console.log("Nível selecionado:", nivel);
}

function somAcerto() {
    // Toque duplo feliz
    tocarSom(600, 'sine', 0.1);
    setTimeout(() => tocarSom(800, 'sine', 0.2), 100);
}

function somErro() {
    // Toque grave e rápido
    tocarSom(250, 'sawtooth', 0.3);
}

// ==========================================
// FUNÇÕES DO TECLADO VIRTUAL
// ==========================================
function digitar(letra) {
    inputLetra.value = letra;
    inputLetra.focus();
}

function apagar() {
    inputLetra.value = '';
    inputLetra.focus();
}

function enviar() {
    // Chama a mesma lógica da tecla Enter física
    processarTentativa();
}

// ==========================================
// LÓGICA DO JOGO
// ==========================================
async function iniciarJogo(event) {
    if (event.key === 'Enter') {
        const nickname = document.getElementById('nickname-input').value;

        if (!nickname || !nivelSelecionado) {
            alert('Por favor, digite um nickname e selecione um nível para iniciar o jogo.');
            return;
        }

        const response = await fetch(`${URL_API}/iniciar`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: nickname, nivel: nivelSelecionado })
        });
        const data = await response.json();

        if (data.erro) {
            alert(data.erro);
            return;
        }
        botoes.forEach(btn => btn.classList.add('hidden'));
        setupContainer.classList.add('hidden');
        footer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        
        document.getElementById('player-display').innerText = data.mensagem;

        buscarPalavra();
        inputLetra.focus(); // Foca na nova caixinha neon automaticamente
    }
}

async function buscarPalavra() {
    const response = await fetch(`${URL_API}/status`, {
        method: 'GET',
        credentials: 'include'
    });
    const data = await response.json();

    if (data.dica) {
        gameHint.innerText = data.dica;
        hintContainer.classList.remove('hidden');
        
    }

    wordDisplay.innerHTML = '';
    for (let i=0; i < data.qtde_caracteres; i++){
        const span = document.createElement('span');
        span.className = 'letter-slot';
        span.id = `slot-${i}`;
        wordDisplay.appendChild(span);
    }  
}



// Mantido para compatibilidade com o onkeydown do HTML
async function verificarLetra(event) {
    if (event.key === 'Enter') {
        processarTentativa();
    }
}

// A função central que envia a letra para a API
async function processarTentativa() {
    const caractere = inputLetra.value.toUpperCase();
    inputLetra.value = ''; // Limpa a caixa
    inputLetra.focus();

    if (!caractere) {
        alert('Por favor, escolha uma letra para jogar.');
        return;
    } else if (!/^[A-Z]$/.test(caractere)) {
        alert('Por favor, digite apenas uma letra válida (A-Z).');
        return;
    }

    const response = await fetch(`${URL_API}/tentativa`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caractere: caractere })
    });
    const data = await response.json();

    if (data.erro) {
        alert(data.erro);
        return;
    }

    // Toca o som de acerto ou erro
    if (data.posicoes && data.posicoes.length > 0) {
        somAcerto();
        data.posicoes.forEach(posicao => {
            const slot = document.getElementById(`slot-${posicao}`);
            slot.innerText = caractere;
            slot.classList.add('correct'); // Opcional: faz a letra brilhar
        });
        atualizarTecladoVisual(caractere, 'correct');
    } else {
        somErro();
        atualizarTecladoVisual(caractere, 'wrong');
    }

    errorCount.innerText = data.erros_atuais;
    gameMessage.innerText = data.mensagem;

    // Fim de jogo
    if (data.status_jogo !== 'Jogando') {
    resetBtn.classList.remove('hidden');
    inputLetra.disabled = true;
    nivelBtn.classList.remove('hidden'); // Esconde os botões de nível
    inputLetra.style.opacity = "0"; // Esconde o input para focar no resultado

    const titulo = document.querySelector('h1');

    if (data.status_jogo === 'Derrota') {
        // Tema de Derrota: Vermelho/Vinho
        document.body.style.backgroundColor = '#451a1a'; // Vinho bem escuro
        titulo.style.textShadow = "0 0 20px #ff4757"; // Brilho vermelho no título
        gameMessage.style.color = '#ff9f9f';
        gameMessage.innerText = "Fim de jogo! " + data.mensagem;
         if (data.palavra) {
                    const finalWord = document.getElementById('final-word-display');
                    finalWord.innerText = `A palavra correta era: ${data.palavra}`;
                    finalWord.classList.remove('hidden');
                }
    } else {
        // Tema de Vitória: Azul Profundo/Verde
        document.body.style.backgroundColor = '#1a2e45'; // Azul meia-noite
        titulo.style.textShadow = "0 0 20px #2ed573"; // Brilho verde no título
        gameMessage.style.color = '#a7ffc9';
        gameMessage.innerText = "Incrível! " + data.mensagem;
    }
    
    document.body.style.transition = "background-color 1s ease";
    }
}


function atualizarTecladoVisual(letra, status) {
    const teclas = document.querySelectorAll('.key');
    teclas.forEach(tecla => {
        if (tecla.innerText === letra) {
            tecla.classList.add(status);
        }
    });
}

function reiniciarJogo() {
    location.reload();
}