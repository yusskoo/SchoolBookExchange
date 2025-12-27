import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, MessageCircle, Share2, Star, AlertCircle, ShoppingCart,
  User, CheckCircle, MapPin, ThumbsUp, Send, Search, Bell, Eye,
  BookOpen, Filter, ArrowRight, Menu, Home, Lock, Mail, ChevronDown, Camera,
  Plus, Image as ImageIcon, Trash2, Clock, DollarSign, FileText, AlertTriangle, X, Gift, Repeat, LogOut, LayoutGrid, Tag, Info, HelpCircle, ShieldCheck, Smile, Flame, Book, Sparkles, HandMetal, Calendar, Zap, Coins, Settings, ChevronLeft, Palette, Store, ChevronRight, ExternalLink
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
const CONDITION_LEVELS = ['一成新', '三成新', '五成新', '九成新', '全新'];

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'chi', name: '國文' },
  { id: 'eng', name: '英文' },
  { id: 'math', name: '數學' },
  { id: 'sci', name: '自然' },
  { id: 'soc', name: '社會' },
  { id: 'extra', name: '課外讀物' },
];


// --- 全域組件：頭像橫向捲動列 (首頁與個人專區商店使用) ---
const AvatarRow = ({ title, avatars, onPurchase, onEquip, currentAvatarId, myAvatars, coins }) => (
  <div className="mb-8">
    {/* 標題與裝飾條 */}
    {/* 分區標題與左側咖啡色裝飾條 */}
    <h4 className="font-bold text-[#756256] mb-4 flex items-center gap-2 px-1 text-sm md:text-base">
      <span className="w-1.5 h-5 bg-[#A58976] rounded-full"></span>
      {title}
    </h4>

    {/* 橫向捲動容器 */}
    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
      {avatars.map(avatar => {
        const isOwned = myAvatars.includes(avatar.id) || avatar.id === 'classic-1';
        const isEquipped = currentAvatarId === avatar.id;
        const canAfford = coins >= avatar.price;

        return (
          <div key={avatar.id} className="min-w-[110px] bg-white border rounded-2xl p-3 flex flex-col items-center shadow-sm" style={{ borderColor: '#E8E3DF' }}>
            <div className="w-14 h-14 rounded-full overflow-hidden mb-3 bg-gray-50 border p-1">
              <img src={optimizeImage(avatar.src)} alt={avatar.name} className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="font-bold text-xs text-[#5D4037] mb-3 truncate w-full text-center">{avatar.name}</div>

            <button
              onClick={() => isOwned ? onEquip(avatar.id) : onPurchase(avatar.id, avatar.price)}
              disabled={!isOwned && !canAfford}
              className={`w-full py-1.5 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${isOwned
                ? (isEquipped ? 'bg-gray-100 text-gray-400' : 'bg-[#756256] text-white hover:bg-[#5D4E44]')
                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                } ${(!isOwned && !canAfford) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isOwned ? (isEquipped ? '使用中' : '更換') : <>NT$ {avatar.price}</>}
            </button>
          </div>
        );
      })}
    </div>
  </div>
);


// --- [修改] 頭像列表資料 (Demo Version) ---
const AVATAR_LIST = [
  // [類別 4] 預設角色 (經典系列第一支)
  {
    id: 'classic-1',
    name: '熬夜貓貓',
    price: 0,
    src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=cat&backgroundColor=FFD700'
  },

  // [類別 1] 期間限定禮物
  {
    id: 'pony-gift',
    name: '限定小馬',
    price: 0,
    src: 'https://i.postimg.cc/9fW28Bc0/niu.jpg'
  },

  // [類別 2] 100 代幣限定 (ID 以 special 開頭)
  {
    id: 'special1',
    name: '限定兔兔',
    price: 100,
    src: 'https://i.postimg.cc/zyP43KbN/tu-zi.jpg'
  },
  {
    id: 'special2',
    name: '限定小豬',
    price: 100,
    src: 'https://i.postimg.cc/pd2vGBP9/zhu.jpg'
  },
  {
    id: 'special3',
    name: '限定狗狗',
    price: 100,
    src: 'https://i.postimg.cc/wB6zfk97/gou.jpg'
  },
  {
    id: 'special4',
    name: '限定小牛',
    price: 100,
    src: 'https://i.postimg.cc/qNvyYNG3/EE1D91FC-D76E-4FBA-A85F-33F8D82EAFEB.jpg'
  },
  {
    id: 'special5',
    name: '限定小羊',
    price: 100,
    src: 'https://i.postimg.cc/VkjgJMr4/84AD5380-E492-4603-B7C7-4BD68372B94A.jpg'
  },

  // [類別 3] 經典系列
  { id: 'classic-2', name: '考滿分', price: 100, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=glasses&backgroundColor=4ADE80' },
  { id: 'classic-3', name: '校園酷蓋', price: 100, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=cool&backgroundColor=A58976' },
  { id: 'classic-4', name: '文藝青年', price: 100, src: 'https://api.dicebear.com/7.x/miniavs/svg?seed=artist&backgroundColor=FFB6C1' },
  { id: 'classic-5', name: '理科腦', price: 100, src: 'https://api.dicebear.com/7.x/bottts/svg?seed=robot&backgroundColor=E0E0E0' },
];



const INITIAL_WISHES = [];

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'comment', user: '王小明', avatar: null, content: '請問這本書還有嗎？', time: '5分鐘前', isRead: false },
  { id: 2, type: 'system', content: '您的書籍已經上架超過 30 天未售出。', time: '2小時前', isRead: false },
  { id: 3, type: 'system', content: '歡迎來到 SchoolBook Exchange！', time: '1天前', isRead: true }
];


// --- Helper Functions ---
const getRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "剛剛";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分鐘前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小時前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;

  return date.toLocaleDateString();
};

// 圖片優化代理 (加速外部圖片載入)
const optimizeImage = (url, width = 150, quality = 50) => {
  // Temporarily disabled optimization to debug image loading issues
  // Return original URL for all images
  return url;

  /* Original implementation:
  if (!url) return url;
  // For external images (postimg.cc, dicebear), use weserv.nl for caching and compression
  // For base64 images, return as-is
  if (url.startsWith('data:')) return url;
  if (url.includes('postimg.cc') || url.includes('api.dicebear.com')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
  }
  // For other URLs, return as-is
  return url;
  */
};

const normalizeTime = (timeStr) => {
  if (!timeStr) return "";
  // Match format like "1/5 7:20" or "01/05 07:20" or "1/5 07:20" etc.
  const regex = /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/;
  const match = timeStr.match(regex);
  if (match) {
    const [_, month, day, hour, minute] = match;
    return `${month.padStart(2, '0')}/${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  return timeStr;
};

const PriceDisplay = ({ type, price, originalPrice, large = false }) => {
  if (type === 'exchange') return <div className={`flex items-center gap-1 font-bold ${large ? 'text-2xl' : 'text-sm'}`} style={{ color: COLORS.brushwood }}><Repeat size={large ? 20 : 14} /><span>想交換</span></div>;
  if (type === 'gift' || price === 0) return <div className={`flex items-center gap-1 font-bold ${large ? 'text-2xl' : 'text-sm'}`} style={{ color: COLORS.chocolateBubble }}><Gift size={large ? 20 : 14} /><span>贈送</span></div>;
  return <div className="flex flex-col"><div className={`font-bold ${large ? 'text-3xl' : 'text-lg'}`} style={{ color: COLORS.brownWindmill }}>NT$ {price}</div>{originalPrice && <span className="text-xs line-through" style={{ color: COLORS.fossilGray }}>原價 ${originalPrice}</span>}</div>;
};

const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden border animate-pulse mb-4 break-inside-avoid" style={{ borderColor: COLORS.whiteBucks }}>
    <div className="aspect-[3/4] bg-gray-200"></div>
    <div className="p-4 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div>
  </div>
);

// --- 輔助函數：圖片壓縮處理 ---
const compressImage = (base64Str, maxWidth = 800, maxHeight = 800, quality = 0.6) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

// (Moved getRelativeTime to top)

// --- [組件] 自動輪播精選區 ---
const FeaturedCarousel = ({ items, onNavigate, currentUser }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredItems = (items || []).slice(0, 5); // Use first 5 real items
  const [tickerMessages, setTickerMessages] = useState([]);

  useEffect(() => {
    if (featuredItems.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  // Determine ticker messages
  useEffect(() => {
    const msgs = [];
    if (currentUser) {
      msgs.push("歡迎來到校園二手書循環平台，讓書本延續它的旅程！");
    }

    // Use actual items to generate messages, sort by newest first
    const sortedItems = [...(items || [])].sort((a, b) => {
      const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
      const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
      return tB - tA;
    }).slice(0, 8); // Take latest 8

    sortedItems.forEach(item => {
      const timeStr = getRelativeTime(item.timestamp);
      // Use seller nickname, fallback to "匿名" if missing (though should be there)
      const sellerName = item.seller?.nickname || "匿名";
      msgs.push(`${timeStr} ${sellerName} 上架了《${item.title}》`);
    });

    setTickerMessages(msgs);
  }, [items, currentUser]);


  if (featuredItems.length === 0) return null;
  const currentItem = featuredItems[activeIndex];

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 w-full">
          <span className="bg-orange-500 text-white p-1 rounded-full animate-pulse flex-shrink-0"><Flame size={16} fill="currentColor" /></span>
          <h2 className="text-lg font-bold tracking-wide flex-shrink-0" style={{ color: COLORS.brownWindmill }}>本日精選</h2>

          {tickerMessages.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 ml-2 overflow-hidden flex-1 max-w-[500px]">
              <Zap size={14} className="text-red-500 flex-shrink-0" fill="currentColor" />
              <div className="flex-1 overflow-hidden relative h-5">
                <div className="whitespace-nowrap absolute animate-marquee font-medium flex items-center h-full">
                  {tickerMessages.map((msg, idx) => (
                    <span key={idx} className="mr-12 inline-block">{msg}</span>
                  ))}
                  {/* Duplicate for smooth loop if needed, but CSS marquee handles it by translation.
                         Usually to have seamless loop you need to duplicate content. 
                         For now basic marquee is fine, but double content makes it look continuous. */}
                  {tickerMessages.map((msg, idx) => (
                    <span key={`dup-${idx}`} className="mr-12 inline-block">{msg}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="relative w-full h-48 bg-white rounded-2xl shadow-md overflow-hidden border cursor-pointer group"
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
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F9F7F5] text-[#9E9081]">{currentItem.grade || '不分年級'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F9F7F5] text-[#9E9081]">{currentItem.subject}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F9F7F5] text-[#9E9081]">{currentItem.conditionLevel}</span>
              </div>
              <div className="flex items-center justify-between">
                <PriceDisplay type={currentItem.type} price={currentItem.price} originalPrice={currentItem.originalPrice} />
                <div className="w-8 h-8 rounded-full bg-[#756256] text-white flex items-center justify-center shadow-md transform translate-x-16 group-hover:translate-x-0 transition-all duration-300 opacity-0 group-hover:opacity-100">
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
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress-fill {
          animation: progress-fill 4s linear;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-right {
          animation: fade-in-right 0.5s ease-out forwards;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); } 
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

// --- [組件] 首頁：考前倒數計時卡片 ---
const ExamWidget = ({ examCountdown }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const exams = examCountdown?.exams || [];
  const currentExam = (exams.length > 0 && exams[selectedIndex]) ? exams[selectedIndex] : { title: (exams.length === 0 && examCountdown) ? '載入中...' : '無考試', daysLeft: 0 };

  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-red-500 text-white p-1 rounded-full">
          <Calendar size={16} />
        </span>
        <h2 className="text-lg font-bold tracking-wide" style={{ color: COLORS.brownWindmill }}>
          貼心提醒
        </h2>
      </div>
      <div className="bg-white p-3 rounded-2xl border flex flex-col justify-between h-48 relative overflow-hidden shadow-md" style={{ borderColor: COLORS.whiteBucks }}>
        <a
          href="https://calendar.google.com/calendar/embed?src=shsh.ylc.edu.tw_fcpdcjkto9mpulh1gg2eetr4s4%40group.calendar.google.com&ctz=Asia%2FTaipei"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-0 right-0 w-12 h-12 bg-red-50 rounded-bl-2xl z-20 flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
        >
          <ExternalLink size={18} />
        </a>
        <div className="relative z-10 h-full flex flex-col justify-center items-center">
          <div className="relative mb-2">
            <div className="text-base text-gray-500 font-bold truncate flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700 transition-colors">
              距離 {currentExam.title} <ChevronDown size={14} />
            </div>
            {exams.length > 1 && (
              <select
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
              >
                {exams.map((exam, index) => (
                  <option key={index} value={index}>{exam.title} ({exam.displayDate || `${exam.date.substring(4, 6)}/${exam.date.substring(6, 8)}`})</option>
                ))}
              </select>
            )}
            <div className="text-xs text-gray-400 mt-1 text-center">
              {currentExam.displayDate || currentExam.date}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl font-bold text-[#756256]">{currentExam.daysLeft}</span>
            <span className="text-lg text-[#756256]">天</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TickerWidget = () => (
  <div className="bg-white rounded-lg border px-3 py-2 flex items-center gap-3 shadow-sm" style={{ borderColor: COLORS.whiteBucks }}>
    <div className="bg-red-50 text-red-500 p-1 rounded-md"><Zap size={14} fill="currentColor" /></div>
    <div className="flex-1 overflow-hidden h-5 relative">
      <div className="absolute animate-slide-up text-xs font-medium text-gray-600"><span className="font-bold text-[#756256] mr-1">3分鐘前</span>高二 208班 陳同學 上架了《物理講義》</div>
    </div>
  </div>
);


// --- [組件] 首頁：許願池區塊 (留言板) ---
const WishingWell = ({ wishes, onAddWish, onDeleteWish, currentUser, currentAvatar }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [wishImage, setWishImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [deletingWishId, setDeletingWishId] = useState(null); // Track which wish is in delete mode
  const fileInputRef = useRef(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate pages
  const totalPages = Math.ceil(wishes.length / itemsPerPage);
  const currentWishes = wishes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result, 400, 400, 0.5); // Wishes can be small
        setWishImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && !wishImage) return;
    onAddWish(content, wishImage);
    setContent('');
    setWishImage(null);
    setIsModalOpen(false);
    setCurrentPage(1); // Reset to first page on new wish
  };

  return (
    <div className="mb-8 px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-yellow-400 text-white p-1 rounded-full"><Sparkles size={16} fill="currentColor" /></span>
          <h2 className="text-lg font-bold tracking-wide" style={{ color: COLORS.brownWindmill }}>許願池</h2>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-500"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-gray-500 font-bold px-1">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-500"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3" style={{ borderColor: COLORS.whiteBucks }}>

        {currentWishes.map(wish => {
          const avatar = AVATAR_LIST.find(a => a.id === wish.avatarId) || AVATAR_LIST[0];
          const isMyWish = wish.uid === currentUser?.uid;
          const isDeleting = deletingWishId === wish.id;

          return (
            <div key={wish.id} className="flex gap-3 border-b last:border-0 pb-3 last:pb-0" style={{ borderColor: COLORS.bgLight }}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer transition-all duration-300 ${isDeleting ? 'bg-red-500 scale-90' : 'bg-gray-100'}`}
                onClick={() => {
                  if (!isMyWish) return;
                  if (isDeleting) {
                    onDeleteWish(wish.id);
                    setDeletingWishId(null);
                  } else {
                    setDeletingWishId(wish.id);
                  }
                }}
              >
                {isDeleting ? (
                  <X size={20} className="text-white animate-bounce-short" />
                ) : (
                  <img src={optimizeImage(avatar.src, 100, 60)} alt="avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-[#756256]">{wish.user}</span>
                  <span className="text-xs font-normal text-gray-400">{getRelativeTime(wish.timestamp)}</span>
                </div>
                <p className="text-sm text-[#9E9081]">{wish.content}</p>
                {wish.image && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-100 h-24 inline-block bg-gray-50">
                    <img
                      src={wish.image}
                      alt="wish thumbnail"
                      onClick={() => setPreviewImage(wish.image)}
                      className="h-full w-auto object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <button onClick={() => setIsModalOpen(true)} className="w-full py-2 mt-2 text-xs font-bold text-[#9E9081] border border-dashed hover:bg-[#F9F7F5] rounded-lg transition-colors flex items-center justify-center gap-1" style={{ borderColor: COLORS.fossilGray }}><Plus size={14} /> 我也想許願</button>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10 p-2"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
          >
            <X size={32} />
          </button>
          <img
            src={previewImage}
            alt="full preview"
            className="max-w-full max-h-full object-contain rounded animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-3 border-b" style={{ borderColor: COLORS.whiteBucks }}><button onClick={() => setIsModalOpen(false)} className="p-1"><X size={24} className="text-gray-600" /></button><span className="font-bold text-[#756256] text-lg">建立許願</span><button onClick={handleSubmit} className="text-blue-500 font-bold text-sm px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-transparent" disabled={!content.trim() && !wishImage}>發佈</button></div>
            <div className="p-4 flex flex-col flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                  <img src={currentAvatar.src} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-[#5D4037]">{currentUser.nickname || currentUser.email}</span>
              </div>
              <textarea
                className="w-full resize-none outline-none text-[#5D4037] placeholder-gray-400 text-lg leading-relaxed min-h-[100px]"
                placeholder="寫下你想找的書或是筆記..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
              />
              {wishImage && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-100 group">
                  <img src={wishImage} alt="preview" className="w-full h-auto" />
                  <button
                    onClick={() => setWishImage(null)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-gray-50 flex gap-4 text-gray-400">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="p-1 hover:text-[#756256] transition-colors"
              >
                <Camera size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- [頁面] 登入與註冊頁面 ---
const LoginPage = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [studentId, setStudentId] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (isRegistering) {
      if (!email.endsWith('@shsh.tw')) {
        alert("僅限 @shsh.tw 校內信箱註冊！");
        setIsLoading(false);
        return;
      }
      if (!realName || !studentId) {
        alert("請填寫所有欄位（姓名、學號）");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isRegistering) {
        await authService.signUp(email, password);
        try {
          // Auto-generate nickname: First char of Real Name + "同學"
          const generatedNickname = (realName.trim()[0] || "") + "同學";
          await authService.completeProfile({ realName, studentId, nickname: generatedNickname });
          alert("註冊成功！");
        } catch (profileError) {
          console.error("Profile completion failed", profileError);
          alert("註冊成功，但在建立個人資料時發生錯誤，請稍後聯繫管理員。");
        }
        alert("系統將為您自動登入");
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
        <form onSubmit={handleSubmit} className="space-y-3 mb-4">
          {isRegistering && (
            <>
              <input type="text" value={realName} onChange={e => setRealName(e.target.value)} placeholder="真實姓名 (此網站只會顯示姓氏+同學)" className="w-full p-3 border rounded-xl bg-gray-50" required />
              <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="學號" className="w-full p-3 border rounded-xl bg-gray-50" required />
            </>
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (@shsh.tw)" className="w-full p-3 border rounded-xl" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (至少6位)" className="w-full p-3 border rounded-xl" required />

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

// --- [頁面] 商品詳情頁面 ---
const ProductDetailPage = ({ product, onBack, onContact, currentUser }) => {
  if (!product) return null;
  const isOwner = (currentUser?.uid && product.sellerId && String(currentUser.uid) === String(product.sellerId)) ||
    (currentUser?.studentId && product.seller?.studentId && currentUser.studentId === product.seller.studentId);

  const [sellerProfile, setSellerProfile] = useState(null);

  useEffect(() => {
    if (product?.sellerId) {
      // Fetch latest seller profile for accurate studentId
      const fetchSeller = async () => {
        try {
          const { db } = await import('./config'); // Dynamic import to avoid circular dep issues if any
          const doc = await db.collection('users').doc(product.sellerId).get();
          if (doc.exists) {
            setSellerProfile(doc.data());
          }
        } catch (e) {
          console.error("Failed to fetch seller profile", e);
        }
      };
      fetchSeller();
    }
  }, [product?.sellerId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
            <span className="text-xs font-bold px-2 py-1 rounded bg-[#F9F7F5] text-[#9E9081]">{product.grade}</span>
            <span className="text-xs font-bold px-2 py-1 rounded bg-[#F9F7F5] text-[#9E9081]">{product.subject}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-2 leading-tight" style={{ color: COLORS.brownWindmill }}>{product.title}</h1>


          <div className="flex items-end gap-3 mb-6 pb-6 border-b" style={{ borderColor: COLORS.whiteBucks }}>
            <PriceDisplay type={product.type} price={product.price} originalPrice={product.originalPrice} large />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#9E9081]">商品狀況</h3>
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span>{product.views || 0} 次瀏覽</span>
                  <span>·</span>
                  <span className="whitespace-nowrap">上架時間：{(() => {
                    const date = product.timestamp?.toDate ? product.timestamp.toDate() : new Date(product.timestamp || 0);
                    // Format: yyyy-MM-DD HH:mm
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hour = String(date.getHours()).padStart(2, '0');
                    const min = String(date.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day} ${hour}:${min}`;
                  })()}</span>
                </div>
              </div>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg inline-block border border-gray-100">{product.conditionLevel}</p>

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
                    {sellerProfile?.nickname || product.seller?.nickname || product.seller?.name}
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

// --- [頁面] 主頁面 (包含橫幅、精選、書籍清單) ---
const HomePage = ({ onNavigate, user, currentAvatarId, coins, wishes, onAddWish, onDeleteWish, books, isLoading, examCountdown, onToggleNotifications, hasUnreadNotifications }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterPublisher, setFilterPublisher] = useState('all');
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 20; // 5 columns * 4 rows

  const handleResetHome = () => {
    setFilterGrade('all');
    setFilterSubject('all');
    setFilterPublisher('all');
    setSearchQuery('');
    setSelectedCategory('all');
    setProductPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setProductPage(1);
  }, [searchQuery, selectedCategory]);

  const sortedFilteredBooks = books
    .filter(book => {
      const query = searchQuery.toLowerCase();
      const keywordMatch = !query.trim() || book.title.toLowerCase().includes(query) || (book.author && book.author.toLowerCase().includes(query));

      let categoryMatch = true;
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'extra') {
          categoryMatch = book.subject === '課外讀物' || book.publisher === '課外讀物';
        } else if (selectedCategory === 'sci') {
          categoryMatch = ['物理', '化學', '生物', '地科', '自然'].includes(book.subject);
        } else if (selectedCategory === 'soc') {
          categoryMatch = ['歷史', '地理', '公民', '社會'].includes(book.subject);
        } else {
          const catName = CATEGORIES.find(c => c.id === selectedCategory)?.name;
          categoryMatch = book.subject === catName;
        }
      }

      return keywordMatch && categoryMatch;
    })
    .sort((a, b) => {
      const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
      const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
      return tB - tA;
    });

  const totalProductPages = Math.ceil(sortedFilteredBooks.length / productsPerPage);
  const currentProducts = sortedFilteredBooks.slice(
    (productPage - 1) * productsPerPage,
    productPage * productsPerPage
  );

  const currentAvatar = AVATAR_LIST.find(a => a.id === currentAvatarId) || AVATAR_LIST[0];
  const productSectionRef = useRef(null);

  const scrollToProductSection = () => {
    if (productSectionRef.current) {
      const yOffset = -80; // Header offset
      const y = productSectionRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // --- [頁面渲染] 主頁面 (HomePage) ---
  return (
    <div className="min-h-screen pb-20" style={{ ...fontStyle, backgroundColor: COLORS.bgLight, color: COLORS.brownWindmill }}>
      <div className="pt-6 pb-12 px-4 rounded-b-[2rem] shadow-lg" style={{ background: `linear-gradient(135deg, ${COLORS.chocolateBubble}, ${COLORS.brownWindmill})`, color: COLORS.bgLight }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2"><div className="w-8 h-8 backdrop-blur rounded-sm flex items-center justify-center font-bold font-serif" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>校</div><span className="text-xl font-bold tracking-widest">循環平台</span></div>
            <div className="flex items-center gap-3">
              <button onClick={handleResetHome} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Home size={20} /></button>
              <button onClick={onToggleNotifications} className="relative p-2 hover:bg-white/10 rounded-full transition-colors"><Bell size={20} />{hasUnreadNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />}</button>
              <button onClick={() => onNavigate('profile')} className="flex items-center gap-2 hover:bg-white/20 pl-1 pr-3 py-1 rounded-full transition-all border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}><div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden bg-white/20"><img src={optimizeImage(currentAvatar.src, 100, 50)} alt="avatar" className="w-full h-full object-cover" /></div><span className="hidden sm:inline text-sm font-medium tracking-wide">{user.nickname || user.email}</span></button>
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
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm tracking-wide shadow-sm transition-all border ${selectedCategory === cat.id ? 'bg-[#756256] text-white border-[#756256]' : 'bg-[#F9F7F5] text-[#756256] border-[#E8E3DF]'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* New Layout: Featured (Left) + Exam (Right) */}
        {!searchQuery && selectedCategory === 'all' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <FeaturedCarousel items={books} onNavigate={onNavigate} currentUser={user} />
              </div>
              <div className="w-full md:w-[320px] flex-shrink-0">
                <ExamWidget examCountdown={examCountdown} />
              </div>
            </div>

            {/* <div className="mb-8"><TickerWidget /></div> Removed as moved to header */}

            <WishingWell wishes={wishes} onAddWish={onAddWish} onDeleteWish={onDeleteWish} currentUser={user} currentAvatar={currentAvatar} />
          </>
        )}
        <div className="pb-8">
          {/* 標題區 */}
          <div ref={productSectionRef} className="flex justify-between items-end mb-4 px-1 border-b pb-2" style={{ borderColor: COLORS.whiteBucks }}>
            <h2 className="text-xl font-bold flex items-center gap-2 tracking-wide" style={{ color: COLORS.brownWindmill }}>
              <Book size={20} style={{ color: COLORS.chocolateBubble }} />
              {searchQuery || selectedCategory !== 'all' ? '搜尋結果' : '探索發現'}
            </h2>
          </div>

          {/* 內容區：根據是否有資料決定渲染方式 */}
          {isLoading ? (
            /* 載入中：使用 Grid 顯示骨架屏 */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="aspect-square bg-gray-100 animate-pulse" />
                  <div className="p-3 space-y-2 flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                    <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between">
                      <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
                      <div className="h-4 bg-gray-100 rounded w-1/4 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentProducts.length > 0 ? (
            /* 有資料：使用 Grid 顯示書籍卡片 */
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in">
                {currentProducts.map((book) => (
                  <div key={book.id} onClick={() => onNavigate('product', book)} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer border flex flex-col h-full group" style={{ borderColor: COLORS.whiteBucks }}>
                    {/* Image Area - Square Aspect Ratio */}
                    <div className="relative aspect-square bg-[#F9F7F5] overflow-hidden">
                      <img src={book.cover || book.imageBase64 || "https://dummyimage.com/400x400/eee/aaa"} alt={book.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                      {/* 商品狀態標籤：贈送/販售 */}
                      <div
                        className="absolute top-0 right-0 px-3 py-1.5 text-xs font-bold shadow-sm rounded-bl-lg z-10"
                        style={{
                          backgroundColor: (book.type === 'gift' || book.price === 0) ? '#E6DBC6' : COLORS.brownWindmill,
                          color: (book.type === 'gift' || book.price === 0) ? '#756256' : '#FFFFFF'
                        }}
                      >
                        {book.type === 'gift' || book.price === 0 ? '贈送' : '販售'}
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-[#756256] text-base leading-tight mb-2 line-clamp-2 min-h-[2.5em]">{book.title}</h3>

                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F9F7F5] text-[#9E9081]">{book.subject}</span>
                        {book.grade && book.grade !== '其他' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F9F7F5] text-[#9E9081]">{book.grade}</span>}
                      </div>

                      <div className="mt-auto flex items-end justify-between border-t pt-2 border-[#E8E3DF]">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 mb-1">賣家：{book.seller?.nickname || '同學'}</span>
                          <PriceDisplay type={book.type} price={book.price} />
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 scale-90">
                          <Eye size={12} className="text-gray-400" />
                          <span className="font-bold">{book.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalProductPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  <button
                    onClick={() => {
                      setProductPage(p => Math.max(1, p - 1));
                      scrollToProductSection();
                    }}
                    disabled={productPage === 1}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-[#756256] disabled:opacity-30 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none px-2">
                    {Array.from({ length: totalProductPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setProductPage(i + 1);
                          scrollToProductSection();
                        }}
                        className={`w-10 h-10 rounded-lg font-bold flex-shrink-0 transition-all shadow-sm ${productPage === i + 1 ? 'bg-[#756256] text-white' : 'bg-white text-[#756256] border border-gray-100 hover:bg-gray-50'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setProductPage(p => Math.min(totalProductPages, p + 1));
                      scrollToProductSection();
                    }}
                    disabled={productPage === totalProductPages}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-[#756256] disabled:opacity-30 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* 沒資料：獨立的 Flex 容器，確保絕對置中 */
            <div className="flex flex-col items-center justify-center py-20 w-full animate-fade-in text-center col-span-full">
              <p className="text-gray-500 text-lg font-medium mb-6">找不到符合書籍</p>
              <button
                onClick={handleResetHome}
                className="px-8 py-3 rounded-xl bg-[#756256] text-white font-bold hover:bg-[#5D4E44] transition-all transform hover:-translate-y-1 shadow-md flex items-center gap-2"
              >
                <Home size={18} /> 返回主頁
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- [頁面] 個人專區 (包含我的書櫃、上架功能、頭像商店) ---
const ProfilePage = ({ onBack, onNavigate, user, onLogout, coins, myAvatars, currentAvatarId, onPurchase, onEquip }) => {
  const [tab, setTab] = useState('shelf'); // 'upload', 'shelf', 'store'
  const INITIAL_MY_LISTINGS = []; // Or pass as prop if needed
  const [myListings, setMyListings] = useState(INITIAL_MY_LISTINGS);

  const [sellForm, setSellForm] = useState({
    title: '',
    bookType: 'textbook',
    gradeLevel: '',
    subject: '',
    transactionType: 'sell',
    price: '',
    conditionLevel: '九成新',
    description: '',
    coverImagePreview: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = bookService.getMyBooks(user.uid, (books) => {
        setMyListings(books);
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result, 600, 600, 0.5); // Book cover optimized
        setSellForm({ ...sellForm, coverImagePreview: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!sellForm.coverImagePreview) {
      alert("請上傳書籍封面！");
      return;
    }
    if (!sellForm.title) {
      alert("請填寫書籍名稱！");
      return;
    }
    if (sellForm.transactionType === 'sell' && !sellForm.price) {
      alert("請填寫售價！");
      return;
    }
    // Validation for Textbook: Grade and Subject are required
    if (sellForm.bookType === 'textbook') {
      if (!sellForm.gradeLevel) {
        alert("請選擇年級！");
        return;
      }
      if (!sellForm.subject) {
        alert("請選擇科目！");
        return;
      }
    }

    setIsUploading(true);
    try {
      const bookData = {
        title: sellForm.title,
        author: '未提供',
        publisher: sellForm.bookType === 'textbook' ? '教科書' : '課外讀物',
        subject: sellForm.bookType === 'textbook' ? sellForm.subject : '課外讀物',
        grade: sellForm.bookType === 'textbook' ? sellForm.gradeLevel : '其他',
        price: sellForm.transactionType === 'gift' ? 0 : Number(sellForm.price),
        type: sellForm.transactionType === 'gift' ? 'gift' : 'sell',
        conditionLevel: sellForm.conditionLevel,
        description: sellForm.description,
        sellerId: user.uid,
        seller: {
          nickname: user.nickname || user.email,
          studentId: user.studentId || '未知',
          score: user.creditScore || 5.0
        },
        cover: sellForm.coverImagePreview,
        timestamp: new Date()
      };

      await bookService.addBook(bookData);
      alert("上架成功！");
      setTab('shelf');
      setSellForm({
        title: '',
        bookType: 'textbook',
        gradeLevel: '',
        subject: '',
        transactionType: 'sell',
        price: '',
        conditionLevel: '九成新',
        description: '',
        coverImagePreview: null
      });
    } catch (error) {
      console.error("上架失敗:", error);
      alert("上架失敗: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBook = (bookId, e) => {
    e.stopPropagation();
    setBookToDelete(bookId);
  };

  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;
    const bookId = bookToDelete;

    // Check status locally (from myListings)
    const book = myListings.find(b => b.id === bookId);
    if (book && (book.status === 'Reserved' || book.status === 'Sold')) {
      alert("此書籍正在交易中或已售出，無法下架！");
      setBookToDelete(null);
      return;
    }

    try {
      await bookService.deleteBook(bookId);
      // alert("已下架"); // Optional: Removed for cleaner UI, or use toast
      setBookToDelete(null);
    } catch (error) {
      console.error("Deletion failed:", error);
      alert("下架失敗: " + error.message);
    }
  };

  const handleLineBind = async () => {
    try {
      const result = await authService.getBindingCode();
      const code = result.data.code;
      alert(`請將此 6 位數代碼傳送給 LINE 機器人以完成綁定：\n\n${code}\n\n(代碼 10 分鐘內有效)`);
    } catch (e) {
      console.error(e);
      alert("取得綁定碼失敗: " + e.message);
    }
  };

  const currentAvatar = AVATAR_LIST.find(a => a.id === currentAvatarId) || AVATAR_LIST[0];

  // --- [頁面渲染] 個人專區 (ProfilePage) ---
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
              <img src={optimizeImage(currentAvatar.src, 200, 70)} className="w-full h-full object-cover" alt="User" />
            </div>
            <div className="absolute bottom-0 right-0 text-white p-1.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center" style={{ backgroundColor: COLORS.chocolateBubble, width: 28, height: 28 }}>
              <Palette size={14} />
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-widest" style={{ color: COLORS.brownWindmill }}>{user.nickname || user.email}</h2>
          <p className="text-sm text-[#9E9081] mb-2">{user.email}</p>

          <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full text-xs font-bold text-yellow-700">
            <Coins size={14} fill="currentColor" /> {coins} 書香幣
          </div>

          {user.isLineNotifyEnabled ? (
            <button disabled className="mt-3 px-4 py-1.5 bg-[#E8E3DF] text-[#756256] text-xs font-bold rounded-full shadow-sm flex items-center gap-1 cursor-default border border-[#C9C3B6]">
              <CheckCircle size={14} className="text-[#06C755]" /> 已綁定 LINE
            </button>
          ) : (
            <button onClick={handleLineBind} className="mt-3 px-4 py-1.5 bg-[#06C755] text-white text-xs font-bold rounded-full shadow-sm hover:bg-[#05b34c] transition-colors flex items-center gap-1">
              <MessageCircle size={14} /> 綁定 LINE 通知
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border rounded-lg overflow-hidden bg-white p-1" style={{ borderColor: COLORS.whiteBucks }}>
          <button onClick={() => setTab('shelf')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tab === 'shelf' ? 'bg-[#F9F7F5] text-[#756256]' : 'text-gray-400 hover:text-gray-600'}`}>我的書櫃</button>
          <button onClick={() => setTab('upload')} className="flex-1 py-2 text-sm font-bold rounded-md transition-all bg-[#A58976] text-white shadow-sm ring-1 ring-white/20">上架書籍</button>
          <button onClick={() => setTab('store')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tab === 'store' ? 'bg-[#F9F7F5] text-[#756256]' : 'text-gray-400 hover:text-gray-600'}`}>頭像商店</button>
        </div>

        {/* Content */}
        {tab === 'upload' ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4 animate-fade-in" style={{ borderColor: COLORS.whiteBucks }}>
            {/* 1. 封面上傳 */}
            <div>
              <label className="block text-sm font-bold text-[#9E9081] mb-2">上傳書籍封面 *</label>
              <input type="file" id="cover-upload" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <label htmlFor="cover-upload" className="block text-center p-8 border-2 border-dashed rounded-lg bg-[#F9F7F5] cursor-pointer hover:bg-[#E6DBC6] transition-colors" style={{ borderColor: COLORS.fossilGray }}>
                {sellForm.coverImagePreview ? (
                  <img src={sellForm.coverImagePreview} alt="預覽" className="max-h-48 mx-auto rounded" />
                ) : (
                  <>
                    <ImageIcon className="mx-auto text-[#9E9081] mb-2" size={32} />
                    <span className="text-sm text-[#756256]">點擊上傳封面照片</span>
                  </>
                )}
              </label>
            </div>

            {/* 2. 書籍名稱 */}
            <div>
              <label className="block text-sm font-bold text-[#9E9081] mb-2">書籍名稱 *</label>
              <input
                type="text"
                value={sellForm.title}
                onChange={e => setSellForm({ ...sellForm, title: e.target.value })}
                className="w-full p-3 border rounded-lg bg-gray-50 text-sm"
                placeholder="例如：龍騰高一上冊英文三合一"
                required
              />
            </div>
            {/* 3. 書籍分類 */}
            <div>
              <label className="block text-sm font-bold text-[#9E9081] mb-2">書籍分類 *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSellForm({ ...sellForm, bookType: 'textbook' })}
                  className={`py-1.5 px-4 rounded-lg font-bold transition-colors ${sellForm.bookType === 'textbook'
                    ? 'bg-[#756256] text-white' // 選中時：深咖啡底白字
                    : 'bg-[#F2F0EE] text-[#9E9081] hover:bg-[#E8E3DF]' // 未選中：淺灰底暗灰字，無外框
                    }`}
                >
                  教科書
                </button>
                <button
                  type="button"
                  onClick={() => setSellForm({ ...sellForm, bookType: 'extracurricular' })}
                  className={`py-1.5 px-4 rounded-lg font-bold transition-colors ${sellForm.bookType === 'extracurricular'
                    ? 'bg-[#756256] text-white' // 選中時：深咖啡底白字
                    : 'bg-[#F2F0EE] text-[#9E9081] hover:bg-[#E8E3DF]' // 未選中：淺灰底暗灰字，無外框
                    }`}
                >
                  課外讀物
                </button>
              </div>
            </div>
            {/* 4. 年級和科目 (僅教科書) */}
            {sellForm.bookType === 'textbook' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#9E9081] mb-2">年級</label>
                  <select
                    value={sellForm.gradeLevel}
                    onChange={e => setSellForm({ ...sellForm, gradeLevel: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-gray-50 text-sm"
                  >
                    <option value="">選擇年級</option>
                    <option value="國中">國中</option>
                    <option value="高中">高中</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#9E9081] mb-2">科目</label>
                  <select
                    value={sellForm.subject}
                    onChange={e => setSellForm({ ...sellForm, subject: e.target.value })}
                    className="w-full p-3 border rounded-lg bg-gray-50 text-sm"
                  >
                    <option value="">選擇科目</option>
                    <option value="國文">國文</option>
                    <option value="數學">數學</option>
                    <option value="英文">英文</option>
                    <option value="自然">自然</option>
                    <option value="社會">社會</option>
                  </select>
                </div>
              </div>
            )}
            {/* 5. 交易方式 */}
            <div>
              <label className="block text-sm font-bold text-[#9E9081] mb-2">交易方式 *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSellForm({ ...sellForm, transactionType: 'sell' })}
                  className={`py-1.5 px-4 rounded-lg font-bold transition-colors ${sellForm.transactionType === 'sell'
                    ? 'bg-[#756256] text-white' // 選中時：深咖啡底白字
                    : 'bg-[#F2F0EE] text-[#9E9081] hover:bg-[#E8E3DF]' // 未選中：淺灰底暗灰字，無外框
                    }`}
                >
                  販售
                </button>
                <button
                  type="button"
                  onClick={() => setSellForm({ ...sellForm, transactionType: 'gift', price: '0' })}
                  className={`py-1.5 px-4 rounded-lg font-bold transition-colors ${sellForm.transactionType === 'gift'
                    ? 'bg-[#756256] text-white' // 選中時：深咖啡底白字
                    : 'bg-[#F2F0EE] text-[#9E9081] hover:bg-[#E8E3DF]' // 未選中：淺灰底暗灰字，無外框
                    }`}
                >
                  贈送
                </button>
              </div>
            </div>

            {/* 6. 售價和書況 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#9E9081] mb-2">
                  售價 (NT$) {sellForm.transactionType === 'sell' && '*'}
                </label>
                <input
                  type="number"
                  value={sellForm.price}
                  onChange={e => {
                    const val = e.target.value;
                    if (Number(val) < 0) return; // Prevent negative inputs

                    if (Number(val) === 0 && val !== '') {
                      setSellForm({ ...sellForm, price: 0, transactionType: 'gift' });
                    } else {
                      // If user types a positive number, ensure it switches back to sell if it was gift? 
                      // The prompt didn't strictly say that, but it implies "sell" context. 
                      // However, if I switch to 'gift', the input becomes disabled (line 1105).
                      // So the user can't type anything else once it hits 0.
                      // But wait, if it auto-switches to gift, the input is disabled, so they can't change it back to non-zero?
                      // That would be bad UX. They'd have to click "Sell" button to re-enable it.
                      // Let's check line 1105: disabled={sellForm.transactionType === 'gift'}
                      // If I change to gift, it disables. The user sees 0 and it's disabled.
                      // They can click "販售" (Sell) button to enable it again.
                      // That matches the requirement: "if enter 0, auto select transaction type to 'Gift'".
                      // It seems acceptable.
                      setSellForm({ ...sellForm, price: val });
                    }
                  }}
                  className="w-full p-3 border rounded-lg bg-gray-50 text-sm"
                  placeholder="100"
                  disabled={sellForm.transactionType === 'gift'}
                  required={sellForm.transactionType === 'sell'}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#9E9081] mb-2">書況</label>
                <select
                  value={sellForm.conditionLevel}
                  onChange={e => setSellForm({ ...sellForm, conditionLevel: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-gray-50 text-sm"
                >
                  {CONDITION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* 7. 描述 (選填) */}
            <div>
              <label className="block text-sm font-bold text-[#9E9081] mb-2">描述 (選填)</label>
              <textarea
                value={sellForm.description}
                onChange={e => setSellForm({ ...sellForm, description: e.target.value })}
                className="w-full p-3 border rounded-lg bg-gray-50 text-sm h-24 resize-none"
                placeholder="請描述書籍狀況..."
              />
            </div>

            {/* 上架按鈕 */}
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full py-3 bg-[#756256] text-white rounded-xl font-bold shadow-md hover:bg-[#5D4E44] transition-colors disabled:opacity-50"
            >
              {isUploading ? '上架中...' : '確認上架'}
            </button>
          </div>
        ) : tab === 'store' ? (
          <div className="bg-white rounded-xl shadow-sm border p-4 animate-fade-in" style={{ borderColor: COLORS.whiteBucks }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[#756256] flex items-center gap-2 text-lg"><Store size={22} /> 頭像交易中心</h3>
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full text-xs font-bold text-yellow-700 shadow-sm border border-yellow-200">
                <Coins size={14} fill="currentColor" /> {coins} 書香幣
              </div>
            </div>

            {/* [類別 1] 限定收獲 */}
            <AvatarRow
              title="限定收藏"
              avatars={AVATAR_LIST.filter(a => a.id.startsWith('special') || a.id === 'pony-gift')}
              onPurchase={onPurchase}
              onEquip={onEquip}
              currentAvatarId={currentAvatarId}
              myAvatars={myAvatars}
              coins={coins}
            />

            {/* [類別 2] 經典系列 */}
            <AvatarRow
              title="經典系列"
              avatars={AVATAR_LIST.filter(a => !['pony-gift'].includes(a.id) && !a.id.startsWith('special'))}
              onPurchase={onPurchase}
              onEquip={onEquip}
              currentAvatarId={currentAvatarId}
              myAvatars={myAvatars}
              coins={coins}
            />

          </div>

        ) : (
          <div className="space-y-4 animate-fade-in">
            {myListings.length === 0 ? (
              <div className="text-center py-10 text-gray-400">目前沒有上架的書籍</div>
            ) : (
              myListings.map(item => (
                <div key={item.id} onClick={() => onNavigate('product', item)} className="bg-white rounded-xl shadow-sm border p-3 flex gap-4 items-center cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: COLORS.whiteBucks }}>
                  <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                    <img src={item.cover} className="w-full h-full object-cover" alt={item.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-[#756256] truncate">{item.title}</h3>
                      {/* Status Tags */}
                      {item.status === 'Reserved' && <span className="flex-shrink-0 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ml-2">預訂中</span>}
                      {item.status === 'Sold' && <span className="flex-shrink-0 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ml-2">已售出</span>}
                    </div>
                    <div className="text-sm text-[#9E9081] font-medium">{item.price === 0 || item.type === 'gift' ? '贈送' : `NT$ ${item.price}`}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>{item.views || 0} 次瀏覽</span> · <span>{item.date}</span>
                    </div>
                  </div>
                  <button onClick={(e) => handleDeleteBook(item.id, e)} className="p-2 text-red-400 hover:bg-red-50 rounded-full">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={() => setBookToDelete(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-[#756256] mb-4">確定要下架嗎？</h3>
            <p className="text-gray-500 mb-6 text-sm">此動作無法復原，商品將從架上移除。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setBookToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                type="button"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteBook}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-md"
                type="button"
              >
                確認下架
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ... (previous helper functions)

// --- [組件] 聊天對話視窗 (與賣家/買家聯繫) ---
const ChatRoom = ({ transaction, currentUser, onClose, onBackToList }) => {
  const { id: transactionId, sellerId, bookTitle, price } = transaction;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatFileInputRef = useRef(null);

  useEffect(() => {
    if (!transactionId) return;
    const unsubscribe = chatService.subscribeToMessages(transactionId, (data) => {
      setMessages(data);
      // Mark as read when messages arrive and chat is open
      bookService.markAsRead(transactionId, currentUser.uid);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    // Mark as read immediately when opened
    bookService.markAsRead(transactionId, currentUser.uid);
    return () => unsubscribe && unsubscribe();
  }, [transactionId, currentUser.uid]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const handleChatImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result, 800, 800, 0.7); // Keep quality for details
        setChatImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !chatImage) return;
    try {
      // Check for invoice template
      let invoiceData = null;
      if (newMessage.includes("雙方已達成協議！✅")) {
        // More robust parsing for Time and Location
        // More robust parsing for Time and Location (Support both **Header** and plain Header)
        const timeMatch = newMessage.match(/(?:\*\*|)?時間[\s\S]*?[:：]\s*([^\n\r]*)/);
        const locationMatch = newMessage.match(/(?:\*\*|)?地點[\s\S]*?[:：]\s*([^\n\r]*)/);
        if (timeMatch || locationMatch) {
          const dateStr = normalizeTime(timeMatch?.[1]?.trim());
          // Parse "MM/DD HH:mm" to Date object
          let meetingTimeDate = null;
          if (dateStr) {
            const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
            if (parts) {
              const now = new Date();
              meetingTimeDate = new Date(now.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]));
            }
          }

          invoiceData = {
            meetingTime: meetingTimeDate, // Save as Date (Firestore Timestamp)
            meetingLocation: locationMatch?.[1]?.trim(),
            invoiceSentAt: new Date()
          };

          // For Validation
          // meetingTimeDate is already Date or Null.
          const isTimeValid = invoiceData.meetingTime && !isNaN(meetingTimeDate.getTime()) && invoiceData.meetingTime.toString() !== "Invalid Date";

          const leakedHeaders = ["書籍名稱", "價格", "時間", "**"];
          const isLocationValid = invoiceData.meetingLocation && !leakedHeaders.some(h => invoiceData.meetingLocation.includes(h));

          if (!isTimeValid) {
            alert("明細資訊不完整，請填寫正確的時間格式 (例如: 1/5 8:20)");
            return;
          }
          if (!isLocationValid) {
            alert("明細資訊不完整，請填寫地點 (請勿包含其他欄位標題)");
            return;
          }
        } else {
          // Header exists but no time/loc matched?
          alert("明細資訊不完整，找不到時間或地點");
          return;
        }
      }

      await chatService.sendMessage(transactionId, currentUser.uid, currentUser.name || currentUser.nickname || "同學", newMessage, chatImage, invoiceData);
      setNewMessage("");
      setChatImage(null);
    } catch (e) {
      console.error(e);
      alert("發送失敗: " + e.message);
    }
  };

  const handleFillTemplate = () => {
    const template = `雙方已達成協議！✅
若有綁定官方LINE系統將會通知您
----------------
時間(ex.1/5 8:20)：
地點：
書籍名稱：${bookTitle}
價格：NT$ ${price}`;
    setNewMessage(template);
  };

  const renderMessageContent = (content, image) => {
    return (
      <div className="flex flex-col gap-2">
        {image && (
          <div className="rounded-lg overflow-hidden bg-gray-100 mb-1">
            <img src={image} alt="chat" className="max-w-full h-auto object-contain cursor-pointer" onClick={() => window.open(image, '_blank')} />
          </div>
        )}
        {content && content.split(/(\*\*.*?\*\*)/g).map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={part + i}>{part.slice(2, -2)}</strong>;
          }
          return <span key={part + i} className="whitespace-pre-wrap">{part}</span>;
        })}
      </div>
    );
  };

  // --- [組件渲染] 聊天視窗 (ChatRoom) ---
  return (
    <div className="fixed bottom-4 right-4 w-80 h-[450px] bg-white rounded-t-xl rounded-bl-xl shadow-2xl flex flex-col z-50 animate-slide-up border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#756256] text-white p-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToList}
            className="hover:bg-white/20 p-1.5 rounded-lg transition-all active:scale-95 group"
            title="返回我的訊息"
          >
            <MessageCircle size={18} className="group-hover:animate-pulse" />
          </button>
          <span className="font-bold text-sm truncate max-w-[150px]">{bookTitle || "聊天室"}</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors"><X size={16} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F9F7F5]">
        <div className="text-center text-xs text-gray-400 mt-4 mb-4 space-y-2">
          <div className="opacity-80">記得確認面交時間和地點<br />決定好由賣家開立明細</div>
        </div>
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser.uid;
          const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);

          // Check if we need to show a date separator
          let showSeparator = false;
          let dateStr = "";
          if (index === 0) {
            showSeparator = true;
          } else {
            const prevMsg = messages[index - 1];
            const prevDate = prevMsg.timestamp?.toDate ? prevMsg.timestamp.toDate() : new Date(prevMsg.timestamp);
            if (msgDate.toLocaleDateString() !== prevDate.toLocaleDateString()) {
              showSeparator = true;
            }
          }

          if (showSeparator) {
            dateStr = `${msgDate.getMonth() + 1}/${msgDate.getDate()}`;
          }

          const formatTime = (ts) => {
            if (!ts) return '';
            const date = ts.toDate ? ts.toDate() : new Date(ts);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          };
          const timeStr = formatTime(msg.timestamp);

          return (
            <React.Fragment key={msg.id}>
              {showSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-200/50 text-gray-500 text-[10px] px-3 py-1 rounded-full font-bold">
                    {dateStr}
                  </div>
                </div>
              )}
              <div className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {isMe && <span className="text-[10px] text-gray-400 mb-1 flex-shrink-0">{timeStr}</span>}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm break-words ${isMe ? 'bg-[#756256] text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none'}`}>
                  {renderMessageContent(msg.content, msg.image)}
                </div>
                {!isMe && <span className="text-[10px] text-gray-400 mb-1 flex-shrink-0">{timeStr}</span>}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Actions Toolbar */}
      <div className="px-3 py-1.5 bg-[#F9F7F5] flex items-center justify-start gap-2 border-t border-stone-100">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={chatFileInputRef}
          onChange={handleChatImageUpload}
        />
        <button
          onClick={() => chatFileInputRef.current?.click()}
          className="p-1.5 text-gray-400 hover:text-[#756256] transition-colors rounded-lg hover:bg-white flex-shrink-0 border border-stone-200 bg-white shadow-sm"
          title="傳送圖片"
        >
          <Camera size={18} />
        </button>

        {currentUser.uid === sellerId && (
          <button
            onClick={handleFillTemplate}
            className="text-[10px] w-fit font-bold text-[#756256] border border-[#756256] rounded-md px-3 py-1 transform hover:translate-y-[-1px] transition-all bg-white flex items-center gap-1 shadow-sm active:translate-y-0"
          >
            ✅開立明細
          </button>
        )}
      </div>

      {/* Image Preview */}
      {chatImage && (
        <div className="px-3 py-2 bg-gray-50 border-t flex items-center gap-2">
          <div className="relative w-12 h-12 rounded-md overflow-hidden border border-gray-200">
            <img src={chatImage} alt="preview" className="w-full h-full object-cover" />
            <button onClick={() => setChatImage(null)} className="absolute top-0 right-0 bg-black/50 text-white rounded-full p-0.5"><X size={10} /></button>
          </div>
          <span className="text-[10px] text-gray-500">準備傳送圖片...</span>
        </div>
      )}
      {/* Input Area */}
      <div className="p-3 bg-white border-t flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows="1"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="輸入訊息..."
          className="w-full bg-[#F9F7F5] border-none rounded-2xl px-4 py-2 text-sm focus:ring-1 focus:ring-[#756256] outline-none resize-none transition-all scrollbar-hide py-2"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() && !chatImage}
          className="p-2 bg-[#756256] text-white rounded-full hover:bg-[#5D4E44] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex-shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

// --- ChatList Component (New) ---
const ChatList = ({ currentUser, onSelectChat, onClose, books }) => {
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

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (window.confirm("確認刪除此聊天室？")) {
      try {
        await bookService.deleteTransaction(chatId);
        setChats(prev => prev.filter(c => c.id !== chatId));
      } catch (error) {
        console.error("Delete chat failed", error);
      }
    }
  };

  return (
    <div className="fixed bottom-24 right-4 w-80 max-h-96 bg-white rounded-xl shadow-2xl flex flex-col z-50 animate-slide-up border border-stone-200 overflow-hidden">
      <div className="bg-[#756256] text-white p-3 flex justify-between items-center">
        <span className="font-bold">我的訊息</span>
        <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><X size={16} /></button>
      </div>
      <div className="overflow-y-auto p-2 space-y-2 bg-[#F9F7F5] flex-1">
        {chats.length === 0 && <div className="text-center text-gray-400 py-4 text-sm">尚無聊天記錄</div>}
        {chats.map(chat => {
          const bookExists = books.some(b => b.id === chat.bookId);
          return (
            <div key={chat.id}
              onClick={bookExists ? () => onSelectChat(chat) : (e) => handleDeleteChat(e, chat.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors shadow-sm border border-gray-100 relative ${bookExists ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 grayscale hover:bg-gray-200'}`}
            >
              {chat.unreadBy?.includes(currentUser.uid) && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm z-10" />
              )}
              <div className="font-bold text-[#756256] text-sm truncate pr-4">{chat.bookTitle}</div>
              <div className="text-xs text-gray-500 flex justify-between mt-1">
                {bookExists ? (
                  <>
                    <span>{chat.buyerId === currentUser.uid ? '向賣家提問' : '來自買家'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${chat.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {chat.status === 'Pending' ? '進行中' : chat.status}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500 font-bold w-full text-center">(此書已下架，點擊一下刪除聊天室)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- [New] NotificationCenter Component ---
const NotificationCenter = ({ notifications, onClose, onMarkAsRead }) => {
  return (
    <div className="fixed top-16 right-4 sm:right-20 w-80 max-h-[400px] bg-white rounded-2xl shadow-2xl flex flex-col z-[60] animate-slide-up border border-stone-100 overflow-hidden">
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <h3 className="font-bold text-[#756256] flex items-center gap-2">
          <Bell size={18} className="text-[#A58976]" />
          我的通知
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 bg-[#F9F7F5] p-2 space-y-2">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <Bell size={32} className="opacity-20" />
            尚無通知訊息
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => !notif.isRead && onMarkAsRead(notif.id)}
              className={`p-3 rounded-xl transition-all cursor-pointer border relative ${notif.isRead ? 'bg-white/50 border-transparent grayscale-[0.3]' : 'bg-white border-blue-50 shadow-sm font-medium'}`}
            >
              {!notif.isRead && <div className="absolute top-3 left-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
              <div className="text-xs text-[#756256] mb-1 leading-relaxed pl-2">{notif.content}</div>
              <div className="text-[12px] text-gray-400 pl-2">
                {getRelativeTime(notif.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-3 bg-white border-t text-center">
          <button className="text-[12px] font-bold text-[#A58976] hover:underline">清除所有已讀</button>
        </div>
      )}
    </div>
  );
};
const App = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeChat, setActiveChat] = useState(null); // {transactionId, title}
  const [showChatList, setShowChatList] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const hasUnreadNotifications = notifications.some(n => !n.isRead);
  const [userTransactions, setUserTransactions] = useState([]);
  const hasUnreadMessages = userTransactions.some(t => t.unreadBy?.includes(currentUser?.uid));

  useEffect(() => {
    if (!currentUser?.uid) return;
    const updateChats = (snapshot) => {
      const trans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserTransactions(prev => {
        // Merge and replace to avoid duplicates
        const newMap = new Map(prev.map(p => [p.id, p]));
        trans.forEach(t => newMap.set(t.id, t));
        return Array.from(newMap.values());
      });
    };
    const unsubBuyer = bookService.getUserTransactions(currentUser.uid, updateChats);
    const unsubSeller = bookService.getSellerTransactions(currentUser.uid, updateChats);
    return () => {
      unsubBuyer();
      unsubSeller();
    };
  }, [currentUser?.uid]);

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
  const [showPonyGiftModal, setShowPonyGiftModal] = useState(false); // New user gift modal
  const [wishes, setWishes] = useState(INITIAL_WISHES);
  const [myAvatars, setMyAvatars] = useState(['classic-1']);
  const [currentAvatarId, setCurrentAvatarId] = useState('classic-1'); // Default is now classic-1 (cat)

  useEffect(() => {
    let unsubProfile = null;
    let unsubBooks = null;
    let unsubWishes = null;
    let unsubNotifications = null;

    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        // Initial user set (might be incomplete)
        setCurrentUser({ uid: user.uid, email: user.email, ...user, nickname: user.email.split('@')[0] });
        setCurrentPage('home');

        // Listen to Real User Profile
        unsubProfile = authService.onProfileSnapshot(user.uid, (doc) => {
          if (doc.exists) {
            const data = doc.data();
            setCurrentUser(prev => ({ ...prev, ...data, uid: user.uid })); // Ensure uid persists
            setCoins(data.coins || 0);
            setMyAvatars(data.myAvatars || ['classic-1']);

            // Detect Newborn Pony Gift (if not claimed)
            if (!data.ponyGiftClaimed) {
              setShowPonyGiftModal(true);
            }

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
        unsubBooks = bookService.onBooksSnapshot((books) => {
          setBooks(books);
          setIsLoading(false);
        }, (error) => {
          console.error("Global books fetch failed:", error);
          setIsLoading(false);
        });

        // Fetch Wishes (Global)
        unsubWishes = bookService.onWishesSnapshot((data) => {
          setWishes(data);
        });

        // Listen to Notifications
        unsubNotifications = bookService.subscribeToNotifications(user.uid, (data) => {
          setNotifications(data);
        });

      } else {
        setCurrentUser(null);
        setCurrentPage('login');
        setNotifications([]);
        if (unsubProfile) unsubProfile();
        if (unsubBooks) unsubBooks();
        if (unsubWishes) unsubWishes();
        if (unsubNotifications) unsubNotifications();
      }
    });


    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
      if (unsubBooks) unsubBooks();
      if (unsubWishes) unsubWishes();
      if (unsubNotifications) unsubNotifications();
    };
  }, []);

  const PonyGiftModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center relative shadow-2xl transform transition-all animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="bg-gradient-to-br from-yellow-300 to-orange-400 p-4 rounded-full shadow-lg border-4 border-white">
            <Sparkles size={40} className="text-white animate-pulse" />
          </div>
        </div>
        <div className="mt-8">
          <h3 className="text-2xl font-black text-[#756256] mb-4">歡迎來到循環平台！✨</h3>
          <p className="text-gray-500 mb-8 leading-relaxed">
            為了慶祝您的加入，<br />
            特別送上 <span className="text-orange-500 font-bold">限定小馬</span> 頭像！
          </p>
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-orange-100 p-1 bg-white shadow-inner mb-3">
              <img src={optimizeImage("https://i.postimg.cc/9fW28Bc0/niu.jpg", 200, 70)} alt="Pony Gift" className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="text-xs font-bold text-gray-400">期間限定小馬</span>
          </div>
          <button
            onClick={handleClaimPony}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#A58976] to-[#756256] text-white font-bold hover:shadow-xl transition-all active:scale-95 text-lg"
          >
            立即領取
          </button>
        </div>
      </div>
    </div>
  );

  const handleClaimPony = async () => {
    try {
      const { db, firebase } = await import('./config');
      await db.collection('users').doc(currentUser.uid).update({
        myAvatars: firebase.firestore.FieldValue.arrayUnion('pony-gift'),
        ponyGiftClaimed: true
      });
      setShowPonyGiftModal(false);
      alert("領取成功！已放入您的頭像庫 ✨");
    } catch (e) {
      console.error(e);
      alert("領取失敗，請稍後再試");
    }
  };

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
    if (page === 'product') {
      setSelectedProduct(data);
      // Increment view count
      if (data && data.id) {
        bookService.incrementBookView(data.id);
      }
    }
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleAddWish = async (content, image) => {
    try {
      await bookService.addWish({
        content,
        image,
        user: currentUser.nickname || currentUser.realName || currentUser.email,
        avatarId: currentAvatarId
      });
    } catch (e) {
      console.error("Failed to add wish:", e);
      alert("許願失敗，請稍後再試");
    }
  };

  const handleDeleteWish = async (wishId) => {
    try {
      if (window.confirm("確定要收回願望嗎？")) {
        await bookService.deleteWish(wishId);
      }
    } catch (e) {
      console.error("Failed to delete wish:", e);
      alert("刪除失敗");
    }
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
      case 'home': return <HomePage
        onNavigate={navigate}
        user={currentUser}
        coins={coins}
        wishes={wishes}
        onAddWish={handleAddWish}
        onDeleteWish={handleDeleteWish}
        books={books}
        isLoading={isLoading}
        currentAvatarId={currentAvatarId}
        unreadCount={0}
        examCountdown={examCountdown}
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
        hasUnreadNotifications={hasUnreadNotifications}
      />;
      case 'product': return <ProductDetailPage product={selectedProduct} currentUser={currentUser} onBack={() => navigate('home')} onContact={async () => {
        try {
          await bookService.startTransaction(selectedProduct, currentUser, (transactionId) => {
            setActiveChat({ id: transactionId, bookId: selectedProduct.id, bookTitle: selectedProduct.title, sellerId: selectedProduct.sellerId, price: selectedProduct.price });
          });
        } catch (error) {
          console.error(error);
          alert("無法開啟對話");
        }
      }} />;
      case 'profile': return (
        <ProfilePage
          user={currentUser}
          onBack={() => navigate('home')}
          onNavigate={navigate}
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
    <div className="min-h-screen flex flex-col bg-[#F9F7F5]">
      <div className="flex-1">
        {renderPage()}
      </div>
      {currentPage !== 'login' && <Footer />}
      {showCheckInModal && <CheckInModal />}
      {showPonyGiftModal && <PonyGiftModal />}
      {activeChat && (
        <ChatRoom
          transaction={activeChat}
          currentUser={currentUser}
          onClose={() => setActiveChat(null)}
          onBackToList={() => {
            setActiveChat(null);
            setShowChatList(true);
          }}
        />
      )}

      {showNotifications && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={async (id) => {
            await bookService.markNotificationAsRead(id);
          }}
        />
      )}

      {/* Persistent Chat Button */}
      {currentUser && currentPage !== 'login' && !activeChat && (
        <>
          <button
            onClick={() => setShowChatList(!showChatList)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[#756256] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#5D4E44] transition-all transform hover:scale-105 z-40 border-2 border-white"
          >
            {showChatList ? <X size={24} /> : <MessageCircle size={24} />}
            {!showChatList && hasUnreadMessages && (
              <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
            )}
          </button>
          {showChatList && (
            <ChatList
              currentUser={currentUser}
              books={books}
              onSelectChat={(chat) => {
                setActiveChat(chat);
                setShowChatList(false);
              }}
              onClose={() => setShowChatList(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

const Footer = () => (
  <footer className="bg-[#756256] text-[#E8E3DF] py-12 px-6 mt-12 border-t border-white/10">
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-center md:justify-start">
          <BookOpen size={24} className="text-[#A58976]" />
          <span className="text-xl font-black tracking-tight text-white">SchoolBook Exchange</span>
        </div>
        <p className="text-xs opacity-70 leading-relaxed font-medium">
          致力於打造全台最流暢、最溫暖的高中二手書交易平台。<br />
          讓知識循環，讓書本找到下一個主人。
        </p>
      </div>

      <div className="flex flex-col gap-3 justify-center">
        <div className="text-sm font-bold text-white mb-2 underline underline-offset-4 decoration-[#A58976]">平台概況</div>
        <div className="text-xs opacity-80 flex items-center gap-2 justify-center md:justify-start hover:opacity-100 transition-opacity cursor-default">
          <ShieldCheck size={14} /> 安全交易保障
        </div>
        <div className="text-xs opacity-80 flex items-center gap-2 justify-center md:justify-start hover:opacity-100 transition-opacity cursor-default">
          <Zap size={14} /> 快速即時對話
        </div>
        <div className="text-xs opacity-80 flex items-center gap-2 justify-center md:justify-start hover:opacity-100 transition-opacity cursor-default">
          <Repeat size={14} /> 知識永續循環
        </div>
      </div>

      <div className="flex flex-col gap-3 justify-center">
        <div className="text-sm font-bold text-white mb-2 underline underline-offset-4 decoration-[#A58976]">聯絡我們</div>
        <div className="text-xs opacity-80 hover:opacity-100 transition-opacity flex items-center gap-2 justify-center md:justify-start">
          <Mail size={14} /> service@shsh.tw
        </div>
        <div className="text-[10px] opacity-50 mt-4 font-mono">
          © 2025 SchoolBook Exchange. All rights reserved.
        </div>
      </div>
    </div>
  </footer>
);

export default App;
