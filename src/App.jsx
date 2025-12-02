import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, runTransaction } from 'firebase/firestore';
import { Snowflake, Gift, Users, Copy, CheckCircle, RefreshCw, LogOut, ArrowRight, Home } from 'lucide-react';

// --- Конфигурация Firebase ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'secret-santa-web';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyC7Yo9jOuY2hM3eeIpEIWCkQnDp1OP9WpQ",
    authDomain: "secret-santa-3a37d.firebaseapp.com",
    projectId: "secret-santa-3a37d",
    storageBucket: "secret-santa-3a37d.firebasestorage.app",
    messagingSenderId: "451544315426",
    appId: "1:451544315426:web:8a46a92eef771217a8fc7b",
    measurementId: "G-4VVSZKGRLL"
};

const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : DEFAULT_FIREBASE_CONFIG;

// Коллекции
const ROOMS_COLLECTION = `artifacts/${appId}/public/data/secret_santa_rooms`;
const USER_PROFILES_COLLECTION = `artifacts/${appId}/public/data/user_profiles`;

// Инициализация
let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Firebase init error:", error);
}

// Утилиты
const getCollectionRef = (name) => collection(db, name);
const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
};

// --- Компонент Снега ---
const Snowfall = () => {
    const snowflakes = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 5 + 5}s`,
        animationDelay: `${Math.random() * 5}s`,
        opacity: Math.random() * 0.5 + 0.3,
        size: Math.random() * 4 + 2
    })), []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute bg-white rounded-full opacity-80"
                    style={{
                        left: flake.left,
                        top: -10,
                        width: `${flake.size}px`,
                        height: `${flake.size}px`,
                        opacity: flake.opacity,
                        animation: `fall ${flake.animationDuration} linear infinite`,
                        animationDelay: flake.animationDelay,
                    }}
                />
            ))}
            <style jsx="true">{`
                @keyframes fall {
                    0% { transform: translateY(-10vh) translateX(-10px); }
                    100% { transform: translateY(110vh) translateX(10px); }
                }
            `}</style>
        </div>
    );
};

// --- UI Компоненты ---
const Card = ({ children, className = "" }) => (
    <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl overflow-hidden ${className}`}>
        {children}
    </div>
);

