/**
 * 진담카페 챌린지 v4.2 - 논커피 사장님 대화 & 차단 로직 추가
 */

const layers = { video: document.getElementById('layer-video'), chat: document.getElementById('layer-chat'), kiosk: document.getElementById('layer-kiosk') };
const modalLayer = document.getElementById('modal-layer');
const modalBox = document.getElementById('modal-box');
const cartCountDisplay = document.getElementById('cart-count');
const cartDetailLayer = document.getElementById('cart-detail-layer');
const cartListContainer = document.getElementById('cart-list-container');
const chatHeaderTitle = document.querySelector('.chat-header'); 

let cart = [];
let currentMenu = "";
let currentOptions = { temp: "ICE", ice: "보통", shot: 1 };
let isSuddenPhase = false; 
let isPointPhase = false; 
let hasPaymentFailed = false; 
let timeLeft = 60;
let timerInterval = null;
let inputPhone = "010";
const CORRECT_PHONE = "01012345678";

// --- [1] 초기화 ---
function showLayer(name) {
    Object.values(layers).forEach(l => { l.classList.remove('active'); l.style.display = 'none'; });
    layers[name].classList.add('active'); layers[name].style.display = 'flex';
    if (name === 'kiosk') startTimer();
}

document.getElementById('start-btn').onclick = () => { document.getElementById('opening-video').play(); document.getElementById('start-btn').style.display = 'none'; };
document.getElementById('opening-video').onended = () => { showLayer('chat'); renderDialogue('start'); };

// --- [2] 대화 데이터 (논커피 시나리오 추가) ---
const dialogueData = {
    // 민지와의 기본 대화
    "start": { text: "아 춥다~ 오늘 날씨 장난 아니다! 너는 오늘 뭐 마실 거야?", choices: [{ text: "오늘은 추우니까 넌 따뜻한 것 마실 거지?", next: "q2" }] },
    "q2": { text: "아니? 나는 얼어 죽어도 아이스 아메리카노를 마실 거야.", choices: [{ text: "헐~ 나는 따뜻한 아메리카노를 마실래.", next: "q3" }] },
    "q3": { text: "내 거는 연하게(1샷), 얼음량은 많이 해서 주문해줘.", choices: [{ text: "나는 샷을 하나 추가할게(2샷).", next: "q4" }] },
    "q4": { text: "전에 키오스크에서 주문해본 적 있어?", choices: [{ text: "아니~ 처음이야! 근데 나 혼자 할 수 있을 것 같아.", next: "go_kiosk" }] },
    "sudden_start": { text: "잠깐! 우리 디저트도 시키자.", choices: [{ text: "그래! 초코케이크 하나 시켜서 나눠먹자.", next: "go_kiosk_again" }] },
    "point_start": { text: "너 여기 카페 회원이야? 포인트 적립할 수 있대.", choices: [{ text: "응, 내 번호 입력해~ 010-1234-5678", next: "go_keypad" }] },
    "pay_credit_start": { text: "신용 카드 결제로 해야겠다. 카드 어디다 꽂는 거지?", choices: [{ text: "음.. 여기 밑에 있네!", next: "go_payment_methods" }] },

    // [NEW] 사장님 - 생강차
    "ginger_1": { text: "(궁금해서 사장님께 물어본다)", choices: [{ text: "사장님, 생강차 달아요? 덜 달게 해줄 수 있어요?", next: "ginger_2" }] },
    "ginger_2": { 
        speaker: "boss", 
        text: "덜 달게요? 죄송한데 고객님 저희가 청이라서 당도 조정할 수가 없고요. 원하시면 물을 더 많이 넣어드릴게요.",
        choices: [{ text: "아.. 그럼 그냥 원래 먹던 걸로 할게요.", next: "go_kiosk_warning" }]
    },

    // [NEW] 사장님 - 생딸기우유
    "berry_1": { text: "(시간이 얼마나 걸릴지 물어본다)", choices: [{ text: "사장님~ 혹시 생딸기우유 시키면 얼마나 걸릴까요?", next: "berry_2" }] },
    "berry_2": {
        speaker: "boss",
        text: "금방 나와요~",
        choices: [{ text: "음.. 고민되네. 그냥 커피 마셔야겠다.", next: "go_kiosk_warning" }]
    },

    // [NEW] 사장님 - 결제 오류 해결
    "boss_stage_1": {
        text: "(결제가 계속 실패한다... 직원을 불러볼까?)",
        choices: [{ text: "사장님, 키오스크에 결제 안돼요. 혹시 한번 봐줄 수 있을까요?", next: "boss_stage_2" }]
    },
    "boss_stage_2": {
        speaker: "boss",
        text: "네, 잠시만요. 고객님~ 여기에 카드가 푹 꽂아야 결제할 수 있거든요. 안 그러면 아까처럼 결제가 안되고요.",
        choices: [{ text: "아하! 푹 꽂아야 하는구나. 다시 해볼게요.", next: "go_retry_payment" }]
    }
};

