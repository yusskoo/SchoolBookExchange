import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, MessageCircle, Share2, Star, AlertCircle, ShoppingCart,
  User, CheckCircle, MapPin, ThumbsUp, Send, Search, Bell,
  BookOpen, Filter, ArrowRight, Menu, Home, Lock, Mail, ChevronDown, Camera,
  Plus, Image as ImageIcon, Trash2, Clock, DollarSign, FileText, AlertTriangle, X, Gift, Repeat, LogOut, LayoutGrid, Tag, Info, HelpCircle, ShieldCheck, Smile, Flame, Book, Sparkles, HandMetal, Calendar, Zap, Coins, Settings, ChevronLeft, Palette, Store, ChevronRight
} from 'lucide-react';
import { authService } from './services/auth-service';
import { bookService } from './services/book-service';
import { chatService } from './services/chat-service';

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
  { id: 'exam', name: '學測' },
];

const AVATAR_LIST = [
  { id: 'default', name: '初始初心者', price: 0, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=default&backgroundColor=E6DBC6' },
  { id: 'cat', name: '熬夜貓貓', price: 50, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=cat&backgroundColor=FFD700' },
  { id: 'glasses', name: '考滿分', price: 120, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=glasses&backgroundColor=4ADE80' },
  { id: 'cool', name: '校園酷蓋', price: 200, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=cool&backgroundColor=A58976' },
  { id: 'artist', name: '文藝青年', price: 300, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=artist&backgroundColor=FFB6C1' },
  { id: 'robot', name: '理科腦', price: 500, src: 'https://api.dicebear.com/7.x/bottts/svg?seed=robot&backgroundColor=E0E0E0' },
];

const CONDITION_LEVELS = ['一成新', '三成新', '五成新', '九成新', '全新'];

const INITIAL_WISHES = [];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'comment', user: '王小明', avatar: null, content: '請問這本書還有嗎？', time: '5分鐘前', isRead: false },
  { id: 2, type: 'system', content: '您的書籍已經上架超過 30 天未售出。', time: '2小時前', isRead: false }
];

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

const FeaturedCarousel = ({ items, onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredItems = items.slice(0, 5);

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
    <div className="mx-4 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-orange-500 text-white p-1 rounded-full animate-pulse"><Flame size={16} fill="currentColor" /></span>
        <h2 className="text-lg font-bold tracking-wide flex items-center gap-2" style={{ color: COLORS.brownWindmill }}>
          本日精選 <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">自動更新中</span>
        </h2>
      </div>
      <div className="relative w-full h-48 bg-white rounded-2xl shadow-md overflow-hidden border cursor-pointer group" style={{ borderColor: COLORS.whiteBucks }} onClick={() => onNavigate('product', currentItem)}>
        <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 scale-110 transition-all duration-1000" style={{ backgroundImage: `url(${currentItem.cover || currentItem.imageBase64})` }}></div>
        <div className="absolute inset-0 flex items-center p-4 z-10">
          <div className="w-28 h-36 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-white transform group-hover:scale-105 transition-transform duration-500">
            <img src={currentItem.cover || currentItem.imageBase64} alt={currentItem.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 ml-4 flex flex-col justify-center h-full">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">HOT</span>
              <span className="text-xs text-gray-400">{activeIndex + 1} / {featuredItems.length}</span>
            </div>
            <h3 className="font-bold text-lg text-[#5D4037] line-clamp-2 leading-tight mb-2 animate-fade-in">{currentItem.title}</h3>
            <div className="mt-auto">
              <p className="text-xs text-gray-500 mb-1">{currentItem.author}</p>
              <div className="flex items-center justify-between">
                <PriceDisplay type={currentItem.type} price={currentItem.price} originalPrice={currentItem.originalPrice} />
                <div className="w-8 h-8 rounded-full bg-[#756256] text-white flex items-center justify-center shadow-md transform translate-x-10 group-hover:translate-x-0 transition-transform duration-300">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
          {featuredItems.map((_, idx) => (
            <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-6 bg-[#756256]' : 'w-1.5 bg-gray-300'}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = ({ coins, examCountdown }) => {
  // Simplification: Direct display of the next exam from backend
  const [selectedIndex, setSelectedIndex] = useState(0);
  const exams = examCountdown?.exams || [];
  const currentExam = (exams.length > 0 && exams[selectedIndex]) ? exams[selectedIndex] : { title: (exams.length === 0 && examCountdown) ? '載入中...' : '無考試', daysLeft: 0 };

  return (
    <div className="mx-4 mt-4 mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-xl border flex flex-col justify-between h-28 relative overflow-hidden" style={{ borderColor: COLORS.whiteBucks }}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-full -mr-6 -mt-6 z-0"></div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-500 font-bold mb-1">
              <Calendar size={14} className="text-red-500" />
              <span>校務考試</span>
            </div>
            <div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-gray-800">{currentExam.daysLeft}</span><span className="text-xs text-gray-500">天</span></div>

            <div className="relative">
              <div className="text-[10px] text-gray-400 mt-1 truncate flex items-center gap-1 cursor-pointer hover:text-gray-600 transition-colors">
                距離 {currentExam.title} <ChevronDown size={10} />
              </div>
              {exams.length > 1 && (
                <select
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                >
                  {exams.map((exam, index) => (
                    <option key={index} value={index}>{exam.title} ({exam.date.substring(4, 6)}/{exam.date.substring(6, 8)})</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
        <div className={`p-3 rounded-xl border flex flex-col justify-between h-28 relative overflow-hidden bg-white`} style={{ borderColor: COLORS.whiteBucks }}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-50 rounded-full -mr-6 -mt-6 z-0"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between"><div className="flex items-center gap-1 text-xs text-gray-500 font-bold"><Coins size={14} className="text-yellow-500" />書香幣</div><div className="text-xs font-bold text-[#756256]">{coins}</div></div>
            <div className="text-center"><div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-1"><Gift size={20} className="text-yellow-600" /></div><div className="text-xs text-gray-600 font-bold">每日簽到領好禮</div></div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg border px-3 py-2 flex items-center gap-3 shadow-sm" style={{ borderColor: COLORS.whiteBucks }}>
        <div className="bg-red-50 text-red-500 p-1 rounded-md"><Zap size={14} fill="currentColor" /></div>
        <div className="flex-1 overflow-hidden h-5 relative">
          <div className="absolute animate-slide-up text-xs font-medium text-gray-600"><span className="font-bold text-[#756256] mr-1">3分鐘前</span>高二 208班 陳同學 上架了《物理講義》</div>
        </div>
      </div>
    </div>
  );
};

const WishingWell = ({ wishes, onAddWish, currentUser, currentAvatar }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    onAddWish(content);
    setContent('');
    setIsModalOpen(false);
  };

  return (
    <div className="mb-8 px-4">
      <div className="flex items-center gap-2 mb-3"><span className="bg-yellow-400 text-white p-1 rounded-full"><Sparkles size={16} fill="currentColor" /></span><h2 className="text-lg font-bold tracking-wide" style={{ color: COLORS.brownWindmill }}>許願池</h2></div>
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3" style={{ borderColor: COLORS.whiteBucks }}>

        {wishes.map(wish => {
          const avatar = AVATAR_LIST.find(a => a.id === wish.avatarId) || AVATAR_LIST[0];
          return (
            <div key={wish.id} className="flex gap-3 border-b last:border-0 pb-3 last:pb-0" style={{ borderColor: COLORS.bgLight }}>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={avatar.src} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1"><div className="flex justify-between items-center mb-1"><span className="text-sm font-bold text-[#756256]">{wish.user}</span><span className="text-xs font-normal text-gray-400">{wish.time}</span></div><p className="text-sm text-[#9E9081]">{wish.content}</p></div>
            </div>
          );
        })}
        <button onClick={() => setIsModalOpen(true)} className="w-full py-2 mt-2 text-xs font-bold text-[#9E9081] border border-dashed hover:bg-[#F9F7F5] rounded-lg transition-colors flex items-center justify-center gap-1" style={{ borderColor: COLORS.fossilGray }}><Plus size={14} /> 我也想許願</button>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-scale-up flex flex-col h-[60vh] md:h-auto">
            <div className="flex justify-between items-center p-3 border-b" style={{ borderColor: COLORS.whiteBucks }}><button onClick={() => setIsModalOpen(false)} className="p-1"><X size={24} className="text-gray-600" /></button><span className="font-bold text-[#756256] text-lg">建立許願</span><button onClick={handleSubmit} className="text-blue-500 font-bold text-sm px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-transparent" disabled={!content.trim()}>發佈</button></div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100"><img src={currentAvatar.src} alt="avatar" className="w-full h-full object-cover" /></div><span className="font-bold text-[#5D4037]">{currentUser.nickname || currentUser.email}</span></div>
              <textarea className="flex-1 w-full resize-none outline-none text-[#5D4037] placeholder-gray-400 text-lg leading-relaxed" placeholder="寫下你想找的書或是筆記..." value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
            </div>
            <div className="p-3 border-t bg-gray-50 flex gap-4 text-gray-400"><Camera size={20} className="cursor-pointer hover:text-[#756256] transition-colors" /><Tag size={20} className="cursor-pointer hover:text-[#756256] transition-colors" /></div>
          </div>
        </div>
      )}
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isRegistering && !email.endsWith('@shsh.tw')) {
      alert("僅限 @shsh.tw 校內信箱註冊！");
      setIsLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        await authService.signUp(email, password);
        alert("註冊成功！請直接登入");
        setIsRegistering(false);
      } else {
        await authService.login(email, password);
      }
      // onAuthStateChanged in App will handle redirect
    } catch (error) {
      alert((isRegistering ? "註冊失敗: " : "登入失敗: ") + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ ...fontStyle, backgroundColor: COLORS.bgLight, color: COLORS.brownWindmill }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border" style={{ borderColor: COLORS.whiteBucks }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.brownWindmill }}>{isRegistering ? '註冊帳號' : '歡迎回到循環平台'}</h2>
        <p className="text-sm mb-6" style={{ color: COLORS.brushwood }}>
          {isRegistering ? '加入我們，讓舊書重獲新生' : '讓閒置的講義，找到新的主人'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (@shsh.tw)" className="w-full p-3 border rounded-xl" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded-xl" required />
          <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl border-2 font-bold mb-3 hover:bg-gray-50 flex items-center justify-center gap-2" style={{ borderColor: COLORS.whiteBucks, color: COLORS.brownWindmill }}>
            {isLoading ? '處理中...' : (isRegistering ? '註冊' : '登入')}
          </button>
          <div className="text-xs text-gray-400 cursor-pointer hover:underline" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? '已有帳號？登入' : '沒有帳號？點此註冊 (限用校內信箱)'}
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductDetailPage = ({ product, onBack, onContact }) => {
  if (!product) return null;
  return (
    <div className="min-h-screen pb-24 bg-white" style={fontStyle}>
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-4 py-3 bg-white/80 backdrop-blur-md border-b" style={{ borderColor: COLORS.whiteBucks }}>
        <button onClick={onBack} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"><ChevronLeft size={20} color={COLORS.brownWindmill} /></button>
        <div className="flex gap-3"><button className="p-2 rounded-full hover:bg-gray-100"><Share2 size={20} color={COLORS.brownWindmill} /></button><button className="p-2 rounded-full hover:bg-gray-100"><Heart size={20} color={COLORS.brownWindmill} /></button></div>
      </nav>
      <div className="pt-16 pb-6">
        <div className="aspect-[4/3] bg-gray-100 relative">
          <img src={product.cover || product.imageBase64} alt={product.title} className="w-full h-full object-contain bg-[#F9F7F5]" />
        </div>
        <div className="px-5 mt-6">
          <div className="flex gap-2 mb-2"><span className="text-xs font-bold px-2 py-1 rounded bg-[#F9F7F5] text-[#9E9081]">{product.subject}</span><span className="text-xs font-bold px-2 py-1 rounded bg-[#F9F7F5] text-[#9E9081]">{product.grade}</span></div>
          <h1 className="text-2xl font-bold mb-1 leading-tight" style={{ color: COLORS.brownWindmill }}>{product.title}</h1>
          <p className="text-sm text-gray-500 mb-4">{product.author} · {product.publisher}</p>
          <div className="flex items-end gap-3 mb-6 pb-6 border-b" style={{ borderColor: COLORS.whiteBucks }}>
            <PriceDisplay type={product.type} price={product.price} originalPrice={product.originalPrice} large />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#9E9081] mb-2">商品狀況</h3>
              <p className="text-gray-700">{product.conditionLevel} · {product.location ? product.location : '面交'}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#9E9081] mb-2">賣家描述</h3>
              <p className="text-gray-700 leading-relaxed">{product.description || '賣家未提供詳細描述。'}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t safe-area-bottom flex gap-3" style={{ borderColor: COLORS.whiteBucks }}>
        <button onClick={onContact} className="flex-1 py-3 bg-[#756256] text-white rounded-xl font-bold shadow-lg hover:bg-[#5D4E44] transition-colors flex items-center justify-center gap-2">
          <MessageCircle size={18} /> 預訂/聯絡賣家
        </button>
      </div>
    </div>
  );
};

const HomePage = ({ onNavigate, user, unreadCount, currentAvatarId, coins, wishes, onAddWish, books, isLoading, examCountdown }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterPublisher, setFilterPublisher] = useState('all');

  const handleResetHome = () => { setFilterGrade('all'); setFilterSubject('all'); setFilterPublisher('all'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const filteredBooks = books.filter(book => {
    const query = searchQuery.toLowerCase();
    const keywordMatch = !query.trim() || book.title.toLowerCase().includes(query);
    // const gradeMatch = filterGrade === 'all' || book.grade === filterGrade; // Add grade field to upload if needed
    return keywordMatch;
  });

  const currentAvatar = AVATAR_LIST.find(a => a.id === currentAvatarId) || AVATAR_LIST[0];

  return (
    <div className="min-h-screen pb-20" style={{ ...fontStyle, backgroundColor: COLORS.bgLight, color: COLORS.brownWindmill }}>
      <div className="pt-6 pb-12 px-4 rounded-b-[2rem] shadow-lg" style={{ background: `linear-gradient(135deg, ${COLORS.chocolateBubble}, ${COLORS.brownWindmill})`, color: COLORS.bgLight }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2"><div className="w-8 h-8 backdrop-blur rounded-sm flex items-center justify-center font-bold font-serif" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>校</div><span className="text-xl font-bold tracking-widest">循環平台</span></div>
            <div className="flex items-center gap-3">
              <button onClick={handleResetHome} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Home size={20} /></button>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/20 border border-white/10 text-white text-xs font-bold shadow-sm backdrop-blur-sm"><Coins size={14} className="text-yellow-400" fill="currentColor" /><span>{coins}</span></div>
              <button onClick={() => onNavigate('notifications')} className="relative p-2 hover:bg-white/10 rounded-full transition-colors"><Bell size={20} />{unreadCount > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
              <button onClick={() => onNavigate('profile')} className="flex items-center gap-2 hover:bg-white/20 pl-1 pr-3 py-1 rounded-full transition-all border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}><div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden bg-white/20"><img src={currentAvatar.src} alt="avatar" className="w-full h-full object-cover" /></div><span className="hidden sm:inline text-sm font-medium tracking-wide">{user.nickname || user.email}</span></button>
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-2">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 tracking-widest text-center">讓書本延續它的旅程</h1>
            <div className="bg-[#FDFBF7] rounded-xl shadow-xl overflow-hidden p-2">
              <div className="flex items-center border-b px-2" style={{ borderColor: COLORS.whiteBucks }}><Search className="text-[#9E9081]" size={20} /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋書名..." className="w-full py-3 px-4 bg-transparent text-[#756256] placeholder-[#C9C3B6] outline-none" />{searchQuery && <button onClick={() => setSearchQuery('')} className="text-[#9E9081]"><X size={16} /></button>}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 -mt-6">
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">{CATEGORIES.map(cat => (<button key={cat.id} className="whitespace-nowrap px-5 py-2 rounded-full text-sm tracking-wide shadow-sm transition-all border" style={{ backgroundColor: COLORS.bgLight, color: COLORS.brownWindmill, borderColor: COLORS.whiteBucks }}>{cat.name}</button>))}</div>
        <StudentDashboard coins={coins} examCountdown={examCountdown} />
        <WishingWell wishes={wishes} onAddWish={onAddWish} currentUser={user} currentAvatar={currentAvatar} />
        <div className="pb-8">
          <div className="flex justify-between items-end mb-4 px-1 border-b pb-2" style={{ borderColor: COLORS.whiteBucks }}><h2 className="text-xl font-bold flex items-center gap-2 tracking-wide" style={{ color: COLORS.brownWindmill }}><Book size={20} style={{ color: COLORS.chocolateBubble }} />{searchQuery ? '搜尋結果' : '探索發現'}</h2></div>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 animate-fade-in space-y-4">
            {isLoading ? (Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)) : filteredBooks.length > 0 ? (
              filteredBooks.map((book) => (
                <div key={book.id} onClick={() => onNavigate('product', book)} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer break-inside-avoid mb-4 border" style={{ borderColor: COLORS.whiteBucks }}>
                  <div className="relative" style={{ backgroundColor: COLORS.bgLight }}>
                    <img src={book.cover || book.imageBase64} alt={book.title} className="w-full object-cover" />
                    <div className={`absolute top-0 right-0 text-white text-[10px] px-3 py-1 rounded-bl-lg font-bold tracking-wider shadow-sm`} style={{ backgroundColor: COLORS.brownWindmill }}>{book.price}</div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm leading-tight mb-1" style={{ color: COLORS.brownWindmill }}>{book.title}</h3>
                    <div className="mt-auto border-t pt-2" style={{ borderColor: COLORS.whiteBucks }}><div className="flex items-end justify-between"><span className="font-bold">NT$ {book.price}</span></div></div>
                  </div>
                </div>
              ))
            ) : (<div className="col-span-full text-center py-12"><p>找不到符合的書籍</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ... ProfilePage similar to new_front.js but hooks up with services ...
const ProfilePage = ({ onBack, user, onLogout, coins, myAvatars, currentAvatarId, onPurchase, onEquip }) => {
  const [tab, setTab] = useState('shelf'); // 'upload', 'shelf', 'store'
  const INITIAL_MY_LISTINGS = []; // Or pass as prop if needed
  const [myListings, setMyListings] = useState(INITIAL_MY_LISTINGS);
  const [sellForm, setSellForm] = useState({
    title: '', author: '', price: '', conditionLevel: '九成新', images: []
  });

  const handleUpload = () => {
    alert("上架成功！(模擬)");
    const newItem = {
      id: Date.now(),
      title: sellForm.title || "未命名書籍",
      price: sellForm.price || 0,
      type: 'sell',
      status: 'active',
      date: new Date().toLocaleDateString(),
      views: 0,
      cover: "https://im1.book.com.tw/image/getImage?i=https://www.books.com.tw/img/001/086/56/0010865620.jpg&v=5f2a7a5dk&w=348&h=348"
    };
    setMyListings([newItem, ...myListings]);
    setTab('shelf');
    setSellForm({ title: '', author: '', price: '', conditionLevel: '九成新', images: [] });
  };

  const currentAvatar = AVATAR_LIST.find(a => a.id === currentAvatarId) || AVATAR_LIST[0];

  return (
    <div className="min-h-screen pb-20" style={{ ...fontStyle, backgroundColor: COLORS.bgLight, color: COLORS.brownWindmill }}>
      <nav className="backdrop-blur-md shadow-sm border-b sticky top-0 z-50" style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderColor: COLORS.whiteBucks }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowRight size={20} className="rotate-180 text-[#9E9081]" /></button><div className="font-bold text-lg tracking-wide">個人專區</div></div>
          <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 text-red-700 border border-red-200"><LogOut size={14} /> 登出</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Profile Header & Avatar Editor */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer" onClick={() => setTab('store')}>
            <div className="w-24 h-24 rounded-full border-4 shadow-md overflow-hidden bg-white" style={{ borderColor: COLORS.bgLight }}>
              <img src={currentAvatar.src} className="w-full h-full object-cover" alt="User" />
            </div>
            <div className="absolute bottom-0 right-0 text-white p-1.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center" style={{ backgroundColor: COLORS.chocolateBubble, width: 28, height: 28 }}>
              <Palette size={14} />
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-widest" style={{ color: COLORS.brownWindmill }}>{user.nickname || user.email}</h2>
          <p className="text-sm text-[#9E9081] mb-2">{user.grade || '未填寫'} {user.class ? `${user.class}班` : ''} · {user.email}</p>

          <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full text-xs font-bold text-yellow-700">
            <Coins size={14} fill="currentColor" /> {coins} 書香幣
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border rounded-lg overflow-hidden bg-white p-1" style={{ borderColor: COLORS.whiteBucks }}>
          <button onClick={() => setTab('shelf')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tab === 'shelf' ? 'bg-[#F9F7F5] text-[#756256]' : 'text-gray-400 hover:text-gray-600'}`}>我的書櫃</button>
          <button onClick={() => setTab('upload')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tab === 'upload' ? 'bg-[#F9F7F5] text-[#756256]' : 'text-gray-400 hover:text-gray-600'}`}>上架書籍</button>
          <button onClick={() => setTab('store')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tab === 'store' ? 'bg-[#F9F7F5] text-[#756256]' : 'text-gray-400 hover:text-gray-600'}`}>頭像商店</button>
        </div>

        {/* Content */}
        {tab === 'upload' ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4 animate-fade-in" style={{ borderColor: COLORS.whiteBucks }}>
            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-[#F9F7F5] cursor-pointer" style={{ borderColor: COLORS.fossilGray }}>
              <ImageIcon className="mx-auto text-[#9E9081] mb-2" />
              <span className="text-sm text-[#756256]">點擊上傳封面照片</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#9E9081] mb-1">書籍名稱</label>
              <input type="text" value={sellForm.title} onChange={e => setSellForm({ ...sellForm, title: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50 text-sm" placeholder="例如：龍騰高一英文" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#9E9081] mb-1">售價 (NT$)</label>
                <input type="number" value={sellForm.price} onChange={e => setSellForm({ ...sellForm, price: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50 text-sm" placeholder="100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9E9081] mb-1">書況</label>
                <select value={sellForm.conditionLevel} onChange={e => setSellForm({ ...sellForm, conditionLevel: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                  {CONDITION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleUpload} className="w-full py-3 bg-[#756256] text-white rounded-xl font-bold shadow-md hover:bg-[#5D4E44] transition-colors">
              確認上架
            </button>
          </div>
        ) : tab === 'store' ? (
          <div className="bg-white rounded-xl shadow-sm border p-4 animate-fade-in" style={{ borderColor: COLORS.whiteBucks }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#756256] flex items-center gap-2"><Store size={20} /> 頭像交易所</h3>
              <span className="text-xs text-[#9E9081]">預設圖片之後可更換</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {AVATAR_LIST.map(avatar => {
                const isOwned = myAvatars.includes(avatar.id);
                const isEquipped = currentAvatarId === avatar.id;
                const canAfford = coins >= avatar.price;

                return (
                  <div key={avatar.id} className={`border rounded-lg p-3 flex flex-col items-center relative transition-all ${isEquipped ? 'ring-2 ring-[#A58976] bg-[#F9F7F5]' : 'hover:border-[#A58976]'}`} style={{ borderColor: COLORS.whiteBucks }}>
                    {isEquipped && <div className="absolute top-2 right-2 text-green-500"><CheckCircle size={16} fill="currentColor" className="text-white" /></div>}

                    <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-gray-100">
                      <img src={avatar.src} alt={avatar.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="font-bold text-sm text-[#5D4037] mb-1">{avatar.name}</div>

                    {isOwned ? (
                      <button
                        onClick={() => onEquip(avatar.id)}
                        disabled={isEquipped}
                        className={`w-full py-1 text-xs rounded font-bold ${isEquipped ? 'text-gray-400 cursor-default' : 'bg-[#756256] text-white hover:bg-[#5D4E44]'}`}
                      >
                        {isEquipped ? '使用中' : '更換'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onPurchase(avatar.id, avatar.price)}
                        disabled={!canAfford}
                        className={`w-full py-1 text-xs rounded font-bold flex items-center justify-center gap-1 ${canAfford ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                      >
                        <Coins size={10} /> {avatar.price}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {myListings.length === 0 ? (
              <div className="text-center py-10 text-gray-400">目前沒有上架的書籍</div>
            ) : (
              myListings.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border p-3 flex gap-4 items-center" style={{ borderColor: COLORS.whiteBucks }}>
                  <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                    <img src={item.cover} className="w-full h-full object-cover" alt={item.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#756256] truncate">{item.title}</h3>
                    <div className="text-sm text-[#9E9081] font-medium">NT$ {item.price}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>{item.views} 次瀏覽</span> · <span>{item.date}</span>
                    </div>
                  </div>
                  <button onClick={() => setMyListings(myListings.filter(i => i.id !== item.id))} className="p-2 text-red-400 hover:bg-red-50 rounded-full">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// ... (previous helper functions)

const App = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Books
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ... inside App component ...
  const [examCountdown, setExamCountdown] = useState({ exams: [] });

  useEffect(() => {
    // ... previous listeners ...

    // Fetch Exam Countdown
    const fetchCountdown = async () => {
      try {
        const { functions } = await import('./config');
        const getExamCountdown = functions.httpsCallable('getExamCountdown');
        const result = await getExamCountdown();
        if (result.data && result.data.exams) {
          setExamCountdown(result.data);
        } else {
          setExamCountdown({ exams: [] });
        }
      } catch (error) {
        console.error("Failed to fetch countdown:", error);
        setExamCountdown({ exams: [] }); // Error state
      }
    };
    fetchCountdown();

    // ... return cleanup ...
  }, []);

  // ... 

  // Coins Widget ... 
  const [coins, setCoins] = useState(0);
  const [showCheckInModal, setShowCheckInModal] = useState(false); // Modal state
  const [wishes, setWishes] = useState(INITIAL_WISHES);
  const [myAvatars, setMyAvatars] = useState(['default']);
  const [currentAvatarId, setCurrentAvatarId] = useState('default'); // Could be persisted in DB too

  useEffect(() => {
    let unsubProfile = null;
    let unsubBooks = null;

    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        // Initial user set (might be incomplete)
        setCurrentUser({ ...user, nickname: user.email.split('@')[0] });
        setCurrentPage('home');

        // Listen to Real User Profile
        unsubProfile = authService.onProfileSnapshot(user.uid, (doc) => {
          if (doc.exists) {
            const data = doc.data();
            setCurrentUser(prev => ({ ...prev, ...data }));
            setCoins(data.coins || 0);
            setMyAvatars(data.myAvatars || ['default']);

            // Check In Logic
            const checkDailyCheckIn = async () => {
              try {
                const { functions } = await import('./config');
                const dailyCheckIn = functions.httpsCallable('dailyCheckIn');
                const result = await dailyCheckIn();
                if (result.data.success) {
                  setShowCheckInModal(true);
                  setCoins(result.data.newBalance);
                }
              } catch (e) {
                console.error("Check-in failed", e);
              }
            };
            checkDailyCheckIn();
          }
        });

        // Fetch books (Global)
        unsubBooks = bookService.onBooksSnapshot((snapshot) => {
          const loadedBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setBooks(loadedBooks);
          setIsLoading(false);
        });

      } else {
        setCurrentUser(null);
        setCurrentPage('login');
        if (unsubProfile) unsubProfile();
        if (unsubBooks) unsubBooks();
      }
    });


    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
      if (unsubBooks) unsubBooks();
    };
  }, []);

  const CheckInModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={() => setShowCheckInModal(false)}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative shadow-xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="bg-yellow-400 p-3 rounded-full shadow-lg border-4 border-white">
            <Gift size={32} className="text-white" />
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-xl font-bold text-[#756256] mb-2">每日簽到成功！</h3>
          <p className="text-gray-500 mb-6">歡迎回來！送您 5 枚書香幣，繼續加油！</p>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-yellow-600 mb-6 bg-yellow-50 py-3 rounded-xl border border-yellow-100">
            <Coins size={28} fill="currentColor" /> +5
          </div>
          <button onClick={() => setShowCheckInModal(false)} className="w-full py-3 rounded-xl bg-[#A58976] text-white font-bold hover:bg-[#8D735F] transition-colors">太棒了！</button>
        </div>
      </div>
    </div>
  );

  const navigate = (page, data) => {
    if (page === 'product') setSelectedProduct(data);
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleAddWish = (content) => {
    setWishes([{ id: Date.now(), content, user: currentUser.nickname || currentUser.email, time: '剛剛', avatarId: currentAvatarId }, ...wishes]);
  };

  const handlePurchaseAvatar = async (avatarId, price) => {
    if (coins < price) {
      alert("書香幣不足！");
      return;
    }
    if (!window.confirm(`確定要花費 ${price} 書香幣購買這個頭像嗎？`)) return;

    try {
      const { functions } = await import('./config'); // Lazy load or import at top
      const purchaseItemFn = functions.httpsCallable('purchaseItem');
      await purchaseItemFn({ itemId: avatarId, price: price, type: 'avatar' });
      alert("購買成功！");
      // UI updates automatically via onProfileSnapshot
    } catch (error) {
      console.error(error);
      alert("購買失敗: " + error.message);
    }
  };

  const handleEquipAvatar = (avatarId) => {
    setCurrentAvatarId(avatarId);
    // Optional: Save to Firestore
  };

  if (!currentUser && currentPage !== 'login') return null;

  const renderPage = () => {
    switch (currentPage) {
      case 'login': return <LoginPage />;
      case 'home': return <HomePage onNavigate={navigate} user={currentUser} coins={coins} wishes={wishes} onAddWish={handleAddWish} books={books} isLoading={isLoading} currentAvatarId={currentAvatarId} unreadCount={0} examCountdown={examCountdown} />;
      case 'product': return <ProductDetailPage product={selectedProduct} onBack={() => navigate('home')} onContact={async () => {
        await bookService.reserveBook(selectedProduct.id, currentUser.uid, selectedProduct.price, new Date().toISOString());
        alert("已發送預訂請求！");
      }} />;
      case 'profile': return (
        <ProfilePage
          user={currentUser}
          onBack={() => navigate('home')}
          onLogout={handleLogout}
          coins={coins}
          myAvatars={myAvatars}
          currentAvatarId={currentAvatarId}
          onPurchase={handlePurchaseAvatar}
          onEquip={handleEquipAvatar}
        />
      );
      default: return <div>404</div>;
    }
  };

  return (
    <>
      {renderPage()}
      {showCheckInModal && <CheckInModal />}
    </>
  );
};

export default App;
