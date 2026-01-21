/**
 * 진담카페 챌린지 v2.8 - 통합 프리미엄 스크립트
 */

const layers = { video: document.getElementById('layer-video'), chat: document.getElementById('layer-chat'), kiosk: document.getElementById('layer-kiosk') };
const video = document.getElementById('opening-video');
const chatLog = document.getElementById('chat-log');
const choiceArea = document.getElementById('choice-area');
const timerDisplay = document.getElementById('timer-display');
const cartCountDisplay = document.getElementById('cart-count');
const modalLayer = document.getElementById('modal-layer');
const modalBox = document.getElementById('modal-box');
const cartDetailLayer = document.getElementById('cart-detail-layer');
const cartListContainer = document.getElementById('cart-list-container');

let cart = [];
let currentMenu = "";
let currentOptions = { temp: "ICE", ice: "보통", shot: 1 };
let isSuddenPhase = false; 
let timeLeft = 60;
let timerInterval = null;
let inputPhone = "010"; // 포인트 입력용 초기값

// --- [1] 게임 레이어 및 비디오 제어 ---
function showLayer(name) {
    Object.values(layers).forEach(l => { l.classList.remove('active'); l.style.display = 'none'; });
    layers[name].classList.add('active'); layers[name].style.display = 'flex';
    if (name === 'kiosk') startTimer();
}

document.getElementById('start-btn').onclick = () => { video.play(); document.getElementById('start-btn').style.display = 'none'; };
video.onended = () => { showLayer('chat'); renderDialogue('start'); };

// --- [2] 분기형 대화 시스템 ---
const dialogueData = {
    "start": { text: "아 춥다~ 오늘 날씨 장난 아니다! 너는 오늘 뭐 마실 거야?", choices: [{ text: "오늘은 추우니까 넌 따뜻한 것 마실 거지?", next: "q2" }] },
    "q2": { text: "아니? 나는 얼어 죽어도 아이스 아메리카노를 마실 거야.", choices: [{ text: "헐~ 나는 따뜻한 아메리카노를 마실래.", next: "q3" }] },
    "q3": { text: "내 거는 연하게(1샷), 얼음량은 많이 해서 주문해줘.", choices: [{ text: "나는 샷을 하나 추가할게(2샷).", next: "q4" }] },
    "q4": { text: "전에 키오스크에서 주문해본 적 있어?", choices: [{ text: "아니~ 처음이야! 근데 나 혼자 할 수 있을 것 같아.", next: "go_kiosk" }] },
    "sudden_start": { text: "잠깐! 우리 디저트도 시키자.", choices: [{ text: "그래! 초코케이크 하나 시켜서 나눠먹자.", next: "go_kiosk_again" }] }
};

function addMessage(side, text) {
    const msg = document.createElement('div'); msg.className = `msg ${side}`;
    msg.innerHTML = side === 'left' ? `<div class="friend-profile">👩</div><div class="bubble">${text}</div>` : `<div class="bubble">${text}</div>`;
    chatLog.appendChild(msg); chatLog.scrollTop = chatLog.scrollHeight;
}

function renderDialogue(key) {
    if (key === 'go_kiosk' || key === 'go_kiosk_again') { setTimeout(() => showLayer('kiosk'), 800); return; }
    const node = dialogueData[key];
    setTimeout(() => addMessage('left', node.text), 400);
    choiceArea.innerHTML = "";
    node.choices.forEach(c => {
        const btn = document.createElement('button'); btn.className = "choice-btn"; btn.innerText = c.text;
        btn.onclick = () => { addMessage('right', c.text); choiceArea.innerHTML = ""; renderDialogue(c.next); };
        choiceArea.appendChild(btn);
    });
}

// --- [3] 키오스크 및 옵션 제어 ---
function switchTab(e, cat) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.menu-grid').forEach(g => g.classList.remove('active'));
    e.currentTarget.classList.add('active'); document.getElementById(cat + '-menu').classList.add('active');
}

function openOptions(menu) {
    currentMenu = menu; document.getElementById('opt-menu-name').innerText = menu;
    const isCoffee = menu === "아메리카노";
    const isSpecial = ["초코케이크", "생딸기우유"].includes(menu);
    document.getElementById('temp-row').style.display = isSpecial ? 'none' : 'block';
    document.getElementById('shot-row').style.display = isCoffee ? 'block' : 'none';
    document.getElementById('option-sheet').classList.add('active'); 
    currentOptions = { temp: (isSpecial) ? "ICE" : "ICE", ice: (isSpecial) ? "" : "보통", shot: isCoffee ? 1 : 0 };
    updateOptionUI();
}

function setOption(type, val) {
    currentOptions[type] = val;
    document.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.toggle('selected', b.dataset.value === val));
    if (type === 'temp') currentOptions.ice = (val === 'HOT') ? "" : "보통";
    updateOptionUI();
}