function renderDialogue(key) {
    // 특수 이동 처리
    if (['go_kiosk', 'go_kiosk_again', 'go_keypad', 'go_payment_methods', 'go_retry_payment', 'go_kiosk_warning'].includes(key)) {
        setTimeout(() => {
            if (key === 'go_keypad') showPointKeypad();
            else if (key === 'go_payment_methods') { showLayer('kiosk'); showPaymentMethods(); }
            else if (key === 'go_retry_payment') { chatHeaderTitle.innerText = "민지 (Friend)"; showLayer('kiosk'); showPaymentMethods(); }
            else if (key === 'go_kiosk_warning') { 
                chatHeaderTitle.innerText = "민지 (Friend)"; // 헤더 복구
                showLayer('kiosk'); 
                showCustomPopup("⚠️ 주문 주의", "딴짓하지 말고 원래 주문하려던 메뉴를 시키자!", "알겠어", () => modalLayer.style.display='none');
            }
            else showLayer('kiosk');
        }, 800);
        return;
    }

    const node = dialogueData[key];
    if(node.speaker === 'boss') chatHeaderTitle.innerText = "카페 사장님 👨‍🍳"; // 헤더 변경

    setTimeout(() => {
        addChatMessage('left', node.text, node.speaker === 'boss');
        setTimeout(() => {
            const area = document.getElementById('choice-area');
            area.innerHTML = "";
            node.choices.forEach(c => {
                const btn = document.createElement('button');
                btn.className = "choice-btn pop-in";
                btn.innerText = c.text;
                btn.onclick = () => { addChatMessage('right', c.text); area.innerHTML = ""; renderDialogue(c.next); };
                area.appendChild(btn);
            });
        }, 600);
    }, 800);
}

function addChatMessage(side, text, isBoss = false) {
    const log = document.getElementById('chat-log');
    const msg = document.createElement('div'); msg.className = `msg ${side} pop-in`;
    let profileIcon = "👩"; 
    if (isBoss) profileIcon = "👨‍🍳"; 

    msg.innerHTML = side === 'left' ? 
        `<div class="friend-profile">${profileIcon}</div><div class="bubble">${text}</div>` : 
        `<div class="bubble">${text}</div>`;
    log.appendChild(msg); log.scrollTop = log.scrollHeight;
}

// --- [3] 옵션 및 메뉴 선택 (논커피 차단 로직) ---
function openOptions(menu) {
    // [NEW] 논커피 메뉴 클릭 시 사장님 대화로 납치
    if (menu === "생강차") {
        showLayer('chat');
        renderDialogue('ginger_1');
        return;
    }
    if (menu === "생딸기우유") {
        showLayer('chat');
        renderDialogue('berry_1');
        return;
    }

    // 기존 로직
    currentMenu = menu;
    document.getElementById('opt-menu-name').innerText = menu;
    const isCoffee = menu === "아메리카노";
    const isSpec = ["초코케이크", "생딸기우유"].includes(menu);

    currentOptions = { temp: "ICE", ice: isSpec ? "" : "보통", shot: isCoffee ? 1 : 0 };
    document.getElementById('temp-row').style.display = isSpec ? 'none' : 'block';
    document.getElementById('shot-row').style.display = isCoffee ? 'block' : 'none';
    
    document.getElementById('option-sheet').classList.add('active');
    updateOptionUI();
}

function switchTab(e, cat) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.menu-grid').forEach(g => g.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.getElementById(cat + '-menu').classList.add('active');
}

function setOption(type, val) {
    currentOptions[type] = val;
    if (type === 'temp') currentOptions.ice = (val === 'HOT') ? "" : "보통";
    updateOptionUI();
}

function updateOptionUI() {
    document.querySelectorAll('.pill').forEach(btn => {
        btn.classList.toggle('selected', currentOptions[btn.dataset.type] === btn.dataset.value);
    });
    const isSpec = ["초코케이크", "소금빵", "생딸기우유"].includes(currentMenu);
    document.getElementById('ice-row').style.display = (currentOptions.temp === 'HOT' || isSpec) ? 'none' : 'block';
    document.getElementById('shot-val').innerText = currentOptions.shot;
}

