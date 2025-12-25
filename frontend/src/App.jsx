import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, MessageCircle, Share2, Star, AlertCircle, ShoppingCart,
  User, CheckCircle, MapPin, ThumbsUp, Send, Search, Bell,
  BookOpen, Filter, ArrowRight, Menu, Home, Lock, Mail, ChevronDown, Camera,
  Plus, Image as ImageIcon, Trash2, Clock, DollarSign, FileText, AlertTriangle,
  X, Gift, Repeat, LogOut, LayoutGrid, Tag, Info, HelpCircle, ShieldCheck,
  Smile, Flame, Book, Sparkles, HandMetal, Calendar, Zap, Coins, Settings,
  ChevronLeft, Palette, Store, ChevronRight, RotateCcw, ShoppingBag
} from 'lucide-react';
import { authService } from './services/auth-service';
import { bookService } from './services/book-service';
import { chatService } from './services/chat-service';
import { db } from './config';

// --- 全局樣式設定 ---
const fontStyle = { fontFamily: '"Noto Sans TC", "PMingLiU", sans-serif' };

// --- 奶茶色系色碼定義 ---
const COLORS = {
  whiteBucks: '#E8E3DF',
  cloudSand: '#E6DBC6',
  fossilGray: '#C9C3B6',
  brushwood: '#9E9081',
  chocolateBubble: '#A58976',
  brownWindmill: '#756256',
  bgLight: '#F9F7F5',
};

// --- 資料選項常數 ---
const PUBLISHERS = ['龍騰', '翰林', '南一', '三民', '全華', '泰宇', '其他補習班'];
const SUBJECTS = ['國文', '英文', '數學', '物理', '化學', '生物', '地科', '歷史', '地理', '公民'];
const GRADES = ['高一', '高二', '高三'];

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'chi', name: '國文' },
  { id: 'eng', name: '英文' },
  { id: 'math', name: '數學' },
  { id: 'sci', name: '自然' },
  { id: 'soc', name: '社會' },
  { id: 'extra', name: '課外讀物' },
  { id: 'exam', name: '學測' },
];