function updateOptionUI() {
    const iceRow = document.getElementById('ice-row');
    const isSpecial = ["초코케이크", "생딸기우유"].includes(currentMenu);
    iceRow.style.display = (currentOptions.temp === 'HOT' || isSpecial) ? 'none' : 'block';
    document.getElementById('shot-val').innerText = currentOptions.shot;
}

function changeShot(n) { currentOptions.shot = Math.max(0, Math.min(5, currentOptions.shot + n)); document.getElementById('shot-val').innerText = currentOptions.shot; }
function addToCart() { cart.push({ ...currentOptions, name: currentMenu }); cartCountDisplay.innerText = cart.length; closeSheet(); }
function closeSheet() { document.getElementById('option-sheet').classList.remove('active'); }
function closeSheetOutside(e) { if(e.target.id === 'option-sheet') closeSheet(); }

// --- [4] 장바구니 관리 ---
function openCart() {
    cartListContainer.innerHTML = cart.length === 0 ? "<p style='padding:50px; color:#bbb; text-align:center;'>장바구니가 비어 있습니다.</p>" : "";
    cart.forEach((item, idx) => {
        const div = document.createElement('div'); div.className = 'cart-item';
        div.innerHTML = `<div class="c-info"><span class="c-name">${item.name}</span><span class="c-opt">${item.temp} ${item.ice} ${item.shot}샷</span></div><button class="btn-del" onclick="removeFromCart(${idx})">✕</button>`;
        cartListContainer.appendChild(div);
    });
    cartDetailLayer.style.display = 'flex';
}
function closeCart() { cartDetailLayer.style.display = 'none'; }
function removeFromCart(idx) { cart.splice(idx, 1); cartCountDisplay.innerText = cart.length; openCart(); }

// --- [5] 최종 검증 및 결제 프로세스 ---
function handlePaymentClick() {
    if (cart.length === 0) return;
    if (!isSuddenPhase) { isSuddenPhase = true; if(timerInterval) clearInterval(timerInterval); showLayer('chat'); renderDialogue('sudden_start'); }
    else { finalCheck(); }
}

function finalCheck() {
    const minji = cart.find(i => i.name === "아메리카노" && i.temp === "ICE" && i.shot === 1 && i.ice === "많이");
    const me = cart.find(i => i.name === "아메리카노" && i.temp === "HOT" && i.shot === 2);
    const cake = cart.find(i => i.name === "초코케이크");

    if (minji && me && cake) { showPointKeypad(); }
    else {
        layers.kiosk.classList.add('shake-ani'); setTimeout(() => layers.kiosk.classList.remove('shake-ani'), 500);
        modalLayer.style.display = "flex";
        modalBox.innerHTML = `<h2>😫 주문 확인</h2><p style="margin:20px 0;">미션과 주문이 다릅니다.<br>장바구니를 다시 확인해 주세요!</p><button class="btn-confirm-large" onclick="retry()">장바구니 수정</button>`;
    }
}

function retry() { modalLayer.style.display = 'none'; openCart(); }

// --- [6] 포인트 적립 키패드 (010 시작) ---
function showPointKeypad() {
    inputPhone = "010";
    modalLayer.style.display = "flex";
    renderKeypad();
}

