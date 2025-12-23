import { authService } from './services/auth-service.js';
import { bookService } from './services/book-service.js';
import { reviewService } from './services/review-service.js';
import { chatService } from './services/chat-service.js';
import { showToast } from './utils/toast.js';

// DOM Elements
const dom = {
    authSection: document.getElementById('authSection'),
    loginInputs: document.getElementById('loginInputs'),
    authEmail: document.getElementById('authEmail'),
    authPassword: document.getElementById('authPassword'),
    btnRegister: document.getElementById('btnRegister'),
    btnLogin: document.getElementById('btnLogin'),
    btnLogout: document.getElementById('logoutBtn'),

    profileSection: document.getElementById('profileSection'),
    profileResult: document.getElementById('profileResult'),

    completeProfileSection: document.getElementById('completeProfileSection'),
    inputRealName: document.getElementById('inputRealName'),
    inputStudentId: document.getElementById('inputStudentId'),
    inputNickname: document.getElementById('inputNickname'),
    btnCompleteProfile: document.getElementById('btnCompleteProfile'),

    uploadSection: document.getElementById('uploadSection'),
    newBookTitle: document.getElementById('newBookTitle'),
    newBookPrice: document.getElementById('newBookPrice'),
    btnUploadBook: document.getElementById('btnUploadBook'),

    transactionSection: document.getElementById('transactionSection'),
    transactionList: document.getElementById('transactionList'),

    searchInput: document.getElementById('searchInput'),
    btnSearch: document.getElementById('btnSearch'),

    bookList: document.getElementById('bookList'),

    // Chat
    chatModal: document.getElementById('chatModal'),
    chatTitle: document.getElementById('chatTitle'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn'),
    chatCloseBtn: document.getElementById('chatCloseBtn'),

    // AI Upload
    bookImageInput: document.getElementById('bookImageInput'),
    imagePreview: document.getElementById('imagePreview'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    aiStatus: document.getElementById('aiStatus')
};

let currentUid = null;
let isProfileCompleted = false;
let currentUserProfile = null; // Store full profile data

// --- Event Listeners ---
function initEvents() {
    dom.btnRegister.addEventListener('click', handleSignUp);
    dom.btnLogin.addEventListener('click', handleLogin);
    dom.btnLogout.addEventListener('click', handleLogout);
    dom.btnCompleteProfile.addEventListener('click', handleCompleteProfile);
    dom.btnUploadBook.addEventListener('click', handleUploadBook);

    // Auth State Listener
    authService.onAuthStateChanged(handleAuthStateChange);
}

// --- Auth Handlers ---
async function handleAuthStateChange(user) {
    if (!user) {
        resetUI();
        return;
    }

    const email = user.email || "";
    const isSchoolEmail = email.endsWith('@shsh.tw') || email.endsWith('@school.edu.tw');

    if (!isSchoolEmail) {
        alert("非校內信箱，帳號將被系統自動刪除。");
        authService.logout();
        return;
    }

    currentUid = user.uid;
    console.log("校內用戶已登入:", currentUid);
    updateAuthUI(true);

    // Profile Listener
    authService.onProfileSnapshot(user.uid, (doc) => {
        if (doc.exists) {
            const data = doc.data();
            isProfileCompleted = data.isProfileCompleted || false;
            currentUserProfile = data; // Store it
            updateProfileUI(data);
        } else {
            console.log("Waiting for user profile creation...");
        }
    });

    // Books Listener (Modified for Client-side Search)
    bookService.onBooksSnapshot((snapshot) => {
        allBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderBooks();
    });

    // Transactions Listener
    // Note: In real app, we might mix buyer/seller queries. For now, let's just show Buyer transactions
    // or we can invoke both and merge (complexity: high).
    // Let's implement getUserTransactions to just enable the 'Buyer' view first as per plan.
    // If we want both, we can add a second listener or a compound query if index exists.
    // For simplicity: Show Buyer transactions (My Orders) AND Seller transactions (My Sales)
    // We'll just define two simple listeners.

    bookService.getUserTransactions(user.uid, (snapshot) => {
        renderTransactions(snapshot, 'buyer');
    });

    bookService.getSellerTransactions(user.uid, (snapshot) => {
        renderTransactions(snapshot, 'seller');
    });
}

async function handleSignUp() {
    const email = dom.authEmail.value;
    const password = dom.authPassword.value;
    if (!email || !password) return alert("請填寫完整資訊");
    try {
        await authService.signUp(email, password);
        showToast("✅ 註冊成功，請完成實名認證");
    } catch (e) { alert("註冊失敗: " + e.message); }
}

async function handleLogin() {
    const email = dom.authEmail.value;
    const password = dom.authPassword.value;
    try {
        await authService.login(email, password);
        showToast("👋 歡迎回來");
    } catch (e) { alert("登入失敗: " + e.message); }
}

async function handleLogout() {
    try {
        await authService.logout();
        resetUI();
    } catch (e) { console.error(e); }
}

async function handleCompleteProfile() {
    const data = {
        realName: dom.inputRealName.value,
        studentId: dom.inputStudentId.value,
        nickname: dom.inputNickname.value
    };
    if (!data.realName || !data.studentId || !data.nickname) return alert("所有欄位皆為必填！");

    showToast("⏳ 正在加密傳輸資料...");
    try {
        const result = await authService.completeProfile(data);
        if (result.data.success) {
            showToast("✅ 認證成功！");
        }
    } catch (e) {
        console.error(e);
        alert("認證失敗: " + e.message);
    }
}

// --- Book Handlers ---
async function handleUploadBook() {
    const title = dom.newBookTitle.value;
    const price = dom.newBookPrice.value;
    const file = dom.bookImageInput.files[0];

    if (!title) return alert("請輸入書名");

    let imageBase64 = null;
    if (file) {
        // Simple Base64 conversion for MVP
        // In production, upload to Firebase Storage
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    try {
        await bookService.createBook({
            title,
            price: Number(price),
            ownerId: currentUid,
            imageBase64: imageBase64 // Store image
        });
        showToast("✅ 上架完成");
        dom.newBookTitle.value = '';
        dom.newBookPrice.value = '';
        dom.bookImageInput.value = ''; // Reset file input
        dom.imagePreview.style.display = 'none'; // Reset preview
        dom.uploadPlaceholder.style.display = 'block';
    } catch (e) { alert(e.message); }
}

async function handleReserveBook(bookId, price) {
    if (!currentUid) return alert("請先登入帳號才能預訂！");

    // Prompt for Meeting Time
    const defaultTime = new Date(Date.now() + 86400000).toISOString().slice(0, 16); // Tomorrow
    const timeStr = prompt("步驟 1/2: 請選擇期望面交時間 (YYYY-MM-DDTHH:mm)", defaultTime);
    if (!timeStr) return; // User cancelled

    // Validate
    const meetingTime = new Date(timeStr);
    if (isNaN(meetingTime.getTime())) return alert("時間格式錯誤");

    showToast("⏳ 正在處理預訂請求...");
    try {
        const result = await bookService.reserveBook(bookId, currentUid, price, meetingTime.toISOString());
        if (result.success) {
            showToast("✅ 預訂成功！請等待賣家確認時間。");
        }
    } catch (error) {
        console.error("預訂出錯:", error);
        const errorMsg = error.response?.data?.message || error.message;
        showToast("❌ 預訂失敗: " + errorMsg);
    }
}

// Attach reserve function to window for dynamic buttons (created in renderBooks)
window.handleReserveBook = handleReserveBook;

// --- UI Helpers ---
function resetUI() {
    currentUid = null;
    dom.loginInputs.style.display = 'block';
    dom.btnLogout.style.display = 'none';
    dom.profileSection.style.display = 'none';
    dom.uploadSection.style.display = 'none';
    dom.completeProfileSection.style.display = 'none';
    dom.transactionSection.style.display = 'none';
    // Clear dynamic content? Maybe keep books visible but disable actions
}

function updateAuthUI(isLoggedIn) {
    dom.loginInputs.style.display = isLoggedIn ? 'none' : 'block';
    dom.btnLogout.style.display = isLoggedIn ? 'block' : 'none';
}

function updateProfileUI(data) {
    if (isProfileCompleted) {
        dom.completeProfileSection.style.display = 'none';
        dom.profileSection.style.display = 'block';
        dom.uploadSection.style.display = 'block';

        dom.profileResult.innerHTML = `
            <div style="background: #edf2f7; padding: 15px; border-radius: 8px;">
                <p>📛 暱稱: <strong>${data.nickname}</strong></p>
                <p>📧 信箱: ${data.email}</p>
                <p>⭐ 信用分數: <span style="font-size: 22px; color: #2b6cb0; font-weight: bold;">${data.creditScore}</span></p>
                <p>📊 平均評價: <strong>${data.averageRating || '尚未有評價'}</strong> <span style="font-size: 12px; color: #666;">(${data.ratingCount || 0} 則評論)</span></p>
            </div>
        `;
    } else {
        dom.completeProfileSection.style.display = 'block';
        dom.profileSection.style.display = 'none';
        dom.uploadSection.style.display = 'none';
    }
}


// Book State with Search Support
let allBooks = []; // Store raw book data
let currentSearchTerm = '';

// ... 

// Books Listener
bookService.onBooksSnapshot((snapshot) => {
    // Cache data
    allBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderBooks();
});

// ...

// Search Handlers
dom.btnSearch.addEventListener('click', () => {
    currentSearchTerm = dom.searchInput.value.trim().toLowerCase();
    renderBooks();
});

dom.searchInput.addEventListener('input', (e) => {
    // Real-time search (optional, can remove if only want button click)
    currentSearchTerm = e.target.value.trim().toLowerCase();
    renderBooks();
});

function renderBooks() {
    dom.bookList.innerHTML = "";

    // Filter
    const filtered = allBooks.filter(book => {
        if (!currentSearchTerm) return true;
        return book.title.toLowerCase().includes(currentSearchTerm);
    });

    if (filtered.length === 0) {
        dom.bookList.innerHTML = '<p style="color: #666; text-align: center;">找不到符合的書籍</p>';
        return;
    }

    filtered.forEach((book) => {
        const isAvailable = book.status === 'Available';
        const isMyBook = book.ownerId === currentUid;

        const item = document.createElement('div');
        item.className = 'book-item';

        let imageHtml = '';
        if (book.imageBase64) {
            imageHtml = `<img src="${book.imageBase64}" style="width: 50px; height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">`;
        } else {
            imageHtml = `<div style="width: 50px; height: 70px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📚</div>`;
        }

        item.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                ${imageHtml}
                <div style="flex: 1;">
                    <strong>${book.title}</strong>
                    <div style="font-size: 14px; margin-top: 2px;">$${book.price}</div> 
                    <span class="status-tag ${isAvailable ? 'available' : 'reserved'}">${book.status}</span>
                </div>
            </div>
            
            <button ${(!isAvailable || isMyBook || !isProfileCompleted) ? 'disabled' : ''} 
                    onclick="handleReserveBook('${book.id}', ${book.price})" style="margin-top: 5px; width: 100%;">
                ${isAvailable ? (isMyBook ? '我的書' : '預訂') : '已預訂'}
            </button>
        `;
        dom.bookList.appendChild(item);
    });
}

// Transaction State
let transactions = { buyer: [], seller: [] };

function renderTransactions(snapshot, role) {
    const list = role === 'buyer' ? snapshot.docs.map(d => ({ ...d.data(), id: d.id, role: 'Buyer' }))
        : snapshot.docs.map(d => ({ ...d.data(), id: d.id, role: 'Seller' }));

    transactions[role] = list;

    // Merge and Deduplicate
    const combined = [...transactions.buyer, ...transactions.seller];
    const uniqueMap = new Map();
    combined.forEach(item => {
        if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
        } else {
            // Already exists. Mark as dual role if needed.
            // Since we merged buyer first, the existing one is buyer role.
        }
    });

    const all = Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    const container = dom.transactionList;

    if (all.length === 0) {
        container.innerHTML = '<p style="color: #666;">尚無交易</p>';
        return;
    }

    dom.transactionSection.style.display = 'block'; // Show section if there are transactions
    container.innerHTML = "";

    all.forEach(t => {
        const isBuyer = t.buyerId === currentUid;
        const isSeller = t.sellerId === currentUid;
        const displayRole = (isBuyer && isSeller) ? 'Buyer/Seller' : (isBuyer ? 'Buyer' : 'Seller');
        const rescheduleCount = t.rescheduleCount || 0;
        // Only show pending transactions or recently completed? For now show all.
        // Status formatting
        let statusColor = '#ecc94b'; // Pending
        if (t.status === 'Completed') statusColor = '#48bb78';
        if (t.status === 'Canceled') statusColor = '#f56565';

        const item = document.createElement('div');
        item.style.border = "1px solid #e2e8f0";
        item.style.padding = "10px";
        item.style.marginBottom = "8px";
        item.style.borderRadius = "5px";
        item.style.background = "#fff";

        let actions = '';
        if (t.status === 'Pending') {
            // A. 時間尚未確認 -> 賣家審核階段
            if (!t.isTimeAgreed) {
                if (isSeller) {
                    actions += `<div style="display:flex; gap:5px; margin-bottom:5px;">
                        <button onclick="handleConfirmTransactionTime('${t.id}')" style="background:#48bb78; font-size:12px; padding:5px;">✅ 確認時間</button>
                        <button onclick="handleOpenChat('${t.id}', '買家')" style="background:#3182ce; font-size:12px; padding:5px;">💬 我們聊聊</button>
                    </div>`;
                    actions += `<button onclick="handleCancelTransaction('${t.id}')" style="background:#f56565; font-size:12px; padding:5px;">取消交易</button>`;
                } else {
                    // Buyer
                    actions += `<span style="font-size:12px; color:#666;">等待賣家確認時間...</span>`;
                    actions += `<button onclick="handleOpenChat('${t.id}', '賣家')" style="background:#3182ce; font-size:12px; padding:5px; margin-left:5px;">💬 聯絡賣家</button>`;
                    actions += `<button onclick="handleCancelTransaction('${t.id}')" style="background:#f56565; font-size:12px; padding:5px; margin-left:5px;">取消預訂</button>`;
                }

                // B. 時間已確認 -> 進入面交/收貨流程
            } else {
                if (isBuyer) {
                    actions += `<button onclick="handleConfirmTransaction('${t.id}')" style="background: #48bb78; font-size: 12px; padding: 5px 10px;">確認收書</button>`;
                    actions += `<button onclick="handleOpenChat('${t.id}', '賣家')" style="background:#3182ce; font-size:12px; padding:5px; margin-left:5px;">💬 私訊</button>`;
                    actions += `<button onclick="handleCancelTransaction('${t.id}')" style="background: #f56565; font-size: 12px; padding: 5px 10px; margin-left: 5px;">取消</button>`;
                } else {
                    actions += `<span style="font-size: 12px; color: #38a169; font-weight:bold;">等待買家收貨...</span>`;
                    actions += `<button onclick="handleOpenChat('${t.id}', '買家')" style="background:#3182ce; font-size:12px; padding:5px; margin-left:5px;">💬 私訊</button>`;
                    actions += `<button onclick="handleCancelTransaction('${t.id}')" style="background: #f56565; font-size: 12px; padding: 5px 10px; margin-left: 5px;">取消交易</button>`;
                }
            }
        } else if (t.status === 'Completed') {
            const canRateAsBuyer = (t.buyerId === currentUid) && !t.buyerRated;
            const canRateAsSeller = (t.sellerId === currentUid) && !t.sellerRated;

            if (canRateAsBuyer || canRateAsSeller) {
                const targetUid = (t.buyerId === currentUid) ? t.sellerId : t.buyerId;
                actions += `<button onclick="handleRateTransaction('${t.id}', '${targetUid}')" style="background: #ed8936; font-size: 12px; padding: 5px 10px;">⭐ 給予評價</button>`;
            } else {
                actions += `<span style="font-size: 12px; color: #aaa;">已評價</span>`;
            }
        }

        // Time Display Logic
        let meetingTimeDisplay = "尚未約定";
        if (t.meetingTime) {
            meetingTimeDisplay = new Date(t.meetingTime.seconds * 1000).toLocaleString();
        }

        // Show "Unconfirmed" tag if pending
        if (t.status === 'Pending' && !t.isTimeAgreed) {
            meetingTimeDisplay += ` <span style="color:#e53e3e; font-size:11px;">(待賣家確認)</span>`;
        }

        // Reschedule UI
        let rescheduleUI = '';
        if (t.isTimeAgreed && t.status === 'Pending') {
            if (t.rescheduleRequest) {
                const req = t.rescheduleRequest;
                const newTimeStr = new Date(req.newTime.seconds * 1000).toLocaleString();
                if (req.requesterId === currentUid) {
                    rescheduleUI = `<div style="margin-top:5px; padding:5px; background:#ebf8ff; border-radius:4px; font-size:12px;">⏳ 您已請求改期至 <strong>${newTimeStr}</strong>...</div>`;
                } else {
                    rescheduleUI = `<div style="margin-top:5px; padding:5px; background:#fffaf0; border:1px solid #ed8936; border-radius:4px; font-size:12px;">
                        📅 對方請求改期至 <strong>${newTimeStr}</strong><br>
                        <button onclick="handleRespondReschedule('${t.id}', 'accept')" style="background:#48bb78; font-size:11px;">同意</button>
                        <button onclick="handleRespondReschedule('${t.id}', 'reject')" style="background:#f56565; font-size:11px;">拒絕</button>
                    </div>`;
                }
            } else if (rescheduleCount < 2) {
                actions += `<br><button onclick="handleRequestReschedule('${t.id}')" style="background: #3182ce; font-size: 11px; padding: 2px 5px; margin-top: 5px;">📅 修改時間</button>`;
            }
        }

        item.innerHTML = `
             <div style="display: flex; justify-content: space-between; align-items: start;">
                 <div>
                     <strong>${t.bookTitle}</strong> <span style="font-size: 12px; color: #4a5568;">(${displayRole})</span><br>
                     <span style="font-size: 12px;">$${t.agreedPrice}</span><br>
                     <span style="font-size: 13px; color: #2b6cb0;">🕒 面交時間: ${meetingTimeDisplay}</span>
                     ${rescheduleCount > 0 ? `<span style="font-size:11px; color:#666;">(已改期 ${rescheduleCount} 次)</span>` : ''}
                     ${rescheduleUI}
                 </div>
                 <div style="text-align: right;">
                     <span style="background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${t.status}</span>
                     <div style="margin-top: 5px;">${actions}</div>
                 </div>
             </div>
         `;
        container.appendChild(item);
    });
}

// Transaction Handlers
async function handleConfirmTransaction(transId) {
    if (!confirm("確認已收到書籍並完成交易？此操作無法復原。")) return;
    showToast("⏳ 正在更新交易...");
    try {
        await bookService.updateTransactionStatus(transId, 'Completed');
        showToast("✅ 交易完成！信用分數已更新。");
    } catch (e) { alert(e.message); }
}

async function handleCancelTransaction(transId) {
    if (!confirm("確定要取消此交易嗎？若為惡意取消可能會扣除信用分數。")) return;
    showToast("⏳ 正在取消...");
    try {
        await bookService.updateTransactionStatus(transId, 'Canceled');
        showToast("✅ 交易已取消。");
    } catch (e) { alert(e.message); }
}

async function handleRateTransaction(transId, targetUid) {
    const ratingStr = prompt("請輸入評分 (1-5):", "5");
    if (ratingStr === null) return;
    const rating = parseInt(ratingStr);
    if (isNaN(rating) || rating < 1 || rating > 5) return alert("請輸入有效的數字 (1-5)");

    const comment = prompt("請輸入評語 (可選):", "");

    showToast("⏳ 正在送出評價...");
    try {
        await reviewService.addReview(transId, targetUid, rating, comment);
        showToast("✅ 評價成功！");
    } catch (e) {
        console.error(e);
        alert("評價失敗: " + (e.message || e));
    }
}

async function handleRequestReschedule(transId) {
    // Current simple UI: prompt for date string. In production, use a Date Picker modal.
    // Format: YYYY-MM-DDTHH:MM
    const defaultTime = new Date(Date.now() + 86400000).toISOString().slice(0, 16); // Tomorrow
    const newTimeStr = prompt("請求改期\n請輸入新的面交時間 (YYYY-MM-DDTHH:mm):", defaultTime);

    if (!newTimeStr) return;
    const newTime = new Date(newTimeStr);
    if (isNaN(newTime.getTime())) return alert("時間格式錯誤");

    const reason = prompt("請輸入改期原因 (可選):", "臨時有事");

    showToast("⏳ 正在送出請求...");
    try {
        await bookService.requestReschedule(transId, newTime, reason);
        showToast("✅ 已送出改期請求");
    } catch (e) {
        alert("請求失敗: " + e.message);
    }
}

async function handleRespondReschedule(transId, response) {
    const actionText = response === 'accept' ? '同意' : '拒絕';
    if (!confirm(`確定要${actionText}對方的改期請求嗎？`)) return;

    showToast("⏳ 處理中...");
    try {
        await bookService.respondToReschedule(transId, response);
        showToast(`✅ 已${actionText}改期`);
    } catch (e) {
        alert("處理失敗: " + e.message);
    }
}

async function handleConfirmTransactionTime(transId) {
    if (!confirm("確認要接受這個面交時間嗎？確認後將正式成立訂單。")) return;
    showToast("⏳ 正在確認時間...");
    try {
        await bookService.confirmTransactionTime(transId);
        showToast("✅ 時間已確認，訂單正式成立！");
    } catch (e) {
        alert("操作失敗: " + e.message);
    }
}

window.handleConfirmTransactionTime = handleConfirmTransactionTime;

window.handleConfirmTransaction = handleConfirmTransaction;
window.handleCancelTransaction = handleCancelTransaction;
window.handleRateTransaction = handleRateTransaction;
window.handleRequestReschedule = handleRequestReschedule;
window.handleRespondReschedule = handleRespondReschedule;


// Start
// --- Chat System ---
let currentChatTransactionId = null;
let currentChatUnsubscribe = null;

async function handleOpenChat(transactionId, otherPartyName) {
    currentChatTransactionId = transactionId;
    dom.chatTitle.textContent = `與 ${otherPartyName || '對方'} 的對話`;
    dom.chatModal.style.display = 'block';
    dom.chatMessages.innerHTML = '<p style="text-align:center; color:#999;">載入中...</p>';

    // Subscribe
    currentChatUnsubscribe = chatService.subscribeToMessages(transactionId, (messages) => {
        renderMessages(messages);
    });
}

function handleCloseChat() {
    dom.chatModal.style.display = 'none';
    currentChatTransactionId = null;
    if (currentChatUnsubscribe) {
        currentChatUnsubscribe();
        currentChatUnsubscribe = null;
    }
}

async function handleSendMessage() {
    const text = dom.chatInput.value;
    if (!text || !currentChatTransactionId) return;

    const senderName = currentUserProfile ? currentUserProfile.nickname : "User";

    try {
        await chatService.sendMessage(currentChatTransactionId, currentUid, senderName, text);
        dom.chatInput.value = '';
    } catch (e) {
        console.error(e);
        showToast("❌ 訊息傳送失敗");
    }
}

function renderMessages(messages) {
    dom.chatMessages.innerHTML = '';
    if (messages.length === 0) {
        dom.chatMessages.innerHTML = '<p style="text-align:center; color:#ccc; margin-top:20px;">尚無訊息，打個招呼吧！👋</p>';
        return;
    }

    messages.forEach(msg => {
        const isMe = msg.senderId === currentUid;
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = isMe ? 'flex-end' : 'flex-start';

        const bubble = document.createElement('div');
        bubble.style.maxWidth = '70%';
        bubble.style.padding = '8px 12px';
        bubble.style.borderRadius = '15px';
        bubble.style.fontSize = '14px';
        bubble.style.background = isMe ? '#3182ce' : '#e2e8f0';
        bubble.style.color = isMe ? 'white' : 'black';
        bubble.textContent = msg.content;

        const info = document.createElement('span');
        info.style.fontSize = '10px';
        info.style.color = '#999';
        info.style.marginTop = '2px';

        let timeStr = 'Sending...';
        if (msg.timestamp) {
            const d = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
            timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        info.textContent = isMe ? timeStr : `${msg.senderName || '對方'} ${timeStr}`;

        div.appendChild(bubble);
        div.appendChild(info);
        dom.chatMessages.appendChild(div);
    });

    // Auto scroll
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

// Attach to window
window.handleOpenChat = handleOpenChat;
window.handleCloseChat = handleCloseChat;

// Add event listeners for chat inputs
dom.chatSendBtn.addEventListener('click', handleSendMessage);
dom.chatCloseBtn.addEventListener('click', handleCloseChat);
dom.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});

// --- Image Handling ---
async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        dom.imagePreview.src = e.target.result;
        dom.imagePreview.style.display = 'block';
        dom.uploadPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

dom.bookImageInput.addEventListener('change', handleImageSelect);

initEvents();