// --- 頭像列表資料 ---
const AVATAR_LIST = [
  // [類別 1] 預設
  { id: 'default', name: '初始初心者', price: 0, src: 'https://i.postimg.cc/9fW28Bc0/niu.jpg' },
  // [類別 2] 100 代幣限定 (ID 以 special 開頭)
  { id: 'special1', name: '限定兔兔', price: 100, src: 'https://i.postimg.cc/zyP43KbN/tu-zi.jpg' },
  { id: 'special2', name: '限定小豬', price: 100, src: 'https://i.postimg.cc/pd2vGBP9/zhu.jpg' },
  { id: 'special3', name: '限定狗狗', price: 100, src: 'https://i.postimg.cc/wB6zfk97/gou.jpg' },
  { id: 'special4', name: '限定小牛', price: 100, src: 'https://i.postimg.cc/qNvyYNG3/EE1D91FC-D76E-4FBA-A85F-33F8D82EAFEB.jpg' },
  { id: 'special5', name: '限定小羊', price: 100, src: 'https://i.postimg.cc/VkjgJMr4/84AD5380-E492-4603-B7C7-4BD68372B94A.jpg' },
  // [類別 3] 經典系列
  { id: 'cat', name: '熬夜貓貓', price: 100, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=cat&backgroundColor=FFD700' },
  { id: 'glasses', name: '考滿分', price: 100, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=glasses&backgroundColor=4ADE80' },
  { id: 'cool', name: '校園酷蓋', price: 100, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=cool&backgroundColor=A58976' },
  { id: 'artist', name: '文藝青年', price: 100, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=artist&backgroundColor=FFB6C1' },
  { id: 'robot', name: '理科腦', price: 100, src: 'https://api.dicebear.com/7.x/bottts/svg?seed=robot&backgroundColor=E0E0E0' },
];

const RECENT_BOOKS = []; // Fallback
const CONDITION_LEVELS = ["一成新", "三成新", "五成新", "九成新", "全新"];
const INITIAL_WISHES = [];
const INITIAL_NOTIFICATIONS = [];

// --- Helper Functions ---
const PriceDisplay = ({ type, price, originalPrice, large = false }) => {
  if (type === 'exchange') return <div className={`flex items-center gap-1 font-bold ${large ? 'text-2xl' : 'text-sm'}`} style={{ color: COLORS.brushwood }}><Repeat size={large ? 20 : 14} /><span>想交換</span></div>;
  if (type === 'gift') return <div className={`flex items-center gap-1 font-bold ${large ? 'text-2xl' : 'text-sm'}`} style={{ color: COLORS.chocolateBubble }}><Gift size={large ? 20 : 14} /><span>贈送</span></div>;
  return <div className="flex flex-col"><div className={`font-bold ${large ? 'text-3xl' : 'text-lg'}`} style={{ color: COLORS.brownWindmill }}>NT$ {price}</div>{originalPrice && <span className="text-xs line-through" style={{ color: COLORS.fossilGray }}>原價 ${originalPrice}</span>}</div>;
};

const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden border animate-pulse mb-4 break-inside-avoid" style={{ borderColor: COLORS.whiteBucks }}>
    <div className="aspect-[3/4] bg-gray-200"></div>
    <div className="p-4 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div>
  </div>
);

// --- [組件] 自動輪播精選區 ---
const FeaturedCarousel = ({ items, onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredItems = (items || []).slice(0, 5);

  useEffect(() => {
    if (featuredItems.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  if (featuredItems.length === 0) return null;
  const currentItem = featuredItems[activeIndex];

  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="bg-orange-500 text-white p-1 rounded-full"><Flame size={12} fill="currentColor" /></span>
        <h2 className="text-sm font-bold tracking-wide flex items-center gap-2" style={{ color: COLORS.brownWindmill }}>
          本日精選 <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">自動更新中</span>
        </h2>
      </div>
      <div className="relative w-full h-[calc(100%-32px)] bg-white rounded-xl shadow-sm overflow-hidden border cursor-pointer group"
        style={{ borderColor: COLORS.whiteBucks }}
        onClick={() => onNavigate('product', currentItem)}>
        <div key={currentItem.id + '-bg'}
          className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 animate-pulse-slow transition-all duration-1000 transform scale-110"
          style={{ backgroundImage: `url(${currentItem.cover || currentItem.imageBase64})` }}></div>

        <div className="absolute inset-0 flex items-center p-4 z-10">
          <div key={currentItem.id + '-img'} className="w-28 h-36 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-white transform transition-transform duration-500 hover:scale-105 animate-fade-in-up">
            <img src={currentItem.cover || currentItem.imageBase64} alt={currentItem.title} className="w-full h-full object-cover" />
          </div>

          <div key={currentItem.id + '-text'} className="flex-1 ml-4 flex flex-col justify-center h-full animate-fade-in-right">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">HOT</span>
              <span className="text-xs text-gray-400">{activeIndex + 1} / {featuredItems.length}</span>
            </div>

            <h3 className="font-bold text-lg text-[#5D4037] line-clamp-2 leading-tight mb-2">
              {currentItem.title}
            </h3>

            <div className="mt-auto">
              <p className="text-xs text-gray-500 mb-1">{currentItem.author}</p>
              <div className="flex items-center justify-between">
                <PriceDisplay type={currentItem.type} price={currentItem.price} originalPrice={currentItem.originalPrice} />
                <div className="w-8 h-8 rounded-full bg-[#756256] text-white flex items-center justify-center shadow-md transform translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
          {featuredItems.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full overflow-hidden transition-all duration-300 ${idx === activeIndex ? 'w-6 bg-gray-200' : 'w-1.5 bg-gray-300'}`}
            >
              {idx === activeIndex && (
                <div className="h-full bg-[#756256] animate-progress-fill" style={{ width: '100%' }}></div>
              )}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes progress-fill { from { width: 0%; } to { width: 100%; } }
        .animate-progress-fill { animation: progress-fill 4s linear; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
        @keyframes fade-in-right { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in-right { animation: fade-in-right 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

// --- 學生戰情室組件 ---
const StudentDashboard = ({ coins, isCheckedIn, onCheckIn, onGoToStore, examCountdown, isLoading, books, onNavigate }) => {
  const [selectedExamIndex, setSelectedExamIndex] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customData, setCustomData] = useState({ title: "自訂考試", date: new Date().toISOString().slice(0, 10).replace(/-/g, "") });

  const exams = examCountdown?.exams || [];
  const hasDynamicExams = exams.length > 0;

  // Generate Ticker Items
  const generatedTickerItems = (books || []).slice(0, 5).map(book => {
    const displayGrade = (!book.grade || book.grade === '其他' || book.grade === 'all') ? '' : book.grade + ' ';
    const displayName = book.seller?.name || '有人';
    return {
      time: "最新",
      content: `${displayGrade}${displayName} 上架了《${book.title}》`
    };
  });

  const TICKER_ITEMS = generatedTickerItems.length > 0 ? generatedTickerItems : [
    { time: "", content: "歡迎來到 SchoolBookExchange！" },
    { time: "", content: "目前沒有最新動態" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % TICKER_ITEMS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [TICKER_ITEMS.length]);

  const currentTicker = TICKER_ITEMS[tickerIndex] || TICKER_ITEMS[0];

  const getCurrentExam = () => {
    if (selectedExamIndex === 'custom') {
      const targetDate = new Date(customData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { title: `距離${customData.title}`, days: Math.max(0, days) };
    }
    if (exams && exams.length > 0 && exams[selectedExamIndex]) {
      return {
        title: `距離${exams[selectedExamIndex].title}`,
        days: exams[selectedExamIndex].daysLeft
      };
    }
    return {
      title: isLoading ? "資料連動中..." : "距離學測 (預設)",
      days: isLoading ? "--" : 300
    };
  };

  const { title, days } = getCurrentExam();

  // Dynamic Exam Selection Component
  const ExamSelector = () => (
    <div className="flex items-center text-xs text-gray-400 relative z-20 w-full justify-center">
      <span className="mr-1 flex-shrink-0">距離</span>
      <div className="relative inline-block group max-w-[85%]">
        <select
          value={selectedExamIndex}
          onChange={(e) => {
            const val = e.target.value;
            setIsEditingCustom(false);
            setSelectedExamIndex(Number(val));
          }}
          className="appearance-none bg-transparent pr-4 outline-none cursor-pointer hover:text-gray-600 font-medium text-gray-500 truncate"
          disabled={!hasDynamicExams}
        >
          {hasDynamicExams ? (
            exams.map((exam, index) => (
              <option key={index} value={index}>
                {exam.title}
              </option>
            ))
          ) : (
            <option>{isLoading ? "讀取中" : "暫無考試"}</option>
          )}
        </select>
        <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
      </div>
    </div>
  );

  return (
    <div className="mx-4 mt-4 mb-6 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {/* Left: Featured Carousel (2/3 width) */}
        <div className="col-span-2 h-44">
          <FeaturedCarousel items={books} onNavigate={onNavigate} />
        </div>

        {/* Right: Exam & Coins (1/3 width, stacked) */}
        <div className="col-span-1 h-44 flex flex-col gap-2">
          {/* Exam Card */}
          <div className="flex-1 bg-white p-2 rounded-xl border flex flex-col items-center relative overflow-hidden" style={{ borderColor: COLORS.whiteBucks }}>
            <div className="absolute top-0 right-0 w-12 h-12 bg-red-50 rounded-full -mr-5 -mt-5 z-0"></div>
            <div className="relative z-10 w-full flex flex-col justify-between h-full">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold justify-center">
                <Calendar size={12} className="text-red-500" /> 校務考試
              </div>
              <div className="flex flex-col items-center justify-center -mt-1">
                <div className="text-3xl font-bold text-gray-800 tracking-tighter leading-none">{days}</div>
                <div className="text-[10px] text-gray-500 font-bold">天</div>
              </div>
              <div className="w-full text-center">
                <ExamSelector />
              </div>
            </div>
          </div>

          {/* Coins/Check-in Card */}
          <div className="h-16 bg-white p-2 rounded-xl border flex flex-col justify-between relative overflow-hidden cursor-pointer hover:bg-yellow-50 transition-colors"
            style={{ borderColor: COLORS.whiteBucks }}
            onClick={onCheckIn}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#756256]">
                <Coins size={12} className="text-yellow-500" /> {coins}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 text-center font-bold">每日簽到</div>
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div className="bg-white rounded-lg border px-3 py-2 flex items-center gap-3 shadow-sm" style={{ borderColor: COLORS.whiteBucks }}>
        <div className="bg-red-50 text-red-500 p-1 rounded-md">
          <Zap size={14} fill="currentColor" />
        </div>
        <div className="flex-1 overflow-hidden h-5 relative">
          <div key={tickerIndex} className="absolute animate-slide-up text-xs font-medium text-gray-600 w-full truncate">
            <span className="font-bold text-[#756256] mr-1">{currentTicker.time}</span>
            {currentTicker.content}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 許願池組件 ---
const WishingWell = ({ wishes, onAddWish, currentUser, currentAvatar }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onAddWish(content);
    setContent("");
    setIsModalOpen(false);
  };

  return (
    <div className="mb-8 px-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-yellow-400 text-white p-1 rounded-full"><Sparkles size={16} fill="currentColor" /></span>
        <h2 className="text-lg font-bold tracking-wide" style={{ color: COLORS.brownWindmill }}>許願池</h2>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3" style={{ borderColor: COLORS.whiteBucks }}>
        {wishes.map(wish => {
          const avatar = AVATAR_LIST.find(a => a.id === wish.avatarId) || AVATAR_LIST[0];
          return (
            <div key={wish.id} className="flex gap-3 border-b last:border-0 pb-3 last:pb-0" style={{ borderColor: COLORS.bgLight }}>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={avatar.src} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-[#756256]">{wish.user}</span>
                  <span className="text-xs font-normal text-gray-400">{wish.time}</span>
                </div>
                <p className="text-sm text-[#9E9081]">{wish.content}</p>
              </div>
            </div>
          );
        })}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2 mt-2 text-xs font-bold text-[#9E9081] border border-dashed hover:bg-[#F9F7F5] rounded-lg transition-colors flex items-center justify-center gap-1"
          style={{ borderColor: COLORS.fossilGray }}
        >
          <Plus size={14} /> 我也想許願
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-scale-up flex flex-col h-[60vh] md:h-auto">
            <div className="flex justify-between items-center p-3 border-b" style={{ borderColor: COLORS.whiteBucks }}>
              <button onClick={() => setIsModalOpen(false)} className="p-1"><X size={24} className="text-gray-600" /></button>
              <span className="font-bold text-[#756256] text-lg">建立許願</span>
              <button
                onClick={handleSubmit}
                className="text-blue-500 font-bold text-sm px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-transparent"
                disabled={!content.trim()}
              >
                發佈
              </button>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                  <img src={currentAvatar?.src} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-[#5D4037]">{currentUser?.name || "同學"}</span>
              </div>
              <textarea
                className="flex-1 w-full resize-none outline-none text-[#5D4037] placeholder-gray-400 text-lg leading-relaxed"
                placeholder="寫下你想找的書或是筆記..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 登入頁面 ---
const LoginPage = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isRegistering) {
      if (!email.endsWith('@shsh.tw')) {
        alert("僅限 @shsh.tw 校內信箱註冊！");
        setIsLoading(false);
        return;
      }
      if (!realName || !studentId || !nickname) {
        alert("請填寫所有欄位（姓名、學號、暱稱）");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isRegistering) {
        await authService.signUp(email, password);
        try {
          await authService.completeProfile({ realName, studentId, nickname });
          alert("註冊成功！");
        } catch (profileError) {
          console.error("Profile completion failed", profileError);
          alert("註冊成功，但在建立個人資料時發生錯誤，請稍後聯繫管理員。");
        }
        alert("註冊成功！請直接登入");
        setIsRegistering(false);
      } else {
        await authService.login(email, password);
      }
    } catch (error) {
      console.error(error);
      alert((isRegistering ? "註冊失敗: " : "登入失敗: ") + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F5]">
        <div className="text-[#756256] font-bold">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ ...fontStyle, backgroundColor: COLORS.bgLight, color: COLORS.brownWindmill }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border" style={{ borderColor: COLORS.whiteBucks }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.brownWindmill }}>{isRegistering ? '註冊帳號' : '歡迎回到循環平台'}</h2>
        <p className="text-sm mb-6" style={{ color: COLORS.brushwood }}>
          {isRegistering ? '加入我們，讓舊書重獲新生' : '讓閒置的講義，找到新的主人'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 mb-4">
          {isRegistering && (
            <>
              <input type="text" value={realName} onChange={e => setRealName(e.target.value)} placeholder="真實姓名 (不公開)" className="w-full p-3 border rounded-xl bg-gray-50" required />
              <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="學號" className="w-full p-3 border rounded-xl bg-gray-50" required />
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="顯示暱稱" className="w-full p-3 border rounded-xl bg-gray-50" required />
            </>
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (@shsh.tw)" className="w-full p-3 border rounded-xl" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded-xl" required />

          <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl border-2 font-bold mb-3 hover:bg-gray-50 flex items-center justify-center gap-2" style={{ borderColor: COLORS.whiteBucks, color: COLORS.brownWindmill }}>
            {isLoading ? '處理中...' : (isRegistering ? '註冊' : '登入')}
          </button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-gray-400 hover:underline">
          {isRegistering ? '已有帳號？登入' : '沒有帳號？點此註冊 (限用校內信箱)'}
        </button>
      </div>
    </div>
  );
};

// --- 商品詳情頁 ---
const ProductDetailPage = ({ product, onBack, onContact, currentUser }) => {
  if (!product) return null;
  const isOwner = currentUser?.uid === product.sellerId;

  return (
    <div className="min-h-screen pb-24 bg-white" style={fontStyle}>
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-4 py-3 bg-white/80 backdrop-blur-md border-b" style={{ borderColor: COLORS.whiteBucks }}>
        <button onClick={onBack} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"><ChevronLeft size={20} color={COLORS.brownWindmill} /></button>
        <div className="flex gap-3">
          <button className="p-2 rounded-full hover:bg-gray-100"><Share2 size={20} color={COLORS.brownWindmill} /></button>
          <button className="p-2 rounded-full hover:bg-gray-100"><Heart size={20} color={COLORS.brownWindmill} /></button>
        </div>
      </nav>

      <div className="pt-16 pb-6 md:pt-20 md:pb-12 md:px-8 max-w-6xl mx-auto md:flex md:gap-10 md:items-start">
        {/* Left: Image */}
        <div className="aspect-[4/3] bg-gray-100 relative md:w-1/2 md:aspect-square md:rounded-2xl md:overflow-hidden md:shadow-sm md:sticky md:top-24">
          <img src={product.cover || product.imageBase64 || "https://dummyimage.com/600x400/eee/aaa"} alt={product.title} className="w-full h-full object-contain bg-[#F9F7F5]" />
        </div>

        {/* Right: Details */}
        <div className="px-5 mt-6 md:w-1/2 md:px-0 md:mt-0">
          <div className="flex gap-2 mb-2">
            <span className="text-xs font-bold px-2 py-1 rounded bg-[#F9F7F5] text-[#9E9081]">{product.subject}</span>
            {product.grade && product.grade !== '其他' && (
              <span className="text-xs font-bold px-2 py-1 rounded bg-[#F9F7F5] text-[#9E9081]">{product.grade}</span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-2 leading-tight" style={{ color: COLORS.brownWindmill }}>{product.title}</h1>
          <p className="text-sm text-gray-500 mb-4">{product.author} · {product.publisher}</p>

          <div className="flex items-end gap-3 mb-6 pb-6 border-b" style={{ borderColor: COLORS.whiteBucks }}>
            <PriceDisplay type={product.type} price={product.price} originalPrice={product.originalPrice} large />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#9E9081] mb-2">商品狀況</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg inline-block border border-gray-100">{product.conditionLevel}</p>
              <p className="text-gray-700 mt-2">{product.location ? product.location : '面交'}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#9E9081] mb-2">賣家描述</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description || "賣家未提供詳細描述。"}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#9E9081] mb-2">賣家資訊</h3>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F9F7F5] border border-stone-100">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white shadow-sm">
                  <User size={24} className="text-gray-500" />
                </div>
                <div>
                  <div className="font-bold text-[#756256] text-lg">
                    {product.seller?.nickname || product.seller?.name || "未知賣家"}
                    <span className="text-sm text-gray-500 font-normal ml-2">@{product.seller?.studentId || "未知學號"}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Star size={12} fill="#fbbf24" className="text-yellow-400" />
                    <span className="font-bold text-gray-700">{product.seller?.score || 5.0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Contact Button */}
            {!isOwner && (
              <div className="hidden md:block pt-4">
                <button onClick={onContact} className="w-full py-4 bg-[#756256] text-white rounded-xl font-bold shadow-lg hover:bg-[#5D4E44] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 text-lg">
                  <MessageCircle size={20} /> 聯絡賣家 / 預訂
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t safe-area-bottom flex gap-3 md:hidden z-40" style={{ borderColor: COLORS.whiteBucks }}>
          <button onClick={onContact} className="flex-1 py-3 bg-[#756256] text-white rounded-xl font-bold shadow-lg hover:bg-[#5D4E44] transition-colors flex items-center justify-center gap-2">
            <MessageCircle size={18} /> 聯絡賣家
          </button>
        </div>
      )}
    </div>
  );
};

// --- [New] 聊天室組件 (ChatRoom) ---
const ChatRoom = ({ transactionId, currentUser, title, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!transactionId) return;
    const unsubscribe = chatService.subscribeToMessages(transactionId, (data) => {
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe && unsubscribe();
  }, [transactionId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await chatService.sendMessage(transactionId, currentUser.uid, currentUser.name || currentUser.nickname || "同學", newMessage);
      setNewMessage("");
    } catch (e) {
      console.error(e);
      alert("發送失敗: " + e.message);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-t-xl rounded-bl-xl shadow-2xl flex flex-col z-50 animate-slide-up border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#756256] text-white p-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} />
          <span className="font-bold text-sm truncate max-w-[150px]">{title || "聊天室"}</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors"><X size={16} /></button>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F9F7F5]">
        {messages.length === 0 && <div className="text-center text-xs text-gray-400 mt-4">與賣家開始聊天吧！</div>}
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${isMe ? 'bg-[#756256] text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none border'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <div className="p-3 bg-white border-t flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="輸入訊息..."
          className="flex-1 bg-gray-100 rounded-full px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#756256]"
        />
        <button onClick={handleSend} className="bg-[#756256] text-white p-2 rounded-full hover:bg-[#5D4E44] transition-colors">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

// --- ChatList Component ---
const ChatList = ({ currentUser, onSelectChat, onClose }) => {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const chatsMap = new Map();
    const updateChats = (snapshot) => {
      snapshot.forEach(doc => {
        chatsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      setChats(Array.from(chatsMap.values()).sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return tB - tA;
      }));
    };

    const unsubBuyer = bookService.getUserTransactions(currentUser.uid, updateChats);
    const unsubSeller = bookService.getSellerTransactions(currentUser.uid, updateChats);
    return () => {
      unsubBuyer();
      unsubSeller();
    };
  }, [currentUser]);

  return (
    <div className="fixed bottom-20 right-4 w-80 max-h-96 bg-white rounded-xl shadow-2xl flex flex-col z-50 animate-slide-up border border-stone-200 overflow-hidden">
      <div className="bg-[#756256] text-white p-3 flex justify-between items-center">
        <span className="font-bold">我的訊息</span>
        <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><X size={16} /></button>
      </div>
      <div className="overflow-y-auto p-2 space-y-2 bg-[#F9F7F5] flex-1">
        {chats.length === 0 && <div className="text-center text-gray-400 py-4 text-sm">尚無聊天記錄</div>}
        {chats.map(chat => (
          <div key={chat.id} onClick={() => onSelectChat({ transactionId: chat.id, title: chat.bookTitle })}
            className="p-3 bg-white hover:bg-gray-50 rounded-lg cursor-pointer transition-colors shadow-sm border border-gray-100">
            <div className="font-bold text-[#756256] text-sm truncate">{chat.bookTitle}</div>
            <div className="text-xs text-gray-500 flex justify-between mt-1">
              <span>{chat.buyerId === currentUser.uid ? '向賣家提問' : '來自買家'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${chat.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {chat.status === 'Pending' ? '進行中' : chat.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 簽到成功模態框 ---
const CheckInModal = ({ onClose, onConfirm, coins }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="bg-white rounded-xl p-6 w-full max-w-xs text-center shadow-2xl animate-scale-up">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
        <Coins size={32} />
      </div>
      <h3 className="text-xl font-bold text-[#5D4037] mb-2">每日簽到成功！</h3>
      <p className="text-gray-500 mb-6">獲得 {coins} 枚代幣，明天也要記得來喔！</p>
      <button onClick={onConfirm} className="w-full py-3 bg-[#756256] text-white rounded-xl font-bold shadow-lg hover:bg-[#5D4E44]">
        太棒了
      </button>
    </div>
  </div>
);

// --- 個人頁面組件 ---
const ProfilePage = ({ currentUser, userBooks, onNavigate, onUpload, onBuyAvatar, onEquipAvatar, myAvatars, currentAvatar, coins }) => {
  const [activeTab, setActiveTab] = useState('shelf'); // shelf, upload, store
  const [uploadForm, setUploadForm] = useState({
    title: '', author: '', publisher: '', subject: '', grade: '',
    price: '', originalPrice: '', type: 'sell', conditionLevel: '五成新',
    description: '', location: '', cover: null, imageBase64: null
  });
  const [showAvatarConfirm, setShowAvatarConfirm] = useState(null);

  // Upload Handlers
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadForm({ ...uploadForm, imageBase64: reader.result, cover: null });
      reader.readAsDataURL(file);
    }
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.price) return alert("標題與價格為必填");
    onUpload({
      ...uploadForm,
      sellerId: currentUser.uid,
      seller: { name: currentUser.realName || currentUser.displayName, studentId: currentUser.studentId, score: 5.0 }
    });
    alert("上架成功！");
    setActiveTab('shelf');
    setUploadForm({ ...uploadForm, title: '', price: '', imageBase64: null });
  };

  return (
    <div className="min-h-screen bg-[#F9F7F5] pb-24" style={fontStyle}>
      {/* Header Profile Info */}
      <div className="bg-white p-6 pb-4 shadow-sm border-b relative overflow-hidden" style={{ borderColor: COLORS.whiteBucks }}>
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="w-20 h-20 rounded-full bg-gray-200 border-4 border-white shadow-md overflow-hidden">
              <img src={currentAvatar?.src} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 bg-blue-500 p-1 rounded-full border-2 border-white"><Settings size={12} className="text-white" /></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.brownWindmill }}>{currentUser.realName || currentUser.displayName || "同學"}</h1>
            <p className="text-gray-500 text-xs mt-1">@{currentUser.studentId || "unknown"}</p>
            <div className="flex gap-2 mt-2">
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Coins size={10} /> {coins}</span>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">信用 5.0</span>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex mt-6 border-b" style={{ borderColor: COLORS.whiteBucks }}>
          {[
            { id: 'shelf', label: '我的書架', icon: Book },
            { id: 'upload', label: '上架書籍', icon: Plus },
            { id: 'store', label: '頭像商店', icon: Store },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 pb-3 text-center text-sm font-bold transition-colors relative ${activeTab === tab.id ? 'text-[#756256]' : 'text-gray-400'}`}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <tab.icon size={16} /> {tab.label}
              </div>
              {activeTab === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#756256] rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {/* TAB: My Shelf */}
        {activeTab === 'shelf' && (
          <div className="space-y-4">
            {userBooks.length === 0 ? (
              <div className="text-center py-10 text-gray-400">還沒有上架任何書籍喔</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {userBooks.map(book => (
                  <div key={book.id} onClick={() => onNavigate('product', book)} className="bg-white rounded-lg shadow-sm border overflow-hidden cursor-pointer">
                    <div className="aspect-[3/4] bg-gray-100 relative">
                      <img src={book.cover || book.imageBase64 || "https://dummyimage.com/300x400/eee/aaa"} className="w-full h-full object-cover" />
                      <span className="absolute top-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md">架上</span>
                    </div>
                    <div className="p-2">
                      <h3 className="font-bold text-sm text-[#5D4037] truncate">{book.title}</h3>
                      <PriceDisplay type={book.type} price={book.price} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Upload */}
        {activeTab === 'upload' && (
          <form onSubmit={handleBookSubmit} className="space-y-4 max-w-lg mx-auto bg-white p-6 rounded-xl shadow-sm border" style={{ borderColor: COLORS.whiteBucks }}>
            {/* Image Upload */}
            <div className="w-full aspect-video bg-gray-50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden"
              style={{ borderColor: COLORS.fossilGray }}>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploadForm.imageBase64 ? (
                <img src={uploadForm.imageBase64} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <>
                  <Camera size={32} className="text-gray-400 mb-2" />
                  <span className="text-xs text-gray-400">點擊上傳書況照片</span>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#9E9081]">書籍資訊</label>
              <input type="text" placeholder="書名" value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} className="w-full p-2 border rounded-lg bg-[#F9F7F5] outline-none focus:ring-1 focus:ring-[#756256]" />
              <div className="flex gap-2">
                <input type="text" placeholder="作者" value={uploadForm.author} onChange={e => setUploadForm({ ...uploadForm, author: e.target.value })} className="flex-1 p-2 border rounded-lg bg-[#F9F7F5]" />
                <select value={uploadForm.publisher} onChange={e => setUploadForm({ ...uploadForm, publisher: e.target.value })} className="flex-1 p-2 border rounded-lg bg-[#F9F7F5]">
                  <option value="">出版商</option>
                  {PUBLISHERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <select value={uploadForm.subject} onChange={e => setUploadForm({ ...uploadForm, subject: e.target.value })} className="flex-1 p-2 border rounded-lg bg-[#F9F7F5]">
                  <option value="">科目</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={uploadForm.grade} onChange={e => setUploadForm({ ...uploadForm, grade: e.target.value })} className="flex-1 p-2 border rounded-lg bg-[#F9F7F5]">
                  <option value="">年級</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#9E9081]">交易設定</label>
              <div className="flex gap-2">
                {['sell', 'exchange', 'gift'].map(type => (
                  <button type="button" key={type}
                    onClick={() => setUploadForm({ ...uploadForm, type })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${uploadForm.type === type ? 'bg-[#756256] text-white' : 'bg-white text-gray-500'}`}>
                    {type === 'sell' ? '販售' : type === 'exchange' ? '交換' : '贈送'}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="價格" value={uploadForm.price} onChange={e => setUploadForm({ ...uploadForm, price: e.target.value })} disabled={uploadForm.type !== 'sell'} className="w-full p-2 border rounded-lg bg-[#F9F7F5]" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#9E9081]">詳細描述</label>
              <textarea rows={3} placeholder="描述書況、筆記程度..." value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} className="w-full p-2 border rounded-lg bg-[#F9F7F5]" />
            </div>

            <button type="submit" className="w-full py-3 bg-[#756256] text-white rounded-xl font-bold shadow-lg hover:bg-[#5D4E44]">確認上架</button>
          </form>
        )}

        {/* TAB: Store / Avatar */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            {/* My Avatars */}
            <div>
              <h3 className="font-bold text-[#756256] mb-3">我的頭像</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {myAvatars.map(avatarId => {
                  const avatar = AVATAR_LIST.find(a => a.id === avatarId) || AVATAR_LIST[0];
                  const isEquipped = currentAvatar?.id === avatarId;
                  return (
                    <div key={avatarId} onClick={() => onEquipAvatar(avatarId)} className={`flex-shrink-0 w-16 flex flex-col items-center gap-1 cursor-pointer opacity-${isEquipped ? '100' : '50 hover:opacity-100'}`}>
                      <div className={`w-14 h-14 rounded-full overflow-hidden border-2 p-0.5 ${isEquipped ? 'border-[#756256]' : 'border-transparent'}`}>
                        <img src={avatar.src} className="w-full h-full rounded-full bg-gray-100 object-cover" />
                      </div>
                      {isEquipped && <span className="text-[10px] bg-[#756256] text-white px-1.5 py-0.5 rounded-full">使用中</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shop */}
            <div>
              <h3 className="font-bold text-[#756256] mb-3">頭像商店</h3>
              <div className="grid grid-cols-2 gap-3">
                {AVATAR_LIST.filter(a => !myAvatars.includes(a.id) && a.price > 0).map(avatar => (
                  <div key={avatar.id} onClick={() => setShowAvatarConfirm(avatar)} className="bg-white p-3 rounded-xl border flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                    <img src={avatar.src} className="w-12 h-12 rounded-full bg-gray-100" />
                    <div>
                      <div className="font-bold text-[#5D4037] text-sm">{avatar.name}</div>
                      <div className="text-yellow-600 font-bold text-xs flex items-center gap-1"><Coins size={10} /> {avatar.price}</div>
                    </div>
                  </div>
                ))}
                {AVATAR_LIST.filter(a => !myAvatars.includes(a.id) && a.price > 0).length === 0 && (
                  <div className="col-span-2 text-center text-gray-400 text-sm py-4">已擁有所有頭像！</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAvatarConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-xs text-center shadow-xl">
            <h3 className="font-bold text-lg mb-2">購買確認</h3>
            <img src={showAvatarConfirm.src} className="w-20 h-20 mx-auto rounded-full my-4 bg-gray-100" />
            <p className="mb-4 text-sm text-gray-600">確定花費 {showAvatarConfirm.price} 代幣購買「{showAvatarConfirm.name}」嗎？</p>
            <div className="flex gap-2">
              <button onClick={() => setShowAvatarConfirm(null)} className="flex-1 py-2 border rounded-lg font-bold text-gray-500">取消</button>
              <button onClick={() => {
                onBuyAvatar(showAvatarConfirm);
                setShowAvatarConfirm(null);
              }} className="flex-1 py-2 bg-[#756256] text-white rounded-lg font-bold">購買</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 主應用程式 ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('login'); // login, home, product, profile
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null); // { transactionId, title }

  // Data States
  const [books, setBooks] = useState([]);
  const [coins, setCoins] = useState(100);
  const [wishes, setWishes] = useState([]);
  const [myAvatars, setMyAvatars] = useState(['default']);
  const [currentAvatarId, setCurrentAvatarId] = useState('default');
  const [notifications, setNotifications] = useState([]);
  const [examCountdown, setExamCountdown] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Initial Auth Check
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setCurrentPage('home');
        if (!bookService.hasCheckedInToday()) {
          // Can check in
        }
      } else {
        setCurrentUser(null);
        setCurrentPage('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // Data Loading
  useEffect(() => {
    if (!currentUser) return;

    const unsubBooks = bookService.onBooksSnapshot((data) => setBooks(data));
    const unsubWishes = bookService.onWishesSnapshot((data) => setWishes(data));

    // Notifications & Coins (Mock or Real)
    // Here we can initialize real-time listeners if services support it

    return () => {
      unsubBooks();
      unsubWishes();
    };
  }, [currentUser]);

  // Exam Countdown Fetch
  useEffect(() => {
    if (!currentUser) return;
    // Replace with actual API call or your fallback
    // const fetchExams = async () => { ... }
    //For now mock:
    setExamCountdown({ exams: [{ title: '學測', daysLeft: 23 }, { title: '分科', daysLeft: 180 }] });
  }, [currentUser]);

  const handleNavigate = (page, product = null) => {
    if (product) setSelectedProduct(product);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentPage('login');
  };

  const handleCheckIn = () => {
    if (bookService.hasCheckedInToday()) return;
    const earned = 10;
    setCoins(prev => prev + earned);
    bookService.recordCheckIn();
    setShowCheckInModal(true);
  };

  // Avatar Logic
  const handleBuyAvatar = (avatar) => {
    if (coins < avatar.price) return alert("代幣不足！");
    if (myAvatars.includes(avatar.id)) return alert("已擁有此頭像");
    setCoins(prev => prev - avatar.price);
    setMyAvatars(prev => [...prev, avatar.id]);
    alert(`成功購買 ${avatar.name}！`);
  };

  const currentAvatar = AVATAR_LIST.find(a => a.id === currentAvatarId) || AVATAR_LIST[0];

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLogin={() => { }} />; // handled by auth listener
      case 'home':
        return (
          <div className="min-h-screen bg-[#F9F7F5] pb-24" style={fontStyle}>
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 py-3 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2 text-[#756256] font-bold text-xl">
                <Store /> 循環平台
              </div>
              <div className="flex gap-3">
                <button onClick={() => { }} className="p-2 bg-white rounded-full shadow-sm text-gray-500 relative">
                  <Bell size={20} />
                  {notifications.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
              </div>
            </div>

            {/* Dashboard */}
            <StudentDashboard
              coins={coins}
              isCheckedIn={false}
              onCheckIn={handleCheckIn}
              examCountdown={examCountdown}
              isLoading={!examCountdown}
              books={books}
              onNavigate={handleNavigate}
            />

            {/* Search Bar */}
            <div className="px-4 mb-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border flex items-center gap-2" style={{ borderColor: COLORS.whiteBucks }}>
                <Search size={18} className="text-gray-400" />
                <input type="text" placeholder="搜尋書籍、講義..." className="flex-1 outline-none text-gray-700 bg-transparent" />
              </div>
            </div>

            {/* Category Filter */}
            <div className="px-4 mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} className="px-4 py-2 bg-white rounded-full border text-sm font-bold whitespace-nowrap text-[#9E9081] shadow-sm">
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Feed */}
            <div className="px-4 grid grid-cols-2 gap-3">
              {books.map(book => (
                <div key={book.id} onClick={() => handleNavigate('product', book)} className="bg-white rounded-xl overflow-hidden shadow-sm border animate-fade-in-up cursor-pointer" style={{ borderColor: COLORS.whiteBucks }}>
                  <div className="aspect-[3/4] bg-gray-100 relative">
                    <img src={book.cover || book.imageBase64 || "https://dummyimage.com/300x400/eee/aaa"} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">{book.conditionLevel}</div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-[#5D4037] text-sm line-clamp-2 mb-1">{book.title}</h3>
                    <PriceDisplay type={book.type} price={book.price} />
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                      <MapPin size={10} /> {book.location || "校內面交"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Wishing Well Area */}
            <div className="mt-8">
              <WishingWell wishes={wishes} onAddWish={(content) => bookService.addWish({ content, user: currentUser.nickname, avatarId: currentAvatarId })} currentUser={currentUser} currentAvatar={currentAvatar} />
            </div>
          </div>
        );
      case 'product':
        return <ProductDetailPage product={selectedProduct} onBack={() => setCurrentPage('home')} onContact={() => bookService.startTransaction(selectedProduct, currentUser, (id) => setActiveChat({ transactionId: id, title: selectedProduct.title }))} currentUser={currentUser} />;
      case 'profile':
        return <ProfilePage currentUser={currentUser} userBooks={books.filter(b => b.sellerId === currentUser.uid)} onNavigate={handleNavigate} onUpload={(data) => bookService.addBook(data)} onBuyAvatar={handleBuyAvatar} onEquipAvatar={setCurrentAvatarId} myAvatars={myAvatars} currentAvatar={currentAvatar} coins={coins} />;
      default:
        return <div>404 Not Found</div>;
    }
  };

  return (
    <>
      {renderPage()}

      {/* Bottom Nav (Only on Home/Profile) */}
      {(currentPage === 'home' || currentPage === 'profile') && (
        <div className="fixed bottom-0 w-full bg-white border-t py-3 px-6 flex justify-between items-center z-50 safe-area-bottom" style={{ borderColor: COLORS.whiteBucks }}>
          <button onClick={() => setCurrentPage('home')} className={`flex flex-col items-center gap-1 ${currentPage === 'home' ? 'text-[#756256]' : 'text-gray-400'}`}>
            <Home size={24} strokeWidth={currentPage === 'home' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">首頁</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 relative">
            <div className="p-3 bg-[#756256] rounded-full -mt-8 shadow-lg border-4 border-[#F9F7F5] transform transition-transform hover:scale-105 active:scale-95 text-white">
              <Plus size={24} />
            </div>
            <span className="text-[10px] font-bold mt-1">上架</span>
          </button>
          <button onClick={() => setCurrentPage('profile')} className={`flex flex-col items-center gap-1 ${currentPage === 'profile' ? 'text-[#756256]' : 'text-gray-400'}`}>
            <User size={24} strokeWidth={currentPage === 'profile' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">我的</span>
          </button>
        </div>
      )}

      {/* Global Modals */}
      {activeChat && (
        <ChatRoom transactionId={activeChat.transactionId} title={activeChat.title} currentUser={currentUser} onClose={() => setActiveChat(null)} />
      )}

      {currentUser && !activeChat && (
        <ChatList currentUser={currentUser} onSelectChat={(chat) => setActiveChat(chat)} onClose={() => { }} />
      )}

      {showCheckInModal && <CheckInModal onClose={() => setShowCheckInModal(false)} onConfirm={() => setShowCheckInModal(false)} coins={10} />}
    </>
  );
};

export default App;