function renderKeypad() {
    modalBox.innerHTML = `
        <h3 style="margin-bottom:10px;">포인트 적립</h3>
        <p style="color:#888; font-size:0.9rem; margin-bottom:20px;">전화번호를 입력해 주세요.</p>
        <div class="phone-display" id="phone-display">${formatPhone(inputPhone)}</div>
        <div class="keypad">
            ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="key" onclick="pressKey('${n}')">${n}</button>`).join('')}
            <button class="key action" onclick="pressKey('C')">C</button>
            <button class="key" onclick="pressKey('0')">0</button>
            <button class="key enter" onclick="confirmPoints()">입력</button>
        </div>
        <button class="btn-secondary" onclick="showPaymentMethods()" style="margin-top:20px; border:none; background:none; color:#999; text-decoration:underline;">적립 안 함</button>
    `;
}

function pressKey(k) {
    if(k === 'C') inputPhone = "010";
    else if(inputPhone.length < 11) inputPhone += k;
    document.getElementById('phone-display').innerText = formatPhone(inputPhone);
}

function formatPhone(n) {
    let s = n;
    if(s.length > 3 && s.length <= 7) s = s.slice(0,3) + "-" + s.slice(3);
    else if(s.length > 7) s = s.slice(0,3) + "-" + s.slice(3,7) + "-" + s.slice(7);
    return s;
}

function confirmPoints() {
    if(inputPhone.length === 11) showPaymentMethods();
    else alert("번호를 끝까지 입력해 주세요!");
}

// --- [7] 결제 수단 선택 및 영수증 ---
function showPaymentMethods() {
    modalBox.innerHTML = `
        <h3>결제 수단 선택</h3>
        <div class="pay-methods">
            <button class="pay-btn-item" onclick="processPayment('체크카드')">💳 체크카드</button>
            <button class="pay-btn-item" onclick="processPayment('신용카드')">🏦 신용카드</button>
        </div>
        <div style="background:#f8f9fa; padding:15px; border-radius:15px; font-size:0.85rem; color:#666;">
            📢 <b>현금 결제</b>는 카운터에서 도와드리겠습니다.
        </div>
    `;
}

function processPayment(method) {
    modalBox.innerHTML = `<h2>${method} 결제 중</h2><p style="margin:20px 0;">카드를 투입구에 끝까지 넣어주세요.</p>`;
    setTimeout(() => { clearInterval(timerInterval); showFinalReceipt(method); }, 2000);
}

function showFinalReceipt(method) {
    const prices = {
        "아메리카노": 4500,
        "생강차": 5500,
        "생딸기우유": 5800,
        "초코케이크": 6500,
        "소금빵": 3500
    };

    let total = 0;
    let listHtml = "";

    // 장바구니에 담긴 모든 품목을 하나의 리스트로 통합
    cart.forEach(item => {
        const p = prices[item.name] || 0;
        total += p;

        // 음료 여부 확인
        const isBeverage = ["아메리카노", "생강차", "생딸기우유"].includes(item.name);
        let displayName = `<strong>${item.name}</strong>`;

        if (isBeverage) {
            // 음료일 경우 상세 옵션을 괄호 안에 추가
            let options = [];
            options.push(item.temp.toLowerCase()); // ice 또는 hot
            if (item.shot !== undefined && item.shot > 0) options.push(`샷 ${item.shot}개`);
            if (item.ice) options.push(`얼음량 ${item.ice}`);
            
            displayName += `<br><span style="color:#666; font-size:0.75rem;">(${options.join(', ')})</span>`;
        }

        // 품명과 가격을 한 줄에 배치 (품명은 왼쪽, 가격은 오른쪽)
        listHtml += `
            <div style="display:flex; justify-content:space-between; align-items: flex-start; margin-bottom:12px; font-size:0.9rem;">
                <div style="text-align:left; line-height:1.4;">${displayName}</div>
                <div style="font-weight:700; white-space:nowrap; margin-left:10px;">${p.toLocaleString()}원</div>
            </div>
        `;
    });

    // 중앙 정렬 및 프리미엄 디자인 영수증 구성
    modalBox.innerHTML = `
        <div style="text-align:center;">
            <h2 style="color:#2ecc71; margin-bottom:20px; font-weight:800;">✔ 결제 완료</h2>
            
            <div class="receipt" style="background:#fff; border:1px solid #ddd; padding:25px; border-radius:15px; box-shadow:inset 0 0 15px rgba(0,0,0,0.02); margin-bottom:20px;">
                <p style="font-weight:900; font-size:1.3rem; border-bottom:2px solid #333; padding-bottom:15px; margin-bottom:20px; letter-spacing:2px;">JINDAM CAFE</p>
                
                <div style="min-height: 50px;">
                    ${listHtml}
                </div>
                
                <div style="border-top:1px dashed #aaa; margin-top:15px; padding-top:15px; font-weight:900; display:flex; justify-content:space-between; font-size:1.2rem; color:#000;">
                    <span>총 결제금액</span>
                    <span style="color:var(--accent);">${total.toLocaleString()}원</span>
                </div>
                
                <div style="font-size:0.75rem; color:#999; margin-top:20px; text-align:left; line-height:1.6; border-top:1px solid #f5f5f5; padding-top:10px;">
                    [결제 정보]<br>
                    결제수단: ${method}<br>
                    주문일시: ${new Date().toLocaleString()}<br>
                    주문번호: JDM-${Math.floor(Date.now() / 100000)}
                </div>
            </div>

            <div style="background:#fdf2f0; padding:25px; border-radius:25px; border:1px solid #ffedea; margin-bottom:20px;">
                <span style="font-size:0.9rem; color:#e74c3c; font-weight:800; display:block; margin-bottom:10px;">주문 대기 번호</span>
                <div style="font-size:3.5rem; font-weight:900; color:#e74c3c; line-height:1;">
                    ${Math.floor(Math.random() * 101) + 100}
                </div>
                <p style="font-size:0.8rem; color:#999; margin-top:10px;">음료가 준비되면 번호를 호출해 드립니다.</p>
            </div>

            <button class="btn-confirm-large" onclick="location.reload()" style="box-shadow: 0 5px 15px rgba(61,43,31,0.3);">확인 (메인으로)</button>
        </div>
    `;
}
function startTimer() { timerInterval = setInterval(() => { timeLeft--; timerDisplay.innerText = timeLeft; if(timeLeft<=0) location.reload(); }, 1000); }