function changeShot(n) { currentOptions.shot = Math.max(0, Math.min(5, currentOptions.shot + n)); document.getElementById('shot-val').innerText = currentOptions.shot; }
function addToCart() { cart.push({ ...currentOptions, name: currentMenu }); cartCountDisplay.innerText = cart.length; closeSheet(); }
function closeSheet() { document.getElementById('option-sheet').classList.remove('active'); }
function closeSheetOutside(e) { if(e.target.id === 'option-sheet') closeSheet(); }

function openCart() {
    cartListContainer.innerHTML = cart.length === 0 ? "<p style='padding:20px; color:#bbb; text-align:center;'>장바구니가 비어 있습니다.</p>" : "";
    cart.forEach((i, idx) => {
        const div = document.createElement('div'); div.className = 'cart-item';
        div.innerHTML = `<div><b style='color:#3d2b1f;'>${i.name}</b><br><small style='color:#888;'>${i.temp} ${i.ice} ${i.shot}샷</small></div><button class="cart-del-btn" onclick="removeFromCart(${idx})">삭제</button>`;
        cartListContainer.appendChild(div);
    });
    cartDetailLayer.style.display = 'flex';
}
function removeFromCart(idx) { cart.splice(idx, 1); cartCountDisplay.innerText = cart.length; openCart(); }
function closeCart() { cartDetailLayer.style.display = 'none'; }

// --- [4] 포인트 및 결제 검증 ---
function handlePaymentClick() {
    if (cart.length === 0) return;
    const minji = cart.find(i => i.name === "아메리카노" && i.temp === "ICE" && i.shot === 1 && i.ice === "많이");
    const me = cart.find(i => i.name === "아메리카노" && i.temp === "HOT" && i.shot === 2);

    if (!minji || !me) {
        showCustomPopup("😫 주문 확인", "주문이 미션과 다릅니다.<br>민지: 아이스/1샷/얼음많이<br>나: 따뜻한/2샷<br>확인해보세요!", "장바구니 수정", () => { modalLayer.style.display='none'; openCart(); });
        return;
    }

    if (!isSuddenPhase) { isSuddenPhase = true; clearInterval(timerInterval); showLayer('chat'); renderDialogue('sudden_start'); }
    else if (!cart.find(i => i.name === "초코케이크")) { showCustomPopup("🍰 케이크 추가", "민지가 초코케이크도 먹고 싶대요!", "확인", () => { modalLayer.style.display='none'; }); }
    else if (!isPointPhase) { isPointPhase = true; showLayer('chat'); renderDialogue('point_start'); }
    else { showPointKeypad(); }
}

function showPointKeypad() {
    inputPhone = "010"; modalLayer.style.display = "flex";
    renderKeypadContent();
}