const Button = ({ onClick, disabled, variant = 'primary', children, className = "" }) => {
    const baseStyle = "w-full font-bold py-3 px-4 md:px-6 rounded-xl transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base";
    const variants = {
        primary: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-900/20 shadow-lg",
        secondary: "bg-white/20 hover:bg-white/30 text-white border border-white/10",
        success: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-green-900/20 shadow-lg",
        outline: "border-2 border-white/30 text-white hover:bg-white/10"
    };
    
    return (
        <button 
            onClick={onClick} 
            disabled={disabled} 
            className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

const Input = ({ value, onChange, placeholder, className = "" }) => (
    <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all text-sm md:text-base ${className}`}
    />
);

// --- Вынесенные Компоненты Экранов ---

const WelcomeScreen = ({ userName, setUserName, saveName }) => (
    <div className="max-w-md mx-auto text-center space-y-6 md:space-y-8 animate-fade-in pt-6 md:pt-12 px-4">
        <div className="relative inline-block">
            <div className="absolute inset-0 bg-red-500 blur-[50px] opacity-40 rounded-full"></div>
            <Gift size={60} className="text-red-200 relative z-10 mx-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] md:w-20 md:h-20" />
        </div>
        
        <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-500 drop-shadow-sm">
                Тайный Санта
            </h1>
            <p className="text-red-100/80 text-base md:text-lg font-light">
                Волшебство дарения начинается здесь
            </p>
        </div>

        <Card className="p-6 md:p-8 space-y-4 md:space-y-6">
            <Input 
                value={userName} 
                onChange={e => setUserName(e.target.value)} 
                placeholder="Как вас зовут?" 
                className="text-center text-lg"
            />
            <Button onClick={saveName} disabled={!userName.trim()}>
                Войти в игру <ArrowRight size={20} />
            </Button>
        </Card>
    </div>
);

const LobbyScreen = ({ userName, rooms, createRoom, joinRoom, setCurrentRoomId }) => {
    const [newRoom, setNewRoom] = useState('');
    const [joinId, setJoinId] = useState('');

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-12 w-full px-2">
            <header className="flex justify-between items-center py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-600/20 rounded-lg border border-red-500/30">
                        <Snowflake className="text-red-200" size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-white truncate max-w-[150px] md:max-w-none">
                            {userName}
                        </h2>
                        <p className="text-[10px] md:text-xs text-red-200/60 uppercase tracking-widest">Панель управления</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Список комнат */}
                <section className="space-y-4 order-2 lg:order-1">
                    <h3 className="text-base md:text-lg font-medium text-white/80 flex items-center gap-2">
                        <Users size={18} /> Ваши комнаты
                    </h3>
                    <div className="space-y-3">
                        {rooms.length === 0 ? (
                            <Card className="p-6 md:p-8 text-center text-white/40 border-dashed border-white/10">
                                <p>Вы пока не участвуете ни в одной игре</p>
                            </Card>
                        ) : (
                            rooms.map(r => (
                                <div 
                                    key={r.id} 
                                    onClick={() => setCurrentRoomId(r.id)}
                                    className="group cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/30 rounded-xl p-4 transition-all duration-300 flex justify-between items-center active:scale-[0.98]"
                                >
                                    <div className="flex-1 min-w-0 mr-2">
                                        <h4 className="font-bold text-white text-base md:text-lg group-hover:text-red-200 transition-colors truncate">{r.name}</h4>
                                        <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${r.status === 'drawn' ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}`}>
                                            {r.status === 'drawn' ? 'Игра идет' : 'Набор'}
                                        </span>
                                    </div>
                                    <ArrowRight className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" size={20} />
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Действия */}
                <section className="space-y-6 order-1 lg:order-2">
                    <Card className="p-5 md:p-6 space-y-4 bg-gradient-to-br from-red-900/40 to-transparent">
                        <h3 className="font-bold text-white text-base md:text-lg">Создать новую игру</h3>
                        <Input value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="Название комнаты" />
                        <Button onClick={() => createRoom(newRoom)} disabled={!newRoom.trim()}>
                            Создать комнату
                        </Button>
                    </Card>

                    <Card className="p-5 md:p-6 space-y-4">
                        <h3 className="font-bold text-white text-base md:text-lg">Присоединиться</h3>
                        <Input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="ID комнаты" />
                        <Button variant="secondary" onClick={() => joinRoom(joinId)} disabled={!joinId.trim()}>
                            Найти комнату
                        </Button>
                    </Card>
                </section>
            </div>
        </div>
    );
};

