import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, runTransaction } from 'firebase/firestore';
import { Snowflake, Gift, Users, Copy, CheckCircle, RefreshCw, ArrowRight, Home, AlertCircle } from 'lucide-react';

// --- КОНФИГУРАЦИЯ FIREBASE ---
// Используем вашу конфигурацию
const firebaseConfig = {
    apiKey: "AIzaSyC7Yo9jOuY2hM3eeIpEIWCkQnDp1OP9WpQ",
    authDomain: "secret-santa-3a37d.firebaseapp.com",
    projectId: "secret-santa-3a37d",
    storageBucket: "secret-santa-3a37d.firebasestorage.app",
    messagingSenderId: "451544315426",
    appId: "1:451544315426:web:8a46a92eef771217a8fc7b",
    measurementId: "G-4VVSZKGRLL"
};

const appId = "web-santa-v1";

// Инициализация (Auth не нужен, так как используем localStorage)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ROOMS_COLLECTION = `artifacts/${appId}/public/data/secret_santa_rooms`;
const USER_PROFILES_COLLECTION = `artifacts/${appId}/public/data/user_profiles`;

// --- УПРОЩЕННАЯ АВТОРИЗАЦИЯ (LOCAL STORAGE) ---
const getOrCreateUserId = () => {
    // Пытаемся найти сохраненный ID в браузере
    let storedId = localStorage.getItem('secret_santa_uid');
    
    // Если нет - создаем новый случайный и сохраняем
    if (!storedId) {
        storedId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('secret_santa_uid', storedId);
    }
    return storedId;
};

// --- КОМПОНЕНТЫ UI (Обычный CSS) ---