function renderKeypadContent() {
    modalBox.innerHTML = `
        <div class="pop-in">
            <h3 style="margin-bottom:15px; font-weight:800;">포인트 적립</h3>
            <div class="phone-display-container" id="phone-boxes">${renderPhoneBoxes(inputPhone)}</div>
            <div class="keypad">
                ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="key" onclick="pressKey('${n}')">${n}</button>`).join('')}
                <button class="key" onclick="pressKey('C')">C</button><button class="key" onclick="pressKey('0')">0</button>
                <button class="key enter" onclick="confirmPoints()">입력</button>
            </div>
            <button class="btn-confirm-large" style="background:#ddd; color:#666;" onclick="modalLayer.style.display='none'">취소</button>
        </div>`;
}

function renderPhoneBoxes(numStr) {
    const full = numStr.padEnd(11, " ");
    let html = "";
    for (let i = 0; i < 11; i++) {
        html += `<div class="digit-box ${full[i] !== " " ? 'filled' : ''}">${full[i] === " " ? "" : full[i]}</div>`;
        if (i === 2 || i === 6) html += `<div class="phone-dash">-</div>`;
    }
    return html;
}

function pressKey(k) { if (k === 'C') inputPhone = "010"; else if (inputPhone.length < 11) inputPhone += k; document.getElementById('phone-boxes').innerHTML = renderPhoneBoxes(inputPhone); }

function confirmPoints() {
    if(inputPhone === CORRECT_PHONE) { modalLayer.style.display='none'; showLayer('chat'); renderDialogue('pay_credit_start'); }
    else { showCustomPopup("❌ 번호 오류", "번호가 민지의 번호와 다릅니다!<br>힌트: 010-1234-5678", "다시 입력", () => renderKeypadContent()); }
}

function showPaymentMethods() {
    modalLayer.style.display = "flex";
    modalBox.innerHTML = `
        <div class="pop-in">
            <h3>결제 수단 선택</h3>
            <div style="display:flex; flex-direction:column; gap:12px; margin:20px 0;">
                <button class="btn-confirm-large" onclick="showRestriction()" style="background:#fff; border:2px solid #eee; color:#aaa;">💳 체크카드 결제</button>
                <button class="btn-confirm-large" onclick="processPayment('신용카드')" style="background:#fff; border:2px solid #eee; color:var(--primary);">🏦 신용카드 결제</button>
            </div>
            <p style="font-size:0.85rem; color:#888;">현금은 카운터로 문의하세요.</p>
        </div>`;
}

function showRestriction() {
    showCustomPopup("🤔 잠깐만요!", "민지는 <b>'신용카드'</b>로 결제하겠다고 했어요.", "다시 선택", () => showPaymentMethods());
}

// [핵심] 결제 처리 로직 (오류 -> 사장님 대화 -> 성공)
function processPayment(m) {
    if (m === '신용카드' && !hasPaymentFailed) {
        showCustomPopup("⚠️ 결제 오류", "IC칩 인식 실패!<br>카드를 확인해주세요.", "사장님 호출", () => {
            hasPaymentFailed = true;
            modalLayer.style.display = 'none';
            showLayer('chat');
            renderDialogue('boss_stage_1'); // 사장님 등판
        });
        return;
    }

    modalBox.innerHTML = `<h2>${m} 결제 중</h2><p>카드를 꾹! 눌러주세요.</p>`; 
    setTimeout(() => showFinalReceipt(m), 2500);
}

function showFinalReceipt(method) {
    let total = 0; let itemsHtml = "";
    const prices = {"아메리카노": 4500, "생강차": 5500, "생딸기우유": 5800, "초코케이크": 6500};
    cart.forEach(i => {
        const p = prices[i.name] || 0; total += p;
        const isBev = ["아메리카노", "생강차", "생딸기우유"].includes(i.name);
        const detail = isBev ? `<br><small style="color:#888;">(${i.temp.toLowerCase()}, 샷 ${i.shot}개, 얼음 ${i.ice})</small>` : "";
        itemsHtml += `<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;"><div style="text-align:left;"><strong>${i.name}</strong>${detail}</div><div>${p.toLocaleString()}원</div></div>`;
    });

    modalBox.innerHTML = `
        <div class="pop-in" style="text-align:center;">
            <h2 style="color:#2ecc71; margin-bottom:15px;">✔ 결제 완료</h2>
            <div class="receipt">
                <p style="text-align:center; font-weight:900; margin-bottom:15px; padding-bottom:10px; border-bottom:2px solid #333;">JINDAM CAFE</p>
                ${itemsHtml}
                <div style="border-top:1px dashed #aaa; margin-top:15px; padding-top:15px; display:flex; justify-content:space-between; font-weight:900; font-size:1.1rem;"><span>총액</span><span style="color:var(--accent);">${total.toLocaleString()}원</span></div>
            </div>
            <div style="background:#fdf2f0; padding:20px; border-radius:20px; margin-bottom:20px;">
                <span style="font-size:0.85rem; color:#e74c3c; font-weight:800;">대기 번호</span>
                <div style="font-size:3rem; font-weight:900; color:#e74c3c;">124</div>
            </div>
            <button class="btn-confirm-large" onclick="location.reload()">처음으로</button>
        </div>`;
}

function showCustomPopup(title, msg, btnText, cb) { 
    modalLayer.style.display="flex"; 
    modalBox.innerHTML=`<div class="pop-in"><h2 style="color:#ff4757;">${title}</h2><p style="margin:20px 0; line-height:1.5;">${msg}</p><button class="btn-confirm-large" id="c-btn">${btnText}</button></div>`; 
    document.getElementById('c-btn').onclick=cb; 
    layers.kiosk.classList.add('shake-ani'); setTimeout(() => layers.kiosk.classList.remove('shake-ani'), 400);
}

function startTimer() { if(!timerInterval) timerInterval = setInterval(() => { timeLeft--; document.getElementById('timer-display').innerText = timeLeft; if(timeLeft<=0) location.reload(); }, 1000); }
function closeSheetOutside(e) { if(e.target.id === 'option-sheet') closeSheet(); }