const RoomScreen = ({ currentRoom, userId, updateWishlist, drawNames, setCurrentRoomId, userName }) => {
    const isOwner = currentRoom.ownerId === userId;
    const myData = currentRoom.members[userId];
    const [localWishlist, setLocalWishlist] = useState(myData.wishlist || '');
    const members = Object.values(currentRoom.members);
    const giftee = myData.santaTo ? currentRoom.members[myData.santaTo] : null;

    // Обновляем локальный стейт если данные пришли из БД (например, при входе)
    useEffect(() => {
        if (myData.wishlist) setLocalWishlist(myData.wishlist);
    }, [currentRoom.id]); // Только при смене комнаты

    const handleCopyId = () => {
        navigator.clipboard.writeText(currentRoom.id);
    };

    const handleSaveWishlist = () => {
        updateWishlist(localWishlist);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in pb-12 w-full px-2">
            <button onClick={() => setCurrentRoomId(null)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors py-2">
                <Home size={18} /> <span className="text-sm">Назад к списку</span>
            </button>

            {/* Заголовок комнаты */}
            <div className="text-center space-y-2 mb-4 md:mb-8">
                <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg px-2 break-words">{currentRoom.name}</h1>
                <div 
                    className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition-colors active:scale-95" 
                    onClick={handleCopyId}
                >
                    <span className="text-xs md:text-sm font-mono text-yellow-200 truncate max-w-[200px]">ID: {currentRoom.id}</span>
                    <Copy size={14} className="text-white/60 flex-shrink-0" />
                </div>
            </div>

            {/* Блок Санты (Результат) */}
            {currentRoom.status === 'drawn' && giftee && (
                <Card className="bg-gradient-to-br from-green-900/60 to-emerald-900/40 border-emerald-500/30 p-6 md:p-8 text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                    <h3 className="text-emerald-200 text-xs md:text-sm uppercase tracking-widest font-bold mb-2">Ваша цель</h3>
                    <p className="text-2xl md:text-4xl font-black text-white mb-4 md:mb-6 drop-shadow-md break-words">
                        {giftee.name}
                    </p>
                    <div className="bg-black/20 rounded-xl p-4 text-left">
                        <p className="text-xs text-emerald-200/60 mb-1">Вишлист подопечного:</p>
                        <p className="text-white/90 italic text-sm md:text-base whitespace-pre-wrap">
                            {giftee.wishlist || "Подопечный не написал пожеланий, придется импровизировать!"}
                        </p>
                    </div>
                </Card>
            )}

            {/* Основной контент */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Секция Вишлиста */}
                <Card className="p-5 md:p-6 flex flex-col h-full order-2 md:order-1">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Gift className="text-red-400" size={20} /> Мой вишлист
                    </h3>
                    <textarea
                        className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400/50 mb-4 text-sm min-h-[150px]"
                        placeholder="Напишите, что бы вы хотели получить... (например: Книгу про космос, теплые носки или лего)"
                        value={localWishlist}
                        onChange={e => setLocalWishlist(e.target.value)}
                    />
                    <Button variant="secondary" onClick={handleSaveWishlist}>
                        Сохранить пожелания
                    </Button>
                </Card>

                {/* Секция Участников и Статуса */}
                <div className="space-y-4 md:space-y-6 order-1 md:order-2">
                    {/* Статус игры */}
                    <Card className="p-5 md:p-6">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-4">Статус игры</h3>
                        {currentRoom.status === 'open' ? (
                            <div className="space-y-4">
                                <p className="text-yellow-200/80 text-xs md:text-sm bg-yellow-900/30 p-3 rounded-lg border border-yellow-500/20">
                                    Ожидаем всех участников. Жеребьевку может начать только создатель.
                                </p>
                                {isOwner ? (
                                    <Button variant="success" onClick={drawNames} disabled={members.length < 2}>
                                        <RefreshCw size={18} /> Провести жеребьевку
                                    </Button>
                                ) : (
                                    <p className="text-center text-white/40 text-xs md:text-sm">Ждем организатора...</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-green-300 bg-green-900/30 p-4 rounded-xl border border-green-500/20">
                                <CheckCircle size={24} className="flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-sm md:text-base">Жеребьевка проведена!</p>
                                    <p className="text-xs opacity-70">Готовьте подарки</p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Список людей */}
                    <Card className="p-5 md:p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                            <span>Участники</span>
                            <span className="text-sm font-normal bg-white/10 px-2 py-1 rounded-md">{members.length}</span>
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {members.map((m, i) => (
                                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5">
                                    <span className="text-white flex items-center gap-2 truncate max-w-[70%]">
                                        <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></div>
                                        <span className="truncate">{m.name}</span> 
                                        {m.name === userName && <span className="opacity-50 text-xs">(Вы)</span>}
                                    </span>
                                    {m.wishlist && <Gift size={14} className="text-yellow-400 flex-shrink-0" />}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};


// --- Основное Приложение ---

const App = () => {
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState('');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isNameSet, setIsNameSet] = useState(false);

    const currentRoom = useMemo(() => rooms.find(r => r.id === currentRoomId), [rooms, currentRoomId]);

    // Аутентификация
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                else await signInAnonymously(auth);
            } catch (e) {
                console.error(e);
                setErrorMessage("Ошибка входа");
            }
        };

        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUserId(u.uid);
                await checkProfile(u.uid);
            }
            setIsAuthReady(true);
            setIsLoading(false);
        });

        if (!auth.currentUser) initAuth();
        else {
            setUserId(auth.currentUser.uid);
            checkProfile(auth.currentUser.uid).then(() => {
                setIsAuthReady(true);
                setIsLoading(false);
            });
        }
        return () => unsub();
    }, []);

    const checkProfile = async (uid) => {
        const snap = await getDoc(doc(db, USER_PROFILES_COLLECTION, uid));
        if (snap.exists() && snap.data().name) {
            setUserName(snap.data().name);
            setIsNameSet(true);
        }
    };

    const saveName = async () => {
        if (!userName.trim()) return;
        setIsLoading(true);
        try {
            await setDoc(doc(db, USER_PROFILES_COLLECTION, userId), { name: userName.trim() }, { merge: true });
            setIsNameSet(true);
        } catch (e) { setErrorMessage("Не удалось сохранить имя"); }
        setIsLoading(false);
    };

    // Слушатель комнат
    useEffect(() => {
        if (!userId) return;
        const q = query(getCollectionRef(ROOMS_COLLECTION), where(`members.${userId}.name`, '!=', null));
        return onSnapshot(q, (snap) => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRooms(fetched);
            // Важно: не сбрасывать currentRoomId если комната просто обновилась
            if (currentRoomId && !fetched.find(r => r.id === currentRoomId)) {
               // Комната удалена или пользователя удалили?
            }
        });
    }, [userId, currentRoomId]);

    // Действия
    const createRoom = async (name) => {
        if (!name.trim()) return;
        setIsLoading(true);
        try {
            const newRef = doc(getCollectionRef(ROOMS_COLLECTION));
            await setDoc(newRef, {
                id: newRef.id,
                name: name.trim(),
                ownerId: userId,
                status: 'open',
                members: { [userId]: { name: userName, wishlist: '', santaTo: null } },
                createdAt: new Date().toISOString()
            });
            setCurrentRoomId(newRef.id);
        } catch (e) { setErrorMessage("Ошибка создания"); }
        setIsLoading(false);
    };

    const joinRoom = async (rid) => {
        if (!rid.trim()) return;
        setIsLoading(true);
        try {
            await updateDoc(doc(db, ROOMS_COLLECTION, rid), {
                [`members.${userId}`]: { name: userName, wishlist: '', santaTo: null }
            });
            setCurrentRoomId(rid);
        } catch (e) { setErrorMessage("Комната не найдена"); }
        setIsLoading(false);
    };

    const updateWishlist = async (txt) => {
        if (!currentRoomId) return;
        try {
            await updateDoc(doc(db, ROOMS_COLLECTION, currentRoomId), {
                [`members.${userId}.wishlist`]: txt
            });
        } catch (e) { console.error(e); }
    };

    const drawNames = async () => {
        const memIds = Object.keys(currentRoom.members);
        if (memIds.length < 2) return;
        setIsLoading(true);
        try {
            await runTransaction(db, async (t) => {
                const ref = doc(db, ROOMS_COLLECTION, currentRoomId);
                const roomDoc = await t.get(ref);
                if (!roomDoc.exists() || roomDoc.data().status === 'drawn') throw "Err";

                const givers = shuffleArray([...memIds]);
                let receivers = shuffleArray([...memIds]);
                let success = false;
                let assignments = {};

                for(let attempt=0; attempt<10; attempt++) {
                    receivers = shuffleArray([...memIds]);
                    if (givers.every((g, i) => g !== receivers[i])) {
                        success = true;
                        givers.forEach((g, i) => assignments[g] = receivers[i]);
                        break;
                    }
                }
                if (!success) throw "Не удалось распределить, попробуйте снова";

                const newMembers = { ...roomDoc.data().members };
                Object.keys(assignments).forEach(g => newMembers[g].santaTo = assignments[g]);
                
                t.update(ref, { members: newMembers, status: 'drawn' });
            });
        } catch (e) { setErrorMessage(e.toString()); }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-red-500/30 overflow-x-hidden relative">
            <style jsx="true">{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
                .font-sans { font-family: 'Inter', sans-serif; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            
            <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e293b] via-[#0f172a] to-[#020617]"></div>
            <Snowfall />

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
                {isLoading ? (
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <Snowflake className="animate-spin text-red-400" size={40} />
                        <p className="text-white/50 text-sm tracking-widest uppercase">Загрузка магии...</p>
                    </div>
                ) : (
                    <>
                        {errorMessage && (
                            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-xl z-50 backdrop-blur-sm whitespace-nowrap text-sm">
                                {errorMessage}
                            </div>
                        )}
                        <div className="w-full">
                            {!userId || !isNameSet ? 
                                <WelcomeScreen userName={userName} setUserName={setUserName} saveName={saveName} /> : 
                             !currentRoomId ? 
                                <LobbyScreen 
                                    userName={userName} 
                                    rooms={rooms} 
                                    createRoom={createRoom} 
                                    joinRoom={joinRoom} 
                                    setCurrentRoomId={setCurrentRoomId} 
                                /> : 
                                <RoomScreen 
                                    currentRoom={currentRoom} 
                                    userId={userId} 
                                    updateWishlist={updateWishlist} 
                                    drawNames={drawNames}
                                    setCurrentRoomId={setCurrentRoomId}
                                    userName={userName}
                                />
                            }
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default App;