const Snowfall = () => {
    // Создаем снежинки один раз
    const snowflakes = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 5 + 5}s`,
        animationDelay: `${Math.random() * 5}s`,
        opacity: Math.random() * 0.5 + 0.3,
        size: Math.random() * 4 + 2
    })), []);

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="snowflake"
                    style={{
                        left: flake.left,
                        top: -10,
                        width: `${flake.size}px`,
                        height: `${flake.size}px`,
                        opacity: flake.opacity,
                        animationDuration: flake.animationDuration,
                        animationDelay: flake.animationDelay,
                    }}
                />
            ))}
        </div>
    );
};

// Обертки для кнопок и инпутов, использующие классы из index.css
const Button = ({ onClick, disabled, variant = 'primary', children }) => (
    <button onClick={onClick} disabled={disabled} className={`btn btn-${variant}`}>
        {children}
    </button>
);

const Input = ({ value, onChange, placeholder, onEnter, disabled }) => (
    <input 
        type="text" value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter && !disabled) onEnter(); }}
        className="input-field"
    />
);

// --- ЭКРАНЫ ПРИЛОЖЕНИЯ ---

const WelcomeScreen = ({ name, setName, onSave }) => (
    <div className="card space-y-6 animate-fade-in text-center" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="flex-center mb-4">
            <div className="relative">
                {/* Эффект свечения за иконкой */}
                <div style={{position: 'absolute', inset: 0, background: 'red', filter: 'blur(60px)', opacity: 0.4, borderRadius: '50%'}}></div>
                <Gift size={80} color="#fecaca" className="relative z-10" />
            </div>
        </div>
        
        <div>
            <h1 className="title-gradient">Тайный Санта</h1>
            <p style={{ color: 'rgba(254, 202, 202, 0.8)' }}>Волшебство дарения начинается здесь</p>
        </div>

        <div className="space-y-4">
            <Input 
                value={name} onChange={e => setName(e.target.value)} placeholder="Как вас зовут?" 
                onEnter={() => { if (name.trim().length >= 2) onSave(); }}
            />
            <Button onClick={onSave} disabled={name.trim().length < 2}>
                Войти в игру <ArrowRight size={20} />
            </Button>
        </div>
    </div>
);

const LobbyScreen = ({ name, rooms, onCreate, onJoin, onSelect }) => {
    const [newRoom, setNewRoom] = useState('');
    const [joinId, setJoinId] = useState('');
    const isRoomNameValid = newRoom.trim().length >= 3;
    const isJoinIdValid = joinId.trim().length > 0;

    return (
        <div className="animate-fade-in" style={{ maxWidth: '900px', width: '100%', padding: '1rem' }}>
            {/* Хедер лобби */}
            <div className="card mb-8" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ padding: '0.75rem', background: 'linear-gradient(to bottom right, #ef4444, #b91c1c)', borderRadius: '0.75rem' }}>
                    <Snowflake color="white" size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Привет, {name}!</h2>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Панель управления</p>
                </div>
            </div>

            <div className="grid-2">
                {/* Левая колонка: Список комнат */}
                <div className="space-y-4">
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} color="#93c5fd"/> Ваши комнаты
                    </h3>
                    {rooms.length === 0 ? (
                        <div className="card text-center" style={{ borderStyle: 'dashed', opacity: 0.5 }}>
                            <p>Вы пока не участвуете ни в одной игре</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rooms.map(r => (
                                <div key={r.id} onClick={() => onSelect(r.id)} className="list-item">
                                    <div>
                                        <h4 style={{ fontWeight: 'bold' }}>{r.name}</h4>
                                        <span className={`badge ${r.status === 'drawn' ? 'badge-green' : 'badge-yellow'}`}>
                                            {r.status === 'drawn' ? 'Игра идет' : 'Набор'}
                                        </span>
                                    </div>
                                    <ArrowRight size={20} style={{ opacity: 0.5 }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Правая колонка: Действия */}
                <div className="space-y-6">
                    <div className="card space-y-4" style={{ background: 'linear-gradient(to bottom right, rgba(127, 29, 29, 0.4), transparent)' }}>
                        <h3 style={{ fontWeight: 'bold' }}>Создать новую игру</h3>
                        <Input 
                            value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="Название (мин. 3 буквы)"
                            onEnter={() => { if (isRoomNameValid) onCreate(newRoom); }}
                        />
                        <Button onClick={() => onCreate(newRoom)} disabled={!isRoomNameValid}>Создать комнату</Button>
                    </div>
                    
                    <div className="card space-y-4">
                        <h3 style={{ fontWeight: 'bold' }}>Присоединиться</h3>
                        <Input 
                            value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Вставьте ID комнаты" 
                            onEnter={() => { if (isJoinIdValid) onJoin(joinId); }}
                        />
                        <Button variant="secondary" onClick={() => onJoin(joinId)} disabled={!isJoinIdValid}>Найти комнату</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RoomScreen = ({ room, userId, onBack, onUpdateWish, onDraw }) => {
    const myData = room.members[userId];
    const [wish, setWish] = useState(myData.wishlist || '');
    const isOwner = room.ownerId === userId;
    const giftee = myData.santaTo ? room.members[myData.santaTo] : null;

    useEffect(() => { setWish(myData.wishlist || '') }, [room.id]);

    return (
        <div className="animate-fade-in" style={{ maxWidth: '900px', width: '100%', padding: '1rem' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Home size={18} /> Назад к списку
            </button>
            
            {/* Заголовок комнаты */}
            <div className="text-center mb-8">
                <h1 className="glow-text" style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>{room.name}</h1>
                <div onClick={() => navigator.clipboard.writeText(room.id)} 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontFamily: 'monospace', color: '#fde047' }}>ID: {room.id}</span>
                    <Copy size={14} style={{ opacity: 0.6 }} />
                </div>
            </div>

            {/* Блок результата (кого одариваем) */}
            {room.status === 'drawn' && giftee && (
                <div className="card text-center mb-8" style={{ background: 'linear-gradient(to bottom right, rgba(20, 83, 45, 0.6), rgba(6, 78, 59, 0.4))', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Ваша цель</p>
                    <p style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '1.5rem' }}>{giftee.name}</p>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '0.75rem', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(110, 231, 183, 0.6)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Вишлист подопечного:</p>
                        <p style={{ fontStyle: 'italic', fontSize: '1.125rem' }}>{giftee.wishlist || "Подопечный не написал пожеланий, придется импровизировать! 🎁"}</p>
                    </div>
                </div>
            )}

            <div className="grid-2">
                {/* Левая колонка: Мой вишлист */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Gift size={20} color="#f87171"/> Мой вишлист
                    </h3>
                    <textarea 
                        className="input-field"
                        style={{ resize: 'none', minHeight: '150px' }}
                        placeholder="Напишите, что бы вы хотели получить..."
                        value={wish} onChange={e => setWish(e.target.value)}
                    />
                    <Button variant="secondary" onClick={() => onUpdateWish(wish)}>Сохранить пожелания</Button>
                </div>

                {/* Правая колонка: Статус и участники */}
                <div className="space-y-6">
                    <div className="card space-y-4">
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>Статус игры</h3>
                        {room.status === 'open' ? (
                            <div className="space-y-4">
                                <p style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#fef08a', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                    Ожидаем всех участников.
                                </p>
                                {isOwner ? (
                                    <Button variant="success" onClick={onDraw} disabled={Object.keys(room.members).length < 2}>
                                        <RefreshCw size={18} /> Провести жеребьевку
                                    </Button>
                                ) : (
                                    <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.875rem' }}>Ждем организатора...</p>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#86efac', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <CheckCircle size={28} /> 
                                <div>
                                    <p style={{ fontWeight: 'bold' }}>Жеребьевка проведена!</p>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Готовьте подарки</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontWeight: 'bold' }}>Участники</h3>
                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{Object.keys(room.members).length}</span>
                        </div>
                        <div className="space-y-4 custom-scrollbar" style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {Object.values(room.members).map((m, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', boxShadow: '0 0 8px rgba(248,113,113,0.8)' }}></div>
                                        <span>{m.name}</span>
                                    </div>
                                    {m.wishlist && <Gift size={14} color="#facc15" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---

const App = () => {
    const [userId, setUserId] = useState(null);
    const [name, setName] = useState('');
    const [rooms, setRooms] = useState([]);
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const currentRoom = useMemo(() => rooms.find(r => r.id === currentRoomId), [rooms, currentRoomId]);

    // Инициализация данных
    useEffect(() => {
        const uid = getOrCreateUserId();
        setUserId(uid);

        const initData = async () => {
            try {
                // Загружаем имя
                const docSnap = await getDoc(doc(db, USER_PROFILES_COLLECTION, uid));
                if (docSnap.exists()) setName(docSnap.data().name || '');

                // Слушаем комнаты
                const q = query(collection(db, ROOMS_COLLECTION), where(`members.${uid}.name`, '!=', null));
                onSnapshot(q, 
                    (snap) => {
                        setRooms(snap.docs.map(d => ({id: d.id, ...d.data()})));
                        setLoading(false);
                        setError('');
                    },
                    (err) => {
                        console.error(err);
                        setError(err.code === 'permission-denied' ? "Ошибка доступа (Rules)" : "Ошибка подключения");
                        setLoading(false);
                    }
                );
            } catch (e) {
                console.error(e);
                setError("Ошибка инициализации: " + e.message);
                setLoading(false);
            }
        };
        initData();
    }, []);

    const handleSaveName = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            await setDoc(doc(db, USER_PROFILES_COLLECTION, userId), { name }, { merge: true });
            setLoading(false);
        } catch (e) {
            setError("Ошибка сохранения имени");
            setLoading(false);
        }
    };

    const handleCreateRoom = async (roomName) => {
        if (roomName.trim().length < 3) return; 
        setLoading(true);
        try {
            const newRef = doc(collection(db, ROOMS_COLLECTION));
            await setDoc(newRef, {
                id: newRef.id,
                name: roomName,
                ownerId: userId,
                status: 'open',
                members: { [userId]: { name, wishlist: '', santaTo: null } },
                createdAt: new Date().toISOString()
            });
            setCurrentRoomId(newRef.id);
        } catch (e) { setError("Ошибка создания: " + e.message); }
        setLoading(false);
    };

    const handleJoinRoom = async (roomId) => {
        setLoading(true);
        try {
            await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
                [`members.${userId}`]: { name, wishlist: '', santaTo: null }
            });
            setCurrentRoomId(roomId);
        } catch (e) { setError("Комната не найдена"); }
        setLoading(false);
    };

    const handleUpdateWish = async (w) => {
        await updateDoc(doc(db, ROOMS_COLLECTION, currentRoomId), { [`members.${userId}.wishlist`]: w });
    };

    const handleDraw = async () => {
        setLoading(true);
        try {
            await runTransaction(db, async (t) => {
                const ref = doc(db, ROOMS_COLLECTION, currentRoomId);
                const r = (await t.get(ref)).data();
                if (r.status === 'drawn') throw new Error("Уже распределено");
                const ids = Object.keys(r.members);
                if (ids.length < 2) throw new Error("Нужно минимум 2 игрока");

                const givers = [...ids].sort(() => Math.random() - 0.5);
                const receivers = [...ids].sort(() => Math.random() - 0.5);
                let valid = true, assignments = {};
                givers.forEach((g, i) => {
                    if (g === receivers[i]) valid = false;
                    assignments[g] = receivers[i];
                });
                if (!valid) ids.forEach((id, i) => assignments[id] = ids[(i + 1) % ids.length]);

                const newMems = { ...r.members };
                Object.keys(assignments).forEach(g => newMems[g].santaTo = assignments[g]);
                t.update(ref, { members: newMems, status: 'drawn' });
            });
        } catch (e) { setError(e.message); }
        setLoading(false);
    };

    if (loading) return <div className="app-background container-center"><Snowflake className="animate-spin" color="#ef4444" size={48}/></div>;

    return (
        <div className="app-background container-center">
             {/* Импорт шрифта Inter */}
             <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');`}</style>
             <Snowfall />

            {error && <div className="error-toast"><AlertCircle /> {error} <button onClick={() => setError('')} style={{background:'none', border:'none', color:'white', marginLeft:'auto', cursor:'pointer'}}>✕</button></div>}

            {!name ? (
                <WelcomeScreen name={name} setName={setName} onSave={handleSaveName} />
            ) : !currentRoomId ? (
                <LobbyScreen name={name} rooms={rooms} onCreate={handleCreateRoom} onJoin={handleJoinRoom} onSelect={setCurrentRoomId} />
            ) : (
                <RoomScreen room={currentRoom} userId={userId} onBack={() => setCurrentRoomId(null)} onUpdateWish={handleUpdateWish} onDraw={handleDraw} />
            )}
        </div>
    );
};

export default App;